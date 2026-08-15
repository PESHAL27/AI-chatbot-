export type Role = 'user' | 'pml';

export type AttachmentType = 'pdf' | 'doc' | 'txt' | 'csv' | 'image';

export interface Attachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: AttachmentType;
  mimeType: string;
  previewUrl?: string;
  content?: string;
}

export interface DocumentSourceCitation {
  file_name: string;
  page_number?: number;
  excerpt?: string;
  score?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  feedback?: 'like' | 'dislike' | null;
  isStreaming?: boolean;
  error?: boolean;
  memoriesUsed?: string[];
  sources?: DocumentSourceCitation[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  isStarred?: boolean;
}

export type PMLCoreState = 'idle' | 'thinking' | 'responding';

export type ThemeMode = 'dark' | 'light';

export type ParticleDensity = 'high' | 'medium' | 'low' | 'off';

export interface PMLSettings {
  theme: ThemeMode;
  particleDensity: ParticleDensity;
  soundEffects: boolean;
  streamSpeed: number; // ms per chunk
  apiEndpoint: string;
  autoReadAloud: boolean;
  memoryEnabled: boolean; // Phase 6: Long-term AI memory master switch
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  queriesCount: number;
  docsAnalyzedCount: number;
  tier: string;
  joinedDate: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  iconName: string;
  prompt: string;
  category: string;
  gradient: string;
}

export type MemoryCategory = 'preference' | 'goal' | 'project' | 'communication' | 'context';

export interface MemoryItem {
  id: string;
  user_id: string;
  memory: string;
  category: MemoryCategory;
  importance: number;
  source_conversation_id?: string;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string;
}

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface DocumentItem {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  status: DocumentStatus;
  error_message?: string;
  chunk_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  chunk_index: number;
  page_number?: number;
  score?: number;
  file_name?: string;
}

export interface FastApiChatRequest {
  conversation_id?: string;
  message: string;
  memory_enabled?: boolean;
  document_id?: string;
  history?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  attachments?: any[];
}

export interface FastApiChatResponse {
  response: string;
  conversation_id: string;
  status: string;
  memories_used?: string[];
  sources?: DocumentSourceCitation[];
}
