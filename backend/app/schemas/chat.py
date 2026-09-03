from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator
from app.schemas.image import GeneratedImageData

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of message author: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")

class DocumentSourceCitation(BaseModel):
    file_name: str = Field(..., description="Name of source document")
    page_number: Optional[int] = Field(None, description="Page number where excerpt was found")
    excerpt: Optional[str] = Field(None, description="Relevant content snippet")
    score: Optional[float] = Field(None, description="Relevance score")

class WebSourceCitation(BaseModel):
    title: str = Field(..., description="Title of search result")
    url: str = Field(..., description="Clickable web URL")
    snippet: Optional[str] = Field(None, description="Relevant text snippet")
    source: Optional[str] = Field(None, description="Domain source name")

class WikipediaSourceCitation(BaseModel):
    title: str = Field(..., description="Wikipedia Article Title")
    url: str = Field(..., description="Clickable Wikipedia URL")
    snippet: Optional[str] = Field(None, description="Relevant excerpt summary from Wikipedia")
    description: Optional[str] = Field(None, description="Short Wikipedia topic description")
    thumbnail: Optional[str] = Field(None, description="Optional article thumbnail image URL")
    source: str = Field("wikipedia", description="Source identifier")

class ChatRequest(BaseModel):
    message: Optional[str] = Field(default="", description="The user's prompt message")
    images: Optional[List[str]] = Field(default=None, description="Optional list of base64 data URIs or image URLs for vision understanding")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for tracking sessions")
    messages: Optional[List[ChatMessage]] = Field(None, description="Optional conversation history context")
    history: Optional[List[ChatMessage]] = Field(None, description="Alias for conversation history")
    memory_enabled: Optional[bool] = Field(True, description="Whether long-term memory retrieval and extraction are enabled")
    document_id: Optional[str] = Field(None, description="Optional specific document ID to scope RAG search to")

    @model_validator(mode="after")
    def validate_message_or_images(self) -> "ChatRequest":
        text = (self.message or "").strip()
        has_images = bool(self.images and len(self.images) > 0)
        
        if not text and not has_images:
            raise ValueError("Either a text message or at least one image must be provided.")
        
        self.message = text
        return self

class ChatResponse(BaseModel):
    response: str = Field(..., description="The AI assistant response message")
    conversation_id: str = Field(..., description="The active or generated conversation ID")
    status: str = Field("success", description="Status code string")
    memories_used: Optional[List[str]] = Field(None, description="List of relevant memory statements utilized")
    sources: Optional[List[DocumentSourceCitation]] = Field(None, description="List of document citations utilized for RAG")
    web_sources: Optional[List[WebSourceCitation]] = Field(None, description="List of live web sources utilized for answer grounding")
    wikipedia_sources: Optional[List[WikipediaSourceCitation]] = Field(None, description="List of Wikipedia sources utilized for encyclopedia grounding")
    tools_called: Optional[List[str]] = Field(None, description="List of tool names executed during response generation")
    generated_images: Optional[List[GeneratedImageData]] = Field(None, description="List of AI images generated during this turn")

class HealthCheckResponse(BaseModel):
    status: str = Field("ok", description="Service status")
    service: str = Field("PML Backend", description="Service name")
