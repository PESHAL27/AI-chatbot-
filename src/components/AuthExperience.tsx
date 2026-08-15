import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  KeyRound,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PMLCore } from './PMLCore';

interface AuthExperienceProps {
  onClose?: () => void;
}

export const AuthExperience: React.FC<AuthExperienceProps> = ({ onClose }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            setErrorMsg('Rate limit exceeded. Please wait a moment before trying again.');
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMsg('Invalid email or password. Please verify your details.');
          } else {
            setErrorMsg(error.message || 'Failed to sign in. Please verify your credentials.');
          }
        } else {
          setSuccessMsg('Authentication successful! Welcome to PML Universe.');
          if (onClose) {
            setTimeout(onClose, 600);
          }
        }
      } else if (mode === 'register') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            setErrorMsg('Sign-up email limit exceeded. Please try again later or check your spam folder.');
          } else if (error.message.toLowerCase().includes('already registered')) {
            setErrorMsg('An account with this email already exists. Please switch to Sign In.');
          } else {
            setErrorMsg(error.message || 'Unable to create account. Please check your credentials.');
          }
        } else {
          setSuccessMsg('Account created successfully! Connecting to PML Universe...');
          if (onClose) {
            setTimeout(onClose, 800);
          }
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            setErrorMsg('Email limit reached. Please wait a short while before requesting another reset email.');
          } else {
            setErrorMsg(error.message || 'Unable to send reset email. Please verify your address.');
          }
        } else {
          setSuccessMsg('Password reset instructions sent to your email.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md glitter-glass-panel bg-black/95 p-8 md:p-10 rounded-3xl border border-purple-500/40 shadow-[0_0_60px_rgba(168,85,247,0.3)] flex flex-col items-center text-center relative pml-neon-card">
        {/* Close Button if dismissible modal */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close / Continue as Guest"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Core Orb Logo */}
        <div className="mb-4 animate-float">
          <PMLCore size="medium" state={submitting ? 'thinking' : 'idle'} />
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 tracking-wider mb-1 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          PML AI
        </h1>
        <p className="font-mono text-xs text-purple-300 uppercase tracking-widest font-semibold mb-6">
          {mode === 'login' && 'Neural Space Authentication'}
          {mode === 'register' && 'Initialize PML Account'}
          {mode === 'forgot' && 'Reset Neural Access Key'}
        </p>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="w-full p-3.5 mb-5 rounded-xl bg-purple-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full p-3.5 mb-5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-2.5 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 font-semibold">
                Full Name
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-xl bg-black/80 border border-purple-500/40 focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                <div className="flex items-center gap-1.5 text-purple-400 select-none flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-purple-400 font-bold text-sm">:</span>
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="flex-1 bg-transparent py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 font-semibold">
              Email Address
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-xl bg-black/80 border border-purple-500/40 focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
              <div className="flex items-center gap-1.5 text-purple-400 select-none flex-shrink-0">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="font-mono text-purple-400 font-bold text-sm">:</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="explorer@universe.ai"
                className="flex-1 bg-transparent py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-xs font-mono text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    Forgot key?
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-xl bg-black/80 border border-purple-500/40 focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                <div className="flex items-center gap-1.5 text-purple-400 select-none flex-shrink-0">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-purple-400 font-bold text-sm">:</span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-purple-300 transition-colors p-1 cursor-pointer flex-shrink-0"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 font-semibold">
                Confirm Password
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-xl bg-black/80 border border-purple-500/40 focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                <div className="flex items-center gap-1.5 text-purple-400 select-none flex-shrink-0">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-purple-400 font-bold text-sm">:</span>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-purple-300 transition-colors p-1 cursor-pointer flex-shrink-0"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-display font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.7)] transition-all duration-300 active:scale-98 disabled:opacity-50 cursor-pointer border border-white/20"
          >
            <span>
              {submitting ? 'Processing...' : (
                mode === 'login' ? 'Sign In to PML' : 
                mode === 'register' ? 'Initialize Account' : 'Send Reset Link'
              )}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Mode Switchers */}
        <div className="mt-5 pt-5 border-t border-white/10 w-full text-center text-xs font-mono text-slate-400 space-y-2">
          {mode === 'login' && (
            <p>
              New to PML Universe?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Create an account
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </p>
          )}

          {onClose && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer underline text-[11px]"
              >
                Continue chatting as guest →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
