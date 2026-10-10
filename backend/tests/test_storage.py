"""Uploads go to a private Supabase Storage bucket when configured, and come back as signed links."""
import io
import json

import httpx
import pytest

import services.storage as storage
from config import settings
from conftest import EMPLOYEE, MANAGER


@pytest.fixture
def fake_supabase_storage(monkeypatch):
    """A stand-in for the Supabase Storage API that records what the backend sends."""
    calls, objects = [], {}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path.removeprefix("/storage/v1")
        calls.append((request.method, path))
        if request.method == "POST" and path == "/bucket":
            return httpx.Response(200, json={"name": json.loads(request.content)["name"]})
        if request.method == "POST" and path.startswith("/object/sign/"):
            body = json.loads(request.content)
            return httpx.Response(200, json=[{"path": p, "signedURL": f"/object/sign/hireflow-files/{p}?token=t", "error": None} for p in body["paths"]])
        if request.method == "POST" and path.startswith("/object/"):
            objects[path.removeprefix("/object/")] = request.content
            return httpx.Response(200, json={"Key": path})
        if request.method == "DELETE" and path.startswith("/object/"):
            for p in json.loads(request.content)["prefixes"]:
                objects.pop(f"hireflow-files/{p}", None)
            return httpx.Response(200, json=[])
        return httpx.Response(404)

    monkeypatch.setattr(settings, "UPLOAD_BACKEND", "auto")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "service-key")
    monkeypatch.setattr(storage, "_bucket_ready", False)
    monkeypatch.setattr(storage, "_signed_cache", {})
    monkeypatch.setattr(storage, "_client", lambda: httpx.Client(
        base_url=f"{settings.SUPABASE_URL}/storage/v1", transport=httpx.MockTransport(handler)))
    return calls, objects


def test_documents_go_to_private_bucket_with_signed_links(fake_supabase_storage, as_user, ids):
    calls, objects = fake_supabase_storage
    me = as_user(EMPLOYEE)
    res = me.post("/api/documents", data={"document_name": "PAN card", "document_type": "id_proof", "employee_id": str(ids[EMPLOYEE])},
                  files={"file": ("pan.pdf", b"%PDF-1.4 test", "application/pdf")})
    assert res.status_code == 200
    assert ("POST", "/bucket") in calls
    stored = [k for k in objects if k.startswith("hireflow-files/documents/id_proof/")]
    assert len(stored) == 1 and objects[stored[0]] == b"%PDF-1.4 test"
    assert res.json()["file_url"].startswith(f"{settings.SUPABASE_URL}/storage/v1/object/sign/")

    listed = next(d for d in me.get("/api/documents").json() if d["document_name"] == "PAN card")
    assert "token=" in listed["file_url"]

    assert as_user(MANAGER).delete(f"/api/documents/{listed['id']}").status_code == 200
    assert not [k for k in objects if k.startswith("hireflow-files/documents/id_proof/")]


def test_profile_photo_replaces_old_file(fake_supabase_storage, as_user, ids):
    _, objects = fake_supabase_storage
    me = as_user(EMPLOYEE)
    for _ in range(2):
        res = me.post(f"/api/employees/{ids[EMPLOYEE]}/upload-image", files={"file": ("me.png", b"png", "image/png")})
        assert res.status_code == 200
    assert len([k for k in objects if "/profiles/" in k]) == 1  # the first photo was cleaned up
    assert "token=" in me.get(f"/api/employees/{ids[EMPLOYEE]}").json()["profile_picture"]


def test_uploads_over_10mb_are_refused(as_user, ids):
    big = io.BytesIO(b"0" * (10 * 1024 * 1024 + 1))
    res = as_user(EMPLOYEE).post("/api/documents", data={"document_name": "big", "employee_id": str(ids[EMPLOYEE])},
                                 files={"file": ("big.bin", big, "application/octet-stream")})
    assert res.status_code == 413


def test_local_disk_is_used_without_service_key(as_user, ids):
    res = as_user(EMPLOYEE).post("/api/documents", data={"document_name": "local", "employee_id": str(ids[EMPLOYEE])},
                                 files={"file": ("a.txt", b"x", "text/plain")})
    assert res.json()["file_url"].startswith("/uploads/documents/")
