"""ZORVI — order + download flow tests.

Covers:
  * price snapshot at order time
  * RBAC on admin routes
  * ownership checks
  * status transitions (pending -> awaiting_verification -> paid)
  * download tokens issued on mark-paid
  * single-use + expiry enforcement
  * re-issue for paid orders only
"""
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.download_token import DownloadToken
from app.models.marketplace import MarketplaceProductFile
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.services.storage import LocalStorage


# ---------- helpers ----------
async def _register_and_login(client, tag: str) -> tuple[str, str]:
    email = f"{tag}-{uuid.uuid4().hex[:10]}@example.com"
    password = "UserPass123"
    await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return email, r.json()["access_token"]


async def _create_published_product_with_package(
    client, admin_token,
    price_cents: int = 4999,
    with_file: bool = True,
) -> dict:
    p = await client.post(
        "/api/v1/admin/marketplace",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": f"Test Prod {uuid.uuid4().hex[:6]}",
            "short_description": "Test product for orders",
            "starting_price_cents": price_cents,
        },
    )
    assert p.status_code == 201, p.text
    product = p.json()

    pkg = await client.post(
        f"/api/v1/admin/marketplace/{product['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Standard", "price_cents": price_cents},
    )
    assert pkg.status_code == 201, pkg.text
    package = pkg.json()

    await client.patch(
        f"/api/v1/admin/marketplace/{product['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "published"},
    )

    if with_file:
        # create a real file on disk AND a row in marketplace_product_files
        storage = LocalStorage()
        storage_key = f"products/{product['id']}/{package['id']}/test-file.txt"
        full = storage.root / storage_key
        full.parent.mkdir(parents=True, exist_ok=True)
        content = b"ZORVI-TEST-CONTENT-" + uuid.uuid4().hex.encode()
        full.write_bytes(content)

        async with AsyncSessionLocal() as db:
            pf = MarketplaceProductFile(
                product_id=uuid.UUID(product["id"]),
                package_id=uuid.UUID(package["id"]),
                file_name="test-file.txt",
                file_size_bytes=len(content),
                file_type="text/plain",
                storage_key=storage_key,
            )
            db.add(pf)
            await db.commit()

        return {"product": product, "package": package, "content": content, "storage_key": storage_key}

    return {"product": product, "package": package}


async def _create_order(client, buyer_token: str, package_id: str) -> dict:
    r = await client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"items": [{"package_id": package_id}]},
    )
    assert r.status_code == 201, r.text
    return r.json()


# ---------- 1. price snapshot ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_create_order_snapshots_price(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, price_cents=12345, with_file=False)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    assert order["total_cents"] == 12345
    assert order["items"][0]["price_cents"] == 12345
    assert order["items"][0]["package_name"] == "Standard"
    assert order["status"] == "pending"


# ---------- 2. unpublished product rejected ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_create_order_rejects_unpublished_product(client, admin_token, clean_test_users):
    p = await client.post(
        "/api/v1/admin/marketplace",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": f"Draft {uuid.uuid4().hex[:6]}",
            "short_description": "Draft product should not be orderable",
            "starting_price_cents": 100,
        },
    )
    product = p.json()
    pkg = await client.post(
        f"/api/v1/admin/marketplace/{product['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Standard", "price_cents": 100},
    )
    _, buyer = await _register_and_login(client, "buyer")
    r = await client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {buyer}"},
        json={"items": [{"package_id": pkg.json()["id"]}]},
    )
    assert r.status_code == 400


# ---------- 3. auth required ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_create_order_requires_auth(client):
    r = await client.post("/api/v1/orders", json={"items": [{"package_id": str(uuid.uuid4())}]})
    assert r.status_code == 401


# ---------- 4. list own orders ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_list_my_orders(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=False)
    _, buyer = await _register_and_login(client, "buyer")
    await _create_order(client, buyer, ctx["package"]["id"])
    r = await client.get("/api/v1/orders", headers={"Authorization": f"Bearer {buyer}"})
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ---------- 5. other user cannot see my order ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_get_other_users_order_404(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=False)
    _, buyer1 = await _register_and_login(client, "buyer1")
    _, buyer2 = await _register_and_login(client, "buyer2")
    order = await _create_order(client, buyer1, ctx["package"]["id"])
    r = await client.get(
        f"/api/v1/orders/{order['id']}",
        headers={"Authorization": f"Bearer {buyer2}"},
    )
    assert r.status_code == 404


