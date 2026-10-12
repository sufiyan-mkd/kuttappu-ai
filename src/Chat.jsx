import { useEffect, useRef, useState } from "react";

import "./Chat.css";

import kuttappu from "./assets/kuttappu-avatar.png";

import { supabase } from "./supabase";

import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

import { Capacitor } from '@capacitor/core';



import {

  trackTaskProgress,

  trackTranslationProgress,

} from "./taskTracker";



/* =========================================================

   menu

   ========================================================= */



const menuItems = [

  { icon: "⌂", label: "Home" },

  { icon: "●", label: "AI Chat" },

  { icon: "文", label: "Translate" },

  { icon: "♩", label: "Voice Practice" },

  { icon: "▣", label: "Grammar" },

  { icon: "▤", label: "Vocabulary" },

  { icon: "▾", label: "Lessons" },

  { icon: "⌁", label: "Progress" },

  { icon: "⚙", label: "Settings" },

];



/* =========================================================

   starter messages

   ========================================================= */



const starterMessages = [

  {

    type: "user",

    malayalam: "എനിക്ക് ഇന്ന് കോളേജിൽ പോകണം.",

    time: "10:24 AM",

  },

  {

    type: "ai",

    title: "Great!",

    english: "I'm going to college today.",

    explanation:

      '"going to" എന്നത് ഇപ്പോൾ തീരുമാനിച്ചിരിക്കുന്ന കാര്യങ്ങൾ പറയാൻ ഉപയോഗിക്കാം.',

    example: "",

    time: "10:24 AM",

    mode: "chat",

  },

  {

    type: "user",

    malayalam: "ഇന്നലെ ഞാൻ സ്കൂളിൽ പോയി.",

    time: "10:25 AM",

  },

  {

    type: "ai",

    title: "Nice!",

    english: "I went to school yesterday.",

    explanation:

      '"went" എന്നത് past tense ആണ്. ഇന്നലെ നടന്ന കാര്യങ്ങൾ പറയാൻ ഇത് ഉപയോഗിക്കാം.',

    example: "",

    time: "10:25 AM",

    mode: "chat",

  },

];



/* =========================================================

   helpers

   ========================================================= */



function getCurrentTime() {

  return new Date().toLocaleTimeString([], {

    hour: "numeric",

    minute: "2-digit",

  });

}



function getTodayDate() {

  const now = new Date();



  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");



  return `${year}-${month}-${day}`;

}



function getMode(tab) {

  if (tab === "Translate") return "translate";

  if (tab === "Explain") return "explain";

  return "chat";

}



function getTabFromMode(mode) {

  if (mode === "translate") return "Translate";

  if (mode === "explain") return "Explain";

  return "Chat";

}



function getAiTitle(mode) {

  if (mode === "translate") return "Translation";

  if (mode === "explain") return "Explanation";

  return "Kuttappu says";

}



/* =========================================================

   valid supabase session

   ========================================================= */



async function getValidSession() {

  try {

    const {

      data: { session },

      error,

    } = await supabase.auth.getSession();



    if (error) {

      console.error("get session failed:", error);

      return null;

    }



    if (!session) {

      console.error("no supabase session found");

      return null;

    }



    const expiresAt = session.expires_at

      ? session.expires_at * 1000

      : 0;



    const now = Date.now();



    if (expiresAt && expiresAt < now + 60000) {

      console.log("refreshing supabase session...");



      const {

        data: { session: refreshedSession },

        error: refreshError,

      } = await supabase.auth.refreshSession();



      if (refreshError) {

        console.error(

          "session refresh failed:",

          refreshError

        );

        return null;

      }



      if (!refreshedSession) {

        console.error(

          "session refresh returned no session"

        );

        return null;

      }



      console.log(

        "session refreshed successfully"

      );



      return refreshedSession;

    }



    return session;

  } catch (error) {

    console.error(

      "get valid session error:",

      error

    );



    return null;

  }

}



/* =========================================================

   current user

   ========================================================= */



async function getCurrentUser() {

  const session = await getValidSession();



  if (!session?.user) {

    console.error(

      "no valid authenticated user"

    );

    return null;

  }



  return session.user;

}



/* =========================================================

   daily task definitions

   ========================================================= */



function createDefaultTasks(userId) {

  const today = getTodayDate();



  return [

    {

      user_id: userId,

      task_type: "conversation",

      title: "ai conversation",

      description:

        "have a conversation with kuttappu using 5 messages.",

      target: 5,

      completed: 0,

      task_date: today,

    },

    {

      user_id: userId,

      task_type: "vocabulary",

      title: "learn new words",

      description:

        "learn 5 new english words.",

      target: 5,

      completed: 0,

      task_date: today,

    },

    {

      user_id: userId,

      task_type: "grammar",

      title: "grammar practice",

      description:

        "complete 1 grammar practice lesson.",

      target: 1,

      completed: 0,

      task_date: today,

    },

    {

      user_id: userId,

      task_type: "translation",

      title: "translation practice",

      description:

        "translate 5 malayalam sentences into english.",

      target: 5,

      completed: 0,

      task_date: today,

    },

    {

      user_id: userId,

      task_type: "speaking",

      title: "speaking practice",

      description:

        "practice speaking english for 2 minutes.",

      target: 2,

      completed: 0,

      task_date: today,

    },

  ];

}



/* =========================================================

   ensure daily tasks

   ========================================================= */



