import React, { useEffect, useState } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  RotateCw, 
  ImageIcon
} from 'lucide-react';
import { pmlApi } from '../services/pmlApi';
import type { GeneratedImage } from '../types/pml';

interface ImageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (image: GeneratedImage) => void;
  onRegenerate?: (prompt: string, style?: string, aspectRatio?: string) => void;
}

export const ImageHistoryModal: React.FC<ImageHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  onRegenerate,
}) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await pmlApi.getImageHistory(100);
      setImages(history);
    } catch (err) {
      console.warn('Could not load image history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pmlApi.deleteGeneratedImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      console.error('Delete image failed:', err);
    }
  };

  const filteredImages = images.filter(img => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      img.prompt.toLowerCase().includes(q) ||
      (img.revised_prompt && img.revised_prompt.toLowerCase().includes(q)) ||
      (img.style && img.style.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-3xl bg-[#050b06] border border-[rgba(180,255,100,0.3)] shadow-2xl shadow-black/90 overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#040804]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.3)] shadow-[0_0_15px_rgba(156,255,69,0.2)]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>Generated Image Library</span>
                <span className="px-2 py-0.5 rounded-full bg-[#122814] text-[#9CFF45] text-xs font-mono">
                  {images.length}
                </span>
              </h2>
              <p className="text-xs text-[#A8B0A5]">
                View, download, and regenerate previously created AI visuals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#9CFF45]/15 text-[#A8B0A5] hover:text-[#9CFF45] transition-colors cursor-pointer"
              title="Refresh Gallery"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="p-4 border-b border-white/5 bg-[#030603] flex items-center">
          <div className="relative w-full max-w-md flex items-center px-3 py-2 rounded-xl bg-[#09150a] border border-[rgba(180,255,100,0.2)] text-xs">
            <Search className="w-4 h-4 text-[#9CFF45] mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by prompt or visual style..."
              className="w-full bg-transparent text-white placeholder-[#758072] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#A8B0A5] hover:text-white cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-[#9CFF45]">
              <div className="w-8 h-8 rounded-full border-2 border-[#9CFF45]/30 border-t-[#9CFF45] animate-spin mb-3" />
              <p className="text-xs text-[#A8B0A5] font-mono animate-pulse">Loading image history...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#A8B0A5]">
              <div className="p-4 rounded-2xl bg-[#09150a] border border-[rgba(180,255,100,0.2)] mb-3 text-[#9CFF45]">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="font-semibold text-white text-sm">
                {searchQuery ? 'No matching images found' : 'No images generated yet'}
              </p>
              <p className="text-xs text-[#758072] mt-1 max-w-sm">
                Ask PML in chat to create an image, logo, 3D artwork, or concept render!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  onClick={() => onSelectImage && onSelectImage(img)}
                  className="group relative rounded-2xl bg-[#09150a] border border-[rgba(180,255,100,0.2)] hover:border-[rgba(180,255,100,0.5)] shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_25px_rgba(156,255,69,0.15)] flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-square bg-[#020502] overflow-hidden">
                    <img
                      src={img.image_url}
                      alt={img.prompt}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                      <span className="text-[10px] font-mono text-[#9CFF45] bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                        {img.aspect_ratio || '1:1'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDelete(img.id, e)}
                          className="p-1 rounded-lg bg-black/70 hover:bg-rose-500 text-[#A8B0A5] hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-[#050c06] flex-1 flex flex-col justify-between">
                    <p className="text-xs text-white line-clamp-2 font-medium">
                      {img.prompt}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10.5px] text-[#758072]">
                      <span>{img.created_at ? new Date(img.created_at).toLocaleDateString() : 'Recent'}</span>
                      {onRegenerate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onRegenerate(img.prompt, img.style, img.aspect_ratio);
                          }}
                          className="text-[#9CFF45] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RotateCw className="w-2.5 h-2.5" />
                          <span>Redo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
