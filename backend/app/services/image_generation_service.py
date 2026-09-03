import os
import uuid
import urllib.parse
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import httpx
from openai import AsyncOpenAI
from app.config import settings
from app.schemas.image import GeneratedImageData

logger = logging.getLogger("pml.image_service")

# Aspect ratio dimensions mapping
ASPECT_RATIO_DIMENSIONS = {
    "1:1": (1024, 1024),
    "16:9": (1280, 720),
    "9:16": (720, 1280),
    "4:3": (1024, 768),
    "3:4": (768, 1024),
}

# Style modifiers
STYLE_MODIFIERS = {
    "realistic": "photorealistic, 8k resolution, highly detailed, dramatic lighting, sharp focus, professional photography",
    "illustration": "digital art illustration, vibrant colors, expressive details, artistic, masterpiece",
    "3d": "3D render, octane render, Unreal Engine 5, volumetric lighting, smooth shaders, high-poly model",
    "anime": "anime style, makoto shinkai aesthetic, vivid colors, crisp lines, dynamic composition",
    "cinematic": "cinematic still, anamorphic lens, 35mm film grain, moody atmospheric lighting, filmic color grading",
    "minimal": "minimalist design, clean lines, elegant composition, vector art aesthetic, simple geometric harmony",
    "auto": ""
}

