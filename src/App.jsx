import { useEffect, useState } from "react";

import "./App.css";



import Chat from "./Chat";

import Profile from "./Profile";

import Settings from "./Settings";

import Progress from "./Progress";

import Practice from "./Practice";

import Lessons from "./Lessons";

import VoiceTutor from "./VoiceTutor";



import heroArt from "./assets/kuttappu-hero-art.png";
import kuttappuAvatar from "./assets/kuttappu-avatar.png";



import { supabase } from "./supabase";

import Login from "./Login";

import Signup from "./Signup";



const features = [

  {

    icon: "文A",

    title: (

      <>

        Malayalam to

        <br />

        English

      </>

    ),

    tone: "blue",

    mode: "translate",

  },

  {

    icon: "●",

    title: "AI Conversation",

    tone: "sky",

    bubble: true,

    mode: "chat",

  },

  {

    icon: "▣",

    title: "Grammar & Vocabulary",

    tone: "purple",

    mode: "explain",

  },

  {

    icon: "♩",

    title: "Voice Practice",

    tone: "orange",

    mode: "voice",

  },

  {

    icon: "♙",

    title: "Personalised Learning",

    tone: "green",

    mode: "chat",

  },

  {

    icon: "▥",

    title: "Track Your Progress",

    tone: "gold",

    mode: "chat",

  },

];



function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <img
        className="brand-avatar"
        src={kuttappuAvatar}
        alt=""
      />
    </div>
  );
}



