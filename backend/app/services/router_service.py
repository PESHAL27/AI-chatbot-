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
    intent: str  # 'general_ai', 'memory_write', 'memory_read', 'rag', 'calculation', 'web_search', 'image_search', 'image_generation', 'vision', 'multi_tool', 'clarification'
    required_tools: List[str] = field(default_factory=list)  # ['vision', 'rag', 'memory', 'web_search', 'image_search', 'generate_image', 'calculator', 'wikipedia_search']
    needs_clarification: bool = False
    clarification_prompt: Optional[str] = None
    extracted_expression: Optional[str] = None
    search_query: Optional[str] = None
    include_images: bool = False
    confidence: float = 1.0
    reasoning: str = ""

class RouterService:
    """
    PML Intelligent AI Router & Tool Orchestrator.
    Determines intent, tool requirements, execution order, and multi-tool chaining
    to deliver fast, accurate, and cost-effective responses.
    Strictly distinguishes Real Image Search from AI Image Generation.
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
        r"\b(2025|2026|live\s+score|stock\s+price|market\s+cap|release\s+date|election\s+result|price\s+of|weather|forecast|exchange\s+rate|match|game|score)\b",
        r"\b(search\s+the\s+web|search\s+online|google|lookup\s+online|find\s+online|search\s+for)\b",
        r"\bwho\s+is\s+the\s+(current|present|new)\b",
        r"\bwhat\s+is\s+the\s+(current|latest|present|new|newest)\b",
        r"\bwhat\s+are\s+the\s+(current|latest|present|new|newest)\b",
        r"\bwhat\s+happened\s+in\b",
        r"\bwhat\s+did\s+[\w\s]+\s+do\s+in\b"
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

    # Explicit AI image generation verbs ONLY (create, generate, draw, paint, design, render)
    EXPLICIT_GENERATION_PATTERNS = [
        r"\b(generate|create|draw|paint|design|render|illustrate|produce)\s+(an?\s+)?(realistic\s+|3d\s+|cartoon\s+|concept\s+|anime\s+|cinematic\s+|vibrant\s+|fictional\s+|futuristic\s+|superhero\s+|cyberpunk\s+|artistic\s+|digital\s+|ai\s+)?(image|picture|photo|illustration|artwork|drawing|painting|poster|logo|render|graphic|wallpaper|avatar|icon|portrait)\b",
        r"\b(create|generate|draw|paint|render)\s+(an?\s+)?(artistic|cartoon|fictional|futuristic|superhero|cyberpunk|ai|3d|anime)\s+(version|portrait|artwork|image|picture)\s+of\b",
        r"^(generate|create|make|draw|paint|render)\s+(a|an|the|me\s+a)?\s+(futuristic|cartoon|cyberpunk|anime|superhero|realistic|3d|fictional)\b",
        r"^(draw|paint|illustrate|render)\s+(me\s+)?(a|an|the)?\s+[\w\s\-\,\.]+",
        r"\b(as\s+a\s+(superhero|cartoon|cyborg|robot|warrior|character|anime|alien))\b",
        r"^(visualize|depict)\s+[\w\s\-\,\.]+",
        r"^(make\s+it|change\s+it\s+to|change\s+the\s+lighting\s+to|make\s+the\s+\w+)\s+(more\s+)?(realistic|cinematic|anime|3d|vibrant|darker|brighter|colorful|detailed|sunset|cyberpunk)\b"
    ]

    # Real Photo / Image Search Patterns (show/find/pictures/photos/real photo/what does X look like)
    REAL_IMAGE_SEARCH_PATTERNS = [
        r"\b(real|actual|authentic|original)\s+(photos?|pictures?|images?|pics?)\b",
        r"\b(photos?|pictures?|images?|pics?)\s+(of|from|about)\b",
        r"\b(show|find|search|get|give|display)\s+(me\s+)?(some\s+|a\s+|the\s+)?(real\s+|actual\s+|latest\s+)?(photos?|pictures?|images?|pics?)\b",
        r"\b(latest|recent|new)\s+(photos?|pictures?|images?|pics?)\b",
        r"^[\w\s\.\-]+\s+(image|picture|photo|pic|images|pictures|photos|pics)$",
        r"\b(show\s+me|give\s+me|find\s+me)\s+(a\s+|an\s+|the\s+)?(picture|photo|image)\s+of\b",
        r"\bwhat\s+does\s+(.+)\s+look\s+like\b",
        r"^(show\s+me|find\s+a\s+photo\s+of|give\s+me\s+a\s+picture\s+of)\s+(cristiano\s+)?(ronaldo|elon\s+musk|virat\s+kohli|taylor\s+swift|messi|eiffel\s+tower|taj\s+mahal|mount\s+everest|steve\s+jobs|bill\s+gates)\b"
    ]

    VISION_PATTERNS = [
        r"\b(analyze|describe|inspect|scan|examine|read|extract\s+text\s+from|what\s+is\s+in)\s+(this|the)\s+[\w\s]*?(image|photo|picture|screenshot|file)\b",
        r"\b(what\s+do\s+you\s+see\s+in\s+this)\b"
    ]

    IMAGE_GENERATION_EXCLUSIONS = [
        r"^(what\s+is|explain|how\s+does|how\s+to|define|search\s+for|search\s+the\s+web|look\s+up|history\s+of|difference\s+between|why\s+is|can\s+you\s+explain)\b",
        r"\b(real\s+photo|real\s+picture|actual\s+photo|actual\s+picture|photos?\s+of|pictures?\s+of)\b",
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
        Strictly enforces that REAL photos of real people/places route to image_search,
        never to generate_image.
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

        # 2. Vision inspection (image uploaded for analysis or prompt asks to analyze image)
        if has_images or any(re.search(pat, lower_text) for pat in cls.VISION_PATTERNS):
            tools.append("vision")
            logger.info(f"[PML Router Debug] Query: '{text}' -> Intent: VISION | Selected Tool: vision")
            return RoutingPlan(
                intent="vision",
                required_tools=["vision"],
                confidence=1.0,
                reasoning="Vision request detected."
            )

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

        # 4. Check for Real Image Search vs AI Image Generation
        is_real_image_search = any(re.search(pat, lower_text) for pat in cls.REAL_IMAGE_SEARCH_PATTERNS)
        
        is_explicit_image_gen = False
        is_gen_excluded = any(re.search(pat, lower_text) for pat in cls.IMAGE_GENERATION_EXCLUSIONS)
        if not is_gen_excluded:
            for pat in cls.EXPLICIT_GENERATION_PATTERNS:
                if re.search(pat, lower_text):
                    is_explicit_image_gen = True
                    break

        # Disambiguation Rule:
        # If user explicitly wants PML to CREATE/DRAW/GENERATE something (e.g. "Create an image of Ronaldo as a superhero"),
        # explicit generation takes priority.
        # Otherwise, if asking for real photo/pictures/images of real people or things, DEFAULT TO REAL IMAGE SEARCH.
        has_real_photo_keywords = bool(
            re.search(r"\b(real\s+photo|real\s+picture|actual\s+photo|actual\s+picture)\b", lower_text)
        )

        if is_explicit_image_gen and not has_real_photo_keywords:
            tools.append("generate_image")
            logger.info(
                f"\n[PML Router Debug]\n"
                f"Query: '{text}'\n"
                f"Detected Intent: IMAGE_GENERATION\n"
                f"Selected Tool: generate_image\n"
                f"Reason: Explicit creation request"
            )
            return RoutingPlan(
                intent="image_generation",
                required_tools=["generate_image"],
                confidence=0.95,
                reasoning="Explicit image creation command."
            )

        if is_real_image_search:
            tools.append("image_search")
            logger.info(
                f"\n[PML Router Debug]\n"
                f"Query: '{text}'\n"
                f"Detected Intent: IMAGE_SEARCH\n"
                f"Selected Tool: image_search (WEB IMAGE SEARCH)\n"
                f"NOT: generate_image\n"
                f"Reason: Real photo / image search request"
            )

        # 5. Memory recall detection
        if memory_enabled and "image_search" not in tools:
            for pat in cls.MEMORY_RECALL_PATTERNS:
                if re.search(pat, lower_text):
                    if "memory" not in tools:
                        tools.append("memory")
                    break

        # 6. Document RAG detection
        if document_id:
            tools.append("rag")
        else:
            for pat in cls.RAG_PATTERNS:
                if re.search(pat, lower_text):
                    if "rag" not in tools:
                        tools.append("rag")
                    break

        # 7. Web Search detection (real-time news, current events, recent tech)
        is_current_info = any(re.search(pat, lower_text) for pat in cls.CURRENT_INFO_PATTERNS)
        if is_current_info:
            if "web_search" not in tools:
                tools.append("web_search")

        # 8. Wikipedia detection (established facts, history, science, biography)
        if "web_search" not in tools and "rag" not in tools and "image_search" not in tools:
            for pat in cls.WIKIPEDIA_PATTERNS:
                if re.search(pat, lower_text):
                    if "wikipedia_search" not in tools:
                        tools.append("wikipedia_search")
                    break

        # 9. Calculator detection
        extracted_expr = None
        if "image_search" not in tools and "web_search" not in tools:
            for pat in cls.CALC_PATTERNS:
                m = re.search(pat, lower_text)
                if m:
                    extracted_expr = m.group(0)
                    if "calculator" not in tools:
                        tools.append("calculator")
                    break

        # 10. Determine overall intent
        include_images = "image_search" in tools
        if len(tools) > 1:
            intent = "multi_tool"
        elif "image_search" in tools:
            intent = "image_search"
        elif "web_search" in tools:
            intent = "web_search"
        elif "generate_image" in tools:
            intent = "image_generation"
        elif "vision" in tools:
            intent = "vision"
        elif "rag" in tools:
            intent = "rag"
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
            include_images=include_images,
            confidence=0.95 if tools else 0.85,
            reasoning=f"Identified intent: {intent}"
        )
