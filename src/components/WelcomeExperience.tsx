import React from 'react';
import { 
  Compass, 
  Puzzle, 
  Code2, 
  FileText 
} from 'lucide-react';
import type { QuickAction, Attachment } from '../types/pml';
import { PMLCore } from './PMLCore';
import { MessageComposer } from './MessageComposer';

interface WelcomeExperienceProps {
  onSelectQuickAction: (action: QuickAction) => void;
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explore-concept',
    title: 'Explore Concepts',
    description: 'Quantum physics, science, or AI theory.',
    iconName: 'Compass',
    prompt: 'Explain the fundamental principles of quantum computing and superpositions in simple terms.',
    category: 'Learning',
    gradient: 'from-red-950/50 via-black/90 to-red-900/40 border-red-500/30',
  },
  {
    id: 'solve-problem',
    title: 'Solve Problems',
    description: 'Deconstruct complex algorithms & architecture.',
    iconName: 'Puzzle',
    prompt: 'Help me solve a systemic performance bottleneck in a high-throughput microservices architecture.',
    category: 'Engineering',
    gradient: 'from-rose-950/50 via-black/90 to-red-950/40 border-rose-500/30',
  },
  {
    id: 'write-code',
    title: 'Write Code',
    description: 'TypeScript, Python, Rust, or C++ snippets.',
    iconName: 'Code2',
    prompt: 'Write a clean, fully-typed TypeScript module for an async event emitter with generic payload support.',
    category: 'Coding',
    gradient: 'from-red-900/50 via-black/90 to-rose-950/40 border-red-500/30',
  },
  {
    id: 'analyze-document',
    title: 'Analyze Data',
    description: 'Extract insights from PDF & CSV files.',
    iconName: 'FileText',
    prompt: 'How do I analyze attached PDF/CSV data for trend extraction and automatic summary generation?',
    category: 'Analysis',
    gradient: 'from-red-950/50 via-black/90 to-red-900/40 border-red-500/30',
  },
];

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ 
  onSelectQuickAction,
  onSendMessage,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Compass': return <Compass className="w-5 h-5 text-red-400" />;
      case 'Puzzle': return <Puzzle className="w-5 h-5 text-rose-400" />;
      case 'Code2': return <Code2 className="w-5 h-5 text-red-400" />;
      case 'FileText': return <FileText className="w-5 h-5 text-red-300" />;
      default: return <Compass className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center p-6 md:p-10 py-8 md:py-14 my-auto">
      {/* SECTION 1: LOGO & BRANDING HEADER */}
      <div className="flex flex-col items-center mb-12 md:mb-16 pb-8 border-b border-red-500/30 w-full max-w-3xl">
        <div className="mb-5 animate-float">
          <PMLCore size="medium" state="idle" />
        </div>

        <h1 className="font-display font-black text-5xl md:text-7xl tracking-wider text-gradient-red mb-3 drop-shadow-[0_0_25px_rgba(255,0,60,0.4)]">
          PML AI
        </h1>

        <p className="font-heading font-bold text-xs md:text-sm tracking-widest text-red-300 uppercase bg-red-950/70 px-5 py-1.5 rounded-full border border-red-500/50 inline-block shadow-[0_0_20px_rgba(255,0,60,0.2)]">
          ADVANCED SPACE INTERFACE • EXPLORE • ASK • CREATE
        </p>
      </div>

      {/* SECTION 2: PROMINENT SEPARATED SEARCH ENGINE */}
      <div className="w-full my-10 md:my-14 max-w-4xl py-2">
        <div className="text-left mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(255,0,60,0.9)]" />
          <span className="font-mono text-xs md:text-sm text-red-400 uppercase tracking-widest font-semibold">
            Neural Search Engine
          </span>
        </div>
        {onSendMessage ? (
          <MessageComposer
            onSendMessage={onSendMessage}
            isStreaming={false}
          />
        ) : (
          <div className="w-full p-4 rounded-2xl glitter-glass-search text-slate-300 text-base">
            Search or ask PML AI anything...
          </div>
        )}
      </div>

      {/* SECTION 3: SEPARATED 4 GLITTERING GLASS ACTION BOXES */}
      <div className="w-full max-w-4xl mt-12 md:mt-16 pt-8 border-t border-red-500/30">
        <div className="text-left mb-5 flex items-center gap-2">
          <span className="font-mono text-xs md:text-sm text-slate-400 uppercase tracking-widest font-semibold">
            Quick Prompt Templates
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 w-full text-left">
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.id}
              onClick={() => onSelectQuickAction(action)}
              className={`group p-5 rounded-2xl glitter-glass-panel bg-gradient-to-br ${action.gradient} cursor-pointer flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="p-2 rounded-xl bg-black/80 border border-red-500/40 group-hover:scale-105 group-hover:border-red-500 transition-all shadow-[0_0_10px_rgba(255,0,60,0.25)]">
                    {getIcon(action.iconName)}
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider text-red-200 bg-red-950/90 px-2 py-0.5 rounded-md border border-red-500/40 font-semibold">
                    {action.category}
                  </span>
                </div>
                <h3 className="font-display font-bold text-sm md:text-base text-white group-hover:text-red-400 transition-colors mb-1.5 truncate">
                  {action.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-300 group-hover:text-slate-100 transition-colors line-clamp-2 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="mt-3.5 flex items-center gap-1.5 text-xs text-red-400 font-bold uppercase tracking-wider font-display group-hover:translate-x-1 transition-transform">
                <span>Try prompt</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


