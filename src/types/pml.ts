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

export interface FastApiChatRequest {
  conversation_id?: string;
  message: string;
  history?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  attachments?: {
    filename: string;
    content_type: string;
    file_id?: string;
  }[];
}

export interface FastApiChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  timestamp: string;
}
