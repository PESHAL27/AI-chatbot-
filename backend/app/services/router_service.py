import re
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from app.config import settings

logger = logging.getLogger("pml.router_service")

@dataclass
class RoutingPlan:
    """
    Structured execution plan created by the PML Intelligent AI Router.
    """
    intent: str  # 'general_ai', 'memory_write', 'memory_read', 'rag', 'calculation', 'web_search', 'wikipedia', 'vision', 'multi_tool', 'clarification'
    required_tools: List[str] = field(default_factory=list)  # e.g. ['vision', 'rag', 'memory', 'web_search', 'wikipedia_search', 'calculator']
    needs_clarification: bool = False
    clarification_prompt: Optional[str] = None
    extracted_expression: Optional[str] = None
    search_query: Optional[str] = None
    confidence: float = 1.0
    reasoning: str = ""
    requires_current_data: bool = False

class RouterService:
    """
    PML Intelligent AI Router & Tool Orchestrator.
    Determines intent, tool requirements, multi-tool chaining, and conversation context
    to route user queries to the optimal capability (Normal AI, Wikipedia, Web Search, RAG, Calculator, Memory, Vision).
    """

    # 1. Memory Write Patterns
    EXPLICIT_MEMORY_PATTERNS = [
        r"^remember\s+(that\s+)?",
        r"^my\s+favorite\s+\w+\s+is\s+",
        r"^from\s+now\s+on\s+call\s+me\s+",
        r"^i\s+prefer\s+",
        r"^keep\s+in\s+mind\s+that\s+",
        r"^forget\s+(that\s+)?"
    ]

    # 2. Memory Recall Patterns
    MEMORY_RECALL_PATTERNS = [
        r"what\s+(is|are)\s+my\s+(favorite|name|project|goal|preference|background|stack)",
        r"what\s+programming\s+language\s+(am\s+i|do\s+i)",
        r"what\s+(am\s+i|did\s+i\s+say|was\s+my)",
        r"do\s+you\s+remember\s+(me|my|what)",
        r"who\s+am\s+i\b",
        r"tell\s+me\s+about\s+my\s+(project|preference|stack|goals|profile)",
        r"what\s+do\s+you\s+remember\s+about\s+(me|my)"
    ]

    # 3. Calculation & Math Patterns
    CALC_PATTERNS = [
        r"\bcalculate\b",
        r"\bsolve\b\s+([0-9\.\+\-\*\/\^\(\)\s\%\×\÷]+)",
        r"what\s+is\s+([0-9]+(?:\.[0-9]+)?\s*[\+\-\*\/×÷\^]\s*[0-9]+(?:\.[0-9]+)?)",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\*×]\s*([0-9]+(?:\.[0-9]+)?)",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\/÷]\s*([0-9]+(?:\.[0-9]+)?)",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\+\-]\s*([0-9]+(?:\.[0-9]+)?)\s*=",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\%]\s+of\s+([0-9]+(?:\.[0-9]+)?)",
        r"\b(average|mean|total\s+price|sum\s+of)\b",
    ]

    # 4. Live / Real-Time / Web Search Patterns
    CURRENT_INFO_PATTERNS = [
        r"\b(current|latest|recent|today|news|update|developments|price|exchange\s+rate|weather|forecast|score)\b",
        r"\b(2024|2025|2026|live\s+score|stock\s+price|market\s+cap|release\s+date|election|winner|results)\b",
        r"\b(search\s+the\s+web|search\s+for|google|lookup\s+online|find\s+online|what\s+happened\s+in)\b",
        r"\bwhat\s+is\s+the\s+(current|latest|present|new)\b",
        r"\b(latest\s+version\s+of|current\s+status\s+of|what\s+is\s+he\s+doing\s+currently|currently)\b"
    ]

    # 5. Wikipedia & Encyclopedia Patterns (Biographies, Historical Facts, Foundations)
    WIKIPEDIA_PATTERNS = [
        r"^who\s+was\s+[\w\s\.\-]+",
        r"^who\s+(invented|discovered|founded|created|built|developed\s+the\s+theory\s+of)\s+[\w\s\.\-]+",
        r"\b(history\s+of|origin\s+of|biography\s+of|overview\s+of|timeline\s+of)\s+[\w\s\.\-]+",
        r"^(who\s+is\s+[\w\s\.\-]+)(\s+and\b|\?|$)",
        r"\b(wikipedia|wiki\s+page|encyclopedia|encyclopedic)\b",
        r"^(search\s+wikipedia|look\s+up\s+on\s+wikipedia|check\s+wikipedia|wiki\s+search)\b",
    ]

    # 6. Document RAG Patterns
    RAG_PATTERNS = [
        r"\b(pdf|document|file|notes|uploaded|paper|textbook|chapter|section|page\s+\d+)\b",
        r"\b(according\s+to\s+my|in\s+my\s+uploaded|from\s+the\s+document|in\s+the\s+table)\b"
    ]

    # 7. Ambiguous Prompts Requiring Clarification
    AMBIGUOUS_PATTERNS = [
        r"^(find\s+it|calculate|search|look\s+up|solve\s+it|do\s+it|help)$"
    ]

    @classmethod
    def plan(
        cls,
        message: str,
        has_images: bool = False,
        document_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        memory_enabled: bool = True
    ) -> RoutingPlan:
        """
        Analyzes prompt, attachments, history context, and temporal requirements to generate a RoutingPlan.
        """
        text = (message or "").strip()
        lower_text = text.lower()
        clean_text = re.sub(r'[\.\?!,;]+$', '', lower_text).strip()
        tools: List[str] = []
        requires_current = False

        # --- STEP 1: Ambiguous prompt detection ---
        for pat in cls.AMBIGUOUS_PATTERNS:
            if re.match(pat, clean_text):
                cls._log_trace("clarification", [], 0.95, "Prompt is overly ambiguous without a target.", False)
                return RoutingPlan(
                    intent="clarification",
                    needs_clarification=True,
                    clarification_prompt="What specific task, document, or topic would you like me to assist you with?",
                    confidence=0.95,
                    reasoning="Prompt is overly ambiguous without a target."
                )

        # --- STEP 2: Vision Inspection (Attachment Priority) ---
        if has_images:
            tools.append("vision")

        # --- STEP 3: Explicit Memory Write Commands ---
        if memory_enabled:
            for pat in cls.EXPLICIT_MEMORY_PATTERNS:
                if re.search(pat, lower_text):
                    cls._log_trace("memory_write", ["memory"], 1.0, "User explicitly commanded to save long-term memory.", False)
                    return RoutingPlan(
                        intent="memory_write",
                        required_tools=["memory"],
                        confidence=1.0,
                        reasoning="User explicitly commanded to save or modify long-term memory."
                    )

        # --- STEP 4: Memory Recall Detection ---
        if memory_enabled:
            for pat in cls.MEMORY_RECALL_PATTERNS:
                if re.search(pat, lower_text):
                    if "memory" not in tools:
                        tools.append("memory")
                    break

        # --- STEP 5: Document RAG Detection & Contextual Continuity ---
        needs_rag = False
        if document_id:
            needs_rag = True
            if "rag" not in tools:
                tools.append("rag")
        else:
            for pat in cls.RAG_PATTERNS:
                if re.search(pat, lower_text):
                    needs_rag = True
                    if "rag" not in tools:
                        tools.append("rag")
                    break

        # Contextual RAG check from recent history
        if not needs_rag and history and len(history) > 0:
            last_user_msg = next((m.get("content", "").lower() for m in reversed(history) if m.get("role") == "user"), "")
            if any(term in last_user_msg for term in ["pdf", "document", "uploaded", "file"]):
                if any(kw in lower_text for kw in ["what does it say", "explain chapter", "in section", "according to it", "from it"]):
                    if "rag" not in tools:
                        tools.append("rag")

        # --- STEP 6: Calculator Detection ---
        extracted_expr = None
        for pat in cls.CALC_PATTERNS:
            m = re.search(pat, lower_text)
            if m:
                extracted_expr = m.group(0)
                if "calculator" not in tools:
                    tools.append("calculator")
                break

        # --- STEP 7: Live Web Search Detection ---
        for pat in cls.CURRENT_INFO_PATTERNS:
            if re.search(pat, lower_text):
                requires_current = True
                if "web_search" not in tools:
                    tools.append("web_search")
                break

        # --- STEP 8: Wikipedia Detection (Factual & Historical Entities) ---
        for pat in cls.WIKIPEDIA_PATTERNS:
            if re.search(pat, lower_text):
                # Only add wikipedia if not already covered by pure current query, or if it's a multi-topic compound query
                if "wikipedia_search" not in tools:
                    tools.append("wikipedia_search")
                break

        # --- STEP 9: Contextual Pronoun & History Continuity ---
        # e.g., "Who was Alan Turing?" followed by "What did he contribute to computing?"
        if not tools and history and len(history) > 0:
            last_assistant_msg = next((m.get("content", "").lower() for m in reversed(history) if m.get("role") in ("assistant", "pml")), "")
            if any(p in lower_text.split() for p in ["he", "she", "his", "her", "their", "they"]):
                # Retain conversational context naturally with Normal AI
                pass

        # --- STEP 10: Final Intent & Confidence Resolution ---
        if len(tools) > 1:
            intent = "multi_tool"
            confidence = 0.95
        elif "vision" in tools:
            intent = "vision"
            confidence = 0.98
        elif "rag" in tools:
            intent = "rag"
            confidence = 0.95
        elif "web_search" in tools:
            intent = "web_search"
            confidence = 0.96
        elif "wikipedia_search" in tools:
            intent = "wikipedia"
            confidence = 0.92
        elif "calculator" in tools:
            intent = "calculation"
            confidence = 0.99
        elif "memory" in tools:
            intent = "memory_read"
            confidence = 0.95
        else:
            intent = "general_ai"
            confidence = 0.90

        reasoning = f"Routed to {intent} based on semantic intent and context."
        cls._log_trace(intent, tools, confidence, reasoning, requires_current)

        return RoutingPlan(
            intent=intent,
            required_tools=tools,
            extracted_expression=extracted_expr,
            confidence=confidence,
            reasoning=reasoning,
            requires_current_data=requires_current
        )

    @classmethod
    def _log_trace(cls, intent: str, tools: List[str], confidence: float, reason: str, requires_current: bool):
        """Outputs a clean developer trace to logs."""
        trace = (
            f"\n=================== PML ROUTER TRACE ===================\n"
            f"Intent:               {intent}\n"
            f"Selected Tools:       {tools}\n"
            f"Confidence:           {confidence:.2f}\n"
            f"Requires Current:     {requires_current}\n"
            f"Reason:               {reason}\n"
            f"========================================================"
        )
        logger.info(trace)

