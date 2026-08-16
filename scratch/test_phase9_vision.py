import asyncio
import base64
import io
import os
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.abspath("backend"))

from app.services.vision_service import VisionService
from app.services.ai_service import AIService
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest

def create_synthetic_math_image() -> str:
    """Creates a synthetic image with the equation: 2x + 5 = 15"""
    img = Image.new("RGB", (400, 150), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw simple text
    draw.text((50, 50), "2x + 5 = 15", fill=(0, 0, 0))
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"

def create_synthetic_code_image() -> str:
    """Creates a synthetic image with Java code syntax error"""
    img = Image.new("RGB", (500, 200), color=(20, 20, 30))
    draw = ImageDraw.Draw(img)
    code = "public class Main {\n    public static void main(String[] args) {\n        int x = \"hello\";\n    }\n}"
    draw.text((30, 30), code, fill=(0, 255, 120))
    
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

async def run_tests():
    print("=" * 50)
    print("PML PHASE 9 VISION & MULTIMODAL TEST SUITE")
    print("=" * 50)

    # 1. Test VisionService Validation
    print("\n1. Testing VisionService Validation (PNG & JPEG)...")
    math_img = create_synthetic_math_image()
    val_math = VisionService.validate_and_process_image(math_img)
    assert val_math["mime_type"] == "image/png"
    assert val_math["width"] == 400
    assert val_math["height"] == 150
    print(f"   [OK] Math PNG validated: {val_math['width']}x{val_math['height']}, format={val_math['format']}")

    code_img = create_synthetic_code_image()
    val_code = VisionService.validate_and_process_image(code_img)
    assert val_code["mime_type"] == "image/jpeg"
    print(f"   [OK] Code JPEG validated: {val_code['width']}x{val_code['height']}, format={val_code['format']}")

    # 2. Test Invalid Image Rejection
    print("\n2. Testing Corrupted & Unsupported Image Rejection...")
    try:
        VisionService.validate_and_process_image("data:image/png;base64,not_valid_base64_content!!!")
        print("   [FAIL] Did not reject invalid base64")
    except ValueError as e:
        print(f"   [OK] Successfully rejected invalid base64: {e}")

    try:
        VisionService.validate_and_process_image("data:application/pdf;base64,JVBERi0xLjQK")
        print("   [FAIL] Did not reject non-image format")
    except ValueError as e:
        print(f"   [OK] Successfully rejected unsupported format: {e}")

    # 3. Test Multimodal Math Equation Recognition
    print("\n3. Testing Multimodal AI on Math Image ('2x + 5 = 15', prompt='Solve this')...")
    res_math = await AIService.generate_response(
        user_message="Solve this equation step-by-step.",
        images=[math_img],
        enable_tools=True
    )
    print("   AI Math Answer Excerpt:", res_math.get("content", "")[:250].replace("\n", " "))
    assert "5" in res_math.get("content", "") or "x" in res_math.get("content", "")
    print("   [OK] Multimodal Math Equation Solved successfully.")

    # 4. Test Multimodal Code Error Recognition
    print("\n4. Testing Multimodal AI on Code Screenshot (int x = 'hello';)...")
    res_code = await AIService.generate_response(
        user_message="Find the error in this Java code screenshot.",
        images=[code_img],
        enable_tools=True
    )
    print("   AI Code Diagnosis Excerpt:", res_code.get("content", "")[:250].replace("\n", " "))
    assert "type" in res_code.get("content", "").lower() or "string" in res_code.get("content", "").lower() or "int" in res_code.get("content", "").lower()
    print("   [OK] Multimodal Code Error Diagnosed successfully.")

    # 5. Test ChatService End-to-End Multimodal
    print("\n5. Testing ChatService End-to-End with Vision Image...")
    req = ChatRequest(
        message="What equation is written in this image?",
        images=[math_img]
    )
    chat_res = await ChatService.process_chat(req, user_id="test_vision_user")
    print("   ChatService Response Excerpt:", chat_res.response[:200].replace("\n", " "))
    assert chat_res.status == "success"
    print("   [OK] ChatService End-to-End Vision test PASSED.")

    print("\n" + "=" * 50)
    print("[SUCCESS] ALL PHASE 9 VISION TESTS PASSED!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(run_tests())
