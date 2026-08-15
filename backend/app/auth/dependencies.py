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
    Extracts and returns the verified user identity ({id, email, full_name}).
    Rejects unauthenticated or invalid token requests with HTTP 401.
    """
    if not credentials or not credentials.credentials:
        # If running in local dev without auth enabled, allow guest fallback only if explicitly set
        if settings.APP_ENV == "development" and not settings.SUPABASE_KEY:
            return {"id": "guest_user", "email": "explorer@pml.universe", "full_name": "Guest Explorer"}
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to PML.",
            headers={"WWW-Authenticate": "Bearer"},
        )

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
                    "token": token
                }
            else:
                logger.warn(f"Supabase Auth token verification failed with status {res.status_code}: {res.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired session. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during authentication token verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
