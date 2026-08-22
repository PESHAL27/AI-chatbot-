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

import xml.etree.ElementTree as ET

def _sync_news_rss_search(clean_query: str, num_results: int = 5) -> List[Dict[str, str]]:
    """Synchronous live news/web RSS search using Google News public feed."""
    results: List[Dict[str, str]] = []
    try:
        encoded_query = urllib.parse.quote(clean_query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/rss+xml, application/xml, text/xml, */*"
            }
        )
        with urllib.request.urlopen(req, timeout=8.0) as res:
            tree = ET.fromstring(res.read())
            for item in tree.findall(".//item")[:num_results]:
                title_elem = item.find("title")
                link_elem = item.find("link")
                desc_elem = item.find("description")
                source_elem = item.find("source")

                title = title_elem.text if title_elem is not None and title_elem.text else clean_query
                link = link_elem.text if link_elem is not None and link_elem.text else "#"
                raw_desc = desc_elem.text if desc_elem is not None and desc_elem.text else ""
                snippet = BeautifulSoup(raw_desc, "html.parser").get_text().strip() if raw_desc else ""
                source_name = source_elem.text if source_elem is not None and source_elem.text else (urllib.parse.urlparse(link).netloc or "web")

                if link and link != "#":
                    results.append({
                        "title": title,
                        "url": link,
                        "snippet": snippet[:260] + "..." if len(snippet) > 260 else snippet,
                        "source": source_name
                    })
    except Exception as err:
        logger.warning(f"[PML Tool] Live RSS search exception: {err}")
    return results


def _sync_ddg_html_search(clean_query: str, num_results: int = 5) -> List[Dict[str, str]]:
    """Synchronous DuckDuckGo search using modern httpx client with POST."""
    results: List[Dict[str, str]] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://html.duckduckgo.com/"
    }
    try:
        with httpx.Client(follow_redirects=True, timeout=8.0) as client:
            r = client.post("https://html.duckduckgo.com/html/", data={"q": clean_query, "b": ""}, headers=headers)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for div in soup.find_all("div", class_="result")[:num_results]:
                    a_elem = div.find("a", class_="result__a")
                    s_elem = div.find("a", class_="result__snippet")
                    if a_elem and a_elem.text:
                        raw_url = a_elem.get("href", "")
                        if "uddg=" in raw_url:
                            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                            raw_url = parsed.get("uddg", [raw_url])[0]
                        title = a_elem.get_text(strip=True)
                        snippet = s_elem.get_text(strip=True) if s_elem else ""
                        domain = urllib.parse.urlparse(raw_url).netloc or "web"
                        if raw_url and raw_url.startswith("http"):
                            results.append({
                                "title": title,
                                "url": raw_url,
                                "snippet": snippet,
                                "source": domain
                            })
    except Exception as err:
        logger.warning(f"[PML Tool] Httpx DuckDuckGo search error: {err}")

    # Fallback to urllib standard request if httpx returned empty
    if not results:
        try:
            data = urllib.parse.urlencode({"q": clean_query, "b": ""}).encode("utf-8")
            req = urllib.request.Request("https://html.duckduckgo.com/html/", data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=8.0) as res:
                soup = BeautifulSoup(res.read(), "html.parser")
                for div in soup.find_all("div", class_="result")[:num_results]:
                    title_elem = div.find("a", class_="result__a")
                    snippet_elem = div.find("a", class_="result__snippet")
                    if title_elem and title_elem.text:
                        raw_url = title_elem.get("href", "")
                        if "uddg=" in raw_url:
                            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                            raw_url = parsed.get("uddg", [raw_url])[0]
                        results.append({
                            "title": title_elem.get_text(strip=True),
                            "url": raw_url,
                            "snippet": snippet_elem.get_text(strip=True) if snippet_elem else "",
                            "source": urllib.parse.urlparse(raw_url).netloc or "web"
                        })
        except Exception as err:
            logger.warning(f"[PML Tool] Urllib DuckDuckGo search error: {err}")

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
        logger.info(
            f"\n[PML Router Debug]\n"
            f"Intent: Current Information\n"
            f"Selected Tool: Web Search\n"
            f"Tool Execution: Started\n"
            f"Query: '{clean_query}'"
        )

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
                logger.warning(f"[PML Tool] Tavily search API error: {err}")

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
                logger.warning(f"[PML Tool] Serper API error: {err}")

        # 3. Primary Zero-Key Engine: DuckDuckGo HTML Live Web Search
        if not results:
            results = await asyncio.to_thread(_sync_ddg_html_search, clean_query, num_results)

        # 4. Secondary Zero-Key Engine: Google News & Live RSS Search (for breaking news / live updates)
        if len(results) < 2:
            rss_results = await asyncio.to_thread(_sync_news_rss_search, clean_query, num_results)
            for r in rss_results:
                if not any(existing.get("title") == r.get("title") for existing in results):
                    results.append(r)

        if not results:
            logger.warning(f"[PML Tool] Web search failed or returned 0 results for query '{clean_query}'.")
            logger.info(
                f"\n[PML Router Debug]\n"
                f"Tool Execution: Completed\n"
                f"Result Count: 0"
            )
            return ToolResult(
                success=False,
                data={"query": clean_query, "results": []},
                error="Web search service is currently unavailable or returned no relevant results.",
                formatted_output=(
                    f"WEB SEARCH FAILURE: Could not fetch live web search results for '{clean_query}'. "
                    "CRITICAL DIRECTIVE: The user requested current information, but live web search is unavailable. "
                    "You MUST reply: 'I couldn't verify the latest information right now because the web search service is unavailable.' "
                    "Do NOT fabricate current news, dates, or pretend that a web search occurred."
                )
            )

        logger.info(
            f"\n[PML Router Debug]\n"
            f"Tool Execution: Completed\n"
            f"Result Count: {len(results)}"
        )

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
