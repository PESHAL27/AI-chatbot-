import React from 'react';
import { X, Shield, Award, Sparkles, FileCheck, MessageSquare } from 'lucide-react';
import type { UserProfile } from '../types/pml';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-red-500/40 shadow-[0_0_60px_rgba(255,0,60,0.25)] relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-500/20 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            <h2 className="font-display font-bold text-xl text-white">User Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-red-950/40 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-red-800 p-1 shadow-[0_0_25px_rgba(255,0,60,0.5)] mb-3">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold text-2xl font-display">
              {profile.name.charAt(0)}
            </div>
          </div>

          <h3 className="font-display font-bold text-lg text-white">{profile.name}</h3>
          <p className="text-xs text-slate-400 font-mono mb-2">{profile.email}</p>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono font-semibold shadow-[0_0_12px_rgba(255,0,60,0.2)]">
            <Sparkles className="w-3 h-3 text-red-400 animate-pulse" />
            <span>{profile.tier}</span>
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-black/50 border border-red-500/20 text-center">
            <MessageSquare className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <p className="font-display font-bold text-lg text-white">{profile.queriesCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Queries</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/50 border border-red-500/20 text-center">
            <FileCheck className="w-4 h-4 mx-auto text-rose-400 mb-1" />
            <p className="font-display font-bold text-lg text-white">{profile.docsAnalyzedCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Docs RAG</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/50 border border-red-500/20 text-center">
            <Award className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <p className="font-display font-bold text-lg text-white">100%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Uptime</p>
          </div>
        </div>

        {/* Joined Metadata */}
        <div className="p-3 rounded-xl bg-black/50 border border-red-500/20 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Space Traveler Since</span>
          <span className="text-red-300 font-bold">{profile.joinedDate}</span>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,60,0.4)] transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};

