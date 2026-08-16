import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MessageSquare, 
  Star, 
  Settings, 
  ChevronLeft, 
  Trash2, 
  X, 
  LogOut, 
  Brain, 
  BookOpen, 
  Plus
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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 transition-opacity duration-300"
        />
      )}

      {/* Left Menu Bar / Navigation Drawer */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-72 
          bg-[#070510]/95 border-r border-purple-500/25 
          backdrop-blur-2xl flex flex-col h-full
          transition-all duration-300 ease-out 
          shadow-[15px_0_40px_rgba(0,0,0,0.85)]
          ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
        `}
      >
        {/* Top Branding Section */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div 
            onClick={() => {
              onNewConversation();
              onToggle();
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="p-1 rounded-xl bg-purple-950/60 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <PMLCore size="small" state="idle" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 group-hover:brightness-125 transition-all">
                PML AI
              </h1>
              <span className="text-[9px] font-mono text-purple-300 font-bold bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/40 uppercase tracking-widest">
                UNIVERSE
              </span>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Menu Bar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Navigation Items */}
        <div className="p-3 space-y-2 border-b border-white/10">
          {/* Prominent "+ New Chat" Button */}
          <button
            onClick={() => {
              onNewConversation();
              onToggle();
            }}
            className="
              w-full py-2.5 px-3.5 rounded-xl
              bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 
              hover:from-violet-500 hover:to-purple-500 
              text-white font-sans font-bold text-xs tracking-wide
              flex items-center justify-center gap-2 
              border border-white/20 
              shadow-[0_0_18px_rgba(139,92,246,0.4)] hover:shadow-[0_0_28px_rgba(168,85,247,0.6)]
              hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.99]
              transition-all duration-200 cursor-pointer
            "
          >
            <Plus className="w-4 h-4 text-purple-200 stroke-[2.5]" />
            <span>New Chat</span>
          </button>

          {/* Quick Search Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0e081e]/80 border border-white/10 focus-within:border-purple-400 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all">
            <Search className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400/60 focus:outline-none font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Main Navigation Modules */}
          <nav className="space-y-1 pt-1">
            {onOpenDocuments && (
              <button
                onClick={() => {
                  onOpenDocuments();
                  onToggle();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] text-xs font-sans font-semibold transition-colors cursor-pointer text-left"
              >
                <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Documents & RAG</span>
              </button>
            )}

            {onOpenMemory && (
              <button
                onClick={() => {
                  onOpenMemory();
                  onToggle();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] text-xs font-sans font-semibold transition-colors cursor-pointer text-left"
              >
                <Brain className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Long-Term Memory</span>
              </button>
            )}
          </nav>
        </div>

        {/* Section Header: HISTORY */}
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-mono text-purple-300/80 uppercase tracking-wider font-semibold">
          <span>HISTORY</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterMode(filterMode === 'all' ? 'starred' : 'all')}
              className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                filterMode === 'starred' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
              }`}
              title={filterMode === 'starred' ? 'Show all chats' : 'Show starred only'}
            >
              <Star className="w-3 h-3 fill-current" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 cosmic-scroll">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-3">
              <MessageSquare className="w-6 h-6 text-purple-400/30 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-300">No chats found</p>
              <p className="text-[10px] text-slate-400/70 mt-0.5">
                {searchQuery ? `No matches for "${searchQuery}"` : 'Start a new conversation'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = conv.id === activeConversationId;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onToggle();
                  }}
                  className={`
                    group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer
                    transition-all duration-150 select-none text-left
                    ${isActive
                      ? 'bg-purple-600/25 border border-purple-400/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                      : 'hover:bg-white/[0.05] border border-transparent text-slate-300 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-purple-300' : 'text-purple-400/70 group-hover:text-purple-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate font-medium text-white group-hover:text-purple-200 transition-colors font-sans">
                        {conv.title === 'New Cosmic Thread' ? 'PML AI' : (conv.title || 'PML AI')}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Pin & Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={e => onToggleStarConversation(conv.id, e)}
                      className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                        conv.isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'
                      }`}
                      title={conv.isStarred ? 'Unstar chat' : 'Star chat'}
                    >
                      <Star className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={e => onDeleteConversation(conv.id, e)}
                      className="p-1 rounded hover:bg-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Profile Section: Settings button near Logout button */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-[#06040d]/95 gap-1.5">
          <button
            onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/10 text-left transition-colors flex-1 min-w-0 mr-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(139,92,246,0.5)] flex-shrink-0 border border-purple-400/40">
              {(userProfile.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors font-sans">
                {isAuthenticated ? userProfile.name : 'Guest Explorer'}
              </p>
              <p className="text-[10px] text-purple-300/80 font-mono truncate">
                {isAuthenticated ? userProfile.tier : 'Click to Sign In'}
              </p>
            </div>
          </button>

          {/* Settings button placed right near the Logout button */}
          <button
            onClick={() => {
              onOpenSettings();
              onToggle();
            }}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-400 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
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
        </div>
      </aside>
    </>
  );
};
