import React, { useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  RotateCw, 
  Maximize2, 
  Minimize2
} from 'lucide-react';
import type { GeneratedImage } from '../types/pml';

interface ImagePreviewModalProps {
  image: GeneratedImage | null;
  onClose: () => void;
  onRegenerate?: (prompt: string, style?: string, aspectRatio?: string) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  onClose,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PML_${image.prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(image.image_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
      {/* Container Card */}
      <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl bg-[#050b06] border border-[rgba(180,255,100,0.3)] shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#040804]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
            <span className="px-2 py-0.5 rounded-md bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.3)] text-xs font-mono">
              ✦ PML IMAGE PREVIEW
            </span>
            <p className="text-xs font-medium text-white truncate max-w-md">
              "{image.prompt}"
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[#9CFF45]/20 border border-white/10 hover:border-[#9CFF45]/40 text-xs text-white hover:text-[#9CFF45] transition-all cursor-pointer"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Copy Prompt */}
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[#9CFF45]/20 border border-white/10 hover:border-[#9CFF45]/40 text-xs text-white hover:text-[#9CFF45] transition-all cursor-pointer"
              title="Copy prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#9CFF45]" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Zoom */}
            <button
              onClick={() => setZoomed(prev => !prev)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-[#A8B0A5] hover:text-white transition-colors cursor-pointer"
              title={zoomed ? 'Fit to screen' : 'Zoom 100%'}
            >
              {zoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Visual Image Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-[#020502] min-h-[350px]">
          <img
            src={image.image_url}
            alt={image.prompt}
            className={`rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 ${
              zoomed 
                ? 'max-w-none w-auto cursor-zoom-out' 
                : 'max-h-[68vh] max-w-full object-contain cursor-zoom-in'
            }`}
            onClick={() => setZoomed(prev => !prev)}
          />
        </div>

        {/* Bottom Details Bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#040804] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#A8B0A5]">
              Aspect Ratio: <strong className="text-white font-mono">{image.aspect_ratio || '1:1'}</strong>
            </span>
            {image.style && image.style !== 'auto' && (
              <span className="text-[#A8B0A5]">
                Style: <strong className="text-white capitalize">{image.style}</strong>
              </span>
            )}
            {image.created_at && (
              <span className="text-[#758072] text-[11px]">
                {new Date(image.created_at).toLocaleString()}
              </span>
            )}
          </div>

          {onRegenerate && (
            <button
              onClick={() => {
                onClose();
                onRegenerate(image.prompt, image.style, image.aspect_ratio);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#122814] hover:bg-[#9CFF45] border border-[rgba(180,255,100,0.3)] text-xs text-[#9CFF45] hover:text-black font-semibold transition-all cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.15)]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Regenerate in Chat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
