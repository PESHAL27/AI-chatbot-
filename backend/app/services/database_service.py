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
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error initializing SQLite fallback database: {e}")

    @classmethod
    def _is_supabase_configured(cls) -> bool:
        return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY and len(settings.SUPABASE_KEY.strip()) > 10)

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

        if cls._is_supabase_configured():
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
        if cls._is_supabase_configured():
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
        if cls._is_supabase_configured():
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

        if cls._is_supabase_configured():
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

        if cls._is_supabase_configured():
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

        if cls._is_supabase_configured():
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

        if cls._is_supabase_configured():
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
        if cls._is_supabase_configured():
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
        if cls._is_supabase_configured():
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

        if cls._is_supabase_configured():
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

        if cls._is_supabase_configured():
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
        if cls._is_supabase_configured():
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
        if cls._is_supabase_configured():
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
