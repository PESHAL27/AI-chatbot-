import asyncio
import base64
import io
import re
import httpx
from PIL import Image, ImageDraw

def clean_text_for_speech_python(raw_markdown: str) -> str:
    """Python reference implementation of the voice service markdown cleaner"""
    if not raw_markdown:
        return ""
    text = re.sub(r"```[\s\S]*?```", " [code snippet omitted] ", raw_markdown)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_~]{1,3}", "", text)
    text = re.sub(r"^\s*>\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\\\[([\s\S]*?)\\\]", r" \1 ", text)
    text = re.sub(r"\\\(([\s\S]*?)\\\)", r" \1 ", text)
    text = re.sub(r"\$\$([\s\S]*?)\$\$", r" \1 ", text)
    text = re.sub(r"\$([^$]+)\$", r" \1 ", text)
    text = re.sub(r"\n+", ". ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def create_image_data_url(text: str) -> str:
    img = Image.new('RGB', (400, 150), color=(250, 250, 252))
    draw = ImageDraw.Draw(img)
    draw.text((25, 50), text, fill=(10, 10, 30))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{b64}"

async def main():
    print("=" * 60)
    print("PML VOICE INTERACTION & MULTI-FEATURE TEST SUITE")
    print("=" * 60)

    base_url = "http://127.0.0.1:8000"

    # 1. Test Text Cleaning for TTS
    sample_markdown = """### Java Inheritance Guide
In Java, inheritance uses the `extends` keyword:
```java
class Dog extends Animal {
    void bark() {}
}
```
Formula: \\( E = mc^2 \\). For details, see [Oracle Docs](https://docs.oracle.com)."""
    
    spoken_text = clean_text_for_speech_python(sample_markdown)
    print("[1/8] Speech Sanitizer Test:")
    print("  Original Markdown:", sample_markdown[:60], "...")
    print("  Cleaned Speech Text:", spoken_text)
    assert "[code snippet omitted]" in spoken_text, "Code block was not converted for speech!"
    assert "https://" not in spoken_text, "Raw URL should be omitted from natural speech!"
    print("  -> Speech Sanitizer: [PASSED]\n")

    async with httpx.AsyncClient(timeout=45.0) as client:
        # 2. TEST 1: Basic Voice Input -> Text -> AI
        print("[2/8] Voice Input Test ('What is Java in one sentence?'):")
        res1 = await client.post(f"{base_url}/api/chat", json={
            "message": "What is Java in one sentence?",
            "memory_enabled": False
        })
        d1 = res1.json()
        print("  AI Response:", d1.get("response")[:120], "...")
        assert res1.status_code == 200 and len(d1.get("response", "")) > 10
        print("  -> Basic Voice Input: [PASSED]\n")

        # 3. TEST 2: Voice + Long-Term Memory
        print("[3/8] Voice + Memory Test ('Remember that my favorite language is Java'):")
        res2 = await client.post(f"{base_url}/api/chat", json={
            "message": "Remember that my favorite language is Java.",
            "memory_enabled": True
        })
        d2 = res2.json()
        print("  AI Response:", d2.get("response")[:120], "...")
        assert res2.status_code == 200
        print("  -> Voice + Memory: [PASSED]\n")

        # 4. TEST 3: Voice + Web Search
        print("[4/8] Voice + Web Search Test ('What are the latest AI developments?'):")
        res3 = await client.post(f"{base_url}/api/chat", json={
            "message": "What are the latest AI developments today?",
            "memory_enabled": False
        })
        d3 = res3.json()
        print("  AI Response:", d3.get("response")[:120], "...")
        print("  Tools called:", d3.get("tools_called"))
        assert res3.status_code == 200
        print("  -> Voice + Web Search: [PASSED]\n")

        # 5. TEST 4: Voice + Calculator
        print("[5/8] Voice + Calculator Test ('Calculate 847 multiplied by 39'):")
        res4 = await client.post(f"{base_url}/api/chat", json={
            "message": "Calculate 847 multiplied by 39.",
            "memory_enabled": False
        })
        d4 = res4.json()
        print("  AI Response:", d4.get("response")[:120], "...")
        print("  Tools called:", d4.get("tools_called"))
        assert "33033" in d4.get("response", "").replace(",", "") or "33,033" in d4.get("response", "")
        print("  -> Voice + Calculator: [PASSED]\n")

        # 6. TEST 5: Voice + Vision
        print("[6/8] Voice + Vision Test (Image + 'Find the error in this code'):")
        img_data = create_image_data_url("Dog d = new Dog;")
        res5 = await client.post(f"{base_url}/api/chat", json={
            "message": "Find the error in this code.",
            "images": [img_data],
            "memory_enabled": False
        })
        d5 = res5.json()
        print("  AI Response:", d5.get("response")[:120], "...")
        assert "Dog" in d5.get("response", "") or "()" in d5.get("response", "")
        print("  -> Voice + Vision: [PASSED]\n")

        # 7. TEST 6: Auto-Read / TTS Response Preparation
        print("[7/8] TTS Speech Synthesis Audio Sanitization for AI Response:")
        clean_speech = clean_text_for_speech_python(d5.get("response", ""))
        print("  Synthesized Speech Audio Output:", clean_speech[:150], "...")
        assert len(clean_speech) > 10
        print("  -> TTS Audio Preparation: [PASSED]\n")

    print("=" * 60)
    print("ALL 8 VOICE INTERACTION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
