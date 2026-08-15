from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.memory import (
    MemoryItem, 
    CreateMemoryRequest, 
    UpdateMemoryRequest, 
    MemoryListResponse
)
from app.services.database_service import DatabaseService
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/memories", tags=["Memories"])

@router.get("", response_model=MemoryListResponse, summary="Get Authenticated User Memories")
async def list_memories(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns list of long-term memories belonging to the authenticated user.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    if not user_id or user_id == "guest_user":
        return MemoryListResponse(memories=[], total_count=0, memory_enabled=True)

    try:
        memories = await DatabaseService.get_memories(user_id=user_id, user_token=token)
        items = [
            MemoryItem(
                id=m["id"],
                user_id=m["user_id"],
                memory=m["memory"],
                category=m.get("category", "context"),
                importance=m.get("importance", 3),
                source_conversation_id=m.get("source_conversation_id"),
                created_at=m.get("created_at"),
                updated_at=m.get("updated_at"),
                last_used_at=m.get("last_used_at")
            )
            for m in memories
        ]
        return MemoryListResponse(memories=items, total_count=len(items), memory_enabled=True)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve memories: {str(err)}"
        )

@router.post("", response_model=MemoryItem, summary="Create Memory Fact")
async def create_memory(
    req: CreateMemoryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Explicitly saves a new memory fact for the authenticated user.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    if not user_id or user_id == "guest_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You must be logged in to save long-term memories."
        )

    try:
        created = await DatabaseService.create_memory(
            user_id=user_id,
            memory=req.memory,
            category=req.category or "context",
            importance=req.importance or 3,
            source_conversation_id=req.source_conversation_id,
            user_token=token
        )
        return MemoryItem(
            id=created["id"],
            user_id=created["user_id"],
            memory=created["memory"],
            category=created.get("category", "context"),
            importance=created.get("importance", 3),
            source_conversation_id=created.get("source_conversation_id"),
            created_at=created.get("created_at"),
            updated_at=created.get("updated_at"),
            last_used_at=created.get("last_used_at")
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to create memory: {str(err)}"
        )

@router.patch("/{memory_id}", response_model=MemoryItem, summary="Update Memory Fact")
async def update_memory(
    memory_id: str,
    req: UpdateMemoryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Updates an existing memory statement owned by the authenticated user.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    if not user_id or user_id == "guest_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    try:
        updated = await DatabaseService.update_memory(
            memory_id=memory_id,
            user_id=user_id,
            memory=req.memory,
            category=req.category,
            importance=req.importance,
            user_token=token
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Memory not found or access denied."
            )
        return MemoryItem(
            id=updated["id"],
            user_id=updated["user_id"],
            memory=updated["memory"],
            category=updated.get("category", "context"),
            importance=updated.get("importance", 3),
            source_conversation_id=updated.get("source_conversation_id"),
            created_at=updated.get("created_at"),
            updated_at=updated.get("updated_at"),
            last_used_at=updated.get("last_used_at")
        )
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to update memory: {str(err)}"
        )

@router.delete("/{memory_id}", summary="Delete Single Memory")
async def delete_memory(
    memory_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes an individual memory record belonging to the authenticated user.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    if not user_id or user_id == "guest_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    try:
        success = await DatabaseService.delete_memory(
            memory_id=memory_id,
            user_id=user_id,
            user_token=token
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Memory not found or access denied."
            )
        return {"status": "success", "message": "Memory deleted successfully", "id": memory_id}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to delete memory: {str(err)}"
        )

@router.delete("", summary="Clear All Memories")
async def clear_all_memories(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Clears all stored memories for the authenticated user without affecting conversations or profile.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    if not user_id or user_id == "guest_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    try:
        await DatabaseService.clear_all_memories(user_id=user_id, user_token=token)
        return {"status": "success", "message": "All long-term memories cleared successfully."}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to clear memories: {str(err)}"
        )
