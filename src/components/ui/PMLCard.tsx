import React from 'react';

export type CardVariant = 'default' | 'interactive' | 'illuminated' | 'glass' | 'neon';

interface PMLCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  glow?: boolean;
  hoverLift?: boolean;
  children: React.ReactNode;
}

export const PMLCard: React.FC<PMLCardProps> = ({
  variant = 'default',
  glow = false,
  hoverLift = false,
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    default: `
      bg-[#0e081c]/75 
      border border-white/10 
      backdrop-blur-xl 
      shadow-[0_10px_35px_rgba(0,0,0,0.7)]
    `,
    interactive: `
      bg-[#0e081c]/75 hover:bg-[#180e2e]/85 
      border border-white/10 hover:border-purple-500/50 
      backdrop-blur-xl 
      shadow-[0_10px_35px_rgba(0,0,0,0.7)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(139,92,246,0.25)]
      cursor-pointer
    `,
    illuminated: `
      bg-gradient-to-b from-[#1c0e35]/80 via-[#0d071a]/90 to-[#07030e]/95 
      border border-purple-500/40 
      backdrop-blur-2xl 
      shadow-[0_15px_45px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(168,85,247,0.15),0_0_30px_rgba(139,92,246,0.2)]
    `,
    glass: `
      bg-white/[0.03] 
      border border-white/12 
      backdrop-blur-lg 
      shadow-[0_8px_30px_rgba(0,0,0,0.5)]
    `,
    neon: `
      bg-gradient-to-r from-purple-950/40 via-black/80 to-indigo-950/40 
      border border-purple-500/40 hover:border-purple-400/80 
      shadow-[0_0_20px_rgba(168,85,247,0.25)]
    `,
  }[variant];

  return (
    <div
      className={`
        relative rounded-2xl transition-all duration-300
        ${hoverLift ? 'hover:-translate-y-1' : ''}
        ${glow ? 'shadow-[0_0_25px_rgba(139,92,246,0.3)]' : ''}
        ${variantClasses}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
