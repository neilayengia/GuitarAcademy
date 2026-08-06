import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import UserMenu from "./UserMenu";

const navSections: { label?: string; items: { to: string; label: string }[] }[] = [
  { items: [{ to: "/", label: "Home" }] },
  {
    label: "Theory",
    items: [
      { to: "/voicings", label: "Voicings" },
      { to: "/fretboard", label: "Scales" },
      { to: "/voice-leading", label: "Voice Leading" },
    ],
  },
  {
    label: "Play",
    items: [
      { to: "/practice", label: "Practice" },
      { to: "/jam", label: "Jam Studio" },
    ],
  },
  { items: [{ to: "/analysis", label: "Progress" }] },
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
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Rubato</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {navSections.map((section, i) => (
          <div key={i} className="sidebar-section">
            {section.label && <p className="sidebar-section-label">{section.label}</p>}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
                }
              >
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <button
          onClick={onOpenSettings}
          className="sidebar-link"
        >
          <span className="sidebar-link-label">Settings</span>
        </button>
        <UserMenu />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(true)}
        className="sidebar-mobile-toggle"
        aria-label="Open menu">
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* Desktop sidebar */}
      <div className="sidebar-desktop">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div className="sidebar-mobile-drawer" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="sidebar-mobile-close">
              <X size={16} strokeWidth={1.5} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
