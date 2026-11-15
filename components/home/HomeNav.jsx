"use client";

import Link from "next/link";
import useTheme from "@/hooks/useTheme";

export default function HomeNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="lp-nav">
      <div className="lp-container lp-nav-inner">
        <Link href="/" className="lp-logo" aria-label="Skiddio home">Skiddio</Link>
        <nav className="lp-nav-links" aria-label="Main">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#results">Survey results</a>
        </nav>
        <div className="lp-nav-actions">
          <button type="button" className="lp-icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
          <Link href="/dashboard" className="lp-btn lp-btn-primary lp-btn-sm">Open app</Link>
        </div>
      </div>
    </header>
  );
}
