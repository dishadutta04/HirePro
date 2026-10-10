import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt as pyjwt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_jwks_client: Optional[pyjwt.PyJWKClient] = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def unusable_password_hash() -> str:
    """For accounts that sign in through Supabase: no password is ever checked locally."""
    return get_password_hash(secrets.token_urlsafe(32))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def supabase_enabled() -> bool:
    return bool(settings.SUPABASE_URL)


def _decode_supabase_token(token: str) -> dict:
    """Verify a Supabase access token and return its claims."""
    options = {"require": ["exp", "sub"]}
    issuer = f"{settings.SUPABASE_URL}/auth/v1"
    if settings.SUPABASE_JWT_SECRET:
        return pyjwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"],
                            audience="authenticated", issuer=issuer, options=options)
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = pyjwt.PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_keys=True)
    key = _jwks_client.get_signing_key_from_jwt(token)
    return pyjwt.decode(token, key.key, algorithms=["ES256", "RS256"],
                        audience="authenticated", issuer=issuer, options=options)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    from models.models import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if supabase_enabled():
        try:
            claims = _decode_supabase_token(token)
        except pyjwt.PyJWTError:
            raise credentials_exception
        email = (claims.get("email") or "").lower()
        if not email:
            raise credentials_exception
        # Roles live in the HireFlow users table, so only people an admin added can get in,
        # even if someone signs up directly against Supabase.
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if user is None:
            raise HTTPException(status_code=403, detail="This account isn't set up in HireFlow. Ask an admin to invite you.")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")
        return user

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles):
    def role_checker(user=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return role_checker


def send_supabase_invite(email: str, full_name: str) -> None:
    """Ask Supabase to email an invite link; the person sets their own password from it."""
    if not (supabase_enabled() and settings.SUPABASE_SERVICE_ROLE_KEY):
        raise HTTPException(status_code=503, detail="Supabase invites aren't configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
    redirect = f"{settings.FRONTEND_URL}/auth/confirm?next=/set-password"
    req = urllib.request.Request(
        f"{settings.SUPABASE_URL}/auth/v1/invite?redirect_to={urllib.parse.quote(redirect, safe='')}",
        data=json.dumps({"email": email, "data": {"full_name": full_name}}).encode(),
        headers={
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            message = json.loads(body).get("msg") or json.loads(body).get("message") or body
        except ValueError:
            message = body
        raise HTTPException(status_code=400, detail=f"Supabase invite failed: {message}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Couldn't reach Supabase: {e.reason}")
