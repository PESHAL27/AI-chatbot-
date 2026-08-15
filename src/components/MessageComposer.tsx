import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Square, 
  X, 
  FileText 
} from 'lucide-react';
import type { Attachment, AttachmentType } from '../types/pml';

interface MessageComposerProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStopGeneration?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopGeneration,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

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

  // File Upload Handler
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2 z-30">
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
          placeholder="Search or ask PML AI anything..."
          rows={1}
          className="w-full bg-transparent px-3 py-2.5 text-base text-white placeholder-slate-400 focus:outline-none resize-none cosmic-scroll max-h-[180px] font-main"
        />

        {/* Console Action Bar */}
        <div className="flex items-center justify-between border-t border-white/10 pt-2 px-2">
          <div className="flex items-center gap-2.5">
            {/* File Upload Trigger */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-colors"
              title="Attach Document (PDF, DOCX, CSV, TXT)"
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
                title="Search PML AI"
              >
                <span>SEARCH</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

