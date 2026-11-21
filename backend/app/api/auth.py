import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..database import get_db
from ..models.user import User
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str
    full_name: str = ""

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

def create_jwt_token(data: dict) -> str:
    # Lightweight token encoder
    import hmac
    import hashlib
    import base64
    import json

    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().strip("=")
    payload_data = data.copy()
    payload_data["exp"] = (datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.access_token_expire_minutes)).isoformat()
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().strip("=")
    signature = base64.urlsafe_b64encode(
        hmac.new(settings.jwt_secret_key.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    ).decode().strip("=")
    return f"{header}.{payload}.{signature}"

@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already registered.")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=body.password, # In production wrap with bcrypt
        full_name=body.full_name,
    )
    db.add(user)
    db.commit()

    token = create_jwt_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token)

@router.post("/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or user.hashed_password != form_data.password:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_jwt_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token)
