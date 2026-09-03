import uuid
import asyncio
import logging
from typing import List, Dict, Optional, Any
from app.config import settings
from app.schemas.chat import ChatRequest, ChatResponse, DocumentSourceCitation, WebSourceCitation, WebImageResult
from app.schemas.image import GeneratedImageData
from app.services.ai_service import AIService
from app.services.database_service import DatabaseService
from app.services.memory_service import MemoryService
from app.services.rag_service import RAGService
from app.services.vision_service import VisionService
from app.services.router_service import RouterService
from app.services.conversation_service import ConversationIntelligenceService

logger = logging.getLogger("pml.chat_service")

class ChatService:
    @staticmethod
    async def process_chat(
        request: ChatRequest, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> ChatResponse:
        """
        Orchestrates continuous conversation intelligence and multi-tool planning:
        1. Analyzes user intent, tools, and multi-tool dependencies via RouterService.
        2. Handles clarification for ambiguous prompts.
        3. Executes explicit memory writes when requested.
        4. Ingests multimodal images (Vision) when present.
        5. Retrieves RAG excerpts and personal context when relevant.
        6. Optimizes conversation history context window.
        7. Runs AI model with Function Calling tool loop (Web Search, Calculator).
        8. Triggers async title generation and background memory extraction.
        9. Returns clean citations & tool status indicators.
        """
        conv_id = request.conversation_id or f"pml-conv-{uuid.uuid4().hex[:12]}"
        effective_message = (request.message or "").strip()
        has_images = bool(request.images and len(request.images) > 0)

        # 1. Run Intelligent Router Planning
        plan = RouterService.plan(
            message=effective_message,
            has_images=has_images,
            document_id=request.document_id,
            memory_enabled=request.memory_enabled
        )
        logger.info(f"[PML Router Orchestrator] Plan: intent={plan.intent}, tools={plan.required_tools}")

        # 2. Handle Ambiguous Clarification Requests
        if plan.needs_clarification and plan.clarification_prompt:
            return ChatResponse(
                response=plan.clarification_prompt,
                conversation_id=conv_id,
                status="success",
                memories_used=None,
                sources=None,
                web_sources=None,
                tools_called=None
            )

        # 3. Vision Validation & Preprocessing
        image_data_urls: List[str] = []
        if has_images:
            validated_images = VisionService.validate_image_batch(request.images)
            image_data_urls = [img["data_url"] for img in validated_images]
            if not effective_message:
                effective_message = "Analyze this image and describe what is visible in detail."

        # 4. Explicit Memory Write Commands
        if plan.intent == "memory_write" and effective_message:
            explicit_reply = await MemoryService.handle_explicit_commands(
                user_message=effective_message,
                user_id=user_id,
                conversation_id=conv_id,
                user_token=user_token
            )
            if explicit_reply:
                await DatabaseService.save_message(
                    conversation_id=conv_id,
                    role="user",
                    content=effective_message,
                    user_id=user_id,
                    user_token=user_token
                )
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
                    tools_called=["memory"]
                )

        # 5. Save user prompt message to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="user",
            content=request.message if request.message else "🖼️ [Image Uploaded]",
            user_id=user_id,
            user_token=user_token
        )

        # 6. Retrieve relevant long-term memories if needed
        relevant_memories_list: List[str] = []
        if request.memory_enabled and ("memory" in plan.required_tools or plan.intent in ("memory_read", "multi_tool", "general_ai")):
            matched_memories = await MemoryService.retrieve_relevant_memories(
                user_id=user_id,
                query=effective_message,
                user_token=user_token,
                max_memories=5
            )
            relevant_memories_list = [m["memory"] for m in matched_memories if m.get("memory")]

        # 7. Retrieve relevant document chunks (RAG) if needed
        document_chunks = []
        if "rag" in plan.required_tools or request.document_id:
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

        # 8. Retrieve history context from Database (strictly for this user)
        db_messages = await DatabaseService.get_messages(
            conversation_id=conv_id, 
            user_id=user_id, 
            limit=40,
            user_token=user_token
        )
        
        raw_history: List[Dict[str, str]] = []
        if db_messages:
            for m in db_messages[:-1]:
                raw_history.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", "")
                })
        elif request.history or request.messages:
            raw = request.history or request.messages or []
            raw_history = [{"role": m.role, "content": m.content} for m in raw]

        # Optimize context window to retain high relevance without blowing context
        optimized_history = ConversationIntelligenceService.optimize_context_window(
            history=raw_history,
            current_prompt=effective_message,
            max_history_turns=10
        )

        # 9. Execute AI Response Generation with Tool Execution Loop
        forced_tool_name = None
        if "generate_image" in plan.required_tools or plan.intent == "image_generation":
            forced_tool_name = "generate_image"
        elif "image_search" in plan.required_tools or plan.intent == "image_search":
            forced_tool_name = "image_search"
        elif "web_search" in plan.required_tools:
            forced_tool_name = "web_search"
        elif "calculator" in plan.required_tools:
            forced_tool_name = "calculator"
        elif "wikipedia_search" in plan.required_tools:
            forced_tool_name = "wikipedia_search"

        ai_res = await AIService.generate_response(
            user_message=effective_message,
            images=image_data_urls if image_data_urls else None,
            history=optimized_history,
            relevant_memories=relevant_memories_list if relevant_memories_list else None,
            document_context=document_chunks if document_chunks else None,
            enable_tools=True,
            forced_tool=forced_tool_name
        )

        ai_reply = ai_res.get("content", "")
        raw_web_sources = ai_res.get("web_sources", [])
        raw_web_images = ai_res.get("web_images", [])
        raw_generated_images = ai_res.get("generated_images", [])
        tools_called = list(set(ai_res.get("tools_called", [])))

        # Add explicit tracking for Vision, RAG, and Memory if active
        if image_data_urls and "vision" not in tools_called:
            tools_called.append("vision")
        if document_chunks and "rag" not in tools_called:
            tools_called.append("rag")
        if relevant_memories_list and "memory" not in tools_called and plan.intent in ("memory_read", "multi_tool"):
            tools_called.append("memory")

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

        # Map real web photo results
        web_images_list: Optional[List[WebImageResult]] = None
        if raw_web_images:
            web_images_list = [
                WebImageResult(
                    title=img.get("title"),
                    image_url=img["image_url"],
                    thumbnail_url=img.get("thumbnail_url") or img["image_url"],
                    source_url=img.get("source_url"),
                    source_name=img.get("source_name")
                )
                for img in raw_web_images
                if img.get("image_url")
            ]

        # Save any generated images into user database history
        generated_images_list: Optional[List[GeneratedImageData]] = None
        if raw_generated_images:
            generated_images_list = []
            for img in raw_generated_images:
                img_record = GeneratedImageData(**img)
                img_record.conversation_id = conv_id
                img_record.user_id = user_id
                generated_images_list.append(img_record)
                try:
                    await DatabaseService.save_generated_image(
                        image_data=img_record.model_dump(),
                        user_id=user_id,
                        user_token=user_token
                    )
                except Exception as save_err:
                    logger.warning(f"[ChatService] Could not save generated image to database: {save_err}")

        # 10. Save AI response message to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="assistant",
            content=ai_reply,
            user_id=user_id,
            user_token=user_token
        )

        # 11. Background Memory Extraction & Async Title Generation (Fire & Forget)
        if effective_message:
            # Async smart title generation if conversation title is generic
            asyncio.create_task(
                ConversationIntelligenceService.generate_title_if_default(
                    conversation_id=conv_id,
                    user_message=effective_message,
                    ai_response=ai_reply,
                    user_id=user_id,
                    user_token=user_token
                )
            )

            # Async long-term memory analysis
            if request.memory_enabled:
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
            web_images=web_images_list,
            tools_called=tools_called if tools_called else None,
            generated_images=generated_images_list
        )
