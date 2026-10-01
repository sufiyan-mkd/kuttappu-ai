import React, { useEffect, useMemo, useState } from "react";
import "./Progress.css";
import { supabase } from "./supabase";

export default function Progress({ onBack }) {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [savingGoal, setSavingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadProgress = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setUser(null);
      setProgress(null);
      setLessonCount(0);
      setDailyTasks([]);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const { data: progressRow, error: progressError } =
      await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (progressError) {
      console.error("progress load failed:", progressError);
      setMessage("progress load cheyyan kazhinjilla.");
    }

    let currentProgress = progressRow;

    if (!currentProgress) {
      const { data: created, error: createError } =
        await supabase
          .from("learning_progress")
          .insert({
            user_id: currentUser.id,
            conversations_count: 0,
            messages_practiced: 0,
            lessons_completed: 0,
            vocabulary_learned: 0,
            current_streak: 0,
            daily_goal: 10,
            daily_completed: 0,
          })
          .select()
          .single();

      if (!createError) currentProgress = created;
    }

    const { count: completedLessons } = await supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUser.id)
      .eq("completed", true);

    const syncedLessonsCompleted = completedLessons || 0;

    if (
      currentProgress &&
      Number(currentProgress.lessons_completed) !== syncedLessonsCompleted
    ) {
      const { data: synced } = await supabase
        .from("learning_progress")
        .update({
          lessons_completed: syncedLessonsCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", currentUser.id)
        .select()
        .single();

      if (synced) currentProgress = synced;
    }

    setProgress(currentProgress);
    setDailyGoal(Number(currentProgress?.daily_goal) || 10);

    const today = new Date().toISOString().split("T")[0];

    const { data: tasks, error: taskError } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("task_date", today)
      .order("created_at", { ascending: true });

    if (taskError) {
      console.error("daily tasks load failed:", taskError);
    }

    setDailyTasks(tasks || []);
    setLessonCount(syncedLessonsCompleted);
    setLoading(false);
  };

  useEffect(() => {
    loadProgress();
  }, []);

  const dailyCompleted = useMemo(() => {
    if (dailyTasks.length > 0) {
      return dailyTasks.reduce(
        (total, task) =>
          total +
          Math.min(
            Number(task.completed) || 0,
            Number(task.target) || 1
          ),
        0
      );
    }

    return Number(progress?.daily_completed) || 0;
  }, [dailyTasks, progress]);

  const dailyTarget = useMemo(() => {
    if (dailyTasks.length > 0) {
      return dailyTasks.reduce(
        (total, task) => total + (Number(task.target) || 1),
        0
      );
    }

    return Number(dailyGoal) || 10;
  }, [dailyTasks, dailyGoal]);

  const dailyPercent =
    dailyTarget > 0
      ? Math.min(100, Math.round((dailyCompleted / dailyTarget) * 100))
      : 0;

  const saveDailyGoal = async () => {
    if (!user?.id) return;

    const value = Math.max(1, Number(dailyGoal) || 10);

    setSavingGoal(true);
    setMessage("");

    const { data, error } = await supabase
      .from("learning_progress")
      .upsert(
        {
          user_id: user.id,
          daily_goal: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("daily goal save failed:", error);
      setMessage("daily goal save cheyyan kazhinjilla.");
    } else {
      setProgress(data);
      setDailyGoal(value);
      setMessage("daily goal saved ✓");
    }

    setSavingGoal(false);
  };

  if (loading) {
    return (
      <div className="progress-page">
        <div className="progress-loading">loading your progress...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="progress-page">
        <div className="progress-empty">
          <h2>please log in first.</h2>
          {onBack && <button onClick={onBack}>← back</button>}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "conversations",
      value: Number(progress?.conversations_count) || 0,
    },
    {
      label: "messages practiced",
      value: Number(progress?.messages_practiced) || 0,
    },
    {
      label: "lessons completed",
      value: lessonCount,
    },
    {
      label: "vocabulary learned",
      value: Number(progress?.vocabulary_learned) || 0,
    },
    {
      label: "current streak",
      value: Number(progress?.current_streak) || 0,
    },
  ];

  return (
    <div className="progress-page">
      <div className="progress-container">
        {onBack && (
          <button className="progress-back-btn" onClick={onBack}>
            ← back
          </button>
        )}

        <div className="progress-header">
          <span className="progress-eyebrow">your learning journey</span>
          <h1>your progress</h1>
          <p>see how far you have come with kuttappu.</p>
        </div>

        {message && <div className="progress-message">{message}</div>}

        <section className="progress-daily-card">
          <div className="progress-daily-copy">
            <span className="progress-section-label">today</span>
            <h2>
              {dailyCompleted} / {dailyTarget}
            </h2>
            <p>daily practice completed</p>

            <div className="progress-bar">
              <div style={{ width: `${dailyPercent}%` }} />
            </div>
          </div>

          <div className="progress-circle">
            <strong>{dailyPercent}%</strong>
            <span>today</span>
          </div>
        </section>

        <section className="progress-goal-card">
          <div>
            <span className="progress-section-label">daily goal</span>
            <h3>set your practice target.</h3>
          </div>

          <div className="progress-goal-controls">
            <input
              type="number"
              min="1"
              max="100"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
            />

            <button
              type="button"
              onClick={saveDailyGoal}
              disabled={savingGoal}
            >
              {savingGoal ? "saving..." : "save"}
            </button>
          </div>
        </section>

        <section className="progress-stats-grid">
          {stats.map((stat) => (
            <div className="progress-stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="progress-activity-card">
          <span className="progress-section-label">activity</span>
          <h2>keep going.</h2>
          <p>
            {progress?.last_activity_at
              ? `last activity: ${new Date(
                  progress.last_activity_at
                ).toLocaleString()}`
              : "start learning today and your activity will appear here."}
          </p>
        </section>

        <section className="progress-tasks-card">
          <span className="progress-section-label">today&apos;s tasks</span>

          <div className="progress-task-list">
            {dailyTasks.length === 0 ? (
              <p>no daily tasks found yet.</p>
            ) : (
              dailyTasks.map((task) => (
                <div className="progress-task-row" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.description}</span>
                  </div>

                  <b>
                    {Math.min(
                      Number(task.completed) || 0,
                      Number(task.target) || 1
                    )}
                    /{Number(task.target) || 1}
                  </b>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
