import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.services.database_service import DatabaseService
from app.services.ai_service import AIService

logger = logging.getLogger("pml.memory_service")

# Blacklist patterns to ensure sensitive credentials or transient noise are NEVER stored
SENSITIVE_PATTERNS = [
    r"(?i)\b(password|passwd|api[_-]?key|secret|token|bearer|pin|ssn|credit[_-]?card|cvv|auth[_-]?code)\b",
    r"(?i)\b(http[s]?://\S+)\b",
]

class MemoryService:
    @classmethod
    def _is_sensitive(cls, text: str) -> bool:
        """Checks if text contains credentials, sensitive tokens, or private secrets."""
        for pattern in SENSITIVE_PATTERNS:
            if re.search(pattern, text):
                return True
        return False

    @classmethod
    def _calculate_relevance(cls, memory_text: str, category: str, query: str) -> float:
        """
        Calculates a relevance score [0.0 to 1.0] between a stored memory and a user query.
        Uses keyword overlap, category weighting, and semantic token matching.
        """
        query_lower = query.lower()
        mem_lower = memory_text.lower()

        # Stopwords to exclude from relevance scoring
        stopwords = {"i", "am", "is", "are", "the", "a", "an", "and", "or", "to", "for", "in", "on", "user", "with", "that", "this", "my", "me", "you", "your", "be", "do", "does", "did", "have", "has", "had", "using"}

        mem_words = [w for w in re.findall(r"\b\w+\b", mem_lower) if w not in stopwords and len(w) > 2]
        query_words = [w for w in re.findall(r"\b\w+\b", query_lower) if w not in stopwords and len(w) > 2]

        if not mem_words or not query_words:
            return 0.0

        def is_word_match(w1: str, w2: str) -> bool:
            if w1 == w2:
                return True
            if len(w1) >= 4 and len(w2) >= 4 and (w1.startswith(w2[:4]) or w2.startswith(w1[:4])):
                return True
            return False

        # Stem / keyword overlap
        matches = 0
        for mw in mem_words:
            if any(is_word_match(mw, qw) for qw in query_words):
                matches += 1

        match_ratio = matches / len(mem_words)

        # If there are direct keyword/stem matches, boost based on category
        if matches > 0:
            if category == "preference":
                return min(1.0, match_ratio + 0.4)
            elif category == "goal":
                return min(1.0, match_ratio + 0.5)
            elif category == "project":
                return min(1.0, match_ratio + 0.6)
            elif category == "communication":
                return min(1.0, match_ratio + 0.4)
            return min(1.0, match_ratio + 0.3)

        # If 0 keyword matches, only general communication/style preference applies to explicit explanation requests
        is_deep_explanation_request = any(k in query_lower for k in ["explain", "teach", "guide", "how does", "how do", "step-by-step", "break down"])
        is_general_style = any(k in mem_lower for k in ["concise", "simple", "step-by-step", "bullet", "detailed", "brief", "short"])
        has_specific_tech = any(k in mem_lower for k in ["python", "java", "react", "c++", "rust", "sql", "pml", "django", "fastapi", "spring"])
        query_has_tech = any(k in query_lower for k in ["python", "java", "react", "c++", "rust", "sql", "pml", "code", "algorithm", "function"])

        if category in ("preference", "communication") and is_deep_explanation_request and is_general_style:
            # If the preference specifies a tech (e.g. Python examples) but query is about something non-technical (weather), do not match
            if has_specific_tech and not query_has_tech:
                return 0.0
            return 0.45

        return match_ratio

    @classmethod
    async def retrieve_relevant_memories(
        cls,
        user_id: str,
        query: str,
        user_token: Optional[str] = None,
        max_memories: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Selects only the most relevant memories for the incoming user request.
        Does NOT send all memories; filters strictly by relevance score.
        """
        if not user_id or user_id == "guest_user":
            return []

        all_memories = await DatabaseService.get_memories(user_id=user_id, user_token=user_token, limit=60)
        if not all_memories:
            return []

        scored_memories: List[Tuple[float, Dict[str, Any]]] = []

        for mem in all_memories:
            score = cls._calculate_relevance(
                memory_text=mem.get("memory", ""),
                category=mem.get("category", "context"),
                query=query
            )
            # Threshold for relevance (must have meaningful overlap or applicability)
            if score >= 0.35:
                scored_memories.append((score, mem))

        # Sort by relevance score descending, then by importance
        scored_memories.sort(
            key=lambda x: (x[0], x[1].get("importance", 3)),
            reverse=True
        )

        selected = [item[1] for item in scored_memories[:max_memories]]

        # Touch last_used_at in background for retrieved memories
        for mem in selected:
            if mem.get("id"):
                try:
                    await DatabaseService.touch_memory_used(mem["id"], user_id, user_token)
                except Exception:
                    pass

        logger.info(f"[PML Memory] Retrieved {len(selected)} relevant memories out of {len(all_memories)} for user {user_id}")
        return selected

    @classmethod
    async def handle_explicit_commands(
        cls,
        user_message: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> Optional[str]:
        """
        Handles explicit memory requests such as:
        - "Remember that I prefer Java examples"
        - "Forget that I am learning Java"
        """
        if not user_id or user_id == "guest_user":
            return None

        clean_msg = user_message.strip()

        # 1. "Forget that / Forget about..."
        forget_match = re.search(r"(?i)\b(?:please\s+)?forget(?:\s+that|\s+about)?\s+(.+)$", clean_msg)
        if forget_match:
            topic = forget_match.group(1).strip().rstrip(".,!?")
            all_mem = await DatabaseService.get_memories(user_id=user_id, user_token=user_token, limit=50)
            deleted_count = 0

            stop_words = {"i", "am", "is", "are", "the", "a", "an", "and", "or", "to", "for", "in", "on", "user", "with", "that", "this", "my", "me", "you", "your", "preparing", "learning", "studying"}
            topic_keywords = [w for w in re.findall(r"\b\w+\b", topic.lower()) if w not in stop_words and len(w) > 2]

            for m in all_mem:
                mem_text = m.get("memory", "").lower()
                has_match = any(re.search(rf"\b{re.escape(kw)}\b", mem_text) for kw in topic_keywords)
                if has_match:
                    await DatabaseService.delete_memory(m["id"], user_id, user_token)
                    deleted_count += 1

            if deleted_count > 0:
                return f"I have forgotten that information from your long-term memory."
            return f"I couldn't find any stored memory matching '{topic}' to forget."

        # 2. "Remember that / Please remember..."
        remember_match = re.search(r"(?i)\b(?:please\s+)?remember(?:\s+that)?\s+(.+)$", clean_msg)
        if remember_match:
            raw_fact = remember_match.group(1).strip().rstrip(".,!?")
            if cls._is_sensitive(raw_fact):
                return "For your security, PML does not store passwords, keys, or sensitive credentials in memory."

            # Normalize "I / my" to "User / User's"
            formatted_fact = re.sub(r"(?i)\bi\s+am\b", "User is", raw_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+have\b", "User has", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+prefer\b", "User prefers", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+like\b", "User likes", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+work\s+on\b", "User is working on", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi'm\b", "User is", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bmy\b", "User's", formatted_fact)

            if not formatted_fact.lower().startswith("user"):
                formatted_fact = f"User {formatted_fact}"

            # Infer category using word boundaries
            category = "preference"
            if re.search(r"\b(learn|learning|study|studying|exam|course|degree|cert|certification)\b", formatted_fact, re.IGNORECASE):
                category = "goal"
            elif re.search(r"\b(build|building|project|app|application|creating|working on|develop|developing)\b", formatted_fact, re.IGNORECASE):
                category = "project"
            elif re.search(r"\b(concise|simple|step-by-step|bullet|detailed|tone|style|format)\b", formatted_fact, re.IGNORECASE):
                category = "communication"

            await cls._save_or_update_memory(
                user_id=user_id,
                memory_text=formatted_fact,
                category=category,
                importance=4,
                source_conv_id=conversation_id,
                user_token=user_token
            )
            return f"I've committed that to your long-term memory: \"{formatted_fact}\""

        return None

    @classmethod
    async def _save_or_update_memory(
        cls,
        user_id: str,
        memory_text: str,
        category: str,
        importance: int,
        source_conv_id: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Deduplicates and updates existing memory if on the same topic,
        or creates a new memory record if unique.
        """
        clean_text = memory_text.strip()
        existing_memories = await DatabaseService.get_memories(user_id=user_id, user_token=user_token, limit=40)

        # Check for similar memory to update
        for existing in existing_memories:
            existing_text = existing.get("memory", "").lower()
            similarity = cls._calculate_relevance(existing_text, category, clean_text)
            if similarity >= 0.75:
                # Update existing memory with fresh context
                updated = await DatabaseService.update_memory(
                    memory_id=existing["id"],
                    user_id=user_id,
                    memory=clean_text,
                    category=category,
                    importance=max(existing.get("importance", 3), importance),
                    user_token=user_token
                )
                logger.info(f"[PML Memory] Updated existing memory {existing['id']} for user {user_id}")
                return updated or existing

        # Create new memory
        created = await DatabaseService.create_memory(
            user_id=user_id,
            memory=clean_text,
            category=category,
            importance=importance,
            source_conversation_id=source_conv_id,
            user_token=user_token
        )
        logger.info(f"[PML Memory] Created new memory for user {user_id}: {clean_text}")
        return created

    @classmethod
    async def analyze_and_extract_memory(
        cls,
        user_message: str,
        assistant_response: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> None:
        """
        Conservative background analyzer that extracts stable long-term user facts.
        Ignores transient questions, greetings, single-use prompts, and sensitive credentials.
        """
        if not user_id or user_id == "guest_user":
            return

        msg_lower = user_message.strip().lower()

        # Ignore short greetings or standard questions
        if len(user_message.strip()) < 10:
            return
        if cls._is_sensitive(user_message):
            return

        # Check for strong indicator phrases of durable user context
        is_preference = any(msg_lower.startswith(p) or f" {p}" in msg_lower for p in [
            "i prefer", "i always prefer", "i like when", "i dislike", "i hate", "i love", "my preference is"
        ])
        is_goal = any(msg_lower.startswith(p) or f" {p}" in msg_lower for p in [
            "i am learning", "i'm learning", "i am studying", "i'm studying", "preparing for my", "preparing for the"
        ])
        is_project = any(msg_lower.startswith(p) or f" {p}" in msg_lower for p in [
            "i am building", "i'm building", "i am developing", "i'm developing", "my project is", "working on a project called"
        ])

        if not (is_preference or is_goal or is_project):
            return

        # Use fast, structured AI extraction prompt to distill clean concise memory
        try:
            client = AIService.get_client()
            prompt = f"""You are PML's Long-Term Memory Extraction Engine.
Analyze this exchange between a User and PML.
Extract AT MOST ONE concise, durable, factual statement about the user's preferences, learning goals, or long-term projects.
Rules:
1. Only extract stable facts useful across future conversations.
2. Format as a third-person fact (e.g. "User is learning Java", "User prefers simple code examples").
3. DO NOT extract temporary queries, greetings, or sensitive data.
4. If no durable fact exists, output null.

User message: "{user_message}"
Assistant reply: "{assistant_response[:300]}"

Respond ONLY with valid JSON in this format:
{{"has_memory": true/false, "memory": "Concise statement", "category": "preference|goal|project|communication|context", "importance": 1-5}}"""

            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": "You extract concise structured memories in valid JSON."},
                          {"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=150,
                timeout=12.0
            )

            raw_json = completion.choices[0].message.content.strip()
            if "```json" in raw_json:
                raw_json = raw_json.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_json:
                raw_json = raw_json.split("```")[1].split("```")[0].strip()

            data = json.loads(raw_json)
            if data.get("has_memory") and data.get("memory"):
                mem_fact = data["memory"].strip()
                cat = data.get("category", "context")
                if cat not in ("preference", "goal", "project", "communication", "context"):
                    cat = "context"
                imp = int(data.get("importance", 3))

                if not cls._is_sensitive(mem_fact):
                    await cls._save_or_update_memory(
                        user_id=user_id,
                        memory_text=mem_fact,
                        category=cat,
                        importance=imp,
                        source_conv_id=conversation_id,
                        user_token=user_token
                    )
        except Exception as err:
            logger.warn(f"[PML Memory] Background memory extraction skipped: {err}")
