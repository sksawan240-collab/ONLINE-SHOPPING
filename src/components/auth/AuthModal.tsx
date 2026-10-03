import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const DASHBOARD_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Customer Dashboard',
  SALES_MANAGER: 'Sales Manager Dashboard',
  ADMIN: 'Admin Dashboard',
};

type AuthPhase = 'idle' | 'registered' | 'authenticated';

const REGISTER_HANDOFF_MS = 2000;
const LOGIN_HANDOFF_MS = 1800;

/** Full-card success screen: animated check, message and a progress bar. */
const AuthSuccessPanel: React.FC<{
  title: string;
  message: string;
  destination?: string;
}> = ({ title, message, destination }) => (
  <div className="px-8 py-12 text-center animate-rise-in" role="status" aria-live="polite">
    <div className="relative mx-auto w-20 h-20 mb-6">
      <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-success-ring" />
      <span
        className="absolute inset-0 rounded-full bg-emerald-400/25 animate-success-ring"
        style={{ animationDelay: '0.6s' }}
      />
      <span className="relative flex h-full w-full items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 animate-success-pop">
        <svg
          viewBox="0 0 24 24"
          className="w-9 h-9 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-check-draw" />
        </svg>
      </span>
    </div>

    <h3 className="font-serif text-2xl font-bold text-stone-900">{title}</h3>
    <p className="mt-2 text-xs leading-relaxed text-stone-500">{message}</p>

    {destination && (
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
        {destination}
      </p>
    )}

    <div className="mt-7 h-1 w-40 mx-auto rounded-full bg-stone-200 overflow-hidden">
      <div className="h-full w-1/3 rounded-full bg-stone-900 animate-progress-slide" />
    </div>
  </div>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onAuthenticated: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthenticated,
}) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('idle');
  const [signedInRole, setSignedInRole] = useState<UserRole>('CUSTOMER');

  useEffect(() => {
    setMode(initialMode);
    setPhase('idle');
    setError(null);
  }, [initialMode, isOpen]);

  // Success handoff: registration returns to the sign-in view, login hands the
  // session to the dashboard that matches the signed-in role.
  useEffect(() => {
    if (phase === 'idle') return;

    const delay = phase === 'registered' ? REGISTER_HANDOFF_MS : LOGIN_HANDOFF_MS;
    const timer = window.setTimeout(() => {
      if (phase === 'registered') {
        setMode('login');
        setPassword('');
        setName('');
        setPhone('');
      } else {
        onAuthenticated(signedInRole);
      }
      setPhase('idle');
    }, delay);

    return () => window.clearTimeout(timer);
  }, [phase, signedInRole, onAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success && res.user) {
        setSignedInRole(res.user.role);
        setPhase('authenticated');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await register({ name, email, password, phone });
      if (!res.success) {
        throw new Error('Registration could not be completed. Please try again.');
      }

      // No OTP and no auto-sign-in: confirm, then move the user to sign-in.
      setPhase('registered');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (phase !== 'idle') {
    const isRegistration = phase === 'registered';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
          <AuthSuccessPanel
            title={isRegistration ? 'Registration Successful' : 'Access Granted'}
            message={
              isRegistration
                ? 'Create a customer account to access your orders, bag, and tailored recommendations.'
                : `Welcome back. Opening your ${DASHBOARD_LABELS[signedInRole].toLowerCase()}…`
            }
            destination={isRegistration ? undefined : DASHBOARD_LABELS[signedInRole]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {mode === 'login'
                ? 'Sign in to access your orders, bag, and tailored recommendations.'
                : 'Create a customer account to access your orders, bag, and tailored recommendations.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch for Login / Register */}
        <div className="grid grid-cols-2 border-b border-stone-100 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-3 text-center transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-3 text-center transition-colors ${
                mode === 'register'
                  ? 'border-b-2 border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Create Account
            </button>
          </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM — email + password only */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs text-stone-600 hover:text-stone-900 underline"
                >
                  Don't have an account? Register here
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Lady Eleanor"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="registration-email" className="block text-xs font-medium text-stone-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="eleanor@luxeattire.com"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Password (Min. 6 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-stone-600 hover:text-stone-900 underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
