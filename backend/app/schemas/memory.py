from typing import Optional, List, Literal
from pydantic import BaseModel, Field

MemoryCategory = Literal["preference", "goal", "project", "communication", "context"]

class MemoryItem(BaseModel):
    id: str = Field(..., description="Unique memory identifier")
    user_id: str = Field(..., description="Owner user ID")
    memory: str = Field(..., description="Concise memory text")
    category: MemoryCategory = Field("context", description="Category classification")
    importance: int = Field(3, ge=1, le=5, description="Importance score from 1 to 5")
    source_conversation_id: Optional[str] = Field(None, description="Source conversation ID")
    created_at: Optional[str] = Field(None, description="Timestamp ISO string")
    updated_at: Optional[str] = Field(None, description="Timestamp ISO string")
    last_used_at: Optional[str] = Field(None, description="Last retrieval timestamp ISO string")

class CreateMemoryRequest(BaseModel):
    memory: str = Field(..., min_length=2, max_length=500, description="Memory fact statement")
    category: Optional[MemoryCategory] = Field("context", description="Memory category")
    importance: Optional[int] = Field(3, ge=1, le=5, description="Importance rating")
    source_conversation_id: Optional[str] = Field(None, description="Associated conversation ID")

class UpdateMemoryRequest(BaseModel):
    memory: Optional[str] = Field(None, min_length=2, max_length=500, description="Updated memory text")
    category: Optional[MemoryCategory] = Field(None, description="Updated category")
    importance: Optional[int] = Field(None, ge=1, le=5, description="Updated importance rating")

class MemoryListResponse(BaseModel):
    memories: List[MemoryItem]
    total_count: int
    memory_enabled: bool = True
