import urllib.request
import json
import uuid

API_BASE = "http://127.0.0.1:8000"

def run_tests():
    print("==================================================")
    print("PML PHASE 6 MEMORY RETRIEVAL & AI CONTEXT FIX TEST")
    print("==================================================")

    # 1. Health check
    req = urllib.request.urlopen(f"{API_BASE}/api/health")
    print("1. Backend Health Check:", req.read().decode().strip())

    # 2. CONVERSATION 1: Store explicit memory
    conv1_id = f"test-conv-1-{uuid.uuid4().hex[:8]}"
    print(f"\n2. Testing Conversation 1 ({conv1_id}):")
    msg1 = "Remember that I'm building an AI chatbot called PML."
    payload1 = {
        "message": msg1,
        "conversation_id": conv1_id,
        "memory_enabled": True
    }
    
    req1 = urllib.request.Request(
        f"{API_BASE}/api/chat",
        data=json.dumps(payload1).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res1 = json.loads(urllib.request.urlopen(req1).read().decode("utf-8"))
    print("   User:", msg1)
    print("   PML Response:", res1.get("response"))
    print("   Memories Used:", res1.get("memories_used"))

    # 3. VERIFY MEMORY IN DATABASE
    print("\n3. Verifying Memory Storage in Database:")
    req_mem = urllib.request.urlopen(f"{API_BASE}/api/memories")
    mem_data = json.loads(req_mem.read().decode("utf-8"))
    memories = mem_data.get("memories", [])
    print(f"   Stored Memories Count: {len(memories)}")
    for m in memories:
        print(f"   - [{m.get('category')}] {m.get('memory')} (ID: {m.get('id')})")

    has_pml_memory = any("pml" in m.get("memory", "").lower() for m in memories)
    print("   -> PML Project Memory Present in DB:", has_pml_memory)
    assert has_pml_memory, "Failed: PML project memory was not stored!"

    # 4. CONVERSATION 2: Start a brand NEW conversation asking about the project
    conv2_id = f"test-conv-2-{uuid.uuid4().hex[:8]}"
    print(f"\n4. Testing Conversation 2 ({conv2_id}) — Cross-Session Retrieval:")
    msg2 = "What project am I working on?"
    payload2 = {
        "message": msg2,
        "conversation_id": conv2_id,
        "memory_enabled": True
    }

    req2 = urllib.request.Request(
        f"{API_BASE}/api/chat",
        data=json.dumps(payload2).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res2 = json.loads(urllib.request.urlopen(req2).read().decode("utf-8"))
    response2 = res2.get("response", "")
    print("   User:", msg2)
    print("   PML Response:\n", response2)
    print("   Memories Injected:", res2.get("memories_used"))

    # Check response quality
    response_lower = response2.lower()
    has_pml_mention = "pml" in response_lower or "chatbot" in response_lower or "ai" in response_lower
    says_cannot_recall = "cannot recall" in response_lower or "unable to recall" in response_lower or "don't recall" in response_lower

    print("\n5. Verification Checks:")
    print("   - Correctly answers about PML/Chatbot project:", has_pml_mention)
    print("   - Did NOT say 'cannot recall':", not says_cannot_recall)

    if has_pml_mention and not says_cannot_recall:
        print("\n[SUCCESS] Phase 6 Long-Term Memory pipeline is working end-to-end across separate conversations!")
    else:
        print("\n[FAILURE] Memory was not properly recognized in response.")

if __name__ == "__main__":
    run_tests()
