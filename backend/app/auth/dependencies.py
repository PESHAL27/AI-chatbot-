import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import Header, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

logger = logging.getLogger("pml.auth")

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Verifies the Supabase Auth access token passed in the Authorization header.
    If no token is provided, returns a Guest Explorer user identity so visitors
    can freely explore and chat with PML without mandatory login.
    """
    if not credentials or not credentials.credentials:
        # Seamless Guest Access Mode
        return {
            "id": "guest_user",
            "email": "guest@pml.universe",
            "full_name": "Guest Explorer",
            "is_guest": True,
            "token": None
        }

    token = credentials.credentials

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
                metadata = user_data.get("user_metadata", {})
                full_name = metadata.get("full_name", email.split("@")[0] if email else "Explorer")

                return {
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "is_guest": False,
                    "token": token
                }
            else:
                logger.warning(f"Supabase Auth token verification failed with status {res.status_code}")
                return {
                    "id": "guest_user",
                    "email": "guest@pml.universe",
                    "full_name": "Guest Explorer",
                    "is_guest": True,
                    "token": None
                }
    except Exception as e:
        logger.error(f"Error during authentication token verification: {e}")
        return {
            "id": "guest_user",
            "email": "guest@pml.universe",
            "full_name": "Guest Explorer",
            "is_guest": True,
            "token": None
        }

async def require_authenticated_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Strict authorization dependency for private/sensitive operations.
    Rejects guest requests with HTTP 401 Unauthorized.
    """
    if current_user.get("is_guest") or not current_user.get("id") or current_user.get("id") == "guest_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this private resource.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return current_user
