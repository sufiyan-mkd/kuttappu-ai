import { useEffect, useMemo, useRef, useState } from "react";
import "./Practice.css";

import {
  trackSpeakingProgress,
  trackVocabularyProgress,
  trackGrammarProgress,
} from "./taskTracker";

/* =========================================================
   question banks
   ========================================================= */

const vocabularyBank = [
  {
    word: "happy",
    question: "what is the opposite of happy?",
    options: [
      "sad",
      "angry",
      "tired",
      "excited",
    ],
    answer: "sad",
  },

  {
    word: "begin",
    question: "what does 'begin' mean?",
    options: [
      "to start",
      "to finish",
      "to stop",
      "to forget",
    ],
    answer: "to start",
  },

  {
    word: "quick",
    question: "what is the closest meaning of quick?",
    options: [
      "fast",
      "slow",
      "late",
      "weak",
    ],
    answer: "fast",
  },

  {
    word: "honest",
    question: "what does an honest person do?",
    options: [
      "tells the truth",
      "always sleeps",
      "runs fast",
      "speaks loudly",
    ],
    answer: "tells the truth",
  },

  {
    word: "difficult",
    question: "what is the opposite of difficult?",
    options: [
      "easy",
      "heavy",
      "strong",
      "large",
    ],
    answer: "easy",
  },

  {
    word: "brave",
    question: "what does brave mean?",
    options: [
      "not afraid to face danger",
      "very sleepy",
      "very hungry",
      "always quiet",
    ],
    answer: "not afraid to face danger",
  },

  {
    word: "choose",
    question: "what does choose mean?",
    options: [
      "to select",
      "to lose",
      "to hide",
      "to wait",
    ],
    answer: "to select",
  },

  {
    word: "improve",
    question: "what does improve mean?",
    options: [
      "to make better",
      "to make worse",
      "to forget",
      "to remove",
    ],
    answer: "to make better",
  },

  {
    word: "enough",
    question: "what does enough mean?",
    options: [
      "as much as needed",
      "very little",
      "nothing",
      "too much",
    ],
    answer: "as much as needed",
  },

  {
    word: "careful",
    question: "what does careful mean?",
    options: [
      "giving attention to avoid mistakes",
      "very fast",
      "very noisy",
      "always angry",
    ],
    answer:
      "giving attention to avoid mistakes",
  },

  {
    word: "quiet",
    question: "what is the opposite of quiet?",
    options: [
      "noisy",
      "small",
      "weak",
      "slow",
    ],
    answer: "noisy",
  },

  {
    word: "strong",
    question: "what is the opposite of strong?",
    options: [
      "weak",
      "fast",
      "brave",
      "kind",
    ],
    answer: "weak",
  },

  {
    word: "ancient",
    question: "what does ancient mean?",
    options: [
      "very old",
      "very new",
      "very small",
      "very expensive",
    ],
    answer: "very old",
  },

  {
    word: "polite",
    question: "what does polite mean?",
    options: [
      "having good manners",
      "being angry",
      "being late",
      "being careless",
    ],
    answer: "having good manners",
  },

  {
    word: "borrow",
    question: "what does borrow mean?",
    options: [
      "take something and return it later",
      "buy something",
      "break something",
      "throw something",
    ],
    answer:
      "take something and return it later",
  },

  {
    word: "arrive",
    question: "what does arrive mean?",
    options: [
      "reach a place",
      "leave a place",
      "forget a place",
      "clean a place",
    ],
    answer: "reach a place",
  },

  {
    word: "reply",
    question: "what does reply mean?",
    options: [
      "to answer",
      "to sleep",
      "to run",
      "to wait",
    ],
    answer: "to answer",
  },

  {
    word: "healthy",
    question: "what does healthy mean?",
    options: [
      "in good physical condition",
      "very tired",
      "very expensive",
      "very old",
    ],
    answer:
      "in good physical condition",
  },

  {
    word: "usually",
    question: "what does usually mean?",
    options: [
      "normally or most often",
      "never",
      "only once",
      "very rarely",
    ],
    answer:
      "normally or most often",
  },

  {
    word: "possible",
    question: "what does possible mean?",
    options: [
      "able to happen",
      "unable to happen",
      "already finished",
      "very difficult",
    ],
    answer: "able to happen",
  },
];

