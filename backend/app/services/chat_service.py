import uuid
from typing import List, Dict
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import AIService
from app.services.database_service import DatabaseService

class ChatService:
    @staticmethod
    async def process_chat(request: ChatRequest) -> ChatResponse:
        """
        Processes chat requests (Phase 4):
        1. Ensures conversation record exists in Supabase/database.
        2. Saves user prompt message.
        3. Retrieves stored history context.
        4. Calls AIService for LLM response.
        5. Saves AI response to database.
        6. Returns structured response.
        """
        conv_id = request.conversation_id or f"pml-conv-{uuid.uuid4().hex[:12]}"
        
        # 1. Save user prompt message to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="user",
            content=request.message
        )

        # 2. Retrieve history context from Database (or request fallback)
        db_messages = await DatabaseService.get_messages(conversation_id=conv_id, limit=30)
        
        formatted_history: List[Dict[str, str]] = []
        if db_messages:
            # Exclude the very last user message we just inserted to avoid duplication
            for m in db_messages[:-1]:
                formatted_history.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", "")
                })
        elif request.history or request.messages:
            raw = request.history or request.messages or []
            formatted_history = [{"role": m.role, "content": m.content} for m in raw]

        # 3. Generate response from AI Service
        ai_reply = await AIService.generate_response(
            user_message=request.message,
            history=formatted_history
        )

        # 4. Save assistant response to Database
        await DatabaseService.save_message(
            conversation_id=conv_id,
            role="assistant",
            content=ai_reply
        )

        return ChatResponse(
            response=ai_reply,
            conversation_id=conv_id,
            status="success"
        )
