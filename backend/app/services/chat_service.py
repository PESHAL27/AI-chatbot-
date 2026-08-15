import uuid
import asyncio
import logging
from typing import List, Dict, Optional, Any
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import AIService
from app.services.database_service import DatabaseService
from app.services.memory_service import MemoryService

logger = logging.getLogger("pml.chat_service")

class ChatService:
    @staticmethod
    async def process_chat(
        request: ChatRequest, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> ChatResponse:
        """
        Processes chat requests with full Phase 6 Long-Term Memory integration:
        1. Checks for explicit memory commands ("Remember that...", "Forget that...").
        2. Ensures conversation record exists and is owned by user_id.
        3. Saves user prompt message with ownership.
        4. Retrieves relevant long-term memories if memory_enabled is True.
        5. Retrieves stored history context for that user.
        6. Calls AIService for LLM response with injected memory context.
        7. Saves AI response to database.
        8. Analyzes conversation in background to extract new stable memories.
        9. Returns structured response with memory indicators.
        """
        conv_id = request.conversation_id or f"pml-conv-{uuid.uuid4().hex[:12]}"
        
        # 1. Check for explicit memory commands ("Remember that...", "Forget that...")
        if request.memory_enabled:
            explicit_reply = await MemoryService.handle_explicit_commands(
                user_message=request.message,
                user_id=user_id,
                conversation_id=conv_id,
                user_token=user_token
            )
            if explicit_reply:
                # Save user prompt
                await DatabaseService.save_message(
                    conversation_id=conv_id,
                    role="user",
                    content=request.message,
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
                    memories_used=["Explicit Memory Operation"]
                )

        # 2. Save user prompt message to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="user",
            content=request.message,
            user_id=user_id,
            user_token=user_token
        )

        # 3. Retrieve relevant long-term memories (Phase 6)
        relevant_memories_list: List[str] = []
        if request.memory_enabled:
            matched_memories = await MemoryService.retrieve_relevant_memories(
                user_id=user_id,
                query=request.message,
                user_token=user_token,
                max_memories=6
            )
            relevant_memories_list = [m["memory"] for m in matched_memories if m.get("memory")]

        # 4. Retrieve history context from Database (strictly for this user)
        db_messages = await DatabaseService.get_messages(
            conversation_id=conv_id, 
            user_id=user_id, 
            limit=30,
            user_token=user_token
        )
        
        formatted_history: List[Dict[str, str]] = []
        if db_messages:
            # Exclude the very last user message we just inserted to avoid duplicate prompt in LLM prompt
            for m in db_messages[:-1]:
                formatted_history.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", "")
                })
        elif request.history or request.messages:
            raw = request.history or request.messages or []
            formatted_history = [{"role": m.role, "content": m.content} for m in raw]

        # 5. Generate response from AI Service with memory injection
        ai_reply = await AIService.generate_response(
            user_message=request.message,
            history=formatted_history,
            relevant_memories=relevant_memories_list if relevant_memories_list else None
        )

        # 6. Save assistant response to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="assistant",
            content=ai_reply,
            user_id=user_id,
            user_token=user_token
        )

        # 7. Asynchronously analyze exchange to extract durable long-term memory
        if request.memory_enabled:
            asyncio.create_task(
                MemoryService.analyze_and_extract_memory(
                    user_message=request.message,
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
            memories_used=relevant_memories_list if relevant_memories_list else None
        )
