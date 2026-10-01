import React, { useEffect, useState } from "react";
import "./ResetPassword.css";
import { supabase } from "./supabase";

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSessionReady(Boolean(session));
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN"
      ) {
        setSessionReady(Boolean(session));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!sessionReady) {
      setError(
        "this reset link is no longer active. please request a new password reset email."
      );
      return;
    }

    if (password.length < 6) {
      setError("password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("passwords do not match.");
      return;
    }

    setSaving(true);

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      console.error("password update failed:", updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessage("password updated successfully ✓");
    setPassword("");
    setConfirmPassword("");
    setSaving(false);

    setTimeout(() => {
      if (onDone) {
        onDone();
      } else {
        window.location.href = "/";
      }
    }, 1200);
  };

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <div className="reset-password-mark">k</div>

        <span className="reset-password-eyebrow">
          kuttappu ai · account security
        </span>

        <h1>set a new password.</h1>

        <p className="reset-password-intro">
          create a new password for your kuttappu account.
        </p>

        {!sessionReady && (
          <div className="reset-password-notice">
            waiting for your password reset session...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            new password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="enter new password"
              disabled={!sessionReady || saving}
            />
          </label>

          <label>
            confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="confirm new password"
              disabled={!sessionReady || saving}
            />
          </label>

          {error && (
            <div className="reset-password-error">
              {error}
            </div>
          )}

          {message && (
            <div className="reset-password-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!sessionReady || saving}
          >
            {saving ? "updating..." : "update password →"}
          </button>
        </form>

        <button
          type="button"
          className="reset-password-back"
          onClick={() => {
            if (onDone) onDone();
            else window.location.href = "/";
          }}
        >
          ← back to kuttappu
        </button>
      </section>
    </main>
  );
}
