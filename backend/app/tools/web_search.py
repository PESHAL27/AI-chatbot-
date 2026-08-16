import asyncio
import httpx
import urllib.parse
import urllib.request
import json
import logging
from typing import Dict, Any, List
from bs4 import BeautifulSoup
from app.config import settings
from app.tools.base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

def _sync_ddg_html_search(clean_query: str, num_results: int = 5) -> List[Dict[str, str]]:
    """Synchronous DuckDuckGo search using standard urllib."""
    results: List[Dict[str, str]] = []
    try:
        data = urllib.parse.urlencode({"q": clean_query, "b": ""}).encode("utf-8")
        req = urllib.request.Request(
            "https://html.duckduckgo.com/html/",
            data=data,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Language": "en-US,en;q=0.9"
            }
        )
        with urllib.request.urlopen(req, timeout=9.0) as res:
            soup = BeautifulSoup(res.read(), "html.parser")
            results_divs = soup.find_all("div", class_="result")

            for div in results_divs[:num_results]:
                title_elem = div.find("a", class_="result__a")
                snippet_elem = div.find("a", class_="result__snippet")

                if title_elem and title_elem.text:
                    raw_url = title_elem.get("href", "")
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
        logger.warn(f"[PML Tool] Sync DuckDuckGo search error: {err}")
    return results


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

        # 1. Check for Tavily Search API Key
        tavily_key = settings.TAVILY_API_KEY or settings.WEB_SEARCH_API_KEY
        if tavily_key and (settings.WEB_SEARCH_PROVIDER == "tavily" or tavily_key.startswith("tvly")):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    tav_res = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": tavily_key,
                            "query": clean_query,
                            "search_depth": "basic",
                            "max_results": num_results
                        }
                    )
                    if tav_res.status_code == 200:
                        tav_data = tav_res.json()
                        for item in tav_data.get("results", []):
                            results.append({
                                "title": item.get("title", clean_query),
                                "url": item.get("url", "#"),
                                "snippet": item.get("content", ""),
                                "source": urllib.parse.urlparse(item.get("url", "")).netloc or "tavily"
                            })
            except Exception as err:
                logger.warn(f"[PML Tool] Tavily search API error: {err}")

        # 2. Check for Serper (Google Search) API Key
        if not results and settings.SERPER_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    serp_res = await client.post(
                        "https://google.serper.dev/search",
                        headers={"X-API-KEY": settings.SERPER_API_KEY, "Content-Type": "application/json"},
                        json={"q": clean_query, "num": num_results}
                    )
                    if serp_res.status_code == 200:
                        serp_data = serp_res.json()
                        for item in serp_data.get("organic", [])[:num_results]:
                            results.append({
                                "title": item.get("title", clean_query),
                                "url": item.get("link", "#"),
                                "snippet": item.get("snippet", ""),
                                "source": urllib.parse.urlparse(item.get("link", "")).netloc or "google"
                            })
            except Exception as err:
                logger.warn(f"[PML Tool] Serper API error: {err}")

        # 3. Default Zero-Key Engine: DuckDuckGo Live Search
        if not results:
            results = await asyncio.to_thread(_sync_ddg_html_search, clean_query, num_results)

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
