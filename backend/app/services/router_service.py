import re
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from app.config import settings
from app.tools.registry import tool_registry

logger = logging.getLogger("pml.router_service")

@dataclass
class RoutingPlan:
    """
    Structured execution plan created by the PML Intelligent Router.
    """
    intent: str  # 'general_ai', 'memory_write', 'memory_read', 'rag', 'calculation', 'web_search', 'vision', 'multi_tool', 'clarification'
    required_tools: List[str] = field(default_factory=list)  # ['vision', 'rag', 'memory', 'web_search', 'calculator']
    needs_clarification: bool = False
    clarification_prompt: Optional[str] = None
    extracted_expression: Optional[str] = None
    search_query: Optional[str] = None
    confidence: float = 1.0
    reasoning: str = ""

class RouterService:
    """
    PML Intelligent AI Router & Tool Orchestrator.
    Determines intent, tool requirements, execution order, and multi-tool chaining
    to deliver fast, accurate, and cost-effective responses.
    """

    # Patterns for fast deterministic intent classification
    EXPLICIT_MEMORY_PATTERNS = [
        r"^remember\s+(that\s+)?",
        r"^my\s+favorite\s+\w+\s+is\s+",
        r"^from\s+now\s+on\s+call\s+me\s+",
        r"^i\s+prefer\s+",
        r"^keep\s+in\s+mind\s+that\s+",
        r"^forget\s+(that\s+)?"
    ]

    MEMORY_RECALL_PATTERNS = [
        r"what\s+(is|are)\s+my\s+(favorite|name|project|goal|preference|background)",
        r"what\s+programming\s+language\s+(am\s+i|do\s+i)",
        r"what\s+(am\s+i|did\s+i\s+say|was\s+my)",
        r"do\s+you\s+remember\s+(me|my|what)",
        r"who\s+am\s+i\b",
        r"tell\s+me\s+about\s+my\s+(project|preference|stack|goals)"
    ]

    CALC_PATTERNS = [
        r"calculate\s+([0-9\.\+\-\*\/\^\(\)\s\%\×\÷]+)",
        r"what\s+is\s+([0-9]+(?:\.[0-9]+)?\s*[\+\-\*\/×÷\^]\s*[0-9]+(?:\.[0-9]+)?)",
        r"solve\s+([0-9\.\+\-\*\/\^\(\)\s\%\×\÷]+)",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\*×]\s*([0-9]+(?:\.[0-9]+)?)",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\/÷]\s*([0-9]+(?:\.[0-9]+)?)",
        r"([0-9]+(?:\.[0-9]+)?)\s*[\+\-]\s*([0-9]+(?:\.[0-9]+)?)"
    ]

    CURRENT_INFO_PATTERNS = [
        r"\b(current|latest|recent|today|news|update|developments|price|exchange\s+rate|weather|forecast|who\s+is\s+the\s+current)\b",
        r"\b(2025|2026|live\s+score|stock\s+price|market\s+cap|release\s+date)\b",
        r"\b(search\s+the\s+web|search\s+for|google|lookup\s+online)\b"
    ]

    RAG_PATTERNS = [
        r"\b(pdf|document|file|notes|uploaded|paper|textbook|chapter|section|page\s+\d+)\b",
        r"\b(according\s+to\s+my|in\s+my\s+uploaded|from\s+the\s+document)\b"
    ]

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
        Analyzes the user's prompt, attachments, and context to generate a structured RoutingPlan.
        """
        text = (message or "").strip()
        lower_text = text.lower()
        clean_text = re.sub(r'[\.\?!,;]+$', '', lower_text).strip()
        tools: List[str] = []

        # 1. Ambiguous prompt detection
        for pat in cls.AMBIGUOUS_PATTERNS:
            if re.match(pat, clean_text):
                return RoutingPlan(
                    intent="clarification",
                    needs_clarification=True,
                    clarification_prompt="What specific task or topic would you like me to assist you with?",
                    confidence=0.95,
                    reasoning="Prompt is overly ambiguous without a target."
                )

        # 2. Vision inspection
        if has_images:
            tools.append("vision")

        # 3. Explicit Memory write commands
        if memory_enabled:
            for pat in cls.EXPLICIT_MEMORY_PATTERNS:
                if re.search(pat, lower_text):
                    return RoutingPlan(
                        intent="memory_write",
                        required_tools=["memory"],
                        confidence=1.0,
                        reasoning="User explicitly commanded to save or modify long-term memory."
                    )

        # 4. Memory recall detection
        needs_memory = False
        if memory_enabled:
            for pat in cls.MEMORY_RECALL_PATTERNS:
                if re.search(pat, lower_text):
                    needs_memory = True
                    if "memory" not in tools:
                        tools.append("memory")
                    break

        # 5. Document RAG detection
        needs_rag = False
        if document_id:
            needs_rag = True
            tools.append("rag")
        else:
            for pat in cls.RAG_PATTERNS:
                if re.search(pat, lower_text):
                    needs_rag = True
                    if "rag" not in tools:
                        tools.append("rag")
                    break

        # 6. Web Search detection
        needs_web = False
        for pat in cls.CURRENT_INFO_PATTERNS:
            if re.search(pat, lower_text):
                needs_web = True
                if "web_search" not in tools:
                    tools.append("web_search")
                break

        # 7. Calculator detection
        needs_calc = False
        extracted_expr = None
        for pat in cls.CALC_PATTERNS:
            m = re.search(pat, lower_text)
            if m:
                needs_calc = True
                extracted_expr = m.group(0)
                if "calculator" not in tools:
                    tools.append("calculator")
                break

        # 8. Determine overall intent
        if len(tools) > 1:
            intent = "multi_tool"
        elif "vision" in tools:
            intent = "vision"
        elif "rag" in tools:
            intent = "rag"
        elif "web_search" in tools:
            intent = "web_search"
        elif "calculator" in tools:
            intent = "calculation"
        elif "memory" in tools:
            intent = "memory_read"
        else:
            intent = "general_ai"

        logger.info(f"[PML Router] Planned intent='{intent}', tools={tools} for prompt='{text[:50]}'")
        return RoutingPlan(
            intent=intent,
            required_tools=tools,
            extracted_expression=extracted_expr,
            confidence=0.95 if tools else 0.85,
            reasoning=f"Identified intent: {intent}"
        )
