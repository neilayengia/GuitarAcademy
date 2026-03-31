import React, { useState } from 'react';
import { Check, Star, Zap, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const TIERS = [
  {
    id: 'free',
    name: 'Standard Player',
    price: '$0',
    interval: 'forever',
    description: 'Perfect for trying the engine.',
    features: [
      'Access to Module 1: Fundamentals',
      'Basic AI Context',
      'Standard Interactive Exercises'
    ],
    buttonText: 'Current Plan',
    buttonDisabled: true,
  },
  {
    id: 'pro',
    name: 'Virtuoso Pro',
    price: '$15',
    interval: '/month',
    description: 'The complete advanced curriculum.',
    features: [
      'Access to All Modules (2, 3, 4, 5)',
      'Unlimited Beato Book AI Queries',
      'Advanced High-Fidelity Tone Engine',
      'Priority Progress Sync'
    ],
    buttonText: 'Upgrade to Virtuoso',
    buttonDisabled: false,
    priceId: 'price_virtuoso_pro_monthly', // Stub ID
    highlight: true,
  }
];

export default function PricingPage() {
  const { user, profile } = useAuth();
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Navigate to="/auth" />;
  if (profile?.subscription_tier === 'pro') return <Navigate to="/dashboard" />;

  const handleCheckout = async (priceId: string) => {
    setLoadingCode(priceId);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
      
      // Redirect to Stripe Hosted Checkout
      window.location.href = data.url;
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setLoadingCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-y-auto">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] pointer-events-none">
        <div className="absolute inset-0 bg-accent/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-32 pb-24 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-text">
            Unlock <span className="text-accent">Virtuoso Level</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Stop guessing your progression. Access the full high-fidelity advanced curriculum and infinite AI consulting for a professional sound.
          </p>
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-8 p-4 bg-error/10 border border-error/30 rounded-xl text-error text-center text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {TIERS.map((tier) => (
            <div 
              key={tier.id}
              className={`relative rounded-3xl p-8 flex flex-col ${
                tier.highlight 
                  ? 'bg-gradient-to-b from-surface to-bg border-accent/40 shadow-[0_0_40px_-15px_rgba(var(--accent-rgb),0.3)]' 
                  : 'bg-surface border-border-subtle'
              } border`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1.5">
                  <Star size={14} fill="currentColor" />
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-text mb-2">{tier.name}</h3>
                <p className="text-text-secondary text-sm">{tier.description}</p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold text-text tracking-tight">{tier.price}</span>
                  <span className="text-text-muted font-medium">{tier.interval}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                    <Check size={18} className={`shrink-0 mt-0.5 ${tier.highlight ? 'text-accent' : 'text-text-muted'}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => tier.priceId && handleCheckout(tier.priceId)}
                disabled={tier.buttonDisabled || loadingCode === tier.priceId}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-2 font-bold tracking-wide transition-all ${
                  tier.highlight 
                    ? 'bg-accent hover:bg-accent-bright text-white shadow-lg disabled:opacity-70' 
                    : 'bg-elevated text-text hover:bg-border border border-border disabled:opacity-50'
                }`}
              >
                {loadingCode === tier.priceId ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    {tier.buttonText}
                    {!tier.buttonDisabled && <ArrowRight size={18} />}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
