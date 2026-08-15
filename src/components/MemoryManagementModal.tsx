import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Sparkles, 
  Plus, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  FolderGit2, 
  MessageSquareQuote, 
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { MemoryItem, MemoryCategory, PMLSettings } from '../types/pml';
import { pmlApi } from '../services/pmlApi';

interface MemoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PMLSettings;
  onUpdateSettings: (newSettings: Partial<PMLSettings>) => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

export const MemoryManagementModal: React.FC<MemoryManagementModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isAuthenticated,
  onOpenAuth,
}) => {
  const memoryEnabled = settings.memoryEnabled !== false;

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>('preference');
  const [isAdding, setIsAdding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadMemories();
    }
  }, [isOpen, isAuthenticated]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await pmlApi.fetchMemories();
      setMemories(data);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const ok = await pmlApi.deleteMemory(memoryId);
      if (ok) {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
        showSuccessBanner('Memory purged');
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      const ok = await pmlApi.clearAllMemories();
      if (ok) {
        setMemories([]);
        setShowClearConfirm(false);
        showSuccessBanner('All memories purged');
      }
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  const handleAddManualMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;

    setIsAdding(true);
    try {
      const created = await pmlApi.createMemory(newMemoryText.trim(), newMemoryCategory);
      if (created) {
        setMemories(prev => [created, ...prev]);
        setNewMemoryText('');
        showSuccessBanner('Memory stored');
      }
    } catch (err) {
      console.error('Failed to create manual memory:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleMemory = async (newState: boolean) => {
    onUpdateSettings({ memoryEnabled: newState });
    showSuccessBanner(newState ? 'Memory active' : 'Memory paused');
  };

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  if (!isOpen) return null;

  const filteredMemories = memories.filter(m => {
    if (activeTab === 'all') return true;
    return m.category === activeTab;
  });

  const getCategoryIcon = (cat: MemoryCategory) => {
    switch (cat) {
      case 'preference': return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'goal': return <Target className="w-4 h-4 text-purple-400" />;
      case 'project': return <FolderGit2 className="w-4 h-4 text-cyan-400" />;
      case 'communication': return <MessageSquareQuote className="w-4 h-4 text-violet-400" />;
      default: return <Lightbulb className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeStyle = (cat: MemoryCategory) => {
    switch (cat) {
      case 'preference': return 'bg-amber-950/60 border-amber-500/40 text-amber-300';
      case 'goal': return 'bg-purple-950/60 border-purple-500/40 text-purple-300';
      case 'project': return 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300';
      case 'communication': return 'bg-violet-950/60 border-violet-500/40 text-violet-300';
      default: return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 md:p-8 border border-white/15 shadow-[0_0_60px_rgba(139,92,246,0.25)] relative animate-float flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-black/60 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <img src="/assets/plm_symbol.png" alt="PML" className="w-7 h-7 rounded-full animate-spin duration-20000 object-cover" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                PML Long-Term Memory
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 font-bold">
                  Phase 6
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personalized knowledge & preferences remembered across conversations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Memory Switch Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/80 to-blue-950/40 border border-white/15 mb-4 flex items-center justify-between shadow-sm pml-neon-card">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm font-bold text-white font-display">Long-Term Memory Intelligence</p>
              <p className="text-xs text-slate-400">
                {memoryEnabled 
                  ? 'Active: PML adapts responses using verified preferences and learning goals.'
                  : 'Paused: PML will not retrieve or store long-term memories.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleMemory(!memoryEnabled)}
            className="text-purple-400 hover:text-white transition-colors cursor-pointer p-1"
            title={memoryEnabled ? 'Pause Memory' : 'Activate Memory'}
          >
            {memoryEnabled ? (
              <ToggleRight className="w-9 h-9 text-purple-400" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-600" />
            )}
          </button>
        </div>

        {/* Unauthenticated Guest Warning */}
        {!isAuthenticated ? (
          <div className="p-6 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-center my-auto flex flex-col items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-purple-400" />
            <h3 className="text-base font-bold text-white font-display">Account Required for Long-Term Memory</h3>
            <p className="text-xs text-slate-300 max-w-md">
              Long-term memory is securely encrypted and isolated to authenticated user accounts. Sign in or create a PML account to enable cross-conversation memory.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:brightness-110 transition-all cursor-pointer border border-white/20"
            >
              Sign In / Create Account
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Category Tabs & Filter (Image 3 Neon Tab System) */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex gap-2 overflow-x-auto cosmic-scroll py-1">
                {[
                  { id: 'all', label: `All (${memories.length})` },
                  { id: 'preference', label: '💡 Preferences' },
                  { id: 'goal', label: '🧠 Goals' },
                  { id: 'project', label: '🚀 Projects' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'pml-tab-active shadow-md'
                        : 'pml-tab-default text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {memories.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Notification Banner */}
            {actionSuccess && (
              <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-mono text-center mb-3 animate-fade-in">
                ✓ {actionSuccess}
              </div>
            )}

            {/* Clear All Confirmation Modal Overlay */}
            {showClearConfirm && (
              <div className="p-4 rounded-2xl bg-purple-950/95 border border-rose-500 shadow-xl mb-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Are you sure you want to delete all long-term memories?</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  This action removes all stored memory facts. Your conversations and messages will remain intact.
                </p>
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1 rounded-lg bg-black/60 border border-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Yes, Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Memories List */}
            <div className="flex-1 overflow-y-auto cosmic-scroll space-y-2.5 pr-1">
              {loading ? (
                <div className="py-12 text-center text-purple-400 font-mono text-xs animate-pulse">
                  Retrieving neural memories...
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Lightbulb className="w-8 h-8 text-slate-600" />
                  <p className="font-semibold text-white">No memories stored in this category yet.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    PML automatically extracts durable facts during conversations, or you can say:
                    <span className="block mt-1 font-mono text-purple-300">"Remember that I prefer simple Python examples"</span>
                  </p>
                </div>
              ) : (
                filteredMemories.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/50 transition-all flex items-start justify-between gap-3 group pml-neon-card"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 p-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${getCategoryBadgeStyle(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                          {item.created_at && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-display font-medium text-slate-200 break-words">
                          "{item.memory}"
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMemory(item.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                      title="Delete this memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Manual Memory Creator Form */}
            <form onSubmit={handleAddManualMemory} className="mt-4 pt-3 border-t border-white/10 flex gap-2">
              <select
                value={newMemoryCategory}
                onChange={e => setNewMemoryCategory(e.target.value as MemoryCategory)}
                className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-purple-300 focus:outline-none"
              >
                <option value="preference">💡 Preference</option>
                <option value="goal">🧠 Goal</option>
                <option value="project">🚀 Project</option>
                <option value="communication">💬 Communication</option>
              </select>
              <input
                type="text"
                value={newMemoryText}
                onChange={e => setNewMemoryText(e.target.value)}
                placeholder="Explicitly add a memory (e.g. 'Prefers dark mode code snippets')..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAdding || !newMemoryText.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-white/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-slate-500">
          <span>🔒 End-to-end user data isolation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs cursor-pointer transition-colors border border-white/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
