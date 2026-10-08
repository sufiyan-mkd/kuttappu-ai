import { supabase } from "./supabase";

export async function trackTaskProgress(userId, taskType, amount = 1) {
  if (!userId || !taskType || amount <= 0) return false;

  // Use the user's local calendar date; UTC ISO dates can point to yesterday in India.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let { data: task, error: taskError } = await supabase
    .from("daily_tasks")
    .select("id, completed, target")
    .eq("user_id", userId)
    .eq("task_type", taskType)
    .eq("task_date", today)
    .maybeSingle();

  if (taskError) {
    console.error(`${taskType} task load failed:`, taskError);
    return false;
  }

  // Create the expected daily task if today's row was not created yet.
  if (!task) {
    const defaults = {
      conversation: { title: "ai conversation", description: "chat with kuttappu", target: 5 },
      vocabulary: { title: "learn new words", description: "learn new english words", target: 5 },
      grammar: { title: "grammar practice", description: "complete grammar practice", target: 1 },
      translation: { title: "translation practice", description: "translate sentences", target: 5 },
      speaking: { title: "speaking practice", description: "practice speaking english", target: 2 },
    };
    const definition = defaults[taskType];
    if (!definition) return false;
    const { error: insertError } = await supabase.from("daily_tasks").upsert({
      user_id: userId,
      task_type: taskType,
      title: definition.title,
      description: definition.description,
      target: definition.target,
      completed: 0,
      task_date: today,
    }, { onConflict: "user_id,task_type,task_date", ignoreDuplicates: true });
    if (insertError) {
      console.error(`${taskType} task create failed:`, insertError);
      return false;
    }
    const reloaded = await supabase.from("daily_tasks")
      .select("id, completed, target")
      .eq("user_id", userId).eq("task_type", taskType).eq("task_date", today).maybeSingle();
    task = reloaded.data;
    taskError = reloaded.error;
    if (taskError || !task) {
      console.error(`${taskType} task reload failed:`, taskError);
      return false;
    }
  }

  const currentCompleted = Number(task.completed) || 0;
  const target = Number(task.target) || 1;

  if (currentCompleted >= target) return false;

  const nextCompleted = Math.min(currentCompleted + amount, target);
  const actualAmount = nextCompleted - currentCompleted;

  if (actualAmount <= 0) return false;

  // The completion log is useful for history, but should not block the visible counter
  // if a deployment is missing the optional task_completions insert policy.
  const { error: completionError } = await supabase
    .from("task_completions")
    .insert({ user_id: userId, task_id: task.id, result: actualAmount });
  if (completionError) console.warn(`${taskType} completion log was not saved:`, completionError);

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

  const { data: existingProgress } = await supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const progress = existingProgress || {
    user_id: userId,
    conversations_count: 0,
    messages_practiced: 0,
    lessons_completed: 0,
    vocabulary_learned: 0,
    current_streak: 0,
    daily_goal: 10,
    daily_completed: 0,
  };

  const updates = {
    user_id: userId,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (taskType === "conversation") {
    updates.conversations_count =
      (Number(progress.conversations_count) || 0) + actualAmount;
    updates.messages_practiced =
      (Number(progress.messages_practiced) || 0) + actualAmount;
  }

  if (taskType === "translation") {
    updates.messages_practiced =
      (Number(progress.messages_practiced) || 0) + actualAmount;
  }

  if (taskType === "vocabulary") {
    updates.vocabulary_learned =
      (Number(progress.vocabulary_learned) || 0) + actualAmount;
  }

  if (taskType === "grammar") {
    updates.lessons_completed =
      (Number(progress.lessons_completed) || 0) + actualAmount;
  }

  // speaking is tracked as practice minutes; there is no separate
  // speaking counter in the current learning_progress schema.

  const taskWasJustCompleted = currentCompleted < target && nextCompleted >= target;
  updates.daily_completed =
    (Number(progress.daily_completed) || 0) + (taskWasJustCompleted ? 1 : 0);

  const { error: progressError } = await supabase
    .from("learning_progress")
    .upsert(updates, { onConflict: "user_id" });

  if (progressError) {
    console.error("learning progress update failed:", progressError);
  }

  return true;
}

export async function trackSpeakingProgress(userId, minutes = 1) {
  return trackTaskProgress(userId, "speaking", minutes);
}

export async function trackTranslationProgress(userId, count = 1) {
  return trackTaskProgress(userId, "translation", count);
}

export async function trackVocabularyProgress(userId, count = 1) {
  return trackTaskProgress(userId, "vocabulary", count);
}

export async function trackGrammarProgress(userId, count = 1) {
  return trackTaskProgress(userId, "grammar", count);
}
