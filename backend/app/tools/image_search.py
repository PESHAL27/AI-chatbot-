import re
import urllib.parse
import logging
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings
from app.tools.base import BaseTool, ToolResult

logger = logging.getLogger("pml.image_search")

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

def clean_image_search_query(user_query: str) -> str:
    """
    Extracts a concise, focused search query from conversational requests.
    Example: 'Show me photos of Cristiano Ronaldo playing football' -> 'Cristiano Ronaldo playing football'
             'Show me a real Ronaldo photo' -> 'Cristiano Ronaldo'
             'What does the latest Tesla Cybertruck look like?' -> 'Tesla Cybertruck'
    """
    q = (user_query or "").strip()

    # Match 'what does X look like'
    m_look = re.search(r"what\s+does\s+(.+?)\s+look\s+like", q, flags=re.IGNORECASE)
    if m_look:
        q = m_look.group(1).strip()

    # Remove common conversational prefixes
    prefixes = [
        r"^(can\s+you\s+)?(show|give|display|find|get)\s+(me\s+)?",
        r"^(search\s+for|look\s+up)\s+",
        r"^(real\s+|actual\s+|latest\s+)?(photos?|pictures?|images?|pics?)\s+(of\s+|about\s+)?",
        r"^(tell\s+me\s+about\s+)",
    ]
    for pat in prefixes:
        q = re.sub(pat, "", q, flags=re.IGNORECASE).strip()

    # Remove conversational suffixes
    suffixes = [
        r"\b(and\s+show\s+me\s+(photos?|pictures?|images?|pics?)|and\s+(photos?|pictures?|images?|pics?))\b.*$",
        r"\s+(real\s+)?(photos?|pictures?|images?|pics?)$"
    ]
    for pat in suffixes:
        q = re.sub(pat, "", q, flags=re.IGNORECASE).strip()

    # Strip leading 'the', 'a', 'an', 'real', 'actual', 'latest'
    for _ in range(3):
        q = re.sub(r"^(the|a|an|real|actual|latest)\s+", "", q, flags=re.IGNORECASE).strip()

    # Clean trailing punctuation
    q = re.sub(r"[\?\!\.\,;]+$", "", q).strip()

    # If simple entity name like 'ronaldo', expand to 'Cristiano Ronaldo' for higher search accuracy
    if q.lower() == "ronaldo":
        return "Cristiano Ronaldo"

    return q or user_query


async def _search_serper_google_images(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Fetches real Google Images via Serper API if key is present."""
    results: List[Dict[str, str]] = []
    if not settings.SERPER_API_KEY:
        return results

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://google.serper.dev/images",
                headers={"X-API-KEY": settings.SERPER_API_KEY, "Content-Type": "application/json"},
                json={"q": query, "num": limit}
            )
            if res.status_code == 200:
                data = res.json()
                for item in data.get("images", [])[:limit]:
                    img_url = item.get("imageUrl")
                    if img_url and any(img_url.lower().endswith(ext) or ext in img_url.lower() for ext in VALID_EXTENSIONS):
                        results.append({
                            "title": item.get("title", query),
                            "image_url": img_url,
                            "thumbnail_url": item.get("thumbnailUrl") or img_url,
                            "source_url": item.get("link", "#"),
                            "source_name": item.get("domain") or urllib.parse.urlparse(item.get("link", "")).netloc or "web"
                        })
    except Exception as err:
        logger.warning(f"[ImageSearchTool] Serper Images search failed: {err}")

    return results


async def _search_tavily_images(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Fetches real web images via Tavily API if key is present."""
    results: List[Dict[str, str]] = []
    tavily_key = settings.TAVILY_API_KEY or settings.WEB_SEARCH_API_KEY
    if not (tavily_key and (settings.WEB_SEARCH_PROVIDER == "tavily" or tavily_key.startswith("tvly"))):
        return results

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": tavily_key,
                    "query": query,
                    "search_depth": "basic",
                    "include_images": True,
                    "max_results": limit
                }
            )
            if res.status_code == 200:
                data = res.json()
                images = data.get("images", [])
                for img in images[:limit]:
                    if isinstance(img, str) and img.startswith("http"):
                        domain = urllib.parse.urlparse(img).netloc or "web"
                        results.append({
                            "title": query,
                            "image_url": img,
                            "thumbnail_url": img,
                            "source_url": img,
                            "source_name": domain
                        })
                    elif isinstance(img, dict) and img.get("url"):
                        results.append({
                            "title": img.get("description", query),
                            "image_url": img["url"],
                            "thumbnail_url": img.get("url"),
                            "source_url": img.get("url"),
                            "source_name": urllib.parse.urlparse(img["url"]).netloc or "web"
                        })
    except Exception as err:
        logger.warning(f"[ImageSearchTool] Tavily Images search failed: {err}")

    return results


