import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

export default function Login({ onLogin, onShowSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onLogin(data.user);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span>kuttappu</span>
          <small>ai</small>
        </div>

        <h1>welcome back</h1>
        <p className="auth-subtitle">
          login to continue learning with kuttappu.
        </p>

        <form onSubmit={handleLogin}>

          <label>email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>password</label>
          <input
            type="password"
            placeholder="your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "logging in..." : "login"}
          </button>

        </form>

        <p className="auth-switch">
          don't have an account?{" "}
          <button onClick={onShowSignup}>
            sign up
          </button>
        </p>

      </div>
    </div>
  );
}