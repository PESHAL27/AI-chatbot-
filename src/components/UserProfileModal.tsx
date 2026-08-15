import React from 'react';
import { X, Award, Sparkles, FileCheck, MessageSquare, LogOut, Brain, ExternalLink } from 'lucide-react';
import type { UserProfile } from '../types/pml';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onOpenMemory?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenMemory,
}) => {
  const { user, signOut } = useAuth();

  if (!isOpen) return null;

  const displayName = user?.user_metadata?.full_name || profile.name || 'Cosmic Explorer';
  const displayEmail = user?.email || profile.email || 'explorer@plm.universe';
  const initial = displayName.charAt(0).toUpperCase() || 'P';
  const joinedYear = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : profile.joinedDate;

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-purple-500/40 shadow-[0_0_60px_rgba(168,85,247,0.25)] relative plm-neon-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-black/60 border border-purple-500/30">
              <img src="/assets/plm_symbol.png" alt="PLM" className="w-5 h-5 rounded-full object-cover" />
            </div>
            <h2 className="font-display font-bold text-xl text-white">PLM Neural Identity</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Avatar Card */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-1 shadow-[0_0_25px_rgba(147,51,234,0.5)] mb-3">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold text-2xl font-display">
              {initial}
            </div>
          </div>

          <h3 className="font-display font-bold text-lg text-white">{displayName}</h3>
          <p className="text-xs text-slate-400 font-mono mb-2">{displayEmail}</p>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs font-mono font-semibold shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            <span>{profile.tier}</span>
          </span>
        </div>

        {/* User UID & Metadata Card */}
        {user?.id && (
          <div className="p-3 mb-4 rounded-xl bg-black/60 border border-red-500/20 flex flex-col gap-1 text-left font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">User Neural ID</span>
            <span className="text-xs text-red-300 truncate select-all">{user.id}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-black/50 border border-red-500/20 text-center">
            <MessageSquare className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <p className="font-display font-bold text-lg text-white">{profile.queriesCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Queries</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/50 border border-red-500/20 text-center">
            <FileCheck className="w-4 h-4 mx-auto text-rose-400 mb-1" />
            <p className="font-display font-bold text-lg text-white">{profile.docsAnalyzedCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Docs</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/50 border border-red-500/20 text-center">
            <Award className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <p className="font-display font-bold text-lg text-white">100%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Status</p>
          </div>
        </div>

        {/* Long-Term Memory Console Quick Access */}
        {onOpenMemory && (
          <button
            onClick={() => {
              onClose();
              onOpenMemory();
            }}
            className="w-full mb-4 p-3 rounded-2xl bg-gradient-to-r from-red-950/60 to-black/60 border border-red-500/30 hover:border-red-500/60 flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-900/40 text-red-400">
                <Brain className="w-4.5 h-4.5 group-hover:animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-white font-display">Long-Term Memory Console</p>
                <p className="text-[10px] text-slate-400">View, edit, or clear stored preferences</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-red-300" />
          </button>
        )}

        {/* Joined Metadata */}
        <div className="p-3 mb-6 rounded-xl bg-black/50 border border-red-500/20 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Active Since</span>
          <span className="text-red-300 font-bold">{joinedYear}</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-red-950/80 hover:bg-red-900/90 border border-red-500/60 text-red-200 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,60,0.25)] hover:shadow-[0_0_30px_rgba(255,0,60,0.45)] transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign Out / Disconnect Session</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 font-display text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