async def _search_wikimedia_commons_images(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """
    Primary Zero-Key Verified Real Image Engine.
    Uses official Wikimedia Commons API to retrieve authentic, copyright-safe, high-res photos.
    """
    results: List[Dict[str, str]] = []
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,  # Namespace 6 = File/Media
        "gsrlimit": limit * 2,  # Fetch extra to filter non-bitmap media
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": 600,  # High-quality thumbnail size
        "format": "json"
    }
    headers = {
        "User-Agent": "PML-AI-Assistant/10.0 (https://pml.ai; contact: dev@pml.universe)"
    }

    try:
        async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
            res = await client.get("https://commons.wikimedia.org/w/api.php", params=params)
            if res.status_code == 200:
                data = res.json()
                pages = data.get("query", {}).get("pages", {})
                for _, page in pages.items():
                    title = page.get("title", "").replace("File:", "").strip()
                    # Clean title extension
                    display_title = re.sub(r"\.(jpg|jpeg|png|webp|gif|svg)$", "", title, flags=re.IGNORECASE).strip()
                    
                    imageinfo = page.get("imageinfo", [{}])[0]
                    mime = imageinfo.get("mime", "")
                    full_url = imageinfo.get("url", "")
                    thumb_url = imageinfo.get("thumburl", "") or full_url
                    desc_url = imageinfo.get("descriptionurl", "") or "https://commons.wikimedia.org"

                    # Only accept real photograph/bitmap formats (exclude audio .oga, .ogg, and vector .svg)
                    if not mime.startswith("image/") or "svg" in mime:
                        continue
                    clean_url = full_url.split("?")[0].lower()
                    if not clean_url.endswith(VALID_EXTENSIONS):
                        continue

                    # Retrieve artist/license attribution if available
                    ext_meta = imageinfo.get("extmetadata", {}) or {}
                    artist = ext_meta.get("Artist", {}).get("value", "")
                    if artist:
                        # Clean HTML tags in attribution
                        clean_artist = re.sub(r"<[^>]+>", "", artist).strip()
                        if clean_artist and len(clean_artist) < 40:
                            source_label = f"Wikimedia Commons ({clean_artist})"
                        else:
                            source_label = "Wikimedia Commons"
                    else:
                        source_label = "Wikimedia Commons"

                    results.append({
                        "title": display_title[:80],
                        "image_url": full_url,
                        "thumbnail_url": thumb_url,
                        "source_url": desc_url,
                        "source_name": source_label
                    })

                    if len(results) >= limit:
                        break

    except Exception as err:
        logger.warning(f"[ImageSearchTool] Wikimedia Commons search failed: {err}")

    return results


class ImageSearchTool(BaseTool):
    """
    Backend Real Image & Photo Search Tool for PML AI.
    Retrieves authentic, real-world photographs from verified web sources.
    Strictly isolated from synthetic AI image generation.
    """
    name = "image_search"
    description = (
        "Searches the live web for authentic, real-world photographs and pictures of real people, "
        "landmarks, historical events, nature, vehicles, or physical objects. "
        "Use this tool when the user asks for real photos, pictures, or images."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The person, entity, place, or object to search photos for (e.g. 'Cristiano Ronaldo', 'Taj Mahal', 'Tesla Cybertruck')."
            },
            "num_results": {
                "type": "integer",
                "description": "Number of real photo results to retrieve (default 4, max 8).",
                "default": 4
            }
        },
        "required": ["query"]
    }

    async def execute(self, query: str, num_results: int = 4, **kwargs) -> ToolResult:
        raw_query = query.strip()
        search_target = clean_image_search_query(raw_query)

        logger.info(
            f"\n[PML Router Debug]\n"
            f"Detected Intent: IMAGE_SEARCH\n"
            f"Selected Tool: image_search (WEB IMAGE SEARCH)\n"
            f"NOT: generate_image (AI GENERATION)\n"
            f"Target Query: '{search_target}'"
        )

        limit = min(max(num_results, 2), 8)
        images: List[Dict[str, str]] = []

        # 1. Try Serper Google Images if API key is configured
        if settings.SERPER_API_KEY:
            images = await _search_serper_google_images(search_target, limit=limit)

        # 2. Try Tavily Image Search if configured
        if not images:
            images = await _search_tavily_images(search_target, limit=limit)

        # 3. Primary Zero-Key Verified Real Photo Engine (Wikimedia Commons)
        if not images:
            images = await _search_wikimedia_commons_images(search_target, limit=limit)

        # 4. If query with extra modifiers returned 0 results, retry with main base entity
        if not images and " " in search_target:
            base_words = search_target.split()
            if len(base_words) > 2:
                shorter_query = " ".join(base_words[:2])
                images = await _search_wikimedia_commons_images(shorter_query, limit=limit)

        if not images:
            logger.warning(f"[ImageSearchTool] 0 real image results found for '{search_target}'.")
            # CRITICAL RULE: NEVER fall back to synthetic AI image generation!
            return ToolResult(
                success=False,
                data={
                    "type": "image_search",
                    "query": search_target,
                    "images": []
                },
                error=f"I couldn't retrieve real image results right now for '{search_target}'.",
                formatted_output=(
                    f"IMAGE SEARCH NOTICE: No verified real photos were found for '{search_target}'. "
                    "CRITICAL DIRECTIVE: Tell the user: 'I couldn't retrieve real image results right now for this query.' "
                    "Do NOT invent image links and do NOT call AI image generation as a replacement for real photos."
                )
            )

        logger.info(f"[ImageSearchTool] Successfully retrieved {len(images)} real photos for '{search_target}'.")

        # Format structured output for LLM Context grounding
        formatted_lines = [
            f"### REAL WEB PHOTO RESULTS FOR: '{search_target}' ({len(images)} photos attached):",
            "CRITICAL UI NOTICE: These photos are automatically displayed in the interactive 'Real Web Photos' gallery below your message.",
            "Do NOT write markdown image tags (e.g. `![...](...)`) or raw image file URLs in your response text. Simply provide a short, natural answer introducing them."
        ]
        for idx, img in enumerate(images, 1):
            formatted_lines.append(
                f"[{idx}] {img['title']} | Source: {img['source_name']}"
            )

        formatted_output = "\n".join(formatted_lines)

        return ToolResult(
            success=True,
            data={
                "type": "image_search",
                "query": search_target,
                "images": images
            },
            formatted_output=formatted_output
        )
