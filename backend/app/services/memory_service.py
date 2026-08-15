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

# Semantic Synonym Groups for Intelligent Relevance Mapping
SYNONYM_GROUPS = {
    "project": {"project", "work", "working", "build", "building", "develop", "developing", "create", "creating", "app", "application", "chatbot", "system", "codebase", "repo", "software", "startup", "tool", "pml"},
    "goal": {"goal", "learn", "learning", "study", "studying", "course", "exam", "test", "career", "future", "target", "prepare", "preparing", "master", "practice"},
    "preference": {"prefer", "preference", "like", "likes", "love", "loves", "dislike", "favorite", "format", "style", "approach", "tone", "simple", "step-by-step", "bullet", "concise", "detailed"},
    "communication": {"explain", "explanation", "teach", "format", "style", "tone", "concise", "brief", "detailed", "breakdown", "step-by-step"}
}

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
        Uses category intent matching, synonym mapping, and token overlap.
        """
        query_lower = query.lower().strip()
        mem_lower = memory_text.lower().strip()

        # 1. Broad / Introspective User Context Queries (e.g. "who am i", "what do you remember about me")
        is_broad_memory_query = any(p in query_lower for p in [
            "who am i", "what do you remember", "what do you know about me", 
            "tell me about me", "my profile", "my background", "what are my memories",
            "what's in my memory", "do you remember me", "recall about me"
        ])
        if is_broad_memory_query:
            return 1.0

        # 2. Category-Specific Intent Queries
        # Project intent queries (e.g. "what project am i working on", "what am i building", "what is my app")
        is_project_query = any(w in query_lower for w in ["project", "working on", "building", "developing", "my app", "my chatbot", "my software", "my system"])
        if is_project_query and category == "project":
            return 0.95

        # Goal intent queries (e.g. "what are my goals", "what am i learning", "what am i studying")
        is_goal_query = any(w in query_lower for w in ["goal", "goals", "learning", "studying", "my study", "my exam", "what do i learn"])
        if is_goal_query and category == "goal":
            return 0.95

        # Preference intent queries (e.g. "what are my preferences", "how do i like things explained", "what do i prefer")
        is_pref_query = any(w in query_lower for w in ["preference", "preferences", "prefer", "what do i like", "my style", "how do i like"])
        if is_pref_query and category in ("preference", "communication"):
            return 0.95

        # 3. Stopword-Filtered Token Matching
        stopwords = {
            "i", "am", "is", "are", "the", "a", "an", "and", "or", "to", "for", 
            "in", "on", "user", "with", "that", "this", "my", "me", "you", "your", 
            "be", "do", "does", "did", "have", "has", "had", "using", "what", "which", "how", "tell"
        }

        mem_words = [w for w in re.findall(r"\b\w+\b", mem_lower) if w not in stopwords and len(w) > 2]
        query_words = [w for w in re.findall(r"\b\w+\b", query_lower) if w not in stopwords and len(w) > 2]

        if not mem_words or not query_words:
            # Fallback to category baseline
            if category == "preference" and any(k in query_lower for k in ["explain", "code", "write", "teach"]):
                return 0.50
            return 0.0

        # Helper for word stem / synonym matching
        def tokens_match(w1: str, w2: str) -> bool:
            if w1 == w2:
                return True
            # Prefix matching (e.g. "build" vs "building", "learn" vs "learning")
            if len(w1) >= 4 and len(w2) >= 4 and (w1.startswith(w2[:4]) or w2.startswith(w1[:4])):
                return True
            # Check synonym groups
            for group in SYNONYM_GROUPS.values():
                if w1 in group and w2 in group:
                    return True
            return False

        matches = 0
        for mw in mem_words:
            if any(tokens_match(mw, qw) for qw in query_words):
                matches += 1

        match_ratio = matches / len(mem_words) if mem_words else 0.0

        # Score calculations
        if matches > 0:
            if category == "project":
                return min(1.0, match_ratio + 0.60)
            elif category == "goal":
                return min(1.0, match_ratio + 0.55)
            elif category in ("preference", "communication"):
                return min(1.0, match_ratio + 0.50)
            return min(1.0, match_ratio + 0.40)

        # 4. Check if query touches preference styles (e.g. "explain step-by-step", "in Python", "concise")
        if category in ("preference", "communication"):
            for style_kw in ["concise", "simple", "step-by-step", "bullet", "detailed", "brief", "short"]:
                if style_kw in mem_lower and style_kw in query_lower:
                    return 0.85

        return match_ratio

    @classmethod
    async def retrieve_relevant_memories(
        cls,
        user_id: str,
        query: str,
        user_token: Optional[str] = None,
        max_memories: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Retrieves user's stored memories, calculates relevance against query,
        and returns prioritized memories with safe debugging logs.
        """
        if not user_id:
            return []

        # Safe logging as required in Phase 6 Step 10
        logger.info(f"[PML Memory] Authenticated user: {user_id}")

        all_memories = await DatabaseService.get_memories(user_id=user_id, user_token=user_token, limit=60)
        logger.info(f"[PML Memory] Memories found: {len(all_memories)}")

        if not all_memories:
            return []

        scored_memories: List[Tuple[float, Dict[str, Any]]] = []

        for mem in all_memories:
            score = cls._calculate_relevance(
                memory_text=mem.get("memory", ""),
                category=mem.get("category", "context"),
                query=query
            )
            scored_memories.append((score, mem))

        # Sort by relevance score descending, then by importance
        scored_memories.sort(
            key=lambda x: (x[0], x[1].get("importance", 3)),
            reverse=True
        )

        selected: List[Dict[str, Any]] = []

        # If user has a small set of memories (<= 8), include any memory with positive relevance
        # or include top memories so context is never starved
        if len(all_memories) <= 8:
            for score, mem in scored_memories:
                if score >= 0.15 or len(selected) < 4:
                    selected.append(mem)
                if len(selected) >= max_memories:
                    break
        else:
            for score, mem in scored_memories:
                if score >= 0.30:
                    selected.append(mem)
                if len(selected) >= max_memories:
                    break

        # Fallback: if nothing matched but memories exist, pass top 2 most important memories
        if not selected and all_memories:
            selected = all_memories[:2]

        logger.info(f"[PML Memory] Relevant memories: {len(selected)}")
        if selected:
            logger.info("[PML Memory] Memory context added to AI")

        # Touch last_used_at in background for retrieved memories
        for mem in selected:
            if mem.get("id"):
                try:
                    await DatabaseService.touch_memory_used(mem["id"], user_id, user_token)
                except Exception:
                    pass

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
        - "Remember that I'm building an AI chatbot called PML."
        - "Remember that I prefer Java examples."
        - "Forget that I am learning Java."
        """
        if not user_id:
            return None

        clean_msg = user_message.strip()

        # 1. "Forget that / Forget about / Delete memory..."
        forget_match = re.search(r"(?i)\b(?:please\s+)?(?:forget|delete\s+memory)(?:\s+that|\s+about)?\s+(.+)$", clean_msg)
        if forget_match:
            topic = forget_match.group(1).strip().rstrip(".,!?")
            all_mem = await DatabaseService.get_memories(user_id=user_id, user_token=user_token, limit=50)
            deleted_count = 0

            stop_words = {"i", "am", "is", "are", "the", "a", "an", "and", "or", "to", "for", "in", "on", "user", "with", "that", "this", "my", "me", "you", "your"}
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

        # 2. "Remember that / Please remember / Note that / Save memory..."
        remember_match = re.search(r"(?i)\b(?:please\s+)?(?:remember|note|save\s+memory|store\s+memory)(?:\s+that|:)?\s+(.+)$", clean_msg)
        if remember_match:
            raw_fact = remember_match.group(1).strip().rstrip(".,!?")
            if cls._is_sensitive(raw_fact):
                return "For your security, PML does not store passwords, keys, or sensitive credentials in memory."

            # Normalize first-person "I / my" to third-person "User / User's"
            formatted_fact = raw_fact
            formatted_fact = re.sub(r"(?i)\bi'm\b", "User is", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+am\b", "User is", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+have\b", "User has", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+prefer\b", "User prefers", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+like\b", "User likes", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bi\s+work\s+on\b", "User is working on", formatted_fact)
            formatted_fact = re.sub(r"(?i)\bmy\b", "User's", formatted_fact)

            if not formatted_fact.lower().startswith("user"):
                formatted_fact = f"User {formatted_fact}"

            # Infer category cleanly
            fact_lower = formatted_fact.lower()
            category = "context"
            if any(w in fact_lower for w in ["build", "building", "project", "app", "application", "chatbot", "system", "develop", "developing", "working on", "pml"]):
                category = "project"
            elif any(w in fact_lower for w in ["learn", "learning", "study", "studying", "exam", "course", "degree", "cert", "certification"]):
                category = "goal"
            elif any(w in fact_lower for w in ["prefer", "prefers", "like", "likes", "love", "loves", "dislike", "favorite"]):
                category = "preference"
            elif any(w in fact_lower for w in ["concise", "simple", "step-by-step", "bullet", "detailed", "tone", "style", "format", "explain"]):
                category = "communication"

            await cls._save_or_update_memory(
                user_id=user_id,
                memory_text=formatted_fact,
                category=category,
                importance=4,
                source_conv_id=conversation_id,
                user_token=user_token
            )
            return f"I've stored this in your long-term memory: \"{formatted_fact}\""

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
            if similarity >= 0.75 or (existing.get("category") == category and category == "project" and "pml" in existing_text and "pml" in clean_text.lower()):
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
        if not user_id:
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
2. Format as a third-person fact (e.g. "User is learning Java", "User prefers simple code examples", "User is building an AI chatbot called PML").
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
