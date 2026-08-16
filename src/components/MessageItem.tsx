import React, { useState, useEffect } from 'react';
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
  Square,
  FileText, 
  User, 
  Sparkles,
  Brain,
  BookOpen
} from 'lucide-react';
import type { Message, Attachment } from '../types/pml';
import { PMLCore } from './PMLCore';
import { voiceService } from '../services/voiceService';
import { PMLToolStatus } from './ui/PMLToolStatus';
import { PMLSourceCard } from './ui/PMLSourceCard';

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
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'like' | 'dislike' | null>(message.feedback || null);
  const [activeExcerptIndex, setActiveExcerptIndex] = useState<number | null>(null);

  const isUser = message.role === 'user';

  useEffect(() => {
    const unsub = voiceService.subscribe(state => {
      setIsSpeakingThis(state.isSpeaking && state.activeMsgId === message.id);
    });
    return unsub;
  }, [message.id]);

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
    if (isSpeakingThis) {
      voiceService.stopSpeaking();
    } else {
      voiceService.speak(message.content, message.id);
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
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} my-3.5 group`}>
      <div className={`max-w-3xl w-full flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)] backdrop-blur-md">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-black/80 border border-purple-500/40 flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.35)] backdrop-blur-md">
              <PMLCore size="small" state={message.isStreaming ? 'responding' : 'idle'} />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Identity & Timestamp Line */}
          <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="font-display font-bold text-xs tracking-wider text-purple-200">
              {isUser ? 'YOU' : '✦ PML AI'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* User Attachments (Images, PDFs) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments.map((att: Attachment) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120822]/85 border border-purple-500/35 text-xs text-purple-200 shadow-md backdrop-blur-xl"
                >
                  {att.type === 'image' && att.previewUrl ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={att.previewUrl} 
                        alt={att.name} 
                        className="w-7 h-7 object-cover rounded-lg border border-purple-400/60 shadow-sm" 
                      />
                      <span className="font-mono text-[11px] truncate max-w-[150px]">{att.name}</span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-mono text-[11px] truncate max-w-[150px]">{att.name}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Executed Tools Status Badges */}
          {!isUser && message.toolsCalled && message.toolsCalled.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.toolsCalled.map((tool, idx) => (
                <PMLToolStatus key={idx} tool={tool} status="completed" />
              ))}
            </div>
          )}

          {/* Bubble / Text Box */}
          <div
            className={`
              p-4 rounded-2xl relative
              ${isUser 
                ? 'cosmic-user-bubble text-white font-sans text-sm md:text-base leading-relaxed max-w-2xl' 
                : 'cosmic-pml-bubble text-slate-100 font-sans text-sm md:text-base leading-relaxed w-full'
              }
            `}
          >
            <div className="pml-markdown-content font-sans">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const codeId = Math.random().toString(36).substring(2, 9);
                    const isCopied = copiedCodeId === codeId;

                    return !inline && match ? (
                      <div className="relative my-3.5 rounded-xl overflow-hidden border border-purple-500/35 bg-[#090514]/95 shadow-xl font-mono text-xs">
                        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#140a28] border-b border-purple-500/25 text-[11px] text-purple-200">
                          <span className="font-bold uppercase tracking-wider text-purple-300 font-mono">
                            {match[1]}
                          </span>
                          <button
                            onClick={() => handleCopyCode(codeString, codeId)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            title="Copy code snippet"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">COPIED</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-purple-400" />
                                <span>COPY</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 overflow-x-auto text-slate-200 leading-relaxed font-mono">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-200 border border-purple-500/30 font-mono text-[12px]" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse align-middle rounded-sm shadow-[0_0_8px_#c084fc]" />
              )}
            </div>

            {/* Document RAG Citations */}
            {!isUser && message.sources && message.sources.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-white/10">
                <div className="text-[10px] font-mono text-violet-300 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3 h-3 text-violet-400" />
                  <span>Document Sources ({message.sources.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveExcerptIndex(activeExcerptIndex === idx ? null : idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                        activeExcerptIndex === idx
                          ? 'bg-violet-600/40 border-violet-400 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                          : 'bg-violet-950/40 border-violet-500/30 hover:border-violet-400 text-violet-200'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-violet-400" />
                      <span className="font-semibold">{src.file_name}</span>
                      {src.page_number && <span className="opacity-70">p.{src.page_number}</span>}
                    </button>
                  ))}
                </div>
                {activeExcerptIndex !== null && message.sources[activeExcerptIndex]?.excerpt && (
                  <div className="mt-2 p-2.5 rounded-xl bg-violet-950/60 border border-violet-500/40 text-xs text-violet-100 font-sans italic animate-fadeIn">
                    "{message.sources[activeExcerptIndex].excerpt}"
                  </div>
                )}
              </div>
            )}

            {/* Web Search Sources */}
            {!isUser && message.webSources && message.webSources.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-white/10">
                <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-semibold mb-2">
                  Live Web Citations ({message.webSources.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {message.webSources.map((webSrc, idx) => (
                    <PMLSourceCard key={idx} source={webSrc} index={idx} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Bar for PML Response */}
          {!isUser && !message.isStreaming && (
            <div className="mt-2.5 px-2 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 font-mono text-[10px] text-purple-300 tracking-wider">
                  <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                  <span>PML NEURAL CORE</span>
                </div>

                {message.memoriesUsed && message.memoriesUsed.length > 0 && (
                  <div
                    className="flex items-center gap-1 text-[10px] font-mono text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/40"
                    title={`Recalled memories:\n${message.memoriesUsed.map(m => `• ${m}`).join('\n')}`}
                  >
                    <Brain className="w-2.5 h-2.5 text-purple-400" />
                    <span>{message.memoriesUsed.length} {message.memoriesUsed.length === 1 ? 'memory' : 'memories'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Copy Button */}
                <button
                  onClick={() => handleCopyText(message.content)}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Read Aloud / Stop Voice Button */}
                {isSpeakingThis ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                    <span className="flex items-center gap-0.5">
                      <span className="w-0.5 h-2.5 bg-purple-300 rounded-full animate-bounce" />
                      <span className="w-0.5 h-3.5 bg-purple-200 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-0.5 h-2 bg-purple-300 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                    <button
                      onClick={() => voiceService.stopSpeaking()}
                      className="p-0.5 hover:text-rose-400 text-purple-200 transition-colors cursor-pointer"
                      title="Stop Audio Playback"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleToggleSpeak}
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white text-slate-400 transition-colors cursor-pointer"
                    title="Read Aloud with Voice"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Regenerate */}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-[1px] h-3 bg-white/15 mx-1" />

                {/* Feedback */}
                <button
                  onClick={() => handleFeedbackClick('like')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    userFeedback === 'like' ? 'text-purple-300 bg-purple-600/30 border border-purple-500/40' : 'hover:bg-white/10 hover:text-white'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleFeedbackClick('dislike')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
