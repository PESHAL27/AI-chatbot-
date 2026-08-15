import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI, AuthenticationError, RateLimitError, APIConnectionError, APITimeoutError
from app.config import settings

logger = logging.getLogger("pml.ai_service")

# System Prompt / Persona for PML AI Assistant
PML_SYSTEM_PROMPT = """You are PML (Personal Multimodal Logic), a state-of-the-art, helpful, intelligent, clear, honest, and versatile personal AI assistant operating inside an advanced digital space interface.

Key Responsibilities & Directives:
1. Understand the user's question thoroughly before answering.
2. Provide accurate, high-quality, and useful responses.
3. Explain complicated concepts simply and intuitively when appropriate.
4. Provide deep, comprehensive answers when the user requests detail; keep answers concise and direct for simple questions.
5. Acknowledge uncertainty clearly when information is unknown or ambiguous.
6. Follow instructions precisely.
7. Format responses using GitHub-flavored Markdown (include clean headers, bold terms, bullet points, code blocks with syntax highlighting, and LaTeX math formulas if applicable).
8. Never pretend to be human or claim capabilities that are not implemented.
"""

class AIService:
    _client: Optional[AsyncOpenAI] = None

    @classmethod
    def get_client(cls) -> AsyncOpenAI:
        if cls._client is None:
            if not settings.AI_API_KEY:
                logger.error("AI_API_KEY is not configured in backend environment.")
                raise ValueError("AI API key is missing in server environment.")
            
            headers = {
                "HTTP-Referer": "http://localhost:5174",
                "X-Title": "PML Space AI Assistant"
            }
            
            cls._client = AsyncOpenAI(
                api_key=settings.AI_API_KEY,
                base_url=settings.AI_BASE_URL if settings.AI_BASE_URL else None,
                default_headers=headers
            )
        return cls._client

    @classmethod
    async def generate_response(
        cls,
        user_message: str,
        history: Optional[List[Dict[str, str]]] = None,
        model_override: Optional[str] = None
    ) -> str:
        """
        Communicates with the AI provider (OpenAI) to generate a chat response.
        Appends system prompt instructions and multi-turn conversation history.
        """
        client = cls.get_client()
        model_name = model_override or settings.AI_MODEL

        # Construct message payload with system instruction
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": PML_SYSTEM_PROMPT}
        ]

        # Add historical conversation context if provided
        if history:
            for msg in history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if content and role in ("user", "assistant", "system"):
                    messages.append({"role": role, "content": content})

        # Append current user prompt message
        messages.append({"role": "user", "content": user_message})

        try:
            logger.info(f"Sending prompt to model '{model_name}' (messages count: {len(messages)})")
            
            completion = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=settings.AI_TEMPERATURE,
                max_tokens=settings.AI_MAX_TOKENS,
                timeout=30.0  # 30 seconds timeout limit
            )

            if not completion.choices or not completion.choices[0].message.content:
                raise ValueError("Empty response received from AI model provider.")

            response_content = completion.choices[0].message.content.strip()
            return response_content

        except AuthenticationError as auth_err:
            logger.error(f"OpenAI Authentication Failed: {auth_err}")
            return (
                "### ⚠️ PML AI API Key Notice\n\n"
                "The configured OpenAI API key is invalid or expired. "
                "Please update `AI_API_KEY` in `backend/.env` with a valid key."
            )

        except RateLimitError as rate_err:
            logger.error(f"OpenAI Rate Limit / Quota Exceeded: {rate_err}")
            return (
                "### ⚡ PML AI Rate Limit / Quota Exceeded\n\n"
                "PML successfully connected to OpenAI (`gpt-4o-mini`), but the API key has exceeded its quota or has no remaining credits (`insufficient_quota`).\n\n"
                "**Action required:**\n"
                "- Check billing / add credits at [OpenAI Billing](https://platform.openai.com/settings/organization/billing)\n"
                "- Or update `AI_API_KEY` in `backend/.env` with an active key."
            )

        except (APIConnectionError, APITimeoutError) as conn_err:
            logger.error(f"OpenAI Network Error: {conn_err}")
            return (
                "### 🌐 PML AI Service Timeout\n\n"
                "Unable to reach the AI model provider. Please verify network connectivity."
            )

        except Exception as err:
            logger.error(f"Unexpected AI Service Error: {err}", exc_info=True)
            return "PML is temporarily unable to generate a response. Please try again later."
