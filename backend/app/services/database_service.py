import os
import uuid
import sqlite3
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("pml.database_service")

# Path for local SQLite fallback database
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "pml_storage.db")

class DatabaseService:
    @classmethod
    def _init_sqlite(cls):
        """Initializes local SQLite database tables if missing."""
        try:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    memory TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'context',
                    importance INTEGER NOT NULL DEFAULT 3,
                    source_conversation_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_used_at TEXT
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    storage_path TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'processing',
                    error_message TEXT,
                    chunk_count INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    page_number INTEGER,
                    embedding TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error initializing SQLite fallback database: {e}")

    @classmethod
    def _is_supabase_configured(cls) -> bool:
        return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY and len(settings.SUPABASE_KEY.strip()) > 10)

    @staticmethod
    def _is_valid_uuid(val: Any) -> bool:
        if not val:
            return False
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, TypeError, AttributeError):
            return False

    @classmethod
    def _get_supabase_headers(cls, user_token: Optional[str] = None) -> Dict[str, str]:
        token = user_token or settings.SUPABASE_KEY
        return {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    # ==================== CONVERSATIONS OPERATIONS ====================

    @classmethod
    async def create_conversation(
        cls, 
        title: str, 
        user_id: str, 
        conversation_id: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a new conversation record securely tied to the authenticated user."""
        conv_id = conversation_id or f"pml-conv-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_title = (title or "New Conversation")[:60]

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    payload = {
                        "id": conv_id,
                        "user_id": user_id,
                        "title": clean_title,
                        "created_at": now_iso,
                        "updated_at": now_iso
                    }
                    res = await client.post(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations",
                        json=payload,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 201):
                        data = res.json()
                        return data[0] if isinstance(data, list) and data else payload
            except Exception as err:
                logger.warn(f"Supabase create conversation failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (conv_id, user_id, clean_title, now_iso, now_iso)
        )
        conn.commit()
        conn.close()

        return {
            "id": conv_id,
            "user_id": user_id,
            "title": clean_title,
            "created_at": now_iso,
            "updated_at": now_iso
        }

    @classmethod
    async def get_conversations(
        cls, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves all conversations for the authenticated user ordered by updated_at DESC."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?select=*&user_id=eq.{user_id}&order=updated_at.desc",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        return res.json()
            except Exception as err:
                logger.warn(f"Supabase list conversations failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

    @classmethod
    async def get_conversation_with_messages(
        cls, 
        conversation_id: str, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetches a single conversation ensuring it strictly belongs to the current user."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    # Get Conversation filtered by user_id
                    conv_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if conv_res.status_code == 200:
                        conv_data = conv_res.json()
                        if conv_data:
                            conv = conv_data[0]
                            # Get Messages for this conversation
                            msg_res = await client.get(
                                f"{settings.SUPABASE_URL}/rest/v1/messages?conversation_id=eq.{conversation_id}&order=created_at.asc",
                                headers=cls._get_supabase_headers(user_token),
                                timeout=10.0
                            )
                            conv["messages"] = msg_res.json() if msg_res.status_code == 200 else []
                            return conv
            except Exception as err:
                logger.warn(f"Supabase get conversation failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
        conv_row = cursor.fetchone()
        if not conv_row:
            conn.close()
            return None

        conv = dict(conv_row)
        cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conversation_id,))
        msg_rows = cursor.fetchall()
        conv["messages"] = [dict(m) for m in msg_rows]
        conn.close()
        return conv

    @classmethod
    async def rename_conversation(
        cls, 
        conversation_id: str, 
        new_title: str, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Renames a conversation title only if owned by user."""
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_title = new_title.strip()[:60]

        # Verify ownership first
        conv = await cls.get_conversation_with_messages(conversation_id, user_id, user_token)
        if not conv:
            return None

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
                        json={"title": clean_title, "updated_at": now_iso},
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 204):
                        data = res.json()
                        return data[0] if isinstance(data, list) and data else {"id": conversation_id, "title": clean_title}
            except Exception as err:
                logger.warn(f"Supabase rename conversation failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (clean_title, now_iso, conversation_id, user_id)
        )
        conn.commit()
        conn.close()
        return {"id": conversation_id, "title": clean_title, "updated_at": now_iso}

    @classmethod
    async def delete_conversation(
        cls, 
        conversation_id: str, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> bool:
        """Deletes a conversation and all its messages only if owned by user."""
        # Verify ownership first
        conv = await cls.get_conversation_with_messages(conversation_id, user_id, user_token)
        if not conv:
            return False

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    # Cascade delete messages first
                    await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/messages?conversation_id=eq.{conversation_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    res = await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 204):
                        return True
            except Exception as err:
                logger.warn(f"Supabase delete conversation failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
        conn.commit()
        conn.close()
        return True

    @classmethod
    async def search_conversations(
        cls,
        query: str,
        user_id: str,
        user_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Searches conversations by title or message content, strictly scoped to user_id.
        """
        if not query or not query.strip():
            return []

        search_term = query.strip()
        matched_results: Dict[str, Dict[str, Any]] = {}

        # 1. Get user's conversations first (security boundary)
        user_convs = await cls.get_conversations(user_id=user_id, user_token=user_token)
        conv_lookup = {c["id"]: c for c in user_convs}

        # Check title matches
        for cid, conv in conv_lookup.items():
            if search_term.lower() in conv.get("title", "").lower():
                matched_results[cid] = {
                    "id": cid,
                    "title": conv.get("title", "Conversation"),
                    "updated_at": conv.get("updated_at"),
                    "preview": f"Matched title: {conv.get('title')}",
                    "match_type": "title"
                }

        # Check message content matches in SQLite fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.conversation_id, m.content, c.title, c.updated_at
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.user_id = ? AND m.content LIKE ?
            ORDER BY c.updated_at DESC
            LIMIT 30
        """, (user_id, f"%{search_term}%"))
        rows = cursor.fetchall()
        conn.close()

        for r in rows:
            cid = r["conversation_id"]
            if cid not in matched_results:
                content = r["content"]
                idx = content.lower().find(search_term.lower())
                start = max(0, idx - 40)
                end = min(len(content), idx + len(search_term) + 60)
                snippet = ("..." if start > 0 else "") + content[start:end] + ("..." if end < len(content) else "")

                matched_results[cid] = {
                    "id": cid,
                    "title": r["title"],
                    "updated_at": r["updated_at"],
                    "preview": snippet,
                    "match_type": "message"
                }

        return list(matched_results.values())

    # ==================== MESSAGES OPERATIONS ====================

    @classmethod
    async def save_message(
        cls, 
        conversation_id: str, 
        role: str, 
        content: str, 
        user_id: str,
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Saves a message record to database, ensuring user owns the conversation."""
        msg_id = f"pml-msg-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Ensure conversation exists for this user
        conv = await cls.get_conversation_with_messages(conversation_id, user_id, user_token)
        if not conv:
            initial_title = content[:32] + ("..." if len(content) > 32 else "")
            await cls.create_conversation(title=initial_title, user_id=user_id, conversation_id=conversation_id, user_token=user_token)

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    payload = {
                        "id": msg_id,
                        "conversation_id": conversation_id,
                        "role": role,
                        "content": content,
                        "created_at": now_iso
                    }
                    res = await client.post(
                        f"{settings.SUPABASE_URL}/rest/v1/messages",
                        json=payload,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    # Update conversation timestamp
                    await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
                        json={"updated_at": now_iso},
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 201):
                        data = res.json()
                        return data[0] if isinstance(data, list) and data else payload
            except Exception as err:
                logger.warn(f"Supabase save message failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (msg_id, conversation_id, role, content, now_iso)
        )
        cursor.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ? AND user_id = ?",
            (now_iso, conversation_id, user_id)
        )
        conn.commit()
        conn.close()

        return {
            "id": msg_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "created_at": now_iso
        }

    @classmethod
    async def get_messages(
        cls, 
        conversation_id: str, 
        user_id: str,
        limit: int = 50,
        user_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves message logs for a conversation owned by the authenticated user."""
        conv = await cls.get_conversation_with_messages(conversation_id, user_id, user_token)
        if not conv:
            return []

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/messages?select=*&conversation_id=eq.{conversation_id}&order=created_at.asc&limit={limit}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        return res.json()
            except Exception as err:
                logger.warn(f"Supabase get messages failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?",
            (conversation_id, limit)
        )
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

    # ==================== LONG-TERM MEMORY OPERATIONS (PHASE 6) ====================

    @classmethod
    async def get_memories(
        cls, 
        user_id: str,
        user_token: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Retrieves stored memories belonging to the authenticated user."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/memories?select=*&user_id=eq.{user_id}&order=updated_at.desc&limit={limit}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        return res.json()
            except Exception as err:
                logger.warn(f"Supabase get memories failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
            (user_id, limit)
        )
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

    @classmethod
    async def get_memory(
        cls, 
        memory_id: str, 
        user_id: str, 
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieves a single memory record ensuring user ownership."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/memories?select=*&id=eq.{memory_id}&user_id=eq.{user_id}&limit=1",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        data = res.json()
                        if data and len(data) > 0:
                            return data[0]
            except Exception as err:
                logger.warn(f"Supabase get single memory failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM memories WHERE id = ? AND user_id = ? LIMIT 1",
            (memory_id, user_id)
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    async def create_memory(
        cls,
        user_id: str,
        memory: str,
        category: str = "context",
        importance: int = 3,
        source_conversation_id: Optional[str] = None,
        memory_id: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Saves a new long-term memory record tied to the authenticated user."""
        mem_id = memory_id or f"pml-mem-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_memory = memory.strip()

        payload = {
            "id": mem_id,
            "user_id": user_id,
            "memory": clean_memory,
            "category": category,
            "importance": max(1, min(5, importance)),
            "source_conversation_id": source_conversation_id,
            "created_at": now_iso,
            "updated_at": now_iso,
            "last_used_at": None
        }

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        f"{settings.SUPABASE_URL}/rest/v1/memories",
                        json=payload,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 201):
                        data = res.json()
                        return data[0] if isinstance(data, list) and data else payload
            except Exception as err:
                logger.warn(f"Supabase create memory failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO memories (id, user_id, memory, category, importance, source_conversation_id, created_at, updated_at, last_used_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                mem_id, user_id, clean_memory, category, importance, 
                source_conversation_id, now_iso, now_iso, None
            )
        )
        conn.commit()
        conn.close()
        return payload

    @classmethod
    async def update_memory(
        cls,
        memory_id: str,
        user_id: str,
        memory: Optional[str] = None,
        category: Optional[str] = None,
        importance: Optional[int] = None,
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Updates an existing memory with user ownership verification."""
        now_iso = datetime.now(timezone.utc).isoformat()
        update_fields: Dict[str, Any] = {"updated_at": now_iso}

        if memory is not None:
            update_fields["memory"] = memory.strip()
        if category is not None:
            update_fields["category"] = category
        if importance is not None:
            update_fields["importance"] = max(1, min(5, importance))

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                        json=update_fields,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        data = res.json()
                        if data and len(data) > 0:
                            return data[0]
            except Exception as err:
                logger.warn(f"Supabase update memory failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        set_clauses = []
        values = []
        for k, v in update_fields.items():
            set_clauses.append(f"{k} = ?")
            values.append(v)

        values.extend([memory_id, user_id])
        cursor.execute(
            f"UPDATE memories SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?",
            tuple(values)
        )
        conn.commit()

        cursor.execute("SELECT * FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    async def touch_memory_used(
        cls,
        memory_id: str,
        user_id: str,
        user_token: Optional[str] = None
    ) -> None:
        """Updates last_used_at timestamp when a memory is retrieved and injected into context."""
        now_iso = datetime.now(timezone.utc).isoformat()
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                        json={"last_used_at": now_iso},
                        headers=cls._get_supabase_headers(user_token),
                        timeout=5.0
                    )
            except Exception:
                pass

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE memories SET last_used_at = ? WHERE id = ? AND user_id = ?",
            (now_iso, memory_id, user_id)
        )
        conn.commit()
        conn.close()

    @classmethod
    async def delete_memory(
        cls, 
        memory_id: str, 
        user_id: str, 
        user_token: Optional[str] = None
    ) -> bool:
        """Deletes a specific memory record with user ownership check."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 204):
                        return True
            except Exception as err:
                logger.warn(f"Supabase delete memory failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted_count > 0

    @classmethod
    async def clear_all_memories(
        cls, 
        user_id: str, 
        user_token: Optional[str] = None
    ) -> int:
        """Deletes all memories belonging to the authenticated user."""
        if cls._is_supabase_configured():
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/memories?user_id=eq.{user_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 204):
                        return 1
            except Exception as err:
                logger.warn(f"Supabase clear memories failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memories WHERE user_id = ?", (user_id,))
        count = cursor.rowcount
        conn.commit()
        conn.close()
        return count

    # ==================== DOCUMENT & RAG OPERATIONS (PHASE 7) ====================

    @classmethod
    async def create_document(
        cls,
        user_id: str,
        file_name: str,
        file_type: str,
        file_size: int,
        storage_path: str,
        document_id: Optional[str] = None,
        status: str = "processing",
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a document record tied to the user."""
        doc_id = document_id or f"pml-doc-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        payload = {
            "id": doc_id,
            "user_id": user_id,
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size,
            "storage_path": storage_path,
            "status": status,
            "error_message": None,
            "chunk_count": 0,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        f"{settings.SUPABASE_URL}/rest/v1/documents",
                        json=payload,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 201):
                        data = res.json()
                        return data[0] if isinstance(data, list) and data else payload
            except Exception as err:
                logger.warn(f"Supabase create document failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, status, error_message, chunk_count, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                doc_id, user_id, file_name, file_type, file_size, 
                storage_path, status, None, 0, now_iso, now_iso
            )
        )
        conn.commit()
        conn.close()
        return payload

    @classmethod
    async def update_document_status(
        cls,
        document_id: str,
        user_id: str,
        status: str,
        chunk_count: Optional[int] = None,
        error_message: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Updates document status, chunk count, and optional error message."""
        now_iso = datetime.now(timezone.utc).isoformat()
        update_fields: Dict[str, Any] = {"status": status, "updated_at": now_iso}

        if chunk_count is not None:
            update_fields["chunk_count"] = chunk_count
        if error_message is not None:
            update_fields["error_message"] = error_message

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/documents?id=eq.{document_id}&user_id=eq.{user_id}",
                        json=update_fields,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        data = res.json()
                        if data and len(data) > 0:
                            return data[0]
            except Exception as err:
                logger.warn(f"Supabase update document status failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        set_clauses = []
        values = []
        for k, v in update_fields.items():
            set_clauses.append(f"{k} = ?")
            values.append(v)

        values.extend([document_id, user_id])
        cursor.execute(
            f"UPDATE documents SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?",
            tuple(values)
        )
        conn.commit()

        cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    async def get_documents(
        cls, 
        user_id: str, 
        user_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves list of documents belonging to user."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/documents?select=*&user_id=eq.{user_id}&order=created_at.desc",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        return res.json()
            except Exception as err:
                logger.warn(f"Supabase get documents failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

    @classmethod
    async def get_document(
        cls, 
        document_id: str, 
        user_id: str, 
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieves a single document ensuring user ownership."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/documents?select=*&id=eq.{document_id}&user_id=eq.{user_id}&limit=1",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code == 200:
                        data = res.json()
                        if data and len(data) > 0:
                            return data[0]
            except Exception as err:
                logger.warn(f"Supabase get single document failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ? LIMIT 1", (document_id, user_id))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    async def delete_document(
        cls, 
        document_id: str, 
        user_id: str, 
        user_token: Optional[str] = None
    ) -> bool:
        """Deletes a document record and all its chunks with user ownership check."""
        doc = await cls.get_document(document_id, user_id, user_token)
        if not doc:
            return False

        # Delete local file if it exists
        storage_path = doc.get("storage_path")
        if storage_path and os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception as e:
                logger.warn(f"Failed to delete local document file {storage_path}: {e}")

        # Delete chunks first
        await cls.delete_document_chunks(document_id, user_id, user_token)

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/documents?id=eq.{document_id}&user_id=eq.{user_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 204):
                        return True
            except Exception as err:
                logger.warn(f"Supabase delete document failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted_count > 0

    @classmethod
    async def save_document_chunks(
        cls,
        chunks: List[Dict[str, Any]],
        user_token: Optional[str] = None
    ) -> int:
        """Saves a batch of document chunks with embedding vectors."""
        if not chunks:
            return 0

        # Extract user_id from first chunk
        user_id = chunks[0].get("user_id", "")

        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        f"{settings.SUPABASE_URL}/rest/v1/document_chunks",
                        json=chunks,
                        headers=cls._get_supabase_headers(user_token),
                        timeout=15.0
                    )
                    if res.status_code in (200, 201):
                        return len(chunks)
            except Exception as err:
                logger.warn(f"Supabase batch save chunks failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()

        insert_data = [
            (
                c.get("id", f"pml-chk-{uuid.uuid4().hex[:12]}"),
                c["document_id"],
                c["user_id"],
                c["content"],
                c.get("chunk_index", 0),
                c.get("page_number"),
                c.get("embedding"),
                now_iso
            )
            for c in chunks
        ]

        cursor.executemany(
            """INSERT INTO document_chunks (id, document_id, user_id, content, chunk_index, page_number, embedding, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            insert_data
        )
        conn.commit()
        conn.close()
        return len(chunks)

    @classmethod
    async def get_document_chunks(
        cls,
        user_id: str,
        document_id: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves chunks belonging to user, optionally filtered by specific document."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    url = f"{settings.SUPABASE_URL}/rest/v1/document_chunks?select=*&user_id=eq.{user_id}"
                    if document_id:
                        url += f"&document_id=eq.{document_id}"
                    url += "&order=chunk_index.asc"
                    res = await client.get(url, headers=cls._get_supabase_headers(user_token), timeout=12.0)
                    if res.status_code == 200:
                        return res.json()
            except Exception as err:
                logger.warn(f"Supabase get document chunks failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if document_id:
            cursor.execute(
                "SELECT * FROM document_chunks WHERE user_id = ? AND document_id = ? ORDER BY chunk_index ASC",
                (user_id, document_id)
            )
        else:
            cursor.execute(
                "SELECT * FROM document_chunks WHERE user_id = ? ORDER BY chunk_index ASC",
                (user_id,)
            )
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

    @classmethod
    async def delete_document_chunks(
        cls,
        document_id: str,
        user_id: str,
        user_token: Optional[str] = None
    ) -> int:
        """Deletes all chunks for a document."""
        if cls._is_supabase_configured() and cls._is_valid_uuid(user_id):
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/document_chunks?document_id=eq.{document_id}&user_id=eq.{user_id}",
                        headers=cls._get_supabase_headers(user_token),
                        timeout=10.0
                    )
                    if res.status_code in (200, 204):
                        return 1
            except Exception as err:
                logger.warn(f"Supabase delete chunks failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM document_chunks WHERE document_id = ? AND user_id = ?", (document_id, user_id))
        count = cursor.rowcount
        conn.commit()
        conn.close()
        return count
