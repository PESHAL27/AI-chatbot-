import React from 'react';

interface PMLToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const PMLToggle: React.FC<PMLToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#0c081a]/60 border border-white/10 hover:border-purple-500/30 transition-all ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <div className="text-purple-400 flex-shrink-0">{icon}</div>}
        <div>
          {label && <p className="text-xs font-semibold text-white font-sans">{label}</p>}
          {description && <p className="text-[10px] text-slate-400 font-sans mt-0.5">{description}</p>}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative w-12 h-6 rounded-full transition-all duration-300 p-0.5 select-none cursor-pointer
          border ${checked ? 'bg-purple-600 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'bg-slate-900/80 border-white/15'}
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        <div
          className={`
            w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 shadow-md flex items-center justify-center
            ${checked ? 'translate-x-6' : 'translate-x-0'}
          `}
        >
          {checked && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
        </div>
      </button>
    </div>
  );
};
