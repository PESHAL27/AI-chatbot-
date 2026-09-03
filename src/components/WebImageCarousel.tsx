import React, { useState } from 'react';
import { Camera, ExternalLink, ImageOff, Maximize2 } from 'lucide-react';
import type { WebImageResult } from '../types/pml';
import { getProxiedImageUrl } from '../utils/imageUtils';

interface WebImageCarouselProps {
  images: WebImageResult[];
  onPreview: (image: WebImageResult) => void;
  hasPrecedingText?: boolean;
}

export const WebImageCarousel: React.FC<WebImageCarouselProps> = ({ images, onPreview, hasPrecedingText = true }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className={hasPrecedingText ? "mt-3 pt-2.5 border-t border-white/10" : "mt-0.5"}>
      {/* Header section */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] font-mono text-[#9CFF45] uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-[#9CFF45]" />
          <span>Real Web Photos ({images.length})</span>
        </div>
        <span className="text-[10px] text-[#758072] font-mono">
          Verified Web Sources
        </span>
      </div>

      {/* Responsive Grid / Carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {images.map((img, idx) => (
          <WebImageCard key={idx} image={img} onPreview={() => onPreview(img)} />
        ))}
      </div>
    </div>
  );
};

interface WebImageCardProps {
  image: WebImageResult;
  onPreview: () => void;
}

const WebImageCard: React.FC<WebImageCardProps> = ({ image, onPreview }) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const displayTitle = image.title || 'Web Photo';
  const displaySource = image.source_name || 'Web Source';
  const initialThumb = image.thumbnail_url || image.image_url;
  const [imgSrc, setImgSrc] = useState<string>(() => getProxiedImageUrl(initialThumb));

  const handleImageError = () => {
    const fullProxied = getProxiedImageUrl(image.image_url);
    if (image.image_url && imgSrc !== fullProxied) {
      setImgSrc(fullProxied);
    } else {
      setError(true);
    }
  };

  return (
    <div
      onClick={onPreview}
      className="group relative rounded-xl overflow-hidden border border-[rgba(180,255,100,0.18)] hover:border-[#9CFF45]/60 bg-[#071308]/80 transition-all duration-300 hover:shadow-[0_0_18px_rgba(156,255,69,0.18)] cursor-pointer flex flex-col"
    >
      {/* Aspect Container */}
      <div className="relative aspect-[4/3] w-full bg-[#050e06] overflow-hidden">
        {/* Loading skeleton with smooth fade-out */}
        {!error && (
          <div className={`absolute inset-0 bg-[#0b1c0d] flex items-center justify-center transition-opacity duration-500 ease-out z-10 pointer-events-none ${
            loaded ? 'opacity-0' : 'opacity-100'
          }`}>
            <div className="w-5 h-5 rounded-full border-2 border-[#9CFF45]/20 border-t-[#9CFF45] animate-spin" />
          </div>
        )}

        {/* Error Fallback: Never shows a broken browser icon */}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-[#071308] text-[#758072]">
            <ImageOff className="w-5 h-5 mb-1 text-amber-400/60" />
            <span className="text-[10px] text-white/60">Image unavailable</span>
            {image.source_url && image.source_url !== '#' && (
              <a
                href={image.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 text-[9px] text-[#9CFF45] hover:underline flex items-center gap-0.5"
              >
                <span>View source</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={displayTitle}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* WEB IMAGE Badge (Distinct from AI Generated Image) */}
        <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
          <span className="bg-black/80 backdrop-blur-sm text-[#9CFF45] text-[9px] font-mono tracking-wider font-bold px-1.5 py-0.5 rounded border border-[#9CFF45]/30 shadow-sm">
            WEB PHOTO
          </span>
        </div>

        {/* Hover Expand Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="p-1.5 rounded-full bg-black/70 border border-[#9CFF45]/50 text-[#9CFF45]">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="p-2 flex flex-col justify-between flex-1 bg-[#09180b]">
        <div
          className="text-[11px] font-medium text-white/90 line-clamp-1 group-hover:text-[#9CFF45] transition-colors"
          title={displayTitle}
        >
          {displayTitle}
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] text-[#A8B0A5]">
          <span className="truncate max-w-[100px] text-white/60" title={displaySource}>
            {displaySource}
          </span>
          {image.source_url && image.source_url !== '#' && (
            <a
              href={image.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[#9CFF45] transition-colors p-0.5"
              title="Open source page"
            >
              <ExternalLink className="w-3 h-3 text-[#9CFF45]" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