async function ensureDailyTasks() {

  const currentUser = await getCurrentUser();



  if (!currentUser?.id) {

    console.error(

      "cannot create tasks: no authenticated user"

    );

    return false;

  }



  const userId = currentUser.id;

  const today = getTodayDate();



  const {

    data: existingTasks,

    error: checkError,

  } = await supabase

    .from("daily_tasks")

    .select(

      "id, task_type, completed, target, task_date"

    )

    .eq("user_id", userId)

    .eq("task_date", today);



  if (checkError) {

    console.error(

      "daily task check failed:",

      checkError

    );

    return false;

  }



  const existingTypes = new Set(

    (existingTasks || []).map(

      (task) => task.task_type

    )

  );



  const allTasks =

    createDefaultTasks(userId);



  const missingTasks = allTasks.filter(

    (task) =>

      !existingTypes.has(task.task_type)

  );



  if (missingTasks.length === 0) {

    return true;

  }



  const {

    data: insertedTasks,

    error: insertError,

  } = await supabase

    .from("daily_tasks")

    .insert(missingTasks)

    .select("*");



  if (insertError) {

    console.error(

      "daily task insert failed:",

      insertError

    );

    return false;

  }



  console.log(

    "daily tasks created:",

    insertedTasks

  );



  return true;

}



/* =========================================================

   fetch daily tasks

   ========================================================= */



async function fetchDailyTasks() {

  const currentUser = await getCurrentUser();



  if (!currentUser?.id) {

    console.error(

      "cannot load tasks: no authenticated user"

    );

    return [];

  }



  const today = getTodayDate();



  const {

    data,

    error,

  } = await supabase

    .from("daily_tasks")

    .select("*")

    .eq("user_id", currentUser.id)

    .eq("task_date", today)

    .order("created_at", {

      ascending: true,

    });



  if (error) {

    console.error(

      "daily tasks load failed:",

      error

    );

    return [];

  }



  return Array.isArray(data) ? data : [];

}



/* =========================================================

   response parser

   ========================================================= */



