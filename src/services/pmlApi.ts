import type { Conversation, PMLSettings, FastApiChatRequest, Attachment } from '../types/pml';

// Service abstraction layer for PML AI backend integration
// Service abstraction layer for PML AI backend integration
const DEFAULT_API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface StreamCallbacks {
  onChunk: (chunk: string, fullText: string) => void;
  onComplete: (
    fullText: string, 
    metadata?: { 
      memoriesUsed?: string[]; 
      sources?: import('../types/pml').DocumentSourceCitation[];
      webSources?: import('../types/pml').WebSourceCitation[];
      toolsCalled?: string[];
      generatedImages?: import('../types/pml').GeneratedImage[];
    }
  ) => void;
  onError: (error: Error) => void;
}

export class PMLApiService {
  private endpoint: string;
  private authToken: string | null = null;
  private currentUserId: string | null = null;
  private guestId: string = (() => {
    if (typeof window === 'undefined') return 'guest_default';
    let id = sessionStorage.getItem('pml_guest_session_id');
    if (!id) {
      const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
      id = `guest_${randomPart}`;
      sessionStorage.setItem('pml_guest_session_id', id);
    }
    return id;
  })();

  constructor(endpoint: string = DEFAULT_API_ENDPOINT) {
    this.endpoint = endpoint;
  }

  setEndpoint(url: string) {
    this.endpoint = url;
  }

