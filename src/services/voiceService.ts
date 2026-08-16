// Voice Service for PML AI: Speech-to-Text (STT) and Text-to-Speech (TTS)

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused' | 'error';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

export interface STTOptions {
  lang?: string;
  continuous?: boolean;
  onResult: (finalText: string) => void;
  onInterim?: (interimText: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMessage: string) => void;
}

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class VoiceService {
  private recognition: any = null;
  private isListeningActive = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeSpeakingMessageId: string | null = null;
  private listeners: ((state: { isListening: boolean; isSpeaking: boolean; activeMsgId: string | null }) => void)[] = [];

  // ==================== SPEECH-TO-TEXT (STT) ====================

  isSTTSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  isTTSSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  async startListening(options: STTOptions): Promise<boolean> {
    if (!this.isSTTSupported()) {
      if (options.onError) {
        options.onError("Voice input isn't supported in this browser. Please use Chrome, Edge, or Safari.");
      }
      return false;
    }

    // Stop any existing session
    this.stopListening();
    this.stopSpeaking();

    // Check microphone permission
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release tracks immediately
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (permErr: any) {
      const msg = permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError'
        ? "Microphone access is required for voice input. Please allow microphone permissions."
        : "No microphone available on this device.";
      if (options.onError) options.onError(msg);
      return false;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = options.continuous ?? true;
      rec.interimResults = true;
      rec.lang = options.lang || 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        this.isListeningActive = true;
        this.notifyState();
        if (options.onStart) options.onStart();
      };

      rec.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalText && options.onResult) {
          options.onResult(finalText);
        }
        if (interimText && options.onInterim) {
          options.onInterim(interimText);
        }
      };

      rec.onerror = (event: any) => {
        let errMessage = "Voice input encounter an error.";
        if (event.error === 'not-allowed') {
          errMessage = "Microphone access was denied. Please allow microphone access in your browser.";
        } else if (event.error === 'no-speech') {
          errMessage = "No speech was detected. Please try again.";
        } else if (event.error === 'network') {
          errMessage = "Network error occurred during speech recognition.";
        }
        this.isListeningActive = false;
        this.notifyState();
        if (options.onError) options.onError(errMessage);
      };

      rec.onend = () => {
        this.isListeningActive = false;
        this.notifyState();
        if (options.onEnd) options.onEnd();
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err: any) {
      this.isListeningActive = false;
      this.notifyState();
      if (options.onError) options.onError("Could not initialize voice recognition.");
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
      this.recognition = null;
    }
    this.isListeningActive = false;
    this.notifyState();
  }

  isListening(): boolean {
    return this.isListeningActive;
  }

  // ==================== TEXT-TO-SPEECH (TTS) ====================

  /**
   * Sanitizes markdown, code blocks, and formulas into clean, pleasant natural speech
   */
  private cleanTextForSpeech(rawMarkdown: string): string {
    if (!rawMarkdown) return '';

    return rawMarkdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, ' [code snippet omitted] ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove image markdown
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Clean headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove markdown bold/italics
      .replace(/[*_~]{1,3}/g, '')
      // Remove blockquotes
      .replace(/^\s*>\s*/gm, '')
      // Remove LaTeX formula symbols \( \) \[ \]
      .replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ')
      .replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ')
      .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
      .replace(/\$([^$]+)\$/g, ' $1 ')
      // Clean excessive spaces and newlines
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isTTSSupported()) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  speak(
    text: string, 
    messageId?: string, 
    options?: TTSOptions
  ): boolean {
    if (!this.isTTSSupported()) {
      if (options?.onError) options.onError("Text-to-speech isn't supported in this browser.");
      return false;
    }

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) return false;

    // Stop previous utterance
    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = options?.lang || 'en-US';
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;

    // Pick best natural voice if available
    const voices = this.getAvailableVoices();
    if (voices.length > 0) {
      if (options?.voiceURI) {
        const found = voices.find(v => v.voiceURI === options.voiceURI);
        if (found) utterance.voice = found;
      }
      if (!utterance.voice) {
        // Preferred natural voices: Google / Microsoft Natural / Samantha / Daniel
        const preferred = voices.find(v => 
          (v.lang.startsWith(utterance.lang.slice(0, 2))) && 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
        ) || voices.find(v => v.lang.startsWith(utterance.lang.slice(0, 2)));
        if (preferred) utterance.voice = preferred;
      }
    }

    this.activeSpeakingMessageId = messageId || 'global_pml_speech';

    utterance.onstart = () => {
      this.notifyState();
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.activeSpeakingMessageId = null;
      this.notifyState();
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (err) => {
      this.currentUtterance = null;
      this.activeSpeakingMessageId = null;
      this.notifyState();
      if (options?.onError) options.onError(err);
    };

    this.currentUtterance = utterance;
    this.notifyState();
    window.speechSynthesis.speak(utterance);
    return true;
  }

  pauseSpeaking() {
    if (this.isTTSSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.notifyState();
    }
  }

  resumeSpeaking() {
    if (this.isTTSSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.notifyState();
    }
  }

  stopSpeaking() {
    if (this.isTTSSupported()) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.activeSpeakingMessageId = null;
      this.notifyState();
    }
  }

  isSpeaking(): boolean {
    return Boolean(typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking);
  }

  isSpeakingMessage(messageId: string): boolean {
    return this.isSpeaking() && this.activeSpeakingMessageId === messageId;
  }

  isPaused(): boolean {
    return Boolean(typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused);
  }

  getActiveSpeakingMessageId(): string | null {
    return this.activeSpeakingMessageId;
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  // ==================== STATE SUBSCRIBERS ====================

  subscribe(listener: (state: { isListening: boolean; isSpeaking: boolean; activeMsgId: string | null }) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyState() {
    const state = {
      isListening: this.isListening(),
      isSpeaking: this.isSpeaking(),
      activeMsgId: this.activeSpeakingMessageId,
    };
    this.listeners.forEach(l => l(state));
  }
}

export const voiceService = new VoiceService();