/* =========================================================
   grammar bank
   ========================================================= */

const grammarBank = [
  {
    question:
      "she ___ to school every day.",
    options: [
      "go",
      "goes",
      "going",
      "gone",
    ],
    answer: "goes",
  },

  {
    question:
      "they ___ football yesterday.",
    options: [
      "play",
      "plays",
      "played",
      "playing",
    ],
    answer: "played",
  },

  {
    question:
      "i ___ a student.",
    options: [
      "am",
      "is",
      "are",
      "be",
    ],
    answer: "am",
  },

  {
    question:
      "he ___ watching tv now.",
    options: [
      "is",
      "are",
      "am",
      "be",
    ],
    answer: "is",
  },

  {
    question:
      "we ___ to the beach last sunday.",
    options: [
      "go",
      "goes",
      "went",
      "going",
    ],
    answer: "went",
  },

  {
    question:
      "my brother ___ english very well.",
    options: [
      "speak",
      "speaks",
      "speaking",
      "spoken",
    ],
    answer: "speaks",
  },

  {
    question:
      "i ___ breakfast at 8 am yesterday.",
    options: [
      "eat",
      "eats",
      "ate",
      "eating",
    ],
    answer: "ate",
  },

  {
    question:
      "she ___ already finished her homework.",
    options: [
      "has",
      "have",
      "having",
      "had",
    ],
    answer: "has",
  },

  {
    question:
      "there ___ two books on the table.",
    options: [
      "is",
      "are",
      "am",
      "be",
    ],
    answer: "are",
  },

  {
    question:
      "i will ___ you tomorrow.",
    options: [
      "call",
      "called",
      "calling",
      "calls",
    ],
    answer: "call",
  },

  {
    question:
      "he ___ not like coffee.",
    options: [
      "do",
      "does",
      "is",
      "are",
    ],
    answer: "does",
  },

  {
    question:
      "we ___ studying english right now.",
    options: [
      "is",
      "am",
      "are",
      "be",
    ],
    answer: "are",
  },

  {
    question:
      "she has ___ her room.",
    options: [
      "clean",
      "cleaned",
      "cleaning",
      "cleans",
    ],
    answer: "cleaned",
  },

  {
    question:
      "i ___ never been to delhi.",
    options: [
      "has",
      "have",
      "am",
      "did",
    ],
    answer: "have",
  },

  {
    question:
      "if it rains, we ___ at home.",
    options: [
      "stay",
      "stayed",
      "stays",
      "staying",
    ],
    answer: "stay",
  },

  {
    question:
      "he can ___ very fast.",
    options: [
      "runs",
      "running",
      "run",
      "ran",
    ],
    answer: "run",
  },

  {
    question:
      "they ___ happy yesterday.",
    options: [
      "was",
      "were",
      "are",
      "is",
    ],
    answer: "were",
  },

  {
    question:
      "this book is ___ than that one.",
    options: [
      "interesting",
      "more interesting",
      "most interesting",
      "interest",
    ],
    answer: "more interesting",
  },

  {
    question:
      "please ___ the door.",
    options: [
      "open",
      "opened",
      "opening",
      "opens",
    ],
    answer: "open",
  },

  {
    question:
      "i have lived here ___ 2020.",
    options: [
      "for",
      "since",
      "from",
      "at",
    ],
    answer: "since",
  },
];

/* =========================================================
   speaking prompts
   ========================================================= */

const speakingPrompts = [
  "introduce yourself in english.",
  "talk about your family.",
  "describe your daily routine.",
  "talk about your college or school.",
  "describe your favorite food.",
  "talk about your best friend.",
  "describe your hometown.",
  "talk about your weekend.",
  "describe your favorite hobby.",
  "talk about your future goal.",
];

