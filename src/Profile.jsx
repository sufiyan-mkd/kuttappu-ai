import React, { useEffect, useRef, useState } from "react";
import "./Profile.css";
import { supabase } from "./supabase";

const AVATAR_BUCKET = "avatars";

export default function Profile({ onBack }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "",
    avatar_url: "",
    english_level: "beginner",
    learning_goal: "",
    preferred_language: "malayalam",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    setUser(currentUser);

    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, english_level, learning_goal, preferred_language")
      .eq("id", currentUser.id)
      .maybeSingle();

    setProfile({
      full_name: data?.full_name || currentUser.user_metadata?.full_name || "",
      avatar_url: data?.avatar_url || "",
      english_level: data?.english_level || "beginner",
      learning_goal: data?.learning_goal || "",
      preferred_language: data?.preferred_language || "malayalam",
    });
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setMessage("");
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("please choose an image file.");
      setUploading(false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("image must be smaller than 5 mb.");
      setUploading(false);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error(uploadError);
      setError(`upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    const avatarUrl = publicData?.publicUrl || "";

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) {
      setError(profileError.message);
    } else {
      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });
      setMessage("profile picture updated ✓");
    }

    setUploading(false);
    event.target.value = "";
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");
    setError("");

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: profile.full_name.trim(),
        avatar_url: profile.avatar_url,
        english_level: profile.english_level,
        learning_goal: profile.learning_goal.trim(),
        preferred_language: profile.preferred_language,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) {
      setError(profileError.message);
    } else {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name.trim(),
          avatar_url: profile.avatar_url,
        },
      });

      if (authError) setError(authError.message);
      else setMessage("profile saved ✓");
    }

    setSaving(false);
  }

  const initials = (profile.full_name || user?.email || "u").trim().charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <button className="profile-back" type="button" onClick={onBack}>← back</button>

        <header className="profile-header">
          <span>your account</span>
          <h1>profile</h1>
          <p>make your kuttappu learning profile yours.</p>
        </header>

        {(message || error) && (
          <div className={`profile-message ${error ? "error" : ""}`}>
            {error || message}
          </div>
        )}

        <section className="profile-card profile-hero-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-large">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="profile" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <button
              type="button"
              className="avatar-upload-button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "uploading..." : "change photo"}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleAvatarChange}
            />

            <small>jpg, png or webp · max 5 mb</small>
          </div>

          <div className="profile-hero-copy">
            <span className="profile-label">learner profile</span>
            <h2>{profile.full_name || "kuttappu learner"}</h2>
            <p>{user?.email || ""}</p>
          </div>
        </section>

        <form onSubmit={saveProfile}>
          <section className="profile-card">
            <div className="profile-card-heading">
              <span className="profile-label">personal details</span>
              <h2>your information.</h2>
            </div>

            <div className="profile-grid">
              <label>
                <span>full name</span>
                <input
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </label>

              <label>
                <span>email</span>
                <input value={user?.email || ""} disabled />
              </label>

              <label>
                <span>english level</span>
                <select
                  value={profile.english_level}
                  onChange={(e) => setProfile({ ...profile, english_level: e.target.value })}
                >
                  <option value="beginner">beginner</option>
                  <option value="intermediate">intermediate</option>
                  <option value="advanced">advanced</option>
                </select>
              </label>

              <label>
                <span>preferred language</span>
                <select
                  value={profile.preferred_language}
                  onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
                >
                  <option value="malayalam">malayalam</option>
                  <option value="english">english</option>
                </select>
              </label>

              <label className="profile-full">
                <span>learning goal</span>
                <textarea
                  rows="4"
                  value={profile.learning_goal}
                  onChange={(e) => setProfile({ ...profile, learning_goal: e.target.value })}
                  placeholder="what do you want to improve?"
                />
              </label>
            </div>

            <button className="profile-save" type="submit" disabled={saving}>
              {saving ? "saving..." : "save profile"}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}
