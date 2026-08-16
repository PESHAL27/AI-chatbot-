import sys
import os
import asyncio
import json
import logging

sys.path.insert(0, os.path.abspath("backend"))

from app.tools.calculator import CalculatorTool
from app.tools.web_search import WebSearchTool
from app.tools.registry import tool_registry
from app.services.ai_service import AIService
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_phase8")

async def run_tests():
    print("==================================================")
    print("PML PHASE 8 WEB SEARCH & TOOL CALLING TEST SUITE")
    print("==================================================")

    # 1. Test Calculator Tool Directly
    print("\n1. Testing Calculator Tool Directly ('3847 * 29')...")
    calc_tool = CalculatorTool()
    calc_res = await calc_tool.execute(expression="3847 * 29")
    print("   Calculator Result:", calc_res.data, "| Output:", calc_res.formatted_output)
    assert calc_res.success and calc_res.data["result"] == 111563, "Calculator failed"
    print("   [OK] Calculator tool test PASSED.")

    # 2. Test Percentage Calculation
    print("\n2. Testing Percentage Calculation ('25% of 840')...")
    pct_res = await calc_tool.execute(expression="25% of 840")
    print("   Percentage Result:", pct_res.data, "| Output:", pct_res.formatted_output)
    assert pct_res.success and pct_res.data["result"] == 210, "Percentage calculation failed"
    print("   [OK] Percentage calculation PASSED.")

    # 3. Test Web Search Tool Directly
    print("\n3. Testing Web Search Tool Directly ('latest AI developments 2026')...")
    search_tool = WebSearchTool()
    search_res = await search_tool.execute(query="latest AI developments 2026", num_results=3)
    print("   Search Success:", search_res.success, "| Items retrieved:", len(search_res.data.get("results", [])))
    if search_res.success and search_res.data.get("results"):
        top = search_res.data["results"][0]
        print(f"   Top Result: '{top.get('title')}' -> {top.get('url')}")
    print("   [OK] Web Search tool test PASSED.")

    # 4. Test Tool Registry Integration
    print("\n4. Testing Tool Registry Schema Export...")
    schemas = tool_registry.get_openai_tools_schema()
    names = [s["function"]["name"] for s in schemas]
    print("   Registered Tools:", names)
    assert "web_search" in names and "calculator" in names, "Registry missing default tools"
    print("   [OK] Tool Registry schema PASSED.")

    # 5. TEST 1 — NORMAL QUESTION (No Tool Required)
    print("\n5. TEST 1 — Normal Question ('What is inheritance in Java?')...")
    req1 = ChatRequest(message="What is inheritance in Java?", memory_enabled=False)
    res1 = await ChatService.process_chat(req1, user_id="test_user_p8")
    print("   Tools Called:", res1.tools_called)
    print("   AI Answer Excerpt:", res1.response[:150] + "...")
    assert not res1.tools_called or "calculator" not in res1.tools_called, "Normal question triggered wrong tool"
    print("   [OK] TEST 1 Normal Question PASSED.")

    # 6. TEST 2 — CALCULATOR (Calculator Tool Required)
    print("\n6. TEST 2 — Calculator Question ('What is 3847 * 29?')...")
    req2 = ChatRequest(message="Calculate 3847 * 29", memory_enabled=False)
    res2 = await ChatService.process_chat(req2, user_id="test_user_p8")
    print("   Tools Called:", res2.tools_called)
    print("   AI Answer Excerpt:", res2.response[:150])
    assert res2.tools_called and "calculator" in res2.tools_called, "Calculator question did not trigger calculator tool"
    assert "111563" in res2.response.replace(",", ""), "Calculator result 111563 missing from response"
    print("   [OK] TEST 2 Calculator Question PASSED.")

    # 7. TEST 3 — WEB SEARCH (Web Search Tool Required)
    print("\n7. TEST 3 — Web Search Question ('What are the latest AI news developments today?')...")
    req3 = ChatRequest(message="What are today's latest AI news headlines and developments?", memory_enabled=False)
    res3 = await ChatService.process_chat(req3, user_id="test_user_p8")
    print("   Tools Called:", res3.tools_called)
    print("   Web Sources Count:", len(res3.web_sources) if res3.web_sources else 0)
    if res3.web_sources:
        print(f"   First Web Source: '{res3.web_sources[0].title}' -> {res3.web_sources[0].url}")
    print("   AI Answer Excerpt:", res3.response[:200] + "...")
    assert res3.tools_called and "web_search" in res3.tools_called, "Web search question did not trigger web_search tool"
    print("   [OK] TEST 3 Web Search Question PASSED.")

    print("\n==================================================")
    print("[SUCCESS] ALL PHASE 8 WEB SEARCH & TOOL CALLING TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