# ---------- 6. submit payment ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_submit_payment_sets_awaiting_verification(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=False)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    r = await client.post(
        f"/api/v1/orders/{order['id']}/submit-payment",
        headers={"Authorization": f"Bearer {buyer}"},
        json={
            "payment_method": "manual_bank_transfer",
            "payment_reference": "TXN123",
            "payment_proof_url": "https://example.com/receipt.jpg",
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "awaiting_verification"
    assert data["payment_method"] == "manual_bank_transfer"
    assert data["payment_reference"] == "TXN123"


# ---------- 7. buyer cannot mark paid ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_buyer_cannot_mark_paid(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=False)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    r = await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {buyer}"},
        json={"admin_note": "trying"},
    )
    assert r.status_code == 403


# ---------- 8. admin marks paid ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_admin_mark_paid_flips_status(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=False)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    r = await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"admin_note": "verified"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["order"]["status"] == "paid"
    assert body["order"]["paid_at"] is not None
    assert body["order"]["admin_note"] == "verified"


# ---------- 9. mark-paid issues tokens when files exist ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_admin_mark_paid_issues_download_tokens(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=True)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    r = await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert r.status_code == 200, r.text
    issued = r.json()["download_tokens"]
    assert len(issued) == 1
    assert issued[0]["file_name"] == "test-file.txt"
    assert len(issued[0]["token"]) >= 40


# ---------- 10. download streams correctly ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_download_with_valid_token_streams_file(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=True)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    mp = await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    token = mp.json()["download_tokens"][0]["token"]

    dl = await client.get(f"/api/v1/downloads/{token}")
    assert dl.status_code == 200
    assert "attachment" in dl.headers.get("content-disposition", "").lower()
    assert dl.content == ctx["content"]


# ---------- 11. single-use ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_download_token_single_use(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=True)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    mp = await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    token = mp.json()["download_tokens"][0]["token"]

    r1 = await client.get(f"/api/v1/downloads/{token}")
    assert r1.status_code == 200
    r2 = await client.get(f"/api/v1/downloads/{token}")
    assert r2.status_code == 410


# ---------- 12. expired token ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_download_expired_token(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=True)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    mp = await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    token = mp.json()["download_tokens"][0]["token"]

    # Force expiry
    async with AsyncSessionLocal() as db:
        t = (await db.execute(select(DownloadToken).where(DownloadToken.token == token))).scalar_one()
        t.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await db.commit()

    r = await client.get(f"/api/v1/downloads/{token}")
    assert r.status_code == 410


# ---------- 13. re-issue only for paid orders ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_reissue_downloads_only_for_paid_orders(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=True)
    _, buyer = await _register_and_login(client, "buyer")
    order = await _create_order(client, buyer, ctx["package"]["id"])
    # still pending — re-issue must fail with 409
    r = await client.post(
        f"/api/v1/orders/{order['id']}/downloads",
        headers={"Authorization": f"Bearer {buyer}"},
        json={},
    )
    assert r.status_code == 409


# ---------- 14. re-issue requires owner ----------
@pytest.mark.asyncio(loop_scope="session")
async def test_reissue_downloads_requires_owner(client, admin_token, clean_test_users):
    ctx = await _create_published_product_with_package(client, admin_token, with_file=True)
    _, buyer1 = await _register_and_login(client, "buyer1")
    _, buyer2 = await _register_and_login(client, "buyer2")
    order = await _create_order(client, buyer1, ctx["package"]["id"])
    await client.post(
        f"/api/v1/admin/orders/{order['id']}/mark-paid",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    r = await client.post(
        f"/api/v1/orders/{order['id']}/downloads",
        headers={"Authorization": f"Bearer {buyer2}"},
        json={},
    )
    assert r.status_code == 404
