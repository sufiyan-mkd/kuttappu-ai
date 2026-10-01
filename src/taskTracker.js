import { supabase } from "./supabase";

const getToday = () => new Date().toISOString().split("T")[0];

async function ensureProgress(userId) {
  const { data, error } = await supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("learning progress load failed:", error);
    return null;
  }

  if (data) return data;

  const defaults = {
    user_id: userId,
    conversations_count: 0,
    messages_practiced: 0,
    lessons_completed: 0,
    vocabulary_learned: 0,
    current_streak: 0,
    daily_goal: 10,
    daily_completed: 0,
    last_activity_at: null,
  };

  const { data: created, error: createError } = await supabase
    .from("learning_progress")
    .insert(defaults)
    .select()
    .single();

  if (createError) {
    console.error("learning progress create failed:", createError);
    return null;
  }

  return created;
}

export async function trackTaskProgress(userId, taskType, amount = 1) {
  if (!userId || !taskType || amount <= 0) return false;

  const today = getToday();

  const { data: task, error: taskError } = await supabase
    .from("daily_tasks")
    .select("id, completed, target")
    .eq("user_id", userId)
    .eq("task_type", taskType)
    .eq("task_date", today)
    .maybeSingle();

  if (taskError || !task) {
    console.error(`${taskType} task load failed:`, taskError);
    return false;
  }

  const currentCompleted = Number(task.completed) || 0;
  const target = Number(task.target) || 1;

  if (currentCompleted >= target) return false;

  const nextCompleted = Math.min(currentCompleted + amount, target);
  const actualAmount = nextCompleted - currentCompleted;

  if (actualAmount <= 0) return false;

  const { error: completionError } = await supabase
    .from("task_completions")
    .insert({
      user_id: userId,
      task_id: task.id,
      result: actualAmount,
    });

  if (completionError) {
    console.error(`${taskType} completion save failed:`, completionError);
    return false;
  }

  const { error: updateError } = await supabase
    .from("daily_tasks")
    .update({
      completed: nextCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .eq("user_id", userId);

  if (updateError) {
    console.error(`${taskType} task update failed:`, updateError);
    return false;
  }

  const progress = await ensureProgress(userId);
  if (!progress) return false;

  const taskWasJustCompleted =
    currentCompleted < target && nextCompleted >= target;

  const updates = {
    user_id: userId,
    conversations_count: Number(progress.conversations_count) || 0,
    messages_practiced: Number(progress.messages_practiced) || 0,
    lessons_completed: Number(progress.lessons_completed) || 0,
    vocabulary_learned: Number(progress.vocabulary_learned) || 0,
    current_streak: Number(progress.current_streak) || 0,
    daily_goal: Number(progress.daily_goal) || 10,
    daily_completed: Number(progress.daily_completed) || 0,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (taskType === "conversation") {
    updates.conversations_count += actualAmount;
    updates.messages_practiced += actualAmount;
  }

  if (taskType === "translation") {
    updates.messages_practiced += actualAmount;
  }

  if (taskType === "vocabulary") {
    updates.vocabulary_learned += actualAmount;
  }

  if (taskType === "grammar") {
    updates.lessons_completed += actualAmount;
  }

  if (taskWasJustCompleted) {
    updates.daily_completed += 1;
  }

  const { error: progressError } = await supabase
    .from("learning_progress")
    .upsert(updates, { onConflict: "user_id" });

  if (progressError) {
    console.error("learning progress update failed:", progressError);
    return false;
  }

  return true;
}

export async function trackSpeakingProgress(userId, minutes = 1) {
  return trackTaskProgress(userId, "speaking", minutes);
}

export async function trackVocabularyProgress(userId, count = 1) {
  return trackTaskProgress(userId, "vocabulary", count);
}

export async function trackGrammarProgress(userId, count = 1) {
  return trackTaskProgress(userId, "grammar", count);
}

export async function trackTranslationProgress(userId, count = 1) {
  return trackTaskProgress(userId, "translation", count);
}
