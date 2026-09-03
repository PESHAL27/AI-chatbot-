import logging
from typing import Dict, Any, Optional
from app.tools.base import BaseTool, ToolResult
from app.services.image_generation_service import ImageGenerationService

logger = logging.getLogger("pml.tools.image_generation")

class ImageGenerationTool(BaseTool):
    """
    PML AI Image Generation Tool.
    Generates high-resolution images, illustrations, 3D renders, and logos from descriptive prompts.
    """
    name: str = "generate_image"
    description: str = (
        "Creates a new visual image, photo, digital artwork, 3D illustration, or logo based on a descriptive prompt. "
        "Use whenever the user asks to generate, create, make, draw, or design an image or picture."
    )
    parameters_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "The detailed descriptive prompt for the image to create."
            },
            "aspect_ratio": {
                "type": "string",
                "enum": ["1:1", "16:9", "9:16", "4:3"],
                "description": "Optional aspect ratio (default: 1:1)."
            },
            "style": {
                "type": "string",
                "enum": ["auto", "realistic", "illustration", "3d", "anime", "cinematic", "minimal"],
                "description": "Optional visual style aesthetic."
            }
        },
        "required": ["prompt"]
    }
    is_safe: bool = True
    requires_auth: bool = False

    async def execute(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str = "auto",
        **kwargs
    ) -> ToolResult:
        """
        Executes image generation request and formats markdown output.
        """
        if not prompt or not prompt.strip():
            return ToolResult(
                success=False,
                data=None,
                error="Prompt is empty.",
                formatted_output="IMAGE GENERATION ERROR: A descriptive prompt is required to generate an image."
            )

        try:
            logger.info(f"[ImageGenerationTool] Request: prompt='{prompt}', aspect_ratio='{aspect_ratio}', style='{style}'")
            img_data = await ImageGenerationService.generate_image(
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                style=style
            )

            formatted_output = (
                f"Generated Image successfully for prompt: \"{img_data.prompt}\"\n\n"
                f"![{img_data.prompt}]({img_data.image_url})\n\n"
                f"*Aspect Ratio: {img_data.aspect_ratio} | Style: {img_data.style}*"
            )

            return ToolResult(
                success=True,
                data=img_data.model_dump(),
                formatted_output=formatted_output
            )
        except Exception as e:
            logger.error(f"[ImageGenerationTool] Execution failed: {e}")
            return ToolResult(
                success=False,
                data=None,
                error=str(e),
                formatted_output=f"IMAGE GENERATION FAILED: {str(e)}"
            )
