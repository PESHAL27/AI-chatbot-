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
import type { Message, Attachment, GeneratedImage } from '../types/pml';
import { PMLCore } from './PMLCore';
import { voiceService } from '../services/voiceService';
import { PMLToolStatus } from './ui/PMLToolStatus';
import { PMLSourceCard } from './ui/PMLSourceCard';
import { GeneratedImageCard } from './GeneratedImageCard';

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
  onPreviewImage?: (image: GeneratedImage) => void;
  onRegenerateImage?: (prompt: string, style?: string, aspectRatio?: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onFeedback,
  onPreviewImage,
  onRegenerateImage,
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
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} my-4 group`}>
      <div className={`max-w-3xl w-full flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-[#122814] border border-[rgba(180,255,100,0.3)] flex items-center justify-center text-[#9CFF45] shadow-sm backdrop-blur-md">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#071208] border border-[rgba(180,255,100,0.35)] flex items-center justify-center p-1 shadow-[0_0_15px_rgba(156,255,69,0.2)] backdrop-blur-md">
              <PMLCore size="small" state={message.isStreaming ? 'responding' : 'idle'} />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Identity & Timestamp Line */}
          <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="font-bold text-xs tracking-wider text-white">
              {isUser ? 'YOU' : '✦ PML'}
            </span>
            <span className="text-[10px] font-mono text-[#A8B0A5]/70">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* User Attachments (Images, PDFs) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments.map((att: Attachment) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a180b]/90 border border-[rgba(180,255,100,0.2)] text-xs text-white shadow-md backdrop-blur-xl"
                >
                  {att.type === 'image' && att.previewUrl ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={att.previewUrl} 
                        alt={att.name} 
                        className="w-7 h-7 object-cover rounded-lg border border-[#9CFF45]/40 shadow-sm" 
                      />
                      <span className="text-[11px] truncate max-w-[150px]">{att.name}</span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-[#9CFF45]" />
                      <span className="text-[11px] truncate max-w-[150px]">{att.name}</span>
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
              p-4 rounded-3xl relative
              ${isUser 
                ? 'bg-[#0e2210] border border-[rgba(180,255,100,0.25)] text-white font-sans text-sm md:text-base leading-relaxed max-w-2xl ml-auto' 
                : 'bg-[#071208]/90 border border-[rgba(180,255,100,0.15)] text-white font-sans text-sm md:text-base leading-relaxed w-full shadow-lg'
              }
            `}
          >
            <div className="pml-markdown-content font-sans text-[#EAEAEA]">
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
                      <div className="relative my-3.5 rounded-2xl overflow-hidden border border-[rgba(180,255,100,0.2)] bg-[#040804] shadow-xl font-mono text-xs">
                        <div className="flex items-center justify-between px-3.5 py-2 bg-[#09150a] border-b border-white/5 text-[11px] text-[#A8B0A5]">
                          <span className="font-bold uppercase tracking-wider text-[#9CFF45] font-mono">
                            {match[1]}
                          </span>
                          <button
                            onClick={() => handleCopyCode(codeString, codeId)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            title="Copy code snippet"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-[#9CFF45]" />
                                <span className="text-[#9CFF45] font-bold">COPIED</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#A8B0A5]" />
                                <span>COPY</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed font-mono">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded-md bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.2)] font-mono text-[12px]" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children, ...props }: any) {
                    const safeHref = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) ? href : '#';
                    return (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#9CFF45] hover:text-[#B5FF6A] underline font-medium transition-colors"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  img({ src, alt }: any) {
                    if (!src) return null;
                    const imgObj: GeneratedImage = {
                      id: `img_${Math.random().toString(36).slice(2, 9)}`,
                      prompt: alt || 'Generated Image',
                      image_url: src,
                      aspect_ratio: '1:1',
                      style: 'auto',
                    };
                    return (
                      <GeneratedImageCard
                        image={imgObj}
                        onPreview={onPreviewImage}
                        onRegenerate={onRegenerateImage}
                      />
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>

              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-[#9CFF45] animate-pulse align-middle rounded-sm shadow-[0_0_8px_#9CFF45]" />
              )}
            </div>

            {/* Generated Image Cards Block if populated via metadata */}
            {!isUser && message.generatedImages && message.generatedImages.length > 0 && (
              <div className="mt-3 flex flex-col gap-3">
                {message.generatedImages.map((genImg) => (
                  <GeneratedImageCard
                    key={genImg.id}
                    image={genImg}
                    onPreview={onPreviewImage}
                    onRegenerate={onRegenerateImage}
                  />
                ))}
              </div>
            )}

            {/* Document RAG Citations */}
            {!isUser && message.sources && message.sources.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-white/10">
                <div className="text-[10px] font-mono text-[#9CFF45] uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3 h-3 text-[#9CFF45]" />
                  <span>Document Sources ({message.sources.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveExcerptIndex(activeExcerptIndex === idx ? null : idx)}
                      className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                        activeExcerptIndex === idx
                          ? 'bg-[#153218] border-[#9CFF45] text-white shadow-[0_0_12px_rgba(156,255,69,0.3)]'
                          : 'bg-[#0a180b] border-[rgba(180,255,100,0.2)] hover:border-[#9CFF45]/50 text-[#A8B0A5]'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-[#9CFF45]" />
                      <span className="font-semibold">{src.file_name}</span>
                      {src.page_number && <span className="opacity-70">p.{src.page_number}</span>}
                    </button>
                  ))}
                </div>
                {activeExcerptIndex !== null && message.sources[activeExcerptIndex]?.excerpt && (
                  <div className="mt-2 p-2.5 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.25)] text-xs text-[#A8B0A5] font-sans italic animate-fadeIn">
                    "{message.sources[activeExcerptIndex].excerpt}"
                  </div>
                )}
              </div>
            )}

            {/* Web Search Sources */}
            {!isUser && message.webSources && message.webSources.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-white/10">
                <div className="text-[10px] font-mono text-[#9CFF45] uppercase tracking-widest font-semibold mb-2">
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
            <div className="mt-2 px-2 flex items-center justify-between text-xs text-[#A8B0A5] flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-[10px] text-[#9CFF45] tracking-wider font-semibold">
                  <Sparkles className="w-3 h-3 text-[#9CFF45]" />
                  <span>PML NEURAL CORE</span>
                </div>

                {message.memoriesUsed && message.memoriesUsed.length > 0 && (
                  <div
                    className="flex items-center gap-1 text-[10px] text-white bg-[#122814] px-2.5 py-0.5 rounded-full border border-[rgba(180,255,100,0.25)]"
                    title={`Recalled memories:\n${message.memoriesUsed.map(m => `• ${m}`).join('\n')}`}
                  >
                    <Brain className="w-2.5 h-2.5 text-[#9CFF45]" />
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
                  {copied ? <Check className="w-3.5 h-3.5 text-[#9CFF45]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Read Aloud / Stop Voice Button */}
                {isSpeakingThis ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#153218] border border-[#9CFF45]/50 text-[#9CFF45] text-xs shadow-[0_0_12px_rgba(156,255,69,0.3)]">
                    <span className="flex items-center gap-0.5">
                      <span className="w-0.5 h-2.5 bg-[#9CFF45] rounded-full animate-bounce" />
                      <span className="w-0.5 h-3.5 bg-[#B5FF6A] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-0.5 h-2 bg-[#9CFF45] rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                    <button
                      onClick={() => voiceService.stopSpeaking()}
                      className="p-0.5 hover:text-rose-400 text-[#9CFF45] transition-colors cursor-pointer"
                      title="Stop Audio Playback"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleToggleSpeak}
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white text-[#A8B0A5] transition-colors cursor-pointer"
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
                    userFeedback === 'like' ? 'text-[#9CFF45] bg-[#153218] border border-[#9CFF45]/40' : 'hover:bg-white/10 hover:text-white'
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
