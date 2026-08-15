import os
import uuid
import asyncio
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, BackgroundTasks
from app.schemas.document import (
    DocumentItem,
    DocumentListResponse,
    DocumentChunkItem,
    DocumentSearchRequest,
    DocumentSearchResponse
)
from app.services.database_service import DatabaseService
from app.services.rag_service import RAGService
from app.auth.dependencies import get_current_user

logger = logging.getLogger("pml.routes.documents")

router = APIRouter(prefix="/api/documents", tags=["Documents & RAG"])

# Storage directory for local document files
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "documents")
os.makedirs(STORAGE_DIR, exist_ok=True)

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB Limit
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".json"}

@router.post("/upload", response_model=DocumentItem, summary="Upload Document for RAG Ingestion")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Receives an uploaded document, validates file type & size,
    saves the file to storage, and starts background extraction & embedding.
    """
    user_id = current_user.get("id", "guest_user")
    token = current_user.get("token")

    file_name = file.filename or "uploaded_document"
    ext = os.path.splitext(file_name)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: PDF, DOCX, TXT."
        )

    # Read content to check size and save
    try:
        content = await file.read()
        file_size = len(content)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty."
            )

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds the 25MB maximum limit ({round(file_size / (1024*1024), 2)} MB)."
            )

        doc_id = f"pml-doc-{uuid.uuid4().hex[:12]}"
        safe_name = re_safe_name = "".join(c for c in file_name if c.isalnum() or c in "._- ")
        local_filename = f"{doc_id}_{safe_name}"
        file_path = os.path.join(STORAGE_DIR, local_filename)

        with open(file_path, "wb") as f:
            f.write(content)

        # Create database record
        doc_record = await DatabaseService.create_document(
            document_id=doc_id,
            user_id=user_id,
            file_name=file_name,
            file_type=ext.lstrip("."),
            file_size=file_size,
            storage_path=file_path,
            status="processing",
            user_token=token
        )

        # Trigger background processing
        background_tasks.add_task(
            RAGService.process_document_pipeline,
            document_id=doc_id,
            user_id=user_id,
            file_path=file_path,
            file_type=ext.lstrip("."),
            user_token=token
        )

        return DocumentItem(
            id=doc_id,
            user_id=user_id,
            file_name=file_name,
            file_type=ext.lstrip("."),
            file_size=file_size,
            storage_path=file_path,
            status="processing",
            chunk_count=0,
            created_at=doc_record.get("created_at"),
            updated_at=doc_record.get("updated_at")
        )

    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Failed to handle document upload: {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document upload: {str(err)}"
        )

@router.get("", response_model=DocumentListResponse, summary="List User Documents")
async def list_documents(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns list of all documents uploaded by the authenticated user.
    """
    user_id = current_user.get("id", "guest_user")
    token = current_user.get("token")

    try:
        docs = await DatabaseService.get_documents(user_id=user_id, user_token=token)
        items = [
            DocumentItem(
                id=d["id"],
                user_id=d["user_id"],
                file_name=d["file_name"],
                file_type=d["file_type"],
                file_size=d["file_size"],
                storage_path=d.get("storage_path"),
                status=d.get("status", "ready"),
                error_message=d.get("error_message"),
                chunk_count=d.get("chunk_count", 0),
                created_at=d.get("created_at"),
                updated_at=d.get("updated_at")
            )
            for d in docs
        ]
        return DocumentListResponse(documents=items, total_count=len(items))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve documents: {str(err)}"
        )

@router.get("/{document_id}", response_model=DocumentItem, summary="Get Document Details")
async def get_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves metadata for a specific document with user ownership check.
    """
    user_id = current_user.get("id", "guest_user")
    token = current_user.get("token")

    doc = await DatabaseService.get_document(document_id=document_id, user_id=user_id, user_token=token)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    return DocumentItem(
        id=doc["id"],
        user_id=doc["user_id"],
        file_name=doc["file_name"],
        file_type=doc["file_type"],
        file_size=doc["file_size"],
        storage_path=doc.get("storage_path"),
        status=doc.get("status", "ready"),
        error_message=doc.get("error_message"),
        chunk_count=doc.get("chunk_count", 0),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at")
    )

@router.delete("/{document_id}", summary="Delete Document and Associated Chunks")
async def delete_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes the document file, database record, chunks, and embeddings.
    """
    user_id = current_user.get("id", "guest_user")
    token = current_user.get("token")

    success = await DatabaseService.delete_document(
        document_id=document_id,
        user_id=user_id,
        user_token=token
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or already deleted."
        )

    return {"status": "success", "message": "Document and all vector embeddings successfully purged."}

@router.post("/{document_id}/retry", response_model=DocumentItem, summary="Retry Document Processing")
async def retry_document_processing(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Re-triggers ingestion for a failed document.
    """
    user_id = current_user.get("id", "guest_user")
    token = current_user.get("token")

    doc = await DatabaseService.get_document(document_id=document_id, user_id=user_id, user_token=token)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    file_path = doc.get("storage_path", "")
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source document file is missing. Please re-upload the document."
        )

    background_tasks.add_task(
        RAGService.process_document_pipeline,
        document_id=document_id,
        user_id=user_id,
        file_path=file_path,
        file_type=doc.get("file_type", "pdf"),
        user_token=token
    )

    return DocumentItem(
        id=doc["id"],
        user_id=doc["user_id"],
        file_name=doc["file_name"],
        file_type=doc["file_type"],
        file_size=doc["file_size"],
        storage_path=file_path,
        status="processing",
        error_message=None,
        chunk_count=doc.get("chunk_count", 0),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at")
    )

@router.post("/search", response_model=DocumentSearchResponse, summary="Semantic Search Document Chunks")
async def search_documents(
    req: DocumentSearchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Searches user's document chunks using vector cosine similarity.
    """
    user_id = current_user.get("id", "guest_user")
    token = current_user.get("token")

    chunks = await RAGService.retrieve_relevant_chunks(
        user_id=user_id,
        query=req.query,
        document_id=req.document_id,
        top_k=req.top_k,
        user_token=token
    )

    items = [
        DocumentChunkItem(
            id=c["id"],
            document_id=c["document_id"],
            user_id=c["user_id"],
            content=c["content"],
            chunk_index=c.get("chunk_index", 0),
            page_number=c.get("page_number"),
            score=c.get("score"),
            file_name=c.get("file_name")
        )
        for c in chunks
    ]

    return DocumentSearchResponse(
        query=req.query,
        results=items,
        total_found=len(items)
    )
