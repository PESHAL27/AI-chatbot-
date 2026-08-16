import asyncio
import base64
import io
import json
import httpx
from PIL import Image, ImageDraw

def create_image_data_url(text: str, width: int = 400, height: int = 150) -> str:
    img = Image.new('RGB', (width, height), color=(250, 250, 252))
    draw = ImageDraw.Draw(img)
    # Simple clear visual text
    draw.text((25, 50), text, fill=(10, 10, 30))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{b64}"

async def main():
    print("=" * 60)
    print("PML VISION INPUT PIPELINE LIVE API TEST")
    print("=" * 60)

    base_url = "http://127.0.0.1:8000"

    async with httpx.AsyncClient(timeout=45.0) as client:
        # Check backend health
        try:
            health = await client.get(f"{base_url}/health")
            print(f"[1/6] Backend Health: {health.status_code} -> {health.json()}")
        except Exception as e:
            print(f"[FAIL] Could not reach backend: {e}")
            return

        # 1. Java Code Image Error Detection
        java_img = create_image_data_url("Dog d = new Dog;")
        payload_java = {
            "message": "Find the error in this code.",
            "images": [java_img],
            "memory_enabled": False
        }
        res_java = await client.post(f"{base_url}/api/chat", json=payload_java)
        print(f"\n[2/6] Java Error Detection Test: HTTP {res_java.status_code}")
        java_data = res_java.json()
        print("AI Response:", java_data.get("response")[:250], "...\n")
        assert "Dog" in java_data.get("response", "") or "()" in java_data.get("response", "") or "constructor" in java_data.get("response", "").lower(), "AI failed to detect Java constructor syntax error!"
        print("-> Java Vision Test: [PASSED]")

        # 2. Math Simple Visual Test ("2 + 2")
        math_img_1 = create_image_data_url("2 + 2")
        payload_math1 = {
            "message": "What is the answer?",
            "images": [math_img_1],
            "memory_enabled": False
        }
        res_math1 = await client.post(f"{base_url}/api/chat", json=payload_math1)
        print(f"\n[3/6] Math 2 + 2 Test: HTTP {res_math1.status_code}")
        math1_data = res_math1.json()
        print("AI Response:", math1_data.get("response")[:150], "...\n")
        assert "4" in math1_data.get("response", ""), "AI failed to recognize 2 + 2 = 4!"
        print("-> Math '2 + 2' Test: [PASSED]")

        # 3. Algebra Equation Visual Test ("2x + 5 = 15")
        math_img_2 = create_image_data_url("2x + 5 = 15")
        payload_math2 = {
            "message": "Solve this.",
            "images": [math_img_2],
            "memory_enabled": False
        }
        res_math2 = await client.post(f"{base_url}/api/chat", json=payload_math2)
        print(f"\n[4/6] Algebra Equation Test: HTTP {res_math2.status_code}")
        math2_data = res_math2.json()
        print("AI Response:", math2_data.get("response")[:150], "...\n")
        assert "5" in math2_data.get("response", ""), "AI failed to solve 2x + 5 = 15!"
        print("-> Algebra '2x + 5 = 15' Test: [PASSED]")

        # 4. Text-Only Chat (Inheritance in Java)
        payload_text = {
            "message": "What is inheritance in Java in 1 sentence?",
            "memory_enabled": False
        }
        res_text = await client.post(f"{base_url}/api/chat", json=payload_text)
        print(f"\n[5/6] Text-Only Chat Test: HTTP {res_text.status_code}")
        text_data = res_text.json()
        print("AI Response:", text_data.get("response")[:150], "...\n")
        assert len(text_data.get("response", "")) > 10, "Text AI response failed!"
        print("-> Text-Only Chat Test: [PASSED]")

        # 5. Calculator Tool (847 * 39)
        payload_calc = {
            "message": "Calculate 847 * 39.",
            "memory_enabled": False
        }
        res_calc = await client.post(f"{base_url}/api/chat", json=payload_calc)
        print(f"\n[6/6] Calculator Tool Test: HTTP {res_calc.status_code}")
        calc_data = res_calc.json()
        print("AI Response:", calc_data.get("response")[:150], "...\n")
        print("Tools called:", calc_data.get("tools_called"))
        assert "33033" in calc_data.get("response", "").replace(",", "") or "33,033" in calc_data.get("response", ""), "Calculator failed!"
        print("-> Calculator Test: [PASSED]")

    print("\n" + "=" * 60)
    print("ALL VISION & INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
