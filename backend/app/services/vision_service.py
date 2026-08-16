import base64
import io
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image

logger = logging.getLogger("pml.vision_service")

# Supported image mime types and extensions
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "image/webp": "webp"
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
        Validates raw image data (either a base64 data URI or raw base64 string),
        checks file integrity with Pillow, verifies MIME types and size,
        and returns a normalized data URL with image metadata.
        """
        if not raw_image_input or not isinstance(raw_image_input, str):
            raise ValueError("Invalid image input: empty or non-string format.")

        clean_input = raw_image_input.strip()

        # Check for data URI pattern
        mime_type = "image/jpeg"
        base64_data = clean_input

        data_uri_match = re.match(r"^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$", clean_input, re.DOTALL)
        if data_uri_match:
            mime_type = data_uri_match.group(1).lower()
            base64_data = data_uri_match.group(2).strip()

        if mime_type not in SUPPORTED_IMAGE_TYPES:
            raise ValueError(
                f"Unsupported image format '{mime_type}'. "
                f"PML Vision supports JPG, JPEG, PNG, and WEBP formats."
            )

        # Decode base64
        try:
            image_bytes = base64.b64decode(base64_data, validate=True)
        except Exception as err:
            logger.warn(f"[VisionService] Base64 decode failed: {err}")
            raise ValueError("Corrupted image data: Base64 decoding failed.")

        # Check size
        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            size_mb = len(image_bytes) / (1024 * 1024)
            raise ValueError(f"Image is too large ({size_mb:.1f}MB). Maximum allowed size is 12MB.")

        # Verify integrity and parse image with Pillow
        try:
            image_stream = io.BytesIO(image_bytes)
            with Image.open(image_stream) as img:
                img.verify()  # Verifies file integrity
            
            # Re-open for dimension inspection
            image_stream.seek(0)
            with Image.open(image_stream) as img:
                width, height = img.size
                format_name = img.format.lower() if img.format else "unknown"

                # Check for extreme dimensions (> 3000px in either dimension)
                # Downscale safely if needed while keeping high clarity for code/diagrams
                max_dim = 2560
                if width > max_dim or height > max_dim:
                    logger.info(f"[VisionService] Resizing high-res image {width}x{height} to fit max {max_dim}px")
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                    out_buffer = io.BytesIO()
                    save_format = "PNG" if mime_type == "image/png" else ("WEBP" if mime_type == "image/webp" else "JPEG")
                    img.save(out_buffer, format=save_format, quality=92)
                    image_bytes = out_buffer.getvalue()
                    base64_data = base64.b64encode(image_bytes).decode("utf-8")
                    width, height = img.size

        except Exception as err:
            logger.warn(f"[VisionService] Pillow image verification error: {err}")
            raise ValueError(f"Corrupted or unreadable image file: {str(err)}")

        normalized_data_url = f"data:{mime_type};base64,{base64_data}"

        return {
            "mime_type": mime_type,
            "format": format_name,
            "width": width,
            "height": height,
            "size_bytes": len(image_bytes),
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
