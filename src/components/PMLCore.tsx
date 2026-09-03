import React from 'react';
import type { PMLCoreState } from '../types/pml';

interface PMLCoreProps {
  state?: PMLCoreState;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export const PMLSymbolIcon: React.FC<{ className?: string }> = ({ 
  className = "w-full h-full",
}) => (
  <svg viewBox="0 0 32 32" className={`text-[#9CFF45] fill-current ${className}`}>
    {/* Center node */}
    <circle cx="16" cy="16" r="3.2" fill="currentColor" />
    {/* Cardinal nodes */}
    <circle cx="16" cy="6" r="2.2" fill="currentColor" opacity="0.95" />
    <circle cx="16" cy="26" r="2.2" fill="currentColor" opacity="0.95" />
    <circle cx="6" cy="16" r="2.2" fill="currentColor" opacity="0.95" />
    <circle cx="26" cy="16" r="2.2" fill="currentColor" opacity="0.95" />
    {/* Diagonal nodes */}
    <circle cx="9" cy="9" r="1.8" fill="currentColor" opacity="0.8" />
    <circle cx="23" cy="9" r="1.8" fill="currentColor" opacity="0.8" />
    <circle cx="9" cy="23" r="1.8" fill="currentColor" opacity="0.8" />
    <circle cx="23" cy="23" r="1.8" fill="currentColor" opacity="0.8" />
  </svg>
);

export const PMLCore: React.FC<PMLCoreProps> = ({
  state = 'idle',
  size = 'medium',
  showLabel = false,
  className = '',
  onClick,
}) => {
  const sizeMap = {
    small: { 
      container: 'w-6 h-6', 
      icon: 'w-5 h-5',
    },
    medium: { 
      container: 'w-10 h-10', 
      icon: 'w-8 h-8',
    },
    large: { 
      container: 'w-20 h-20 md:w-24 md:h-24', 
      icon: 'w-16 h-16 md:w-20 md:h-20',
    },
  };

  const currentSize = sizeMap[size];

  // Dynamic animations depending on state
  const getAnimationClasses = () => {
    switch (state) {
      case 'thinking':
        return 'animate-spin duration-3000 scale-105';
      case 'responding':
        return 'animate-pulse scale-105';
      case 'idle':
      default:
        return 'hover:scale-105 transition-transform duration-200';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center cursor-pointer select-none transition-all duration-300 ${currentSize.container}`}
      >
        {/* Ambient Subtle Green Aura */}
        <div 
          className={`absolute inset-0 rounded-full bg-[#9CFF45]/15 blur-[6px] transition-opacity duration-300 ${
            state === 'thinking' ? 'opacity-100 scale-125' : state === 'responding' ? 'opacity-80 scale-110' : 'opacity-40'
          }`} 
        />

        {/* Current PML Symbol Icon */}
        <div className={`relative flex items-center justify-center ${currentSize.icon} ${getAnimationClasses()}`}>
          <PMLSymbolIcon className="w-full h-full drop-shadow-[0_0_8px_rgba(156,255,69,0.55)]" />
        </div>
      </div>

      {/* Optional PML State Label */}
      {showLabel && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-[#9CFF45] tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#9CFF45] animate-ping" />
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

