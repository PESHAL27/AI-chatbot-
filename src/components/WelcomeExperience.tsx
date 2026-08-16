import React from 'react';
import { 
  Code2, 
  Sparkles,
  Globe,
  Camera
} from 'lucide-react';
import type { QuickAction, Attachment, DocumentItem } from '../types/pml';
import { PMLCore } from './PMLCore';
import { MessageComposer } from './MessageComposer';

interface WelcomeExperienceProps {
  onSelectQuickAction?: (action: QuickAction) => void;
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
  speechLanguage?: string;
}

const PROMPT_CHIPS = [
  { label: 'Explain quantum mechanics', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />, prompt: 'Explain the core principles of quantum mechanics simply.' },
  { label: 'Find errors in Java code', icon: <Code2 className="w-3.5 h-3.5 text-indigo-400" />, prompt: 'What are the most common concurrency pitfalls in modern Java?' },
  { label: 'Search latest AI news', icon: <Globe className="w-3.5 h-3.5 text-cyan-400" />, prompt: 'What are the latest AI and LLM developments this month?' },
  { label: 'Inspect code screenshot', icon: <Camera className="w-3.5 h-3.5 text-pink-400" />, prompt: 'How do I upload an image to find bugs in my code screenshot?' },
];

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ 
  onSendMessage,
  selectedDocument,
  onClearDocumentScope,
  onOpenDocumentLibrary,
  onUploadDocument,
  speechLanguage = 'en-US'
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center p-6 md:p-10 py-8 md:py-12 my-auto">
      {/* SECTION 1: LOGO & BRANDING HEADER */}
      <div className="flex flex-col items-center mb-6 md:mb-8 pb-6 border-b border-white/10 w-full max-w-3xl">
        <div className="mb-4 animate-float">
          <PMLCore size="large" state="idle" />
        </div>

        <h1 className="font-display font-black text-5xl md:text-7xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 mb-2 drop-shadow-[0_0_35px_rgba(168,85,247,0.5)]">
          PML AI
        </h1>

        <p className="font-sans font-bold text-xs md:text-sm tracking-widest text-purple-200 uppercase bg-[#0d071a]/80 px-6 py-2 rounded-full border border-purple-500/40 inline-flex items-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] backdrop-blur-xl">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>ADVANCED COSMIC INTELLIGENCE SYSTEM</span>
        </p>

        {/* Interactive Holographic Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-2xl">
          {PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage && onSendMessage(chip.prompt, [])}
              className="
                inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl
                bg-[#120a22]/70 hover:bg-[#1f1038]/90
                border border-purple-500/30 hover:border-purple-400/70
                text-xs font-sans text-purple-200 hover:text-white
                shadow-[0_2px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_18px_rgba(168,85,247,0.35)]
                backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5
                cursor-pointer
              "
            >
              {chip.icon}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: PROMINENT COMMAND CONSOLE */}
      <div className="w-full my-4 max-w-3xl py-2">
        <div className="text-left mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
            <span className="font-mono text-xs text-cyan-300 uppercase tracking-widest font-semibold">
              Neural Command & Search
            </span>
          </div>

          {onOpenDocumentLibrary && (
            <button
              onClick={onOpenDocumentLibrary}
              className="text-xs text-violet-300 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-950/40 border border-violet-500/30 hover:bg-violet-900/50 hover:border-violet-400 transition-all font-mono cursor-pointer"
            >
              <span>📚</span>
              <span>Document Library (RAG)</span>
            </button>
          )}
        </div>

        {onSendMessage && (
          <MessageComposer
            onSendMessage={onSendMessage}
            isStreaming={false}
            selectedDocument={selectedDocument}
            onClearDocumentScope={onClearDocumentScope}
            onOpenDocumentLibrary={onOpenDocumentLibrary}
            onUploadDocument={onUploadDocument}
            speechLanguage={speechLanguage}
          />
        )}
      </div>
    </div>
  );
};
