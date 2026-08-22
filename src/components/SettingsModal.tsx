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
import type { PMLSettings, ParticleDensity } from '../types/pml';
import { PMLToggle } from './ui/PMLToggle';
import { PMLButton } from './ui/PMLButton';

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
      <div className="w-full max-w-lg glitter-glass-panel rounded-3xl p-6 relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Sliders className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">PML Control System</h2>
              <p className="text-[10px] font-mono text-purple-300 uppercase tracking-wider">AI Configuration & Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto cosmic-scroll pr-1">
          {/* Security & Data Privacy Status Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#140b28]/90 to-[#0c0618]/90 border border-purple-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-display font-bold text-xs uppercase tracking-wider text-white">
                PML Security & Privacy
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10 text-slate-300">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Account: <b className="text-emerald-400 font-mono">Protected</b></span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10 text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>Memory: <b className="text-cyan-300 font-mono">Private</b></span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10 text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-violet-400" />
                <span>Documents: <b className="text-violet-300 font-mono">Isolated</b></span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10 text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-purple-400" />
                <span>Chats: <b className="text-purple-300 font-mono">Encrypted</b></span>
              </div>
            </div>
          </div>

          {/* Long-Term Memory Control */}
          <div className="p-4 rounded-2xl bg-[#110822]/80 border border-purple-500/30">
            <PMLToggle
              checked={memoryEnabled}
              onChange={val => onUpdateSettings({ memoryEnabled: val })}
              label="Long-Term AI Memory"
              description="Retain personal context, preferences, and goals across sessions"
              icon={<Brain className="w-5 h-5" />}
              className="p-0 bg-transparent border-0"
            />
            {onOpenMemory && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMemory();
                }}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/30 text-purple-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Memory Management Console</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Theme Selection */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2 block font-semibold">
              Cosmic Environment Visual
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'pml-tab-active font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'bg-[#100922]/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Moon className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-xs font-bold text-white font-display">Deep Cosmos</p>
                  <p className="text-[10px] text-slate-400">Obsidian & Violet Aurora</p>
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  settings.theme === 'light'
                    ? 'pml-tab-active font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'bg-[#100922]/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Sun className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-xs font-bold font-display text-white">Celestial Bright</p>
                  <p className="text-[10px] text-slate-400">Pearlescent glow</p>
                </div>
              </button>
            </div>
          </div>

          {/* Background Particle Density */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2 flex items-center justify-between font-semibold">
              <span>Cosmic Particle Density</span>
              <span className="text-purple-400 font-bold">{settings.particleDensity.toUpperCase()}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['high', 'medium', 'low', 'off'] as ParticleDensity[]).map(level => (
                <button
                  key={level}
                  onClick={() => onUpdateSettings({ particleDensity: level })}
                  className={`py-2 rounded-xl text-xs font-display font-semibold capitalize border transition-all cursor-pointer ${
                    settings.particleDensity === level
                      ? 'pml-tab-active font-bold text-white'
                      : 'bg-[#100922]/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Read Aloud */}
          <PMLToggle
            checked={settings.autoReadAloud}
            onChange={val => onUpdateSettings({ autoReadAloud: val })}
            label="Auto-Read Aloud Responses"
            description="PML automatically narrates answers using text-to-speech"
            icon={<Volume2 className="w-5 h-5 text-purple-400" />}
          />

          {/* Voice Language Selector */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2 flex items-center justify-between font-semibold">
              <span>Voice Speech Language</span>
              <span className="text-purple-400 font-bold">{settings.speechLanguage || 'en-US'}</span>
            </label>
            <select
              value={settings.speechLanguage || 'en-US'}
              onChange={e => onUpdateSettings({ speechLanguage: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[#0f091f] border border-white/15 text-purple-200 focus:border-purple-500 focus:outline-none cursor-pointer"
            >
              <option value="en-US">🇺🇸 English (United States)</option>
              <option value="en-GB">🇬🇧 English (United Kingdom)</option>
              <option value="hi-IN">🇮🇳 Hindi (हिन्दी)</option>
              <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              <option value="es-ES">🇪🇸 Spanish (Español)</option>
              <option value="fr-FR">🇫🇷 French (Français)</option>
              <option value="de-DE">🇩🇪 German (Deutsch)</option>
              <option value="ja-JP">🇯🇵 Japanese (日本語)</option>
            </select>
          </div>

          {/* Audio Feedback Synth */}
          <PMLToggle
            checked={settings.soundEffects}
            onChange={val => onUpdateSettings({ soundEffects: val })}
            label="Cosmic Audio Feedback"
            description="Chimes on send and message generation"
            icon={<Volume2 className="w-5 h-5 text-purple-400" />}
          />

          {/* Backend Endpoint */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1.5 font-semibold">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>FastAPI Backend URL</span>
            </label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={e => onUpdateSettings({ apiEndpoint: e.target.value })}
              placeholder="http://localhost:8000"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#090514] border border-white/15 text-purple-200 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
          <button
            onClick={() =>
              onUpdateSettings({
                theme: 'dark',
                particleDensity: 'medium',
                soundEffects: true,
                streamSpeed: 18,
                apiEndpoint: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'http://localhost:8000',
              })
            }
            className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors font-mono cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <PMLButton onClick={onClose} variant="primary" size="sm">
            Save & Close
          </PMLButton>
        </div>
      </div>
    </div>
  );
};
