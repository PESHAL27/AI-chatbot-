import urllib.request
import urllib.parse
import json
import time
import os
import uuid

API_BASE = "http://127.0.0.1:8000"

def run_rag_tests():
    print("==================================================")
    print("PML PHASE 7 DOCUMENT INTELLIGENCE / RAG TEST SUITE")
    print("==================================================")

    # 1. Health check
    req = urllib.request.urlopen(f"{API_BASE}/api/health")
    print("1. Backend Health Check:", req.read().decode().strip())

    # 2. Create Sample Document Files
    java_doc_content = """JAVA OBJECT ORIENTED PROGRAMMING - UNIT 2: INHERITANCE AND POLYMORPHISM

1. CONCEPT OF INHERITANCE
Inheritance is a fundamental mechanism in Java where one class acquires the properties (methods and fields) of another class using the 'extends' keyword. The class that inherits is called the Subclass (or Child/Derived class), and the class being inherited from is the Superclass (or Parent/Base class).

2. TYPES OF INHERITANCE IN JAVA
Java supports three primary types of class inheritance:
- Single Inheritance: A single subclass inherits from a single superclass (e.g. Class B extends Class A).
- Multilevel Inheritance: A chain of inheritance where a derived class inherits from another derived class (e.g. Class C extends Class B, which extends Class A).
- Hierarchical Inheritance: Multiple subclasses inherit from one common superclass (e.g. Class B and Class C both extend Class A).
Note: Java does NOT support multiple inheritance with classes to avoid the Diamond Problem ambiguity, but achieves it via Interfaces.

3. METHOD OVERRIDING
Method Overriding occurs when a subclass provides a specific implementation of a method that is already defined in its superclass. The method in the subclass must have the same name, same parameters, and same return type as in the superclass. The @Override annotation is used to ensure compile-time safety.

4. THE 'super' KEYWORD
In Java, 'super' is a reference variable used to refer to immediate parent class objects. It is used to:
- Invoke the immediate parent class constructor: super()
- Refer to immediate parent class instance variables: super.variable
- Invoke immediate parent class methods: super.method()
"""

    python_doc_content = """PYTHON ADVANCED OBJECT ORIENTED PROGRAMMING

1. INHERITANCE IN PYTHON
In Python, inheritance allows a class to inherit all methods and properties from another class using the syntax: class Child(Parent):. Unlike Java, Python natively supports Multiple Inheritance directly, allowing a class to inherit from multiple parent classes simultaneously (e.g. class Child(ParentA, ParentB):).

2. METHOD RESOLUTION ORDER (MRO)
Python uses the C3 Linearization algorithm to determine the order in which base classes are searched when executing a method. You can inspect this order using the .mro() attribute or Class.__mro__.

3. THE 'super()' FUNCTION
In Python 3, super() allows calling methods of the superclass dynamically and handles diamond multiple inheritance cleanly via cooperative multiple inheritance.
"""

    os.makedirs("scratch", exist_ok=True)
    java_file_path = os.path.join("scratch", "Java_Unit_2.txt")
    python_file_path = os.path.join("scratch", "Python_OOP.txt")

    with open(java_file_path, "w", encoding="utf-8") as f:
        f.write(java_doc_content)
    with open(python_file_path, "w", encoding="utf-8") as f:
        f.write(python_doc_content)

    print("\n2. Created Sample Documents:")
    print("   - scratch/Java_Unit_2.txt")
    print("   - scratch/Python_OOP.txt")

    # 3. Upload Java Document
    print("\n3. Testing Document Upload (Multipart Form):")
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    
    with open(java_file_path, "rb") as f:
        file_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="Java_Unit_2.txt"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req_upload = urllib.request.Request(
        f"{API_BASE}/api/documents/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    upload_res = json.loads(urllib.request.urlopen(req_upload).read().decode("utf-8"))
    java_doc_id = upload_res.get("id")
    print(f"   Uploaded: {upload_res.get('file_name')} (ID: {java_doc_id}, Status: {upload_res.get('status')})")

    # Wait for processing to complete
    print("\n4. Waiting for background extraction & embeddings generation...")
    for _ in range(10):
        time.sleep(1)
        req_doc = urllib.request.urlopen(f"{API_BASE}/api/documents/{java_doc_id}")
        doc_info = json.loads(req_doc.read().decode("utf-8"))
        print(f"   Status: {doc_info.get('status')}, Chunks: {doc_info.get('chunk_count')}")
        if doc_info.get("status") == "ready":
            break

    assert doc_info.get("status") == "ready", "Failed: Document status is not 'ready'"
    assert doc_info.get("chunk_count", 0) > 0, "Failed: Document has 0 chunks"

    # Upload Python Document as well
    with open(python_file_path, "rb") as f:
        py_bytes = f.read()

    body_py = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="Python_OOP.txt"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
    ).encode("utf-8") + py_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req_upload_py = urllib.request.Request(
        f"{API_BASE}/api/documents/upload",
        data=body_py,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    upload_py_res = json.loads(urllib.request.urlopen(req_upload_py).read().decode("utf-8"))
    py_doc_id = upload_py_res.get("id")
    print(f"   Uploaded 2nd Document: {upload_py_res.get('file_name')} (ID: {py_doc_id})")
    time.sleep(2)

    # 5. Semantic Vector Search Test
    print("\n5. Testing Document Semantic Search:")
    search_payload = {"query": "What are the types of inheritance in Java?", "top_k": 3}
    req_search = urllib.request.Request(
        f"{API_BASE}/api/documents/search",
        data=json.dumps(search_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    search_res = json.loads(urllib.request.urlopen(req_search).read().decode("utf-8"))
    print(f"   Search Results Found: {search_res.get('total_found')}")
    for res in search_res.get("results", []):
        print(f"   - [{res.get('file_name')} / Page {res.get('page_number')}] Score: {res.get('score')} | Snippet: {res.get('content')[:90]}...")

    assert search_res.get("total_found", 0) > 0, "Failed: Semantic search returned 0 results"

    # 6. Chat with RAG Grounding Test
    print("\n6. Testing RAG-Grounded Chat Response:")
    conv_id = f"test-rag-conv-{uuid.uuid4().hex[:8]}"
    chat_payload = {
        "message": "Explain the types of inheritance according to my Java document.",
        "conversation_id": conv_id,
        "memory_enabled": True
    }
    req_chat = urllib.request.Request(
        f"{API_BASE}/api/chat",
        data=json.dumps(chat_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    chat_res = json.loads(urllib.request.urlopen(req_chat).read().decode("utf-8"))
    print("   User Question: Explain the types of inheritance according to my Java document.")
    print("   PML Response:\n", chat_res.get("response"))
    print("   Document Sources Returned:", chat_res.get("sources"))

    resp_text = chat_res.get("response", "").lower()
    has_inheritance_types = "single" in resp_text or "multilevel" in resp_text or "hierarchical" in resp_text
    print("   -> Correctly explains Java inheritance types from document:", has_inheritance_types)
    assert has_inheritance_types, "Failed: PML response did not ground in Java document content"

    # 7. Document Deletion Test
    print("\n7. Testing Document Deletion:")
    req_del = urllib.request.Request(f"{API_BASE}/api/documents/{java_doc_id}", headers={}, method="DELETE")
    del_res = json.loads(urllib.request.urlopen(req_del).read().decode("utf-8"))
    print("   Delete Response:", del_res)

    req_list = urllib.request.urlopen(f"{API_BASE}/api/documents")
    docs_after = json.loads(req_list.read().decode("utf-8")).get("documents", [])
    remaining_ids = [d["id"] for d in docs_after]
    print(f"   Remaining Documents: {len(docs_after)} (IDs: {remaining_ids})")
    assert java_doc_id not in remaining_ids, "Failed: Document was not deleted"

    print("\n[SUCCESS] Phase 7 Document Intelligence & RAG pipeline is fully functional end-to-end!")

if __name__ == "__main__":
    run_rag_tests()
