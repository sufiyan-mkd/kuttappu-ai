import React, { useEffect, useState } from "react";
import "./Settings.css";
import { supabase } from "./supabase";

const THEME_KEY = "kuttappu-theme";

export default function Settings({ onBack, onLogout }) {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [englishLevel, setEnglishLevel] = useState("beginner");
  const [preferredLanguage, setPreferredLanguage] = useState("malayalam");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem(THEME_KEY) === "dark"
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("kuttappu-dark", darkMode);
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    async function load() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      setUser(currentUser);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, english_level, preferred_language")
        .eq("id", currentUser.id)
        .maybeSingle();

      setFullName(data?.full_name || currentUser.user_metadata?.full_name || "");
      setEnglishLevel(data?.english_level || "beginner");
      setPreferredLanguage(data?.preferred_language || "malayalam");
    }

    load();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");
    setError("");

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName.trim(),
        english_level: englishLevel,
        preferred_language: preferredLanguage,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setMessage("settings saved ✓");
    }

    setSaving(false);
  };

  const sendResetEmail = async () => {
    if (!user?.email) return;

    setResetting(true);
    setMessage("");
    setError("");

    const redirectTo = `${window.location.origin}/?reset-password=1`;

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("password reset email sent. check your inbox and spam folder.");
    }

    setResetting(false);
  };

  const toggleTheme = () => {
    setDarkMode((value) => !value);
  };

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <button className="settings-back" type="button" onClick={onBack}>
          ← back
        </button>

        <header className="settings-header">
          <span>account preferences</span>
          <h1>settings</h1>
          <p>manage your account, learning preferences and appearance.</p>
        </header>

        {(message || error) && (
          <div className={`settings-message ${error ? "error" : ""}`}>
            {error || message}
          </div>
        )}

        <form onSubmit={saveProfile}>
          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-label">profile</span>
                <h2>your learning profile.</h2>
              </div>
            </div>

            <div className="settings-grid">
              <label>
                <span>full name</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>

              <label>
                <span>email</span>
                <input value={user?.email || ""} disabled />
              </label>

              <label>
                <span>english level</span>
                <select value={englishLevel} onChange={(e) => setEnglishLevel(e.target.value)}>
                  <option value="beginner">beginner</option>
                  <option value="intermediate">intermediate</option>
                  <option value="advanced">advanced</option>
                </select>
              </label>

              <label>
                <span>preferred language</span>
                <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}>
                  <option value="malayalam">malayalam</option>
                  <option value="english">english</option>
                </select>
              </label>
            </div>

            <button className="settings-primary" type="submit" disabled={saving}>
              {saving ? "saving..." : "save changes"}
            </button>
          </section>
        </form>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span className="settings-label">appearance</span>
              <h2>choose your look.</h2>
            </div>
          </div>

          <button
            type="button"
            className={`theme-switch ${darkMode ? "on" : ""}`}
            onClick={toggleTheme}
            aria-pressed={darkMode}
          >
            <span className="theme-switch-copy">
              <strong>{darkMode ? "dark theme" : "light theme"}</strong>
              <small>{darkMode ? "easier on the eyes at night." : "clean and bright for daytime learning."}</small>
            </span>
            <span className="theme-toggle"><i /></span>
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span className="settings-label">security</span>
              <h2>password & account.</h2>
            </div>
          </div>

          <div className="security-row">
            <div>
              <strong>reset password</strong>
              <p>we'll send a secure password reset link to your email.</p>
            </div>
            <button type="button" className="settings-secondary" onClick={sendResetEmail} disabled={resetting}>
              {resetting ? "sending..." : "send reset email"}
            </button>
          </div>
        </section>

        <section className="settings-card danger-card">
          <div>
            <span className="settings-label">account</span>
            <h2>sign out.</h2>
            <p>sign out from this device.</p>
          </div>
          <button type="button" className="settings-danger" onClick={onLogout}>
            logout
          </button>
        </section>
      </div>
    </div>
  );
}
