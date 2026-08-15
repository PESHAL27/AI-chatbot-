import React, { useEffect, useRef } from 'react';
import type { ParticleDensity, ThemeMode } from '../types/pml';

interface CosmicBackgroundProps {
  density?: ParticleDensity;
  theme?: ThemeMode;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isBrightSparkle: boolean;
}

interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  size: number;
  angle: number;
  opacity: number;
  active: boolean;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  density = 'medium',
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (density === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Density multiplier
    const countMultiplier = density === 'high' ? 2.0 : density === 'medium' ? 1.5 : 0.8;
    const starCount = Math.floor((width * height) / 2500 * countMultiplier);
    const particleCount = Math.floor(45 * countMultiplier);

    // Dynamic Star Palette based on Dark vs Bright Celestial Mode
    const starColors = isLight
      ? [
          '#6d28d9',
          '#7c3aed',
          '#8b5cf6',
          '#a855f7',
          '#0284c7',
        ]
      : [
          '#ffffff',
          '#ffffff',
          '#e9d5ff', // Light violet tint
          '#c084fc', // Neon purple glow
          '#a855f7', // Electric violet dot
          '#38bdf8', // Cyan sparkle
        ];

    const particleColors = isLight
      ? [
          '#7c3aed',
          '#8b5cf6',
          '#9333ea',
          '#c084fc',
          '#0284c7',
        ]
      : [
          '#8b5cf6',
          '#a855f7',
          '#c084fc',
          '#ffffff',
          '#38bdf8',
        ];

    // Generate stars with twinkling parameters
    const stars: Star[] = Array.from({ length: starCount }, () => {
      const isBrightSparkle = Math.random() < 0.15;
      const size = isBrightSparkle 
        ? Math.random() * 2.0 + 1.8 
        : Math.random() * 1.6 + 0.6;

      const baseAlpha = isLight
        ? Math.random() * 0.4 + 0.35
        : Math.random() * 0.5 + 0.5;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        baseAlpha,
        alpha: baseAlpha,
        twinkleSpeed: Math.random() * 0.05 + 0.02,
        twinklePhase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        isBrightSparkle,
      };
    });

    // Generate floating cosmic dust particles
    const particles: FloatingParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 2.5 + 1,
      alpha: isLight ? Math.random() * 0.35 + 0.15 : Math.random() * 0.4 + 0.15,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    }));

    // Shooting stars state
    const shootingStars: ShootingStar[] = [];
    const createShootingStar = () => {
      const startX = Math.random() * width;
      const startY = Math.random() * (height * 0.5);
      shootingStars.push({
        x: startX,
        y: startY,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 10 + 12,
        size: Math.random() * 1.5 + 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        opacity: 1,
        active: true,
      });
    };

    let shootingTimer = setInterval(() => {
      if (Math.random() < 0.6 && shootingStars.length < 2) {
        createShootingStar();
      }
    }, 4500);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Render loop
    let tick = 0;
    const render = () => {
      tick += 1;
      ctx.clearRect(0, 0, width, height);

      // Draw background cosmic nebula radial gradients
      if (isLight) {
        // Nebula 1: Soft Rose Quartz Celestial Glow
        const g1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 0, width * 0.25, height * 0.25, width * 0.65);
        g1.addColorStop(0, 'rgba(244, 63, 94, 0.12)');
        g1.addColorStop(0.4, 'rgba(251, 113, 133, 0.06)');
        g1.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        // Nebula 2: Warm Amber Crimson Aura
        const g2 = ctx.createRadialGradient(width * 0.8, height * 0.75, 0, width * 0.8, height * 0.75, width * 0.6);
        g2.addColorStop(0, 'rgba(225, 29, 72, 0.1)');
        g2.addColorStop(0.5, 'rgba(254, 205, 211, 0.05)');
        g2.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Nebula 1: Top Left Crimson Nebula
        const g1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 0, width * 0.25, height * 0.25, width * 0.65);
        g1.addColorStop(0, 'rgba(255, 0, 60, 0.08)');
        g1.addColorStop(0.4, 'rgba(180, 15, 45, 0.04)');
        g1.addColorStop(1, 'rgba(2, 2, 4, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        // Nebula 2: Bottom Right Deep Ruby Glow
        const g2 = ctx.createRadialGradient(width * 0.8, height * 0.75, 0, width * 0.8, height * 0.75, width * 0.6);
        g2.addColorStop(0, 'rgba(220, 38, 38, 0.07)');
        g2.addColorStop(0.5, 'rgba(120, 10, 30, 0.03)');
        g2.addColorStop(1, 'rgba(2, 2, 4, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw glittering star dots
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.25;
        const clampedAlpha = Math.max(0.1, Math.min(1.0, currentAlpha));

        ctx.save();
        ctx.globalAlpha = clampedAlpha;
        ctx.fillStyle = star.color;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // 4-point glittering star cross flare
        if (star.isBrightSparkle && clampedAlpha > 0.5) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.6;
          const flareLen = star.size * 3.2 * clampedAlpha;

          ctx.beginPath();
          ctx.moveTo(star.x - flareLen, star.y);
          ctx.lineTo(star.x + flareLen, star.y);
          ctx.moveTo(star.x, star.y - flareLen);
          ctx.lineTo(star.x, star.y + flareLen);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw floating cosmic particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isLight ? 6 : 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        if (!s.active) continue;

        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.015;

        if (s.opacity <= 0 || s.x > width || s.y > height) {
          s.active = false;
          shootingStars.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = s.opacity;

        const tailX = s.x - Math.cos(s.angle) * s.length;
        const tailY = s.y - Math.sin(s.angle) * s.length;

        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, isLight ? '#7c3aed' : '#ffffff');
        grad.addColorStop(0.3, isLight ? '#a855f7' : '#c084fc');
        grad.addColorStop(1, isLight ? 'rgba(124, 58, 237, 0)' : 'rgba(168, 85, 247, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = s.size;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      clearInterval(shootingTimer);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [density, theme, isLight]);

  if (density === 'off') {
    return (
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ 
            backgroundImage: "url('/assets/space_starfield.png')", 
            opacity: isLight ? 0.25 : 0.85 
          }} 
        />
        <div className={`absolute inset-0 ${isLight ? 'bg-[#f8fafc]/80' : 'bg-black/60'}`} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {/* High-Resolution Real Space Starfield Background (Image 2) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={{ 
          backgroundImage: "url('/assets/space_starfield.png')", 
          opacity: isLight ? 0.22 : 0.90,
          filter: isLight ? 'brightness(1.2) contrast(0.9)' : 'brightness(0.95) contrast(1.1)'
        }} 
      />

      {/* Atmospheric Deep Space Nebula Lighting Overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ${
          isLight 
            ? 'bg-gradient-to-b from-purple-100/50 via-white/60 to-slate-100/80' 
            : 'bg-gradient-to-b from-purple-950/30 via-transparent to-black/80'
        }`} 
      />

      {/* Dynamic HTML5 Particle & Shooting Star Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
      />
    </div>
  );
};