function parseResponse(text, mode) {

  const clean = text

    .replace(/\*\*/g, "")

    .replace(/```/g, "")

    .trim();



  if (!clean) {

    return {

      english: "",

      explanation: "",

      example: "",

    };

  }



  if (mode === "translate") {

    const translationMatch = clean.match(

      /TRANSLATION:\s*([\s\S]*?)(?=EXPLANATION:|EXAMPLE:|$)/i

    );



    const explanationMatch = clean.match(

      /EXPLANATION:\s*([\s\S]*?)(?=EXAMPLE:|$)/i

    );



    const exampleMatch = clean.match(

      /EXAMPLE:\s*([\s\S]*)/i

    );



    return {

      english: translationMatch

        ? translationMatch[1].trim()

        : clean,



      explanation: explanationMatch

        ? explanationMatch[1].trim()

        : "",



      example: exampleMatch

        ? exampleMatch[1].trim()

        : "",

    };

  }



  if (mode === "explain") {

    const meaningMatch = clean.match(

      /MEANING:\s*([\s\S]*?)(?=GRAMMAR:|EXAMPLE:|$)/i

    );



    const grammarMatch = clean.match(

      /GRAMMAR:\s*([\s\S]*?)(?=EXAMPLE:|$)/i

    );



    const exampleMatch = clean.match(

      /EXAMPLE:\s*([\s\S]*)/i

    );



    return {

      english: meaningMatch

        ? meaningMatch[1].trim()

        : clean,



      explanation: grammarMatch

        ? grammarMatch[1].trim()

        : "",



      example: exampleMatch

        ? exampleMatch[1].trim()

        : "",

    };

  }



  const englishMatch = clean.match(

    /ENGLISH:\s*([\s\S]*?)(?=EXPLANATION:|$)/i

  );



  const explanationMatch = clean.match(

    /EXPLANATION:\s*([\s\S]*)/i

  );



  return {

    english: englishMatch

      ? englishMatch[1].trim()

      : clean,



    explanation: explanationMatch

      ? explanationMatch[1].trim()

      : "",



    example: "",

  };

}



/* =========================================================

   chat component

   ========================================================= */



export default function Chat({

  onBack,

  onProfile,

  onSettings,

  onProgress,

  onPractice,

  onLessons,

  initialMode = "chat",

  user,

}) {

  const [messages, setMessages] =

    useState(starterMessages);



  const [input, setInput] =

    useState("");



  const [activeTab, setActiveTab] =

    useState(

      getTabFromMode(initialMode)

    );



  const [isLoading, setIsLoading] =

    useState(false);



  const [dailyTasks, setDailyTasks] =

    useState([]);



  const [

    showDailyTasks,

    setShowDailyTasks,

  ] = useState(false);



  const [

    tasksLoading,

    setTasksLoading,

  ] = useState(false);



  const [

    isProfileMenuOpen,

    setIsProfileMenuOpen,

  ] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);


  const [profile, setProfile] = useState({

    full_name: "",

    avatar_url: "",

  });



  const messagesRef = useRef(null);

  // =========================
  // voice chat
  // =========================

  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [continuousVoice, setContinuousVoice] = useState(false);
  const [voiceCoach, setVoiceCoach] = useState(false);
  const voiceTranscriptRef = useRef("");
  const nativePartialListenerRef = useRef(null);
  const nativeStateListenerRef = useRef(null);
  const nativeTranscriptActiveRef = useRef(false);
  const voiceSessionIdRef = useRef(0);
  const voiceActiveRef = useRef(false);



  /* =========================================================

     load user profile

     ========================================================= */



  useEffect(() => {

    let cancelled = false;



    async function loadProfile() {

      if (!user?.id) return;



      const { data, error } = await supabase

        .from("profiles")

        .select("full_name, avatar_url")

        .eq("id", user.id)

        .maybeSingle();



      if (error) {

        console.error("profile load failed:", error);

        return;

      }



      if (!cancelled && data) {

        setProfile({

          full_name: data.full_name || "",

          avatar_url: data.avatar_url || "",

        });

      }

    }



    loadProfile();



    return () => {

      cancelled = true;

    };

  }, [user?.id]);



  /* =========================================================

     load chat history

     ========================================================= */



  useEffect(() => {

    let cancelled = false;



    async function loadHistory() {

      try {

        const session =

          await getValidSession();



        if (!session?.access_token) {

          return;

        }



        const response = await fetch(

          "https://kuttappu-ai.onrender.com/api/chat/history",

          {

            method: "GET",

            headers: {

              Authorization:

                `Bearer ${session.access_token}`,

            },

          }

        );



        if (!response.ok) {

          const errorText =

            await response.text();



          console.error(

            "history load failed:",

            response.status,

            errorText

          );



          return;

        }



        const data =

          await response.json();



        if (

          !cancelled &&

          Array.isArray(data.messages) &&

          data.messages.length > 0

        ) {

          const history =

            data.messages.map(

              (message) => ({

                ...message,

                title:

                  message.type === "ai"

                    ? getAiTitle(

                        message.mode ||

                          "chat"

                      )

                    : undefined,

              })

            );



          setMessages(history);

        }

      } catch (error) {

        console.error(

          "history load error:",

          error

        );

      }

    }



    loadHistory();



    return () => {

      cancelled = true;

    };

  }, []);



  /* =========================================================

     setup daily tasks

     ========================================================= */



  useEffect(() => {

    let cancelled = false;



    async function setupTasks() {

      if (cancelled) return;



      setTasksLoading(true);



      try {

        const session =

          await getValidSession();



        if (!session?.user?.id) {

          console.error(

            "cannot setup tasks: no valid user"

          );

          return;

        }



        await ensureDailyTasks();



        if (cancelled) return;



        const tasks =

          await fetchDailyTasks();



        if (!cancelled) {

          setDailyTasks(tasks);

        }

      } catch (error) {

        console.error(

          "daily task setup error:",

          error

        );

      } finally {

        if (!cancelled) {

          setTasksLoading(false);

        }

      }

    }



    setupTasks();



    return () => {

      cancelled = true;

    };

  }, []);



  /* =========================================================

     refresh tasks

     ========================================================= */



  async function refreshDailyTasks() {

    try {

      const session =

        await getValidSession();



      if (!session?.user?.id) {

        return;

      }



      const tasks =

        await fetchDailyTasks();



      setDailyTasks(tasks);

    } catch (error) {

      console.error(

        "refresh daily tasks error:",

        error

      );

    }

  }



  /* =========================================================
     voice chat
     ========================================================= */

  function stopSpeaking() {
    if (Capacitor.isNativePlatform()) {
      TextToSpeech.stop().catch((error) => console.warn("could not stop native speech:", error));
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageIndex(null);
  }

  function getPreferredKuttappuVoice() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const englishVoices = voices.filter((voice) =>
      /^en(?:-|$)/i.test(voice.lang || "")
    );

    const pool = englishVoices.length ? englishVoices : voices;

    const scoreVoice = (voice) => {
      const name = String(voice.name || "").toLowerCase();
      const lang = String(voice.lang || "").toLowerCase();
      let score = 0;

      // Prefer natural/young-sounding male voice families when the browser exposes them.
      if (/guy|ryan|andrew|daniel|alex|aaron|brian|matthew|mark|thomas|james|george|david/.test(name)) {
        score += 12;
      }

      if (/male/.test(name)) score += 10;
      if (/natural|online/.test(name)) score += 5;

      // Keep Indian English useful for an Indian learner, but don't sacrifice
      // the male/young voice preference when the browser has a better option.
      if (/en-in/.test(lang)) score += 6;
      if (/en-us|en-gb/.test(lang)) score += 3;

      // Avoid commonly exposed female voice names when there are male alternatives.
      if (/female|zira|samantha|susan|hazel|aria|ava|jenny|libby|sonia|emily/.test(name)) {
        score -= 20;
      }

      if (voice.default) score += 1;

      return score;
    };

    return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
  }

  function configureKuttappuUtterance(utterance) {
    const preferredVoice = getPreferredKuttappuVoice();

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || "en-IN";
    } else {
      utterance.lang = "en-IN";
    }

    // Sweet, young, friendly Kuttappu character — avoid the heavy/serious feel.
    utterance.rate = 0.92;
    utterance.pitch = 1.10;
    utterance.volume = 1;

    return utterance;
  }

  async function speakText(text, messageIndex = null) {
    const cleanText = String(text || "")
      .replace(/[*_#]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanText) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await TextToSpeech.stop();
        setSpeakingMessageIndex(messageIndex);
        await TextToSpeech.speak({
          text: cleanText,
          lang: "en-IN",
          rate: 0.92,
          pitch: 1.1,
          volume: 1.0,
          category: "ambient",
        });
      } catch (error) {
        console.error("native Kuttappu voice failed:", error);
        setSpeakingMessageIndex(null);
      } finally {
        setSpeakingMessageIndex(null);
      }
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      console.warn("speech synthesis is not supported in this browser");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (speakingMessageIndex === messageIndex) {
        setSpeakingMessageIndex(null);
        return;
      }
    }

    const utterance = configureKuttappuUtterance(new SpeechSynthesisUtterance(cleanText));
    utterance.onstart = () => setSpeakingMessageIndex(messageIndex);
    utterance.onend = () => setSpeakingMessageIndex(null);
    utterance.onerror = () => setSpeakingMessageIndex(null);
    window.speechSynthesis.speak(utterance);
  }

  function removeNativeVoiceListeners() {
    nativePartialListenerRef.current?.remove();
    nativeStateListenerRef.current?.remove();
    nativePartialListenerRef.current = null;
    nativeStateListenerRef.current = null;
  }

  function stopListening() {
    // Invalidate pending permission/start calls so they cannot restart the mic.
    voiceSessionIdRef.current += 1;
    voiceActiveRef.current = false;
    nativeTranscriptActiveRef.current = false;
    setIsListening(false);
    setInterimTranscript("");

    if (Capacitor.isNativePlatform()) {
      // Ask Android's native recognizer to stop. Do not wait before updating UI.
      SpeechRecognition.stop()
        .catch((error) => {
          console.error("could not stop native speech recognition:", error);
        })
        .finally(() => {
          removeNativeVoiceListeners();
        });
      return;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      // Detach handlers before abort so an old onend cannot change the new state.
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch (error) {
        console.error("could not abort browser speech recognition:", error);
      }
    }
  }

  async function startListening() {
    if (isLoading || typeof window === "undefined") return;

    // Use a ref, not React state, to handle fast taps before React re-renders.
    if (voiceActiveRef.current) {
      stopListening();
      return;
    }

    stopSpeaking();
    const sessionId = voiceSessionIdRef.current + 1;
    voiceSessionIdRef.current = sessionId;
    voiceActiveRef.current = true;
    nativeTranscriptActiveRef.current = true;
    voiceTranscriptRef.current = "";
    setInput("");
    setInterimTranscript("");
    setIsListening(true); // Show live indication immediately, including permission/start.

    const isCurrentSession = () =>
      voiceSessionIdRef.current === sessionId && voiceActiveRef.current;

    // Native speech recognition for the installed Android/iOS app.
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await SpeechRecognition.requestPermissions();
        if (!isCurrentSession()) return;

        if (permission.speechRecognition !== "granted") {
          voiceActiveRef.current = false;
          nativeTranscriptActiveRef.current = false;
          setVoiceSupported(false);
          setIsListening(false);
          setInterimTranscript("microphone permission is required");
          return;
        }

        const { available } = await SpeechRecognition.available();
        if (!isCurrentSession()) return;

        if (!available) {
          voiceActiveRef.current = false;
          nativeTranscriptActiveRef.current = false;
          setVoiceSupported(false);
          setIsListening(false);
          setInterimTranscript("speech recognition is unavailable on this device");
          return;
        }

        setVoiceSupported(true);
        await removeNativeVoiceListeners();
        if (!isCurrentSession()) return;

        nativePartialListenerRef.current = await SpeechRecognition.addListener(
          "partialResults",
          (event) => {
            if (!isCurrentSession() || !nativeTranscriptActiveRef.current) return;
            const transcript = event.matches?.[0]?.trim() || "";
            if (!transcript) return;
            // Android partial results are usually cumulative: replace, don't append.
            voiceTranscriptRef.current = transcript;
            setInput(transcript);
            setInterimTranscript(transcript);
          }
        );

        nativeStateListenerRef.current = await SpeechRecognition.addListener(
          "listeningState",
          (event) => {
            if (voiceSessionIdRef.current !== sessionId) return;
            if (event.status === "started") {
              voiceActiveRef.current = true;
              setIsListening(true);
              setInterimTranscript(voiceTranscriptRef.current || "speak now");
              return;
            }
            if (event.status !== "stopped") return;

            voiceActiveRef.current = false;
            nativeTranscriptActiveRef.current = false;
            setIsListening(false);
            setInterimTranscript("");
            const transcript = voiceTranscriptRef.current.trim();
            removeNativeVoiceListeners();
            if (transcript) setInput(transcript);
          }
        );

        if (!isCurrentSession()) {
          removeNativeVoiceListeners();
          return;
        }

        await SpeechRecognition.start({
          language: "en-IN",
          maxResults: 1,
          partialResults: true,
          popup: false,
        });

        // The state event may arrive before or after this promise resolves.
        if (isCurrentSession()) {
          setIsListening(true);
          setInterimTranscript(voiceTranscriptRef.current || "speak now");
        }
      } catch (error) {
        if (voiceSessionIdRef.current === sessionId) {
          voiceActiveRef.current = false;
          nativeTranscriptActiveRef.current = false;
          setIsListening(false);
          setInterimTranscript("");
          removeNativeVoiceListeners();
        }
        console.error("native speech recognition error:", error);
      }
      return;
    }

    // Browser speech recognition for supported desktop/mobile browsers.
    const BrowserSpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!BrowserSpeechRecognition) {
      voiceActiveRef.current = false;
      setVoiceSupported(false);
      setIsListening(false);
      setInterimTranscript("speech recognition is not supported here");
      return;
    }

    const recognition = new BrowserSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!isCurrentSession()) return;
      setIsListening(true);
      setInterimTranscript(voiceTranscriptRef.current || "speak now");
    };

    recognition.onresult = (event) => {
      if (!isCurrentSession()) return;
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          voiceTranscriptRef.current = `${voiceTranscriptRef.current} ${transcript}`
            .replace(/\s+/g, " ")
            .trim();
        } else {
          interimText += transcript;
        }
      }
      const combined = [voiceTranscriptRef.current, interimText]
        .filter(Boolean)
        .join(" ")
        .trim();
      setInput(combined);
      setInterimTranscript(interimText || combined || "speak now");
    };

    recognition.onerror = (event) => {
      if (voiceSessionIdRef.current !== sessionId) return;
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("speech recognition error:", event.error);
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceSupported(false);
        setInterimTranscript("microphone permission is required");
      } else {
        setInterimTranscript("");
      }
      voiceActiveRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (voiceSessionIdRef.current !== sessionId) return;
      const transcript = voiceTranscriptRef.current.trim();
      voiceActiveRef.current = false;
      setIsListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
      if (transcript) setInput(transcript);
      if (continuousVoice && transcript && !isLoading) {
        voiceTranscriptRef.current = "";
        setInput("");
        handleSend(null, transcript, true);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      if (voiceSessionIdRef.current === sessionId) {
        voiceActiveRef.current = false;
        setIsListening(false);
        setInterimTranscript("");
        recognitionRef.current = null;
      }
      console.error("could not start speech recognition:", error);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (Capacitor.isNativePlatform()) {
      SpeechRecognition.available()
        .then(({ available }) => setVoiceSupported(available))
        .catch((error) => {
          console.error("could not check native speech recognition:", error);
          setVoiceSupported(false);
        });
    } else {
      setVoiceSupported(
        Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
      );
    }

    return () => {
      voiceSessionIdRef.current += 1;
      voiceActiveRef.current = false;
      nativeTranscriptActiveRef.current = false;

      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.error("could not stop browser speech recognition:", error);
      }
      recognitionRef.current = null;

      nativePartialListenerRef.current?.remove();
      nativeStateListenerRef.current?.remove();
      nativePartialListenerRef.current = null;
      nativeStateListenerRef.current = null;

      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.stop().catch((error) => {
          console.error("could not stop native speech recognition:", error);
        });
      }

      window.speechSynthesis?.cancel();
    };
  }, []);

  /* =========================================================

     auto scroll

     ========================================================= */



  useEffect(() => {

    if (!messagesRef.current) {

      return;

    }



    messagesRef.current.scrollTo({

      top: messagesRef.current.scrollHeight,

      behavior: "smooth",

    });

  }, [messages, isLoading]);



  /* =========================================================

     send message

     ========================================================= */



  async function handleSend(event, voiceTranscript = null, isVoiceTurn = false) {

    if (event?.preventDefault) event.preventDefault();



    const value = typeof voiceTranscript === "string" ? voiceTranscript.trim() : input.trim();



    if (!value || isLoading) {

      return;

    }



    const mode = getMode(activeTab);



    const userMessage = {

      type: "user",

      malayalam: value,

      time: getCurrentTime(),

    };



    const updatedMessages = [

      ...messages,

      userMessage,

    ];



    setMessages(updatedMessages);

    setInput("");

    setIsLoading(true);



    const aiMessage = {

      type: "ai",

      title:

        activeTab === "Translate"

          ? "Translation"

          : activeTab === "Explain"

          ? "Explanation"

          : "Kuttappu says",

      english: "",

      explanation: "",

      example: "",

      time: getCurrentTime(),

      mode,

    };



    setMessages((current) => [

      ...current,

      aiMessage,

    ]);



    try {

      const session =

        await getValidSession();



      if (!session?.access_token) {

        throw new Error(

          "your login session has expired. please logout and login again."

        );

      }



      const response = await fetch(

        "https://kuttappu-ai.onrender.com/api/chat",

        {

          method: "POST",



          headers: {

            "Content-Type":

              "application/json",



            Authorization:

              `Bearer ${session.access_token}`,

          },



          body: JSON.stringify({

            messages: updatedMessages,

            mode,

          }),

        }

      );



      if (!response.ok) {

        const errorText =

          await response.text();



        console.error(

          "chat request failed:",

          response.status,

          errorText

        );



        throw new Error(

          `server error: ${response.status}`

        );

      }



      if (!response.body) {

        throw new Error(

          "stream not supported"

        );

      }



      const reader =

        response.body.getReader();



      const decoder =

        new TextDecoder();



      let buffer = "";

      let fullResponse = "";



      while (true) {

        const {

          value,

          done,

        } = await reader.read();



        if (done) {

          break;

        }



        buffer += decoder.decode(

          value,

          { stream: true }

        );



        const events =

          buffer.split("\n\n");



        buffer =

          events.pop() || "";



        for (const event of events) {

          if (

            !event.startsWith("data: ")

          ) {

            continue;

          }



          const data =

            event.slice(6);



          if (data === "[DONE]") {

            continue;

          }



          try {

            const parsed =

              JSON.parse(data);



            if (parsed.error) {

              throw new Error(

                parsed.error

              );

            }



            if (parsed.text) {

              fullResponse +=

                parsed.text;



              const parsedResponse =

                parseResponse(

                  fullResponse,

                  mode

                );



              setMessages(

                (current) => {

                  const updated = [

                    ...current,

                  ];



                  const lastIndex =

                    updated.length - 1;



                  if (

                    updated[lastIndex]

                      ?.type === "ai"

                  ) {

                    updated[lastIndex] = {

                      ...updated[lastIndex],



                      english:

                        parsedResponse.english,



                      explanation:

                        parsedResponse.explanation,



                      example:

                        parsedResponse.example,

                    };

                  }



                  return updated;

                }

              );

            }

      
    } catch (error) {

            console.error(

              "stream parsing error:",

              error

            );

          }

        }

      }



      const finalResponse =

        parseResponse(

          fullResponse,

          mode

        );



      setMessages(

        (current) => {

          const updated = [

            ...current,

          ];



          const lastIndex =

            updated.length - 1;



          if (

            updated[lastIndex]

              ?.type === "ai"

          ) {

            updated[lastIndex] = {

              ...updated[lastIndex],



              english:

                finalResponse.english,



              explanation:

                finalResponse.explanation,



              example:

                finalResponse.example,

            };

          }



          return updated;

        }

      );



      if (isVoiceTurn && continuousVoice) {
        const voiceReply = [
          finalResponse.english,
          voiceCoach ? finalResponse.explanation : "",
        ]
          .filter(Boolean)
          .join(". ");

        if (voiceReply && typeof window !== "undefined" && window.speechSynthesis) {
          setTimeout(() => {
            const utterance = configureKuttappuUtterance(
              new SpeechSynthesisUtterance(voiceReply)
            );

            utterance.onend = () => {
              if (continuousVoice) {
                setTimeout(() => startListening(), 250);
              }
            };

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }, 120);
        }
      }

      /* =====================================================

         task tracking

         ===================================================== */



      const currentUser =

        await getCurrentUser();



      if (currentUser?.id) {

        if (mode === "chat") {

          await trackTaskProgress(

            currentUser.id,

            "conversation",

            1

          );

        }



        if (mode === "translate") {

          await trackTranslationProgress(

            currentUser.id,

            1

          );

        }



        await refreshDailyTasks();

      }

    } catch (error) {

      console.error(

        "chat error:",

        error

      );



      setMessages(

        (current) => {

          const updated = [

            ...current,

          ];



          const lastIndex =

            updated.length - 1;



          if (

            updated[lastIndex]

              ?.type === "ai"

          ) {

            updated[lastIndex] = {

              ...updated[lastIndex],



              english:

                "sorry, i couldn't connect right now.",



              explanation:

                error?.message ||

                "please check your login session and the kuttappu ai backend.",



              example: "",

            };

          }



          return updated;

        }

      );

    } finally {

      setIsLoading(false);

    }

  }



  /* =========================================================

     tab change

     ========================================================= */



  function handleTabChange(tab) {

    if (isLoading) {

      return;

    }



    setActiveTab(tab);

    setInput("");

  }



  /* =========================================================

     sidebar navigation

     ========================================================= */



  function handleMenuClick(label) {

    if (isLoading) {

      return;

    }



    /* home */



    if (label === "Home") {

      if (onBack) {

        onBack();

      }



      return;

    }



    /* ai chat */



    if (label === "AI Chat") {

      handleTabChange("Chat");

      return;

    }



    /* translate */



    if (label === "Translate") {

      handleTabChange("Translate");

      return;

    }



    /* voice */



    if (label === "Voice Practice") {

      if (onPractice) {

        onPractice("voice");

      }



      return;

    }



    /* vocabulary */



    if (label === "Vocabulary") {

      if (onPractice) {

        onPractice("vocabulary");

      }



      return;

    }



    /* grammar */



    if (label === "Grammar") {

      if (onPractice) {

        onPractice("grammar");

      }



      return;

    }



    /* =====================================================

       LESSONS

       ===================================================== */



    if (label === "Lessons") {

      if (onLessons) {

        onLessons();

      }



      return;

    }



    /* progress */



    if (label === "Progress") {

      if (onProgress) {

        onProgress();

      }



      return;

    }



    /* settings */



    if (label === "Settings") {

      if (onSettings) {

        onSettings();

      }



      return;

    }

  }



  /* =========================================================

     logout

     ========================================================= */



  async function handleLogout() {

    if (isLoading) {

      return;

    }



    try {

      const { error } =

        await supabase.auth.signOut();



      if (error) {

        throw error;

      }



      setIsProfileMenuOpen(false);



      if (onBack) {

        onBack();

      }



      window.location.reload();

    } catch (error) {

      console.error(

        "logout error:",

        error

      );

    }

  }



  /* =========================================================

     copy

     ========================================================= */



  async function handleCopy(message) {

    const text = [

      message.english,

      message.explanation,

      message.example,

    ]

      .filter(Boolean)

      .join("\n\n");



    if (!text) {

      return;

    }



    try {

      await navigator.clipboard.writeText(

        text

      );

    } catch (error) {

      console.error(

        "copy error:",

        error

      );

    }

  }



  /* =========================================================

     task count

     ========================================================= */



  async function toggleDailyTasks() {
    const next = !showDailyTasks;
    setShowDailyTasks(next);
    if (!next) return;
    setTasksLoading(true);
    try {
      await ensureDailyTasks();
      const tasks = await fetchDailyTasks();
      setDailyTasks(tasks);
    } catch (error) {
      console.error("today's tasks error:", error);
    } finally {
      setTasksLoading(false);
    }
  }

  const completedTaskCount =

    dailyTasks.filter(

      (task) =>

        Number(task.completed) >=

        Number(task.target)

    ).length;



  /* =========================================================

     ui

     ========================================================= */



  return (

    <div className="chat-page">

      {isMobileSidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="close navigation menu"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* =====================================================
          sidebar
          ===================================================== */}

      <aside className={`chat-sidebar ${isMobileSidebarOpen ? "mobile-sidebar-open" : ""}`}>



        <div className="chat-brand">

          <div className="chat-brand-avatar">

            <img

              src={kuttappu}

              alt="Kuttappu"

            />

          </div>



          <span>

            Kuttappu <b>AI</b>

          </span>

        </div>



        <nav className="chat-navigation">

          {menuItems.map((item) => (

            <button

              key={item.label}

              className={`chat-nav-item ${

                (

                  item.label === "AI Chat" &&

                  activeTab === "Chat"

                ) ||

                (

                  item.label === "Translate" &&

                  activeTab === "Translate"

                )

                  ? "active"

                  : ""

              }`}

              onClick={() => {
                handleMenuClick(item.label);
                setIsMobileSidebarOpen(false);
                setShowDailyTasks(false);
              }}

            >

              <span className="nav-icon">

                {item.icon}

              </span>



              <span>

                {item.label}

              </span>

            </button>

          ))}

        </nav>

        <section className="mobile-sidebar-tasks">
          <button
            type="button"
            className={`mobile-sidebar-tasks-toggle ${showDailyTasks ? "active" : ""}`}
            onClick={toggleDailyTasks}
            aria-expanded={showDailyTasks}
          >
            <span className="mobile-sidebar-task-icon">▤</span>
            <span>today&apos;s tasks</span>
            <span className="mobile-sidebar-task-count">{completedTaskCount}/{dailyTasks.length || 5}</span>
          </button>
          {showDailyTasks && (
            <div className="mobile-sidebar-task-list">
              {tasksLoading ? (
                <p className="mobile-task-message">loading today&apos;s tasks...</p>
              ) : dailyTasks.length === 0 ? (
                <p className="mobile-task-message">no tasks found for today.</p>
              ) : dailyTasks.map((task) => {
                const completed = Number(task.completed) >= Number(task.target);
                return (
                  <div className={`mobile-sidebar-task-item ${completed ? "completed" : ""}`} key={task.id}>
                    <span>{completed ? "✓" : "○"}</span>
                    <div><strong>{task.title}</strong><small>{task.completed}/{task.target}</small></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            profile

            =================================================== */}



        <div className="profile-menu-wrapper">



          <button

            type="button"

            className={`user-profile-card ${

              isProfileMenuOpen

                ? "open"

                : ""

            }`}

            onClick={() =>

              setIsProfileMenuOpen(

                (current) => !current

              )

            }

            aria-expanded={

              isProfileMenuOpen

            }

          >

            <div className="user-profile-avatar">

              {profile.avatar_url ? (

                <img

                  src={profile.avatar_url}

                  alt={profile.full_name || "profile"}

                />

              ) : (

                (

                  profile.full_name ||

                  user?.user_metadata?.full_name ||

                  user?.email ||

                  "u"

                )

                  .charAt(0)

                  .toUpperCase()

              )}

            </div>



            <div className="user-profile-info">

              <strong>

                {profile.full_name ||

                  user?.user_metadata?.full_name ||

                  "kuttappu learner"}

              </strong>



              <span>

                {user?.email || ""}

              </span>

            </div>



            <span className="profile-menu-arrow">

              {isProfileMenuOpen

                ? "⌃"

                : "⌄"}

            </span>

          </button>



          {isProfileMenuOpen && (

            <div className="profile-dropdown">



              <button

                type="button"

                onClick={() => {

                  setIsProfileMenuOpen(

                    false

                  );



                  if (onProfile) {

                    onProfile();

                  }

                }}

              >

                <span>◉</span>

                Profile

              </button>



              <button

                type="button"

                onClick={() => {

                  setIsProfileMenuOpen(

                    false

                  );



                  if (onSettings) {

                    onSettings();

                  }

                }}

              >

                <span>⚙</span>

                Settings

              </button>



              <div className="profile-dropdown-divider" />



              <button

                type="button"

                className="profile-logout"

                onClick={handleLogout}

                disabled={isLoading}

              >

                <span>↪</span>

                Logout

              </button>



            </div>

          )}

        </div>



        {/* ===================================================

            upgrade

            =================================================== */}



        <div className="upgrade-card">



          <div className="upgrade-icon">

            ♛

          </div>



          <strong>

            Upgrade to Pro

          </strong>



          <p>

            Get more lessons,

            <br />

            voice practice & more.

          </p>



          <button>

            Upgrade

          </button>



        </div>

      </aside>



      {/* =====================================================

          main

          ===================================================== */}



      <main className="chat-content">

        <div className="mobile-chat-topbar">
          <button
            type="button"
            className="mobile-hamburger-button"
            aria-label="open navigation menu"
            aria-expanded={isMobileSidebarOpen}
            onClick={() => {
              setIsMobileSidebarOpen((open) => !open);
              setIsMobileMoreOpen(false);
            }}
          >
            <span></span><span></span><span></span>
          </button>
          <div className="mobile-chat-brand">
            <img src={kuttappu} alt="kuttappu" />
            <strong>kuttappu <b>ai</b></strong>
          </div>
          <div className="mobile-more-wrap">
            <button
              type="button"
              className="mobile-more-button"
              aria-label="chat options"
              aria-expanded={isMobileMoreOpen}
              onClick={() => {
                setIsMobileMoreOpen((open) => !open);
                setIsMobileSidebarOpen(false);
              }}
            >⋮</button>
            {isMobileMoreOpen && (
              <div className="mobile-more-menu">
                {["Chat", "Translate", "Explain"].map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => {
                      handleTabChange(tab);
                      setIsMobileMoreOpen(false);
                    }}
                  >{tab === "Chat" ? "ai chat" : tab.toLowerCase()}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
            header

            =================================================== */}



        <header className="chat-header">



          <div>

            <h1>

              {activeTab === "Chat"

                ? "AI Chat"

                : activeTab}

            </h1>



            <p>

              {activeTab === "Chat"

                ? "Chat in Malayalam or English. Kuttappu will help you learn!"

                : activeTab === "Translate"

                ? "Translate naturally between Malayalam and English."

                : "Understand English meaning, grammar and examples."}

            </p>

          </div>



          <div className="chat-header-actions">



            {[

              "Chat",

              "Translate",

              "Explain",

            ].map((tab) => (

              <button

                key={tab}

                className={

                  activeTab === tab

                    ? "active"

                    : ""

                }

                onClick={() =>

                  handleTabChange(tab)

                }

              >

                {tab}

              </button>

            ))}



            {/* =================================================

                today's tasks

                ================================================= */}



            <button

              type="button"

              className={`today-tasks-button ${

                showDailyTasks

                  ? "active"

                  : ""

              }`}

              onClick={toggleDailyTasks}

              aria-expanded={

                showDailyTasks

              }

            >

              today&apos;s tasks

            </button>



            {showDailyTasks && (

              <div className="daily-tasks-popover">



                <div className="daily-tasks-strip">



                  <div className="daily-tasks-heading">



                    <strong>

                      today&apos;s tasks

                    </strong>



                    <span>

                      {completedTaskCount}/

                      {dailyTasks.length || 5}

                      {" "}

                      completed

                    </span>



                  </div>



                  {tasksLoading ? (

                    <div className="daily-tasks-empty">

                      loading today&apos;s tasks...

                    </div>

                  ) : dailyTasks.length === 0 ? (

                    <div className="daily-tasks-empty">

                      no tasks found for today.

                    </div>

                  ) : (

                    <div className="daily-tasks-list">



                      {dailyTasks.map(

                        (task) => {

                          const completed =

                            Number(

                              task.completed

                            ) >=

                            Number(

                              task.target

                            );



                          return (

                            <div

                              key={task.id}

                              className={`daily-task-item ${

                                completed

                                  ? "completed"

                                  : ""

                              }`}

                            >

                              <span className="daily-task-check">

                                {completed

                                  ? "✓"

                                  : "○"}

                              </span>



                              <div>

                                <strong>

                                  {task.title}

                                </strong>



                                <span>

                                  {task.completed}/

                                  {task.target}

                                </span>

                              </div>

                            </div>

                          );

                        }

                      )}



                    </div>

                  )}



                </div>



              </div>

            )}



            <button
              className="more-button"
              type="button"
              aria-label="chat options"
              onClick={() => setIsMobileMoreOpen((open) => !open)}
            >
              ⋮
            </button>



          </div>



        </header>



        {/* ===================================================

            messages

            =================================================== */}



        <section

          className="messages"

          ref={messagesRef}

        >

          {messages.map(

            (message, index) => {



              /* ================= USER ================= */



              if (message.type === "user") {

                return (

                  <div

                    className="message-line user-line"

                    key={index}

                  >

                    <div className="user-message">

                      <p>

                        {message.malayalam}

                      </p>



                      <span>

                        {message.time}

                      </span>

                    </div>



                    <div className="message-avatar user-avatar">

                      <img

                        src={kuttappu}

                        alt="User"

                      />

                    </div>

                  </div>

                );

              }



              /* ================= AI ================= */



              return (

                <div

                  className="message-line ai-line"

                  key={index}

                >

                  <div className="message-avatar">

                    <img

                      src={kuttappu}

                      alt="Kuttappu"

                    />

                  </div>



                  <div className="ai-message">



                    <strong>

                      {message.title}

                    </strong>



                    {message.english && (

                      <>

                        <div className="ai-section-label">

                          {message.mode ===

                          "translate"

                            ? "Translation"

                            : message.mode ===

                              "explain"

                            ? "Meaning"

                            : "English"}

                        </div>



                        <div className="ai-english">

                          {message.english}

                        </div>

                      </>

                    )}



                    {message.explanation && (

                      <>

                        <div className="ai-section-label explanation-label">

                          {message.mode ===

                          "explain"

                            ? "Grammar"

                            : "Explanation"}

                        </div>



                        <p className="ai-explanation">

                          {message.explanation}

                        </p>

                      </>

                    )}



                    {message.example && (

                      <>

                        <div className="ai-section-label explanation-label">

                          Example

                        </div>



                        <div className="ai-english">

                          {message.example}

                        </div>

                      </>

                    )}



                    {!message.english &&

                      !message.explanation &&

                      !message.example &&

                      isLoading &&

                      index ===

                        messages.length - 1 && (

                        <div className="ai-english">

                          typing...

                        </div>

                      )}



                    <div className="ai-message-bottom">



                      <span>

                        {message.time}

                      </span>



                      <div className="message-tools">



                        <button
                          type="button"
                          className={
                            speakingMessageIndex === index ? "is-speaking" : ""
                          }
                          title={
                            speakingMessageIndex === index
                              ? "stop listening"
                              : "listen"
                          }
                          onClick={() => {
                            if (speakingMessageIndex === index) {
                              stopSpeaking();
                              return;
                            }

                            const textToSpeak = [
                              message.english,
                              message.example,
                            ]
                              .filter(Boolean)
                              .join(". ");

                            speakText(textToSpeak, index);
                          }}
                        >
                          {speakingMessageIndex === index ? (
                            <span className="voice-stop-icon" aria-hidden="true">
                              <span />
                            </span>
                          ) : (
                            <svg
                              className="premium-speaker-icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
                              <path d="M16 9.5a4 4 0 0 1 0 5" />
                              <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
                            </svg>
                          )}
                        </button>



                        <button

                          type="button"

                          title="copy"

                          onClick={() =>

                            handleCopy(

                              message

                            )

                          }

                        >

                          □

                        </button>



                      </div>



                    </div>

                  </div>

                </div>

              );

            }

          )}

        </section>



        {/* ===================================================

            input

            =================================================== */}



        <style>{`
          .voice-input-button.recording {
            color: #ffffff !important;
            background: #0f9f6e !important;
            border-color: #0f9f6e !important;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, .13);
          }
          .voice-input-button.recording .voice-stop-icon span {
            display: block;
            width: 8px;
            height: 8px;
            border-radius: 2px;
            background: currentColor;
          }
          .voice-status-premium .voice-status-dot {
            animation: kuttappuVoicePulse 1.35s ease-in-out infinite;
          }
          @keyframes kuttappuVoicePulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,.12); transform: scale(1); }
            50% { box-shadow: 0 0 0 6px rgba(16,185,129,.05); transform: scale(1.12); }
          }
        `}</style>

        <div className="chat-bottom">



          <form

            className="message-input"

            onSubmit={handleSend}

          >

            <input

              value={input}

              onChange={(event) =>

                setInput(

                  event.target.value

                )

              }

              placeholder={

                activeTab === "Translate"

                  ? "Type Malayalam or English to translate..."

                  : activeTab === "Explain"

                  ? "Type an English sentence to explain..."

                  : "Type in Malayalam or English..."

              }

              disabled={isLoading}

            />



            <button
              type="button"
              className={`input-action voice-input-button ${
                isListening ? "recording" : ""
              }`}
              disabled={isLoading || !voiceSupported}
              title={
                !voiceSupported
                  ? "speech recognition unavailable"
                  : isListening
                  ? "stop voice input"
                  : "start voice input"
              }
              aria-label={
                isListening ? "stop voice input" : "start voice input"
              }
              onClick={startListening}
            >
              {isListening ? (
                <span className="voice-stop-icon" aria-hidden="true">
                  <span />
                </span>
              ) : (
                <svg
                  className="premium-mic-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Z" />
                  <path d="M18.5 10.5v.5a6.5 6.5 0 0 1-13 0v-.5" />
                  <path d="M12 17.5V21" />
                  <path d="M8.5 21h7" />
                </svg>
              )}
            </button>

            <button

              type="submit"

              className="send-button"

              disabled={

                !input.trim() ||

                isLoading

              }

            >

              ↑

            </button>

          </form>

          {isListening && (
            <div
              className="voice-status voice-status-premium"
              role="status"
              aria-live="polite"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                margin: "8px 4px 0",
                padding: "9px 12px",
                borderRadius: "14px",
                border: "1px solid rgba(16, 185, 129, 0.22)",
                background: "linear-gradient(135deg, rgba(16,185,129,.10), rgba(16,185,129,.04))",
                color: "#087f5b",
                fontSize: "12px",
                minWidth: 0,
              }}
            >
              <span
                className="voice-status-dot"
                style={{
                  display: "inline-block",
                  flex: "0 0 8px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 0 4px rgba(16,185,129,.13)",
                }}
              />
              <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {voiceTranscriptRef.current || interimTranscript
                  ? `hearing: ${interimTranscript || voiceTranscriptRef.current}`
                  : "listening — speak now"}
              </span>
              <button
                type="button"
                onClick={stopListening}
                style={{
                  border: 0,
                  borderRadius: "9px",
                  padding: "6px 10px",
                  background: "#087f5b",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                stop
              </button>
            </div>
          )}

          {!voiceSupported && (
            <p className="voice-support-note">
              voice input is unavailable. check microphone permission and speech recognition service, then reopen the app.
            </p>
          )}

          <p className="chat-note">

            Kuttappu AI can make mistakes.

            Check important information.

          </p>



        </div>

      </main>

    </div>

  );

}