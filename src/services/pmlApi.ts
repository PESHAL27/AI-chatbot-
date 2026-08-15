import type { Conversation, PMLSettings, FastApiChatRequest, Attachment } from '../types/pml';

// Service abstraction layer for PML AI backend integration
// Service abstraction layer for PML AI backend integration
const DEFAULT_API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface StreamCallbacks {
  onChunk: (chunk: string, fullText: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class PMLApiService {
  private endpoint: string;
  private authToken: string | null = null;

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

  private getHeaders(custom: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
  async checkHealth(): Promise<{ status: string; service: string } | null> {
    try {
      const res = await fetch(`${this.endpoint}/api/health`, { method: 'GET' });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Send message to PML FastAPI backend (POST /api/chat).
   * Stream results smoothly into UI callbacks.
   */
  async sendMessageStream(
    userMessage: string,
    attachments: Attachment[] = [],
    conversationId: string,
    settings: PMLSettings,
    callbacks: StreamCallbacks,
    history: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
  ): Promise<void> {
    const apiBase = this.endpoint || settings.apiEndpoint || DEFAULT_API_ENDPOINT;

    try {
      const payload: FastApiChatRequest = {
        conversation_id: conversationId,
        message: userMessage,
        memory_enabled: settings.memoryEnabled !== false,
        history: history,
        attachments: attachments.map(a => ({
          filename: a.name,
          content_type: a.mimeType,
          file_id: a.id,
        })),
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
      const responseText = data.response || "PML received your message. The AI model will be connected in Phase 3.";

      // Stream the response text smoothly for visual excellence
      await this.streamTextSmoothly(responseText, settings, callbacks);
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
    callbacks: StreamCallbacks
  ): Promise<void> {
    let currentText = '';
    const delay = Math.max(8, settings.streamSpeed || 15);
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      callbacks.onChunk(words[i] + ' ', currentText);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    callbacks.onComplete(currentText);
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
  async fetchConversations(): Promise<Conversation[]> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      const res = await fetch(`${apiBase}/api/conversations`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.map((c: any) => ({
          id: c.id,
          title: c.title,
          createdAt: c.created_at || new Date().toISOString(),
          updatedAt: c.updated_at || new Date().toISOString(),
          messages: [],
        }));
      }
    } catch (err) {
      console.warn('[PML API] Could not fetch conversations from backend, falling back to localStorage:', err);
    }

    const stored = localStorage.getItem('pml_conversations');
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

  async renameConversation(id: string, newTitle: string): Promise<boolean> {
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

    // Local Storage Fallback
    const convs = await this.fetchConversations();
    const updated = convs.map(c => c.id === id ? { ...c, title: newTitle } : c);
    await this.saveConversations(updated);
    return true;
  }

  async saveConversations(conversations: Conversation[]): Promise<void> {
    localStorage.setItem('pml_conversations', JSON.stringify(conversations));
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      const apiBase = this.endpoint || DEFAULT_API_ENDPOINT;
      await fetch(`${apiBase}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
    } catch (err) {
      console.warn('[PML API] Error deleting conversation from backend:', err);
    }

    const convs = await this.fetchConversations();
    const filtered = convs.filter(c => c.id !== id);
    await this.saveConversations(filtered);
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
}

export const pmlApi = new PMLApiService();
