import os
import sys
import json
import uuid
import asyncio

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from app.services.database_service import DatabaseService
from app.services.conversation_service import ConversationIntelligenceService
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest

async def run_conversation_intelligence_tests():
    print("=" * 60)
    print("PML ADVANCED CONVERSATION INTELLIGENCE TEST SUITE")
    print("=" * 60)

    user_a_id = f"user_a_{uuid.uuid4().hex[:8]}"
    user_b_id = f"user_b_{uuid.uuid4().hex[:8]}"

    # TEST 1: Start a new conversation
    print("\n[TEST 1] Start New Conversation:")
    conv_1 = await DatabaseService.create_conversation(title="PML AI", user_id=user_a_id)
    assert conv_1["id"] and conv_1["user_id"] == user_a_id, "Failed to create conversation"
    print(f"  Created Conversation ID: {conv_1['id']} (Title: '{conv_1['title']}')")
    print("  -> Test 1: [PASSED]")

    # TEST 2: Send multiple messages in same conversation
    print("\n[TEST 2] Multi-Message Session Association:")
    msg1 = await DatabaseService.save_message(
        conversation_id=conv_1["id"],
        role="user",
        content="What is Java inheritance?",
        user_id=user_a_id
    )
    msg2 = await DatabaseService.save_message(
        conversation_id=conv_1["id"],
        role="assistant",
        content="Inheritance is a mechanism in Java where one class acquires the properties of another.",
        user_id=user_a_id
    )
    msgs = await DatabaseService.get_messages(conversation_id=conv_1["id"], user_id=user_a_id)
    assert len(msgs) == 2, f"Expected 2 messages, got {len(msgs)}"
    assert msgs[0]["content"] == "What is Java inheritance?"
    print(f"  Messages in Conversation: {len(msgs)}")
    print("  -> Test 2: [PASSED]")

    # TEST 3: Follow-Up Context Understanding
    print("\n[TEST 3] Follow-Up Context Understanding:")
    followup_prompt = "Give me a simple code example of that."
    optimized = ConversationIntelligenceService.optimize_context_window(
        history=[{"role": m["role"], "content": m["content"]} for m in msgs],
        current_prompt=followup_prompt
    )
    assert len(optimized) == 2, "Context should contain the previous inheritance discussion"
    print(f"  Follow-up Prompt: '{followup_prompt}'")
    print(f"  Retained Context Turns: {len(optimized)}")
    print("  -> Test 3: [PASSED]")

    # TEST 4: Topic Shift Handling
    print("\n[TEST 4] Topic Shift Handling:")
    topic_shift_prompt = "Now explain how photosynthesis works in plants."
    # Long history test
    long_history = [
        {"role": "user", "content": f"Java topic #{i}"} for i in range(12)
    ]
    opt_shift = ConversationIntelligenceService.optimize_context_window(
        history=long_history,
        current_prompt=topic_shift_prompt
    )
    # Recent turns are capped to prevent stale dominance
    assert len(opt_shift) <= 6, f"Excessive history retained: {len(opt_shift)}"
    print(f"  Topic Shift Prompt: '{topic_shift_prompt}'")
    print(f"  Compressed History: {len(long_history)} -> {len(opt_shift)} turns")
    print("  -> Test 4: [PASSED]")

    # TEST 5: Automatic Title Generation
    print("\n[TEST 5] Automatic Title Generation:")
    auto_title = await ConversationIntelligenceService.generate_title_if_default(
        conversation_id=conv_1["id"],
        user_message="Can you please explain gradient descent in machine learning?",
        ai_response="Gradient descent is an optimization algorithm...",
        user_id=user_a_id
    )
    print(f"  Prompt: 'Can you please explain gradient descent in machine learning?'")
    print(f"  Generated Title: '{auto_title}'")
    assert auto_title and len(auto_title.split()) <= 8, f"Invalid title: {auto_title}"
    print("  -> Test 5: [PASSED]")

    # TEST 6: Rename Conversation
    print("\n[TEST 6] Rename Conversation:")
    renamed = await DatabaseService.rename_conversation(
        conversation_id=conv_1["id"],
        new_title="ML Exam Preparation Masterclass",
        user_id=user_a_id
    )
    assert renamed["title"] == "ML Exam Preparation Masterclass", "Rename failed"
    print(f"  Updated Title: '{renamed['title']}'")
    print("  -> Test 6: [PASSED]")

    # TEST 7: Search Conversations
    print("\n[TEST 7] Search Conversations:")
    # Create another conversation for User A
    conv_2 = await DatabaseService.create_conversation(title="FastAPI Backend Development", user_id=user_a_id)
    await DatabaseService.save_message(
        conversation_id=conv_2["id"],
        role="user",
        content="How do I connect Supabase JWT auth in FastAPI?",
        user_id=user_a_id
    )
    search_res = await DatabaseService.search_conversations(query="Supabase", user_id=user_a_id)
    assert len(search_res) >= 1, "Search should return matched conversation"
    print(f"  Query: 'Supabase'")
    print(f"  Results Found: {len(search_res)} (Match: '{search_res[0]['title']}' - {search_res[0]['preview']})")
    print("  -> Test 7: [PASSED]")

    # TEST 8: Open Old Conversation & Restore Messages
    print("\n[TEST 8] Open Old Conversation & Restore Messages:")
    restored = await DatabaseService.get_conversation_with_messages(conversation_id=conv_2["id"], user_id=user_a_id)
    assert restored and len(restored["messages"]) == 1, "Failed to restore conversation"
    print(f"  Restored Conversation: '{restored['title']}' with {len(restored['messages'])} message(s)")
    print("  -> Test 8: [PASSED]")

    # TEST 9: Large Conversation Context Optimization
    print("\n[TEST 9] Large Conversation Context Optimization:")
    many_messages = []
    for i in range(25):
        many_messages.append({"role": "user", "content": f"We discussed algorithm step {i} in depth."})
        many_messages.append({"role": "assistant", "content": f"Step {i} was executed with complexity O(n)."})
    
    comp = ConversationIntelligenceService.optimize_context_window(
        history=many_messages,
        current_prompt="Tell me about algorithm step 2"
    )
    assert len(comp) < len(many_messages), "History was not compressed"
    print(f"  Original History: {len(many_messages)} messages")
    print(f"  Optimized Context: {len(comp)} messages")
    print("  -> Test 9: [PASSED]")

    # TEST 10: Cross-User Search Privacy Isolation
    print("\n[TEST 10] Cross-User Search Privacy Isolation:")
    search_b = await DatabaseService.search_conversations(query="Supabase", user_id=user_b_id)
    assert len(search_b) == 0, "SECURITY FAILURE: User B was able to search User A conversations!"
    print(f"  User B search for 'Supabase': {len(search_b)} results (User A isolated)")
    print("  -> Test 10: [PASSED]")

    # TEST 11: Cross-User Conversation Access Prevention
    print("\n[TEST 11] Cross-User Access Prevention:")
    unauthorized_fetch = await DatabaseService.get_conversation_with_messages(
        conversation_id=conv_2["id"],
        user_id=user_b_id
    )
    assert unauthorized_fetch is None, "SECURITY FAILURE: User B fetched User A's conversation!"
    print(f"  User B fetch attempt on {conv_2['id']}: None (Access Denied)")
    print("  -> Test 11: [PASSED]")

    # TEST 12: Delete Conversation
    print("\n[TEST 12] Delete Conversation:")
    deleted = await DatabaseService.delete_conversation(conversation_id=conv_1["id"], user_id=user_a_id)
    assert deleted is True, "Delete operation failed"
    check_deleted = await DatabaseService.get_conversation_with_messages(conversation_id=conv_1["id"], user_id=user_a_id)
    assert check_deleted is None, "Deleted conversation still exists"
    print(f"  Deleted Conversation ID: {conv_1['id']} (Verified Removed)")
    print("  -> Test 12: [PASSED]")

    print("\n" + "=" * 60)
    print("ALL 12 CONVERSATION INTELLIGENCE TESTS PASSED (100%)!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_conversation_intelligence_tests())
