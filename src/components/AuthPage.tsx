import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  if (!authLoading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error);
      else setConfirmationSent(true);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Mail size={24} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Check your email</h2>
          <p className="text-text-secondary text-sm mb-6">
            We sent a confirmation link to <span className="text-text font-medium">{email}</span>.
          </p>
          <button
            onClick={() => { setConfirmationSent(false); setMode('login'); }}
            className="text-accent hover:text-accent-bright text-sm font-semibold transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex relative overflow-hidden">

      {/* ── Left: Hero image ── */}
      <div className="hidden lg:block lg:flex-1 relative">
        <img
          src="/hero-guitar.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0.3) contrast(1.1)', opacity: 0.5 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-bg" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/60" />

        {/* Branding on hero */}
        <div className="relative z-10 h-full flex flex-col justify-end p-12">
          <h1 className="text-5xl font-bold text-text tracking-tight leading-none mb-3">
            Rubato
          </h1>
          <p className="text-text-muted text-sm font-mono tracking-widest uppercase">
            Advanced Guitar Academy
          </p>
        </div>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-12">

        {/* Mobile-only brand */}
        <div className="lg:hidden mb-10">
          <h1 className="text-3xl font-bold text-text tracking-tight">Rubato</h1>
          <p className="text-text-muted text-xs font-mono tracking-widest uppercase mt-1">
            Advanced Guitar Academy
          </p>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-text mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-text-secondary text-sm mb-8">
          {mode === 'login'
            ? 'Sign in to continue your practice'
            : 'Start your guitar mastery journey'}
        </p>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-elevated border border-border text-text text-sm font-medium hover:bg-border transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-text-muted text-xs font-mono tracking-widest uppercase">or</span>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border-subtle text-text placeholder-text-muted text-sm focus:outline-none focus:border-accent-dim transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border-subtle text-text placeholder-text-muted text-sm focus:outline-none focus:border-accent-dim transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              required
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border-subtle text-text placeholder-text-muted text-sm focus:outline-none focus:border-accent-dim transition-colors"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-accent py-3.5 mt-2 text-sm tracking-wider uppercase disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-text-secondary text-sm mt-8 text-center">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            className="text-text font-semibold hover:text-accent transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
