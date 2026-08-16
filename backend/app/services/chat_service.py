import uuid
import asyncio
import logging
from typing import List, Dict, Optional, Any
from app.config import settings
from app.schemas.chat import ChatRequest, ChatResponse, DocumentSourceCitation, WebSourceCitation
from app.services.ai_service import AIService
from app.services.database_service import DatabaseService
from app.services.memory_service import MemoryService
from app.services.rag_service import RAGService
from app.services.vision_service import VisionService

logger = logging.getLogger("pml.chat_service")

class ChatService:
    @staticmethod
    async def process_chat(
        request: ChatRequest, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> ChatResponse:
        """
        Processes chat requests with full Phase 6 Memory, Phase 7 Document RAG, Phase 8 AI Tool Calling, and Phase 9 Vision:
        1. Validates and preprocesses any attached images (Phase 9 Vision).
        2. Checks for explicit memory commands ("Remember that...", "Forget that...").
        3. Saves user prompt message with ownership.
        4. Retrieves relevant long-term memories if memory_enabled is True.
        5. Retrieves relevant document RAG chunks (Phase 7).
        6. Retrieves stored history context for that user.
        7. Calls AIService with Vision and Tool Calling Loop (Phase 8: Web Search + Calculator).
        8. Saves AI response to database.
        9. Analyzes conversation in background to extract new stable memories.
        10. Returns structured response with memory indicators, document citations, web citations, and tools called.
        """
        conv_id = request.conversation_id or f"pml-conv-{uuid.uuid4().hex[:12]}"
        
        # 1. Validate and process any attached images (Phase 9 Vision)
        validated_images: List[Dict[str, Any]] = []
        image_data_urls: List[str] = []
        has_images = bool(request.images and len(request.images) > 0)
        logger.info(f"[PML Vision] Image received: {has_images}")

        if has_images:
            validated_images = VisionService.validate_image_batch(request.images)
            image_data_urls = [img["data_url"] for img in validated_images]
            for idx, img in enumerate(validated_images):
                logger.info(f"[PML Vision] Image #{idx+1} file type: {img['mime_type']}")
                logger.info(f"[PML Vision] Image #{idx+1} size: {img['width']}x{img['height']} ({img['size_bytes']} bytes)")

        effective_message = (request.message or "").strip()
        if not effective_message and image_data_urls:
            effective_message = "Analyze this image and describe what is visible in detail."

        logger.info(f"[PML Vision] User message received: {effective_message[:120]}")
        if image_data_urls:
            logger.info(f"[PML Vision] Sending {len(image_data_urls)} image(s) to vision-capable model ({settings.AI_MODEL})")

        # 2. Check for explicit memory commands ("Remember that...", "Forget that...")
        if request.memory_enabled and effective_message:
            explicit_reply = await MemoryService.handle_explicit_commands(
                user_message=effective_message,
                user_id=user_id,
                conversation_id=conv_id,
                user_token=user_token
            )
            if explicit_reply:
                # Save user prompt
                await DatabaseService.save_message(
                    conversation_id=conv_id,
                    role="user",
                    content=effective_message,
                    user_id=user_id,
                    user_token=user_token
                )
                # Save assistant confirmation
                await DatabaseService.save_message(
                    conversation_id=conv_id,
                    role="assistant",
                    content=explicit_reply,
                    user_id=user_id,
                    user_token=user_token
                )
                return ChatResponse(
                    response=explicit_reply,
                    conversation_id=conv_id,
                    status="success",
                    memories_used=["Explicit Memory Operation"],
                    sources=None,
                    web_sources=None,
                    tools_called=None
                )

        # 3. Save user prompt message to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="user",
            content=request.message if request.message else "🖼️ [Image Uploaded]",
            user_id=user_id,
            user_token=user_token
        )

        # 4. Retrieve relevant long-term memories (Phase 6)
        relevant_memories_list: List[str] = []
        if request.memory_enabled and effective_message:
            matched_memories = await MemoryService.retrieve_relevant_memories(
                user_id=user_id,
                query=effective_message,
                user_token=user_token,
                max_memories=6
            )
            relevant_memories_list = [m["memory"] for m in matched_memories if m.get("memory")]

        # 5. Retrieve relevant document chunks (Phase 7 RAG)
        document_chunks = []
        if effective_message:
            document_chunks = await RAGService.retrieve_relevant_chunks(
                user_id=user_id,
                query=effective_message,
                document_id=request.document_id,
                top_k=4,
                user_token=user_token
            )

        citations: Optional[List[DocumentSourceCitation]] = None
        if document_chunks:
            citations = [
                DocumentSourceCitation(
                    file_name=c.get("file_name", "Document"),
                    page_number=c.get("page_number"),
                    excerpt=c.get("content", "")[:200] + "..." if len(c.get("content", "")) > 200 else c.get("content", ""),
                    score=c.get("score")
                )
                for c in document_chunks
            ]

        # 6. Retrieve history context from Database (strictly for this user)
        db_messages = await DatabaseService.get_messages(
            conversation_id=conv_id, 
            user_id=user_id, 
            limit=30,
            user_token=user_token
        )
        
        formatted_history: List[Dict[str, str]] = []
        if db_messages:
            # Exclude the very last user message we just inserted
            for m in db_messages[:-1]:
                formatted_history.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", "")
                })
        elif request.history or request.messages:
            raw = request.history or request.messages or []
            formatted_history = [{"role": m.role, "content": m.content} for m in raw]

        # 7. Generate response from AI Service with Vision, Memory, Document RAG, and Tool Calling Loop
        ai_res = await AIService.generate_response(
            user_message=effective_message,
            images=image_data_urls if image_data_urls else None,
            history=formatted_history,
            relevant_memories=relevant_memories_list if relevant_memories_list else None,
            document_context=document_chunks if document_chunks else None,
            enable_tools=True
        )

        ai_reply = ai_res.get("content", "")
        raw_web_sources = ai_res.get("web_sources", [])
        tools_called = ai_res.get("tools_called", [])

        web_citations: Optional[List[WebSourceCitation]] = None
        if raw_web_sources:
            web_citations = [
                WebSourceCitation(
                    title=s.get("title", "Web Source"),
                    url=s.get("url", "#"),
                    snippet=s.get("snippet"),
                    source=s.get("source")
                )
                for s in raw_web_sources
            ]

        # 8. Save AI response message to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="assistant",
            content=ai_reply,
            user_id=user_id,
            user_token=user_token
        )

        # 9. Trigger background long-term memory extraction (Fire & Forget)
        if request.memory_enabled and effective_message:
            asyncio.create_task(
                MemoryService.analyze_and_extract_memory(
                    user_message=effective_message,
                    assistant_response=ai_reply,
                    user_id=user_id,
                    conversation_id=conv_id,
                    user_token=user_token
                )
            )

        return ChatResponse(
            response=ai_reply,
            conversation_id=conv_id,
            status="success",
            memories_used=relevant_memories_list if relevant_memories_list else None,
            sources=citations,
            web_sources=web_citations,
            tools_called=tools_called if tools_called else None
        )
