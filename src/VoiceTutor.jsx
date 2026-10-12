import { useEffect, useRef, useState } from "react";
import "./VoiceTutor.css";
import kuttappu from "./assets/kuttappu-avatar.png";
import { supabase } from "./supabase";
import { trackSpeakingProgress } from "./taskTracker";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const API_BASE = "https://kuttappu-ai.onrender.com";

export default function VoiceTutor({ user, onBack }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("hello! i'm kuttappu. let's practise speaking english together.");
  const [correction, setCorrection] = useState("");
  const [correctedSentence, setCorrectedSentence] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [scores, setScores] = useState({ grammar: 0, fluency: 0, pronunciation: 0 });
  const [needsRepeat, setNeedsRepeat] = useState(false);
  const [notice, setNotice] = useState("");
  const [conversation, setConversation] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const repeatTargetRef = useRef("");
  const repeatModeRef = useRef(false);
  const transcriptRef = useRef("");
  const nativeListenerRefs = useRef([]);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let mounted = true;

    async function initialiseSpeech() {
      if (Capacitor.isNativePlatform()) {
        try {
          const availability = await SpeechRecognition.available();
          if (mounted) setSupported(Boolean(availability?.available));
        } catch {
          if (mounted) setSupported(false);
        }
      } else {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (mounted) setSupported(Boolean(SR));
      }
    }

    initialiseSpeech();

    return () => {
      mounted = false;
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.stop().catch(() => {});
        nativeListenerRefs.current.forEach((listener) => listener?.remove?.());
        nativeListenerRefs.current = [];
        TextToSpeech.stop().catch(() => {});
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function say(text, thenListen = false) {
    const cleanText = String(text || "").replace(/[*_#]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleanText) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // Android WebView may not expose speechSynthesis. Use native Android TTS.
        try { await TextToSpeech.stop(); } catch {}
        await TextToSpeech.speak({
          text: cleanText,
          lang: "en-IN",
          rate: 0.92,
          pitch: 1.02,
          volume: 1.0,
          category: "ambient",
        });
      } else {
        if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
          setNotice("voice output is not supported in this browser. use chrome or edge.");
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-IN";
        utterance.rate = 0.92;
        utterance.pitch = 1.02;
        await new Promise((resolve) => {
          utterance.onend = resolve;
          utterance.onerror = resolve;
          window.speechSynthesis.speak(utterance);
        });
      }
    } catch (error) {
      console.error("kuttappu text-to-speech failed:", error);
      setNotice("voice output failed. check that android text-to-speech is installed and enabled.");
    }

    if (thenListen && activeRef.current && !busyRef.current) {
      window.setTimeout(() => startListening(), 350);
    }
  }

  async function startListening() {
    if (!activeRef.current || busyRef.current) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await SpeechRecognition.checkPermissions();
        let receivePermission = permission?.speechRecognition;
        if (receivePermission !== "granted") {
          const requested = await SpeechRecognition.requestPermissions();
          receivePermission = requested?.speechRecognition;
        }
        if (receivePermission !== "granted") {
          setNotice("microphone permission is required. allow it in android app settings.");
          setListening(false);
          return;
        }

        const availability = await SpeechRecognition.available();
        if (!availability?.available) {
          setNotice("speech recognition is unavailable. install or enable google speech services on android.");
          setSupported(false);
          setListening(false);
          return;
        }

        transcriptRef.current = "";
        setTranscript("");
        setListening(true);
        setNotice("listening — speak in english");

        // Keep partial results as they arrive. The plugin's start() promise does
        // not reliably return a matches array on Android, so don't depend on it.
        nativeListenerRefs.current.forEach((listener) => listener?.remove?.());
        nativeListenerRefs.current = [];
        const partialListener = await SpeechRecognition.addListener("partialResults", (event) => {
          const spokenText = event?.matches?.[0]?.trim() || "";
          if (!spokenText || !activeRef.current || busyRef.current) return;
          transcriptRef.current = spokenText;
          setTranscript(spokenText);
        });
        const stateListener = await SpeechRecognition.addListener("listeningState", (event) => {
          if (event?.status !== "stopped") return;
          setListening(false);
          const spokenText = transcriptRef.current.trim();
          if (spokenText && activeRef.current && !busyRef.current) {
            processSpeech(spokenText);
          } else if (activeRef.current && !busyRef.current) {
            setNotice("i couldn't hear that clearly. please speak again.");
            window.setTimeout(() => startListening(), 700);
          }
        });
        nativeListenerRefs.current = [partialListener, stateListener];

        await SpeechRecognition.start({
          language: "en-IN",
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
      } catch (error) {
        setListening(false);
        const message = String(error?.message || error || "");
        if (/permission|denied|not allowed/i.test(message)) {
          setNotice("speech recognition permission is blocked. allow microphone and speech recognition in android settings.");
        } else {
          setNotice(`speech recognition failed: ${message || "check microphone access and google speech services"}`);
        }
      }
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setNotice("speech recognition is not supported in this browser. use chrome or edge.");
      return;
    }

    try { recognitionRef.current?.stop(); } catch {}
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let finalTranscript = "";
    recognition.onstart = () => { setListening(true); setNotice("listening — speak in english"); };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalTranscript += `${value} `;
        else interim += value;
      }
      const currentText = (finalTranscript || interim).trim();
      transcriptRef.current = currentText;
      setTranscript(currentText);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setNotice("microphone permission blocked. allow microphone access in your browser settings.");
        setActive(false); activeRef.current = false;
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setNotice(`microphone error: ${event.error}`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      const text = finalTranscript.trim();
      if (text && activeRef.current && !busyRef.current) processSpeech(text);
      else if (activeRef.current && !busyRef.current) window.setTimeout(() => startListening(), 250);
    };
    try { recognition.start(); }
    catch (error) { setListening(false); setNotice(error.message || "could not start microphone"); }
  }

  async function processSpeech(text) {
    if (busyRef.current || !text.trim()) return;
    busyRef.current = true;
    setBusy(true);
    setTranscript(text);
    setNotice("kuttappu is checking your sentence...");
    const nextConversation = [...conversation, { role: "student", text }].slice(-10);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error("your login session expired. log in again.");
      const response = await fetch(`${API_BASE}/api/voice-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ transcript: text, repeatMode: repeatModeRef.current, targetSentence: repeatTargetRef.current, conversation: nextConversation }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `voice tutor server error (${response.status})`);
      const newConversation = [...nextConversation, { role: "kuttappu", text: data.reply || "good try! let's continue." }].slice(-10);
      setConversation(newConversation);
      setReply(data.reply || "good try! let's continue.");
      setCorrection(data.correction || "");
      setCorrectedSentence(data.correctedSentence || "");
      setPronunciation(data.pronunciation || "");
      setScores({ grammar: Number(data.scores?.grammar) || 0, fluency: Number(data.scores?.fluency) || 0, pronunciation: Number(data.scores?.pronunciation) || 0 });
      const repeat = Boolean(data.needsRepeat);
      setNeedsRepeat(repeat);
      repeatModeRef.current = repeat;
      repeatTargetRef.current = repeat ? (data.correctedSentence || repeatTargetRef.current || text) : "";
      setNotice(repeat ? "repeat the corrected sentence after kuttappu" : "your turn — keep the conversation going");
      say([data.reply, repeat ? data.correctedSentence : "", data.pronunciation ? `pronunciation tip: ${data.pronunciation}` : ""].filter(Boolean).join(". "), activeRef.current);
    } catch (error) {
      setNotice(error.message || "could not connect to the voice tutor");
      setReply("sorry, i couldn't connect right now. please try again.");
      say("sorry, i couldn't connect right now. please try again.", activeRef.current);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function startSession() {
    if (!supported) {
      setNotice(isNative
        ? "speech recognition is unavailable on this android device. check that google speech services are installed and enabled."
        : "use chrome or edge and allow microphone access to start voice practice.");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setNotice("please log in again before starting the voice tutor."); return; }
    activeRef.current = true;
    setActive(true);
    setStartedAt(Date.now());
    setNotice("starting your speaking session...");
    say("hello! i'm kuttappu. how are you today? tell me in english.", true);
  }

  async function stopSession() {
    activeRef.current = false;
    setActive(false);
    try { recognitionRef.current?.stop(); } catch {}
    if (Capacitor.isNativePlatform()) {
      try { await SpeechRecognition.stop(); } catch {}
    }
    window.speechSynthesis?.cancel();
    if (Capacitor.isNativePlatform()) { try { await TextToSpeech.stop(); } catch {} }
    nativeListenerRefs.current.forEach((listener) => listener?.remove?.());
    nativeListenerRefs.current = [];
    setListening(false);
    setNotice("speaking session stopped");
    if (user?.id && startedAt) {
      const minutes = Math.floor((Date.now() - startedAt) / 60000);
      if (minutes > 0) await trackSpeakingProgress(user.id, minutes);
    }
    setStartedAt(null);
  }

  function repeatCorrectedSentence() {
    if (!correctedSentence) return;
    repeatModeRef.current = true;
    repeatTargetRef.current = correctedSentence;
    setNotice("listen to the corrected sentence, then repeat it");
    say(`say it again: ${correctedSentence}`, true);
  }

  return (
    <main className="voice-tutor-page">
      <header className="voice-tutor-topbar">
        <button type="button" onClick={onBack}>← back to chat</button>
        <div><span>ai voice coach</span><small>talk, learn, and improve your english</small></div>
      </header>
      <section className="voice-tutor-card">
        <div className={`tutor-orb ${listening ? "listening" : ""} ${busy ? "speaking" : ""}`}><img src={kuttappu} alt="kuttappu english tutor" /></div>
        <span className="voice-tutor-status">{listening ? "listening to you" : busy ? "checking your english" : active ? "conversation active" : "ready to practise"}</span>
        <h1>{active ? "let's speak english together" : "practise english with kuttappu"}</h1>
        <p className="voice-tutor-intro">speak naturally. kuttappu replies by voice, corrects useful mistakes, and asks you to repeat when needed.</p>
        <div className={`heard-card ${listening ? "heard-card-listening" : ""}`} aria-live="polite" aria-atomic="true">
          <span>{listening ? "listening — live transcript" : "your voice transcript"}</span>
          <p>{transcript || (listening ? "speak now… your words will appear here." : "your recognized words will appear here when you speak.")}</p>
        </div>
        <div className="voice-coach-reply"><span>kuttappu says</span><p>{reply}</p></div>
        {correction && <div className="correction-card"><span>correction</span><p>{correction}</p></div>}
        {correctedSentence && <div className="repeat-card"><span>say it again</span><strong>{correctedSentence}</strong><button type="button" onClick={repeatCorrectedSentence}>listen &amp; repeat</button></div>}
        {pronunciation && <div className="pronunciation-card"><span>pronunciation tip</span><p>{pronunciation}</p></div>}
        <div className="voice-score-row"><div><b>{scores.grammar}</b><span>grammar</span></div><div><b>{scores.fluency}</b><span>fluency</span></div><div><b>{scores.pronunciation}</b><span>pronunciation</span></div></div>
        <div className="voice-tutor-actions">{!active ? <button type="button" className="voice-primary" onClick={startSession}>start voice conversation</button> : <button type="button" className="voice-stop" onClick={stopSession}>stop conversation</button>}</div>
        {notice && <p className="voice-tutor-notice" role="status">{notice}</p>}
        {!supported && <p className="voice-tutor-warning">{isNative
          ? "speech recognition is unavailable. check that google speech services are installed and enabled on this android device."
          : "speech recognition is not supported here. open this page in chrome or edge and allow microphone access."}</p>}
      </section>
    </main>
  );
}
