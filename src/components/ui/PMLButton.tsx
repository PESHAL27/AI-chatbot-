import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface PMLButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  glow?: boolean;
}

export const PMLButton: React.FC<PMLButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  glow = true,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-xs md:text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm md:text-base rounded-2xl gap-2.5',
  }[size];

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 
      hover:from-violet-500 hover:to-purple-500 
      text-white font-display font-bold uppercase tracking-wider
      border border-white/25
      ${glow ? 'shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]' : 'shadow-md'}
      active:scale-[0.98]
    `,
    secondary: `
      bg-[#120a20]/80 hover:bg-[#1f1035]/90 
      text-purple-200 hover:text-white font-sans font-semibold
      border border-purple-500/30 hover:border-purple-400/60
      ${glow ? 'hover:shadow-[0_0_18px_rgba(168,85,247,0.3)]' : ''}
      backdrop-blur-md active:scale-[0.98]
    `,
    glass: `
      bg-white/[0.04] hover:bg-white/[0.08]
      text-slate-200 hover:text-white font-sans font-medium
      border border-white/15 hover:border-purple-400/40
      ${glow ? 'hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]' : ''}
      backdrop-blur-lg active:scale-[0.98]
    `,
    ghost: `
      bg-transparent hover:bg-white/10
      text-slate-300 hover:text-white font-sans font-medium
      border border-transparent hover:border-white/10
      active:scale-[0.98]
    `,
    danger: `
      bg-rose-950/60 hover:bg-rose-900/80
      text-rose-200 hover:text-white font-sans font-semibold
      border border-rose-500/40 hover:border-rose-400
      shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-[0.98]
    `,
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center select-none
        transition-all duration-200 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        ${sizeClasses}
        ${variantClasses}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
