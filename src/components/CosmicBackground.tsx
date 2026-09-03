import React from 'react';
import type { ParticleDensity, ThemeMode } from '../types/pml';

interface CosmicBackgroundProps {
  density?: ParticleDensity;
  theme?: ThemeMode;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
      {/* Deep gradient background */}
      <div 
        className="absolute inset-0 transition-colors duration-500"
        style={{
          backgroundColor: isLight ? '#f5f8f5' : '#050805',
          backgroundImage: isLight
            ? 'radial-gradient(ellipse at 50% -10%, rgba(46, 139, 10, 0.1) 0%, rgba(245, 248, 245, 1) 70%)'
            : 'radial-gradient(ellipse at 50% -15%, rgba(156, 255, 69, 0.08) 0%, rgba(7, 16, 7, 0.8) 45%, #050805 100%)',
        }}
      />

      {/* Subtle ambient glowing orbs */}
      <div 
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-40 transition-opacity duration-500"
        style={{
          background: isLight ? 'rgba(60, 184, 15, 0.12)' : 'rgba(156, 255, 69, 0.12)',
        }}
      />
      <div 
        className="absolute top-1/4 -right-32 w-[550px] h-[550px] rounded-full blur-[160px] pointer-events-none opacity-30 transition-opacity duration-500"
        style={{
          background: isLight ? 'rgba(46, 139, 10, 0.1)' : 'rgba(181, 255, 106, 0.09)',
        }}
      />
      <div 
        className="absolute bottom-0 left-1/3 w-[600px] h-[400px] rounded-full blur-[180px] pointer-events-none opacity-20"
        style={{
          background: 'rgba(156, 255, 69, 0.06)',
        }}
      />
    </div>
  );
};
