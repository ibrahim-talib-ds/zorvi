"""ZORVI — storage abstraction for marketplace deliverables.

Public interface: StorageProvider
Dev implementation: LocalStorage  (files under backend/storage/products/)

Rules for this module:
  - Never expose absolute paths in any HTTP response.
  - Never serve files from a web server; only stream through /downloads/{token}.
  - The `storage_key` in the DB is relative to STORAGE_ROOT.
  - A future S3/R2 provider must implement the same 3 methods, no more.

The storage_key layout for marketplace files (Phase 8+):
    {product_id}/{package_id or "shared"}/{filename}   (root already ends in products/)
"""
import os
from pathlib import Path
from typing import BinaryIO, Protocol

from app.core.config import get_settings

settings = get_settings()


class StorageProvider(Protocol):
    """Every storage backend (local, S3, R2) implements this protocol."""
    def exists(self, storage_key: str) -> bool: ...
    def open_read(self, storage_key: str) -> BinaryIO: ...
    def path_hint(self, storage_key: str) -> str:
        """Human hint only — never sent in an HTTP response."""
        ...


class LocalStorage:
    """Files live on disk under STORAGE_ROOT. Default: backend/storage/products."""

    def __init__(self, root: Path | str | None = None) -> None:
        if root is None:
            env_root = os.environ.get("ZORVI_STORAGE_ROOT", "").strip()
            if env_root:
                self.root = Path(env_root).resolve()
            else:
                # backend/storage/products — always relative to backend/
                self.root = (
                    Path(__file__).resolve().parents[2] / "storage" / "products"
                ).resolve()
        else:
            self.root = Path(root).resolve()

        self.root.mkdir(parents=True, exist_ok=True)

    def _safe_join(self, storage_key: str) -> Path:
        """Prevent ../ path traversal. Rejects keys with absolute paths."""
        if not storage_key or storage_key.startswith("/"):
            raise ValueError("invalid storage_key")
        key_path = Path(storage_key)
        if any(part == ".." for part in key_path.parts):
            raise ValueError("storage_key must not contain '..'")
        full = (self.root / key_path).resolve()
        if not str(full).startswith(str(self.root) + os.sep) and full != self.root:
            raise ValueError("storage_key escapes storage root")
        return full

    def exists(self, storage_key: str) -> bool:
        return self._safe_join(storage_key).is_file()

    def open_read(self, storage_key: str) -> BinaryIO:
        return open(self._safe_join(storage_key), "rb")

    def path_hint(self, storage_key: str) -> str:
        return str(self._safe_join(storage_key))

    async def save(self, storage_key: str, upload_file) -> int:
        """Save an UploadFile to disk. Returns file size in bytes."""
        full_path = self._safe_join(storage_key)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        size = 0
        with open(full_path, "wb") as buffer:
            while True:
                chunk = await upload_file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                buffer.write(chunk)
                size += len(chunk)
        return size


# Single module-level instance. Swap for S3Storage later without touching routes.
storage: StorageProvider = LocalStorage()
