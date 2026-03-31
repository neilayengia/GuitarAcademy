import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Layers, GitBranch, PlayCircle, Mic, TrendingUp, Menu, X, Settings } from "lucide-react";
import UserMenu from "./UserMenu";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/voicings", icon: Layers, label: "Voicings" },
  { to: "/fretboard", icon: GitBranch, label: "Fretboard" },
  { to: "/voice-leading", icon: GitBranch, label: "Voice Leading" },
  { to: "/practice", icon: PlayCircle, label: "Practice" },
  { to: "/jam", icon: Mic, label: "Jam Studio" },
  { to: "/analysis", icon: TrendingUp, label: "Progress" },
];

interface SidebarProps {
  onOpenSettings?: () => void;
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      <div className="px-5 pt-7 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <div>
            <span className="text-text font-semibold text-[15px] tracking-tight">Rubato</span>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 text-text-muted hover:text-text rounded-md">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-radius-md transition-all duration-150 ${
                  isActive
                    ? "bg-white/[0.06] text-text font-medium"
                    : "text-text-secondary hover:text-text hover:bg-white/[0.03]"
                }`
              }
            >
              <Icon size={17} strokeWidth={1.8} />
              <span className="text-[13px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 mb-1">
        <button onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-radius-md text-text-secondary hover:text-text hover:bg-white/[0.03] transition-all duration-150">
          <Settings size={17} strokeWidth={1.8} />
          <span className="text-[13px]">Settings</span>
        </button>
      </div>

      <UserMenu />
    </>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-radius-md bg-card border border-border-subtle text-text shadow-elevated"
        aria-label="Open menu">
        <Menu size={18} />
      </button>

      <div className="hidden lg:flex w-52 bg-surface/50 h-screen flex-col flex-shrink-0 border-r border-border-subtle">
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-60 bg-bg flex flex-col animate-slide-in border-r border-border-subtle">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
