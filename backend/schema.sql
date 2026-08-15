-- PML Phase 4: Supabase PostgreSQL Database Schema
-- Copy and run this script in the Supabase SQL Editor: https://supabase.com/dashboard/project/axvbjoaqkanowkjoftxc/sql

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT DEFAULT 'guest_user',
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);

-- 4. Enable Row Level Security (RLS) policies (Optional / Open for public dev)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select on conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on conversations" ON conversations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on conversations" ON conversations FOR DELETE USING (true);

CREATE POLICY "Allow anonymous select on messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on messages" ON messages FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on messages" ON messages FOR DELETE USING (true);
