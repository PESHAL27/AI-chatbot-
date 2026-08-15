import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Copy, 
  Check, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  Volume2, 
  VolumeX, 
  FileText, 
  User, 
  Sparkles,
  Brain,
  BookOpen
} from 'lucide-react';
import type { Message, Attachment } from '../types/pml';
import { PMLCore } from './PMLCore';

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onFeedback,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'like' | 'dislike' | null>(message.feedback || null);
  const [activeExcerptIndex, setActiveExcerptIndex] = useState<number | null>(null);

  const isUser = message.role === 'user';

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      // Clean markdown tags for speech synthesis
      const plainText = message.content.replace(/[#*`_~$]/g, '');
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  const handleFeedbackClick = (type: 'like' | 'dislike') => {
    const newFeedback = userFeedback === type ? null : type;
    setUserFeedback(newFeedback);
    if (onFeedback && newFeedback) {
      onFeedback(message.id, newFeedback);
    }
  };

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} my-4 group`}>
      <div className={`max-w-3xl w-full flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar Icon */}
        <div className="flex-shrink-0 pt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(79,70,229,0.5)] border border-purple-500/50">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <PMLCore size="small" state={message.isStreaming ? 'responding' : 'idle'} />
          )}
        </div>

        {/* Message Box Panel */}
        <div
          className={`flex-1 rounded-2xl p-4 md:p-5 transition-all duration-300 plm-neon-card ${
            isUser
              ? 'bg-black/80 border-white/20 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] font-main'
              : 'bg-black/60 border-purple-500/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.8)] font-main'
          }`}
        >
          {/* User Attached File Cards */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map((att: Attachment) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate max-w-[150px] font-mono">{att.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({Math.round(att.size / 1024)}KB)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Message Content Body */}
          <div className={`pml-markdown-content ${message.isStreaming ? 'typing-cursor' : ''}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node: _node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const codeId = Math.random().toString(36).substring(2, 9);

                  return !inline && match ? (
                    <div className="relative my-3 rounded-xl overflow-hidden border border-purple-500/30 bg-black/90 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-purple-950/60 border-b border-purple-500/30 text-xs font-mono text-purple-300">
                        <span className="uppercase font-semibold tracking-wider">{match[1]}</span>
                        <button
                          onClick={() => handleCopyCode(codeString, codeId)}
                          className="flex items-center gap-1 hover:text-white transition-colors text-slate-300"
                        >
                          {copiedCodeId === codeId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-purple-400 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-xs font-mono text-white leading-relaxed">
                        <code {...props}>{children}</code>
                      </pre>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Grounded Document Sources (Phase 7 RAG) */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-violet-500/20">
              <div className="text-[11px] font-semibold text-violet-300/90 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                <span>Grounded Document Sources (RAG):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((src, idx) => (
                  <div key={idx} className="relative">
                    <button
                      onClick={() => setActiveExcerptIndex(activeExcerptIndex === idx ? null : idx)}
                      className="px-2.5 py-1 rounded-lg bg-violet-950/60 border border-violet-500/40 hover:border-violet-400/80 hover:bg-violet-900/40 text-xs text-violet-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Click to view extracted excerpt snippet"
                    >
                      <span>📄</span>
                      <span className="font-semibold">{src.file_name}</span>
                      {src.page_number && (
                        <span className="text-[10px] text-violet-300 px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30">
                          Page {src.page_number}
                        </span>
                      )}
                      <span className="text-[10px] text-violet-400">
                        {activeExcerptIndex === idx ? '▲' : '▼'}
                      </span>
                    </button>

                    {activeExcerptIndex === idx && src.excerpt && (
                      <div className="absolute bottom-full left-0 mb-2 w-80 p-3 rounded-xl bg-[#140e2b]/95 border border-violet-500/60 shadow-2xl shadow-violet-950/90 text-xs text-violet-100 z-50 backdrop-blur-md animate-fadeIn">
                        <div className="flex items-center justify-between font-bold text-violet-300 mb-1 border-b border-violet-500/30 pb-1">
                          <span>Extracted Document Context</span>
                          <span className="text-[10px] text-violet-400">{src.file_name}</span>
                        </div>
                        <div className="italic text-violet-200/90 leading-relaxed text-[11px] max-h-36 overflow-y-auto custom-scrollbar">
                          "{src.excerpt}"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar for PML Response */}
          {!isUser && !message.isStreaming && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 font-mono text-[10px] text-purple-300 tracking-wider">
                  <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                  <span>PML ADVANCED NEURAL INTELLIGENCE</span>
                </div>
                {message.memoriesUsed && message.memoriesUsed.length > 0 && (
                  <div
                    className="flex items-center gap-1 text-[10px] font-mono text-purple-200 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/40 shadow-sm"
                    title={`Memories used:\n${message.memoriesUsed.map(m => `• ${m}`).join('\n')}`}
                  >
                    <Brain className="w-3 h-3 text-purple-400 animate-pulse" />
                    <span>{message.memoriesUsed.length} {message.memoriesUsed.length === 1 ? 'memory' : 'memories'} active</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyText(message.content)}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={handleToggleSpeak}
                  className={`p-1.5 rounded-lg transition-colors ${
                    speaking ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'hover:bg-white/10 hover:text-white'
                  }`}
                  title={speaking ? 'Stop Voice' : 'Read Aloud'}
                >
                  {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-[1px] h-3 bg-white/15 mx-1" />

                <button
                  onClick={() => handleFeedbackClick('like')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    userFeedback === 'like' ? 'text-purple-300 bg-purple-600/30 border border-purple-500/40' : 'hover:bg-white/10 hover:text-white'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleFeedbackClick('dislike')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    userFeedback === 'dislike' ? 'text-rose-400 bg-rose-950/60 border border-rose-500/40' : 'hover:bg-white/10 hover:text-white'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
