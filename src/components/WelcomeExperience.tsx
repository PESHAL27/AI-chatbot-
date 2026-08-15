import React from 'react';
import { 
  Compass, 
  Puzzle, 
  Code2, 
  FileText,
  Sparkles,
  ArrowRight
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
    description: 'Quantum physics, deep astrophysics, or AI logic.',
    iconName: 'Compass',
    prompt: 'Explain the fundamental principles of quantum computing and superpositions in simple terms.',
    category: 'Learning',
    gradient: 'from-purple-950/40 via-black/80 to-blue-950/40 border-purple-500/30',
  },
  {
    id: 'solve-problem',
    title: 'Solve Problems',
    description: 'Deconstruct complex algorithms & system design.',
    iconName: 'Puzzle',
    prompt: 'Help me solve a systemic performance bottleneck in a high-throughput microservices architecture.',
    category: 'Engineering',
    gradient: 'from-blue-950/40 via-black/80 to-indigo-950/40 border-blue-500/30',
  },
  {
    id: 'write-code',
    title: 'Write Code',
    description: 'TypeScript, Python, Rust, or C++ snippets.',
    iconName: 'Code2',
    prompt: 'Write a clean, fully-typed TypeScript module for an async event emitter with generic payload support.',
    category: 'Coding',
    gradient: 'from-indigo-950/40 via-black/80 to-purple-950/40 border-indigo-500/30',
  },
  {
    id: 'analyze-document',
    title: 'Analyze Data',
    description: 'Extract insights from PDF & CSV files.',
    iconName: 'FileText',
    prompt: 'How do I analyze attached PDF/CSV data for trend extraction and automatic summary generation?',
    category: 'Analysis',
    gradient: 'from-cyan-950/40 via-black/80 to-blue-950/40 border-cyan-500/30',
  },
];

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ 
  onSelectQuickAction,
  onSendMessage,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Compass': return <Compass className="w-5 h-5 text-purple-400" />;
      case 'Puzzle': return <Puzzle className="w-5 h-5 text-blue-400" />;
      case 'Code2': return <Code2 className="w-5 h-5 text-indigo-400" />;
      case 'FileText': return <FileText className="w-5 h-5 text-cyan-400" />;
      default: return <Compass className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center p-6 md:p-10 py-8 md:py-14 my-auto">
      {/* SECTION 1: LOGO & BRANDING HEADER */}
      <div className="flex flex-col items-center mb-10 md:mb-14 pb-8 border-b border-white/10 w-full max-w-3xl">
        <div className="mb-5 animate-float">
          <PMLCore size="large" state="idle" />
        </div>

        <h1 className="font-display font-black text-5xl md:text-7xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 mb-3 drop-shadow-[0_0_35px_rgba(168,85,247,0.5)]">
          PLM AI
        </h1>

        <p className="font-heading font-bold text-xs md:text-sm tracking-widest text-purple-200 uppercase bg-black/60 px-6 py-2 rounded-full border border-purple-500/40 inline-flex items-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>ADVANCED SPACE INTERFACE • EXPLORE • ASK • CREATE</span>
        </p>
      </div>

      {/* SECTION 2: PROMINENT SEPARATED SEARCH ENGINE */}
      <div className="w-full my-8 md:my-10 max-w-4xl py-2">
        <div className="text-left mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
          <span className="font-mono text-xs md:text-sm text-cyan-300 uppercase tracking-widest font-semibold">
            Neural Command & Search
          </span>
        </div>
        {onSendMessage ? (
          <MessageComposer
            onSendMessage={onSendMessage}
            isStreaming={false}
          />
        ) : (
          <div className="w-full p-4 rounded-2xl plm-neon-card text-slate-300 text-base">
            Search or ask PLM AI anything...
          </div>
        )}
      </div>

      {/* SECTION 3: SEPARATED 4 NEON GLOWING ACTION BOXES (IMAGE 3 UI DESIGN) */}
      <div className="w-full max-w-4xl mt-10 md:mt-12 pt-8 border-t border-white/10">
        <div className="text-left mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="font-mono text-xs md:text-sm text-slate-300 uppercase tracking-widest font-semibold">
              Select Workspace & Template
            </span>
          </div>
          <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider hidden sm:inline">
            Fast Prompt Accelerator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 w-full text-left">
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.id}
              onClick={() => onSelectQuickAction(action)}
              className="group p-5 rounded-2xl plm-neon-card cursor-pointer flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-200 bg-purple-950/70 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-semibold shadow-sm">
                    {action.category}
                  </span>
                  <div className="p-2 rounded-xl bg-black/60 border border-white/10 group-hover:scale-110 group-hover:border-purple-400 transition-all shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                    {getIcon(action.iconName)}
                  </div>
                </div>
                <h3 className="font-display font-bold text-sm md:text-base text-white group-hover:text-purple-300 transition-colors mb-1.5 truncate">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors line-clamp-2 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-purple-300 font-bold uppercase tracking-wider font-display group-hover:text-white transition-colors">
                <span>Try prompt</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-purple-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
