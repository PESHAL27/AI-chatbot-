import React, { useState } from 'react';
import { 
  Download, 
  Maximize2, 
  Copy, 
  Check, 
  RotateCw, 
  ImageIcon
} from 'lucide-react';
import type { GeneratedImage } from '../types/pml';

interface GeneratedImageCardProps {
  image: GeneratedImage;
  onPreview?: (image: GeneratedImage) => void;
  onRegenerate?: (prompt: string, style?: string, aspectRatio?: string) => void;
}

export const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({
  image,
  onPreview,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PML_AI_${image.prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback direct open in new window
      window.open(image.image_url, '_blank');
    }
  };

  // Aspect ratio classes
  const getAspectRatioClass = () => {
    switch (image.aspect_ratio) {
      case '16:9': return 'aspect-video';
      case '9:16': return 'aspect-[9/16] max-h-[480px]';
      case '4:3': return 'aspect-[4/3]';
      default: return 'aspect-square';
    }
  };

  return (
    <div className="my-3 w-full max-w-xl rounded-2xl bg-[#09150a]/95 border border-[rgba(180,255,100,0.25)] shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-xl group/card transition-all duration-300 hover:border-[rgba(180,255,100,0.45)]">
      {/* Image Display Area */}
      <div 
        className={`relative w-full overflow-hidden bg-[#040905] cursor-pointer ${getAspectRatioClass()}`}
        onClick={() => onPreview && onPreview(image)}
      >
        {/* Loading Spinner Skeleton with smooth fade out */}
        {!imageError && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-[#071208] text-[#9CFF45] transition-opacity duration-700 ease-out z-10 ${
              loading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-full border-2 border-[#9CFF45]/25 border-t-[#9CFF45] animate-spin" />
              <div className="absolute w-12 h-12 rounded-full blur-md bg-[#9CFF45]/15 animate-pulse" />
            </div>
            <span className="mt-3 text-xs font-mono text-[#A8B0A5] tracking-wider animate-pulse">
              Rendering visual canvas...
            </span>
          </div>
        )}

        {/* Error Fallback */}
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-xs text-[#A8B0A5] bg-[#0d160e]">
            <ImageIcon className="w-10 h-10 text-[#9CFF45]/40 mb-2" />
            <p className="font-semibold text-white">Visual render preview expired</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageError(false);
                setLoading(true);
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.3)] hover:bg-[#9CFF45] hover:text-black text-xs font-medium cursor-pointer"
            >
              Retry Load
            </button>
          </div>
        ) : (
          <img
            src={image.image_url}
            alt={image.prompt}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setImageError(true);
            }}
            className={`w-full h-full object-cover transition-opacity duration-500 ease-out group-hover/card:scale-[1.01] ${
              loading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {/* Hover Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 pointer-events-none">
          {/* Top Badges */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[10px] font-mono text-[#9CFF45] backdrop-blur-md">
                ✦ PML Image Engine
              </span>
              {image.style && image.style !== 'auto' && (
                <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[10px] font-medium text-white capitalize backdrop-blur-md">
                  {image.style}
                </span>
              )}
            </div>

            <button
              onClick={() => onPreview && onPreview(image)}
              className="p-1.5 rounded-lg bg-black/70 hover:bg-[#9CFF45] text-white hover:text-black transition-colors cursor-pointer backdrop-blur-md"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Prompt Preview Overlay */}
          <div className="pointer-events-auto">
            <p className="text-xs text-white/95 line-clamp-2 drop-shadow-md font-sans">
              "{image.prompt}"
            </p>
          </div>
        </div>
      </div>

      {/* Card Info & Actions Footer */}
      <div className="p-3.5 bg-[#050c06] border-t border-[rgba(180,255,100,0.15)] flex flex-col gap-2.5">
        {/* Prompt line */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/95 truncate">
              {image.prompt}
            </p>
            {image.revised_prompt && image.revised_prompt !== image.prompt && (
              <p className="text-[11px] text-[#A8B0A5] line-clamp-1 italic mt-0.5">
                Enhanced: {image.revised_prompt}
              </p>
            )}
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.25)] flex-shrink-0">
            {image.aspect_ratio || '1:1'}
          </span>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#9CFF45]/15 border border-white/5 hover:border-[#9CFF45]/30 text-xs text-[#A8B0A5] hover:text-[#9CFF45] transition-all cursor-pointer"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            {/* Copy Prompt Button */}
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#9CFF45]/15 border border-white/5 hover:border-[#9CFF45]/30 text-xs text-[#A8B0A5] hover:text-[#9CFF45] transition-all cursor-pointer"
              title="Copy prompt"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#9CFF45]" />
                  <span className="text-[#9CFF45]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Regenerate Action */}
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(image.prompt, image.style, image.aspect_ratio)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#122814] hover:bg-[#9CFF45] border border-[rgba(180,255,100,0.3)] text-xs text-[#9CFF45] hover:text-black font-medium transition-all cursor-pointer shadow-sm"
              title="Regenerate this image"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
