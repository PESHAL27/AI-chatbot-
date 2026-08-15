from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse, summary="Process Authenticated Chat Message")
async def chat_endpoint(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Receives user prompt messages, validates authentication token,
    and returns AI assistant response tied to current user account.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        response = await ChatService.process_chat(
            request=request, 
            user_id=user_id,
            user_token=token
        )
        return response
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred: {str(err)}"
        )
