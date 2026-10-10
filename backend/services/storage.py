"""File storage for uploads (profile photos, documents, resumes).

With SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set, files go to a private Supabase Storage bucket and
the API hands out short-lived signed links. Otherwise they are written to backend/uploads and served
at /uploads/... (fine for local development).

The database stores a reference, not a link: "/uploads/<folder>/<name>" for local files or
"storage://<folder>/<name>" for Supabase. `file_url()` turns a reference into something a browser can open.
"""
import os
import time
import uuid
from typing import Iterable, Optional

import httpx
from fastapi import HTTPException, UploadFile

from config import settings

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SIGNED_URL_SECONDS = 3600
STORAGE_PREFIX = "storage://"
LOCAL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

# reference -> (signed url, unix time it stops being worth reusing)
_signed_cache: dict[str, tuple[str, float]] = {}
_bucket_ready = False


def using_supabase() -> bool:
    if settings.UPLOAD_BACKEND == "local":
        return False
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def _client() -> httpx.Client:
    """Separate function so tests can swap in a fake transport."""
    return httpx.Client(
        base_url=f"{settings.SUPABASE_URL}/storage/v1",
        headers={
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        },
        timeout=20,
    )


def _ensure_bucket(client: httpx.Client) -> None:
    global _bucket_ready
    if _bucket_ready:
        return
    bucket = settings.SUPABASE_STORAGE_BUCKET
    res = client.post("/bucket", json={"id": bucket, "name": bucket, "public": False,
                                       "file_size_limit": MAX_UPLOAD_BYTES})
    # 200 = created; 400/409 = it already exists.
    if res.status_code not in (200, 201, 400, 409):
        raise HTTPException(status_code=502, detail=f"Couldn't prepare Supabase Storage ({res.status_code}): {res.text[:200]}")
    _bucket_ready = True


async def upload_file(file: UploadFile, folder: str = "documents") -> str:
    """Stores the upload and returns its reference (see module docstring)."""
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 10 MB)")
    ext = os.path.splitext(file.filename or "")[1].lower()
    name = f"{uuid.uuid4().hex}{ext}"

    if not using_supabase():
        target = os.path.join(LOCAL_DIR, folder)
        os.makedirs(target, exist_ok=True)
        with open(os.path.join(target, name), "wb") as f:
            f.write(contents)
        return f"/uploads/{folder}/{name}"

    path = f"{folder}/{name}"
    with _client() as client:
        _ensure_bucket(client)
        res = client.post(
            f"/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}",
            content=contents,
            headers={"Content-Type": file.content_type or "application/octet-stream", "x-upsert": "false"},
        )
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Upload to Supabase Storage failed ({res.status_code}): {res.text[:200]}")
    return f"{STORAGE_PREFIX}{path}"


def _sign(paths: list[str]) -> dict[str, str]:
    """Signed links for several stored paths in one request."""
    bucket = settings.SUPABASE_STORAGE_BUCKET
    with _client() as client:
        res = client.post(f"/object/sign/{bucket}", json={"expiresIn": SIGNED_URL_SECONDS, "paths": paths})
    if res.status_code != 200:
        return {}
    out = {}
    for item in res.json():
        signed = item.get("signedURL") or item.get("signedUrl")
        if signed and not item.get("error"):
            out[item["path"]] = f"{settings.SUPABASE_URL}/storage/v1{signed}"
    return out


def prefetch(refs: Iterable[Optional[str]]) -> None:
    """Sign every not-yet-cached Supabase reference in one round trip (use before listing many rows)."""
    now = time.time()
    todo = [r[len(STORAGE_PREFIX):] for r in set(refs)
            if r and r.startswith(STORAGE_PREFIX) and _signed_cache.get(r, ("", 0))[1] <= now]
    if not todo or not using_supabase():
        return
    for path, url in _sign(todo).items():
        # Reuse a link for most of its lifetime, never right up to expiry.
        _signed_cache[f"{STORAGE_PREFIX}{path}"] = (url, now + SIGNED_URL_SECONDS * 0.8)


def file_url(ref: Optional[str]) -> Optional[str]:
    """What the browser should open for a stored reference."""
    if not ref or not ref.startswith(STORAGE_PREFIX):
        return ref  # local "/uploads/..." path (or empty)
    prefetch([ref])
    cached = _signed_cache.get(ref)
    return cached[0] if cached else None


def delete_file(ref: Optional[str]) -> None:
    """Best effort: a failed delete must not block removing the database row."""
    if not ref:
        return
    try:
        if ref.startswith(STORAGE_PREFIX):
            if using_supabase():
                with _client() as client:
                    client.request("DELETE", f"/object/{settings.SUPABASE_STORAGE_BUCKET}",
                                   json={"prefixes": [ref[len(STORAGE_PREFIX):]]})
            _signed_cache.pop(ref, None)
        elif ref.startswith("/uploads/"):
            local = os.path.normpath(os.path.join(LOCAL_DIR, ref[len("/uploads/"):]))
            if local.startswith(LOCAL_DIR) and os.path.isfile(local):
                os.remove(local)
    except (httpx.HTTPError, OSError):
        pass
