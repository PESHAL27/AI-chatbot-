from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of message author: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The user's prompt message")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for tracking sessions")
    messages: Optional[List[ChatMessage]] = Field(None, description="Optional conversation history context")
    history: Optional[List[ChatMessage]] = Field(None, description="Alias for conversation history")

    @field_validator('message')
    @classmethod
    def validate_message_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message cannot be empty or whitespace only")
        return stripped

class ChatResponse(BaseModel):
    response: str = Field(..., description="The AI assistant response message")
    conversation_id: str = Field(..., description="The active or generated conversation ID")
    status: str = Field("success", description="Status code string")

class HealthCheckResponse(BaseModel):
    status: str = Field("ok", description="Service status")
    service: str = Field("PML Backend", description="Service name")
