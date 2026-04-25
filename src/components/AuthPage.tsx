import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div
          className="rounded-2xl p-10 max-w-sm w-full text-center"
          style={{
            background: 'rgba(8,8,8,0.8)',
            backdropFilter: 'blur(60px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
            <Mail size={22} className="text-white/60" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-white/35 text-sm mb-6">
            We sent a confirmation link to <span className="text-white/60 font-medium">{email}</span>.
          </p>
          <button
            onClick={() => { setConfirmationSent(false); setMode('login'); }}
            className="text-white/50 hover:text-white text-sm font-medium transition-colors cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">

      {/* ── Full-bleed background ── */}
      <img
        src="/auth-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.7 }}
      />

      {/* ── Soft center focus overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* ── Centered card ── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* ── Ambient glow behind card ── */}
          <div
            className="absolute -inset-20 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,164,74,0.04) 0%, transparent 70%)',
            }}
          />

          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(10, 10, 10, 0.75)',
              backdropFilter: 'blur(60px) saturate(1.4)',
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.05),
                0 0 0 1px rgba(0,0,0,0.4) inset,
                0 50px 100px -30px rgba(0,0,0,0.7),
                0 0 60px rgba(212,164,74,0.03)
              `,
            }}
          >
            {/* ── Top gold accent line ── */}
            <div
              className="h-[1px] w-full"
              style={{
                background: 'linear-gradient(90deg, transparent 10%, rgba(212,164,74,0.3) 50%, transparent 90%)',
              }}
            />

            <div className="px-9 pt-10 pb-9">
              {/* ── Brand ── */}
              <div className="text-center mb-9">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-[38px] font-bold tracking-tight leading-none"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 20%, #999999 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Rubato
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.5 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                  className="flex items-center justify-center gap-2.5 mt-2.5"
                >
                  <div className="w-8 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,164,74,0.4))' }} />
                  <p
                    className="text-[8px] font-mono tracking-[4px] uppercase"
                    style={{ color: 'rgba(212,164,74,0.5)' }}
                  >
                    Guitar Academy
                  </p>
                  <div className="w-8 h-[1px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(212,164,74,0.4))' }} />
                </motion.div>
              </div>

              {/* ── Subtitle ── */}
              <p className="text-white/30 text-[13px] text-center mb-7">
                {mode === 'login' ? 'Welcome back' : 'Begin your journey'}
              </p>

              {/* ── Google ── */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="group w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-white/70 text-[13px] font-medium transition-all duration-200 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                <span className="text-[9px] font-mono tracking-[2px] uppercase text-white/12">or</span>
                <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                {mode === 'signup' && (
                  <div className="relative group">
                    <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15 transition-colors group-focus-within:text-white/30" />
                    <input
                      type="text"
                      placeholder="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-[13px] focus:outline-none transition-all duration-200 placeholder:text-white/15 bg-white/[0.03] border border-white/[0.06] focus:border-[rgba(212,164,74,0.3)] focus:bg-white/[0.05]"
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15 transition-colors group-focus-within:text-white/30" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-[13px] focus:outline-none transition-all duration-200 placeholder:text-white/15 bg-white/[0.03] border border-white/[0.06] focus:border-[rgba(212,164,74,0.3)] focus:bg-white/[0.05]"
                  />
                </div>

                <div className="relative group">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15 transition-colors group-focus-within:text-white/30" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    required
                    minLength={6}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-[13px] focus:outline-none transition-all duration-200 placeholder:text-white/15 bg-white/[0.03] border border-white/[0.06] focus:border-[rgba(212,164,74,0.3)] focus:bg-white/[0.05]"
                  />
                </div>

                {error && (
                  <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-[13px]">
                    {error}
                  </div>
                )}

                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold tracking-[1.5px] uppercase transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #b8872e 0%, #d4a44a 50%, #c99a3a 100%)',
                      color: '#080604',
                      boxShadow: '0 0 24px rgba(212,164,74,0.12), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 0 32px rgba(212,164,74,0.2), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 0 24px rgba(212,164,74,0.12), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* ── Toggle ── */}
              <p className="text-[12px] mt-7 text-center text-white/20">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                  className="text-white/50 font-medium hover:text-white transition-colors cursor-pointer"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
