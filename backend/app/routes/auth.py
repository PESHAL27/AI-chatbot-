import os
import uuid
import secrets
import hashlib
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Header, Depends
from pydantic import BaseModel, Field

logger = logging.getLogger("pml.routes.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SQLITE_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "pml_storage.db"
)

def init_auth_tables():
    """Ensure users and user_tokens tables exist in SQLite."""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                avatar_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        conn.commit()
        conn.close()
    except Exception as err:
        logger.error(f"[Auth] Failed to initialize auth tables: {err}")

# Initialize tables on module load
init_auth_tables()

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, password_hash)

# Request & Response Models
class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password min 6 chars")
    full_name: Optional[str] = Field("Cosmic Explorer", description="User display name")

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    user_metadata: Dict[str, Any] = {}

class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AuthResponse(BaseModel):
    user: UserResponse
    session: SessionResponse

@router.post("/register", response_model=AuthResponse, summary="Register New User Account")
async def register(req: RegisterRequest):
    """
    Creates a new user record in SQLite with securely salted password hash.
    Generates an active session token.
    """
    init_auth_tables()
    clean_email = req.email.strip().lower()
    display_name = (req.full_name or "").strip() or clean_email.split("@")[0]

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    # Check if email already registered
    cursor.execute("SELECT id FROM users WHERE lower(email) = ?", (clean_email,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please switch to Sign In."
        )

    # Hash password and create user
    pwd_hash, salt = hash_password(req.password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    token = f"pml_sec_{secrets.token_urlsafe(32)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        "INSERT INTO users (id, email, full_name, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, clean_email, display_name, pwd_hash, salt, now_iso, now_iso)
    )
    cursor.execute(
        "INSERT INTO user_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, now_iso)
    )
    conn.commit()
    conn.close()

    user_obj = UserResponse(
        id=user_id,
        email=clean_email,
        full_name=display_name,
        user_metadata={"full_name": display_name}
    )
    return AuthResponse(
        user=user_obj,
        session=SessionResponse(
            access_token=token,
            user=user_obj
        )
    )

@router.post("/login", response_model=AuthResponse, summary="User Sign In")
async def login(req: LoginRequest):
    """
    Verifies user credentials against SQLite and returns an active session token.
    """
    init_auth_tables()
    clean_email = req.email.strip().lower()

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, full_name, password_hash, salt, avatar_url FROM users WHERE lower(email) = ?",
        (clean_email,)
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your details."
        )

    u_id, u_email, u_name, u_hash, u_salt, u_avatar = row
    if not verify_password(req.password, u_hash, u_salt):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your details."
        )

    # Issue new session token
    token = f"pml_sec_{secrets.token_urlsafe(32)}"
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        "INSERT INTO user_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, u_id, now_iso)
    )
    conn.commit()
    conn.close()

    user_obj = UserResponse(
        id=u_id,
        email=u_email,
        full_name=u_name,
        avatar_url=u_avatar,
        user_metadata={"full_name": u_name}
    )
    return AuthResponse(
        user=user_obj,
        session=SessionResponse(
            access_token=token,
            user=user_obj
        )
    )

@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User")
async def get_me(authorization: Optional[str] = Header(None)):
    """
    Returns profile information for the token supplied in Authorization header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = authorization.split("Bearer ")[1].strip()
    init_auth_tables()

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.email, u.full_name, u.avatar_url
        FROM users u
        JOIN user_tokens t ON u.id = t.user_id
        WHERE t.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")

    u_id, u_email, u_name, u_avatar = row
    return UserResponse(
        id=u_id,
        email=u_email,
        full_name=u_name,
        avatar_url=u_avatar,
        user_metadata={"full_name": u_name}
    )

@router.post("/logout", summary="Sign Out User Session")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Revokes the active session token.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_tokens WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"status": "ok", "message": "Signed out successfully"}
