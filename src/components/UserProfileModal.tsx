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

  const displayName = user?.user_metadata?.full_name || profile.name || 'PML User';
  const displayEmail = user?.email || profile.email || 'user@pml.ai';
  const initial = displayName.charAt(0).toUpperCase() || 'P';
  const joinedYear = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : profile.joinedDate;

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl p-6 bg-[#071208] border border-[rgba(180,255,100,0.25)] shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-7 h-7 text-[#9CFF45] fill-current">
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
            <h2 className="font-bold text-xl text-white">Account Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-[#A8B0A5] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Avatar Card */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#122814] border-2 border-[#9CFF45] p-1 shadow-[0_0_25px_rgba(156,255,69,0.3)] mb-3">
            <div className="w-full h-full rounded-full bg-[#050c06] flex items-center justify-center text-[#9CFF45] font-bold text-2xl">
              {initial}
            </div>
          </div>

          <h3 className="font-bold text-lg text-white">{displayName}</h3>
          <p className="text-xs text-[#A8B0A5] mb-2">{displayEmail}</p>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#122814] border border-[rgba(180,255,100,0.3)] text-[#9CFF45] text-xs font-semibold">
            <Sparkles className="w-3 h-3 text-[#9CFF45]" />
            <span>Active Member since {joinedYear}</span>
          </span>
        </div>

        {/* User UID & Metadata Card */}
        {user?.id && (
          <div className="p-3 mb-4 rounded-2xl bg-[#0a180b] border border-white/5 flex flex-col gap-1 text-left font-mono">
            <span className="text-[10px] text-[#A8B0A5] uppercase tracking-wider">User Account ID</span>
            <span className="text-xs text-[#9CFF45] truncate select-all">{user.id}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-[#0a180b] border border-white/5 text-center">
            <MessageSquare className="w-4 h-4 mx-auto text-[#9CFF45] mb-1" />
            <p className="font-bold text-lg text-white">{profile.queriesCount}</p>
            <p className="text-[10px] text-[#A8B0A5] uppercase tracking-wider">Queries</p>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a180b] border border-white/5 text-center">
            <FileCheck className="w-4 h-4 mx-auto text-[#9CFF45] mb-1" />
            <p className="font-bold text-lg text-white">{profile.docsAnalyzedCount}</p>
            <p className="text-[10px] text-[#A8B0A5] uppercase tracking-wider">Docs</p>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a180b] border border-white/5 text-center">
            <Award className="w-4 h-4 mx-auto text-[#9CFF45] mb-1" />
            <p className="font-bold text-lg text-white">100%</p>
            <p className="text-[10px] text-[#A8B0A5] uppercase tracking-wider">Status</p>
          </div>
        </div>

        {/* Long-Term Memory Console Quick Access */}
        {onOpenMemory && (
          <button
            onClick={() => {
              onClose();
              onOpenMemory();
            }}
            className="w-full mb-4 p-3 rounded-2xl bg-[#0a180b] hover:bg-[#122814] border border-[rgba(180,255,100,0.25)] flex items-center justify-between text-xs text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#9CFF45]" />
              <span className="font-semibold">Manage Memory Engine</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#9CFF45]" />
          </button>
        )}

        {/* Sign Out Action */}
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
