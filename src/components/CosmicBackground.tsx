import React, { useEffect, useRef } from 'react';
import type { ParticleDensity, ThemeMode } from '../types/pml';

interface CosmicBackgroundProps {
  density?: ParticleDensity;
  theme?: ThemeMode;
}

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  layer: number; // 1: distant, 2: mid-field, 3: foreground
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isBrightSparkle: boolean;
}

interface StardustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  glowBlur: number;
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
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
    targetX: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    targetY: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
  });

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

    // Multipliers for screen size and density settings
    const isMobile = width < 768;
    const densityMult = density === 'high' ? 1.6 : density === 'medium' ? 1.0 : 0.55;
    const starCount = Math.floor((width * height) / (isMobile ? 3800 : 2200) * densityMult);
    const moteCount = Math.floor((isMobile ? 22 : 45) * densityMult);

    // Dynamic Star Palette based on Dark vs Bright Celestial Mode
    const starColors = isLight
      ? ['#6d28d9', '#7c3aed', '#8b5cf6', '#a855f7', '#0284c7', '#ec4899']
      : ['#ffffff', '#ffffff', '#e9d5ff', '#c084fc', '#a855f7', '#38bdf8', '#818cf8'];

    const moteColors = isLight
      ? ['#8b5cf6', '#7c3aed', '#a855f7', '#0284c7', '#ec4899']
      : ['#8b5cf6', '#a855f7', '#c084fc', '#38bdf8', '#818cf8', '#ffffff'];

    // Generate 3-layer depth stars
    const stars: Star[] = Array.from({ length: starCount }, () => {
      const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
      const isBrightSparkle = layer === 3 && Math.random() < 0.35;
      
      const size = layer === 1 
        ? Math.random() * 0.7 + 0.3 
        : layer === 2 
          ? Math.random() * 1.1 + 0.7 
          : isBrightSparkle ? Math.random() * 1.8 + 1.2 : Math.random() * 1.2 + 0.9;

      const baseAlpha = isLight
        ? layer === 1 ? 0.25 : layer === 2 ? 0.45 : 0.65
        : layer === 1 ? 0.35 : layer === 2 ? 0.65 : 0.9;

      const x = Math.random() * width;
      const y = Math.random() * height;

      return {
        x,
        y,
        baseX: x,
        baseY: y,
        size,
        layer,
        baseAlpha,
        alpha: baseAlpha,
        twinkleSpeed: Math.random() * 0.04 + 0.015,
        twinklePhase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        isBrightSparkle,
      };
    });

    // Generate floating cosmic stardust motes (Layer 4)
    const stardustMotes: StardustMote[] = Array.from({ length: moteCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 2.2 + 1.2,
      baseAlpha: isLight ? Math.random() * 0.3 + 0.15 : Math.random() * 0.4 + 0.2,
      alpha: 0.3,
      color: moteColors[Math.floor(Math.random() * moteColors.length)],
      glowBlur: isLight ? 6 : 10,
    }));

    // Shooting stars
    const shootingStars: ShootingStar[] = [];
    const createShootingStar = () => {
      const startX = Math.random() * width;
      const startY = Math.random() * (height * 0.4);
      shootingStars.push({
        x: startX,
        y: startY,
        length: Math.random() * 90 + 50,
        speed: Math.random() * 8 + 10,
        size: Math.random() * 1.6 + 1.0,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.25,
        opacity: 0.95,
        active: true,
      });
    };

    const shootingTimer = setInterval(() => {
      if (Math.random() < 0.5 && shootingStars.length < 2) {
        createShootingStar();
      }
    }, 5500);

    // Mouse movement listener with smooth interpolation
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Resize listener
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars.forEach(s => {
        s.baseX = Math.random() * width;
        s.baseY = Math.random() * height;
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Render loop
    let tick = 0;
    const render = () => {
      tick += 1;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      const normX = (mouseX / width - 0.5) * 2; // -1 to 1
      const normY = (mouseY / height - 0.5) * 2;

      // ================= 1. VOLUMETRIC COSMIC NEBULAE =================
      const t = tick * 0.003;
      const neb1X = width * (0.28 + Math.sin(t * 0.6) * 0.08);
      const neb1Y = height * (0.25 + Math.cos(t * 0.8) * 0.06);
      const neb2X = width * (0.75 + Math.cos(t * 0.5) * 0.08);
      const neb2Y = height * (0.78 + Math.sin(t * 0.7) * 0.06);
      const neb3X = width * (0.52 + Math.sin(t * 0.9) * 0.06);
      const neb3Y = height * (0.50 + Math.cos(t * 0.4) * 0.08);

      if (isLight) {
        // Celestial Bright Mode Nebulae
        const g1 = ctx.createRadialGradient(neb1X, neb1Y, 0, neb1X, neb1Y, width * 0.65);
        g1.addColorStop(0, 'rgba(139, 92, 246, 0.10)');
        g1.addColorStop(0.4, 'rgba(192, 132, 252, 0.05)');
        g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const g2 = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, width * 0.6);
        g2.addColorStop(0, 'rgba(2, 132, 199, 0.08)');
        g2.addColorStop(0.5, 'rgba(56, 189, 248, 0.03)');
        g2.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Deep Cosmos Obsidian & Violet Aurora Nebulae
        // Nebula 1: Deep Electric Violet Core
        const g1 = ctx.createRadialGradient(neb1X, neb1Y, 0, neb1X, neb1Y, width * 0.7);
        g1.addColorStop(0, 'rgba(124, 58, 237, 0.14)');
        g1.addColorStop(0.35, 'rgba(91, 33, 182, 0.07)');
        g1.addColorStop(0.7, 'rgba(46, 16, 101, 0.03)');
        g1.addColorStop(1, 'rgba(3, 2, 6, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        // Nebula 2: Deep Cyan Stardust Cluster
        const g2 = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, width * 0.65);
        g2.addColorStop(0, 'rgba(6, 182, 212, 0.09)');
        g2.addColorStop(0.4, 'rgba(14, 116, 144, 0.04)');
        g2.addColorStop(1, 'rgba(3, 2, 6, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);

        // Nebula 3: Center Ambient Pulse
        const g3 = ctx.createRadialGradient(neb3X, neb3Y, 0, neb3X, neb3Y, width * 0.5);
        g3.addColorStop(0, 'rgba(168, 85, 247, 0.06)');
        g3.addColorStop(0.5, 'rgba(147, 51, 234, 0.02)');
        g3.addColorStop(1, 'rgba(3, 2, 6, 0)');
        ctx.fillStyle = g3;
        ctx.fillRect(0, 0, width, height);
      }

      // ================= 2. SOFT CURSOR RADIAL GLOW =================
      const cursorRadius = isLight ? 220 : 280;
      const cursorGlow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, cursorRadius);
      cursorGlow.addColorStop(0, isLight ? 'rgba(139, 92, 246, 0.08)' : 'rgba(168, 85, 247, 0.12)');
      cursorGlow.addColorStop(0.4, isLight ? 'rgba(192, 132, 252, 0.04)' : 'rgba(139, 92, 246, 0.05)');
      cursorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cursorGlow;
      ctx.fillRect(0, 0, width, height);

      // ================= 3. MULTI-LAYER DEPTH STARS =================
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.25;
        let alpha = Math.max(0.1, Math.min(1.0, star.baseAlpha + twinkle));

        // Parallax displacement based on star layer
        const parallaxFactor = star.layer === 1 ? 4 : star.layer === 2 ? 10 : 18;
        const targetX = star.baseX - normX * parallaxFactor;
        const targetY = star.baseY - normY * parallaxFactor;

        // Proximity glow when near cursor
        const dx = targetX - mouseX;
        const dy = targetY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const proximityBoost = (1 - dist / 160) * 0.35;
          alpha = Math.min(1.0, alpha + proximityBoost);
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;

        ctx.beginPath();
        ctx.arc(targetX, targetY, star.size, 0, Math.PI * 2);
        ctx.fill();

        // 4-point glittering star cross flare on brightest stars
        if (star.isBrightSparkle && alpha > 0.6) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.65;
          const flareLen = star.size * 3.0 * alpha;

          ctx.beginPath();
          ctx.moveTo(targetX - flareLen, targetY);
          ctx.lineTo(targetX + flareLen, targetY);
          ctx.moveTo(targetX, targetY - flareLen);
          ctx.lineTo(targetX, targetY + flareLen);
          ctx.stroke();
        }

        ctx.restore();
      });

      // ================= 4. FLOATING COSMIC STARDUST =================
      stardustMotes.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Subtle gravitational attraction toward mouse cursor
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 10) {
          p.x += (dx / dist) * 0.3;
          p.y += (dy / dist) * 0.3;
        }

        ctx.save();
        ctx.globalAlpha = p.baseAlpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glowBlur;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ================= 5. SHOOTING STARS =================
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        if (!s.active) continue;

        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.018;

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
      cancelAnimationFrame(animationFrameId);
      clearInterval(shootingTimer);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [density, theme, isLight]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: isLight 
          ? 'radial-gradient(ellipse at top, #faf5ff 0%, #f3e8ff 50%, #ffffff 100%)' 
          : 'radial-gradient(ellipse at top, #0d061a 0%, #06020c 60%, #020104 100%)',
      }}
    />
  );
};
