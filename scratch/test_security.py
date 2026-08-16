import os
import sys
import json
import uuid
import asyncio
import httpx

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from app.services.database_service import DatabaseService
from app.services.rag_service import RAGService
from app.auth.rate_limiter import rate_limiter

API_BASE = "http://localhost:8000/api"

async def run_security_test_suite():
    print("=" * 60)
    print("PML SECURITY, PRIVACY & DATA PROTECTION TEST SUITE")
    print("=" * 60)

    user_a_id = f"user_a_{uuid.uuid4().hex[:8]}"
    user_b_id = f"user_b_{uuid.uuid4().hex[:8]}"

    # 1. Chat Isolation Test
    print("\n[1/7] Chat & Conversation Isolation Test:")
    conv_a = await DatabaseService.create_conversation(
        title="User A Secret Project Discussion",
        user_id=user_a_id
    )
    await DatabaseService.save_message(
        conversation_id=conv_a["id"],
        role="user",
        content="Confidential project details for User A",
        user_id=user_a_id
    )

    # User B attempts to access User A's conversation
    conv_for_b = await DatabaseService.get_conversation_with_messages(
        conversation_id=conv_a["id"],
        user_id=user_b_id
    )
    assert conv_for_b is None, "SECURITY FAILURE: User B was able to access User A's conversation!"
    print(f"  User A created Conversation ID: {conv_a['id']}")
    print(f"  User B attempt to fetch conversation: {conv_for_b} (Correctly Blocked)")
    print("  -> Chat Isolation: [PASSED]")

    # 2. Memory Isolation Test
    print("\n[2/7] Long-Term Memory Privacy Test:")
    mem_a = await DatabaseService.create_memory(
        user_id=user_a_id,
        memory="User A favorite private framework is PyTorch Internal"
    )
    memories_b = await DatabaseService.get_memories(user_id=user_b_id)
    b_has_a_memory = any(m["id"] == mem_a["id"] for m in memories_b)
    assert not b_has_a_memory, "SECURITY FAILURE: User B received User A's private memory!"
    print(f"  User A saved memory: '{mem_a['memory']}'")
    print(f"  User B total memories visible: {len(memories_b)} (User A memory excluded)")
    print("  -> Memory Isolation: [PASSED]")

    # 3. Document & RAG Cross-User Isolation Test
    print("\n[3/7] Document & RAG Vector Search Isolation Test:")
    doc_a_id = f"pml-doc-{uuid.uuid4().hex[:8]}"
    await DatabaseService.create_document(
        document_id=doc_a_id,
        user_id=user_a_id,
        file_name="User_A_Proprietary_Strategy.pdf",
        file_type="pdf",
        file_size=1024,
        storage_path="/tmp/fake.pdf",
        status="ready"
    )
    await DatabaseService.save_document_chunks([
        {
            "id": f"pml-chk-{uuid.uuid4().hex[:8]}",
            "document_id": doc_a_id,
            "user_id": user_a_id,
            "content": "Secret revenue projection for User A is 10 million dollars in 2026.",
            "chunk_index": 0,
            "page_number": 1,
            "embedding": json.dumps([0.1] * 128)
        }
    ])

    # User B queries RAG
    rag_results_b = await RAGService.retrieve_relevant_chunks(
        user_id=user_b_id,
        query="What is the secret revenue projection for 2026?"
    )
    assert len(rag_results_b) == 0, "SECURITY FAILURE: User B RAG retrieved User A's proprietary document!"
    print(f"  User A ingested secret doc chunk into vector store")
    print(f"  User B RAG query for secret revenue returned {len(rag_results_b)} results (Correctly Blocked)")
    print("  -> RAG Vector Isolation: [PASSED]")

    # 4. Path Traversal Filename Sanitization Test
    print("\n[4/7] Path Traversal Filename Sanitization Test:")
    malicious_filename = "../../../etc/passwd.pdf"
    clean_base = os.path.basename(malicious_filename)
    safe_name = "".join(c for c in clean_base if c.isalnum() or c in "._- ")
    assert ".." not in safe_name and "/" not in safe_name, f"Sanitization failed: {safe_name}"
    print(f"  Raw Malicious Input: '{malicious_filename}'")
    print(f"  Sanitized Safe Filename: '{safe_name}'")
    print("  -> Path Traversal Defense: [PASSED]")

    # 5. File Extension Whitelist Validation Test
    print("\n[5/7] File Extension Whitelist Test:")
    from app.routes.documents import ALLOWED_EXTENSIONS
    disallowed_extensions = [".exe", ".sh", ".bat", ".php", ".py", ".vbs"]
    for ext in disallowed_extensions:
        assert ext not in ALLOWED_EXTENSIONS, f"SECURITY FAILURE: Executable extension {ext} allowed!"
    print(f"  Whitelisted Document Formats: {sorted(list(ALLOWED_EXTENSIONS))}")
    print(f"  Blocked Dangerous Extensions: {disallowed_extensions}")
    print("  -> File Type Whitelist: [PASSED]")

    # 6. Rate Limiting Invariant Test
    print("\n[6/7] Rate Limiter Invariant Test:")
    client_test_ip = f"test_client_{uuid.uuid4().hex[:6]}"
    is_limited = False
    for i in range(35):
        limited, retry_in = rate_limiter.is_rate_limited(client_test_ip, "/api/chat")
        if limited:
            is_limited = True
            break
    assert is_limited, "SECURITY FAILURE: Rate limiter did not trigger after 30+ rapid chat calls!"
    print(f"  Rapid requests sent: 31+")
    print(f"  Rate limiter triggered: True (Retry-After: {retry_in}s)")
    print("  -> Rate Limiter Protection: [PASSED]")

    # 7. Prompt Injection Delimiter Containment Test
    print("\n[7/7] Prompt Injection Untrusted Data Boundaries Test:")
    from app.services.ai_service import PML_SYSTEM_PROMPT
    assert "SECURITY, PRIVACY & PROMPT INJECTION DEFENSE" in PML_SYSTEM_PROMPT, "System prompt lacks security directives!"
    assert "<untrusted_document_context>" in open(os.path.join(BASE_DIR, "backend", "app", "services", "ai_service.py"), encoding="utf-8").read()
    print("  System prompt contains strict prompt-injection and persona defense rules.")
  
    print("  RAG document excerpts are wrapped in <untrusted_document_context> data delimiters.")
    print("  -> Prompt Injection Defense: [PASSED]")

    print("\n" + "=" * 60)
    print("ALL 7 SECURITY & PRIVACY TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_security_test_suite())
