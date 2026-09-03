import logging
import urllib.parse
import httpx
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Response
from app.schemas.image import (
    ImageGenerationRequest,
    ImageGenerationResponse,
    GeneratedImageData,
    EnhancePromptRequest,
    EnhancePromptResponse
)
from app.services.image_generation_service import ImageGenerationService
from app.services.database_service import DatabaseService
from app.auth.dependencies import get_current_user

logger = logging.getLogger("pml.routes.images")
router = APIRouter(prefix="/api/images", tags=["Images"])

@router.get("/proxy", summary="Proxy External Web / Wikimedia Images")
async def proxy_image_endpoint(url: str):
    """
    Safely proxies external images (e.g. Wikimedia Commons, Wikipedia, news)
    using compliant PML User-Agent headers to prevent 403 Forbidden hotlink blocks.
    Resolves File: description pages into direct visual image stream.
    """
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid image URL")
    
    target_url = url.strip()
    headers = {
        "User-Agent": "PML-AI-Assistant/10.0 (https://pml.ai; contact: dev@pml.universe)",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
    
    # Handle Wikimedia Commons / Wikipedia file description pages gracefully
    if "/wiki/File:" in target_url or "/wiki/file:" in target_url:
        try:
            raw_file_part = target_url.split("/wiki/")[1]
            file_part = urllib.parse.unquote(raw_file_part).split("?")[0].split("#")[0].strip()
            if not file_part.lower().startswith("file:"):
                file_part = f"File:{file_part}"
            
            # Determine API endpoint (commons.wikimedia.org or local wikipedia domain)
            api_endpoint = "https://commons.wikimedia.org/w/api.php"
            if "wikipedia.org" in target_url and "commons.wikimedia.org" not in target_url:
                domain = urllib.parse.urlparse(target_url).netloc or "en.wikipedia.org"
                api_endpoint = f"https://{domain}/w/api.php"
            
            api_params = {
                "action": "query",
                "titles": file_part,
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": 1200,
                "format": "json"
            }
            async with httpx.AsyncClient(headers=headers, timeout=8.0) as client:
                api_res = await client.get(api_endpoint, params=api_params)
                if api_res.status_code == 200:
                    data = api_res.json()
                    pages = data.get("query", {}).get("pages", {})
                    for _, page in pages.items():
                        info_list = page.get("imageinfo", [])
                        if info_list:
                            info = info_list[0]
                            resolved = info.get("thumburl") or info.get("url")
                            if resolved:
                                target_url = resolved
                                break
                    # If not found on local wikipedia domain, retry against Commons
                    if ("commons.wikimedia.org" not in api_endpoint) and ("/wiki/File:" in target_url or "/wiki/file:" in target_url):
                        api_res_commons = await client.get("https://commons.wikimedia.org/w/api.php", params=api_params)
                        if api_res_commons.status_code == 200:
                            commons_data = api_res_commons.json()
                            for _, page in commons_data.get("query", {}).get("pages", {}).items():
                                info_list = page.get("imageinfo", [])
                                if info_list:
                                    info = info_list[0]
                                    resolved = info.get("thumburl") or info.get("url")
                                    if resolved:
                                        target_url = resolved
                                        break
        except Exception as resolve_err:
            logger.warning(f"[ImageProxy] Failed resolving file page for {target_url}: {resolve_err}")

    try:
        async with httpx.AsyncClient(headers=headers, timeout=14.0, follow_redirects=True) as client:
            resp = await client.get(target_url)
            if resp.status_code != 200:
                logger.warning(f"[ImageProxy] Upstream returned {resp.status_code} for {target_url}")
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch upstream image")
            
            content_type = resp.headers.get("content-type", "image/jpeg")
            # If upstream returned an HTML page instead of an image, don't serve as image
            if "text/html" in content_type.lower():
                logger.warning(f"[ImageProxy] Upstream URL returned HTML content instead of image: {target_url}")
                raise HTTPException(status_code=404, detail="Upstream resource is not an image")

            return Response(
                content=resp.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400, immutable",
                    "Access-Control-Allow-Origin": "*"
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"[ImageProxy] Error proxying {target_url}: {e}")
        raise HTTPException(status_code=502, detail="Error retrieving image")

@router.post("/generate", response_model=ImageGenerationResponse, summary="Generate AI Image")
async def generate_image_endpoint(
    request: ImageGenerationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generates a new AI image from a prompt with aspect ratio and style options.
    Saves metadata to the user's persistent image history.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    try:
        img_data = await ImageGenerationService.generate_image(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio or "1:1",
            style=request.style or "auto",
            quality=request.quality or "standard",
            user_id=user_id,
            conversation_id=request.conversation_id,
            enhance_prompt_flag=request.enhance_prompt or False
        )

        # Save to database history
        saved_record = await DatabaseService.save_generated_image(
            image_data=img_data.model_dump(),
            user_id=user_id,
            user_token=token
        )

        return ImageGenerationResponse(
            type="image_generation",
            status="success",
            image=img_data,
            message="Image generated successfully."
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as err:
        logger.error(f"[Images Route] Generation failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image generation is temporarily unavailable. Please try again."
        )

@router.get("/history", response_model=List[GeneratedImageData], summary="Get User Image History")
async def get_image_history_endpoint(
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves the authenticated user's generated image gallery history.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    try:
        records = await DatabaseService.get_user_generated_images(
            user_id=user_id,
            limit=limit,
            user_token=token
        )
        return [GeneratedImageData(**r) for r in records]
    except Exception as err:
        logger.error(f"[Images Route] Get history failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve image history."
        )

@router.delete("/{image_id}", summary="Delete Generated Image")
async def delete_image_endpoint(
    image_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes an image from the user's generated history.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    try:
        success = await DatabaseService.delete_generated_image(
            image_id=image_id,
            user_id=user_id,
            user_token=token
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image record not found."
            )
        return {"status": "success", "message": "Image deleted successfully."}
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"[Images Route] Delete image failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete image."
        )

@router.post("/enhance-prompt", response_model=EnhancePromptResponse, summary="Enhance Image Prompt")
async def enhance_prompt_endpoint(
    request: EnhancePromptRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uses AI to enhance and expand a basic image prompt with rich visual details.
    """
    try:
        enhanced = await ImageGenerationService.enhance_prompt(
            prompt=request.prompt,
            style=request.style
        )
        return EnhancePromptResponse(
            original_prompt=request.prompt,
            enhanced_prompt=enhanced,
            style=request.style
        )
    except Exception as err:
        logger.error(f"[Images Route] Enhance prompt failed: {err}")
        return EnhancePromptResponse(
            original_prompt=request.prompt,
            enhanced_prompt=request.prompt,
            style=request.style
        )
