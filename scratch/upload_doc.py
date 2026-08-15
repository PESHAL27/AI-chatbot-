import urllib.request
import uuid
import json
import os
import time

boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
with open("scratch/Java_Unit_2.txt", "rb") as f:
    file_bytes = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="Java_Unit_2.txt"\r\n'
    f"Content-Type: text/plain\r\n\r\n"
).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/documents/upload",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)
res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
print("Uploaded document:", res)
doc_id = res.get("id")

for _ in range(5):
    time.sleep(1)
    req_doc = urllib.request.urlopen(f"http://127.0.0.1:8000/api/documents/{doc_id}")
    info = json.loads(req_doc.read().decode("utf-8"))
    print("Status:", info.get("status"), "Chunks:", info.get("chunk_count"))
    if info.get("status") == "ready":
        break
