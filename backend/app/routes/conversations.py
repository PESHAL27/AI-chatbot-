from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from app.services.database_service import DatabaseService
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field("New Conversation", description="Initial conversation title")

class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, description="New conversation title")

@router.get("", summary="Get User Conversations List")
async def list_conversations(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns list of saved conversations for the authenticated user ordered by updated_at DESC.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        conversations = await DatabaseService.get_conversations(user_id=user_id, user_token=token)
        return conversations
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load conversations: {str(err)}"
        )

@router.post("", summary="Create New Conversation")
async def create_conversation(
    req: CreateConversationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Creates a new conversation record tied to the authenticated user.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        conv = await DatabaseService.create_conversation(title=req.title, user_id=user_id, user_token=token)
        return conv
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to create conversation: {str(err)}"
        )

@router.get("/{conversation_id}", summary="Get Conversation Details & Messages History")
async def get_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns conversation information and messages, verifying user ownership.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        conv = await DatabaseService.get_conversation_with_messages(conversation_id, user_id=user_id, user_token=token)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied."
            )
        return conv
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PML couldn't load this conversation. Please try again."
        )

@router.patch("/{conversation_id}", summary="Rename Conversation Title")
async def rename_conversation(
    conversation_id: str,
    req: RenameConversationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Renames a conversation title with user ownership check.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        updated = await DatabaseService.rename_conversation(conversation_id, req.title, user_id=user_id, user_token=token)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied."
            )
        return updated
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to rename conversation: {str(err)}"
        )

@router.delete("/{conversation_id}", summary="Delete Conversation")
async def delete_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes a conversation and all its stored messages with user ownership check.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        success = await DatabaseService.delete_conversation(conversation_id, user_id=user_id, user_token=token)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied."
            )
        return {"message": "Conversation deleted successfully", "id": conversation_id}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to delete conversation: {str(err)}"
        )
