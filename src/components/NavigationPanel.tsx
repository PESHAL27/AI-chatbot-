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
  Plus,
  Home,
  User as UserIcon
} from 'lucide-react';
import type { Conversation, UserProfile as UserProfileType } from '../types/pml';

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
  onNavigateHome?: () => void;
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
  onNavigateHome,
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
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-xs"
        />
      )}

      {/* Modern Slidebar / Drawer */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-80
          bg-[#060f07]/95 border-r border-[rgba(180,255,100,0.18)] 
          backdrop-blur-2xl flex flex-col h-full
          transition-all duration-300 ease-out 
          shadow-[20px_0_50px_rgba(0,0,0,0.9)]
          ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
        `}
      >
        {/* Top Header: Logo & Close */}
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#040a05]">
          <div 
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              onToggle();
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-6 h-6 text-[#9CFF45] fill-current group-hover:scale-105 transition-transform">
                <circle cx="16" cy="16" r="3.2" fill="#9CFF45" />
                <circle cx="16" cy="6" r="2.2" fill="#9CFF45" opacity="0.9" />
                <circle cx="16" cy="26" r="2.2" fill="#9CFF45" opacity="0.9" />
                <circle cx="6" cy="16" r="2.2" fill="#9CFF45" opacity="0.9" />
                <circle cx="26" cy="16" r="2.2" fill="#9CFF45" opacity="0.9" />
                <circle cx="9" cy="9" r="1.8" fill="#9CFF45" opacity="0.75" />
                <circle cx="23" cy="9" r="1.8" fill="#9CFF45" opacity="0.75" />
                <circle cx="9" cy="23" r="1.8" fill="#9CFF45" opacity="0.75" />
                <circle cx="23" cy="23" r="1.8" fill="#9CFF45" opacity="0.75" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white group-hover:text-[#9CFF45] transition-all">
                PML AI
              </h1>
              <span className="text-[9px] font-mono text-[#9CFF45] font-semibold bg-[#122814] px-1.5 py-0.5 rounded border border-[rgba(180,255,100,0.25)] uppercase tracking-wider">
                WORKSPACE
              </span>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#A8B0A5] hover:text-white transition-colors cursor-pointer"
            title="Close Slidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Necessary Navigation Items */}
        <div className="p-3.5 space-y-2.5 border-b border-white/5">
          {/* Prominent "+ New Chat" Button */}
          <button
            onClick={() => {
              onNewConversation();
              onToggle();
            }}
            className="
              w-full py-2.5 px-4 rounded-xl
              btn-lime text-xs font-bold
              flex items-center justify-center gap-2 
              shadow-[0_0_20px_rgba(156,255,69,0.3)]
              transition-all duration-200 cursor-pointer
            "
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Essential / Necessary Quick Links */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                if (onNavigateHome) onNavigateHome();
                onToggle();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs font-medium text-[#A8B0A5] hover:text-white transition-colors cursor-pointer text-left"
            >
              <Home className="w-3.5 h-3.5 text-[#9CFF45]" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                if (onOpenDocuments) onOpenDocuments();
                onToggle();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs font-medium text-[#A8B0A5] hover:text-white transition-colors cursor-pointer text-left"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#9CFF45]" />
              <span>Documents</span>
            </button>

            <button
              onClick={() => {
                if (onOpenMemory) onOpenMemory();
                onToggle();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs font-medium text-[#A8B0A5] hover:text-white transition-colors cursor-pointer text-left"
            >
              <Brain className="w-3.5 h-3.5 text-[#9CFF45]" />
              <span>Memory</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                onToggle();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs font-medium text-[#A8B0A5] hover:text-white transition-colors cursor-pointer text-left"
            >
              <Settings className="w-3.5 h-3.5 text-[#9CFF45]" />
              <span>Settings</span>
            </button>
          </div>

          {/* Search Conversations */}
          <div className="relative flex items-center px-3 py-1.5 rounded-xl bg-[#09150a] border border-[rgba(180,255,100,0.15)] text-xs">
            <Search className="w-3.5 h-3.5 text-[#9CFF45] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent px-2 text-xs text-white placeholder-[#758072] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#A8B0A5] hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.25)]'
                  : 'text-[#A8B0A5] hover:text-white hover:bg-white/5'
              }`}
            >
              Recent ({conversations.length})
            </button>
            <button
              onClick={() => setFilterMode('starred')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                filterMode === 'starred'
                  ? 'bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.25)]'
                  : 'text-[#A8B0A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Saved</span>
            </button>
          </div>
        </div>

        {/* Recent Conversations List Header */}
        <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-wider text-[#758072]">
          <span>Conversations</span>
          <span>{filteredConversations.length}</span>
        </div>

        {/* Conversation List Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#A8B0A5] flex flex-col items-center gap-2.5">
              <MessageSquare className="w-7 h-7 text-[#A8B0A5]/40" />
              <p>{searchQuery ? `No matches found` : 'No past conversations yet.'}</p>
              <p className="text-[11px] text-[#758072]">Start chatting to save history</p>
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
                    group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-[#122814] text-white border border-[rgba(180,255,100,0.3)] shadow-[0_0_15px_rgba(156,255,69,0.15)] font-semibold'
                        : 'text-[#A8B0A5] hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#9CFF45]' : 'text-[#758072]'}`} />
                    <span className="truncate flex-1 font-sans">{conv.title || 'New Chat'}</span>
                  </div>

                  {/* Actions (Star / Delete) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => onToggleStarConversation(conv.id, e)}
                      className={`p-1 rounded hover:bg-white/10 ${conv.isStarred ? 'text-[#9CFF45] opacity-100' : 'text-[#A8B0A5]'} cursor-pointer`}
                      title={conv.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star className={`w-3 h-3 ${conv.isStarred ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={e => onDeleteConversation(conv.id, e)}
                      className="p-1 rounded hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Profile & Auth */}
        <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-[#A8B0A5] bg-[#030704]">
          {isAuthenticated ? (
            <div
              onClick={() => {
                onOpenProfile();
                onToggle();
              }}
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:text-white"
            >
              <div className="w-7 h-7 rounded-full bg-[#9CFF45] text-[#050805] font-bold flex items-center justify-center flex-shrink-0">
                {userProfile.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="truncate flex-1">
                <p className="font-semibold text-white truncate text-[11px]">{userProfile.name}</p>
                <p className="text-[9px] text-[#A8B0A5] truncate">{userProfile.email}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
                onToggle();
              }}
              className="flex items-center gap-2 text-white hover:text-[#9CFF45] cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-[#9CFF45]" />
              <span className="font-semibold text-xs">Sign In / Sign Up</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onOpenSettings();
                onToggle();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#A8B0A5] hover:text-white cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {isAuthenticated && onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
