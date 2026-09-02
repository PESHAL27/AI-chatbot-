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
          setSuccessMsg('Authentication successful! Welcome to PML.');
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
          setSuccessMsg('Account created successfully! Connecting to PML...');
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
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl p-8 bg-[#071208] border border-[rgba(180,255,100,0.25)] shadow-2xl relative text-center">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#A8B0A5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Logo */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0f2412] border border-[rgba(180,255,100,0.3)] flex items-center justify-center mb-4 text-[#9CFF45]">
          <svg viewBox="0 0 32 32" className="w-8 h-8 text-[#9CFF45] fill-current">
            <circle cx="16" cy="16" r="3.2" fill="#9CFF45" />
            <circle cx="16" cy="6" r="2.2" fill="#9CFF45" opacity="0.9" />
            <circle cx="16" cy="26" r="2.2" fill="#9CFF45" opacity="0.9" />
            <circle cx="6" cy="16" r="2.2" fill="#9CFF45" opacity="0.9" />
            <circle cx="26" cy="16" r="2.2" fill="#9CFF45" opacity="0.9" />
            <circle cx="9" cy="9" r="1.8" fill="#9CFF45" opacity="0.75" />
            <circle cx="23" cy="9" r="1.8" fill="#9CFF45" opacity="0.75" />
            <circle cx="9" cy="23" r="1.8" fill="#9CFF45" opacity="0.75" />
            <circle cx="23" cy="23" r="1.8" fill="#9CFF45" opacity="0.75" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mb-1">
          {mode === 'login' && 'Sign in to PML'}
          {mode === 'register' && 'Create your PML account'}
          {mode === 'forgot' && 'Reset your password'}
        </h1>
        <p className="text-xs text-[#A8B0A5] mb-6">
          Your intelligent AI assistant to explore, analyze, and create.
        </p>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="w-full p-3.5 mb-5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full p-3.5 mb-5 rounded-2xl bg-[#0f2412] border border-[rgba(180,255,100,0.4)] text-[#9CFF45] text-xs flex items-start gap-2.5 text-left">
            <CheckCircle2 className="w-4 h-4 text-[#9CFF45] flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
          {mode === 'register' && (
            <div>
              <label className="block text-xs uppercase text-[#A8B0A5] mb-1.5 font-semibold">
                Full Name
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-2xl bg-[#050c06] border border-white/10 focus-within:border-[#9CFF45] focus-within:shadow-[0_0_15px_rgba(156,255,69,0.2)] transition-all">
                <UserIcon className="w-4 h-4 text-[#9CFF45] flex-shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="flex-1 bg-transparent py-2.5 text-white placeholder-[#758072] text-sm focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase text-[#A8B0A5] mb-1.5 font-semibold">
              Email Address
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-2xl bg-[#050c06] border border-white/10 focus-within:border-[#9CFF45] focus-within:shadow-[0_0_15px_rgba(156,255,69,0.2)] transition-all">
              <Mail className="w-4 h-4 text-[#9CFF45] flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 bg-transparent py-2.5 text-white placeholder-[#758072] text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase text-[#A8B0A5] font-semibold">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-xs text-[#9CFF45] hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-2xl bg-[#050c06] border border-white/10 focus-within:border-[#9CFF45] focus-within:shadow-[0_0_15px_rgba(156,255,69,0.2)] transition-all">
                <Lock className="w-4 h-4 text-[#9CFF45] flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent py-2.5 text-white placeholder-[#758072] text-sm focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#A8B0A5] hover:text-white transition-colors p-1 cursor-pointer flex-shrink-0"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs uppercase text-[#A8B0A5] mb-1.5 font-semibold">
                Confirm Password
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-2xl bg-[#050c06] border border-white/10 focus-within:border-[#9CFF45] focus-within:shadow-[0_0_15px_rgba(156,255,69,0.2)] transition-all">
                <KeyRound className="w-4 h-4 text-[#9CFF45] flex-shrink-0" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent py-2.5 text-white placeholder-[#758072] text-sm focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[#A8B0A5] hover:text-white transition-colors p-1 cursor-pointer flex-shrink-0"
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
            className="w-full mt-6 py-3 px-4 rounded-full btn-lime text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(156,255,69,0.3)] transition-all duration-300 disabled:opacity-50 cursor-pointer"
          >
            <span>
              {submitting ? 'Processing...' : (
                mode === 'login' ? 'Sign In' : 
                mode === 'register' ? 'Create Account' : 'Send Reset Link'
              )}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Mode Switchers */}
        <div className="mt-5 pt-5 border-t border-white/10 w-full text-center text-xs text-[#A8B0A5] space-y-2">
          {mode === 'login' && (
            <p>
              New to PML?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-[#9CFF45] font-semibold underline underline-offset-4 transition-colors cursor-pointer"
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
                className="text-[#9CFF45] font-semibold underline underline-offset-4 transition-colors cursor-pointer"
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
                className="text-[#9CFF45] font-semibold underline underline-offset-4 transition-colors cursor-pointer"
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
                className="text-[#758072] hover:text-white transition-colors cursor-pointer underline text-[11px]"
              >
                Continue as guest →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
