import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
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
