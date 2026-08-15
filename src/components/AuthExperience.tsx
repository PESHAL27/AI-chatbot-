import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PMLCore } from './PMLCore';

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthExperience: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Validations
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode !== 'forgot' && !password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message || 'Incorrect email or password. Please try again.');
        }
      } else if (mode === 'register') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setErrorMsg(error.message || 'Unable to create account. Please check your credentials.');
        } else {
          setSuccessMsg('Account created successfully! Check your email if verification is required or sign in.');
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setErrorMsg(error.message || 'Unable to send reset email. Please verify your address.');
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 relative z-10">
      <div className="w-full max-w-md glitter-glass-panel bg-black/90 p-8 md:p-10 rounded-3xl border border-red-500/40 shadow-[0_0_50px_rgba(255,0,60,0.25)] flex flex-col items-center text-center">
        {/* Core Orb Logo */}
        <div className="mb-4 animate-float">
          <PMLCore size="medium" state={submitting ? 'thinking' : 'idle'} />
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-3xl md:text-4xl text-gradient-red tracking-wider mb-1 drop-shadow-[0_0_20px_rgba(255,0,60,0.4)]">
          PML AI
        </h1>
        <p className="font-mono text-xs text-red-300 uppercase tracking-widest font-semibold mb-6">
          {mode === 'login' && 'Neural Space Authentication'}
          {mode === 'register' && 'Initialize PML Account'}
          {mode === 'forgot' && 'Reset Neural Access Key'}
        </p>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="w-full p-3.5 mb-5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
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
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1 font-semibold">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400/80" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/80 border border-red-500/40 focus:border-red-500 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1 font-semibold">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400/80" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="explorer@universe.ai"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/80 border border-red-500/40 focus:border-red-500 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-xs font-mono text-red-400 hover:text-red-300 transition-colors"
                  >
                    Forgot key?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400/80" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/80 border border-red-500/40 focus:border-red-500 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1 font-semibold">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400/80" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/80 border border-red-500/40 focus:border-red-500 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-display font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(255,0,60,0.45)] hover:shadow-[0_0_35px_rgba(255,23,68,0.7)] transition-all duration-300 active:scale-98 disabled:opacity-50 cursor-pointer"
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
        <div className="mt-6 pt-6 border-t border-red-500/20 w-full text-center text-xs font-mono text-slate-400">
          {mode === 'login' && (
            <p>
              New to PML Universe?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors"
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
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors"
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
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
