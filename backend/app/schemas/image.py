from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Prompt describing the image to generate")
    aspect_ratio: Optional[str] = Field("1:1", description="Aspect ratio: 1:1, 16:9, 9:16, 4:3")
    style: Optional[str] = Field("auto", description="Style: auto, realistic, illustration, 3d, anime, cinematic, minimal")
    quality: Optional[str] = Field("standard", description="Quality: standard or high")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID")
    enhance_prompt: Optional[bool] = Field(False, description="Whether to enhance the prompt with AI")

class GeneratedImageData(BaseModel):
    id: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    prompt: str
    revised_prompt: Optional[str] = None
    image_url: str
    aspect_ratio: Optional[str] = "1:1"
    style: Optional[str] = "auto"
    quality: Optional[str] = "standard"
    created_at: Optional[str] = None

class ImageGenerationResponse(BaseModel):
    type: str = "image_generation"
    status: str = "success"
    image: GeneratedImageData
    message: Optional[str] = "Image generated successfully."

class EnhancePromptRequest(BaseModel):
    prompt: str
    style: Optional[str] = "auto"

class EnhancePromptResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    style: Optional[str] = "auto"
