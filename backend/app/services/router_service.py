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
        r"\b(latest|today|currently|current|recent|recently|this\s+week|this\s+month|newest|updated|breaking|now|as\s+of\s+today|latest\s+news|latest\s+developments|happened\s+today|happened\s+in|new\s+in)\b",
        r"\b(2025|2026|live\s+score|stock\s+price|market\s+cap|release\s+date|election\s+result|price\s+of|weather|forecast|exchange\s+rate)\b",
        r"\b(search\s+the\s+web|search\s+online|google|lookup\s+online|find\s+online|search\s+for)\b",
        r"\bwho\s+is\s+the\s+(current|present|new)\b",
        r"\bwhat\s+is\s+the\s+(current|latest|present|new|newest)\b",
        r"\bwhat\s+are\s+the\s+(current|latest|present|new|newest)\b",
        r"\bwhat\s+happened\s+in\b"
    ]

    WIKIPEDIA_PATTERNS = [
        r"\b(wikipedia|wiki\s+page|encyclopedia|encyclopedic)\b",
        r"^(search\s+wikipedia|look\s+up\s+on\s+wikipedia|check\s+wikipedia|wiki\s+search)\b",
        r"\b(encyclopedic\s+entry\s+for|wikipedia\s+article\s+on|wiki\s+lookup)\s+[\w\s\.\-]+",
    ]

    RAG_PATTERNS = [
        r"\b(pdf|document|file|notes|uploaded|paper|textbook|chapter|section|page\s+\d+)\b",
        r"\b(according\s+to\s+my|in\s+my\s+uploaded|from\s+the\s+document)\b"
    ]

    IMAGE_GENERATION_PATTERNS = [
        r"\b(generate|create|make|draw|paint|design|render|illustrate|produce)\s+(an?\s+)?(realistic\s+|3d\s+|cartoon\s+|concept\s+|anime\s+|cinematic\s+|vibrant\s+|beautiful\s+|cool\s+)?(image|picture|photo|illustration|artwork|drawing|painting|poster|logo|render|graphic|wallpaper|avatar|icon)\b",
        r"^(draw|paint|illustrate|render)\s+(a|an|the|me\s+a|me\s+an)?\s+[\w\s\-\,\.]+",
        r"^(create|generate|make)\s+(a|an|the|me\s+a|me\s+an)\s+(logo|illustration|poster|3d\s+render|artwork|portrait|wallpaper|drawing|painting|cartoon|graphic)\b",
        r"\b(image|picture|photo|illustration|render)\s+of\s+[\w\s\-\,\.]+",
        r"^(visualize|depict)\s+[\w\s\-\,\.]+",
        r"^(make\s+it|change\s+it\s+to|change\s+the\s+lighting\s+to|make\s+the\s+\w+)\s+(more\s+)?(realistic|cinematic|anime|3d|vibrant|darker|brighter|colorful|detailed|sunset|cyberpunk)\b"
    ]

    IMAGE_GENERATION_EXCLUSIONS = [
        r"^(what\s+is|explain|how\s+does|how\s+to|define|search\s+for|search\s+the\s+web|look\s+up|history\s+of|difference\s+between|why\s+is|can\s+you\s+explain)\b",
        r"\b(segmentation|classification|compression|recognition|processing|algorithm|models?|dataset|format)\b"
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

        # 2. Vision inspection (image uploaded for analysis)
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

        # 4. Image Generation detection
        needs_image_gen = False
        is_excluded = any(re.search(pat, lower_text) for pat in cls.IMAGE_GENERATION_EXCLUSIONS)
        if not is_excluded:
            for pat in cls.IMAGE_GENERATION_PATTERNS:
                if re.search(pat, lower_text):
                    needs_image_gen = True
                    if "generate_image" not in tools:
                        tools.append("generate_image")
                    break

        # 5. Memory recall detection
        needs_memory = False
        if memory_enabled and not needs_image_gen:
            for pat in cls.MEMORY_RECALL_PATTERNS:
                if re.search(pat, lower_text):
                    needs_memory = True
                    if "memory" not in tools:
                        tools.append("memory")
                    break

        # 6. Document RAG detection
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

        # 7. Web Search detection (real-time news, current events, recent tech)
        needs_web = False
        if not needs_image_gen:
            for pat in cls.CURRENT_INFO_PATTERNS:
                if re.search(pat, lower_text):
                    needs_web = True
                    if "web_search" not in tools:
                        tools.append("web_search")
                    break

        # 8. Wikipedia detection (established facts, history, science, biography)
        needs_wiki = False
        if not needs_web and not needs_rag and not needs_image_gen:
            for pat in cls.WIKIPEDIA_PATTERNS:
                if re.search(pat, lower_text):
                    needs_wiki = True
                    if "wikipedia_search" not in tools:
                        tools.append("wikipedia_search")
                    break

        # 9. Calculator detection
        needs_calc = False
        extracted_expr = None
        if not needs_image_gen:
            for pat in cls.CALC_PATTERNS:
                m = re.search(pat, lower_text)
                if m:
                    needs_calc = True
                    extracted_expr = m.group(0)
                    if "calculator" not in tools:
                        tools.append("calculator")
                    break

        # 10. Determine overall intent
        if len(tools) > 1:
            intent = "multi_tool"
        elif "generate_image" in tools:
            intent = "image_generation"
        elif "vision" in tools:
            intent = "vision"
        elif "rag" in tools:
            intent = "rag"
        elif "web_search" in tools:
            intent = "web_search"
        elif "wikipedia_search" in tools:
            intent = "wikipedia"
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
