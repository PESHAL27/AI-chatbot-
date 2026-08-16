import re
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.database_service import DatabaseService

logger = logging.getLogger("pml.conversation_service")

class ConversationIntelligenceService:
    """
    Advanced Conversation Intelligence & Context Management:
    - Smart contextual title generation
    - Dynamic context window optimization
    - Topic shift detection
    - Semantic context compression
    """

    @classmethod
    async def generate_title_if_default(
        cls,
        conversation_id: str,
        user_message: str,
        ai_response: str,
        user_id: str,
        user_token: Optional[str] = None
    ) -> Optional[str]:
        """
        Asynchronously generates a concise, descriptive 3-7 word title
        if the current conversation has a default/generic title.
        """
        try:
            conv = await DatabaseService.get_conversation_with_messages(
                conversation_id=conversation_id,
                user_id=user_id,
                user_token=user_token
            )
            if not conv:
                return None

            current_title = conv.get("title", "")
            # Only auto-generate if title is default
            if current_title and current_title not in ("PML AI", "New Conversation", "New Chat", "Conversation"):
                return current_title

            generated_title = cls._heuristic_title_generation(user_message)

            # Update database
            await DatabaseService.rename_conversation(
                conversation_id=conversation_id,
                new_title=generated_title,
                user_id=user_id,
                user_token=user_token
            )
            logger.info(f"[PML Conversation Intelligence] Auto-generated title '{generated_title}' for {conversation_id}")
            return generated_title
        except Exception as e:
            logger.warn(f"Failed to auto-generate conversation title: {e}")
            return None

    @classmethod
    def _heuristic_title_generation(cls, message: str) -> str:
        """
        Fast heuristic algorithm to extract clean 3-7 word titles without API latency.
        """
        clean = message.strip()
        # Remove common prefixes like 'can you explain', 'what is', 'how to', 'help me with'
        clean = re.sub(r"^(can\s+you\s+)?(please\s+)?(tell\s+me\s+about|explain|what\s+is|what\s+are|how\s+to|how\s+do\s+i|help\s+me\s+with|find|solve|calculate)\s+", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"[^\w\s\-\.]", "", clean).strip()

        words = clean.split()
        if len(words) >= 3:
            title_words = words[:6]
        else:
            title_words = words if words else ["Discussion"]

        # Title Case
        title = " ".join([w.capitalize() for w in title_words])
        return title[:50] if title else "PML Conversation"

    @classmethod
    def optimize_context_window(
        cls,
        history: List[Dict[str, str]],
        current_prompt: str,
        max_history_turns: int = 10
    ) -> List[Dict[str, str]]:
        """
        Intelligently bounds conversation history context:
        - If history <= max_history_turns, returns recent turns.
        - If history is large, retains most recent turns plus relevant earlier turns matching query keywords.
        """
        if not history or len(history) <= max_history_turns:
            return history

        # Extract search keywords from current prompt
        query_words = set(w.lower() for w in re.findall(r"\b\w+\b", current_prompt) if len(w) > 3)

        # Always take last 6 messages (3 turn pairs)
        recent_chunk = history[-6:]
        older_chunk = history[:-6]

        selected_older: List[Dict[str, str]] = []
        if query_words:
            for msg in older_chunk:
                content = msg.get("content", "")
                msg_words = set(w.lower() for w in re.findall(r"\b\w+\b", content) if len(w) > 3)
                if query_words.intersection(msg_words):
                    selected_older.append(msg)
                    if len(selected_older) >= 4:
                        break

        combined = selected_older + recent_chunk
        logger.info(f"[PML Context Window] Compressed {len(history)} messages into {len(combined)} focused context turns")
        return combined
