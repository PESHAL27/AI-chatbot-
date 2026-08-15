import React from 'react';
import type { PMLCoreState } from '../types/pml';

interface PMLCoreProps {
  state?: PMLCoreState;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export const PMLCore: React.FC<PMLCoreProps> = ({
  state = 'idle',
  size = 'medium',
  showLabel = false,
  className = '',
  onClick,
}) => {
  // Dimensions per size variant
  const sizeMap = {
    small: { 
      container: 'w-9 h-9', 
      orb: 'w-7 h-7', 
      ring1: 'w-8 h-8', 
      ring2: 'w-10 h-10' 
    },
    medium: { 
      container: 'w-16 h-16', 
      orb: 'w-12 h-12', 
      ring1: 'w-15 h-15', 
      ring2: 'w-18 h-18' 
    },
    large: { 
      container: 'w-36 h-36 md:w-44 md:h-44', 
      orb: 'w-28 h-28 md:w-36 md:h-36', 
      ring1: 'w-34 h-34 md:w-42 md:h-42', 
      ring2: 'w-42 h-42 md:w-50 md:h-50' 
    },
  };

  const currentSize = sizeMap[size];

  // Dynamic animations depending on state
  const getOrbStateClasses = () => {
    switch (state) {
      case 'thinking':
        return 'scale-110 shadow-[0_0_45px_rgba(168,85,247,0.9),0_0_80px_rgba(236,72,153,0.7)] animate-pulse';
      case 'responding':
        return 'scale-105 shadow-[0_0_55px_rgba(59,130,246,0.95),0_0_90px_rgba(147,51,234,0.8)]';
      case 'idle':
      default:
        return 'shadow-[0_0_35px_rgba(139,92,246,0.6),0_0_60px_rgba(59,130,246,0.4)] animate-pulse-cosmic';
    }
  };

  const getVortexSpinSpeed = () => {
    if (state === 'thinking') return 'animate-spin duration-3000';
    if (state === 'responding') return 'animate-spin duration-6000';
    return 'animate-spin duration-20000';
  };

  const getRing1Speed = () => {
    if (state === 'thinking') return 'animate-orbit duration-1500';
    if (state === 'responding') return 'animate-orbit duration-2500';
    return 'animate-orbit duration-10000';
  };

  const getRing2Speed = () => {
    if (state === 'thinking') return 'animate-orbit-reverse duration-1000';
    if (state === 'responding') return 'animate-orbit-reverse duration-2000';
    return 'animate-orbit-reverse duration-8000';
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center cursor-pointer select-none transition-all duration-500 ${currentSize.container}`}
      >
        {/* Outer Orbital Energy Ring 2 */}
        <div
          className={`absolute rounded-full border border-purple-500/30 border-dashed ${currentSize.ring2} ${getRing2Speed()}`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Orbiting Particle Dot */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#06b6d4]" />
        </div>

        {/* Inner Orbital Energy Ring 1 */}
        <div
          className={`absolute rounded-full border border-pink-500/40 ${currentSize.ring1} ${getRing1Speed()}`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Orbiting Particle Dot 2 */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-300 shadow-[0_0_12px_#c084fc]" />
        </div>

        {/* PLM Core Symbol Sphere (Vortex Image) */}
        <div
          className={`relative rounded-full overflow-hidden transition-all duration-700 flex items-center justify-center bg-black ${currentSize.orb} ${getOrbStateClasses()}`}
        >
          <img
            src="/assets/plm_symbol.png"
            alt="PLM Core Symbol"
            className={`w-full h-full object-cover rounded-full ${getVortexSpinSpeed()} transition-all`}
            style={{
              filter: state === 'thinking' 
                ? 'hue-rotate(30deg) brightness(1.2) contrast(1.1)' 
                : state === 'responding' 
                ? 'hue-rotate(-20deg) brightness(1.25) contrast(1.15)' 
                : 'brightness(1.05)',
            }}
          />
          {/* Subtle Glass Refraction Rim Overlay */}
          <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none shadow-inner" />
        </div>
      </div>

      {/* Optional PLM State Label */}
      {showLabel && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-purple-300 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <span>
            {state === 'thinking'
              ? 'PLM IS PROCESSING...'
              : state === 'responding'
              ? 'PLM GENERATING INTELLIGENCE...'
              : 'PLM CORE ONLINE'}
          </span>
        </div>
      )}
    </div>
  );
};
