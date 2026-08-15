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
                    user_id TEXT DEFAULT 'guest_user',
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
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error initializing SQLite fallback database: {e}")

    @classmethod
    def _is_supabase_configured(cls) -> bool:
        return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY and len(settings.SUPABASE_KEY.strip()) > 10)

    @classmethod
    def _get_supabase_headers(cls) -> Dict[str, str]:
        return {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    # ==================== CONVERSATIONS OPERATIONS ====================

    @classmethod
    async def create_conversation(cls, title: str, user_id: str = "guest_user", conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new conversation record."""
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
                        headers=cls._get_supabase_headers(),
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
    async def get_conversations(cls, user_id: str = "guest_user") -> List[Dict[str, Any]]:
        """Retrieves all conversations for a user ordered by updated_at DESC."""
        if cls._is_supabase_configured():
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?select=*&user_id=eq.{user_id}&order=updated_at.desc",
                        headers=cls._get_supabase_headers(),
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
    async def get_conversation_with_messages(cls, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a single conversation along with its full message history."""
        if cls._is_supabase_configured():
            try:
                async with httpx.AsyncClient() as client:
                    # Get Conversation
                    conv_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}",
                        headers=cls._get_supabase_headers(),
                        timeout=10.0
                    )
                    # Get Messages
                    msg_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/messages?conversation_id=eq.{conversation_id}&order=created_at.asc",
                        headers=cls._get_supabase_headers(),
                        timeout=10.0
                    )
                    if conv_res.status_code == 200:
                        conv_data = conv_res.json()
                        if conv_data:
                            conv = conv_data[0]
                            conv["messages"] = msg_res.json() if msg_res.status_code == 200 else []
                            return conv
            except Exception as err:
                logger.warn(f"Supabase get conversation failed, using SQLite fallback: {err}")

        # SQLite Fallback
        cls._init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
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
    async def rename_conversation(cls, conversation_id: str, new_title: str) -> Optional[Dict[str, Any]]:
        """Renames a conversation title and updates updated_at timestamp."""
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_title = new_title.strip()[:60]

        if cls._is_supabase_configured():
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}",
                        json={"title": clean_title, "updated_at": now_iso},
                        headers=cls._get_supabase_headers(),
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
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (clean_title, now_iso, conversation_id)
        )
        conn.commit()
        conn.close()
        return {"id": conversation_id, "title": clean_title, "updated_at": now_iso}

    @classmethod
    async def delete_conversation(cls, conversation_id: str) -> bool:
        """Deletes a conversation and all its messages."""
        if cls._is_supabase_configured():
            try:
                async with httpx.AsyncClient() as client:
                    # Cascade delete messages first
                    await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/messages?conversation_id=eq.{conversation_id}",
                        headers=cls._get_supabase_headers(),
                        timeout=10.0
                    )
                    res = await client.delete(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}",
                        headers=cls._get_supabase_headers(),
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
        cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()
        conn.close()
        return True

    # ==================== MESSAGES OPERATIONS ====================

    @classmethod
    async def save_message(cls, conversation_id: str, role: str, content: str) -> Dict[str, Any]:
        """Saves a message record to database and updates conversation timestamp."""
        msg_id = f"pml-msg-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Ensure conversation exists
        conv = await cls.get_conversation_with_messages(conversation_id)
        if not conv:
            initial_title = content[:32] + ("..." if len(content) > 32 else "")
            await cls.create_conversation(title=initial_title, conversation_id=conversation_id)

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
                        headers=cls._get_supabase_headers(),
                        timeout=10.0
                    )
                    # Update conversation timestamp
                    await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}",
                        json={"updated_at": now_iso},
                        headers=cls._get_supabase_headers(),
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
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now_iso, conversation_id)
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
    async def get_messages(cls, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent message log history for a conversation."""
        if cls._is_supabase_configured():
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/messages?select=*&conversation_id=eq.{conversation_id}&order=created_at.asc&limit={limit}",
                        headers=cls._get_supabase_headers(),
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
