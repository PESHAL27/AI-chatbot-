import React from 'react';
import { Globe, Calculator, BookOpen, Eye, Mic, Brain, CheckCircle2, Sparkles } from 'lucide-react';

export type ToolType = 'web_search' | 'calculator' | 'rag' | 'vision' | 'voice' | 'memory' | 'wikipedia_search' | 'wikipedia' | 'generate_image' | 'image_generation';

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
      case 'generate_image':
      case 'image_generation':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'AI Image Generated',
          badge: 'Image Gen',
          borderColor: 'border-[rgba(180,255,100,0.35)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_15px_rgba(156,255,69,0.2)]',
        };
      case 'wikipedia_search':
      case 'wikipedia':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Wikipedia Knowledge Retrieved',
          badge: 'Wikipedia',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
      case 'web_search':
        return {
          icon: <Globe className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Web Intelligence Retrieved',
          badge: 'Search',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
      case 'calculator':
        return {
          icon: <Calculator className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Mathematical Computation',
          badge: 'Calculated',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
      case 'rag':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Document Knowledge Extracted',
          badge: 'RAG',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
      case 'vision':
        return {
          icon: <Eye className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Visual Image Inspected',
          badge: 'Vision',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
      case 'voice':
        return {
          icon: <Mic className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Speech Transcription Processed',
          badge: 'Voice',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
      case 'memory':
      default:
        return {
          icon: <Brain className="w-3.5 h-3.5 text-[#9CFF45]" />,
          label: customLabel || 'Long-Term Memory Recalled',
          badge: 'Memory',
          borderColor: 'border-[rgba(180,255,100,0.25)]',
          bgColor: 'bg-[#0a180b]/90',
          textColor: 'text-white',
          glow: 'shadow-[0_0_12px_rgba(156,255,69,0.15)]',
        };
    }
  };

  const config = getToolConfig();

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        border ${config.borderColor} ${config.bgColor} ${config.glow}
        backdrop-blur-md text-xs transition-all animate-fadeIn
        ${className}
      `}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      <span className={`text-[12px] font-medium ${config.textColor}`}>
        {config.label}
      </span>
      {status === 'completed' && (
        <CheckCircle2 className="w-3.5 h-3.5 text-[#9CFF45] ml-0.5 flex-shrink-0" />
      )}
    </div>
  );
};
