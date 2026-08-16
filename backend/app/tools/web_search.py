import httpx
import urllib.parse
import json
import logging
from typing import Dict, Any, List
from bs4 import BeautifulSoup
from app.tools.base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

class WebSearchTool(BaseTool):
    """
    Backend Web Search Tool for PML AI.
    Queries live web sources for current information, news, technology updates, or real-time facts.
    Returns structured results: Title, URL, Snippet, Source domain.
    """
    name = "web_search"
    description = "Searches the live web for real-time information, current news, technology releases, current events, or recent facts. Use this tool ONLY when current/real-time information is needed."
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Concise web search query (e.g. 'latest AI news 2026', 'current Python version')."
            },
            "num_results": {
                "type": "integer",
                "description": "Number of top results to retrieve (default 5).",
                "default": 5
            }
        },
        "required": ["query"]
    }

    async def execute(self, query: str, num_results: int = 5, **kwargs) -> ToolResult:
        clean_query = query.strip()
        logger.info(f"[PML Tool] Selected: web_search | Query: '{clean_query}'")

        results: List[Dict[str, str]] = []

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept-Language": "en-US,en;q=0.9"
        }

        # 1. Try DuckDuckGo HTML Search via POST (reliable & non-rate limited)
        try:
            ddg_url = "https://html.duckduckgo.com/html/"
            form_data = {"q": clean_query, "b": ""}

            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                res = await client.post(ddg_url, data=form_data, headers=headers)
                if res.status_code == 200:
                    soup = BeautifulSoup(res.text, "html.parser")
                    results_divs = soup.find_all("div", class_="result")

                    for div in results_divs[:num_results]:
                        title_elem = div.find("a", class_="result__a")
                        snippet_elem = div.find("a", class_="result__snippet")

                        if title_elem and title_elem.text:
                            raw_url = title_elem.get("href", "")
                            # Clean DuckDuckGo redirect URL if present
                            if "uddg=" in raw_url:
                                parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                                final_url = parsed.get("uddg", [raw_url])[0]
                            else:
                                final_url = raw_url

                            title = title_elem.text.strip()
                            snippet = snippet_elem.text.strip() if snippet_elem else "No excerpt available."
                            domain = urllib.parse.urlparse(final_url).netloc or "web"

                            if final_url and final_url.startswith("http"):
                                results.append({
                                    "title": title,
                                    "url": final_url,
                                    "snippet": snippet,
                                    "source": domain
                                })
        except Exception as err:
            logger.warn(f"[PML Tool] DuckDuckGo HTML search POST failed: {err}")

        # 2. Fallback if POST returned no items: DuckDuckGo GET search
        if not results:
            try:
                encoded_q = urllib.parse.quote_plus(clean_query)
                ddg_get_url = f"https://html.duckduckgo.com/html/?q={encoded_q}"
                async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
                    res = await client.get(ddg_get_url, headers=headers)
                    if res.status_code == 200:
                        soup = BeautifulSoup(res.text, "html.parser")
                        results_divs = soup.find_all("div", class_="result")
                        for div in results_divs[:num_results]:
                            title_elem = div.find("a", class_="result__a")
                            snippet_elem = div.find("a", class_="result__snippet")
                            if title_elem and title_elem.text:
                                raw_url = title_elem.get("href", "")
                                final_url = raw_url
                                if "uddg=" in raw_url:
                                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                                    final_url = parsed.get("uddg", [raw_url])[0]
                                title = title_elem.text.strip()
                                snippet = snippet_elem.text.strip() if snippet_elem else "No excerpt available."
                                domain = urllib.parse.urlparse(final_url).netloc or "web"
                                if final_url and final_url.startswith("http"):
                                    results.append({
                                        "title": title,
                                        "url": final_url,
                                        "snippet": snippet,
                                        "source": domain
                                    })
            except Exception as err:
                logger.warn(f"[PML Tool] DuckDuckGo GET fallback failed: {err}")

        if not results:
            logger.info(f"[PML Tool] Search failed or returned empty results for query '{clean_query}'.")
            return ToolResult(
                success=False,
                data={"query": clean_query, "results": []},
                error="Web search service is currently unavailable or returned no relevant results.",
                formatted_output=f"WEB SEARCH NOTICE: Could not fetch live web search results for '{clean_query}'. You MUST inform the user that live web search is currently unavailable and answer strictly based on existing model knowledge without inventing facts or URLs."
            )

        logger.info(f"[PML Tool] Search returned {len(results)} results for query '{clean_query}'.")

        # Format structured output for AI Context
        formatted_blocks = [f"### LIVE WEB SEARCH RESULTS FOR: '{clean_query}'"]
        for idx, item in enumerate(results, 1):
            formatted_blocks.append(
                f"[{idx}] {item['title']}\n"
                f"    URL: {item['url']}\n"
                f"    Source: {item['source']}\n"
                f"    Snippet: {item['snippet']}"
            )

        formatted_output = "\n\n".join(formatted_blocks)

        return ToolResult(
            success=True,
            data={"query": clean_query, "results": results},
            formatted_output=formatted_output
        )