class ImageGenerationService:
    """
    Modular Image Generation Service for PML AI.
    Provides server-side image generation with provider abstraction,
    prompt enhancement, aspect ratio mapping, and error resilience.
    """

    @classmethod
    async def enhance_prompt(cls, prompt: str, style: Optional[str] = None) -> str:
        """
        Enhances a basic user prompt into a rich, detailed visual description using AI.
        """
        clean_prompt = prompt.strip()
        if not clean_prompt:
            return clean_prompt

        style_instruction = f" and a {style} visual style" if style and style != "auto" else ""
        system_instruction = (
            "You are an expert AI prompt engineer for state-of-the-art image generators. "
            "Convert the user's basic request into a rich, vivid, single-paragraph image generation prompt describing subject, lighting, mood, materials, and composition. "
            f"Adhere to an aesthetically stunning look{style_instruction}. "
            "Output ONLY the final enhanced image prompt. Do NOT include explanations, quotes, or markdown headers."
        )

        try:
            if settings.AI_API_KEY:
                headers = {
                    "HTTP-Referer": settings.FRONTEND_URL or "https://pml.universe",
                    "X-Title": "PML Space AI Assistant"
                }
                client = AsyncOpenAI(
                    api_key=settings.AI_API_KEY,
                    base_url=settings.AI_BASE_URL if settings.AI_BASE_URL else None,
                    default_headers=headers
                )
                res = await client.chat.completions.create(
                    model=settings.AI_MODEL,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": f"Create an enhanced image prompt for: {clean_prompt}"}
                    ],
                    temperature=0.7,
                    max_tokens=250
                )
                enhanced = res.choices[0].message.content.strip()
                if enhanced and len(enhanced) > 10:
                    return enhanced
        except Exception as e:
            logger.warning(f"[PML Image Prompt Enhance] Could not enhance prompt with LLM: {e}")

        # Fallback enhancement using style modifiers
        modifier = STYLE_MODIFIERS.get((style or "").lower(), "")
        if modifier:
            return f"{clean_prompt}, {modifier}"
        return clean_prompt

    @classmethod
    async def generate_image(
        cls,
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str = "auto",
        quality: str = "standard",
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        enhance_prompt_flag: bool = False
    ) -> GeneratedImageData:
        """
        Generates an image from prompt and returns structured GeneratedImageData.
        """
        clean_prompt = prompt.strip()
        if not clean_prompt:
            raise ValueError("Image generation prompt cannot be empty.")

        # Determine revised prompt
        revised_prompt = clean_prompt
        if enhance_prompt_flag:
            revised_prompt = await cls.enhance_prompt(clean_prompt, style)
        elif style and style != "auto" and style in STYLE_MODIFIERS:
            modifier = STYLE_MODIFIERS[style]
            if modifier and modifier.lower() not in clean_prompt.lower():
                revised_prompt = f"{clean_prompt}, {modifier}"

        provider = os.getenv("IMAGE_GENERATION_PROVIDER", "pollinations").lower()
        image_id = f"img_{uuid.uuid4().hex[:16]}"
        width, height = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, (1024, 1024))

        logger.info(f"[PML Image Gen] Generating image using provider='{provider}', aspect_ratio='{aspect_ratio}' ({width}x{height}), prompt='{clean_prompt[:60]}'")

        image_url = ""

        # 1. OpenAI DALL-E Provider
        if provider == "openai":
            image_url = await cls._generate_openai(
                prompt=revised_prompt,
                aspect_ratio=aspect_ratio,
                quality=quality
            )

        # 2. OpenRouter Image Provider
        elif provider == "openrouter":
            image_url = await cls._generate_openrouter(
                prompt=revised_prompt,
                width=width,
                height=height
            )

        # 3. Default High-Quality Provider: Pollinations Flux Engine
        if not image_url:
            image_url = cls._generate_pollinations(
                prompt=revised_prompt,
                width=width,
                height=height,
                style=style
            )

        # Create structured image record
        generated_data = GeneratedImageData(
            id=image_id,
            user_id=user_id,
            conversation_id=conversation_id,
            prompt=clean_prompt,
            revised_prompt=revised_prompt,
            image_url=image_url,
            aspect_ratio=aspect_ratio,
            style=style,
            quality=quality,
            created_at=datetime.now(timezone.utc).isoformat()
        )

        return generated_data

    @classmethod
    def _generate_pollinations(
        cls,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        style: str = "auto"
    ) -> str:
        """
        Generates a direct, highly stable image URL via Pollinations AI.
        """
        encoded_prompt = urllib.parse.quote(prompt)
        seed = uuid.uuid4().int % 1000000
        # Build optimized Pollinations Flux parameters
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true&enhance=true&model=flux"
        return url

    @classmethod
    async def _generate_openai(
        cls,
        prompt: str,
        aspect_ratio: str = "1:1",
        quality: str = "standard"
    ) -> str:
        """
        Generates image using OpenAI DALL-E 3 API.
        """
        api_key = os.getenv("IMAGE_GENERATION_API_KEY") or settings.AI_API_KEY
        if not api_key:
            logger.warning("[PML Image Gen] OpenAI API key not found, falling back to Pollinations.")
            return ""

        size = "1024x1024"
        if aspect_ratio == "16:9":
            size = "1792x1024"
        elif aspect_ratio == "9:16":
            size = "1024x1792"

        dalle_quality = "hd" if quality == "high" else "standard"

        try:
            client = AsyncOpenAI(api_key=api_key)
            response = await client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality=dalle_quality,
                n=1,
            )
            if response.data and len(response.data) > 0:
                return response.data[0].url
        except Exception as err:
            logger.error(f"[PML Image Gen] OpenAI DALL-E generation failed: {err}")

        return ""

    @classmethod
    async def _generate_openrouter(
        cls,
        prompt: str,
        width: int = 1024,
        height: int = 1024
    ) -> str:
        """
        Generates image using OpenRouter image model.
        """
        api_key = os.getenv("IMAGE_GENERATION_API_KEY") or settings.AI_API_KEY
        if not api_key:
            return ""

        try:
            async with httpx.AsyncClient(timeout=45.0) as http_client:
                res = await http_client.post(
                    "https://openrouter.ai/api/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "HTTP-Referer": settings.FRONTEND_URL or "https://pml.universe",
                        "X-Title": "PML Space AI Assistant"
                    },
                    json={
                        "prompt": prompt,
                        "n": 1,
                        "size": f"{width}x{height}"
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("data") and len(data["data"]) > 0:
                        return data["data"][0].get("url", "")
        except Exception as err:
            logger.error(f"[PML Image Gen] OpenRouter image gen failed: {err}")

        return ""
