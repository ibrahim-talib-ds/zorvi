"""ZORVI — marketplace admin CRUD + public browse tests."""
import uuid

import pytest


async def _create_category(client, admin_token, name: str | None = None) -> dict:
    name = name or f"Cat-{uuid.uuid4().hex[:6]}"
    r = await client.post(
        "/api/v1/admin/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": name},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_product(client, admin_token, **overrides) -> dict:
    payload = {
        "title": f"Product {uuid.uuid4().hex[:6]}",
        "short_description": "An automated test product for marketplace",
        "starting_price_cents": 4999,
    }
    payload.update(overrides)
    r = await client.post(
        "/api/v1/admin/marketplace",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.asyncio(loop_scope="session")
async def test_category_create_and_slug(client, admin_token):
    cat = await _create_category(client, admin_token, name="Mobile Apps")
    assert cat["slug"].startswith("mobile-apps")
    assert cat["is_active"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_product_create_is_draft(client, admin_token):
    p = await _create_product(client, admin_token)
    assert p["status"] == "draft"
    assert p["published_at"] is None
    assert p["currency"] == "USD"


@pytest.mark.asyncio(loop_scope="session")
async def test_draft_not_publicly_visible(client, admin_token):
    p = await _create_product(client, admin_token)
    r = await client.get(f"/api/v1/marketplace/products/{p['slug']}")
    assert r.status_code == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_publish_makes_visible(client, admin_token):
    p = await _create_product(client, admin_token)
    r = await client.patch(
        f"/api/v1/admin/marketplace/{p['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "published"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"
    assert r.json()["published_at"] is not None

    detail = await client.get(f"/api/v1/marketplace/products/{p['slug']}")
    assert detail.status_code == 200
    assert detail.json()["slug"] == p["slug"]


@pytest.mark.asyncio(loop_scope="session")
async def test_package_create(client, admin_token):
    p = await _create_product(client, admin_token)
    r = await client.post(
        f"/api/v1/admin/marketplace/{p['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Professional",
            "price_cents": 19900,
            "license_type": "commercial",
            "includes_source_code": True,
            "includes_documentation": True,
            "includes_support_days": 90,
        },
    )
    assert r.status_code == 201, r.text
    pkg = r.json()
    assert pkg["name"] == "Professional"
    assert pkg["price_cents"] == 19900
    assert pkg["license_type"] == "commercial"


@pytest.mark.asyncio(loop_scope="session")
async def test_duplicate_package_name_rejected(client, admin_token):
    p = await _create_product(client, admin_token)
    payload = {"name": "Basic", "price_cents": 500}
    r1 = await client.post(
        f"/api/v1/admin/marketplace/{p['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert r1.status_code == 201
    r2 = await client.post(
        f"/api/v1/admin/marketplace/{p['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert r2.status_code == 409


@pytest.mark.asyncio(loop_scope="session")
async def test_public_browse_shows_only_published(client, admin_token):
    # create one draft and one published
    draft = await _create_product(client, admin_token, title="Hidden Draft xyz")
    pub = await _create_product(client, admin_token, title="Visible Published xyz")
    await client.patch(
        f"/api/v1/admin/marketplace/{pub['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "published"},
    )
    r = await client.get("/api/v1/marketplace/products?limit=100")
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json()]
    assert pub["slug"] in slugs
    assert draft["slug"] not in slugs


@pytest.mark.asyncio(loop_scope="session")
async def test_search_filter(client, admin_token):
    unique = f"zz{uuid.uuid4().hex[:6]}"
    p = await _create_product(
        client, admin_token, title=f"Unique {unique} Project",
        short_description=f"Searchable {unique} description"
    )
    await client.patch(
        f"/api/v1/admin/marketplace/{p['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "published"},
    )
    r = await client.get(f"/api/v1/marketplace/products?q={unique}")
    assert r.status_code == 200
    assert any(item["slug"] == p["slug"] for item in r.json())


@pytest.mark.asyncio(loop_scope="session")
async def test_category_filter(client, admin_token):
    cat = await _create_category(client, admin_token)
    p = await _create_product(client, admin_token, category_id=cat["id"])
    await client.patch(
        f"/api/v1/admin/marketplace/{p['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "published"},
    )
    r = await client.get(f"/api/v1/marketplace/products?category={cat['slug']}")
    assert r.status_code == 200
    assert any(item["slug"] == p["slug"] for item in r.json())


@pytest.mark.asyncio(loop_scope="session")
async def test_packages_returned_in_product_detail(client, admin_token):
    p = await _create_product(client, admin_token)
    await client.post(
        f"/api/v1/admin/marketplace/{p['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Basic", "price_cents": 1000},
    )
    await client.post(
        f"/api/v1/admin/marketplace/{p['id']}/packages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Premium", "price_cents": 5000},
    )
    await client.patch(
        f"/api/v1/admin/marketplace/{p['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "published"},
    )
    r = await client.get(f"/api/v1/marketplace/products/{p['slug']}")
    assert r.status_code == 200
    data = r.json()
    assert len(data["packages"]) == 2
    names = {pkg["name"] for pkg in data["packages"]}
    assert names == {"Basic", "Premium"}


@pytest.mark.asyncio(loop_scope="session")
async def test_category_slug_unique(client, admin_token):
    n = f"UniqueCat-{uuid.uuid4().hex[:6]}"
    await _create_category(client, admin_token, name=n)
    # same name → slug auto-suffix, should succeed
    r = await client.post(
        "/api/v1/admin/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": n},
    )
    assert r.status_code == 201
    # explicit conflicting slug → 409
    r2 = await client.post(
        "/api/v1/admin/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Different Name", "slug": r.json()["slug"]},
    )
    assert r2.status_code == 409
