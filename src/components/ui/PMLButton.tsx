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
    sm: 'px-3 py-1.5 text-xs rounded-full gap-1.5',
    md: 'px-4 py-2 text-xs md:text-sm rounded-full gap-2',
    lg: 'px-5 py-2.5 text-sm md:text-base rounded-full gap-2.5',
  }[size];

  const variantClasses = {
    primary: `
      bg-[#9CFF45] hover:bg-[#B5FF6A] 
      text-[#050805] font-semibold tracking-wide
      ${glow ? 'shadow-[0_0_15px_rgba(156,255,69,0.35)] hover:shadow-[0_0_25px_rgba(156,255,69,0.55)]' : ''}
      active:scale-[0.98]
    `,
    secondary: `
      bg-[#0d1a0e]/80 hover:bg-[#152a17]/90 
      text-[#A8B0A5] hover:text-white font-sans font-medium
      border border-[rgba(180,255,100,0.2)] hover:border-[rgba(180,255,100,0.45)]
      ${glow ? 'hover:shadow-[0_0_15px_rgba(156,255,69,0.15)]' : ''}
      backdrop-blur-md active:scale-[0.98]
    `,
    glass: `
      bg-white/[0.04] hover:bg-white/[0.08]
      text-slate-200 hover:text-white font-sans font-medium
      border border-white/10 hover:border-[rgba(180,255,100,0.3)]
      backdrop-blur-lg active:scale-[0.98]
    `,
    ghost: `
      bg-transparent hover:bg-white/10
      text-[#A8B0A5] hover:text-white font-sans font-medium
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
        <span className="inline-block w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
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
