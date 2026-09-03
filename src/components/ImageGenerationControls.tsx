import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import type { ImageGenerationOptions } from '../types/pml';

interface ImageGenerationControlsProps {
  options: ImageGenerationOptions;
  onChange: (options: ImageGenerationOptions) => void;
  onClose?: () => void;
}

export const ImageGenerationControls: React.FC<ImageGenerationControlsProps> = ({
  options,
  onChange,
  onClose,
}) => {
  const aspectRatios = [
    { label: '1:1 Square', value: '1:1' },
    { label: '16:9 Landscape', value: '16:9' },
    { label: '9:16 Portrait', value: '9:16' },
    { label: '4:3 Standard', value: '4:3' },
  ];

  const styles = [
    { label: 'Auto', value: 'auto' },
    { label: 'Realistic', value: 'realistic' },
    { label: '3D Render', value: '3d' },
    { label: 'Illustration', value: 'illustration' },
    { label: 'Anime', value: 'anime' },
    { label: 'Cinematic', value: 'cinematic' },
    { label: 'Minimal', value: 'minimal' },
  ];

  return (
    <div className="w-full mb-3 p-3 rounded-2xl bg-[#09150a]/95 border border-[rgba(180,255,100,0.3)] shadow-2xl backdrop-blur-2xl animate-fadeIn text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-[#122814] text-[#9CFF45]">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-white tracking-wide">Image Generation Controls</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.3)]">
            Active
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-[#A8B0A5] hover:text-white cursor-pointer"
            title="Close controls"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#A8B0A5] font-medium mr-1">Ratio:</span>
          {aspectRatios.map((ar) => {
            const isSelected = (options.aspect_ratio || '1:1') === ar.value;
            return (
              <button
                key={ar.value}
                type="button"
                onClick={() => onChange({ ...options, aspect_ratio: ar.value })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.4)] shadow-[0_0_10px_rgba(156,255,69,0.15)] font-semibold'
                    : 'bg-white/[0.04] text-[#A8B0A5] hover:text-white hover:bg-white/[0.08] border border-transparent'
                }`}
              >
                {ar.label}
              </button>
            );
          })}
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#A8B0A5] font-medium mr-1">Style:</span>
          {styles.map((st) => {
            const isSelected = (options.style || 'auto') === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => onChange({ ...options, style: st.value })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.4)] shadow-[0_0_10px_rgba(156,255,69,0.15)] font-semibold'
                    : 'bg-white/[0.04] text-[#A8B0A5] hover:text-white hover:bg-white/[0.08] border border-transparent'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
