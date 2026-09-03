import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Conversation, PMLCoreState, DocumentItem, Attachment, GeneratedImage } from '../types/pml';
import { MessageItem } from './MessageItem';
import { WelcomeExperience } from './WelcomeExperience';
import { PMLCore } from './PMLCore';

interface ConversationWorkspaceProps {
  activeConversation: Conversation | null;
  coreState: PMLCoreState;
  onRegenerateResponse: () => void;
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void;
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
  speechLanguage?: string;
  isStreaming?: boolean;
  onStopGeneration?: () => void;
  onOpenMemory?: () => void;
  onOpenAuth?: () => void;
  onPreviewImage?: (image: GeneratedImage) => void;
  onRegenerateImage?: (prompt: string, style?: string, aspectRatio?: string) => void;
  currentView?: 'home' | 'chat';
  onNavigateView?: (view: 'home' | 'chat') => void;
}

export const ConversationWorkspace: React.FC<ConversationWorkspaceProps> = ({
  activeConversation,
  coreState,
  onRegenerateResponse,
  onFeedback,
  onSendMessage,
  selectedDocument,
  onClearDocumentScope,
  onOpenDocumentLibrary,
  onUploadDocument,
  speechLanguage = 'en-US',
  isStreaming = false,
  onStopGeneration,
  onOpenMemory,
  onPreviewImage,
  onRegenerateImage,
  currentView = 'home',
  onNavigateView,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (bottomRef.current && activeConversation && activeConversation.messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages, coreState]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If on Home View or no conversation messages yet: Display Just the Functional Front Page
  const isLandingView = currentView === 'home' || !activeConversation || activeConversation.messages.length === 0;

  if (isLandingView) {
    return (
      <div 
        ref={containerRef}
        className="flex-1 w-full min-h-0 overflow-y-auto flex flex-col justify-center items-center relative z-10 select-none"
      >
        {/* Exact Front Page from Reference Image */}
        <WelcomeExperience
          activeConversationId={activeConversation?.id}
          onSendMessage={(text, atts) => {
            if (onNavigateView) onNavigateView('chat');
            if (onSendMessage) onSendMessage(text, atts);
          }}
          selectedDocument={selectedDocument}
          onClearDocumentScope={onClearDocumentScope}
          onOpenDocumentLibrary={onOpenDocumentLibrary}
          onUploadDocument={onUploadDocument}
          speechLanguage={speechLanguage}
          isStreaming={isStreaming}
          onStopGeneration={onStopGeneration}
          onOpenMemory={onOpenMemory}
        />
      </div>
    );
  }

  // Active Chat Conversation Mode
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full relative z-10"
    >
      {/* Thread Title Badge */}
      <div className="text-center my-2 py-1 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => onNavigateView && onNavigateView('home')}
          className="text-xs text-[#A8B0A5] hover:text-[#9CFF45] transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>← Back to Home</span>
        </button>

        <span className="text-[11px] font-mono text-[#9CFF45] bg-[#0c180d] px-3.5 py-1 rounded-full border border-[rgba(180,255,100,0.2)]">
          {activeConversation.title || 'Live Session'}
        </span>

        <div className="w-16" />
      </div>

      {/* Message List */}
      {activeConversation.messages.map((message, idx) => (
        <MessageItem
          key={message.id}
          message={message}
          onRegenerate={idx === activeConversation.messages.length - 1 ? onRegenerateResponse : undefined}
          onFeedback={onFeedback}
          onPreviewImage={onPreviewImage}
          onRegenerateImage={onRegenerateImage}
        />
      ))}

      {/* Thinking State Animation */}
      {coreState === 'thinking' && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.3)] my-3 max-w-lg shadow-[0_0_20px_rgba(156,255,69,0.15)] animate-pulse">
          <PMLCore size="small" state="thinking" />
          <div>
            <p className="text-xs font-bold text-[#9CFF45] uppercase tracking-wide">PML AI synthesizing answer...</p>
            <p className="text-[11px] text-[#A8B0A5]">Routing tools, verifying formulas & retrieving facts</p>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 right-8 p-2.5 rounded-full bg-[#122814] border border-[#9CFF45]/50 text-[#9CFF45] hover:text-white shadow-[0_0_20px_rgba(156,255,69,0.35)] transition-all animate-bounce z-40 cursor-pointer"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