/* =========================================================
   utility functions
   ========================================================= */

function shuffleArray(items) {
  const array = [
    ...items,
  ];

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      array[i],
      array[j],
    ] = [
      array[j],
      array[i],
    ];
  }

  return array;
}

/*
  create a new set of questions.
  this makes sure that the next practice
  does not immediately use the previous set.
*/

function createNewQuestionSet(
  bank,
  previousIds = []
) {
  const previousSet =
    new Set(previousIds);

  const available =
    bank.filter(
      (_, index) =>
        !previousSet.has(
          index
        )
    );

  const source =
    available.length >= 5
      ? available
      : bank;

  const shuffled =
    shuffleArray(
      source.map(
        (item, index) => ({
          ...item,
          _sourceIndex:
            bank.indexOf(
              item
            ),
        })
      )
    );

  return shuffled
    .slice(0, 5)
    .map(
      (item) => ({
        ...item,
        options:
          shuffleArray(
            item.options
          ),
      })
    );
}

/* =========================================================
   voice practice
   ========================================================= */

function VoicePractice({
  user,
  onBack,
  speakingPrompt = "",
  lessonTitle = "",
}) {
  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    seconds,
    setSeconds,
  ] = useState(0);

  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    recognition,
    setRecognition,
  ] = useState(null);

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const targetMinutes = 2;

  const trackedMinutesRef = useRef(new Set());
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const mountedRef = useRef(true);

  /* =======================================================
     speech recognition
     ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage(
        "voice recognition is not supported in this browser. please use google chrome."
      );

      return () => {
        mountedRef.current = false;
      };
    }

    const recognizer = new SpeechRecognition();

    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = "en-US";

    recognizer.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];
        const text = result?.[0]?.transcript || "";

        if (result.isFinal) {
          finalText += text + " ";
        } else {
          interimText += text;
        }
      }

      if (finalText.trim()) {
        finalTranscriptRef.current =
          `${finalTranscriptRef.current} ${finalText}`.trim();
      }

      const visibleText =
        `${finalTranscriptRef.current} ${interimText}`.trim();

      if (mountedRef.current) {
        setTranscript(visibleText);
      }
    };

    recognizer.onerror = (event) => {
      console.error(
        "speech recognition error:",
        event.error
      );

      if (!mountedRef.current) return;

      if (event.error === "not-allowed") {
        isRecordingRef.current = false;
        setIsRecording(false);
        setMessage(
          "microphone permission was denied. please allow microphone access and try again."
        );
        return;
      }

      if (event.error === "no-speech") {
        setMessage(
          "no speech detected. please speak clearly."
        );
        return;
      }

      setMessage(
        "voice recognition had a problem. please try again."
      );
    };

    recognizer.onend = () => {
      if (
        mountedRef.current &&
        isRecordingRef.current
      ) {
        try {
          recognizer.start();
        } catch {
          // already running
        }
      }
    };

    setRecognition(recognizer);

    return () => {
      mountedRef.current = false;
      isRecordingRef.current = false;

      try {
        recognizer.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  /* =======================================================
     timer
     ======================================================= */

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer =
      setInterval(
        () => {
          setSeconds(
            (current) =>
              current + 1
          );
        },
        1000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    isRecording,
  ]);

  /* =======================================================
     complete speaking minute
     ======================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      seconds === 0 ||
      seconds % 60 !== 0
    ) {
      return;
    }

    const minutes = Math.floor(seconds / 60);

    if (trackedMinutesRef.current.has(minutes)) {
      return;
    }

    trackedMinutesRef.current.add(minutes);

    trackSpeakingProgress(user.id, 1).catch((error) => {
      console.error("speaking progress error:", error);
    });

    if (minutes >= targetMinutes) {
      isRecordingRef.current = false;
      setIsRecording(false);

      try {
        recognition?.stop();
      } catch {
        // ignore
      }

      setCompleted(true);
      setMessage(
        "great! today's speaking goal is complete."
      );
    }
  }, [seconds, user?.id, recognition]);

  function startRecording() {
    if (!recognition) {
      setMessage(
        "your browser does not support voice practice."
      );

      return;
    }

    try {
      recognition.start();
    } catch {
      // recognition may already be running
    }

    isRecordingRef.current = true;

    setIsRecording(true);

    setMessage(
      "speak in english..."
    );
  }

  function stopRecording() {
    try {
      recognition?.stop();
    } catch {
      // ignore
    }

    isRecordingRef.current = false;

    setIsRecording(false);

    setMessage(
      "practice paused."
    );
  }

  function resetPractice() {
    try {
      recognition?.stop();
    } catch {
      // ignore
    }

    isRecordingRef.current = false;

    setIsRecording(false);

    setSeconds(0);

    setTranscript("");

    finalTranscriptRef.current = "";
    trackedMinutesRef.current.clear();

    setMessage("");

    setCompleted(
      false
    );
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  const formattedSeconds =
    String(
      remainingSeconds
    ).padStart(2, "0");

  const progress =
    Math.min(
      seconds /
        (targetMinutes *
          60),
      1
    ) * 100;

  return (
    <div className="practice-content">

      <div className="practice-heading">

        <span className="practice-kicker">
          speaking practice
        </span>

        <h1>
          speak with confidence.
        </h1>

        <p>
          practice speaking english
          naturally with kuttappu.
        </p>

      </div>

      <div className="voice-practice-card">

        <div className="voice-orb-wrapper">

          <div
            className={`voice-orb ${
              isRecording
                ? "recording"
                : ""
            }`}
          >
            <span>
              ♩
            </span>
          </div>

        </div>

        <div className="voice-timer">
          {minutes}:
          {formattedSeconds}
        </div>

        <div className="voice-target">
          goal: {targetMinutes} minutes
        </div>

        <div className="voice-progress">
          <div
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="lesson-speaking-prompt">
          <span>
            {lessonTitle
              ? `lesson speaking · ${lessonTitle}`
              : "your speaking challenge"}
          </span>

          <p className="voice-prompt">
            {completed
              ? "practice complete!"
              : speakingPrompt ||
                "talk about yourself, your day, your family or anything you like."}
          </p>
        </div>

        {transcript && (
          <div className="voice-transcript">

            <span>
              you said
            </span>

            <p>
              {transcript}
            </p>

          </div>
        )}

        {message && (
          <p className="practice-message">
            {message}
          </p>
        )}

        <div className="practice-actions">

          {!completed &&
            !isRecording && (
              <button
                className="practice-primary-button"
                onClick={
                  startRecording
                }
              >
                start speaking
              </button>
            )}

          {!completed &&
            isRecording && (
              <button
                className="practice-stop-button"
                onClick={
                  stopRecording
                }
              >
                stop
              </button>
            )}

          {completed && (
            <button
              className="practice-primary-button"
              onClick={
                resetPractice
              }
            >
              practice again
            </button>
          )}

        </div>

      </div>

      <button
        className="practice-back-button"
        onClick={onBack}
      >
        ← back to chat
      </button>

    </div>
  );
}

/* =========================================================
   vocabulary practice
   ========================================================= */