function App() {

  const [session, setSession] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [authPage, setAuthPage] = useState("login");



  const [page, setPage] = useState("home");

  const [chatMode, setChatMode] = useState("chat");

  const [practiceMode, setPracticeMode] = useState("voice");



  useEffect(() => {

    const getSession = async () => {

      const {

        data: { session },

      } = await supabase.auth.getSession();



      setSession(session);

      setAuthLoading(false);

    };



    getSession();



    const {

      data: { subscription },

    } = supabase.auth.onAuthStateChange((_event, session) => {

      setSession(session);

    });



    return () => {

      subscription.unsubscribe();

    };

  }, []);



  /* =========================

     navigation

     ========================= */



  const openChat = (mode = "chat") => {

    setChatMode(mode);

    setPage("chat");

  };



  const openPractice = (mode = "voice") => {

    /*

      voice → real ai voice tutor

      grammar/vocabulary → normal practice page

    */



    if (mode === "voice") {

      setPage("voice-tutor");

      return;

    }



    setPracticeMode(mode);

    setPage("practice");

  };



  const openVoiceTutor = () => {

    setPage("voice-tutor");

  };



  const openLessons = () => {

    setPage("lessons");

  };



  const openProfile = () => {

    setPage("profile");

  };



  const openSettings = () => {

    setPage("settings");

  };



  const openProgress = () => {

    setPage("progress");

  };



  /* =========================

     logout

     ========================= */



  const handleLogout = async () => {

    const { error } = await supabase.auth.signOut();



    if (error) {

      console.error("logout error:", error.message);

      return;

    }



    setSession(null);

    setPage("home");

    setChatMode("chat");

    setPracticeMode("voice");

    setAuthPage("login");

  };



  /* =========================

     auth loading

     ========================= */



  if (authLoading) {

    return (

      <div className="auth-loading">

        loading kuttappu...

      </div>

    );

  }



  /* =========================

     authentication

     ========================= */



  if (!session) {

    if (authPage === "signup") {

      return (

        <Signup

          onShowLogin={() => setAuthPage("login")}

        />

      );

    }



    return (

      <Login

        onLogin={(user) => {

          setSession({ user });

        }}

        onShowSignup={() => setAuthPage("signup")}

      />

    );

  }



  /* =========================

     lessons

     ========================= */



  if (page === "lessons") {

    return (

      <Lessons

        onBack={() => setPage("home")}

        user={session.user}

      />

    );

  }



  /* =========================

     profile

     ========================= */



  if (page === "profile") {

    return (

      <Profile

        onBack={() => setPage("chat")}

      />

    );

  }



  /* =========================

     settings

     ========================= */



  if (page === "settings") {

    return (

      <Settings

        onBack={() => setPage("chat")}

        onLogout={handleLogout}

      />

    );

  }



  /* =========================

     progress

     ========================= */



  if (page === "progress") {

    return (

      <Progress

        onBack={() => setPage("chat")}

      />

    );

  }



  /* =========================

     normal practice

     ========================= */



  if (page === "practice") {

    return (

      <Practice

        onBack={() => setPage("chat")}

        initialMode={practiceMode}

        user={session.user}

      />

    );

  }



  /* =========================

     ai voice tutor

     ========================= */



  if (page === "voice-tutor") {

    return (

      <VoiceTutor

        user={session.user}

        onBack={() => setPage("chat")}

      />

    );

  }



  /* =========================

     chat

     ========================= */



  if (page === "chat") {

    return (

      <Chat

        onBack={() => setPage("home")}

        onProfile={openProfile}

        onSettings={openSettings}

        onProgress={openProgress}

        onPractice={openPractice}

        onLessons={openLessons}

        initialMode={chatMode}

        user={session.user}

      />

    );

  }



  /* =========================

     home

     ========================= */



  return (

    <main

      className="page-shell"

      id="home"

    >

      {/* =========================

          navbar

          ========================= */}



      <header className="topbar">

        <button

          className="brand"

          onClick={() => setPage("home")}

          aria-label="Kuttappu AI home"

        >

          <BrandMark />



          <span>

            Kuttappu <b>AI</b>

          </span>

        </button>



        <nav

          className="nav-links"

          aria-label="Main navigation"

        >

          <a href="#home">

            Home

          </a>



          <button onClick={openLessons}>

            Learn

          </button>



          <button

            onClick={() => openChat("chat")}

          >

            Practice

          </button>



          <a href="#tools">

            Tools

          </a>



          <a href="#pricing">

            Pricing

          </a>

        </nav>



        <div className="nav-actions">

          <button

            className="login-button"

            onClick={handleLogout}

          >

            Logout

          </button>



          <button

            className="start-button nav-start"

            onClick={() => openChat("chat")}

          >

            Get Started <span>→</span>

          </button>

        </div>

      </header>



      {/* =========================

          hero

          ========================= */}



      <section

        className="hero-card"

        aria-labelledby="hero-title"

      >

        <div className="hero-copy">

          <div className="eyebrow">

            <span className="eyebrow-dot" />

            YOUR PERSONAL AI ENGLISH TUTOR

          </div>



          <h1 id="hero-title">

            മലയാളത്തിൽ തുടങ്ങാം,

            <br />

            <span>

              English-ൽ മുന്നേറാം!

            </span>

          </h1>



          <p className="hero-description">

            Your friendly AI English teacher.

            Translate, learn, practise,

            <br className="desktop-break" />

            and speak confidently — in your own

            language.

          </p>



          <button

            className="start-button hero-start"

            onClick={() => openChat("chat")}

          >

            Start Learning Free <span>→</span>

          </button>



          <div className="trust-line">

            <span>✓</span>

            Friendly learning

            <i />

            Malayalam support

            <i />

            Anytime

          </div>



          {/* =========================

              feature cards

              ========================= */}



          <div

            className="feature-grid"

            id="tools"

          >

            {features.map(

              (feature, index) => (

                <button

                  className="feature"

                  key={index}

                  onClick={() => {

                    if (

                      feature.mode ===

                      "voice"

                    ) {

                      openVoiceTutor();

                    } else {

                      openChat(

                        feature.mode

                      );

                    }

                  }}

                >

                  <span

                    className={`feature-icon ${

                      feature.tone

                    } ${

                      feature.bubble

                        ? "chat-icon"

                        : ""

                    }`}

                  >

                    {feature.icon}

                  </span>



                  <span className="feature-label">

                    {feature.title}

                  </span>

                </button>

              )

            )}

          </div>

        </div>



        {/* =========================

            hero visual

            ========================= */}



        <div

          className="hero-visual"

          aria-label="Kuttappu, your AI English tutor"

        >

          <img

            src={heroArt}

            alt="Kuttappu smiling in a white hoodie, holding a green English learning book"

          />

        </div>

      </section>



      {/* =========================

          learn section

          ========================= */}



      <section

        className="learn-section"

        id="learn"

      >

        <p className="section-kicker">

          LEARN YOUR WAY

        </p>



        <h2>

          Everything you need to{" "}

          <span>grow.</span>

        </h2>



        <p className="section-description">

          Learn English at your own pace

          with your personal AI tutor.

        </p>



        <button

          className="start-button"

          onClick={openLessons}

        >

          Explore Lessons <span>→</span>

        </button>

      </section>



      <div

        className="anchor-placeholder"

        id="practice"

      />



      <div

        className="anchor-placeholder"

        id="pricing"

      />

    </main>

  );

}



export default App;
