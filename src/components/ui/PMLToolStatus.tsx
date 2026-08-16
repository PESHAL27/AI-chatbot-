import React from 'react';
import { Globe, Calculator, BookOpen, Eye, Mic, Brain, CheckCircle2 } from 'lucide-react';

export type ToolType = 'web_search' | 'calculator' | 'rag' | 'vision' | 'voice' | 'memory';

interface PMLToolStatusProps {
  tool: ToolType | string;
  status?: 'active' | 'completed';
  customLabel?: string;
  className?: string;
}

export const PMLToolStatus: React.FC<PMLToolStatusProps> = ({
  tool,
  status = 'completed',
  customLabel,
  className = '',
}) => {
  const getToolConfig = () => {
    switch (tool) {
      case 'web_search':
        return {
          icon: <Globe className="w-3.5 h-3.5 text-cyan-400" />,
          label: customLabel || 'Web Intelligence Retrieved',
          badge: 'Search',
          borderColor: 'border-cyan-500/40',
          bgColor: 'bg-cyan-950/40',
          textColor: 'text-cyan-200',
          glow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]',
        };
      case 'calculator':
        return {
          icon: <Calculator className="w-3.5 h-3.5 text-emerald-400" />,
          label: customLabel || 'Mathematical Computation',
          badge: 'Calculated',
          borderColor: 'border-emerald-500/40',
          bgColor: 'bg-emerald-950/40',
          textColor: 'text-emerald-200',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
        };
      case 'rag':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-violet-400" />,
          label: customLabel || 'Document Knowledge Extracted',
          badge: 'RAG',
          borderColor: 'border-violet-500/40',
          bgColor: 'bg-violet-950/40',
          textColor: 'text-violet-200',
          glow: 'shadow-[0_0_12px_rgba(139,92,246,0.25)]',
        };
      case 'vision':
        return {
          icon: <Eye className="w-3.5 h-3.5 text-pink-400" />,
          label: customLabel || 'Visual Image Inspected',
          badge: 'Vision',
          borderColor: 'border-pink-500/40',
          bgColor: 'bg-pink-950/40',
          textColor: 'text-pink-200',
          glow: 'shadow-[0_0_12px_rgba(236,72,153,0.25)]',
        };
      case 'voice':
        return {
          icon: <Mic className="w-3.5 h-3.5 text-rose-400" />,
          label: customLabel || 'Speech Transcription Processed',
          badge: 'Voice',
          borderColor: 'border-rose-500/40',
          bgColor: 'bg-rose-950/40',
          textColor: 'text-rose-200',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
        };
      case 'memory':
      default:
        return {
          icon: <Brain className="w-3.5 h-3.5 text-purple-400" />,
          label: customLabel || 'Long-Term Memory Recalled',
          badge: 'Memory',
          borderColor: 'border-purple-500/40',
          bgColor: 'bg-purple-950/40',
          textColor: 'text-purple-200',
          glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
        };
    }
  };

  const config = getToolConfig();

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1 rounded-xl
        border ${config.borderColor} ${config.bgColor} ${config.glow}
        backdrop-blur-md text-xs transition-all animate-fadeIn
        ${className}
      `}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      <span className={`font-mono text-[11px] font-semibold ${config.textColor}`}>
        {config.label}
      </span>
      {status === 'completed' && (
        <CheckCircle2 className="w-3 h-3 text-white/50 ml-0.5 flex-shrink-0" />
      )}
    </div>
  );
};
