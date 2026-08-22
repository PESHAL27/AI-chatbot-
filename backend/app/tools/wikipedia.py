import logging
from typing import Dict, Any, List
from app.config import settings
from app.tools.base import BaseTool, ToolResult
from app.services.wikipedia_service import WikipediaService

logger = logging.getLogger("pml.tool.wikipedia")

class WikipediaTool(BaseTool):
    """
    Official Wikipedia Knowledge Search Tool for PML AI.
    Queries the official Wikimedia API for established factual information,
    biographies, scientific concepts, history, geography, and encyclopedia articles.
    """
    name = "wikipedia_search"
    description = (
        "Searches official Wikipedia encyclopedia articles. "
        "Use ONLY when the user explicitly requests Wikipedia/encyclopedia lookup or when deep archival "
        "encyclopedic verification is specifically needed. "
        "Do NOT call this tool for standard knowledge or concepts that can be answered from internal AI model knowledge."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Specific subject, person, place, or concept to search on Wikipedia (e.g., 'Albert Einstein', 'Quantum mechanics', 'History of the Internet', 'Eiffel Tower')."
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of articles to retrieve (default 3).",
                "default": 3
            }
        },
        "required": ["query"]
    }

    async def execute(self, query: str, max_results: int = 3, **kwargs) -> ToolResult:
        clean_query = (query or "").strip()
        logger.info(f"[PML Tool] Selected: wikipedia_search | Query: '{clean_query}'")

        if not clean_query:
            return ToolResult(
                success=False,
                data={"query": "", "results": []},
                error="Empty Wikipedia search query.",
                formatted_output="WIKIPEDIA NOTICE: Query was empty. No encyclopedia articles searched."
            )

        try:
            results = await WikipediaService.search_articles(
                query=clean_query,
                max_results=max_results,
                lang=settings.WIKIPEDIA_LANGUAGE
            )

            if not results:
                logger.info(f"[PML Tool] No Wikipedia articles found for '{clean_query}'.")
                return ToolResult(
                    success=False,
                    data={"query": clean_query, "results": []},
                    error=f"No Wikipedia articles found for '{clean_query}'.",
                    formatted_output=(
                        f"WIKIPEDIA NOTICE: No direct Wikipedia article found for '{clean_query}'. "
                        "Answer based on verified AI model knowledge or request clarification if ambiguous."
                    )
                )

            # Build structured formatted text for AI context
            formatted_blocks = [f"### WIKIPEDIA KNOWLEDGE FOR: '{clean_query}'"]
            for idx, item in enumerate(results, 1):
                desc = f" ({item['description']})" if item.get("description") else ""
                disambig_tag = " [DISAMBIGUATION / MULTIPLE TOPICS]" if item.get("is_disambiguation") else ""
                formatted_blocks.append(
                    f"[{idx}] {item['title']}{desc}{disambig_tag}\n"
                    f"    URL: {item['url']}\n"
                    f"    Summary: {item['content']}"
                )

            formatted_output = "\n\n".join(formatted_blocks)
            logger.info(f"[PML Tool] Wikipedia search returned {len(results)} articles for '{clean_query}'.")

            return ToolResult(
                success=True,
                data={"query": clean_query, "results": results},
                formatted_output=formatted_output
            )

        except Exception as err:
            logger.error(f"[PML Tool] WikipediaTool execution failed: {err}")
            return ToolResult(
                success=False,
                data={"query": clean_query, "results": []},
                error=str(err),
                formatted_output=(
                    f"WIKIPEDIA NOTICE: Wikipedia service is temporarily unavailable ({str(err)}). "
                    "Proceed using general model knowledge."
                )
            )
