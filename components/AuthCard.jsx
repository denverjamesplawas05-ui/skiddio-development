"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AuthCard({ theme, onToggleTheme, onSignedIn, initialError = "" }) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialError ? { text: initialError, success: false } : null);
  const [busy, setBusy] = useState(false);

  function toggleMode() {
    setIsSignUpMode((prev) => !prev);
    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = isSignUpMode
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;

      if (isSignUpMode && !data.session) {
        setMessage({ text: "Account created. Check your email to confirm your account before signing in.", success: true });
      } else if (data.user) {
        await onSignedIn(data.user);
      }
    } catch (error) {
      setMessage({ text: error.message, success: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="auth-container" className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand">
            <h1>Skiddio</h1>
            <p>AI-Assisted Task &amp; Schedule Manager</p>
          </div>
          <button type="button" className="btn-auth-theme" aria-label="Toggle Theme" onClick={onToggleTheme}>
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="username@example.com"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              autoComplete={isSignUpMode ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && (
            <p className={`auth-error ${message.success ? "auth-error--success" : ""}`} role="alert" aria-live="polite">
              {message.text}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {isSignUpMode ? "Create Account" : "Sign In"}
          </button>
        </form>

        <button type="button" className="auth-mode-toggle" onClick={toggleMode}>
          {isSignUpMode ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>
        <Link href="/" className="auth-back">&larr; Back to home</Link>
      </div>
    </div>
  );
}
