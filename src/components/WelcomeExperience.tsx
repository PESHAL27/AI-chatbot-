import React from 'react';
import { 
  Lightbulb, 
  Code2, 
  FileText, 
  Globe, 
  ArrowUpRight
} from 'lucide-react';
import type { Attachment } from '../types/pml';
import { PMLCore } from './PMLCore';

interface WelcomeExperienceProps {
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
  onOpenDocumentLibrary?: () => void;
}

interface SuggestionCard {
  id: string;
  title: string;
  desc: string;
  prompt: string;
  icon: React.ReactNode;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ 
  onSendMessage,
  onOpenDocumentLibrary
}) => {
  const SUGGESTION_CARDS: SuggestionCard[] = [
    {
      id: 'concept',
      title: 'Explain a concept',
      desc: 'Quantum computing, neural networks, or astrophysics',
      prompt: 'Explain the core principles of quantum computing and neural networks in simple terms.',
      icon: <Lightbulb className="w-4 h-4 text-purple-400" />
    },
    {
      id: 'code',
      title: 'Write or improve code',
      desc: 'TypeScript, Python, C++, or Java concurrency',
      prompt: 'Write a clean, production-ready TypeScript async event bus with generic type safety.',
      icon: <Code2 className="w-4 h-4 text-indigo-400" />
    },
    {
      id: 'document',
      title: 'Analyze a document',
      desc: 'Upload PDFs, extract insights, and query research',
      prompt: 'How do I query uploaded research papers and PDFs for key findings and summary tables?',
      icon: <FileText className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'search',
      title: 'Search latest information',
      desc: 'Real-time AI research, facts, and live web data',
      prompt: 'What are the most significant AI and LLM breakthrough updates this month?',
      icon: <Globe className="w-4 h-4 text-pink-400" />
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center px-4 py-8 md:py-12 my-auto">
      {/* Compact Welcome Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="mb-3">
          <PMLCore size="medium" state="idle" />
        </div>

        <h1 className="font-sans font-bold text-2xl md:text-3xl text-white tracking-tight mb-1">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500">PML AI</span>
        </h1>

        <p className="font-sans text-sm text-slate-400">
          How can I help you today?
        </p>
      </div>

      {/* 4 Compact Suggestion Cards Grid (2x2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left max-w-2xl">
        {SUGGESTION_CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => {
              if (card.id === 'document' && onOpenDocumentLibrary) {
                onOpenDocumentLibrary();
              } else if (onSendMessage) {
                onSendMessage(card.prompt, []);
              }
            }}
            className="
              group p-3.5 rounded-2xl
              bg-[#0e081e]/70 hover:bg-[#180e30]/90
              border border-purple-500/20 hover:border-purple-400/50
              shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_25px_rgba(139,92,246,0.25)]
              backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5
              cursor-pointer flex items-start justify-between gap-3 text-left
            "
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 group-hover:border-purple-400/50 transition-colors">
                  {card.icon}
                </div>
                <h3 className="font-sans font-semibold text-xs text-white group-hover:text-purple-200 transition-colors">
                  {card.title}
                </h3>
              </div>
              <p className="font-sans text-[11px] text-slate-400 leading-snug line-clamp-2 pl-0.5">
                {card.desc}
              </p>
            </div>

            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300 transition-colors flex-shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
};
