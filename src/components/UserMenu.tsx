import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  return (
    <div className="px-3 pb-5 pt-3 border-t border-border-subtle">
      <div className="flex items-center gap-2.5 px-3 mb-2">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[11px] font-semibold text-accent flex-shrink-0">
          {(profile.display_name || profile.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-text truncate">{profile.display_name || profile.email.split('@')[0]}</p>
          <p className="label text-[9px]">{profile.subscription_tier === 'pro' ? 'Premium' : 'Free'}</p>
        </div>
      </div>
      
      {profile.subscription_tier !== 'pro' && (
        <a href="/pricing" className="btn-accent w-full justify-center text-[11px] font-bold mb-3 px-3 py-2 uppercase tracking-widest hidden lg:flex">
          Upgrade to Pro
        </a>
      )}

      <button onClick={signOut} className="btn-ghost w-full justify-start text-[13px] text-text-muted hover:text-text px-3 py-2">
        <LogOut size={14} />
        <span>Sign out</span>
      </button>
    </div>
  );
}
