import React from 'react';
import { X, Sun, Moon, Volume2, VolumeX, Server, RotateCcw, Brain, ExternalLink } from 'lucide-react';
import type { PMLSettings, ParticleDensity } from '../types/pml';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/15 shadow-[0_0_60px_rgba(139,92,246,0.25)] relative animate-float">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-black/60 border border-purple-500/30">
              <img src="/assets/plm_symbol.png" alt="PML" className="w-6 h-6 rounded-full animate-spin duration-20000 object-cover" />
            </div>
            <h2 className="font-display font-bold text-xl text-white">PML Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto cosmic-scroll pr-1">
          {/* Long-Term Memory Master Control */}
          <div className="p-4 rounded-2xl pml-neon-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-xs font-bold text-white font-display">Long-Term AI Memory</p>
                  <p className="text-[10px] text-slate-400">Remember preferences & goals across chats</p>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ memoryEnabled: !memoryEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer ${
                  memoryEnabled ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    memoryEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {onOpenMemory && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMemory();
                }}
                className="mt-2 w-full py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Memory Management Console</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Theme Selection (Exact Image 3 Tabs) */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2.5 block font-semibold">
              Visual Space Experience
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'pml-tab-active font-bold'
                    : 'pml-tab-default text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-xs font-bold text-white font-display">Deep Cosmos</p>
                  <p className="text-[10px] text-slate-400">Obsidian & Violet</p>
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  settings.theme === 'light'
                    ? 'pml-tab-active font-bold text-white'
                    : 'pml-tab-default text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-xs font-bold font-display">Celestial Bright</p>
                  <p className="text-[10px] text-slate-400">Light violet nebula glow</p>
                </div>
              </button>
            </div>
          </div>

          {/* Background Particle Density */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2.5 flex items-center justify-between font-semibold">
              <span>Glittering Star Density</span>
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
                      : 'pml-tab-default text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <div className="flex items-center gap-3">
              {settings.soundEffects ? (
                <Volume2 className="w-5 h-5 text-purple-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="text-xs font-semibold text-white font-display">Audio Feedback Synth</p>
                <p className="text-[10px] text-slate-400">Subtle space sound effects</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer ${
                settings.soundEffects ? 'bg-purple-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.soundEffects ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* FastAPI Backend URL */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5 font-semibold">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>FastAPI Backend Endpoint</span>
            </label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={e => onUpdateSettings({ apiEndpoint: e.target.value })}
              placeholder="http://localhost:8000"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-black/60 border border-white/15 text-purple-200 focus:border-purple-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              FastAPI integration (`POST /api/chat`, `GET /api/memories`).
            </p>
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
                apiEndpoint: 'http://localhost:8000',
              })
            }
            className="text-xs text-slate-400 hover:text-purple-400 flex items-center gap-1 transition-colors font-mono cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all cursor-pointer border border-white/20"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
