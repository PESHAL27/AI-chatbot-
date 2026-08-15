from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DocumentItem(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_type: str
    file_size: int
    storage_path: Optional[str] = None
    status: str = Field("processing", description="'uploading', 'processing', 'ready', 'failed'")
    error_message: Optional[str] = None
    chunk_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class DocumentListResponse(BaseModel):
    documents: List[DocumentItem]
    total_count: int

class DocumentChunkItem(BaseModel):
    id: str
    document_id: str
    user_id: str
    content: str
    chunk_index: int
    page_number: Optional[int] = None
    score: Optional[float] = None
    file_name: Optional[str] = None

class DocumentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    document_id: Optional[str] = None
    top_k: int = Field(4, ge=1, le=10)

class DocumentSearchResponse(BaseModel):
    query: str
    results: List[DocumentChunkItem]
    total_found: int
