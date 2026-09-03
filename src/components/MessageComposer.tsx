import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Square, 
  X, 
  Plus,
  BookOpen,
  Camera,
  Radio,
  Sparkles
} from 'lucide-react';
import type { Attachment, AttachmentType, DocumentItem, ImageGenerationOptions } from '../types/pml';
import { voiceService } from '../services/voiceService';
import { PMLFileCard } from './ui/PMLFileCard';
import { ImageGenerationControls } from './ImageGenerationControls';

interface MessageComposerProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStopGeneration?: () => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
  speechLanguage?: string;
}

const ROTATING_PLACEHOLDERS = [
  "Message PML AI or speak with voice 🎤...",
  "Ask PML anything, generate an image 🎨, or analyze documents 📄...",
  "Search the live web 🌐 or calculate complex formulas 🧮...",
  "Paste screenshots directly with Ctrl+V to analyze code & math...",
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopGeneration,
  selectedDocument,
  onClearDocumentScope,
  onOpenDocumentLibrary,
  onUploadDocument,
  speechLanguage = 'en-US'
}) => {
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showImageControls, setShowImageControls] = useState(false);
  const [imageOptions, setImageOptions] = useState<ImageGenerationOptions>({
    aspect_ratio: '1:1',
    style: 'auto',
  });
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docRAGInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

  // Rotating subtle placeholder
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % ROTATING_PLACEHOLDERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input, interimTranscript]);

  // Click outside to close plus menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      voiceService.stopListening();
    };
  }, []);

  // Voice recognition handler
  const toggleVoiceInput = async () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
      setInterimTranscript('');
      return;
    }

    if (!voiceService.isSTTSupported()) {
      alert("Voice speech recognition isn't supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
      return;
    }

    const started = await voiceService.startListening({
      lang: speechLanguage,
      onStart: () => {
        setIsRecording(true);
        setInterimTranscript('');
      },
      onResult: (finalText) => {
        setInput(prev => (prev ? `${prev.trim()} ${finalText.trim()}` : finalText.trim()));
        setInterimTranscript('');
      },
      onInterim: (interim) => {
        setInterimTranscript(interim);
      },
      onError: (err) => {
        setIsRecording(false);
        setInterimTranscript('');
        alert(err);
      },
      onEnd: () => {
        setIsRecording(false);
        setInterimTranscript('');
      }
    });

    if (!started) {
      setIsRecording(false);
    }
  };

  // Helper to read file as Data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Attachment & Image File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newAttachments: Attachment[] = [];

    for (const file of fileList) {
      let type: AttachmentType = 'txt';
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isImg = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
      
      if (isImg) {
        type = 'image';
      } else if (file.type.includes('pdf') || ext === 'pdf') {
        type = 'pdf';
      } else if (file.type.includes('csv') || ext === 'csv') {
        type = 'csv';
      } else if (file.type.includes('word') || ['doc', 'docx'].includes(ext)) {
        type = 'doc';
      }

      let dataUrl: string | undefined = undefined;
      if (isImg) {
        try {
          dataUrl = await readFileAsDataURL(file);
        } catch (err) {
          console.warn('Failed to read image as data URL:', err);
        }
      }

      newAttachments.push({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type,
        mimeType: isImg ? (file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`) : (file.type || 'application/octet-stream'),
        previewUrl: dataUrl,
        content: dataUrl,
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (e.target) e.target.value = '';
  };

  // Direct Document RAG Ingestion Upload
  const handleDocRAGUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadDocument) {
      await onUploadDocument(file);
    }
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
      setInterimTranscript('');
    }

    const messageText = input.trim();
    if ((!messageText && attachments.length === 0) || isStreaming) return;
    
    onSendMessage(messageText, attachments);
    setInput('');
    setInterimTranscript('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clipboard Paste Handler (Screenshots & Copied Images)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const newAttachments: Attachment[] = [];
      for (const file of imageFiles) {
        const dataUrl = await readFileAsDataURL(file);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
        const filename = file.name && file.name !== 'image.png' ? file.name : `Pasted_Screenshot_${timestamp}.png`;

        newAttachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: filename,
          size: file.size,
          type: 'image',
          mimeType: file.type || 'image/png',
          previewUrl: dataUrl,
          content: dataUrl,
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (['pdf', 'docx', 'doc', 'txt'].includes(ext || '') && onUploadDocument) {
        await onUploadDocument(file);
      } else if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext || '')) {
        const dataUrl = await readFileAsDataURL(file);
        const newAtt: Attachment = {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: 'image',
          mimeType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          previewUrl: dataUrl,
          content: dataUrl,
        };
        setAttachments(prev => [...prev, newAtt]);
      } else {
        const newAtt: Attachment = {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: 'txt',
          mimeType: file.type || 'application/octet-stream'
        };
        setAttachments(prev => [...prev, newAtt]);
      }
    }
  };

  return (
    <div 
      className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2 z-30 relative flex-shrink-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Drag overlay feedback */}
      {isDraggingFile && (
        <div className="absolute inset-x-4 inset-y-2 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-950/80 backdrop-blur-md z-40 flex items-center justify-center gap-3 text-violet-200 animate-fadeIn">
          <span className="text-2xl">📥</span>
          <span className="font-semibold text-sm">Drop file or image to process with PML AI</span>
        </div>
      )}

      {/* Live Voice Recording Status Banner */}
      {isRecording && (
        <div className="mb-2 flex items-center justify-between px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-950/90 via-purple-950/90 to-violet-950/90 border border-rose-500/50 backdrop-blur-xl text-xs text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-bold font-display text-rose-100 uppercase tracking-wider text-[11px]">Listening to voice</span>
            {interimTranscript && (
              <span className="italic text-purple-200 truncate max-w-xs md:max-w-md font-sans">
                "{interimTranscript}"
              </span>
            )}
          </div>
          <button
            onClick={toggleVoiceInput}
            className="px-3 py-1 rounded-xl bg-rose-500/25 hover:bg-rose-500/50 text-rose-200 border border-rose-400/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Active Document Scoping Pill */}
      {selectedDocument && (
        <div className="mb-2 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#0d2210] border border-[rgba(180,255,100,0.3)] backdrop-blur-md text-xs text-[#9CFF45] animate-fadeIn shadow-[0_0_15px_rgba(156,255,69,0.15)]">
          <div className="flex items-center gap-2">
            <span className="text-base">📄</span>
            <span className="font-semibold truncate max-w-[280px]">{selectedDocument.file_name}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#153218] text-[#9CFF45] border border-[rgba(180,255,100,0.2)]">
              Scoped RAG Document
            </span>
          </div>
          <button
            onClick={onClearDocumentScope}
            className="text-[#A8B0A5] hover:text-white flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Clear document filter to search all documents"
          >
            <span>Search All Docs</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File & Image Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 p-2.5 rounded-2xl bg-[#081209]/90 border border-[rgba(180,255,100,0.25)] backdrop-blur-xl shadow-lg animate-fadeIn">
          {attachments.map(att => (
            <PMLFileCard
              key={att.id}
              attachment={att}
              onRemove={removeAttachment}
              isAnalyzed={true}
            />
          ))}
        </div>
      )}

      {/* Ultra-Modern Model-Version Command Console */}
      <div className="relative pml-modern-console p-3.5 sm:p-4 flex flex-col gap-2 transition-all duration-300">
        {/* Top Model & Tool Switcher Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="pml-mode-pill active px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9CFF45] animate-pulse" />
              <span>Auto-Route</span>
            </span>

            <button
              type="button"
              onClick={() => {
                if (!input.toLowerCase().startsWith('search')) {
                  setInput(prev => prev ? `Search web: ${prev}` : 'Search web: ');
                  textareaRef.current?.focus();
                }
              }}
              className="pml-mode-pill px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>🌐 Web</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenDocumentLibrary) onOpenDocumentLibrary();
              }}
              className="pml-mode-pill px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>📄 Docs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowImageControls(prev => !prev);
                if (!input.toLowerCase().startsWith('create an image') && !input.toLowerCase().startsWith('generate an image')) {
                  setInput(prev => prev ? `Create an image of ${prev}` : 'Create an image of ');
                  textareaRef.current?.focus();
                }
              }}
              className={`pml-mode-pill px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                showImageControls ? 'active text-[#9CFF45] border-[rgba(180,255,100,0.4)]' : ''
              }`}
            >
              <span>🎨 Image</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10.5px] font-mono text-[#A8B0A5] px-2 py-0.5 rounded bg-white/5 border border-white/5 flex-shrink-0">
            <Radio className="w-2.5 h-2.5 text-[#9CFF45] animate-pulse" />
            <span>PML 4.5 Pro</span>
          </div>
        </div>

        {/* Collapsible Image Generation Controls */}
        {showImageControls && (
          <ImageGenerationControls
            options={imageOptions}
            onChange={setImageOptions}
            onClose={() => setShowImageControls(false)}
          />
        )}

        <textarea
          ref={textareaRef}
          value={interimTranscript ? `${input} ${interimTranscript}` : input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isRecording
              ? "🎙️ Listening to voice speech (words appearing live)..."
              : selectedDocument 
                ? `Ask questions about ${selectedDocument.file_name}...` 
                : ROTATING_PLACEHOLDERS[placeholderIndex]
          }
          rows={1}
          className="w-full bg-transparent px-2 py-1.5 text-sm md:text-base text-white placeholder-[#8d9b89] focus:outline-none resize-none min-h-[44px] max-h-[160px] font-sans leading-relaxed"
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between border-t border-white/5 pt-2 px-1">
          <div className="flex items-center gap-1">
            {/* Plus Hub Menu */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setShowPlusMenu(prev => !prev)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  showPlusMenu 
                    ? 'bg-[#153218] text-[#9CFF45] border-[rgba(180,255,100,0.4)] shadow-[0_0_15px_rgba(156,255,69,0.25)]' 
                    : 'hover:bg-white/10 text-[#A8B0A5] hover:text-white border-transparent'
                }`}
                title="Attach Image (Vision) or Document (RAG)"
              >
                <Plus className="w-4 h-4" />
              </button>

              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-3 w-64 p-2.5 rounded-2xl bg-[#09120a]/95 border border-[rgba(180,255,100,0.25)] shadow-2xl shadow-black/90 backdrop-blur-2xl z-50 animate-fadeIn text-xs text-[#A8B0A5] flex flex-col gap-2">
                  {/* Create AI Image */}
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      setShowImageControls(true);
                      if (!input.toLowerCase().startsWith('create an image') && !input.toLowerCase().startsWith('generate an image')) {
                        setInput('Create an image of ');
                      }
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-[#9CFF45]/15 border border-white/5 hover:border-[#9CFF45]/30 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Create AI Image</div>
                      <div className="text-[10px] text-[#A8B0A5]">3D renders, logos, illustration</div>
                    </div>
                  </button>

                  {/* Vision Upload */}
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-[#9CFF45]/15 border border-white/5 hover:border-[#9CFF45]/30 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Upload Image (Vision)</div>
                      <div className="text-[10px] text-[#A8B0A5]">Code screenshot, math, diagrams</div>
                    </div>
                  </button>

                  {/* Document RAG Upload */}
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      docRAGInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-[#9CFF45]/15 border border-white/5 hover:border-[#9CFF45]/30 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Upload Document (RAG)</div>
                      <div className="text-[10px] text-[#A8B0A5]">PDF, DOCX, TXT vector search</div>
                    </div>
                  </button>

                  {/* Document Library */}
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      if (onOpenDocumentLibrary) onOpenDocumentLibrary();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-[#9CFF45]/15 border border-white/5 hover:border-[#9CFF45]/30 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-[#9CFF45]/10 text-[#9CFF45] group-hover:scale-110 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Document Library</div>
                      <div className="text-[10px] text-[#A8B0A5]">Manage vector documents</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Microphone Button */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <span className="pointer-events-none absolute w-9 h-9 rounded-full border border-rose-500/80 animate-ping" />
              )}
              <button
                onClick={toggleVoiceInput}
                className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer z-10 ${
                  isRecording
                    ? 'bg-rose-600/40 text-rose-300 border border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.8)] scale-105'
                    : 'hover:bg-white/10 text-[#A8B0A5] hover:text-[#9CFF45] border border-transparent'
                }`}
                title={isRecording ? 'Stop Voice Recording' : 'Voice Input (Speak to PML AI)'}
              >
                {isRecording ? <MicOff className="w-4 h-4 text-rose-200" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Image Trigger (Vision) */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-xl hover:bg-white/10 text-[#A8B0A5] hover:text-[#9CFF45] border border-transparent transition-colors cursor-pointer"
              title="Attach Image for Visual Analysis (Vision)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Document Trigger (RAG) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl hover:bg-white/10 text-[#A8B0A5] hover:text-[#9CFF45] border border-transparent transition-colors cursor-pointer"
              title="Attach Document for Vector Knowledge (RAG)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Hidden Input Elements */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={docRAGInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.csv"
              className="hidden"
              onChange={handleDocRAGUpload}
            />
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Send / Abort Controls */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[10.5px] font-mono text-[#758072]">
              Enter ↵
            </span>

            {isStreaming ? (
              <button
                onClick={onStopGeneration}
                className="px-4 py-2 rounded-xl bg-rose-950/80 border border-rose-500/60 hover:bg-rose-900 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && !interimTranscript.trim() && attachments.length === 0}
                className="
                  pml-expand-btn flex items-center justify-center px-4 sm:px-5 py-2 rounded-xl
                  text-xs font-bold
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                  transition-all duration-300 gap-1.5 cursor-pointer
                "
                title="Send Message to PML AI"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
