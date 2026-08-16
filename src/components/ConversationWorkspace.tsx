import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Conversation, PMLCoreState, QuickAction, DocumentItem, Attachment } from '../types/pml';
import { MessageItem } from './MessageItem';
import { WelcomeExperience } from './WelcomeExperience';
import { PMLCore } from './PMLCore';

interface ConversationWorkspaceProps {
  activeConversation: Conversation | null;
  coreState: PMLCoreState;
  onSelectQuickAction: (action: QuickAction) => void;
  onRegenerateResponse: () => void;
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void;
  onSendMessage?: (text: string, attachments?: Attachment[]) => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  onOpenDocumentLibrary?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
  speechLanguage?: string;
}

export const ConversationWorkspace: React.FC<ConversationWorkspaceProps> = ({
  activeConversation,
  coreState,
  onSelectQuickAction,
  onRegenerateResponse,
  onFeedback,
  onSendMessage,
  selectedDocument,
  onClearDocumentScope,
  onOpenDocumentLibrary,
  onUploadDocument,
  speechLanguage = 'en-US'
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (bottomRef.current) {
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

  if (!activeConversation || activeConversation.messages.length === 0) {
    return (
      <div className="flex-1 w-full min-h-0 overflow-y-auto cosmic-scroll flex flex-col items-center">
        <WelcomeExperience
          onSelectQuickAction={onSelectQuickAction}
          onSendMessage={onSendMessage}
          selectedDocument={selectedDocument}
          onClearDocumentScope={onClearDocumentScope}
          onOpenDocumentLibrary={onOpenDocumentLibrary}
          onUploadDocument={onUploadDocument}
          speechLanguage={speechLanguage}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto cosmic-scroll p-4 md:p-6 space-y-4 max-w-5xl mx-auto w-full relative"
    >
      {/* Session Title Header Card */}
      <div className="text-center my-4 py-2 border-b border-white/10">
        <span className="text-[10px] font-mono text-purple-300 tracking-widest uppercase bg-purple-950/60 px-3.5 py-1.5 rounded-full border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
          PML NEURAL SESSION • {new Date(activeConversation.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Message List */}
      {activeConversation.messages.map((message, idx) => (
        <MessageItem
          key={message.id}
          message={message}
          onRegenerate={idx === activeConversation.messages.length - 1 ? onRegenerateResponse : undefined}
          onFeedback={onFeedback}
        />
      ))}

      {/* Thinking State Animation Card */}
      {coreState === 'thinking' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl glass-panel cosmic-illuminated-edge bg-purple-950/30 border-purple-500/40 my-4 max-w-xl animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <PMLCore size="small" state="thinking" />
          <div>
            <p className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">PML core synthesizing response...</p>
            <p className="text-[10px] text-slate-400">Retrieving neural memory & document knowledge</p>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 p-3 rounded-full glass-panel bg-purple-600/30 border border-purple-500/50 text-purple-300 hover:text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all animate-bounce z-40"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
