import React from 'react';
import { FileText, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import type { Attachment } from '../../types/pml';

interface PMLFileCardProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  isAnalyzed?: boolean;
}

export const PMLFileCard: React.FC<PMLFileCardProps> = ({
  attachment,
  onRemove,
  isAnalyzed = true,
}) => {
  const isImage = attachment.type === 'image';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="
        relative flex items-center gap-3 p-2.5 rounded-xl
        bg-[#110822]/80 hover:bg-[#1a0c34]/90
        border border-purple-500/35 hover:border-purple-400/70
        shadow-[0_4px_16px_rgba(0,0,0,0.6)]
        backdrop-blur-xl transition-all duration-200
        max-w-xs select-none
      "
    >
      {isImage && attachment.previewUrl ? (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-purple-400/50 flex-shrink-0 bg-black/60 shadow-sm">
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 flex-shrink-0">
          {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/95 truncate font-mono">
          {attachment.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-purple-300">
            {formatFileSize(attachment.size)}
          </span>
          {isAnalyzed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-sans text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Ready</span>
            </span>
          )}
        </div>
      </div>

      {onRemove && (
        <button
          onClick={() => onRemove(attachment.id)}
          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          title="Remove attachment"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
