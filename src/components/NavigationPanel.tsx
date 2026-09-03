import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SquarePen,
  Images,
  Library,
  Clock,
  Puzzle,
  Folder,
  Code,
  MoreHorizontal,
  MessageCircle,
  Pin,
  Star,
  Trash2, 
  X, 
  LogOut, 
  Settings,
  PanelLeftClose,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Separate pinned (starred) and recent conversations
  const { pinnedConversations, recentConversations } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = conversations.filter(c => {
      if (!query) return true;
      const titleMatch = (c.title || '').toLowerCase().includes(query);
      const messagesMatch = (c.messages || []).some(m => 
        (m.content || '').toLowerCase().includes(query)
      );
      return titleMatch || messagesMatch;
    });

    return {
      pinnedConversations: matches.filter(c => c.isStarred),
      recentConversations: matches.filter(c => !c.isStarred),
    };
  }, [conversations, searchQuery]);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 z-[990] transition-opacity duration-300 backdrop-blur-xs"
        />
      )}

      {/* Modern Slidebar / Drawer matching Reference Style with Green & Black Effect */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[1000] w-68 sm:w-72
          bg-[#040805] border-r border-[rgba(180,255,100,0.2)] 
          backdrop-blur-2xl flex flex-col h-full
          transition-all duration-300 ease-out 
          shadow-[20px_0_50px_rgba(0,0,0,0.95)]
          ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
        `}
      >
        {/* Subtle Ambient Green Aura Glow in Top Header */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#9CFF45]/10 via-transparent to-transparent pointer-events-none" />

        {/* TOP HEADER: PML Title + Search & Sidebar Collapse Icons */}
        <div className="relative pt-4 pb-2 px-4 flex items-center justify-between z-10 flex-shrink-0">
          <div 
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              onToggle();
            }}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <h1 className="font-bold text-xl tracking-tight text-white group-hover:text-[#9CFF45] transition-colors drop-shadow-sm">
              PML
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search Icon Trigger */}
            <button
              onClick={() => setIsSearchOpen(prev => !prev)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isSearchOpen 
                  ? 'text-[#9CFF45] bg-[#122814] border border-[rgba(180,255,100,0.3)] shadow-[0_0_12px_rgba(156,255,69,0.2)]' 
                  : 'text-[#A8B0A5] hover:text-[#9CFF45] hover:bg-[#122814]/70'
              }`}
              title="Search chats"
            >
              <Search className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>

            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={onToggle}
              className="p-2 rounded-xl text-[#A8B0A5] hover:text-[#9CFF45] hover:bg-[#122814]/70 transition-all cursor-pointer"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {isSearchOpen && (
          <div className="relative px-3.5 pb-2 pt-1 z-10 flex-shrink-0">
            <div className="relative flex items-center px-3 py-2 rounded-xl bg-[#08150a] border border-[rgba(180,255,100,0.25)] text-xs shadow-inner">
              <Search className="w-4 h-4 text-[#9CFF45] mr-2.5 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-transparent text-xs text-white placeholder-[#758072] focus:outline-none font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#A8B0A5] hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TOP FIXED NAVIGATION ITEMS (Always visible, never scrolled away) */}
        <div className="px-2.5 pt-1 pb-2 space-y-1 flex-shrink-0 z-10 border-b border-[rgba(180,255,100,0.12)]">
          {/* New chat */}
          <button
            onClick={() => {
              onNewConversation();
              onToggle();
            }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white bg-[#122814]/40 hover:bg-[#122814] border border-[rgba(180,255,100,0.2)] hover:border-[rgba(180,255,100,0.4)] shadow-[0_0_12px_rgba(156,255,69,0.08)] transition-all cursor-pointer text-left group"
          >
            <SquarePen className="w-5 h-5 text-[#9CFF45] group-hover:scale-110 transition-transform" />
            <span className="text-white group-hover:text-[#9CFF45] transition-colors">New chat</span>
          </button>

          {/* Images */}
          <button
            onClick={() => {
              if (onOpenDocuments) onOpenDocuments();
              onToggle();
            }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-white/90 hover:text-white hover:bg-[#122814]/70 border border-transparent hover:border-[rgba(180,255,100,0.25)] transition-all cursor-pointer text-left group"
          >
            <Images className="w-5 h-5 text-[#9CFF45]/80 group-hover:text-[#9CFF45] transition-colors" />
            <span>Images</span>
          </button>

          {/* Library */}
          <button
            onClick={() => {
              if (onOpenDocuments) onOpenDocuments();
              onToggle();
            }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-white/90 hover:text-white hover:bg-[#122814]/70 border border-transparent hover:border-[rgba(180,255,100,0.25)] transition-all cursor-pointer text-left group"
          >
            <Library className="w-5 h-5 text-white/80 group-hover:text-[#9CFF45] transition-colors" />
            <span>Library</span>
          </button>

          {/* Codex */}
          <button
            onClick={() => {
              if (onOpenMemory) onOpenMemory();
              onToggle();
            }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-white/90 hover:text-white hover:bg-[#122814]/70 border border-transparent hover:border-[rgba(180,255,100,0.25)] transition-all cursor-pointer text-left group"
          >
            <Code className="w-5 h-5 text-white/80 group-hover:text-[#9CFF45] transition-colors" />
            <span>Codex</span>
          </button>

          {/* More */}
          <button
            onClick={() => {
              onOpenSettings();
              onToggle();
            }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-white/90 hover:text-white hover:bg-[#122814]/70 border border-transparent hover:border-[rgba(180,255,100,0.25)] transition-all cursor-pointer text-left group"
          >
            <MoreHorizontal className="w-5 h-5 text-white/80 group-hover:text-[#9CFF45] transition-colors" />
            <span>More</span>
          </button>
        </div>

        {/* SCROLLABLE CONVERSATIONS AREA (Pinned & Recents) */}
        <div className="relative flex-1 overflow-y-auto px-2.5 py-2 space-y-4 select-none scrollbar-thin z-10">

          {/* PINNED SECTION */}
          {pinnedConversations.length > 0 && (
            <div>
              <div className="px-3.5 pb-1.5 pt-4 text-[12px] font-semibold text-[#8e8e93] select-none tracking-wide">
                Pinned
              </div>
              <div className="space-y-1">
                {pinnedConversations.map(conv => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onToggle();
                      }}
                      className={`
                        group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs
                        transition-all duration-200
                        ${
                          isActive
                            ? 'bg-[#0f2412] text-white font-medium border border-[rgba(180,255,100,0.35)] shadow-[0_0_18px_rgba(156,255,69,0.18)]'
                            : 'text-white/85 hover:text-white hover:bg-[#122814]/60 border border-transparent hover:border-[rgba(180,255,100,0.15)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <MessageCircle className="w-4 h-4 flex-shrink-0 text-[#9CFF45]/80 group-hover:text-[#9CFF45]" />
                        <span className="truncate flex-1 font-sans text-[13px]">{conv.title || 'New Chat'}</span>
                      </div>

                      {/* Pin toggle & delete */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => onToggleStarConversation(conv.id, e)}
                          className="p-1 rounded hover:bg-white/10 text-[#9CFF45] cursor-pointer"
                          title="Unpin"
                        >
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={e => onDeleteConversation(conv.id, e)}
                          className="p-1 rounded hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 cursor-pointer"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECENTS SECTION */}
          <div>
            <div className="px-3.5 pb-1.5 pt-4 text-[12px] font-semibold text-[#8e8e93] select-none tracking-wide">
              Recents
            </div>
            <div className="space-y-1">
              {recentConversations.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-[#71717a] italic">
                  {searchQuery ? 'No matching chats' : 'No recent chats'}
                </div>
              ) : (
                recentConversations.map(conv => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onToggle();
                      }}
                      className={`
                        group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs
                        transition-all duration-200
                        ${
                          isActive
                            ? 'bg-[#0f2412] text-white font-medium border border-[rgba(180,255,100,0.35)] shadow-[0_0_18px_rgba(156,255,69,0.18)]'
                            : 'text-white/85 hover:text-white hover:bg-[#122814]/60 border border-transparent hover:border-[rgba(180,255,100,0.15)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <MessageCircle className="w-4 h-4 flex-shrink-0 text-[#A8B0A5]/70 group-hover:text-[#9CFF45]" />
                        <span className="truncate flex-1 font-sans text-[13px]">{conv.title || 'New Chat'}</span>
                      </div>

                      {/* Hover Actions: Pin & Delete */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => onToggleStarConversation(conv.id, e)}
                          className="p-1 rounded hover:bg-white/10 text-[#A8B0A5] hover:text-[#9CFF45] cursor-pointer"
                          title="Pin conversation"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => onDeleteConversation(conv.id, e)}
                          className="p-1 rounded hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 cursor-pointer"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM USER PROFILE & SETTINGS BAR */}
        <div className="relative p-3.5 border-t border-[rgba(180,255,100,0.15)] flex items-center justify-between text-xs text-[#A8B0A5] bg-[#030704] z-10">
          {isAuthenticated ? (
            <div
              onClick={() => {
                onOpenProfile();
                onToggle();
              }}
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:text-white group"
            >
              <div className="w-7.5 h-7.5 rounded-full bg-[#9CFF45] text-[#050805] font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-[0_0_10px_rgba(156,255,69,0.3)] group-hover:scale-105 transition-transform">
                {userProfile.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="truncate flex-1">
                <p className="font-semibold text-white group-hover:text-[#9CFF45] transition-colors truncate text-xs">{userProfile.name}</p>
                <p className="text-[10px] text-[#A8B0A5] truncate">{userProfile.email}</p>
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
              <span className="font-medium text-xs">Sign In / Sign Up</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onOpenSettings();
                onToggle();
              }}
              className="p-2 rounded-xl hover:bg-[#122814] text-[#A8B0A5] hover:text-[#9CFF45] border border-transparent hover:border-[rgba(180,255,100,0.25)] transition-all cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {isAuthenticated && onSignOut && (
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl hover:bg-rose-500/20 text-[#A8B0A5] hover:text-rose-300 transition-colors cursor-pointer"
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

