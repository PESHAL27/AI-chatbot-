import time
import httpx
import urllib.parse
import logging
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("pml.wikipedia_service")

class WikipediaService:
    """
    Official Wikimedia / MediaWiki API Client for PML Backend.
    Provides intelligent Wikipedia article search, summary extraction,
    disambiguation detection, and in-memory TTL caching.
    """
    _cache: Dict[str, Dict[str, Any]] = {}
    _CACHE_TTL_SECONDS: int = 3600  # 1 hour cache TTL for public knowledge

    @classmethod
    def _get_headers(cls) -> Dict[str, str]:
        """Returns official Wikimedia compliant User-Agent headers."""
        return {
            "User-Agent": settings.WIKIPEDIA_USER_AGENT,
            "Accept": "application/json"
        }

    @classmethod
    def _get_cache(cls, key: str) -> Optional[List[Dict[str, Any]]]:
        """Retrieves cached results if within TTL."""
        entry = cls._cache.get(key)
        if entry:
            if time.time() - entry["timestamp"] < cls._CACHE_TTL_SECONDS:
                logger.info(f"[PML Wikipedia Cache] Cache HIT for query '{key}'")
                return entry["data"]
            else:
                del cls._cache[key]
        return None

    @classmethod
    def _set_cache(cls, key: str, data: List[Dict[str, Any]]) -> None:
        """Stores search results in in-memory TTL cache."""
        # Evict oldest entries if cache exceeds 500 items
        if len(cls._cache) > 500:
            oldest_key = min(cls._cache.keys(), key=lambda k: cls._cache[k]["timestamp"])
            del cls._cache[oldest_key]
        cls._cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

    @classmethod
    async def get_page_summary(cls, title: str, lang: str = "en") -> Optional[Dict[str, Any]]:
        """
        Retrieves article summary from Wikimedia REST API.
        Endpoint: https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}
        """
        encoded_title = urllib.parse.quote(title.replace(" ", "_"))
        url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encoded_title}"

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url, headers=cls._get_headers())
                if res.status_code == 200:
                    data = res.json()
                    page_type = data.get("type", "standard")
                    extract = data.get("extract", "").strip()
                    page_title = data.get("title", title)
                    page_url = data.get("content_urls", {}).get("desktop", {}).get("page", f"https://{lang}.wikipedia.org/wiki/{encoded_title}")
                    thumbnail_url = data.get("thumbnail", {}).get("source")
                    description = data.get("description", "")

                    return {
                        "title": page_title,
                        "url": page_url,
                        "extract": extract,
                        "description": description,
                        "thumbnail": thumbnail_url,
                        "is_disambiguation": page_type == "disambiguation" or "disambiguation" in extract.lower()[:80]
                    }
                elif res.status_code == 404:
                    logger.info(f"[PML Wikipedia] Page summary 404 for '{title}'")
                    return None
        except Exception as err:
            logger.warning(f"[PML Wikipedia] Error fetching page summary for '{title}': {err}")
        return None

    @classmethod
    async def search_articles(cls, query: str, max_results: int = 3, lang: str = "en") -> List[Dict[str, Any]]:
        """
        Searches Wikipedia using official MediaWiki Action API.
        Endpoint: https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json
        """
        clean_query = query.strip()
        if not clean_query:
            return []

        cache_key = f"{lang}:{clean_query.lower()}:{max_results}"
        cached = cls._get_cache(cache_key)
        if cached is not None:
            return cached

        search_url = f"https://{lang}.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": clean_query,
            "srlimit": max_results,
            "format": "json",
            "utf8": "1"
        }

        results: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(search_url, params=params, headers=cls._get_headers())
                if res.status_code == 200:
                    search_data = res.json()
                    search_items = search_data.get("query", {}).get("search", [])

                    for item in search_items:
                        title = item.get("title", "")
                        raw_snippet = item.get("snippet", "")
                        # Strip simple HTML tags from snippet
                        clean_snippet = raw_snippet.replace('<span class="searchmatch">', "").replace("</span>", "").strip()

                        # Retrieve rich summary for top article
                        summary_info = await cls.get_page_summary(title, lang=lang)
                        if summary_info and summary_info.get("extract"):
                            results.append({
                                "source": "wikipedia",
                                "title": summary_info["title"],
                                "url": summary_info["url"],
                                "content": summary_info["extract"],
                                "snippet": summary_info["extract"][:220] + "..." if len(summary_info["extract"]) > 220 else summary_info["extract"],
                                "description": summary_info.get("description", ""),
                                "thumbnail": summary_info.get("thumbnail"),
                                "is_disambiguation": summary_info.get("is_disambiguation", False)
                            })
                        else:
                            encoded_title = urllib.parse.quote(title.replace(" ", "_"))
                            results.append({
                                "source": "wikipedia",
                                "title": title,
                                "url": f"https://{lang}.wikipedia.org/wiki/{encoded_title}",
                                "content": clean_snippet,
                                "snippet": clean_snippet,
                                "description": "",
                                "thumbnail": None,
                                "is_disambiguation": False
                            })

            if results:
                cls._set_cache(cache_key, results)

        except Exception as err:
            logger.error(f"[PML Wikipedia] Search error for query '{clean_query}': {err}")

        return results
