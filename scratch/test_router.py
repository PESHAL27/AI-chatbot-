import os
import sys
import json
import uuid
import asyncio

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from app.services.router_service import RouterService
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest

async def run_router_test_suite():
    print("=" * 60)
    print("PML INTELLIGENT AI ROUTER & TOOL ORCHESTRATOR TEST SUITE")
    print("=" * 60)

    # TEST 1: Normal Question
    print("\n[TEST 1] Normal General Question:")
    p1 = RouterService.plan("What is polymorphism in Java?")
    print(f"  Prompt: 'What is polymorphism in Java?'")
    print(f"  Planned Intent: {p1.intent} | Tools: {p1.required_tools}")
    assert p1.intent == "general_ai", f"Failed: Expected 'general_ai', got {p1.intent}"
    assert len(p1.required_tools) == 0, "Failed: Tools should be empty for general questions"
    print("  -> Test 1: [PASSED]")

    # TEST 2: Calculation Detection
    print("\n[TEST 2] Calculation Detection:")
    p2 = RouterService.plan("Calculate 12345 * 678")
    print(f"  Prompt: 'Calculate 12345 * 678'")
    print(f"  Planned Intent: {p2.intent} | Tools: {p2.required_tools}")
    assert "calculator" in p2.required_tools, f"Failed: Expected 'calculator' in tools, got {p2.required_tools}"
    print("  -> Test 2: [PASSED]")

    # TEST 3: Current Information / Web Search
    print("\n[TEST 3] Current Information / Web Search:")
    p3 = RouterService.plan("What is the latest AI news?")
    print(f"  Prompt: 'What is the latest AI news?'")
    print(f"  Planned Intent: {p3.intent} | Tools: {p3.required_tools}")
    assert "web_search" in p3.required_tools, f"Failed: Expected 'web_search' in tools, got {p3.required_tools}"
    print("  -> Test 3: [PASSED]")

    # TEST 4: Document / PDF Question
    print("\n[TEST 4] Document / PDF Question:")
    p4 = RouterService.plan("According to my uploaded PDF, explain inheritance.")
    print(f"  Prompt: 'According to my uploaded PDF, explain inheritance.'")
    print(f"  Planned Intent: {p4.intent} | Tools: {p4.required_tools}")
    assert "rag" in p4.required_tools, f"Failed: Expected 'rag' in tools, got {p4.required_tools}"
    print("  -> Test 4: [PASSED]")

    # TEST 5: Image / Vision
    print("\n[TEST 5] Image / Vision:")
    p5 = RouterService.plan("What is wrong with this code?", has_images=True)
    print(f"  Prompt: 'What is wrong with this code?' (Image attached)")
    print(f"  Planned Intent: {p5.intent} | Tools: {p5.required_tools}")
    assert "vision" in p5.required_tools, f"Failed: Expected 'vision' in tools, got {p5.required_tools}"
    print("  -> Test 5: [PASSED]")

    # TEST 6: Memory Write
    print("\n[TEST 6] Memory Write:")
    p6 = RouterService.plan("Remember that I prefer Python.")
    print(f"  Prompt: 'Remember that I prefer Python.'")
    print(f"  Planned Intent: {p6.intent} | Tools: {p6.required_tools}")
    assert p6.intent == "memory_write", f"Failed: Expected 'memory_write', got {p6.intent}"
    print("  -> Test 6: [PASSED]")

    # TEST 7: Memory Retrieval
    print("\n[TEST 7] Memory Retrieval:")
    p7 = RouterService.plan("What programming language am I learning?")
    print(f"  Prompt: 'What programming language am I learning?'")
    print(f"  Planned Intent: {p7.intent} | Tools: {p7.required_tools}")
    assert "memory" in p7.required_tools, f"Failed: Expected 'memory' in tools, got {p7.required_tools}"
    print("  -> Test 7: [PASSED]")

    # TEST 8: Web Search + Calculator Chaining
    print("\n[TEST 8] Web Search + Calculator Chaining:")
    p8 = RouterService.plan("Search the web for current USD to INR exchange rate and calculate how much 500 * 86 is.")
    print(f"  Prompt: 'Search the web for current USD to INR exchange rate and calculate how much 500 * 86 is.'")
    print(f"  Planned Intent: {p8.intent} | Tools: {p8.required_tools}")
    assert "web_search" in p8.required_tools and "calculator" in p8.required_tools, f"Failed: Expected multi-tool web_search + calculator, got {p8.required_tools}"
    print("  -> Test 8: [PASSED]")

    # TEST 9: RAG + Calculator Chaining
    print("\n[TEST 9] RAG + Calculator Chaining:")
    p9 = RouterService.plan("Read my uploaded PDF and calculate the total sum of 450 + 230.")
    print(f"  Prompt: 'Read my uploaded PDF and calculate the total sum of 450 + 230.'")
    print(f"  Planned Intent: {p9.intent} | Tools: {p9.required_tools}")
    assert "rag" in p9.required_tools and "calculator" in p9.required_tools, f"Failed: Expected multi-tool rag + calculator, got {p9.required_tools}"
    print("  -> Test 9: [PASSED]")

    # TEST 10: Vision + Web Search Chaining
    print("\n[TEST 10] Vision + Web Search Chaining:")
    p10 = RouterService.plan("Explain this image and search for the latest updates on it.", has_images=True)
    print(f"  Prompt: 'Explain this image and search for the latest updates on it.' (Image attached)")
    print(f"  Planned Intent: {p10.intent} | Tools: {p10.required_tools}")
    assert "vision" in p10.required_tools and "web_search" in p10.required_tools, f"Failed: Expected vision + web_search, got {p10.required_tools}"
    print("  -> Test 10: [PASSED]")

    # BONUS: Ambiguous Prompt Clarification
    print("\n[BONUS] Ambiguous Prompt Clarification:")
    p_amb = RouterService.plan("Find it.")
    print(f"  Prompt: 'Find it.'")
    print(f"  Needs Clarification: {p_amb.needs_clarification}")
    print(f"  Clarification Prompt: '{p_amb.clarification_prompt}'")
    assert p_amb.needs_clarification, "Failed: Should request clarification for ambiguous input"
    print("  -> Bonus Clarification: [PASSED]")

    print("\n" + "=" * 60)
    print("ALL 10 ROUTER & ORCHESTRATOR TEST SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_router_test_suite())
