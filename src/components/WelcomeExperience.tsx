import React, { useState, useRef } from 'react';
import { 
  Search,
  Image as ImageIcon, 
  Paperclip,
  Mic,
  MicOff,
  X
} from 'lucide-react';
import type { Attachment, DocumentItem } from '../types/pml';
import { voiceService } from '../services/voiceService';

interface WelcomeExperienceProps {
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

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ 
  onSendMessage,
  onUploadDocument,
  speechLanguage = 'en-US',
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;
    if (onSendMessage) {
      onSendMessage(input.trim(), attachedFiles);
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
    <section className="relative w-full h-[calc(100vh-64px)] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-12 overflow-hidden select-none">
      {/* Background Glowing Arch / Dome */}
      <div className="hero-glow-backdrop">
        <div className="hero-radial-dome" />
        <div className="hero-radial-dome-outer" />
      </div>

      {/* 3D Glossy Translucent Green Spheres framing the Full-Screen Hero */}
      <div className="glass-sphere glass-sphere-left-1 hidden sm:block" />
      <div className="glass-sphere glass-sphere-left-2 hidden md:block" />
      <div className="glass-sphere glass-sphere-right-1 hidden sm:block" />
      <div className="glass-sphere glass-sphere-right-2 hidden md:block" />

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

      {/* Main Centered Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* Main Heading: Welcome to PML */}
        <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-[76px] text-white tracking-tight leading-[1.08] mb-8 drop-shadow-sm">
          Welcome to <span className="text-[#9CFF45]">PML</span>
        </h1>

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {attachedFiles.map(att => (
              <div key={att.id} className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#122814] border border-[rgba(180,255,100,0.3)] text-xs text-[#9CFF45]">
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

        {/* ========================================================================= */}
        {/* CSS SEARCH BOX (FreeFrontend "Search Input" Style) */}
        {/* ========================================================================= */}
        <form 
          onSubmit={handleSubmit}
          className="mubanga-search-container w-full"
        >
          {/* Main Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isRecording 
                ? "Listening to voice speech..." 
                : "Search something with PML..."
            }
            className="mubanga-search-input"
          />

          {/* Clear Input Button */}
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              className="p-1.5 mr-1 rounded-full text-[#758072] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Quick Voice / File Tools */}
          <div className="flex items-center gap-0.5 mr-1.5">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isRecording 
                  ? 'text-rose-400 bg-rose-500/20 animate-pulse' 
                  : 'text-[#A8B0A5] hover:text-[#9CFF45] hover:bg-white/5'
              }`}
              title="Voice Input (Speech-to-Text)"
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-300" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-[#A8B0A5] hover:text-[#9CFF45] hover:bg-white/5 transition-colors cursor-pointer"
              title="Attach Image (Vision AI)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="p-2 rounded-full text-[#A8B0A5] hover:text-[#9CFF45] hover:bg-white/5 transition-colors cursor-pointer"
              title="Attach Document (PDF, DOCX)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="mubanga-search-btn"
            title="Search with PML"
          >
            <span>Search</span>
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
};
