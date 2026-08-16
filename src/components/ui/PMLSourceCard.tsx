import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import type { WebSourceCitation } from '../../types/pml';

interface PMLSourceCardProps {
  source: WebSourceCitation;
  index: number;
}

export const PMLSourceCard: React.FC<PMLSourceCardProps> = ({ source, index }) => {
  let hostname = '';
  try {
    hostname = new URL(source.url).hostname.replace('www.', '');
  } catch {
    hostname = source.source || 'Web Source';
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group relative flex items-start gap-2.5 p-2.5 rounded-xl
        bg-[#0f091f]/75 hover:bg-[#1a0e36]/90
        border border-cyan-500/30 hover:border-cyan-400/80
        shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.3)]
        backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5
        max-w-xs cursor-pointer text-left
      "
      title={source.snippet || source.title}
    >
      <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex-shrink-0 group-hover:scale-105 transition-transform">
        <Globe className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400 truncate">
            {hostname}
          </span>
          <span className="text-[9px] font-mono text-cyan-500/80">#{index + 1}</span>
        </div>
        <p className="text-xs font-semibold text-white/95 group-hover:text-cyan-200 line-clamp-1 transition-colors mt-0.5">
          {source.title}
        </p>
        {source.snippet && (
          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
            {source.snippet}
          </p>
        )}
      </div>

      <ExternalLink className="w-3 h-3 text-cyan-400/60 group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-1" />
    </a>
  );
};
