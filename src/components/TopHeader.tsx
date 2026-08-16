import React, { useState } from 'react';
import { Menu, Sun, Moon, Settings, Edit2, Check, Star, RefreshCw, LogIn, Sparkles } from 'lucide-react';
import type { Conversation, PMLCoreState, ThemeMode } from '../types/pml';
import { PMLCore } from './PMLCore';
import { PMLButton } from './ui/PMLButton';

interface TopHeaderProps {
  navOpen: boolean;
  onToggleNav: () => void;
  activeConversation: Conversation | null;
  onRenameConversation: (id: string, newTitle: string) => void;
  coreState: PMLCoreState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onClearChat?: () => void;
  onToggleStar?: () => void;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  navOpen,
  onToggleNav,
  activeConversation,
  onRenameConversation,
  coreState,
  theme,
  onToggleTheme,
  onOpenSettings,
  onClearChat,
  onToggleStar,
  isAuthenticated = false,
  onOpenAuth,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(activeConversation?.title || '');

  const handleSaveTitle = () => {
    if (activeConversation && titleInput.trim()) {
      onRenameConversation(activeConversation.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between z-30 pointer-events-auto border border-purple-500/20 bg-[#090514]/85 backdrop-blur-2xl rounded-2xl mx-3 mt-3 shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(139,92,246,0.15)] transition-all">
      {/* Left: Nav Toggle & Active Title */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={onToggleNav}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
            navOpen
              ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
              : 'bg-[#120822]/80 border-purple-500/30 hover:border-purple-400/60 text-purple-300 hover:text-white shadow-sm'
          }`}
          title={navOpen ? "Collapse Navigation" : "Expand Navigation"}
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <PMLCore size="small" state={coreState} />

          {activeConversation ? (
            isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="px-3 py-1 text-sm font-sans font-semibold rounded-xl bg-[#0f091f] border border-purple-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1.5 rounded-lg bg-purple-600/30 border border-purple-400 text-purple-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 group">
                <h2 className="font-sans font-bold text-sm md:text-base text-white truncate tracking-wide">
                  {activeConversation.title}
                </h2>
                <button
                  onClick={() => {
                    setTitleInput(activeConversation.title);
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-400 transition-opacity cursor-pointer"
                  title="Rename Session"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-base md:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                PML
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-purple-300/80 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-widest">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                <span>AI UNIVERSE</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions (Theme, Star, Clear, Settings, Sign In) */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {!isAuthenticated && onOpenAuth && (
          <PMLButton
            onClick={onOpenAuth}
            variant="primary"
            size="sm"
            icon={<LogIn className="w-3.5 h-3.5" />}
          >
            <span>Sign In</span>
          </PMLButton>
        )}

        {activeConversation && onToggleStar && (
          <button
            onClick={onToggleStar}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeConversation.isStarred
                ? 'bg-purple-600/30 border border-purple-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
            }`}
            title={activeConversation.isStarred ? 'Saved Conversation' : 'Save Conversation'}
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
        )}

        {activeConversation && onClearChat && (
          <button
            onClick={onClearChat}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-purple-300 border border-transparent transition-colors cursor-pointer"
            title="Reset Workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-300 border border-transparent transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light Celestial' : 'Dark Space'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-300 border border-transparent transition-colors cursor-pointer"
          title="PML Control System"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