  getEndpoint() {
    return this.endpoint;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  setUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  getUserId(): string | null {
    return this.currentUserId;
  }

  getGuestId(): string {
    return this.guestId;
  }

  /**
   * Resets the temporary guest session with a brand new isolated identifier.
   * Clears any existing guest temporary cached state.
   */
  resetGuestSession(): string {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`pml_conversations_guest_${this.guestId}`);
        sessionStorage.removeItem(`pml_active_conv_guest_${this.guestId}`);
        sessionStorage.removeItem('pml_guest_session_id');
      } catch {
        // Safe fallback
      }
      const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
      this.guestId = `guest_${randomPart}`;
      try {
        sessionStorage.setItem('pml_guest_session_id', this.guestId);
      } catch {
        // Safe fallback
      }
    }
    this.authToken = null;
    this.currentUserId = null;
    return this.guestId;
  }

  getStorageKey(userId?: string | null): string {
    const effectiveUser = userId !== undefined ? userId : this.currentUserId;
    if (effectiveUser && !effectiveUser.startsWith('guest')) {
      return `pml_conversations_user_${effectiveUser}`;
    }
    return `pml_conversations_guest_${this.guestId}`;
  }

  /**
   * Clears cached data for a specific user or current guest session
   */
  clearUserCache(userId?: string | null) {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getStorageKey(userId);
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      localStorage.removeItem('pml_conversations'); // Legacy cleanup
      localStorage.removeItem('pml_active_conv_id');
      if (userId && !userId.startsWith('guest')) {
        sessionStorage.removeItem(`pml_active_conv_${userId}`);
      }
    } catch {
      // Safe fallback
    }
  }

  private getHeaders(custom: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Guest-ID': this.guestId,
      ...custom,
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Health Check method to verify backend operational status.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/health`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Real AI Streaming / Backend API Integration
   */
  async sendMessageStream(
    userMessage: string,
    attachments: Attachment[],
    conversationId: string,
    settings: PMLSettings,
    callbacks: StreamCallbacks,
    history?: { role: 'user' | 'assistant'; content: string }[],
    documentId?: string
  ): Promise<void> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;

      // Extract image attachments for Multimodal Vision (Phase 9)
      const imagePayloads: string[] = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const isImg = att.type === 'image' || (att.mimeType && att.mimeType.startsWith('image/')) || (att.name && /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(att.name));
          const url = att.previewUrl || att.content || '';
          if (isImg && url && url.startsWith('data:image/')) {
            imagePayloads.push(url);
          }
        }
      }

      const payload: FastApiChatRequest & { history?: any[]; document_id?: string } = {
        message: userMessage,
        images: imagePayloads.length > 0 ? imagePayloads : undefined,
        conversation_id: conversationId,
        memory_enabled: settings.memoryEnabled ?? true,
        document_id: documentId,
        history: history && history.length > 0 ? history : undefined,
      };

      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errDetail = 'Failed to process request';
        try {
          const errJson = await response.json();
          errDetail = errJson.detail || errJson.message || errDetail;
        } catch {
          errDetail = response.statusText;
        }
        throw new Error(errDetail);
      }

      const data = await response.json();
      const responseText = data.response || "PML received your message.";

      // Stream the response text smoothly for visual excellence
      await this.streamTextSmoothly(responseText, settings, callbacks, {
        memoriesUsed: data.memories_used,
        sources: data.sources,
        webSources: data.web_sources,
        toolsCalled: data.tools_called,
        generatedImages: data.generated_images,
      });
    } catch (err: any) {
      console.warn('FastAPI backend connection issue:', err);
      
      const offlineMsg = (err && err.message && !err.message.includes('fetch'))
        ? `Backend Error: ${err.message}`
        : "Unable to connect to PML.\nPlease make sure the PML backend is running.";

      callbacks.onChunk(offlineMsg, offlineMsg);
      callbacks.onComplete(offlineMsg);
    }
  }

  /**
   * Helper to stream text smoothly into the UI
   */
  private async streamTextSmoothly(
    text: string,
    settings: PMLSettings,
    callbacks: StreamCallbacks,
    metadata?: { 
      memoriesUsed?: string[]; 
      sources?: import('../types/pml').DocumentSourceCitation[];
      webSources?: import('../types/pml').WebSourceCitation[];
      toolsCalled?: string[];
      generatedImages?: import('../types/pml').GeneratedImage[];
    }
  ): Promise<void> {
    let currentText = '';
    const delay = Math.max(8, settings.streamSpeed || 15);
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      callbacks.onChunk(words[i] + ' ', currentText);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    callbacks.onComplete(currentText, metadata);
  }

  /**
   * PML Cosmic Intelligence Response Engine (Mock Implementation)
   * Formats response with LaTeX math, Code Snippets, Tables, Markdown, and detailed structured knowledge.
   */
  async simulateCosmicStream(
    userMessage: string,
    attachments: Attachment[],
    settings: PMLSettings,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const responseText = this.generateCosmicResponse(userMessage, attachments);
    let currentText = '';
    const delay = Math.max(8, settings.streamSpeed || 18);

    // Stream word by word / chunk by chunk for ultra smooth response effect
    const words = responseText.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i === words.length - 1 ? '' : ' ');
      currentText += word;
      callbacks.onChunk(word, currentText);
      await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 12));
    }

    callbacks.onComplete(currentText);
  }

  /** Intelligent contextual response generator for PML Universe */
  private generateCosmicResponse(userMessage: string, attachments: Attachment[]): string {
    const query = userMessage.toLowerCase();

    // If attachments are present
    if (attachments.length > 0) {
      const fileNames = attachments.map(a => `\`${a.name}\``).join(', ');
      return `### 🌌 Document & Asset Analysis Complete

I have ingested and processed your attached files: ${fileNames}.

#### Key Insights Extracted:
* **Document Scope**: Multi-modal structural analysis completed across ${attachments.length} attachment(s).
* **Data Verification**: Verified data integrity, tokenized key entities, and extracted core semantic themes.
* **Cosmic Synthesis**: Ready to answer specific queries, summarize findings, or transform data into actionable code/insights.

\`\`\`json
{
  "status": "success",
  "processed_files": ${attachments.length},
  "file_names": [${attachments.map(a => `"${a.name}"`).join(', ')}],
  "confidence_score": 0.998,
  "rag_index_ready": true
}
\`\`\`

How would you like me to analyze these assets further?`;
    }

    // Code queries
    if (query.includes('code') || query.includes('python') || query.includes('javascript') || query.includes('react') || query.includes('write') || query.includes('function') || query.includes('algorithm')) {
      return `### ⚡ PML Quantum Code Generator

Here is an optimized, modular implementation engineered for high performance and clean maintainability:

\`\`\`typescript
interface QuantumParticle {
  id: string;
  energyLevel: number;
  coordinates: [number, number, number];
  spinState: 'up' | 'down' | 'superposition';
}

class CosmicParticleEngine {
  private particles: Map<string, QuantumParticle> = new Map();

  public spawnParticle(energy: number): QuantumParticle {
    const id = \`pml_\${Math.random().toString(36).substr(2, 9)}\`;
    const particle: QuantumParticle = {
      id,
      energyLevel: energy,
      coordinates: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
      spinState: 'superposition',
    };
    
    this.particles.set(id, particle);
    console.log(\`[PML Core] Particle \${id} initialized at energy state \${energy} eV.\`);
    return particle;
  }

  public computeStateVectors(): number[] {
    return Array.from(this.particles.values()).map(p => p.energyLevel * 1.618);
  }
}

// Instantiate engine
const pmlEngine = new CosmicParticleEngine();
pmlEngine.spawnParticle(9.81);
\`\`\`

#### Key Architectural Highlights:
1. **Strong Type Safety**: Fully typed interfaces enforcing compile-time correctness.
2. **High Throughput**: $\\mathcal{O}(1)$ particle lookup via ES Map structure.
3. **Cosmic Scaling**: Easily adaptable to distributed worker threads or GPU WebGL shaders.`;
    }

    // Math & Science queries
    if (query.includes('math') || query.includes('physics') || query.includes('quantum') || query.includes('equation') || query.includes('calculate') || query.includes('study') || query.includes('formula')) {
      return `### 🔭 Cosmic Intelligence Physics & Mathematical Analysis

In quantum electrodynamics and cosmic thermodynamics, energy distribution can be represented through Einstein's mass-energy equivalence combined with Planck's relation:

$$E = mc^2 = h\\nu$$

Where:
* $E$ is total energy in Joules ($\text{J}$)
* $m$ represents relativistic mass ($\text{kg}$)
* $c$ is the speed of light in vacuum ($\approx 2.998 \\times 10^8 \\text{ m/s}$)
* $h$ is Planck's constant ($6.62607015 \\times 10^{-34} \\text{ J}\\cdot\\text{s}$)
* $\\nu$ is the wave frequency ($\text{Hz}$)

#### Dimensional Analysis Matrix

| Quantity | Symbol | Standard Units | Dimensional Formula |
| :--- | :--- | :--- | :--- |
| **Gravitational Energy** | $U_g$ | Joules ($\text{J}$) | $[M L^2 T^{-2}]$ |
| **Cosmic Horizon Radius** | $R_h$ | Light Years ($\text{ly}$) | $[L]$ |
| **Entropy Density** | $S$ | $\text{J}/(\text{K}\\cdot\text{m}^3)$ | $[M L^{-1} T^{-2} \Theta^{-1}]$ |

> *\"The PML Universe translates complex cosmic laws into precise, actionable intelligence.\"*`;
    }

    // Idea generation
    if (query.includes('idea') || query.includes('concept') || query.includes('create') || query.includes('solve') || query.includes('design')) {
      return `### 💡 PML Cosmic Idea & System Architecture Matrix

Here are **3 groundbreaking concepts** tailored to your prompt:

#### 1. Autonomous Orbital Grid Network
* **Core Concept**: Sub-millisecond distributed edge nodes communicating via laser optical interconnects.
* **Primary Advantage**: Near-zero latency global data synchronization resistant to terrestrial disruptions.

#### 2. Self-Healing Neural Data Structures
* **Core Concept**: Data structures that dynamically re-index and re-balance their binary nodes based on real-time access heatmaps.
* **Impact**: Up to 40% reduction in query latency under unpredictable traffic spikes.

#### 3. Hyper-Spatial Glassmorphic Interfaces
* **Core Concept**: Adaptive visual surfaces responding to user cognitive focus and ambient lighting environments.
* **Implementation Path**: CSS dynamic variables blended with WebGPU real-time shaders.

---

Which concept would you like to explore deeper or prototype together?`;
    }

    // General default answer
    return `### Enter the PML Universe

Greetings! I am **PML** — your advanced cosmic intelligence system. 

I am engineered to assist you with:
* 🧬 **Deep Learning & Technical Concepts**: Explaining intricate algorithms, science, and systems.
* 💻 **Advanced Software Engineering**: Writing production-grade code in TypeScript, Python, Rust, C++, and Go.
* 📄 **Document & Data Intelligence**: Analyzing PDF, CSV, DOCX, and image assets with precision.
* 🌌 **Creative & Strategic Problem Solving**: Generating innovative ideas, architectures, and study guides.

How can I assist your exploration today? Feel free to ask a question, attach documents, or try one of the quick actions!`;
  }

  /** Real Database & Backend Storage Operations */
  async fetchConversations(userId?: string): Promise<Conversation[]> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/conversations`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const convList = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          createdAt: c.created_at || new Date().toISOString(),
          updatedAt: c.updated_at || new Date().toISOString(),
          messages: [],
        }));
        // Update user-scoped cached fallback
        this.saveConversationsToStorage(convList, userId);
        return convList;
      }
    } catch (err) {
      console.warn('[PML API] Could not fetch conversations from backend, falling back to scoped storage:', err);
    }

    const key = this.getStorageKey(userId);
    let stored: string | null = null;
    if (typeof window !== 'undefined') {
      stored = sessionStorage.getItem(key) || localStorage.getItem(key);
    }
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  async fetchConversationDetails(id: string): Promise<Conversation | null> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/conversations/${id}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id,
          title: data.title,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
          messages: (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role === 'assistant' ? 'pml' : (m.role === 'user' ? 'user' : 'pml'),
            content: m.content,
            timestamp: m.created_at || new Date().toISOString(),
          })),
        };
      }
    } catch (err) {
      console.warn('[PML API] Error fetching conversation details from backend:', err);
    }
    return null;
  }

  async renameConversation(id: string, newTitle: string, userId?: string): Promise<boolean> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/conversations/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) return true;
    } catch (err) {
      console.warn('[PML API] Error renaming conversation on backend:', err);
    }

    // Scoped Storage Fallback
    const convs = await this.fetchConversations(userId);
    const updated = convs.map(c => c.id === id ? { ...c, title: newTitle } : c);
    await this.saveConversations(updated, userId);
    return true;
  }

  async createConversation(title: string = 'PML AI'): Promise<Conversation> {
    const newConv: Conversation = {
      id: `pml-conv-${Math.random().toString(36).substring(2, 11)}`,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    return newConv;
  }

  private saveConversationsToStorage(conversations: Conversation[], userId?: string): void {
    if (typeof window === 'undefined') return;
    const key = this.getStorageKey(userId);
    const serialized = JSON.stringify(conversations);
    if (key.startsWith('pml_conversations_guest_')) {
      sessionStorage.setItem(key, serialized);
    } else {
      localStorage.setItem(key, serialized);
    }
  }

  async saveConversations(conversations: Conversation[], userId?: string): Promise<void> {
    this.saveConversationsToStorage(conversations, userId);
  }

  async deleteConversation(id: string, userId?: string): Promise<void> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      await fetch(`${apiBase}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
    } catch (err) {
      console.warn('[PML API] Error deleting conversation from backend:', err);
    }

    const convs = await this.fetchConversations(userId);
    const filtered = convs.filter(c => c.id !== id);
    await this.saveConversations(filtered, userId);
  }

  async sendFeedback(messageId: string, feedback: 'like' | 'dislike'): Promise<boolean> {
    console.log(`[PML API] Feedback registered for message ${messageId}: ${feedback}`);
    return true;
  }

  // ==================== LONG-TERM MEMORY API (PHASE 6) ====================

  async fetchMemories(): Promise<import('../types/pml').MemoryItem[]> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/memories`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.memories || [];
      }
    } catch (err) {
      console.warn('[PML API] Error fetching long-term memories:', err);
    }
    return [];
  }

  async createMemory(
    memory: string,
    category: import('../types/pml').MemoryCategory = 'context',
    importance: number = 3
  ): Promise<import('../types/pml').MemoryItem | null> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/memories`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ memory, category, importance }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[PML API] Error creating memory:', err);
    }
    return null;
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.warn('[PML API] Error deleting memory:', err);
      return false;
    }
  }

  async clearAllMemories(): Promise<boolean> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/memories`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.warn('[PML API] Error clearing all memories:', err);
      return false;
    }
  }

  // ==================== DOCUMENT INTELLIGENCE & RAG (PHASE 7) ====================

  async uploadDocument(file: File): Promise<import('../types/pml').DocumentItem> {
    const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
      'X-Guest-ID': this.guestId,
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(`${apiBase}/api/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errDetail = 'Failed to upload document';
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errJson.message || errDetail;
      } catch {
        errDetail = res.statusText;
      }
      throw new Error(errDetail);
    }

    return await res.json();
  }

  async fetchDocuments(): Promise<import('../types/pml').DocumentItem[]> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/documents`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.documents || [];
      }
    } catch (err) {
      console.warn('[PML API] Error fetching documents:', err);
    }
    return [];
  }

  async getDocument(documentId: string): Promise<import('../types/pml').DocumentItem | null> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/documents/${documentId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[PML API] Error fetching document:', err);
    }
    return null;
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.warn('[PML API] Error deleting document:', err);
      return false;
    }
  }

  async retryDocument(documentId: string): Promise<import('../types/pml').DocumentItem | null> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/documents/${documentId}/retry`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[PML API] Error retrying document processing:', err);
    }
    return null;
  }

  // =========================================================================
  // IMAGE GENERATION & HISTORY API
  // =========================================================================

  async generateImage(
    prompt: string,
    options?: import('../types/pml').ImageGenerationOptions,
    conversationId?: string
  ): Promise<import('../types/pml').GeneratedImage | null> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/images/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          prompt,
          aspect_ratio: options?.aspect_ratio || '1:1',
          style: options?.style || 'auto',
          quality: options?.quality || 'standard',
          enhance_prompt: options?.enhance_prompt || false,
          conversation_id: conversationId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.image || null;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Image generation failed.');
    } catch (err) {
      console.error('[PML API] Image generation error:', err);
      throw err;
    }
  }

  async getImageHistory(limit: number = 50): Promise<import('../types/pml').GeneratedImage[]> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/images/history?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[PML API] Error fetching image history:', err);
    }
    return [];
  }

  async deleteGeneratedImage(imageId: string): Promise<boolean> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/images/${imageId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.warn('[PML API] Error deleting image:', err);
      return false;
    }
  }

  async enhanceImagePrompt(prompt: string, style?: string): Promise<string> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/images/enhance-prompt`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ prompt, style: style || 'auto' }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.enhanced_prompt || prompt;
      }
    } catch (err) {
      console.warn('[PML API] Error enhancing prompt:', err);
    }
    return prompt;
  }
}

export const pmlApi = new PMLApiService();
