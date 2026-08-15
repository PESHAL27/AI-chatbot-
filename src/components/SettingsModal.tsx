import React from 'react';
import { X, Sun, Moon, Volume2, VolumeX, Sliders, Server, RotateCcw } from 'lucide-react';
import type { PMLSettings, ParticleDensity } from '../types/pml';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PMLSettings;
  onUpdateSettings: (newSettings: Partial<PMLSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-red-500/40 shadow-[0_0_60px_rgba(255,0,60,0.25)] relative animate-float">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-500/20 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-red-400" />
            <h2 className="font-display font-bold text-xl text-white">PML Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-red-950/40 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto cosmic-scroll pr-1">
          {/* Theme Selection */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-red-300 mb-2.5 block font-semibold">
              Visual Space Experience
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-gradient-to-r from-red-950/60 to-black/80 border-red-500 text-white shadow-[0_0_15px_rgba(255,0,60,0.3)]'
                    : 'bg-black/40 border-red-500/20 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5 text-red-400" />
                <div className="text-left">
                  <p className="text-xs font-bold font-display">Dark Space</p>
                  <p className="text-[10px] text-slate-400">Deep obsidian red aura</p>
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  settings.theme === 'light'
                    ? 'bg-gradient-to-r from-red-900/50 to-rose-950/50 border-red-500 text-white shadow-sm'
                    : 'bg-black/40 border-red-500/20 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5 text-rose-400" />
                <div className="text-left">
                  <p className="text-xs font-bold font-display">Celestial Crimson</p>
                  <p className="text-[10px] text-slate-400">Light ruby nebula glow</p>
                </div>
              </button>
            </div>
          </div>

          {/* Background Particle Density */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-red-300 mb-2.5 flex items-center justify-between font-semibold">
              <span>Glittering Star Density</span>
              <span className="text-red-400 font-bold">{settings.particleDensity.toUpperCase()}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['high', 'medium', 'low', 'off'] as ParticleDensity[]).map(level => (
                <button
                  key={level}
                  onClick={() => onUpdateSettings({ particleDensity: level })}
                  className={`py-2 rounded-xl text-xs font-display font-semibold capitalize border transition-all ${
                    settings.particleDensity === level
                      ? 'bg-red-600/30 border-red-500 text-red-300 shadow-[0_0_10px_rgba(255,0,60,0.3)]'
                      : 'bg-black/40 border-red-500/20 text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-red-500/20">
            <div className="flex items-center gap-3">
              {settings.soundEffects ? (
                <Volume2 className="w-5 h-5 text-red-400" />
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
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                settings.soundEffects ? 'bg-red-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.soundEffects ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* FastAPI Backend URL (Future API Integration) */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-red-300 mb-2 flex items-center gap-1.5 font-semibold">
              <Server className="w-3.5 h-3.5 text-red-400" />
              <span>FastAPI Backend Endpoint</span>
            </label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={e => onUpdateSettings({ apiEndpoint: e.target.value })}
              placeholder="http://localhost:8000"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-black/60 border border-red-500/30 text-red-200 focus:border-red-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Configures future Python FastAPI integration (`POST /api/chat`, `GET /api/conversations`).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-red-500/20 flex justify-between items-center">
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
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,60,0.4)] transition-all"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

