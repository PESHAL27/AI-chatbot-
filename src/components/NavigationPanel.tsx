import React, { useState, useMemo } from 'react';
import { 
  Plus, 
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

  // Filter conversations by search term and starred status
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

  // Format relative timestamp
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

      {/* Floating Glass Navigation Drawer */}
      <aside
        className={`fixed top-3 left-3 bottom-3 z-50 w-80 glass-floating-nav rounded-2xl flex flex-col transition-all duration-300 ease-out transform border border-white/15 shadow-[0_0_50px_rgba(139,92,246,0.2)] bg-[#0c081e]/95 backdrop-blur-xl ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[115%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header Branding */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div 
            onClick={onNewConversation}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <PMLCore size="small" state="idle" />
            <div>
              <h1 className="font-display font-black text-2xl tracking-wider text-gradient-violet group-hover:brightness-125 transition-all">
                PML
              </h1>
              <p className="text-[10px] font-mono text-purple-300/90 tracking-widest uppercase font-semibold">
                SPACE INTELLIGENCE
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

        {/* Action Controls */}
        <div className="p-4 space-y-3 border-b border-white/10">
          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 1024) onToggle();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-display font-bold text-xs md:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] transition-all duration-300 active:scale-98 border border-white/20 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 text-white" />
            <span>New Cosmic Chat</span>
          </button>

          {/* Quick Hub Buttons: Documents & Memory */}
          <div className="grid grid-cols-2 gap-2">
            {onOpenDocuments && (
              <button
                onClick={onOpenDocuments}
                className="py-2 px-3 rounded-xl bg-violet-950/50 hover:bg-violet-900/70 border border-violet-500/30 text-violet-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Document Intelligence & RAG Library"
              >
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                <span>Documents</span>
              </button>
            )}

            {onOpenMemory && (
              <button
                onClick={onOpenMemory}
                className="py-2 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Long-Term AI Memory Console"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Memory</span>
              </button>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 border border-white/15 focus-within:border-purple-400 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
            <Search className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations & messages..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
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

          {/* Category Tabs: All vs Starred */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-display text-xs transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'pml-tab-active font-bold'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>All ({conversations.length})</span>
            </button>
            <button
              onClick={() => setFilterMode('starred')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-display text-xs transition-all cursor-pointer ${
                filterMode === 'starred'
                  ? 'pml-tab-active font-bold'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Star className="w-3 h-3" />
              <span>Starred</span>
            </button>
          </div>
        </div>

        {/* Section Header with Match Count */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono text-purple-300/80 uppercase tracking-wider">
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-purple-400 hover:underline cursor-pointer lowercase text-[10px]"
            >
              reset
            </button>
          )}
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5 cosmic-scroll">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-3">
              <MessageSquare className="w-7 h-7 text-purple-400/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-white">No Conversations Found</p>
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
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/40 via-purple-600/30 to-indigo-600/30 border border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                      : 'hover:bg-white/5 border border-transparent text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple-300' : 'text-purple-400/80 group-hover:text-purple-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate font-bold text-white group-hover:text-purple-200 transition-colors">
                        {conv.title || 'Untitled Session'}
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
                      className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                        conv.isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'
                      }`}
                      title={conv.isStarred ? 'Unstar session' : 'Star session'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={e => onDeleteConversation(conv.id, e)}
                      className="p-1 rounded hover:bg-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-black/80 rounded-b-2xl gap-1">
          <button
            onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/10 text-left transition-colors flex-1 min-w-0 mr-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_12px_rgba(139,92,246,0.5)] flex-shrink-0 border border-purple-400/40">
              {(userProfile.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
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
              title="Sign Out / Disconnect"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-400 transition-colors cursor-pointer"
            title="PML Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
