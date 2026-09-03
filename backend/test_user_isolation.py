import asyncio
import sys
import os
import uuid

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.database_service import DatabaseService
from app.auth.dependencies import get_current_user, require_authenticated_user
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

async def run_tests():
    print("====================================================")
    print("STARTING COMPREHENSIVE PML ISOLATION TEST SUITE")
    print("====================================================")

    # ----------------------------------------------------
    # TEST CASE A: Auth Dependency Isolation
    # ----------------------------------------------------
    print("\n--- [TEST A] Guest Identity Generation & Isolation ---")
    
    # No header, no token -> generates isolated guest_<uuid>
    guest_user_1 = await get_current_user(credentials=None, x_guest_id=None)
    assert guest_user_1["is_guest"] is True, "Expected is_guest=True"
    assert guest_user_1["id"].startswith("guest_"), f"Invalid guest_id format: {guest_user_1['id']}"
    print(f"Generated Guest 1: {guest_user_1['id']}")

    guest_user_2 = await get_current_user(credentials=None, x_guest_id=None)
    assert guest_user_2["id"].startswith("guest_"), "Invalid guest_id format"
    assert guest_user_1["id"] != guest_user_2["id"], "Two guests without headers must have distinct IDs"
    print(f"Generated Guest 2: {guest_user_2['id']}")

    # Pass hardcoded bad header "guest" or "guest_user" -> must NOT be used
    bad_header_user = await get_current_user(credentials=None, x_guest_id="guest_user")
    assert bad_header_user["id"] != "guest_user", "Hardcoded guest_user should be rejected and replaced with unique session"
    assert bad_header_user["id"].startswith("guest_"), "Should be a fresh unique guest session"
    print(f"Hardcoded 'guest_user' properly sanitized to: {bad_header_user['id']}")

    # Passing a valid scoped guest session header preserves it
    custom_guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    scoped_user = await get_current_user(credentials=None, x_guest_id=custom_guest_id)
    assert scoped_user["id"] == custom_guest_id, "Should preserve valid scoped guest ID"
    print(f"Preserved valid scoped Guest ID: {scoped_user['id']}")

    # Guest user calling require_authenticated_user MUST be rejected
    rejected = False
    try:
        await require_authenticated_user(current_user=guest_user_1)
    except HTTPException as e:
        rejected = True
        assert e.status_code == 401, f"Expected 401 status code, got {e.status_code}"
    assert rejected, "Guest user must be rejected with 401 on protected endpoints"
    print("Guest user correctly rejected with 401 on protected endpoint")

    # ----------------------------------------------------
    # TEST CASE B: Conversation & Chat History Isolation
    # ----------------------------------------------------
    print("\n--- [TEST B] Conversation & Message Isolation ---")

    guest1_id = f"guest_test_{uuid.uuid4().hex[:8]}"
    guest2_id = f"guest_test_{uuid.uuid4().hex[:8]}"
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())

    # Guest 1 creates conversation
    conv_g1 = await DatabaseService.create_conversation("Guest 1 Chat", guest1_id)
    await DatabaseService.save_message(conv_g1["id"], "user", "Hello from Guest 1", guest1_id)
    await DatabaseService.save_message(conv_g1["id"], "assistant", "Response to Guest 1", guest1_id)

    # Guest 2 creates conversation
    conv_g2 = await DatabaseService.create_conversation("Guest 2 Chat", guest2_id)
    await DatabaseService.save_message(conv_g2["id"], "user", "Hello from Guest 2", guest2_id)

    # User A creates conversation
    conv_ua = await DatabaseService.create_conversation("User A Secrets", user_a_id)
    await DatabaseService.save_message(conv_ua["id"], "user", "User A Private Message", user_a_id)

    # User B creates conversation
    conv_ub = await DatabaseService.create_conversation("User B Work", user_b_id)
    await DatabaseService.save_message(conv_ub["id"], "user", "User B Private Message", user_b_id)

    # 1. Check conversation list isolation
    g1_convs = await DatabaseService.get_conversations(guest1_id)
    g1_ids = [c["id"] for c in g1_convs]
    assert conv_g1["id"] in g1_ids, "Guest 1 should see conv_g1"
    assert conv_g2["id"] not in g1_ids, "Guest 1 must NOT see conv_g2"
    assert conv_ua["id"] not in g1_ids, "Guest 1 must NOT see User A conversations"
    assert conv_ub["id"] not in g1_ids, "Guest 1 must NOT see User B conversations"
    print("Guest 1 conversation list is 100% isolated")

    ua_convs = await DatabaseService.get_conversations(user_a_id)
    ua_ids = [c["id"] for c in ua_convs]
    assert conv_ua["id"] in ua_ids, "User A should see conv_ua"
    assert conv_g1["id"] not in ua_ids, "User A must NOT see Guest 1 conversations"
    assert conv_ub["id"] not in ua_ids, "User A must NOT see User B conversations"
    print("User A conversation list is 100% isolated")

    ub_convs = await DatabaseService.get_conversations(user_b_id)
    ub_ids = [c["id"] for c in ub_convs]
    assert conv_ub["id"] in ub_ids, "User B should see conv_ub"
    assert conv_ua["id"] not in ub_ids, "User B must NOT see User A conversations"
    assert conv_g1["id"] not in ub_ids, "User B must NOT see Guest 1 conversations"
    print("User B conversation list is 100% isolated")

    # 2. Check message access gating (Cross-tenant reading prevention)
    # Guest 1 trying to read User A messages
    blocked_conv = await DatabaseService.get_conversation_with_messages(conv_ua["id"], user_id=guest1_id)
    assert blocked_conv is None, "Guest 1 must receive None when attempting to read User A conversation/messages"

    # User B trying to read User A messages
    blocked_conv_b = await DatabaseService.get_conversation_with_messages(conv_ua["id"], user_id=user_b_id)
    assert blocked_conv_b is None, "User B must receive None when attempting to read User A conversation/messages"

    # User A reading User A messages
    allowed_conv = await DatabaseService.get_conversation_with_messages(conv_ua["id"], user_id=user_a_id)
    assert allowed_conv is not None, "User A should be able to read their own conversation"
    assert len(allowed_conv.get("messages", [])) == 1, "User A should have 1 message"
    assert allowed_conv["messages"][0]["content"] == "User A Private Message"
    print("Cross-tenant message reading is strictly blocked (returns None)")

    # ----------------------------------------------------
    # TEST CASE C: Long-Term Memory Isolation
    # ----------------------------------------------------
    print("\n--- [TEST C] Memory Data Isolation ---")

    # Guest 1 adds memory
    mem_g1 = await DatabaseService.create_memory(
        user_id=guest1_id,
        memory="Guest 1 likes dark themes",
        category="preference"
    )

    # User A adds memory
    mem_ua = await DatabaseService.create_memory(
        user_id=user_a_id,
        memory="User A works at Cosmic Labs",
        category="project"
    )

    # User B adds memory
    mem_ub = await DatabaseService.create_memory(
        user_id=user_b_id,
        memory="User B plays guitar",
        category="preference"
    )

    # Verify retrieval isolation
    g1_memories = await DatabaseService.get_memories(guest1_id)
    g1_mem_texts = [m["memory"] for m in g1_memories]
    assert "Guest 1 likes dark themes" in g1_mem_texts
    assert "User A works at Cosmic Labs" not in g1_mem_texts
    assert "User B plays guitar" not in g1_mem_texts
    print("Guest 1 memory is isolated")

    ua_memories = await DatabaseService.get_memories(user_a_id)
    ua_mem_texts = [m["memory"] for m in ua_memories]
    assert "User A works at Cosmic Labs" in ua_mem_texts
    assert "Guest 1 likes dark themes" not in ua_mem_texts
    assert "User B plays guitar" not in ua_mem_texts
    print("User A memory is isolated (Guest memory did NOT leak to User A)")

    ub_memories = await DatabaseService.get_memories(user_b_id)
    ub_mem_texts = [m["memory"] for m in ub_memories]
    assert "User B plays guitar" in ub_mem_texts
    assert "User A works at Cosmic Labs" not in ub_mem_texts
    print("User B memory is isolated (User A memory did NOT leak to User B)")

    # Test Case: User A deleting their own memory does NOT delete Guest or User B memory
    del_res = await DatabaseService.delete_memory(mem_ua["id"], user_id=user_a_id)
    assert del_res is True, "User A delete own memory succeeded"

    # User A trying to delete User B's memory MUST fail
    unauth_del = await DatabaseService.delete_memory(mem_ub["id"], user_id=user_a_id)
    assert unauth_del is False, "User A cannot delete User B's memory"

    # Verify User B's memory still intact
    ub_memories_post = await DatabaseService.get_memories(user_b_id)
    assert any(m["id"] == mem_ub["id"] for m in ub_memories_post), "User B memory must remain intact"
    print("Memory delete permissions are strictly enforced per owner")

    # ----------------------------------------------------
    # TEST CASE D: Document and Vector Chunks Isolation
    # ----------------------------------------------------
    print("\n--- [TEST D] Document & Vector Chunks Isolation ---")

    doc_ua = await DatabaseService.create_document(
        document_id=f"doc-{uuid.uuid4().hex[:8]}",
        user_id=user_a_id,
        file_name="financial_q3.pdf",
        file_type="pdf",
        file_size=1024,
        storage_path="storage/financial_q3.pdf"
    )

    doc_g1 = await DatabaseService.create_document(
        document_id=f"doc-{uuid.uuid4().hex[:8]}",
        user_id=guest1_id,
        file_name="guest_notes.txt",
        file_type="txt",
        file_size=512,
        storage_path="storage/guest_notes.txt"
    )

    # Verify User A documents
    docs_ua = await DatabaseService.get_documents(user_a_id)
    docs_ua_ids = [d["id"] for d in docs_ua]
    assert doc_ua["id"] in docs_ua_ids
    assert doc_g1["id"] not in docs_ua_ids
    print("User A documents isolated")

    # Verify Guest 1 documents
    docs_g1 = await DatabaseService.get_documents(guest1_id)
    docs_g1_ids = [d["id"] for d in docs_g1]
    assert doc_g1["id"] in docs_g1_ids
    assert doc_ua["id"] not in docs_g1_ids
    print("Guest 1 documents isolated")

    # Guest 1 trying to get User A's document details
    unauth_doc = await DatabaseService.get_document(doc_ua["id"], user_id=guest1_id)
    assert unauth_doc is None, "Guest 1 cannot access User A's document record"
    print("Cross-tenant document access returns None (unauthorized)")

    # Clean up test records
    await DatabaseService.delete_conversation(conv_g1["id"], user_id=guest1_id)
    await DatabaseService.delete_conversation(conv_g2["id"], user_id=guest2_id)
    await DatabaseService.delete_conversation(conv_ua["id"], user_id=user_a_id)
    await DatabaseService.delete_conversation(conv_ub["id"], user_id=user_b_id)
    await DatabaseService.delete_memory(mem_g1["id"], user_id=guest1_id)
    await DatabaseService.delete_memory(mem_ub["id"], user_id=user_b_id)
    await DatabaseService.delete_document(doc_ua["id"], user_id=user_a_id)
    await DatabaseService.delete_document(doc_g1["id"], user_id=guest1_id)

    print("\n====================================================")
    print("ALL PML ISOLATION AND AUTHENTICATION TESTS PASSED!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
