# PML Security, Privacy & Data Protection Architecture

This document details the security model, authorization mechanisms, and data protection policies implemented across the PML AI platform.

---

## 1. Core Security Architecture

```
                    🌌 PML Client (Frontend)
                                │
                                ▼
                       Authentication (Supabase)
                                │
                     ┌──────────┴──────────┐
                     │                     │
                  Guest               Authenticated
                     │                     │
                     │                     ▼
                     │            Authorization (Bearer JWT)
                     │                     │
                     │           ┌─────────┼─────────┐
                     │           ▼         ▼         ▼
                     │         Chat     Memory    Files/RAG
                     │           │         │         │
                     │           └─────────┼─────────┘
                     │                     ▼
                     │             Supabase Database
                     │                     │
                     │            Row Level Security (RLS)
                     │
                     ▼
          Transient Local Mode

                           FastAPI Backend
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
               AI APIs        Web Search      Calculator
                  │
            All secrets & API keys
            remain strictly server-side
```

---

## 2. Key Security Principles

### A. Zero Client-Side Secret Exposure
* All third-party provider credentials (`AI_API_KEY`, `SUPABASE_SERVICE_KEY`, `TAVILY_API_KEY`, `SERPER_API_KEY`) reside strictly in server-side environment variables (`backend/.env`).
* No secret keys or private access tokens are bundled into the client-side JavaScript/TypeScript code, HTML, or `localStorage`.

### B. Strict User Data Isolation
* **Conversations & Messages**: Filtered by `user_id = authenticated_user`. User A cannot view, search, rename, or delete User B's conversation sessions.
* **Long-Term Memory**: Memory facts extracted and stored are associated with the authenticated user ID. Cross-user memory leakage is strictly prohibited.
* **Document Intelligence & RAG**: Vector searches, document chunks, and summaries strictly filter by `user_id`. When User A executes a RAG query, the vector search engine only queries document chunks owned by User A.
* **Storage Objects**: Document uploads are written to designated sandbox directories with safe UUID prefixes.

### C. Path Traversal & File Upload Validation
* Filenames are sanitized using `os.path.basename` and alphanumeric filters.
* All resulting destination paths are verified using `os.path.abspath` to prevent directory traversal (`../../`).
* Strict file extension whitelisting (`.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.csv`, `.json`, `.jpg`, `.png`, `.webp`) and a $25\text{MB}$ file size limit. Executable scripts (`.exe`, `.sh`, `.bat`, `.py`, `.js`, `.php`) are rejected immediately.

### D. Prompt Injection Defense & Data Boundaries
* External content from Web Search and Document RAG is enclosed within explicit XML-style data delimiters:
  ```xml
  <untrusted_document_context>
    <document_excerpt source="Notes.pdf">...</document_excerpt>
  </untrusted_document_context>
  ```
* System prompt instructs the model to treat external excerpts as reference **DATA ONLY** and to ignore any instructions, prompt overrides, or system-prompt extraction requests contained within documents or web pages.

### E. Rate Limiting & Abuse Prevention
* A sliding-window rate limiter is enforced on all API routes:
  * `/api/chat`: $30\text{ requests / minute}$
  * `/api/documents/upload`: $10\text{ uploads / minute}$
  * `/api/memories`: $60\text{ requests / minute}$
  * Default endpoints: $120\text{ requests / minute}$
* Rate-limited requests receive standard `HTTP 429 Too Many Requests` with a `Retry-After` header.

### F. XSS & Link Protocol Sanitization
* Markdown rendering in `MessageItem.tsx` sanitizes all hyperlink protocols, permitting only `http://`, `https://`, and `mailto:` while neutralizing unsafe `javascript:` or `data:` schemes.

---

## 3. Reporting Security Issues

If you discover a potential security vulnerability in PML, please report it privately to the maintainers rather than creating a public issue.
