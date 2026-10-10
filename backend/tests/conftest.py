"""Test setup: a throwaway SQLite database filled with the demo data, and Supabase-style
tokens signed with a test secret (so no real Supabase project is needed)."""
import os
import sys
import tempfile
import time

_tmp = tempfile.mkdtemp(prefix="hireflow-tests-")
os.environ.update(
    DATABASE_URL=f"sqlite:///{_tmp}/test.db",
    SUPABASE_URL="https://test.supabase.co",
    SUPABASE_JWT_SECRET="test-secret",
    SUPABASE_SERVICE_ROLE_KEY="",
    SEED_DEMO_DATA="true",
    GEMINI_API_KEY="",
    UPLOAD_BACKEND="local",
)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from database import SessionLocal  # noqa: E402
from models.models import User  # noqa: E402

ADMIN = "admin@hireflow.ai"
MANAGER = "priya.sharma@hireflow.ai"
EMPLOYEE = "amit.kumar@hireflow.ai"
OTHER_EMPLOYEE = "sneha.patel@hireflow.ai"


def token(email: str) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": email, "email": email, "aud": "authenticated", "iss": "https://test.supabase.co/auth/v1", "iat": now, "exp": now + 600},
        "test-secret",
        algorithm="HS256",
    )


@pytest.fixture(scope="session")
def client():
    with TestClient(main.app) as c:
        yield c


@pytest.fixture(scope="session")
def ids(client):
    """Employee ids of the people the tests sign in as."""
    db = SessionLocal()
    try:
        return {u.email: u.employee_id for u in db.query(User).all()}
    finally:
        db.close()


@pytest.fixture(scope="session")
def as_user(client):
    """as_user(email).get(...) etc. — a client that sends that person's token."""

    class _As:
        def __init__(self, email):
            self.headers = {"Authorization": f"Bearer {token(email)}"}

        def get(self, url, **kw):
            return client.get(url, headers=self.headers, **kw)

        def post(self, url, **kw):
            return client.post(url, headers=self.headers, **kw)

        def put(self, url, **kw):
            return client.put(url, headers=self.headers, **kw)

        def delete(self, url, **kw):
            return client.delete(url, headers=self.headers, **kw)

    return _As
