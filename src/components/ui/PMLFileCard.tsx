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
        relative flex items-center gap-3 p-2.5 rounded-2xl
        bg-[#0a180b]/85 hover:bg-[#102412]/95
        border border-[rgba(180,255,100,0.2)] hover:border-[rgba(180,255,100,0.45)]
        shadow-[0_4px_16px_rgba(0,0,0,0.6)]
        backdrop-blur-xl transition-all duration-200
        max-w-xs select-none
      "
    >
      {isImage && attachment.previewUrl ? (
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#9CFF45]/40 flex-shrink-0 bg-black/60 shadow-sm">
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="p-2 rounded-xl bg-[#122814] border border-[rgba(180,255,100,0.3)] text-[#9CFF45] flex-shrink-0">
          {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">
          {attachment.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-[#A8B0A5]">
            {formatFileSize(attachment.size)}
          </span>
          {isAnalyzed && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#9CFF45]">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Ready</span>
            </span>
          )}
        </div>
      </div>

      {onRemove && (
        <button
          onClick={() => onRemove(attachment.id)}
          className="p-1 rounded-lg hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 transition-colors cursor-pointer"
          title="Remove attachment"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
