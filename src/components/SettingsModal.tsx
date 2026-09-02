import React from 'react';
import { 
  X, 
  Sun, 
  Moon, 
  Volume2, 
  Server, 
  RotateCcw, 
  Brain, 
  ExternalLink, 
  Sliders, 
  ShieldCheck, 
  Lock, 
  CheckCircle2 
} from 'lucide-react';
import type { PMLSettings } from '../types/pml';
import { PMLToggle } from './ui/PMLToggle';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PMLSettings;
  onUpdateSettings: (newSettings: Partial<PMLSettings>) => void;
  onOpenMemory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenMemory,
}) => {
  if (!isOpen) return null;

  const memoryEnabled = settings.memoryEnabled !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl p-6 relative shadow-2xl bg-[#071208] border border-[rgba(180,255,100,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0f2412] border border-[rgba(180,255,100,0.3)] flex items-center justify-center text-[#9CFF45]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-white">PML Settings</h2>
              <p className="text-[11px] text-[#A8B0A5]">AI Configuration & Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-[#A8B0A5] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Security & Data Privacy Status Box */}
          <div className="p-4 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.2)]">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#9CFF45]" />
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                PML Security & Privacy
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-[#A8B0A5]">
                <Lock className="w-3 h-3 text-[#9CFF45]" />
                <span>Account: <b className="text-[#9CFF45]">Protected</b></span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-[#A8B0A5]">
                <CheckCircle2 className="w-3 h-3 text-[#9CFF45]" />
                <span>Memory: <b className="text-[#9CFF45]">Private</b></span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-[#A8B0A5]">
                <CheckCircle2 className="w-3 h-3 text-[#9CFF45]" />
                <span>Documents: <b className="text-[#9CFF45]">Isolated</b></span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-[#A8B0A5]">
                <CheckCircle2 className="w-3 h-3 text-[#9CFF45]" />
                <span>Chats: <b className="text-[#9CFF45]">Encrypted</b></span>
              </div>
            </div>
          </div>

          {/* Long-Term Memory Control */}
          <div className="p-4 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.15)]">
            <PMLToggle
              checked={memoryEnabled}
              onChange={val => onUpdateSettings({ memoryEnabled: val })}
              label="Long-Term AI Memory"
              description="Retain personal context, preferences, and goals across sessions"
              icon={<Brain className="w-5 h-5 text-[#9CFF45]" />}
              className="p-0 bg-transparent border-0"
            />
            {onOpenMemory && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMemory();
                }}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-[#122814] hover:bg-[#153218] border border-[rgba(180,255,100,0.25)] text-xs text-[#9CFF45] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Manage Stored Memories</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Speech Language Selector */}
          <div className="p-4 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.15)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-white">Speech Voice Language</p>
                <p className="text-xs text-[#A8B0A5]">Speech-to-Text and TTS Voice synthesis</p>
              </div>
              <span className="text-xl">🎙️</span>
            </div>
            <select
              value={settings.speechLanguage || 'en-US'}
              onChange={e => onUpdateSettings({ speechLanguage: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#050c06] border border-white/10 text-xs text-white focus:outline-none focus:border-[#9CFF45]"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="hi-IN">Hindi (India)</option>
              <option value="es-ES">Spanish (Spain)</option>
              <option value="fr-FR">French (France)</option>
              <option value="de-DE">German (Germany)</option>
              <option value="ja-JP">Japanese (Japan)</option>
            </select>
          </div>

          {/* Read Aloud Voice Toggle */}
          <PMLToggle
            checked={Boolean(settings.autoReadAloud)}
            onChange={val => onUpdateSettings({ autoReadAloud: val })}
            label="Auto Read Aloud Responses"
            description="Automatically synthesize voice audio for incoming AI answers"
            icon={<Volume2 className="w-5 h-5 text-[#9CFF45]" />}
          />

          {/* Sound FX Toggle */}
          <PMLToggle
            checked={settings.soundEffects}
            onChange={val => onUpdateSettings({ soundEffects: val })}
            label="Sound Effects"
            description="Play subtle audio cues for tools and messages"
            icon={<Volume2 className="w-5 h-5 text-[#9CFF45]" />}
          />

          {/* Theme Selector */}
          <div className="p-4 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.15)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-[#9CFF45]" /> : <Sun className="w-5 h-5 text-[#9CFF45]" />}
              <div>
                <p className="font-semibold text-sm text-white">Visual Theme</p>
                <p className="text-xs text-[#A8B0A5]">Toggle dark / light display mode</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className="px-3.5 py-1.5 rounded-full btn-glass text-xs font-semibold cursor-pointer"
            >
              {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>

          {/* Backend API Endpoint */}
          <div className="p-4 rounded-2xl bg-[#0a180b] border border-[rgba(180,255,100,0.15)] space-y-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#9CFF45]" />
              <span className="font-semibold text-xs text-white">API Backend Endpoint</span>
            </div>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={e => onUpdateSettings({ apiEndpoint: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#050c06] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#9CFF45]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() =>
              onUpdateSettings({
                theme: 'dark',
                soundEffects: true,
                autoReadAloud: false,
                memoryEnabled: true,
                apiEndpoint: 'http://localhost:8000',
              })
            }
            className="text-xs text-[#A8B0A5] hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="btn-lime px-6 py-2 rounded-full text-xs font-semibold cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.3)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
