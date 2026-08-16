import React, { useState } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Settings, 
  Edit2, 
  Check, 
  RefreshCw, 
  LogIn, 
  ChevronDown,
  Cpu,
  FileText,
  X
} from 'lucide-react';
import type { Conversation, PMLCoreState, ThemeMode, DocumentItem } from '../types/pml';
import { PMLButton } from './ui/PMLButton';

interface TopHeaderProps {
  navOpen?: boolean;
  onToggleNav: () => void;
  activeConversation: Conversation | null;
  onRenameConversation: (id: string, newTitle: string) => void;
  coreState?: PMLCoreState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onClearChat?: () => void;
  onToggleStar?: () => void;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
  selectedDocument?: DocumentItem | null;
  onClearDocumentScope?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleNav,
  activeConversation,
  onRenameConversation,
  theme,
  onToggleTheme,
  onOpenSettings,
  onClearChat,
  isAuthenticated = false,
  onOpenAuth,
  selectedDocument,
  onClearDocumentScope,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(activeConversation?.title || '');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('PML AI v1.0 (GPT-4o)');

  const handleSaveTitle = () => {
    if (activeConversation && titleInput.trim()) {
      onRenameConversation(activeConversation.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const MODELS = [
    { id: 'pml-v1', name: 'PML AI v1.0 (GPT-4o)', desc: 'Fast multimodal reasoning & tool orchestration' },
    { id: 'pml-adv', name: 'PML Advanced Intelligence', desc: 'Deep scientific & code synthesis' },
  ];

  return (
    <header className="h-14 px-4 md:px-6 flex items-center justify-between z-30 pointer-events-auto border-b border-purple-500/15 bg-[#080512]/90 backdrop-blur-xl w-full flex-shrink-0">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleNav}
          className="p-2 rounded-xl hover:bg-white/10 text-purple-300 hover:text-white transition-colors cursor-pointer lg:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-purple-400/80 uppercase tracking-wider hidden sm:inline">
            PML AI /
          </span>

          {activeConversation ? (
            isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="px-2.5 py-0.5 text-xs font-sans font-semibold rounded-lg bg-[#0e081e] border border-purple-400 text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 rounded bg-purple-600/30 text-purple-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0 group">
                <h2 className="font-sans font-semibold text-xs md:text-sm text-white truncate max-w-[200px] sm:max-w-[320px]">
                  {activeConversation.title === 'New Cosmic Thread' ? 'New Chat' : (activeConversation.title || 'New Chat')}
                </h2>
                <button
                  onClick={() => {
                    setTitleInput(activeConversation.title === 'New Cosmic Thread' ? 'New Chat' : (activeConversation.title || 'New Chat'));
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-purple-300 transition-opacity cursor-pointer"
                  title="Rename Chat"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )
          ) : (
            <span className="font-sans font-semibold text-xs md:text-sm text-slate-200">
              New Chat
            </span>
          )}
        </div>
      </div>

      {/* Right: Model Selector, Document Scope, Theme, Settings, Sign In */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Active Document Scope Tag */}
        {selectedDocument && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs font-mono">
            <FileText className="w-3 h-3 text-cyan-400" />
            <span className="truncate max-w-[120px]">{selectedDocument.file_name}</span>
            {onClearDocumentScope && (
              <button onClick={onClearDocumentScope} className="hover:text-white cursor-pointer ml-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* AI Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#120a22]/80 hover:bg-[#1a0f32] border border-purple-500/30 text-xs font-sans text-purple-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline font-medium">{selectedModel}</span>
            <span className="sm:hidden font-medium">GPT-4o</span>
            <ChevronDown className="w-3 h-3 text-purple-400" />
          </button>

          {modelDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-[#0c0618]/95 border border-purple-500/30 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[10px] font-mono text-purple-400 uppercase tracking-widest font-semibold border-b border-white/10 mb-1">
                Select AI Engine
              </div>
              {MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.name);
                    setModelDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    selectedModel === m.name
                      ? 'bg-purple-600/30 border border-purple-400/50 text-white font-semibold'
                      : 'hover:bg-white/[0.06] text-slate-300 hover:text-white'
                  }`}
                >
                  <p className="font-sans font-medium">{m.name}</p>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear / New Chat Trigger */}
        {activeConversation && onClearChat && (
          <button
            onClick={onClearChat}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
            title="Reset Workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Theme Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings Control */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Auth Button */}
        {!isAuthenticated && onOpenAuth && (
          <PMLButton
            onClick={onOpenAuth}
            variant="primary"
            size="sm"
            icon={<LogIn className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Sign In</span>
          </PMLButton>
        )}
      </div>
    </header>
  );
};
