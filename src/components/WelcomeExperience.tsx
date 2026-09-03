import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus,
  Brain,
  Mic,
  MicOff,
  AudioLines,
  ArrowUp,
  Image as ImageIcon,
  Paperclip,
  Sparkles,
  X
} from 'lucide-react';
import type { Attachment, DocumentItem } from '../types/pml';
import { voiceService } from '../services/voiceService';

interface WelcomeExperienceProps {
  activeConversationId?: string | null;
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
  speechLanguage?: string;
  isStreaming?: boolean;
  onStopGeneration?: () => void;
  onOpenMemory?: () => void;
}

const GREETINGS = [
  "Where should we begin?",
  "Welcome to PML",
  "Let's get started",
  "What would you like to explore today?",
  "How can PML help you today?",
  "What's on your mind today?",
  "Ask anything to begin",
  "Ready when you are",
];

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ 
  activeConversationId,
  onSendMessage,
  onUploadDocument,
  selectedDocument,
  onClearDocumentScope,
  speechLanguage = 'en-US',
}) => {
  const [greeting, setGreeting] = useState(() => {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  });
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [thinkMode, setThinkMode] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

  // Rotate greeting whenever a new chat or new conversation is started
  useEffect(() => {
    setGreeting(prev => {
      const candidates = GREETINGS.filter(g => g !== prev);
      return candidates[Math.floor(Math.random() * candidates.length)] || GREETINGS[0];
    });
  }, [activeConversationId]);

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed && attachedFiles.length === 0) return;
    if (onSendMessage) {
      const finalMsg = thinkMode ? `[Think Deeply] ${trimmed}` : trimmed;
      onSendMessage(finalMsg, attachedFiles);
      setInput('');
      setAttachedFiles([]);
    }
  };

  const handleToggleVoice = async () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
      return;
    }

    if (!voiceService.isSTTSupported()) {
      alert("Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const started = await voiceService.startListening({
      lang: speechLanguage,
      onStart: () => setIsRecording(true),
      onResult: (finalText) => {
        setInput(prev => (prev ? `${prev.trim()} ${finalText.trim()}` : finalText.trim()));
      },
      onError: () => setIsRecording(false),
      onEnd: () => setIsRecording(false),
    });

    if (!started) setIsRecording(false);
  };

  return (
    <section className="relative w-full min-h-[calc(100vh-64px)] h-full flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-12 overflow-hidden select-none py-6">
      {/* Background Glowing Ambient Arch / Dome (clean glow without dashed border lines) */}
      <div className="hero-glow-backdrop">
        <div className="hero-radial-dome" />
        <div className="hero-radial-dome-outer" />
      </div>

      {/* 3D Glossy Translucent Green Spheres framing the Full-Screen Hero */}
      <div className="glass-sphere glass-sphere-left-1 hidden sm:block opacity-40" />
      <div className="glass-sphere glass-sphere-left-2 hidden md:block opacity-30" />
      <div className="glass-sphere glass-sphere-right-1 hidden sm:block opacity-40" />
      <div className="glass-sphere glass-sphere-right-2 hidden md:block opacity-30" />

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            setAttachedFiles(prev => [...prev, {
              id: `att_${Date.now()}`,
              name: file.name,
              size: file.size,
              type: 'image',
              mimeType: file.type,
              previewUrl: reader.result as string,
            }]);
          };
          reader.readAsDataURL(file);
        }}
      />
      <input
        type="file"
        ref={docInputRef}
        className="hidden"
        accept=".pdf,.docx,.txt,.csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (onUploadDocument) {
            await onUploadDocument(file);
          }
        }}
      />

      {/* Main Centered Content Container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center -translate-y-4">
        {/* Dynamic Greeting Message */}
        <h1 className="welcome-greeting-text text-2xl sm:text-3xl md:text-[34px] font-normal tracking-normal mb-7 select-text transition-all duration-300">
          {greeting}
        </h1>

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3.5">
            {attachedFiles.map(att => (
              <div key={att.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e1f20] dark:bg-[#1e1f20] bg-gray-100 border border-white/15 dark:border-white/15 border-black/10 text-xs text-white/90 dark:text-white/90 text-gray-800">
                <span className="truncate max-w-[180px]">{att.name}</span>
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== att.id))}
                  className="hover:text-rose-400 text-slate-400 cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Scoped Document Pill */}
        {selectedDocument && (
          <div className="mb-3.5 flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1e1f20] dark:bg-[#1e1f20] bg-emerald-50 border border-[rgba(180,255,100,0.3)] dark:border-[rgba(180,255,100,0.3)] border-emerald-300 text-xs text-[#9CFF45] dark:text-[#9CFF45] text-emerald-800">
            <span>📄 {selectedDocument.file_name}</span>
            {onClearDocumentScope && (
              <button 
                onClick={onClearDocumentScope}
                className="hover:text-white dark:hover:text-white text-slate-400 ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PILL SEARCH BOX (Matching Reference Layout & Size) */}
        {/* ========================================================================= */}
        <form 
          onSubmit={handleSubmit}
          className="search-pill-container w-full"
        >
          {/* Plus / Attach Action Menu */}
          <div className="relative flex items-center" ref={plusMenuRef}>
            <button
              type="button"
              onClick={() => setShowPlusMenu(prev => !prev)}
              className="p-1.5 rounded-full text-[#A8B0A5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              title="Add attachment"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>

            {showPlusMenu && (
              <div className="absolute bottom-full left-0 mb-3.5 w-64 p-2.5 rounded-2xl bg-[#1e1f20]/95 dark:bg-[#1e1f20]/95 bg-white border border-white/15 dark:border-white/15 border-black/10 shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn text-xs flex flex-col gap-2.5 text-left">
                {/* Create AI Image */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setInput('Create an image of ');
                    inputRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] bg-black/[0.03] hover:bg-[#9CFF45]/15 border border-white/5 dark:border-white/5 border-black/5 hover:border-[#9CFF45]/35 transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white dark:text-white text-gray-900">Create AI Image</div>
                    <div className="text-[11px] text-[#A8B0A5] dark:text-[#A8B0A5] text-gray-500">Logos, 3D renders, artwork</div>
                  </div>
                </button>

                {/* Upload Image for Vision */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] bg-black/[0.03] hover:bg-[#9CFF45]/15 border border-white/5 dark:border-white/5 border-black/5 hover:border-[#9CFF45]/35 transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white dark:text-white text-gray-900">Upload Image</div>
                    <div className="text-[11px] text-[#A8B0A5] dark:text-[#A8B0A5] text-gray-500">Visual diagrams, screenshots</div>
                  </div>
                </button>

                {/* Upload Document for RAG */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    docInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] bg-black/[0.03] hover:bg-[#9CFF45]/15 border border-white/5 dark:border-white/5 border-black/5 hover:border-[#9CFF45]/35 transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white dark:text-white text-gray-900">Upload Document</div>
                    <div className="text-[11px] text-[#A8B0A5] dark:text-[#A8B0A5] text-gray-500">PDF, DOCX, TXT files</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Main Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isRecording 
                ? "Listening..." 
                : "Ask anything"
            }
            className="search-pill-input"
          />

          {/* Clear Input Button */}
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              className="p-1 mr-1 rounded-full text-[#758072] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Right Controls with distinct spacing between Think and Voice buttons */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Think Toggle Pill Button */}
            <button
              type="button"
              onClick={() => setThinkMode(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                thinkMode 
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                  : 'text-[#A8B0A5] hover:text-white hover:bg-white/10 border border-transparent'
              }`}
              title="Toggle Deep Reasoning / Think Mode"
            >
              <Brain className="w-4 h-4 opacity-80" />
              <span className="text-[13px]">Think</span>
            </button>

            {/* Microphone / Voice Icon Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                isRecording 
                  ? 'text-rose-400 bg-rose-500/20 animate-pulse ring-1 ring-rose-400' 
                  : 'text-[#A8B0A5] hover:text-white hover:bg-white/10'
              }`}
              title="Voice Input"
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-300" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Blue Circular Action Button */}
            <button
              type="submit"
              className="search-pill-action-btn"
              title={input.trim() ? "Send query" : "Voice waveform"}
            >
              {input.trim() ? (
                <ArrowUp className="w-4 h-4 text-white stroke-[2.5]" />
              ) : (
                <AudioLines className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

