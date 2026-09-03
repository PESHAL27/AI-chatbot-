import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Settings, 
  Menu, 
  ChevronDown, 
  FileText, 
  ImageIcon,
  X, 
  LogOut, 
  LogIn,
  User as UserIcon, 
  Plus 
} from 'lucide-react';
import type { Conversation, PMLCoreState, ThemeMode, DocumentItem, UserProfile } from '../types/pml';

interface TopHeaderProps {
  navOpen?: boolean;
  onToggleNav: () => void;
  activeConversation?: Conversation | null;
  onRenameConversation?: (id: string, newTitle: string) => void;
  coreState?: PMLCoreState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onClearChat?: () => void;
  onToggleStar?: () => void;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenDocuments?: () => void;
  onOpenMemory?: () => void;
  onSignOut?: () => void;
  userProfile?: UserProfile;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
  currentView?: 'home' | 'chat';
  onNavigateView?: (view: 'home' | 'chat', sectionId?: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  navOpen = false,
  onToggleNav,
  theme,
  onToggleTheme,
  onOpenSettings,
  onClearChat,
  isAuthenticated = false,
  onOpenAuth,
  onOpenProfile,
  onOpenDocuments,
  onSignOut,
  userProfile,
  selectedDocument,
  onClearDocumentScope,
  onNavigateView,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const isLight = theme === 'light';

  return (
    <header className="pml-navbar h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-40 w-full transition-all duration-200">
      {/* LEFT: Sidebar Toggle Button + PML Logo */}
      <div className="flex items-center gap-3">
        {/* Modern Sidebar Toggle Button */}
        <button
          onClick={onToggleNav}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            navOpen 
              ? 'bg-[#122814] text-[#9CFF45] border border-[rgba(180,255,100,0.3)] shadow-[0_0_15px_rgba(156,255,69,0.2)]' 
              : isLight 
                ? 'text-[#3d4a3c] hover:text-[#0a140a] hover:bg-black/5 border border-transparent' 
                : 'text-[#A8B0A5] hover:text-white hover:bg-white/5 border border-transparent'
          }`}
          title="Toggle Sidebar (Chats & Tools)"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo & Home Trigger */}
        <button 
          onClick={() => onNavigateView && onNavigateView('home')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          title="PML AI Home"
        >
          {/* Radial Dotted PML Symbol Icon */}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-7 h-7 text-[#9CFF45] fill-current group-hover:scale-105 transition-transform">
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
          <span className={`text-lg sm:text-xl font-black tracking-tight group-hover:text-[#9CFF45] transition-colors ${
            isLight ? 'text-[#0a140a]' : 'text-white'
          }`}>
            PML
          </span>
        </button>
      </div>

      {/* RIGHT: Selected Doc indicator, Theme toggle, Settings, User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Scoped Document Indicator */}
        {selectedDocument && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d200f] border border-[rgba(180,255,100,0.3)] text-xs text-[#9CFF45]">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">{selectedDocument.file_name}</span>
            {onClearDocumentScope && (
              <button
                onClick={onClearDocumentScope}
                className="hover:text-rose-400 cursor-pointer ml-0.5"
                title="Clear scoped document"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Dark / Bright Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            isLight 
              ? 'text-amber-600 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
              : 'text-[#9CFF45] hover:bg-[#9CFF45]/10 border border-[rgba(180,255,100,0.2)] hover:border-[rgba(180,255,100,0.4)] shadow-[0_0_12px_rgba(156,255,69,0.12)]'
          }`}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Bright Mode'}
        >
          {isLight ? (
            <Sun className="w-4 h-4 text-amber-500 hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-[#9CFF45] hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            isLight
              ? 'text-[#4a5549] hover:text-[#0a140a] hover:bg-black/5 border border-black/5 hover:border-black/10'
              : 'text-[#A8B0A5] hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* User Account / Sign in Button */}
        {isAuthenticated && userProfile ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(prev => !prev)}
              className={`flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full border transition-all cursor-pointer ${
                isLight
                  ? 'bg-black/5 hover:bg-black/10 border-black/10 text-gray-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-[#9CFF45] text-[#050805] text-xs font-bold flex items-center justify-center shadow-sm">
                {userProfile.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline-block text-xs font-medium max-w-[100px] truncate">
                {userProfile.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {userDropdownOpen && (
              <div 
                className={`absolute right-0 mt-2 w-48 py-1.5 rounded-2xl shadow-2xl backdrop-blur-xl z-50 text-xs ${
                  isLight
                    ? 'bg-white/95 border border-black/10 text-gray-700 shadow-black/15'
                    : 'bg-[#09120a] border border-[rgba(180,255,100,0.25)] text-[#A8B0A5]'
                }`}
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-[#9CFF45]/15 hover:text-emerald-700 dark:hover:text-white text-left cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#9CFF45]" />
                  <span>Profile & Account</span>
                </button>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-[#9CFF45]/15 hover:text-emerald-700 dark:hover:text-white text-left cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#9CFF45]" />
                  <span>Settings</span>
                </button>
                <div className="h-[1px] bg-black/5 dark:bg-white/10 my-1" />
                {onSignOut && (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200 text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full border border-[#9CFF45] bg-[#9CFF45]/15 text-[#9CFF45] hover:bg-[#9CFF45] hover:text-[#050805] text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.2)] hover:shadow-[0_0_20px_rgba(156,255,69,0.5)]"
          >
            <LogIn className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
