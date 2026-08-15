from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.database_service import DatabaseService

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field("New Conversation", description="Initial conversation title")
    user_id: Optional[str] = Field("guest_user", description="User identifier")

class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, description="New conversation title")

@router.get("", summary="Get User Conversations List")
async def list_conversations(user_id: str = "guest_user"):
    """
    Returns list of saved conversations for a user ordered by updated_at DESC.
    """
    try:
        conversations = await DatabaseService.get_conversations(user_id=user_id)
        return conversations
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load conversations: {str(err)}"
        )

@router.post("", summary="Create New Conversation")
async def create_conversation(req: CreateConversationRequest):
    """
    Creates a new conversation record.
    """
    try:
        conv = await DatabaseService.create_conversation(title=req.title, user_id=req.user_id)
        return conv
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to create conversation: {str(err)}"
        )

@router.get("/{conversation_id}", summary="Get Conversation Details & Messages History")
async def get_conversation(conversation_id: str):
    """
    Returns conversation information along with full message history logs.
    """
    try:
        conv = await DatabaseService.get_conversation_with_messages(conversation_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return conv
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PML couldn't load this conversation. Please try again."
        )

@router.patch("/{conversation_id}", summary="Rename Conversation Title")
async def rename_conversation(conversation_id: str, req: RenameConversationRequest):
    """
    Renames a conversation title.
    """
    try:
        updated = await DatabaseService.rename_conversation(conversation_id, req.title)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
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
async def delete_conversation(conversation_id: str):
    """
    Deletes a conversation and all its stored messages.
    """
    try:
        success = await DatabaseService.delete_conversation(conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return {"message": "Conversation deleted successfully", "id": conversation_id}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to delete conversation: {str(err)}"
        )
