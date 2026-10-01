import React, { useEffect, useMemo, useState } from "react";
import "./Lessons.css";
import {
  beginnerLessons,
  intermediateLessons,
  advancedLessons,
} from "./lessonData";
import { supabase } from "./supabase";

const levelInfo = {
  beginner: {
    label: "beginner",
    icon: "🌱",
    description: "build your english foundation step by step.",
  },
  intermediate: {
    label: "intermediate",
    icon: "🚀",
    description: "improve your fluency and everyday communication.",
  },
  advanced: {
    label: "advanced",
    icon: "🧠",
    description: "develop natural, precise and confident english.",
  },
};

const levelData = {
  beginner: beginnerLessons,
  intermediate: intermediateLessons,
  advanced: advancedLessons,
};

export default function Lessons({ onBack, onPractice, user: userProp }) {
  const [activeLevel, setActiveLevel] = useState("beginner");
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [completedLessons, setCompletedLessons] = useState([]);
  const [lessonProgress, setLessonProgress] = useState({});

  const [practiceResults, setPracticeResults] = useState({});
  const [translationRevealed, setTranslationRevealed] = useState({});
  const [testAnswers, setTestAnswers] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadProgress = async () => {
      setLoading(true);

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(userProp || currentUser);

      if (!currentUser) {
        setCompletedLessons([]);
        setLessonProgress({});
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_progress")
        .select(
          "lesson_id, level, completed, test_score, test_total, completed_at"
        )
        .eq("user_id", currentUser.id);

      if (error) {
        console.error("lesson progress load failed:", error);
        setCompletedLessons([]);
        setLessonProgress({});
      } else {
        const progressMap = {};

        (data || []).forEach((row) => {
          const key = `${row.level}-${row.lesson_id}`;

          progressMap[key] = {
            completed: Boolean(row.completed),
            testScore: Number(row.test_score) || 0,
            testTotal: Number(row.test_total) || 0,
            completedAt: row.completed_at,
          };
        });

        setLessonProgress(progressMap);

        setCompletedLessons(
          (data || [])
            .filter((row) => row.completed)
            .map((row) => `${row.level}-${row.lesson_id}`)
        );
      }

      setLoading(false);
    };

    loadProgress();

    return () => {
      mounted = false;
    };
  }, [userProp]);

  const lessons = useMemo(() => {
    return (levelData[activeLevel] || []).map((lesson) => ({
      ...lesson,
      id: `${activeLevel}-${lesson.id}`,
      lessonId: lesson.id,
      number: lesson.id,
      level: activeLevel,
    }));
  }, [activeLevel]);

  const filteredLessons = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return lessons;

    return lessons.filter((lesson) =>
      `${lesson.title} ${lesson.objective}`
        .toLowerCase()
        .includes(value)
    );
  }, [lessons, search]);

  const completedCount = lessons.filter((lesson) =>
    completedLessons.includes(lesson.id)
  ).length;

  const progress =
    lessons.length > 0
      ? Math.round((completedCount / lessons.length) * 100)
      : 0;

  const changeLevel = (level) => {
    setActiveLevel(level);
    setSelectedLesson(null);
    setSearch("");
    setPracticeResults({});
    setTranslationRevealed({});
    setTestAnswers({});
    setTestResults({});
  };

  const syncLessonCount = async (userId) => {
    const { count, error: countError } = await supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true);

    if (countError) {
      console.error("completed lesson count failed:", countError);
      return;
    }

    const { data: existing, error: progressLoadError } = await supabase
      .from("learning_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (progressLoadError) {
      console.error("learning progress load failed:", progressLoadError);
      return;
    }

    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      conversations_count: Number(existing?.conversations_count) || 0,
      messages_practiced: Number(existing?.messages_practiced) || 0,
      lessons_completed: count || 0,
      vocabulary_learned: Number(existing?.vocabulary_learned) || 0,
      current_streak: Number(existing?.current_streak) || 0,
      daily_goal: Number(existing?.daily_goal) || 10,
      daily_completed: Number(existing?.daily_completed) || 0,
      last_activity_at: now,
      updated_at: now,
    };

    const { error: progressError } = await supabase
      .from("learning_progress")
      .upsert(payload, { onConflict: "user_id" });

    if (progressError) {
      console.error(
        "learning progress lesson sync failed:",
        progressError
      );
    }
  };

  const saveLessonProgress = async (
    lesson,
    completed,
    testScore = 0,
    testTotal = lesson.test?.length || 0
  ) => {
    if (!user?.id) {
      alert("please log in to save your lesson progress.");
      return false;
    }

    setSaving(true);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("lesson_progress")
      .upsert(
        {
          user_id: user.id,
          lesson_id: lesson.lessonId,
          level: lesson.level,
          completed,
          test_score: testScore,
          test_total: testTotal,
          completed_at: completed ? now : null,
          updated_at: now,
        },
        {
          onConflict: "user_id,level,lesson_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("lesson progress save failed:", error);
      setSaving(false);
      alert("lesson progress save cheyyan kazhinjilla. please try again.");
      return false;
    }

    const key = lesson.id;

    setLessonProgress((prev) => ({
      ...prev,
      [key]: {
        completed: Boolean(data.completed),
        testScore: Number(data.test_score) || 0,
        testTotal: Number(data.test_total) || 0,
        completedAt: data.completed_at,
      },
    }));

    setCompletedLessons((prev) => {
      if (completed) {
        return prev.includes(key) ? prev : [...prev, key];
      }

      return prev.filter((item) => item !== key);
    });

    if (completed) {
      await syncLessonCount(user.id);
    }

    setSaving(false);
    return true;
  };

  const markComplete = async (lesson) => {
    const current = lessonProgress[lesson.id];

    await saveLessonProgress(
      lesson,
      true,
      current?.testScore || 0,
      current?.testTotal || lesson.test?.length || 0
    );
  };

  const calculateTestScore = (lesson) => {
    if (!Array.isArray(lesson.test)) return 0;

    return lesson.test.reduce((score, question, index) => {
      const result = testResults[`${lesson.id}-${index}`];
      return score + (result?.correct ? 1 : 0);
    }, 0);
  };

  const handlePracticeAnswer = (
    lessonId,
    questionIndex,
    option,
    answer
  ) => {
    const correct = option === answer;

    setPracticeResults((prev) => ({
      ...prev,
      [`${lessonId}-${questionIndex}`]: {
        correct,
        selected: option,
        answer,
      },
    }));
  };

  const handleTestAnswer = async (
    lessonId,
    questionIndex,
    option,
    answer,
    lesson
  ) => {
    const correct = option === answer;

    setTestResults((prev) => ({
      ...prev,
      [`${lessonId}-${questionIndex}`]: {
        correct,
        selected: option,
        answer,
      },
    }));

    const nextScore =
      calculateTestScore(lesson) + (correct ? 1 : 0);

    if (nextScore >= lesson.test.length) {
      await saveLessonProgress(
        lesson,
        true,
        nextScore,
        lesson.test.length
      );
    }
  };

  const submitTextTestAnswer = async (
    lessonId,
    questionIndex,
    userAnswer,
    answer,
    lesson
  ) => {
    const value = userAnswer.trim().toLowerCase();

    if (!value) return;

    const correct =
      value === answer.trim().toLowerCase();

    setTestResults((prev) => ({
      ...prev,
      [`${lessonId}-${questionIndex}`]: {
        correct,
        selected: userAnswer,
        answer,
      },
    }));

    const currentResults = {
      ...testResults,
      [`${lessonId}-${questionIndex}`]: {
        correct,
        selected: userAnswer,
        answer,
      },
    };

    const score = lesson.test.reduce(
      (total, question, index) =>
        total +
        (currentResults[`${lesson.id}-${index}`]?.correct
          ? 1
          : 0),
      0
    );

    if (score >= lesson.test.length) {
      await saveLessonProgress(
        lesson,
        true,
        score,
        lesson.test.length
      );
    }
  };

  const openSpeakingPractice = (lesson) => {
    if (!onPractice) {
      console.error("onPractice prop is missing.");
      return;
    }

    onPractice("voice", {
      lessonId: lesson.lessonId,
      lessonNumber: lesson.number,
      lessonTitle: lesson.title,
      speakingPrompt: lesson.speaking,
    });
  };

  const resetLessonViewState = () => {
    setPracticeResults({});
    setTranslationRevealed({});
    setTestAnswers({});
    setTestResults({});
  };

  if (selectedLesson) {
    const lesson = selectedLesson;
    const saved = lessonProgress[lesson.id];
    const isCompleted = Boolean(saved?.completed);

    return (
      <div className="lessons-page">
        <div className="lesson-detail-page">
          <button
            className="lesson-back-btn"
            onClick={() => {
              setSelectedLesson(null);
              resetLessonViewState();
            }}
          >
            ← back to lessons
          </button>

          <div className="lesson-detail-header">
            <div>
              <span className="lesson-detail-level">
                {levelInfo[lesson.level].icon} {lesson.level}
              </span>

              <h1>
                lesson {lesson.number}: {lesson.title}
              </h1>

              <p>{lesson.objective}</p>
            </div>

            <div className="lesson-number-big">
              {String(lesson.number).padStart(2, "0")}
            </div>
          </div>

          <div className="lesson-flow">
            {[
              "learn",
              "vocabulary",
              "examples",
              "translation",
              "practice",
              "speaking",
              "test",
            ].map((item, index) => (
              <React.Fragment key={item}>
                <div
                  className={`lesson-flow-item ${
                    index === 0 ? "active" : ""
                  }`}
                >
                  <span>{index + 1}</span>
                  {item}
                </div>

                {index < 6 && (
                  <div className="lesson-flow-line" />
                )}
              </React.Fragment>
            ))}
          </div>

          <section className="lesson-section">
            <div className="section-label">01 · learn</div>
            <h2>let's learn this together.</h2>
            <p>{lesson.concept.explanation}</p>

            <div className="concept-card">
              <span>💡</span>
              <div>
                <strong>{lesson.concept.title}</strong>
                <p>
                  start with the idea, understand the pattern,
                  and then use it in your own sentences.
                </p>
              </div>
            </div>
          </section>

          <section className="lesson-section">
            <div className="section-label">02 · vocabulary</div>
            <h2>new words</h2>

            <div className="vocabulary-grid">
              {lesson.vocabulary.map((item, index) => (
                <div className="vocabulary-card" key={index}>
                  <strong>{item.word}</strong>
                  <span>{item.meaning}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="lesson-section">
            <div className="section-label">03 · examples</div>
            <h2>see it in action.</h2>

            <div className="examples-list">
              {lesson.examples.map((example, index) => (
                <div className="example-item" key={index}>
                  <span>{index + 1}</span>
                  <p>{example}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="lesson-section">
            <div className="section-label">04 · translation</div>
            <h2>translate & learn.</h2>

            <div className="translation-list">
              {lesson.translation.map((item, index) => {
                const key = `${lesson.id}-translation-${index}`;
                const revealed = translationRevealed[key];

                return (
                  <div
                    className="translation-card"
                    key={index}
                  >
                    <span className="translation-malayalam">
                      {item.malayalam}
                    </span>

                    <button
                      type="button"
                      className="translation-reveal-btn"
                      onClick={() =>
                        setTranslationRevealed((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }))
                      }
                    >
                      {revealed
                        ? "hide answer ↑"
                        : "show answer →"}
                    </button>

                    {revealed && (
                      <span className="translation-english">
                        {item.answer}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="lesson-section">
            <div className="section-label">05 · practice</div>
            <h2>check your understanding.</h2>

            <div className="practice-list">
              {lesson.practice.map((question, index) => {
                const result =
                  practiceResults[
                    `${lesson.id}-${index}`
                  ];

                return (
                  <div
                    className="practice-question"
                    key={index}
                  >
                    <strong>
                      {index + 1}. {question.question}
                    </strong>

                    <div className="practice-options">
                      {question.options.map(
                        (option, optionIndex) => (
                          <button
                            type="button"
                            key={optionIndex}
                            className={`practice-option ${
                              result?.selected === option
                                ? result.correct
                                  ? "correct"
                                  : "incorrect"
                                : ""
                            }`}
                            onClick={() =>
                              handlePracticeAnswer(
                                lesson.id,
                                index,
                                option,
                                question.answer
                              )
                            }
                          >
                            {option}
                          </button>
                        )
                      )}
                    </div>

                    {result && (
                      <div
                        className={`practice-feedback ${
                          result.correct
                            ? "correct"
                            : "incorrect"
                        }`}
                      >
                        {result.correct
                          ? "✓ correct!"
                          : `✕ correct answer: ${question.answer}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="lesson-section">
            <div className="section-label">06 · speaking</div>
            <h2>now, speak.</h2>

            <button
              type="button"
              className="speaking-card speaking-card-clickable"
              onClick={() => openSpeakingPractice(lesson)}
            >
              <div className="speaking-icon">🎙️</div>

              <div className="speaking-card-content">
                <strong>speaking challenge</strong>
                <p>{lesson.speaking}</p>

                <span className="speaking-hint">
                  click to start voice practice →
                </span>
              </div>

              <span className="speaking-arrow">→</span>
            </button>
          </section>

          <section className="lesson-section">
            <div className="section-label">07 · lesson test</div>
            <h2>final check.</h2>

            <div className="test-card">
              {Array.isArray(lesson.test) && (
                <div className="test-question-list">
                  {lesson.test.map(
                    (question, questionIndex) => {
                      const result =
                        testResults[
                          `${lesson.id}-${questionIndex}`
                        ];

                      return (
                        <div
                          className="test-question-block"
                          key={questionIndex}
                        >
                          <strong>
                            {questionIndex + 1}.{" "}
                            {question.question}
                          </strong>

                          <div className="test-answer-area">
                            <input
                              type="text"
                              className="test-answer-input"
                              placeholder="type your answer..."
                              value={
                                testAnswers[
                                  `${lesson.id}-${questionIndex}`
                                ] || ""
                              }
                              onChange={(e) =>
                                setTestAnswers((prev) => ({
                                  ...prev,
                                  [`${lesson.id}-${questionIndex}`]:
                                    e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  submitTextTestAnswer(
                                    lesson.id,
                                    questionIndex,
                                    testAnswers[
                                      `${lesson.id}-${questionIndex}`
                                    ] || "",
                                    question.answer,
                                    lesson
                                  );
                                }
                              }}
                            />

                            <button
                              type="button"
                              className="test-answer-btn"
                              onClick={() =>
                                submitTextTestAnswer(
                                  lesson.id,
                                  questionIndex,
                                  testAnswers[
                                    `${lesson.id}-${questionIndex}`
                                  ] || "",
                                  question.answer,
                                  lesson
                                )
                              }
                            >
                              check →
                            </button>
                          </div>

                          {result && (
                            <div
                              className={`test-feedback ${
                                result.correct
                                  ? "correct"
                                  : "incorrect"
                              }`}
                            >
                              {result.correct
                                ? "✓ correct!"
                                : `✕ correct answer: ${question.answer}`}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}

                  <div className="lesson-test-summary">
                    <span>
                      score:{" "}
                      {
                        Object.values(testResults).filter(
                          (item) =>
                            item.correct &&
                            item.answer
                        ).length
                      }/{lesson.test.length}
                    </span>

                    {isCompleted && (
                      <span className="lesson-test-completed">
                        ✓ saved to your progress
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="lesson-complete-area">
            <button
              className={`complete-lesson-btn ${
                isCompleted ? "completed" : ""
              }`}
              disabled={saving}
              onClick={() => markComplete(lesson)}
            >
              {saving
                ? "saving..."
                : isCompleted
                ? "✓ lesson completed"
                : "complete lesson →"}
            </button>

            {!user && (
              <p className="lesson-login-note">
                log in to save your lesson progress.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lessons-page">
      <header className="lessons-header">
        <div className="lessons-header-left">
          {onBack && (
            <button
              className="lesson-back-btn"
              onClick={onBack}
            >
              ← back
            </button>
          )}

          <div>
            <span className="lessons-eyebrow">
              your learning journey
            </span>

            <h1>lessons</h1>

            <p>
              learn english step by step with kuttappu.
            </p>
          </div>
        </div>
      </header>

      <main className="lessons-main">
        <div className="level-tabs">
          {Object.keys(levelInfo).map((level) => {
            const count =
              levelData[level]?.length || 0;

            return (
              <button
                key={level}
                type="button"
                className={`level-tab ${
                  activeLevel === level ? "active" : ""
                }`}
                onClick={() => changeLevel(level)}
              >
                <span>{levelInfo[level].icon}</span>

                <div>
                  <strong>
                    {levelInfo[level].label}
                  </strong>

                  <small>{count} lessons</small>
                </div>
              </button>
            );
          })}
        </div>

        <section className="lesson-overview">
          <div>
            <span className="overview-label">
              {levelInfo[activeLevel].icon} {activeLevel}
            </span>

            <h2>{levelInfo[activeLevel].description}</h2>

            <p>
              complete each lesson to build your english
              skills step by step.
            </p>
          </div>

          <div className="lesson-progress-box">
            <div className="progress-top">
              <strong>{progress}%</strong>

              <span>
                {completedCount}/{lessons.length} completed
              </span>
            </div>

            <div className="lesson-progress-bar">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <div className="lesson-toolbar">
          <div>
            <h2>{activeLevel} lessons</h2>
            <p>choose a lesson and start learning.</p>
          </div>

          <div className="lesson-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="search lessons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="no-lessons">
            <span>⏳</span>
            <h3>loading your progress...</h3>
            <p>getting your completed lessons from supabase.</p>
          </div>
        ) : (
          <>
            <div className="lessons-grid">
              {filteredLessons.map((lesson) => {
                const completed =
                  completedLessons.includes(lesson.id);

                return (
                  <button
                    type="button"
                    className={`lesson-card ${
                      completed ? "completed" : ""
                    }`}
                    key={lesson.id}
                    onClick={() => {
                      resetLessonViewState();
                      setSelectedLesson(lesson);
                    }}
                  >
                    <div className="lesson-card-top">
                      <span className="lesson-card-number">
                        {String(lesson.number).padStart(2, "0")}
                      </span>

                      {completed ? (
                        <span className="lesson-status completed-status">
                          ✓ completed
                        </span>
                      ) : (
                        <span className="lesson-status">
                          start →
                        </span>
                      )}
                    </div>

                    <div className="lesson-card-body">
                      <h3>{lesson.title}</h3>

                      <p>{lesson.objective}</p>
                    </div>

                    <div className="lesson-card-bottom">
                      <span>
                        {completed
                          ? "completed"
                          : "not started"}
                      </span>

                      <span>
                        lesson {lesson.number}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredLessons.length === 0 && (
              <div className="no-lessons">
                <span>🔎</span>
                <h3>no lessons found</h3>
                <p>try searching with another word.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
