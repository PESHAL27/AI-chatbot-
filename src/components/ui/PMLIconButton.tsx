import React from 'react';

export type IconButtonVariant = 'glass' | 'glow' | 'ghost' | 'active' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

interface PMLIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  tooltip?: string;
  isActive?: boolean;
}

export const PMLIconButton: React.FC<PMLIconButtonProps> = ({
  icon,
  variant = 'glass',
  size = 'md',
  tooltip,
  isActive = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 p-1.5 rounded-lg text-xs',
    md: 'w-9 h-9 p-2 rounded-xl text-sm',
    lg: 'w-11 h-11 p-2.5 rounded-2xl text-base',
  }[size];

  const variantClasses = {
    glass: `
      bg-white/[0.04] hover:bg-white/[0.09] 
      text-slate-300 hover:text-white 
      border border-white/10 hover:border-purple-400/40 
      hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]
    `,
    glow: `
      bg-purple-950/40 hover:bg-purple-900/60 
      text-purple-200 hover:text-white 
      border border-purple-500/30 hover:border-purple-400/70 
      shadow-[0_0_12px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]
    `,
    ghost: `
      bg-transparent hover:bg-white/10 
      text-slate-400 hover:text-white 
      border border-transparent hover:border-white/10
    `,
    active: `
      bg-purple-600/30 text-purple-200 
      border border-purple-500 
      shadow-[0_0_18px_rgba(168,85,247,0.45)]
    `,
    danger: `
      bg-rose-950/40 hover:bg-rose-900/60 
      text-rose-300 hover:text-rose-100 
      border border-rose-500/30 hover:border-rose-400 
      hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]
    `,
  }[isActive ? 'active' : variant];

  return (
    <div className="relative group/btn inline-flex items-center justify-center">
      <button
        disabled={disabled}
        title={tooltip}
        className={`
          flex items-center justify-center select-none backdrop-blur-md
          transition-all duration-200 cursor-pointer active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
          ${sizeClasses}
          ${variantClasses}
          ${className}
        `}
        {...props}
      >
        {icon}
      </button>

      {/* Floating Glass Tooltip */}
      {tooltip && (
        <span className="pointer-events-none absolute bottom-full mb-2 hidden group-hover/btn:flex items-center px-2 py-1 text-[11px] font-sans font-medium text-slate-200 bg-[#0f091f]/95 border border-purple-500/30 rounded-lg shadow-xl shadow-black/80 backdrop-blur-md whitespace-nowrap z-50 animate-fadeIn">
          {tooltip}
        </span>
      )}
    </div>
  );
};
