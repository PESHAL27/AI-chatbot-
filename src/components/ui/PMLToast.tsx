import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  showToast: (title: string, type?: ToastType, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, type: ToastType = 'success', description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, description }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Holographic Toast Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map(toast => {
          const typeConfig = {
            success: {
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
              border: 'border-emerald-500/40',
              bg: 'bg-[#0a1813]/90',
              glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
            },
            error: {
              icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
              border: 'border-rose-500/40',
              bg: 'bg-[#1c080d]/90',
              glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
            },
            info: {
              icon: <Info className="w-4 h-4 text-cyan-400" />,
              border: 'border-cyan-500/40',
              bg: 'bg-[#091522]/90',
              glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto flex items-start gap-3 p-3 rounded-2xl
                ${typeConfig.bg} border ${typeConfig.border} ${typeConfig.glow}
                backdrop-blur-xl shadow-2xl transition-all duration-300 animate-slideUp
              `}
            >
              <div className="mt-0.5 flex-shrink-0">{typeConfig.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white font-sans">{toast.title}</p>
                {toast.description && (
                  <p className="text-[11px] text-slate-300 font-sans mt-0.5">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
    };
  }
  return context;
};
