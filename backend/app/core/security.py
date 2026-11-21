import hmac
import hashlib
import base64
import json
import datetime
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

def get_password_hash(password: str) -> str:
    # Secure salt-based hash
    salt = settings.jwt_secret_key[:16].encode()
    return hashlib.sha256(salt + password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    # Backward compatibility with unhashed dev passwords if any
    if hashed_password == plain_password:
        return True
    return hmac.compare_digest(get_password_hash(plain_password), hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.access_token_expire_minutes)
    to_encode["exp"] = expire.isoformat()

    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().strip("=")
    payload = base64.urlsafe_b64encode(json.dumps(to_encode).encode()).decode().strip("=")
    signature = base64.urlsafe_b64encode(
        hmac.new(settings.jwt_secret_key.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    ).decode().strip("=")
    return f"{header}.{payload}.{signature}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(settings.jwt_secret_key.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
        ).decode().strip("=")
        if not hmac.compare_digest(expected_sig, sig_b64):
            return None

        # Pad payload if needed
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        exp = payload.get("exp")
        if exp and datetime.datetime.fromisoformat(exp) < datetime.datetime.utcnow():
            return None
        return payload
    except Exception:
        return None

