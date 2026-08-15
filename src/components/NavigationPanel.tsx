import React, { useState } from 'react';
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
  Brain
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
  userProfile,
  isAuthenticated = false,
  onOpenAuth,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'starred'>('all');

  const filteredConversations = conversations
    .filter(c => filterMode === 'all' || c.isStarred)
    .filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Floating Glass Navigation Drawer */}
      <aside
        className={`fixed top-4 left-4 bottom-4 z-50 w-80 glass-floating-nav rounded-2xl flex flex-col transition-all duration-300 ease-out transform border border-red-500/30 shadow-[0_0_40px_rgba(255,0,60,0.15)] ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header Branding */}
        <div className="p-5 flex items-center justify-between border-b border-red-500/25">
          <div 
            onClick={onNewConversation}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <PMLCore size="small" state="idle" />
            <div>
              <h1 className="font-display font-black text-2xl tracking-wider text-gradient-red group-hover:brightness-125 transition-all">
                PLM
              </h1>
              <p className="text-xs font-mono text-purple-300/90 tracking-widest uppercase font-semibold">
                SPACE INTELLIGENCE
              </p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-red-950/40 text-slate-400 hover:text-white transition-colors"
            title="Collapse Navigation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-5 space-y-5">
          {/* New Conversation Button */}
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) onToggle();
            }}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-display font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:shadow-[0_0_35px_rgba(147,51,234,0.7)] transition-all duration-300 active:scale-98 my-2 border border-white/20"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>New Chat</span>
          </button>

          {/* Search Input Bar with Left Icon + Colon Separator */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/70 border border-white/15 focus-within:border-purple-500 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all my-4">
            <div className="flex items-center gap-1.5 text-purple-400 select-none flex-shrink-0">
              <Search className="w-4 h-4 text-purple-400" />
              <span className="font-mono text-purple-400 font-bold text-sm">:</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs: All vs Starred (Neon Tabs Design from Image 3) */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 border border-white/10 text-sm mt-4">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-display text-xs md:text-sm transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'plm-tab-active font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>All ({conversations.length})</span>
            </button>
            <button
              onClick={() => setFilterMode('starred')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-display text-xs md:text-sm transition-all cursor-pointer ${
                filterMode === 'starred'
                  ? 'plm-tab-active font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Saved</span>
            </button>
          </div>
        </div>

        {/* Conversation List Stream (Separated with Border & Padding) */}
        <div className="flex-1 overflow-y-auto cosmic-scroll px-4 pt-3 pb-2 space-y-3 border-t border-white/10">
          <div className="px-1 text-xs font-mono uppercase tracking-widest text-purple-300 font-bold mb-1">
            History Logs
          </div>
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center px-4">
              <Sparkles className="w-8 h-8 mx-auto text-purple-400/50 mb-2" />
              <p className="text-sm text-slate-100 font-semibold">No sessions found</p>
              <p className="text-xs text-slate-300 mt-1">
                {searchQuery ? 'Try another search keyword' : 'Start a new chat session with PLM'}
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
                    if (window.innerWidth < 768) onToggle();
                  }}
                  className={`group relative p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-200 plm-neon-card ${
                    isActive
                      ? 'plm-tab-active font-bold text-white'
                      : 'hover:border-white/30 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <MessageSquare className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-purple-300' : 'text-purple-400'}`} />
                    <span className="text-sm truncate font-bold text-white group-hover:text-purple-200 transition-colors">
                      {conv.title || 'Untitled Session'}
                    </span>
                  </div>

                  {/* Actions: Pin & Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => onToggleStarConversation(conv.id, e)}
                      className={`p-1 rounded hover:bg-white/10 transition-colors ${
                        conv.isStarred ? 'text-red-400' : 'text-slate-400 hover:text-red-300'
                      }`}
                      title={conv.isStarred ? 'Unstar session' : 'Star session'}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={e => onDeleteConversation(conv.id, e)}
                      className="p-1 rounded hover:bg-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Settings & Profile */}
        <div className="p-4 border-t border-red-500/25 flex items-center justify-between bg-black/70 rounded-b-2xl gap-1">
          <button
            onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-red-950/50 text-left transition-colors flex-1 min-w-0 mr-1 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-red-800 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_rgba(255,0,60,0.5)] flex-shrink-0">
              {(userProfile.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate group-hover:text-red-300 transition-colors">
                {isAuthenticated ? userProfile.name : 'Guest Explorer'}
              </p>
              <p className="text-xs text-red-400 font-mono truncate">
                {isAuthenticated ? userProfile.email : 'Click to Sign In'}
              </p>
            </div>
          </button>

          {onOpenMemory && (
            <button
              onClick={onOpenMemory}
              className="p-2 rounded-xl hover:bg-red-950/70 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
              title="PML Long-Term Memory Console"
            >
              <Brain className="w-4.5 h-4.5" />
            </button>
          )}

          {isAuthenticated && onSignOut && (
            <button
              onClick={onSignOut}
              className="p-2 rounded-xl hover:bg-red-950/70 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Sign Out / Disconnect"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-red-950/50 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            title="PML Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>
    </>
  );
};

