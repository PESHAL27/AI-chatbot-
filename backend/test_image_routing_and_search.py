import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.router_service import RouterService
from app.tools.registry import tool_registry
from app.tools.image_search import ImageSearchTool, clean_image_search_query

async def main():
    print("====================================================")
    print("STARTING PML IMAGE ROUTING & SEARCH TEST SUITE")
    print("====================================================")

    # 1. Verify ImageSearchTool in ToolRegistry
    img_tool = tool_registry.get_tool("image_search")
    assert img_tool is not None, "image_search tool must be registered in ToolRegistry"
    assert isinstance(img_tool, ImageSearchTool), "Registered tool must be ImageSearchTool"
    print("Tool Registry: 'image_search' successfully registered.")

    # 2. Test 10 Required Routing Test Cases
    test_cases = [
        ("Show me a real Ronaldo photo", "image_search", ["image_search"]),
        ("Show me photos of Ronaldo", "image_search", ["image_search"]),
        ("Find pictures of Ronaldo playing football", "image_search", ["image_search"]),
        ("Show me the latest Ronaldo photos", "multi_tool", ["image_search", "web_search"]),
        ("Ronaldo image", "image_search", ["image_search"]),
        ("Create an image of Ronaldo as a superhero", "image_generation", ["generate_image"]),
        ("Generate a futuristic football player", "image_generation", ["generate_image"]),
        ("Create a cartoon version of Ronaldo", "image_generation", ["generate_image"]),
        ("Analyze this Ronaldo photo", "vision", ["vision"]),
        ("What did Ronaldo do in his latest match?", "web_search", ["web_search"]),
    ]

    print("\n--- Testing 10 Required Intent & Tool Routing Cases ---")
    all_router_passed = True
    for idx, (prompt, expected_intent, expected_tools) in enumerate(test_cases, 1):
        plan = RouterService.plan(prompt)
        intent_match = (plan.intent == expected_intent)
        tools_match = set(expected_tools).issubset(set(plan.required_tools))
        
        # Verify strict anti-confusion: real photo request must NEVER have generate_image
        if expected_intent in ("image_search", "web_search"):
            assert "generate_image" not in plan.required_tools, f"CRITICAL: generate_image found in real photo prompt '{prompt}'"

        passed = intent_match and tools_match
        if not passed:
            all_router_passed = False
        print(f"[{idx}] '{prompt}'")
        print(f"    Expected: intent={expected_intent}, tools={expected_tools}")
        print(f"    Actual:   intent={plan.intent}, tools={plan.required_tools}")
        print(f"    Result:   {'PASS' if passed else 'FAIL'}")

    assert all_router_passed, "All router test cases must pass!"

    # 3. Test clean_image_search_query
    print("\n--- Testing Query Cleaning ---")
    cleaned1 = clean_image_search_query("Show me a real Ronaldo photo")
    print(f"Cleaned 'Show me a real Ronaldo photo' -> '{cleaned1}'")
    assert "ronaldo" in cleaned1.lower()

    cleaned2 = clean_image_search_query("What does the latest Tesla Cybertruck look like?")
    print(f"Cleaned 'What does the latest Tesla Cybertruck look like?' -> '{cleaned2}'")
    assert "tesla cybertruck" in cleaned2.lower()

    # 4. Test ImageSearchTool Execution (Real Photo Retrieval)
    print("\n--- Testing Real Image Search Tool Execution ---")
    res = await img_tool.execute(query="Cristiano Ronaldo", num_results=4)
    print(f"Tool Execution Success: {res.success}")
    assert res.success is True, f"Image search failed: {res.error}"
    data = res.data or {}
    images = data.get("images", [])
    print(f"Found {len(images)} real photos.")
    assert len(images) > 0, "Expected at least 1 real photo returned"

    for idx, img in enumerate(images, 1):
        print(f"  Photo {idx}:")
        print(f"    Title: {img.get('title')}")
        print(f"    Image: {img.get('image_url')}")
        print(f"    Thumb: {img.get('thumbnail_url')}")
        print(f"    Source: {img.get('source_name')} ({img.get('source_url')})")
        assert img.get("image_url", "").startswith("http"), "Invalid image URL"
        assert img.get("source_name"), "Missing source attribution"

    print("\n====================================================")
    print("ALL PML IMAGE ROUTING & SEARCH TESTS PASSED!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(main())