function VocabularyPractice({
  user,
  onBack,
}) {
  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    questionIndex,
    setQuestionIndex,
  ] = useState(0);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState("");

  const [
    score,
    setScore,
  ] = useState(0);

  const [
    answered,
    setAnswered,
  ] = useState(false);

  const [
    finished,
    setFinished,
  ] = useState(false);

  const [
    previousQuestionIds,
    setPreviousQuestionIds,
  ] = useState([]);

  function createPractice() {
    const newQuestions =
      createNewQuestionSet(
        vocabularyBank,
        previousQuestionIds
      );

    setQuestions(
      newQuestions
    );

    setPreviousQuestionIds(
      newQuestions.map(
        (question) =>
          question._sourceIndex
      )
    );

    setQuestionIndex(
      0
    );

    setSelectedAnswer(
      ""
    );

    setScore(0);

    setAnswered(
      false
    );

    setFinished(
      false
    );
  }

  useEffect(() => {
    createPractice();
    // intentionally only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAnswer(
    answer
  ) {
    if (
      answered ||
      !questions[
        questionIndex
      ]
    ) {
      return;
    }

    setSelectedAnswer(
      answer
    );

    setAnswered(
      true
    );

    const currentQuestion =
      questions[
        questionIndex
      ];

    const isCorrect =
      answer ===
      currentQuestion.answer;

    if (isCorrect) {
      setScore(
        (current) =>
          current + 1
      );

      if (user?.id) {
        trackVocabularyProgress(
          user.id,
          1
        ).catch((error) => {
          console.error(
            "vocabulary progress error:",
            error
          );
        });
      }
    }
  }

  function nextQuestion() {
    if (
      questionIndex <
      questions.length - 1
    ) {
      setQuestionIndex(
        (current) =>
          current + 1
      );

      setSelectedAnswer(
        ""
      );

      setAnswered(
        false
      );

      return;
    }

    setFinished(
      true
    );
  }

  const currentQuestion =
    questions[
      questionIndex
    ];

  if (
    finished &&
    questions.length > 0
  ) {
    return (
      <PracticeResult
        title="practice complete"
        score={score}
        total={
          questions.length
        }
        message="your correct answers were added to today's vocabulary task."
        onAgain={
          createPractice
        }
        onBack={onBack}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="practice-content">
        <div className="practice-loading">
          loading practice...
        </div>
      </div>
    );
  }

  return (
    <div className="practice-content">

      <div className="practice-heading">

        <span className="practice-kicker">
          vocabulary practice
        </span>

        <h1>
          build your vocabulary.
        </h1>

        <p>
          learn useful english words
          through quick questions.
        </p>

      </div>

      <div className="quiz-card">

        <div className="quiz-top">

          <span>
            question{" "}
            {questionIndex + 1}
            /
            {questions.length}
          </span>

          <span>
            score {score}
          </span>

        </div>

        <div className="quiz-word">
          {currentQuestion.word}
        </div>

        <h2>
          {currentQuestion.question}
        </h2>

        <div className="quiz-options">

          {currentQuestion.options.map(
            (option) => {
              const isCorrect =
                option ===
                currentQuestion.answer;

              const isSelected =
                option ===
                selectedAnswer;

              let className =
                "quiz-option";

              if (
                answered &&
                isCorrect
              ) {
                className +=
                  " correct";
              }

              if (
                answered &&
                isSelected &&
                !isCorrect
              ) {
                className +=
                  " wrong";
              }

              return (
                <button
                  key={option}
                  className={
                    className
                  }
                  onClick={() =>
                    handleAnswer(
                      option
                    )
                  }
                  disabled={
                    answered
                  }
                >
                  <span>
                    {
                      option
                    }
                  </span>

                  {answered &&
                    isCorrect && (
                      <b>
                        ✓
                      </b>
                    )}

                  {answered &&
                    isSelected &&
                    !isCorrect && (
                      <b>
                        ×
                      </b>
                    )}
                </button>
              );
            }
          )}

        </div>

        {answered && (
          <div className="quiz-footer">

            <p
              className={
                selectedAnswer ===
                currentQuestion.answer
                  ? "answer-correct"
                  : "answer-wrong"
              }
            >
              {selectedAnswer ===
              currentQuestion.answer
                ? "correct! well done."
                : `the correct answer is "${currentQuestion.answer}".`}
            </p>

            <button
              className="practice-primary-button"
              onClick={
                nextQuestion
              }
            >
              {questionIndex <
              questions.length - 1
                ? "next question"
                : "see result"}
            </button>

          </div>
        )}

      </div>

      <button
        className="practice-back-button"
        onClick={onBack}
      >
        ← back to chat
      </button>

    </div>
  );
}

