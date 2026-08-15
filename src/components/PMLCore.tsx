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
    small: { container: 'w-8 h-8', orb: 'w-5 h-5', ring1: 'w-7 h-7', ring2: 'w-9 h-9' },
    medium: { container: 'w-16 h-16', orb: 'w-10 h-10', ring1: 'w-14 h-14', ring2: 'w-18 h-18' },
    large: { container: 'w-36 h-36 md:w-44 md:h-44', orb: 'w-24 h-24 md:w-28 md:h-28', ring1: 'w-32 h-32 md:w-40 md:h-40', ring2: 'w-40 h-40 md:w-48 md:h-48' },
  };

  const currentSize = sizeMap[size];

  // Dynamic animations depending on state
  const getOrbStateClasses = () => {
    switch (state) {
      case 'thinking':
        return 'scale-110 shadow-[0_0_55px_rgba(255,0,60,0.9),0_0_90px_rgba(220,38,38,0.7)] animate-pulse';
      case 'responding':
        return 'scale-105 shadow-[0_0_65px_rgba(255,23,68,0.95),0_0_100px_rgba(153,27,27,0.8)]';
      case 'idle':
      default:
        return 'shadow-[0_0_35px_rgba(255,0,60,0.6),0_0_60px_rgba(220,38,38,0.4)] animate-pulse-cosmic';
    }
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
          className={`absolute rounded-full border border-red-500/40 border-dashed ${currentSize.ring2} ${getRing2Speed()}`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Orbiting Particle Dot */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_12px_#ff003c]" />
        </div>

        {/* Inner Orbital Energy Ring 1 */}
        <div
          className={`absolute rounded-full border border-rose-500/50 ${currentSize.ring1} ${getRing1Speed()}`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Orbiting Particle Dot 2 */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
        </div>

        {/* PML Core Central Energy Sphere */}
        <div
          className={`relative rounded-full transition-all duration-700 flex items-center justify-center ${currentSize.orb} ${getOrbStateClasses()}`}
          style={{
            background:
              state === 'responding'
                ? 'radial-gradient(circle at 35% 35%, #ffffff 0%, #ff1744 30%, #dc2626 65%, #050205 100%)'
                : 'radial-gradient(circle at 30% 30%, #ffffff 0%, #ff003c 30%, #991b1b 65%, #020204 100%)',
          }}
        >
          {/* Internal Plasma Fluid Effect */}
          <div className="w-full h-full rounded-full opacity-80 mix-blend-overlay bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-red-400 to-transparent animate-pulse" />
        </div>
      </div>

      {/* Optional PML State Label */}
      {showLabel && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-red-400 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>
            {state === 'thinking'
              ? 'PML IS PROCESSING...'
              : state === 'responding'
              ? 'PML GENERATING INTELLIGENCE...'
              : 'PML CORE ONLINE'}
          </span>
        </div>
      )}
    </div>
  );
};

