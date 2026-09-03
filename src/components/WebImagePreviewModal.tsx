import React, { useEffect } from 'react';
import { X, ExternalLink, Globe, Camera } from 'lucide-react';
import type { WebImageResult } from '../types/pml';
import { getProxiedImageUrl } from '../utils/imageUtils';

interface WebImagePreviewModalProps {
  image: WebImageResult | null;
  onClose: () => void;
}

export const WebImagePreviewModal: React.FC<WebImagePreviewModalProps> = ({ image, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  const displayTitle = image.title || 'Web Photograph';
  const displaySource = image.source_name || 'Web Source';
  const highResUrl = image.image_url || image.thumbnail_url;
  const proxiedHighRes = getProxiedImageUrl(highResUrl);
  const originalPageUrl = image.source_url || highResUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-[#0a150b] border border-[rgba(180,255,100,0.3)] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#071308]">
          <div className="flex items-center gap-2">
            <span className="bg-[#122814] text-[#9CFF45] text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded border border-[#9CFF45]/30 flex items-center gap-1 font-semibold">
              <Camera className="w-3 h-3 text-[#9CFF45]" />
              Real Web Photo
            </span>
            <span className="text-xs text-white/80 font-medium truncate max-w-sm sm:max-w-md">
              {displayTitle}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A8B0A5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Display Area */}
        <div className="flex-1 min-h-[250px] max-h-[68vh] bg-black/60 flex items-center justify-center p-3 overflow-hidden">
          <img
            src={proxiedHighRes}
            alt={displayTitle}
            referrerPolicy="no-referrer"
            className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Footer with Source & Attribution */}
        <div className="px-4 py-3 border-t border-white/10 bg-[#071308] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#A8B0A5]">
            <Globe className="w-3.5 h-3.5 text-[#9CFF45]" />
            <span>Source:</span>
            <span className="text-white font-medium">{displaySource}</span>
          </div>

          <a
            href={originalPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-lime px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.25)] hover:shadow-[0_0_20px_rgba(156,255,69,0.4)]"
          >
            <span>View original</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