/* =========================================================
   grammar practice
   ========================================================= */

function GrammarPractice({
  user,
  onBack,
}) {
  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    questionIndex,
    setQuestionIndex,
  ] = useState(0);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState("");

  const [
    score,
    setScore,
  ] = useState(0);

  const [
    answered,
    setAnswered,
  ] = useState(false);

  const [
    finished,
    setFinished,
  ] = useState(false);

  const [
    previousQuestionIds,
    setPreviousQuestionIds,
  ] = useState([]);

  function createPractice() {
    const newQuestions =
      createNewQuestionSet(
        grammarBank,
        previousQuestionIds
      );

    setQuestions(
      newQuestions
    );

    setPreviousQuestionIds(
      newQuestions.map(
        (question) =>
          question._sourceIndex
      )
    );

    setQuestionIndex(
      0
    );

    setSelectedAnswer(
      ""
    );

    setScore(0);

    setAnswered(
      false
    );

    setFinished(
      false
    );
  }

  useEffect(() => {
    createPractice();
    // intentionally only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAnswer(
    answer
  ) {
    if (
      answered ||
      !questions[
        questionIndex
      ]
    ) {
      return;
    }

    setSelectedAnswer(
      answer
    );

    setAnswered(
      true
    );

    const currentQuestion =
      questions[
        questionIndex
      ];

    const isCorrect =
      answer ===
      currentQuestion.answer;

    if (isCorrect) {
      setScore(
        (current) =>
          current + 1
      );
    }
  }

  async function nextQuestion() {
    if (
      questionIndex <
      questions.length - 1
    ) {
      setQuestionIndex(
        (current) =>
          current + 1
      );

      setSelectedAnswer(
        ""
      );

      setAnswered(
        false
      );

      return;
    }

    /*
      the score already includes the final answer.
      do not count the final answer twice.
    */

    if (
      score >= 4 &&
      user?.id
    ) {
      await trackGrammarProgress(
        user.id,
        1
      );
    }

    setFinished(true);
  }

  const currentQuestion =
    questions[
      questionIndex
    ];

  if (
    finished &&
    questions.length > 0
  ) {
    const passed =
      score >= 4;

    return (
      <PracticeResult
        title={
          passed
            ? "practice complete"
            : "keep practicing"
        }
        score={score}
        total={
          questions.length
        }
        message={
          passed
            ? "your grammar practice was added to today's grammar task."
            : "you need at least 4 correct answers to complete the grammar task."
        }
        onAgain={
          createPractice
        }
        onBack={onBack}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="practice-content">
        <div className="practice-loading">
          loading practice...
        </div>
      </div>
    );
  }

  return (
    <div className="practice-content">

      <div className="practice-heading">

        <span className="practice-kicker">
          grammar practice
        </span>

        <h1>
          strengthen your grammar.
        </h1>

        <p>
          choose the correct answer
          and improve your english.
        </p>

      </div>

      <div className="quiz-card">

        <div className="quiz-top">

          <span>
            question{" "}
            {questionIndex + 1}
            /
            {questions.length}
          </span>

          <span>
            score {score}
          </span>

        </div>

        <h2 className="grammar-question">
          {currentQuestion.question}
        </h2>

        <div className="quiz-options">

          {currentQuestion.options.map(
            (option) => {
              const isCorrect =
                option ===
                currentQuestion.answer;

              const isSelected =
                option ===
                selectedAnswer;

              let className =
                "quiz-option";

              if (
                answered &&
                isCorrect
              ) {
                className +=
                  " correct";
              }

              if (
                answered &&
                isSelected &&
                !isCorrect
              ) {
                className +=
                  " wrong";
              }

              return (
                <button
                  key={option}
                  className={
                    className
                  }
                  onClick={() =>
                    handleAnswer(
                      option
                    )
                  }
                  disabled={
                    answered
                  }
                >
                  <span>
                    {
                      option
                    }
                  </span>

                  {answered &&
                    isCorrect && (
                      <b>
                        ✓
                      </b>
                    )}

                  {answered &&
                    isSelected &&
                    !isCorrect && (
                      <b>
                        ×
                      </b>
                    )}
                </button>
              );
            }
          )}

        </div>

        {answered && (
          <div className="quiz-footer">

            <p
              className={
                selectedAnswer ===
                currentQuestion.answer
                  ? "answer-correct"
                  : "answer-wrong"
              }
            >
              {selectedAnswer ===
              currentQuestion.answer
                ? "correct! well done."
                : `the correct answer is "${currentQuestion.answer}".`}
            </p>

            <button
              className="practice-primary-button"
              onClick={
                nextQuestion
              }
            >
              {questionIndex <
              questions.length - 1
                ? "next question"
                : "see result"}
            </button>

          </div>
        )}

      </div>

      <div className="grammar-pass-note">
        pass requirement: 4/5
      </div>

      <button
        className="practice-back-button"
        onClick={onBack}
      >
        ← back to chat
      </button>

    </div>
  );
}

