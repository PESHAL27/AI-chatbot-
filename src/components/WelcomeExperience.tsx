import React from 'react';
import { 
  Code2, 
  Globe, 
  Camera,
  Sparkles
} from 'lucide-react';
import type { Attachment, DocumentItem } from '../types/pml';
import { MessageComposer } from './MessageComposer';

interface WelcomeExperienceProps {
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
  speechLanguage?: string;
  isStreaming?: boolean;
  onStopGeneration?: () => void;
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
  speechLanguage = 'en-US',
  isStreaming = false,
  onStopGeneration,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center px-4 pt-6 md:pt-10 pb-8 my-auto">
      {/* Welcome Header (Elevated Higher) */}
      <div className="flex flex-col items-center mb-10 md:mb-16">
        <h1 className="font-sans font-bold text-3xl md:text-5xl text-white tracking-tight mb-3">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]">PML AI</span>
        </h1>

        <p className="font-sans text-sm md:text-base text-slate-400">
          How can I help you today?
        </p>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-2xl">
          {PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage && onSendMessage(chip.prompt, [])}
              className="
                inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl
                bg-[#120a22]/70 hover:bg-[#1f1038]/90
                border border-purple-500/30 hover:border-purple-400/60
                text-xs font-sans text-purple-200 hover:text-white
                shadow-[0_2px_10px_rgba(0,0,0,0.4)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]
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

      {/* Centered Search / Command Console with Increased Distance */}
      <div className="w-full max-w-3xl mt-2 mb-4">
        {onSendMessage && (
          <MessageComposer
            onSendMessage={onSendMessage}
            isStreaming={isStreaming}
            onStopGeneration={onStopGeneration}
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
