import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  const initial = (profile.display_name || profile.email)[0].toUpperCase();
  const name = profile.display_name || profile.email.split('@')[0];

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
        <button onClick={signOut} className="user-menu-signout">
          Sign out
        </button>
      </div>
    </div>
  );
}
