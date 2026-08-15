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

    // Black & Red Space Palette for glittering stars
    const starColors = [
      '#ffffff', // Pure bright starlight
      '#ffffff', // Pure bright starlight
      '#ffffff', // Pure bright starlight
      '#ffccd5', // Light ruby tint
      '#ff4d6d', // Neon red glow
      '#ff003c', // Electric crimson dot
      '#ffe5ec', // Soft silver pink
    ];

    const particleColors = [
      '#ff003c',
      '#ff4d6d',
      '#dc2626',
      '#ffffff',
      '#ff8fa3',
    ];

    // Generate stars with twinkling parameters
    const stars: Star[] = Array.from({ length: starCount }, () => {
      const isBrightSparkle = Math.random() < 0.15; // 15% of stars have 4-point cross flare
      const size = isBrightSparkle 
        ? Math.random() * 2.0 + 1.8 
        : Math.random() * 1.6 + 0.6;

      const baseAlpha = Math.random() * 0.5 + 0.5; // High visibility alpha
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

    // Generate floating red cosmic dust particles
    const particles: FloatingParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.4 + 0.15,
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
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2, // ~45 deg swoop
        opacity: 1,
        active: true,
      });
    };

    // Periodically trigger a shooting star
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

      // Deep Space Obsidian Background Base
      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, width, height);

      // Draw background cosmic red nebula radial gradients
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

      // Draw glittering star dots
      stars.forEach(star => {
        // Sinusoidal glittering twinkling formula
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.35;
        const clampedAlpha = Math.max(0.1, Math.min(1.0, currentAlpha));

        ctx.save();
        ctx.globalAlpha = clampedAlpha;
        ctx.fillStyle = star.color;

        // Draw star dot
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Optional 4-point glittering star cross flare for bright stars
        if (star.isBrightSparkle && clampedAlpha > 0.6) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.6;
          const flareLen = star.size * 3.5 * clampedAlpha;

          ctx.beginPath();
          // Horizontal line
          ctx.moveTo(star.x - flareLen, star.y);
          ctx.lineTo(star.x + flareLen, star.y);
          // Vertical line
          ctx.moveTo(star.x, star.y - flareLen);
          ctx.lineTo(star.x, star.y + flareLen);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw floating red/white cosmic dust particles
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
        ctx.shadowBlur = 10;
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
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#ff003c');
        grad.addColorStop(1, 'rgba(255, 0, 60, 0)');

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
  }, [density, theme]);

  if (density === 'off') {
    return <div className="fixed inset-0 pointer-events-none bg-[#020204] -z-10" />;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 transition-opacity duration-700"
    />
  );
};

