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

export interface FastApiChatRequest {
  conversation_id?: string;
  message: string;
  memory_enabled?: boolean;
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
}
