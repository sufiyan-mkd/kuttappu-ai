import { useState } from "react";
import { supabase } from "./supabase";
import "./Signup.css";

export default function Signup({ onShowLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      "account created. please check your email to confirm your account."
    );

    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span>kuttappu</span>
          <small>ai</small>
        </div>

        <h1>create your account</h1>

        <p className="auth-subtitle">
          start your english learning journey with kuttappu.
        </p>

        <form onSubmit={handleSignup}>

          <label>name</label>

          <input
            type="text"
            placeholder="your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            placeholder="minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label>confirm password</label>

          <input
            type="password"
            placeholder="re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "creating account..." : "create account"}
          </button>

        </form>

        <p className="auth-switch">
          already have an account?{" "}

          <button onClick={onShowLogin}>
            login
          </button>
        </p>

      </div>
    </div>
  );
}