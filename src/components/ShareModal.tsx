import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  MessageSquare, 
  Calendar
} from 'lucide-react';
import type { Conversation } from '../types/pml';
import { useToast } from './ui/PMLToast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  conversation,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setHasNativeShare(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !conversation) return null;

  // Format the full conversation transcript cleanly in Markdown
  const formatConversationMarkdown = (): string => {
    const title = conversation.title || 'PML AI Conversation';
    const date = new Date(conversation.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let md = `# ${title}\n\n`;
    md += `*Shared from PML AI — Think Smarter with AI on ${date}*\n\n---\n\n`;

    conversation.messages.forEach((msg) => {
      const isUser = msg.role === 'user';
      const sender = isUser ? 'User' : 'PML AI';
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      md += `### ${sender} (${time})\n\n`;
      md += `${msg.content.trim()}\n\n`;

      if (msg.webImages && msg.webImages.length > 0) {
        md += `*Attached Photos (${msg.webImages.length}):*\n`;
        msg.webImages.forEach((img, idx) => {
          md += `- [${img.title || `Photo ${idx + 1}`}](${img.source_url || img.image_url}) (${img.source_name || 'Web Source'})\n`;
        });
        md += '\n';
      }

      if (msg.sources && msg.sources.length > 0) {
        md += `*Document Citations:*\n`;
        msg.sources.forEach((s) => {
          md += `- ${s.file_name}${s.page_number ? ` (p. ${s.page_number})` : ''}\n`;
        });
        md += '\n';
      }

      md += '---\n\n';
    });

    return md.trim();
  };

  const handleCopyTranscript = async () => {
    const text = formatConversationMarkdown();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Conversation Copied!', 'success', 'Full markdown transcript copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    const text = formatConversationMarkdown();
    const title = conversation.title || 'PML AI Conversation';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text.slice(0, 3000), // Within standard system intent limits
        });
        showToast('Shared successfully!', 'success');
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyTranscript();
        }
      }
    } else {
      handleCopyTranscript();
    }
  };

  const handleDownloadMarkdown = () => {
    const text = formatConversationMarkdown();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (conversation.title || 'PML_Chat')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    link.href = url;
    link.download = `${safeTitle}_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded!', 'success', 'Conversation saved as Markdown (.md)');
  };

  const messageCount = conversation.messages.length;
  const userQuestionsCount = conversation.messages.filter(m => m.role === 'user').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-xl w-full bg-[#081309] border border-[rgba(180,255,100,0.3)] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#050e06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#122814] border border-[#9CFF45]/30 flex items-center justify-center text-[#9CFF45] shadow-sm">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Share Conversation
              </h2>
              <p className="text-[11px] text-[#A8B0A5]">
                Export or share this entire chat with anyone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A8B0A5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Thread Card Info */}
          <div className="p-3.5 rounded-xl bg-[#0d1c0f] border border-[rgba(180,255,100,0.2)]">
            <h3 className="text-sm font-semibold text-white line-clamp-1">
              {conversation.title || 'Untitled Conversation'}
            </h3>
            <div className="mt-2 flex items-center gap-4 text-xs text-[#A8B0A5]">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#9CFF45]" />
                <span>{messageCount} messages ({userQuestionsCount} questions)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9CFF45]" />
                <span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Share Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Native Share */}
            {hasNativeShare && (
              <button
                onClick={handleNativeShare}
                className="btn-lime w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.25)] hover:shadow-[0_0_20px_rgba(156,255,69,0.4)]"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via System / Apps</span>
              </button>
            )}

            {/* Copy Full Transcript */}
            <button
              onClick={handleCopyTranscript}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                copied
                  ? 'bg-[#153218] border-[#9CFF45] text-white'
                  : 'bg-[#122814] border-[rgba(180,255,100,0.3)] hover:border-[#9CFF45] text-[#9CFF45] hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#9CFF45]" />
                  <span>Transcript Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Full Transcript</span>
                </>
              )}
            </button>

            {/* Download Markdown (.md) */}
            <button
              onClick={handleDownloadMarkdown}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer bg-[#0a180b] border border-white/15 hover:border-white/40 text-white transition-all hover:bg-white/5"
            >
              <Download className="w-4 h-4 text-[#9CFF45]" />
              <span>Download Markdown (.md)</span>
            </button>
          </div>

          {/* Quick Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#A8B0A5] px-1">
              <span>Transcript Preview</span>
              <span className="font-mono text-[#9CFF45]/80">Markdown</span>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-[#040905] p-3 max-h-36 overflow-y-auto font-mono text-[11px] text-white/80 leading-relaxed select-text">
              <pre className="whitespace-pre-wrap font-mono">
                {formatConversationMarkdown().slice(0, 500)}...
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#050e06] flex items-center justify-between text-xs text-[#A8B0A5]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#9CFF45]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PML Intelligent Sharing</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
