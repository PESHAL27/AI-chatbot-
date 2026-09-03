import uuid
import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import Header, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

logger = logging.getLogger("pml.auth")

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_guest_id: Optional[str] = Header(None, alias="X-Guest-ID")
) -> Dict[str, Any]:
    """
    Dependency that resolves the active PML caller identity.
    Strictly isolates authenticated Supabase users from temporary guest sessions.
    - If Bearer token is provided: Verifies against Supabase Auth. Rejects invalid/expired tokens with 401.
    - If no credentials are provided: Returns an isolated guest user with a unique session ID.
    """
    raw_guest = (x_guest_id or "").strip()
    clean_guest = "".join(c for c in raw_guest if c.isalnum() or c in "_-")
    if clean_guest and clean_guest not in ("guest", "guest_user", "null", "undefined"):
        guest_id = clean_guest
    else:
        guest_id = f"guest_{uuid.uuid4().hex[:12]}"

    if not credentials or not credentials.credentials:
        return {
            "id": guest_id,
            "email": "guest@pml.universe",
            "full_name": "Guest Explorer",
            "is_guest": True,
            "token": None
        }

    token = credentials.credentials

    # If Supabase is not configured or in local test mode
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY or "your-project-id" in settings.SUPABASE_URL:
        return {
            "id": "local-dev-user-001",
            "email": "dev@pml.universe",
            "full_name": "Local Developer",
            "is_guest": False,
            "token": token
        }

    # Verify token with Supabase Auth API
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": settings.SUPABASE_KEY,
                "Authorization": f"Bearer {token}"
            }
            res = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers=headers,
                timeout=8.0
            )

            if res.status_code == 200:
                user_data = res.json()
                user_id = user_data.get("id")
                email = user_data.get("email", "")
                user_metadata = user_data.get("user_metadata", {}) or {}
                full_name = user_metadata.get("full_name") or email.split("@")[0] if email else "Cosmic Explorer"

                return {
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "is_guest": False,
                    "token": token,
                    "raw": user_data
                }
            elif res.status_code in (401, 403):
                logger.warning(f"[PML Auth] Supabase Auth token invalid or expired: status {res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed or session expired. Please sign in again."
                )
            else:
                logger.warning(f"[PML Auth] Supabase Auth token verification returned status {res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not verify authentication credentials."
                )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"[PML Auth] Error verifying token with Supabase: {err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication verification failed."
        )

async def require_authenticated_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Strict authorization dependency for private/sensitive operations.
    Rejects guest requests with HTTP 401 Unauthorized.
    """
    if current_user.get("is_guest") or not current_user.get("id") or str(current_user.get("id")).startswith("guest"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this private resource.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return current_user
