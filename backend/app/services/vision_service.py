import base64
import io
import re
import logging
from typing import Dict, Any, List, Optional
from PIL import Image

logger = logging.getLogger("pml.vision_service")

# Supported image MIME types and extensions
SUPPORTED_IMAGE_MIMES = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/x-png": "PNG",
    "image/pjpeg": "JPEG",
    "image/bmp": "PNG",  # Convert BMP to PNG for AI compatibility
    "image/gif": "PNG"   # Convert static GIF frame to PNG
}

# Max allowed image size: 12MB
MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024

class VisionService:
    """
    Vision Service for PML AI.
    Handles image validation, integrity verification, dimension checks,
    and preparation of clean data URLs for vision-capable models.
    """

    @classmethod
    def validate_and_process_image(cls, raw_image_input: str) -> Dict[str, Any]:
        """
        Validates raw image data (base64 data URI or raw base64 string),
        checks file integrity with Pillow, verifies MIME types and dimensions,
        and returns a normalized data URL with image metadata.
        """
        if not raw_image_input or not isinstance(raw_image_input, str):
            raise ValueError("Invalid image input: empty or non-string format.")

        clean_input = raw_image_input.strip()

        # Check for data URI pattern
        inferred_mime = "image/jpeg"
        base64_data = clean_input

        data_uri_match = re.match(r"^data:([^;]+);base64,(.+)$", clean_input, re.DOTALL)
        if data_uri_match:
            inferred_mime = data_uri_match.group(1).lower().strip()
            base64_data = data_uri_match.group(2).strip()

        # Decode base64
        try:
            image_bytes = base64.b64decode(base64_data, validate=False)
        except Exception as err:
            logger.warning(f"[VisionService] Base64 decode failed: {err}")
            raise ValueError("Corrupted image data: Base64 decoding failed.")

        if len(image_bytes) == 0:
            raise ValueError("Empty image data provided.")

        # Check size
        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            size_mb = len(image_bytes) / (1024 * 1024)
            raise ValueError(f"Image is too large ({size_mb:.1f}MB). Maximum allowed size is 12MB.")

        # Verify integrity and parse image with Pillow
        try:
            image_stream = io.BytesIO(image_bytes)
            with Image.open(image_stream) as img:
                img.verify()  # Verifies file integrity
            
            # Re-open for dimension inspection and conversion
            image_stream.seek(0)
            with Image.open(image_stream) as img:
                width, height = img.size
                pil_format = (img.format or "JPEG").upper()
                
                # Normalize target MIME type
                target_mime = "image/png" if pil_format in ("PNG", "BMP", "GIF") else ("image/webp" if pil_format == "WEBP" else "image/jpeg")

                # Handle color modes (e.g. RGBA -> RGB for JPEG, or P/LA)
                if target_mime == "image/jpeg" and img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")

                # Downscale safely if extreme (>2560px) while maintaining crisp code text
                max_dim = 2560
                if width > max_dim or height > max_dim:
                    logger.info(f"[VisionService] Downscaling ultra-high-res image ({width}x{height}) to max {max_dim}px")
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                    width, height = img.size

                out_buffer = io.BytesIO()
                save_fmt = "PNG" if target_mime == "image/png" else ("WEBP" if target_mime == "image/webp" else "JPEG")
                img.save(out_buffer, format=save_fmt, quality=95)
                final_bytes = out_buffer.getvalue()
                final_base64 = base64.b64encode(final_bytes).decode("utf-8")

        except Exception as err:
            logger.warning(f"[VisionService] Pillow image verification error: {err}")
            raise ValueError(f"Corrupted or unreadable image file: {str(err)}")

        normalized_data_url = f"data:{target_mime};base64,{final_base64}"

        return {
            "mime_type": target_mime,
            "format": save_fmt,
            "width": width,
            "height": height,
            "size_bytes": len(final_bytes),
            "data_url": normalized_data_url
        }

    @classmethod
    def validate_image_batch(cls, image_list: Optional[List[str]]) -> List[Dict[str, Any]]:
        """
        Validates a list of image inputs.
        """
        if not image_list:
            return []

        processed = []
        for idx, raw_img in enumerate(image_list):
            try:
                item = cls.validate_and_process_image(raw_img)
                processed.append(item)
            except Exception as err:
                logger.error(f"[VisionService] Failed validating image index {idx}: {err}")
                raise

        return processed
