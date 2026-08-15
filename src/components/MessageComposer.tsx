import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Square, 
  X, 
  FileText,
  Plus,
  BookOpen
} from 'lucide-react';
import type { Attachment, AttachmentType, DocumentItem } from '../types/pml';

interface MessageComposerProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStopGeneration?: () => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopGeneration,
  selectedDocument,
  onClearDocumentScope,
  onOpenDocumentLibrary,
  onUploadDocument
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docRAGInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

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

  // Voice recognition setup
  const toggleVoiceInput = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(prev => (prev ? prev + ' ' + transcript : transcript));
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Attachment File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => {
      let type: AttachmentType = 'txt';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.includes('csv')) type = 'csv';
      else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'doc';

      return {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type,
        mimeType: file.type || 'application/octet-stream',
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
    });

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
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input.trim(), attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
      } else {
        // Add as regular attachment
        const newAtt: Attachment = {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'doc' : 'txt',
          mimeType: file.type || 'application/octet-stream'
        };
        setAttachments(prev => [...prev, newAtt]);
      }
    }
  };

  return (
    <div 
      className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2 z-30 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay feedback */}
      {isDraggingFile && (
        <div className="absolute inset-x-4 inset-y-2 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-950/80 backdrop-blur-md z-40 flex items-center justify-center gap-3 text-violet-200 animate-fadeIn">
          <span className="text-2xl">📥</span>
          <span className="font-semibold text-sm">Drop document here to ingest into PML RAG</span>
        </div>
      )}

      {/* Active Document Scoping Pill */}
      {selectedDocument && (
        <div className="mb-2 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-violet-900/40 border border-violet-500/40 backdrop-blur-md text-xs text-violet-200 animate-fadeIn shadow-[0_0_15px_rgba(139,92,246,0.2)]">
          <div className="flex items-center gap-2">
            <span className="text-base">📄</span>
            <span className="font-semibold truncate max-w-[280px]">{selectedDocument.file_name}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/30">
              Scoped RAG Document
            </span>
          </div>
          <button
            onClick={onClearDocumentScope}
            className="text-violet-400 hover:text-white flex items-center gap-1 text-[11px] font-semibold transition-colors"
            title="Clear document filter to search all documents"
          >
            <span>Search All Docs</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 p-2 rounded-2xl glass-panel bg-black/90 border-purple-500/30">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-white"
            >
              {att.previewUrl ? (
                <img src={att.previewUrl} alt={att.name} className="w-5 h-5 object-cover rounded border border-purple-500/50" />
              ) : (
                <FileText className="w-4 h-4 text-purple-400" />
              )}
              <span className="truncate max-w-[140px] font-mono">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-slate-400 hover:text-purple-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Futuristic Floating Glittering Glass Console */}
      <div className="relative glitter-glass-search rounded-2xl p-3.5 flex flex-col gap-2 transition-all duration-300">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedDocument ? `Ask questions about ${selectedDocument.file_name}...` : "Message PML or ask questions about your documents..."}
          rows={1}
          className="w-full bg-transparent px-3 py-2.5 text-base text-white placeholder-slate-400 focus:outline-none resize-none cosmic-scroll max-h-[180px] font-main"
        />

        {/* Console Action Bar */}
        <div className="flex items-center justify-between border-t border-white/10 pt-2 px-2">
          <div className="flex items-center gap-2.5">
            {/* Plus Button Menu for RAG & Uploads */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setShowPlusMenu(prev => !prev)}
                className={`p-2 rounded-xl border transition-all ${
                  showPlusMenu 
                    ? 'bg-violet-600/40 text-violet-200 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.4)]' 
                    : 'hover:bg-white/10 text-slate-400 hover:text-violet-300 border-transparent'
                }`}
                title="Add Document or Open RAG Library"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>

              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 p-1.5 rounded-xl bg-[#130d29]/95 border border-violet-500/40 shadow-xl shadow-violet-950/80 backdrop-blur-md z-50 animate-fadeIn text-xs text-violet-200 space-y-1">
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      docRAGInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-violet-600/30 hover:text-white transition-colors text-left"
                  >
                    <span>📄</span>
                    <div>
                      <div className="font-semibold text-violet-100">Upload Document (RAG)</div>
                      <div className="text-[10px] text-violet-400">PDF, DOCX, TXT</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      if (onOpenDocumentLibrary) onOpenDocumentLibrary();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-violet-600/30 hover:text-white transition-colors text-left"
                  >
                    <BookOpen className="w-4 h-4 text-violet-400" />
                    <div>
                      <div className="font-semibold text-violet-100">Document Library</div>
                      <div className="text-[10px] text-violet-400">Manage vector documents</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* General File Upload Trigger */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-colors"
              title="Attach Document"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>

            {/* Image Upload Trigger */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-colors"
              title="Attach Image"
            >
              <ImageIcon className="w-4.5 h-4.5" />
            </button>

            {/* Voice Input Trigger */}
            <button
              onClick={toggleVoiceInput}
              className={`p-2 rounded-xl transition-all ${
                isRecording
                  ? 'bg-purple-600/30 text-purple-400 animate-pulse border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title={isRecording ? 'Stop Recording' : 'Voice Input'}
            >
              {isRecording ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </button>

            {/* Hidden Input Elements */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,image/*"
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
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                onClick={onStopGeneration}
                className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/60 hover:bg-purple-900 text-purple-300 text-sm font-bold font-display flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>ABORT</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-display font-bold text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.7)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 border border-white/20"
                title="Send to PML AI"
              >
                <span>SEND</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
