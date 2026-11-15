"use client";

import { useState } from "react";

export default function Sidebar({ view, onViewChange, onOpenSettings, theme, onToggleTheme, onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const go = (target) => (e) => {
    e.preventDefault();
    onViewChange(target);
  };

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand-header">
        <h2>Skiddio</h2>
      </div>

      <nav className="nav-links">
        <a href="#" className={view === "checklist" ? "active" : ""} onClick={go("checklist")}><i>📋</i> Checklist View</a>
        <a href="#" className={view === "calendar" ? "active" : ""} onClick={go("calendar")}><i>📅</i> Calendar View</a>
        <a href="#" className={view === "notes" ? "active" : ""} onClick={go("notes")}><i>📝</i> Notes</a>
        <a href="#" onClick={(e) => { e.preventDefault(); onOpenSettings(); }}><i>⚙️</i> Settings</a>

        <button type="button" className="btn-theme-toggle" onClick={onToggleTheme}>
          <span>{theme === "dark" ? "☀️" : "🌙"}</span> <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </nav>

      <div className="user-profile">
        <span>Student Account</span>
        <button type="button" className="btn-logout" disabled={loggingOut} onClick={handleLogout}>Logout</button>
      </div>
    </aside>
  );
}