/* =========================================================
   result screen
   ========================================================= */

function PracticeResult({
  title,
  score,
  total,
  message,
  onAgain,
  onBack,
}) {
  return (
    <div className="practice-result-page">

      <div className="result-check">
        ✓
      </div>

      <h1>
        {title}
      </h1>

      <p className="result-score">
        you scored{" "}
        <strong>
          {score}/{total}
        </strong>
        .
      </p>

      <p className="result-message">
        {message}
      </p>

      <div className="result-actions">

        <button
          className="practice-primary-button"
          onClick={onAgain}
        >
          practice again
        </button>

        <button
          className="practice-back-button"
          onClick={onBack}
        >
          ← back to chat
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   MAIN PRACTICE
   ========================================================= */

export default function Practice({
  onBack,
  initialMode = "voice",
  user,
  speakingPrompt = "",
  lessonTitle = "",
}) {
  const [
    mode,
    setMode,
  ] = useState(
    initialMode
  );

  useEffect(() => {
    setMode(
      initialMode
    );
  }, [
    initialMode,
  ]);

  const tabs = useMemo(
    () => [
      {
        id: "voice",
        label: "voice practice",
      },
      {
        id: "vocabulary",
        label: "vocabulary",
      },
      {
        id: "grammar",
        label: "grammar",
      },
    ],
    []
  );

  return (
    <div className="practice-page">

      {/* ===================================================
          header
          =================================================== */}

      <header className="practice-header">

        <button
          className="practice-logo"
          onClick={
            onBack
          }
        >
          <span>
            ☺
          </span>

          <strong>
            kuttappu{" "}
            <b>ai</b>
          </strong>
        </button>

        <button
          className="practice-header-back"
          onClick={
            onBack
          }
        >
          ← back
        </button>

      </header>

      {/* ===================================================
          tabs
          =================================================== */}

      <div className="practice-tabs">

        {tabs.map(
          (tab) => (
            <button
              key={
                tab.id
              }
              className={
                mode ===
                tab.id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setMode(
                  tab.id
                )
              }
            >
              {
                tab.label
              }
            </button>
          )
        )}

      </div>

      {/* ===================================================
          practice content
          =================================================== */}

      <main className="practice-main">

        {mode ===
          "voice" && (
          <VoicePractice
            user={user}
            onBack={onBack}
            speakingPrompt={speakingPrompt}
            lessonTitle={lessonTitle}
          />
        )}

        {mode ===
          "vocabulary" && (
          <VocabularyPractice
            user={
              user
            }
            onBack={
              onBack
            }
          />
        )}

        {mode ===
          "grammar" && (
          <GrammarPractice
            user={
              user
            }
            onBack={
              onBack
            }
          />
        )}

      </main>

    </div>
  );
}