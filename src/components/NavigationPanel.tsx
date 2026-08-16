import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MessageSquare, 
  Star, 
  Settings, 
  ChevronLeft, 
  Trash2, 
  Sparkles, 
  X, 
  LogOut, 
  Brain, 
  BookOpen, 
  Calendar, 
  Layers
} from 'lucide-react';
import type { Conversation, UserProfile as UserProfileType } from '../types/pml';
import { PMLCore } from './PMLCore';

interface NavigationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onToggleStarConversation: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenMemory?: () => void;
  onOpenDocuments?: () => void;
  userProfile: UserProfileType;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onToggleStarConversation,
  onOpenSettings,
  onOpenProfile,
  onOpenMemory,
  onOpenDocuments,
  userProfile,
  isAuthenticated = false,
  onOpenAuth,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'starred'>('all');

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations
      .filter(c => filterMode === 'all' || c.isStarred)
      .filter(c => {
        if (!query) return true;
        const titleMatch = (c.title || '').toLowerCase().includes(query);
        const messagesMatch = (c.messages || []).some(m => 
          (m.content || '').toLowerCase().includes(query)
        );
        return titleMatch || messagesMatch;
      });
  }, [conversations, filterMode, searchQuery]);

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return d.toLocaleDateString([], { weekday: 'short' });
      } else {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Floating Holographic Glass Navigation Panel */}
      <aside
        className={`
          fixed top-3 left-3 bottom-3 z-50 w-80 
          bg-[#0a0518]/95 border border-purple-500/30 
          backdrop-blur-2xl rounded-3xl flex flex-col 
          transition-all duration-300 ease-out transform 
          shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(168,85,247,0.15),0_0_30px_rgba(139,92,246,0.25)]
          ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[115%] opacity-0 pointer-events-none'}
        `}
      >
        {/* Header Identity */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div 
            onClick={onNewConversation}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <PMLCore size="small" state="idle" />
            <div>
              <h1 className="font-display font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 group-hover:brightness-125 transition-all">
                PML AI
              </h1>
              <p className="text-[10px] font-mono text-purple-300 tracking-widest uppercase font-semibold">
                NEURAL NAVIGATION
              </p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Futuristic New Chat Button */}
        <div className="p-4 space-y-3 border-b border-white/10">
          {/* Futuristic Primary New Chat Control */}
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 1024) onToggle();
            }}
            className="
              w-full py-3 px-4 rounded-2xl
              bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 
              hover:from-violet-500 hover:to-purple-500 
              text-white font-display font-bold text-xs uppercase tracking-wider 
              flex items-center justify-center gap-2.5 
              border border-white/30 
              shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.75)]
              hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98]
              transition-all duration-200 cursor-pointer
            "
          >
            <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
            <span>✦ NEW CONVERSATION</span>
          </button>

          {/* Quick Hub Controls: Documents & Memory */}
          <div className="grid grid-cols-2 gap-2">
            {onOpenDocuments && (
              <button
                onClick={onOpenDocuments}
                className="
                  py-2.5 px-3 rounded-xl 
                  bg-[#120822]/80 hover:bg-[#1f0e38]/90 
                  border border-purple-500/30 hover:border-purple-400/60 
                  text-purple-200 hover:text-white text-xs font-sans font-semibold 
                  flex items-center justify-center gap-1.5 
                  shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]
                  transition-all duration-200 cursor-pointer
                "
                title="Document Intelligence & RAG Library"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>Documents</span>
              </button>
            )}

            {onOpenMemory && (
              <button
                onClick={onOpenMemory}
                className="
                  py-2.5 px-3 rounded-xl 
                  bg-[#120822]/80 hover:bg-[#1f0e38]/90 
                  border border-purple-500/30 hover:border-purple-400/60 
                  text-purple-200 hover:text-white text-xs font-sans font-semibold 
                  flex items-center justify-center gap-1.5 
                  shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]
                  transition-all duration-200 cursor-pointer
                "
                title="Long-Term AI Memory Console"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Memory</span>
              </button>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#090414] border border-white/12 focus-within:border-purple-400 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
            <Search className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400/70 focus:outline-none font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#080312] border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-display text-xs transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-purple-600/40 text-white font-bold border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-white font-medium border border-transparent'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>All ({conversations.length})</span>
            </button>
            <button
              onClick={() => setFilterMode('starred')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-display text-xs transition-all cursor-pointer ${
                filterMode === 'starred'
                  ? 'bg-purple-600/40 text-white font-bold border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-white font-medium border border-transparent'
              }`}
            >
              <Star className="w-3 h-3" />
              <span>Starred</span>
            </button>
          </div>
        </div>

        {/* Section Header */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[10px] font-mono text-purple-300 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>
              {searchQuery
                ? `Results (${filteredConversations.length})`
                : isAuthenticated 
                  ? `Past Conversations (${conversations.length})`
                  : `Guest Sessions (${conversations.length})`
              }
            </span>
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5 cosmic-scroll">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-3">
              <MessageSquare className="w-7 h-7 text-purple-400/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-white">No Sessions Found</p>
              <p className="text-[11px] text-purple-300/70 mt-1">
                {searchQuery ? `No sessions match "${searchQuery}".` : 'Start a new conversation to begin.'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              const formattedDate = formatTimestamp(conv.updatedAt || conv.createdAt);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={`
                    group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer
                    transition-all duration-200 select-none
                    ${isActive
                      ? 'bg-gradient-to-r from-violet-600/35 via-purple-600/30 to-indigo-600/30 border border-purple-400/70 shadow-[0_0_20px_rgba(139,92,246,0.35)]'
                      : 'hover:bg-white/[0.06] border border-transparent text-slate-300 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple-300' : 'text-purple-400/80 group-hover:text-purple-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate font-bold text-white group-hover:text-purple-200 transition-colors font-sans">
                        {conv.title === 'New Cosmic Thread' ? 'PML AI' : (conv.title || 'PML AI')}
                      </p>
                      {formattedDate && (
                        <p className="text-[10px] font-mono text-purple-300/70 truncate flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5 opacity-60" />
                          <span>{formattedDate}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Pin & Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={e => onToggleStarConversation(conv.id, e)}
                      className={`p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
                        conv.isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'
                      }`}
                      title={conv.isStarred ? 'Unstar session' : 'Star session'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={e => onDeleteConversation(conv.id, e)}
                      className="p-1 rounded-lg hover:bg-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Profile & Settings */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-[#080312]/90 rounded-b-3xl gap-1">
          <button
            onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
            className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-white/10 text-left transition-colors flex-1 min-w-0 mr-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_12px_rgba(139,92,246,0.5)] flex-shrink-0 border border-purple-400/40">
              {(userProfile.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors font-sans">
                {isAuthenticated ? userProfile.name : 'Guest Explorer'}
              </p>
              <p className="text-[10px] text-purple-300 font-mono truncate">
                {isAuthenticated ? userProfile.email : 'Click to Sign In'}
              </p>
            </div>
          </button>

          {isAuthenticated && onSignOut && (
            <button
              onClick={onSignOut}
              className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-400 transition-colors cursor-pointer"
            title="PML Control System"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
