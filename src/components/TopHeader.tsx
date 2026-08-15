import React, { useState } from 'react';
import { Menu, Sun, Moon, Settings, Edit2, Check, Star, RefreshCw, LogIn } from 'lucide-react';
import type { Conversation, PMLCoreState, ThemeMode } from '../types/pml';
import { PMLCore } from './PMLCore';

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
    <header className="h-16 px-4 md:px-6 flex items-center justify-between z-30 pointer-events-auto border-b border-red-500/30 glass-panel rounded-b-2xl mx-2 mt-2 shadow-[0_4px_25px_rgba(255,0,60,0.12)]">
      {/* Left: Nav Toggle & Active Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleNav}
          className={`p-2 rounded-xl border transition-all shadow-sm ${
            navOpen
              ? 'bg-red-600/30 border-red-500 text-red-300 shadow-[0_0_12px_rgba(255,0,60,0.4)]'
              : 'bg-red-950/40 border-red-500/30 hover:bg-red-900/50 text-red-200 hover:text-white'
          }`}
          title={navOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
        >
          <Menu className="w-5 h-5" />
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
                  className="px-2.5 py-1 text-sm font-display rounded-lg bg-black/60 border border-red-500 text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-red-400 hover:text-white transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 group">
                <h2 className="font-display font-bold text-sm md:text-base text-white truncate tracking-wide">
                  {activeConversation.title}
                </h2>
                <button
                  onClick={() => {
                    setTitleInput(activeConversation.title);
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
                  title="Rename Title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          ) : (
            <div>
              <h2 className="font-display font-black text-base md:text-lg text-gradient-red tracking-wider">
                PML UNIVERSE
              </h2>
              <p className="text-[10px] font-mono text-red-400/90 uppercase tracking-widest">
                ADVANCED SPACE AI INTERFACE
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions (Theme, Star, Clear, Settings, Sign In) */}
      <div className="flex items-center gap-2">
        {!isAuthenticated && onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-display text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,0,60,0.45)] hover:shadow-[0_0_25px_rgba(255,23,68,0.7)] transition-all cursor-pointer mr-1"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {activeConversation && onToggleStar && (
          <button
            onClick={onToggleStar}
            className={`p-2 rounded-xl transition-all ${
              activeConversation.isStarred
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 shadow-[0_0_12px_rgba(255,0,60,0.3)]'
                : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
            title={activeConversation.isStarred ? 'Saved Conversation' : 'Save Conversation'}
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
        )}

        {activeConversation && onClearChat && (
          <button
            onClick={onClearChat}
            className="p-2 rounded-xl hover:bg-red-950/40 hover:text-red-300 text-slate-400 transition-colors"
            title="Reset Workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl hover:bg-red-950/40 hover:text-red-400 text-slate-300 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light Celestial' : 'Dark Space'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl hover:bg-red-950/40 hover:text-red-400 text-slate-300 transition-colors"
          title="PML Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

