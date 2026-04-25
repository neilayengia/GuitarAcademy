import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  if (!profile) return null;

  const initial = (profile.display_name || profile.email)[0].toUpperCase();
  const name = profile.display_name || profile.email.split('@')[0];
  const isPro = profile.subscription_tier === 'pro';

  return (
    <div className="user-menu">
      {/* User info row */}
      <div className="user-menu-info">
        <div className="user-menu-avatar">{initial}</div>
        <div className="user-menu-details">
          <p className="user-menu-name">{name}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="user-menu-actions">
        {!isPro && (
          <button
            onClick={() => navigate('/pricing')}
            className="user-menu-upgrade"
          >
            <span>Pro</span>
            <ArrowUpRight size={11} strokeWidth={2} />
          </button>
        )}
        <button onClick={signOut} className="user-menu-signout">
          Sign out
        </button>
      </div>
    </div>
  );
}
