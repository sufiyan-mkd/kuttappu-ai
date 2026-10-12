import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// GEMINI
// =====================================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing.");
}

// =====================================================
// SUPABASE
// =====================================================

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    "❌ Supabase environment variables are missing."
  );
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "Kuttappu AI backend is running 🚀",
  });
});

// =====================================================
// AUTHENTICATED SUPABASE CLIENT
// =====================================================

async function getAuthenticatedUser(req) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader) {
      return {
        user: null,
        supabase: null,
        error: "Authentication required.",
      };
    }

    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return {
        user: null,
        supabase: null,
        error: "Invalid authorization header.",
      };
    }

    const token = authHeader
      .replace(/^Bearer\s+/i, "")
      .trim();

    if (!token) {
      return {
        user: null,
        supabase: null,
        error: "Authentication token is missing.",
      };
    }

    if (!supabaseUrl || !supabasePublishableKey) {
      return {
        user: null,
        supabase: null,
        error: "Supabase environment variables are missing.",
      };
    }

    // Create a request-scoped Supabase client using the
    // access token sent by the logged-in browser.
    const authenticatedSupabase = createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // IMPORTANT:
    // Pass the token directly to getUser().
    // This validates the browser's Supabase access token.
    const {
      data: { user },
      error,
    } = await authenticatedSupabase.auth.getUser(token);

    if (error) {
      console.error(
        "❌ Supabase authentication failed:",
        error.message
      );

      return {
        user: null,
        supabase: null,
        error: "Invalid or expired authentication.",
      };
    }

    if (!user) {
      return {
        user: null,
        supabase: null,
        error: "Authenticated user not found.",
      };
    }

    return {
      user,
      supabase: authenticatedSupabase,
      error: null,
    };
  } catch (error) {
    console.error(
      "❌ Authentication check failed:",
      error
    );

    return {
      user: null,
      supabase: null,
      error: "Authentication check failed.",
    };
  }
}

// =====================================================
// GET USER MEMORIES
// =====================================================

async function getMemories(
  supabase,
  userId
) {
  const {
    data,
    error,
  } = await supabase
    .from("user_memories")
    .select(
      "memory_key, memory_value"
    )
    .eq("user_id", userId);

  if (error) {
    console.error(
      "❌ Memory read error:",
      error.message
    );

    return [];
  }

  return data || [];
}

// =====================================================
// SAVE MEMORY
// =====================================================

async function saveMemory(
  supabase,
  userId,
  memoryKey,
  memoryValue
) {
  const {
    error,
  } = await supabase
    .from("user_memories")
    .upsert(
      {
        user_id: userId,
        memory_key: memoryKey,
        memory_value: memoryValue,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "user_id,memory_key",
      }
    );

  if (error) {
    console.error(
      "❌ Memory save error:",
      error.message
    );

    return false;
  }

  return true;
}

// =====================================================
// DETECT SIMPLE MEMORIES
// =====================================================

function extractMemories(messages) {
  const memories = [];

  const userMessages =
    messages.filter(
      (message) =>
        message.type === "user"
    );

  for (const message of userMessages) {
    const text = (
      message.malayalam || ""
    ).trim();

    if (!text) continue;

    // ---------------------------------------------
    // my name is arshid
    // ---------------------------------------------

    const myNameMatch =
      text.match(
        /\bmy name is\s+([a-zA-Z][a-zA-Z .'-]{1,40})/i
      );

    if (myNameMatch) {
      memories.push({
        key: "name",
        value:
          myNameMatch[1].trim(),
      });

      continue;
    }

    // ---------------------------------------------
    // i am arshid
    // ---------------------------------------------

    const iAmMatch =
      text.match(
        /^\s*i am\s+([a-zA-Z][a-zA-Z .'-]{1,40})\s*[.!?]?\s*$/i
      );

    if (iAmMatch) {
      memories.push({
        key: "name",
        value:
          iAmMatch[1].trim(),
      });

      continue;
    }

    // ---------------------------------------------
    // i'm arshid
    // ---------------------------------------------

    const imMatch =
      text.match(
        /^\s*i['’]m\s+([a-zA-Z][a-zA-Z .'-]{1,40})\s*[.!?]?\s*$/i
      );

    if (imMatch) {
      memories.push({
        key: "name",
        value:
          imMatch[1].trim(),
      });
    }
  }

  return memories;
}

// =====================================================
// SAVE CHAT MESSAGE
// =====================================================

async function saveChatMessage(
  supabase,
  userId,
  message
) {
  const {
    error,
  } = await supabase
    .from("chat_messages")
    .insert({
      user_id: userId,
      type: message.type,
      mode: message.mode || "chat",
      malayalam:
        message.malayalam || "",
      english:
        message.english || "",
      explanation:
        message.explanation || "",
      example:
        message.example || "",
    });

  if (error) {
    console.error(
      "❌ Chat history save error:",
      error.message
    );

    return false;
  }

  return true;
}

// =====================================================
// GET CHAT HISTORY
// =====================================================

app.get(
  "/api/chat/history",
  async (req, res) => {
    try {
      const {
        user,
        supabase,
        error: authError,
      } = await getAuthenticatedUser(
        req
      );

      if (!user || authError) {
        return res.status(401).json({
          error:
            authError ||
            "Authentication required.",
        });
      }

      const {
        data,
        error,
      } = await supabase
        .from("chat_messages")
        .select(
          `
          id,
          type,
          mode,
          malayalam,
          english,
          explanation,
          example,
          created_at
          `
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        console.error(
          "❌ History load error:",
          error.message
        );

        return res.status(500).json({
          error:
            "Could not load chat history.",
        });
      }

      const messages =
        (data || []).map(
          (message) => ({
            id: message.id,

            type: message.type,

            mode:
              message.mode || "chat",

            malayalam:
              message.malayalam || "",

            english:
              message.english || "",

            explanation:
              message.explanation || "",

            example:
              message.example || "",

            time: new Date(
              message.created_at
            ).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
          })
        );

      return res.json({
        messages,
      });
    } catch (error) {
      console.error(
        "❌ History error:",
        error
      );

      return res.status(500).json({
        error:
          "Could not load chat history.",
      });
    }
  }
);

// =====================================================
// CHAT
// =====================================================

app.post(
  "/api/chat",
  async (req, res) => {
    let responseStarted = false;

    try {
      const {
        messages,
        mode = "chat",
      } = req.body;

      // =================================================
      // VALIDATE
      // =================================================

      if (
        !Array.isArray(messages) ||
        messages.length === 0
      ) {
        return res.status(400).json({
          error:
            "Messages are required.",
        });
      }

      // =================================================
      // AUTH
      // =================================================

      const {
        user,
        supabase,
        error: authError,
      } = await getAuthenticatedUser(
        req
      );

      if (!user || authError) {
        return res.status(401).json({
          error:
            authError ||
            "Authentication required.",
        });
      }

      // =================================================
      // GET CURRENT USER MESSAGE
      // =================================================

      const latestUserMessage =
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.type === "user"
          );

      if (!latestUserMessage) {
        return res.status(400).json({
          error:
            "User message is required.",
        });
      }

      // =================================================
      // SAVE USER MESSAGE
      // =================================================

      // Save the incoming message and load memories concurrently to reduce
      // pre-generation latency without changing the existing chat workflow.
      const [, loadedMemories] = await Promise.all([
        saveChatMessage(supabase, user.id, {
          type: "user",
          mode,
          malayalam: latestUserMessage.malayalam || "",
          english: "",
          explanation: "",
          example: "",
        }),
        getMemories(supabase, user.id),
      ]);

      let memories = loadedMemories;

      // =================================================
      // DETECT + SAVE NEW MEMORY
      // =================================================

      const detectedMemories =
        extractMemories(messages);

      for (
        const memory of detectedMemories
      ) {
        const saved =
          await saveMemory(
            supabase,
            user.id,
            memory.key,
            memory.value
          );

        if (saved) {
          const existingIndex =
            memories.findIndex(
              (item) =>
                item.memory_key ===
                memory.key
            );

          if (existingIndex >= 0) {
            memories[
              existingIndex
            ].memory_value =
              memory.value;
          } else {
            memories.push({
              memory_key:
                memory.key,
              memory_value:
                memory.value,
            });
          }
        }
      }

      // =================================================
      // MEMORY TEXT
      // =================================================

      const memoryText =
        memories.length > 0
          ? memories
              .map(
                (memory) =>
                  `${memory.memory_key}: ${memory.memory_value}`
              )
              .join("\n")
          : "No saved memories yet.";

      // =================================================
      // RECENT CONVERSATION
      // =================================================

      const conversation =
        messages
          .slice(-12)
          .map((message) => {
            const role =
              message.type ===
              "user"
                ? "Student"
                : "Kuttappu";

            const text =
              message.type ===
              "user"
                ? message.malayalam
                : message.english;

            return `${role}: ${text}`;
          })
          .join("\n");

      let instructions = "";

      // =================================================
      // CHAT MODE
      // =================================================

      if (mode === "chat") {
        instructions = `
You are Kuttappu, a friendly AI English teacher for Malayalam-speaking beginners.

Student memories:

${memoryText}

Recent conversation:

${conversation}

Continue the conversation naturally.

Your job:
- Understand Malayalam, Manglish and English.
- Remember the student's saved information when relevant.
- Help the student learn natural everyday English.
- Correct English mistakes gently.
- Explain grammar simply in Malayalam.
- Keep answers short and useful.

For translation-type questions use:

ENGLISH:
[natural English sentence]

EXPLANATION:
[short Malayalam explanation]

For normal English-learning questions use:

ENGLISH:
[short useful answer]

EXPLANATION:
[short Malayalam explanation]

Rules:
- No markdown.
- No ** symbols.
- No emojis.
- No unnecessary greetings.
- No long paragraphs.
- Use natural everyday English.
- Keep explanations beginner-friendly.
`;
      }

      // =================================================
      // TRANSLATE MODE
      // =================================================

      if (mode === "translate") {
        instructions = `
You are Kuttappu Translate, an English learning translator for Malayalam-speaking students.

Student memories:

${memoryText}

Student's recent conversation:

${conversation}

Translate the student's latest message.

If the input is Malayalam:
translate it into natural everyday English.

If the input is English:
translate it into natural Malayalam.

Use EXACTLY this format:

TRANSLATION:
[natural translation]

EXPLANATION:
[one short Malayalam explanation]

EXAMPLE:
[one simple example]

Rules:
- No markdown.
- No ** symbols.
- No emojis.
- Do not add unnecessary information.
- Do not give multiple translations unless necessary.
- Prefer natural everyday language.
- Keep the explanation short.
`;
      }

      // =================================================
      // EXPLAIN MODE
      // =================================================

      if (mode === "explain") {
        instructions = `
You are Kuttappu, a friendly English teacher.

Student memories:

${memoryText}

Recent conversation:

${conversation}

Explain the student's latest message clearly for a Malayalam-speaking beginner.

Use EXACTLY this format:

MEANING:
[simple Malayalam meaning]

GRAMMAR:
[short Malayalam grammar explanation]

EXAMPLE:
[one simple English example]

Rules:
- No markdown.
- No ** symbols.
- No emojis.
- Keep everything short.
- Use simple Malayalam.
- Focus on practical English learning.
`;
      }

      // =================================================
      // START GEMINI STREAM
      // =================================================

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is missing.",
        });
      }

      // Start the SSE response before waiting for Gemini's first token so
      // the client can enter its streaming state immediately.
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Access-Control-Allow-Origin", "*");
      responseStarted = true;
      if (typeof res.flushHeaders === "function") res.flushHeaders();
      res.write(": connected\\n\\n");

      const stream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash-lite",
        contents: instructions,
      });

      // =================================================
      // STREAM GEMINI RESPONSE
      // =================================================

      let fullResponse = "";

      for await (
        const chunk of stream
      ) {
        const text =
          chunk.text || "";

        if (!text) continue;

        fullResponse += text;

        res.write(
          `data: ${JSON.stringify({
            text,
          })}\n\n`
        );
      }

      // =================================================
      // SAVE AI MESSAGE
      // =================================================

      let english = "";
      let explanation = "";
      let example = "";

      const cleanResponse =
        fullResponse
          .replace(/\*\*/g, "")
          .replace(/```/g, "")
          .trim();

      // =================================================
      // PARSE CHAT
      // =================================================

      if (mode === "chat") {
        const englishMatch =
          cleanResponse.match(
            /ENGLISH:\s*([\s\S]*?)(?=EXPLANATION:|$)/i
          );

        const explanationMatch =
          cleanResponse.match(
            /EXPLANATION:\s*([\s\S]*)/i
          );

        english =
          englishMatch
            ? englishMatch[1].trim()
            : cleanResponse;

        explanation =
          explanationMatch
            ? explanationMatch[1].trim()
            : "";
      }

      // =================================================
      // PARSE TRANSLATE
      // =================================================

      if (mode === "translate") {
        const translationMatch =
          cleanResponse.match(
            /TRANSLATION:\s*([\s\S]*?)(?=EXPLANATION:|EXAMPLE:|$)/i
          );

        const explanationMatch =
          cleanResponse.match(
            /EXPLANATION:\s*([\s\S]*?)(?=EXAMPLE:|$)/i
          );

        const exampleMatch =
          cleanResponse.match(
            /EXAMPLE:\s*([\s\S]*)/i
          );

        english =
          translationMatch
            ? translationMatch[1].trim()
            : cleanResponse;

        explanation =
          explanationMatch
            ? explanationMatch[1].trim()
            : "";

        example =
          exampleMatch
            ? exampleMatch[1].trim()
            : "";
      }

      // =================================================
      // PARSE EXPLAIN
      // =================================================

      if (mode === "explain") {
        const meaningMatch =
          cleanResponse.match(
            /MEANING:\s*([\s\S]*?)(?=GRAMMAR:|EXAMPLE:|$)/i
          );

        const grammarMatch =
          cleanResponse.match(
            /GRAMMAR:\s*([\s\S]*?)(?=EXAMPLE:|$)/i
          );

        const exampleMatch =
          cleanResponse.match(
            /EXAMPLE:\s*([\s\S]*)/i
          );

        english =
          meaningMatch
            ? meaningMatch[1].trim()
            : cleanResponse;

        explanation =
          grammarMatch
            ? grammarMatch[1].trim()
            : "";

        example =
          exampleMatch
            ? exampleMatch[1].trim()
            : "";
      }

      // =================================================
      // SAVE AI RESPONSE TO HISTORY
      // =================================================

      await saveChatMessage(
        supabase,
        user.id,
        {
          type: "ai",
          mode,
          malayalam: "",
          english,
          explanation,
          example,
        }
      );

      // =================================================
      // FINISH STREAM
      // =================================================

      res.write(
        "data: [DONE]\n\n"
      );

      res.end();
    } catch (error) {
      console.error(
        "❌ Kuttappu Error:",
        error
      );

      if (!responseStarted) {
        return res.status(500).json({
          error:
            error?.message ||
            "Kuttappu AI could not generate a response.",
        });
      }

      res.write(
        `data: ${JSON.stringify({
          error:
            "Kuttappu AI could not generate a response.",
        })}\n\n`
      );

      res.end();
    }
  }
);



// =====================================================
// VOICE TUTOR
// =====================================================

app.post("/api/voice-tutor", async (req, res) => {
  try {
    const {
      transcript = "",
      repeatMode = false,
      targetSentence = "",
      conversation = [],
    } = req.body || {};

    const { user, error: authError } = await getAuthenticatedUser(req);

    if (!user || authError) {
      return res.status(401).json({
        error: authError || "Authentication required.",
      });
    }

    if (!transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing." });
    }

    const safeConversation = Array.isArray(conversation)
      ? conversation.slice(-10)
      : [];

    const contextText = safeConversation
      .map((item) => `${item.role === "kuttappu" ? "Kuttappu" : "Student"}: ${String(item.text || "")}`)
      .join("\n");

    const prompt = `
You are Kuttappu, a friendly English speaking tutor for a Malayalam-speaking learner.

The learner is practicing spoken English in a live conversation.
Your job is to keep the conversation natural while teaching English.

Recent conversation:
${contextText || "No previous conversation."}

Current learner speech:
${transcript}

Repeat mode: ${repeatMode ? "yes" : "no"}
Target sentence to repeat: ${targetSentence || "none"}

Analyze the learner's sentence.

IMPORTANT:
- Do not punish tiny differences caused by speech recognition.
- Correct only useful English mistakes.
- Prefer natural everyday English.
- If the learner makes a meaningful grammar, word-choice, or sentence-structure mistake, set needsRepeat to true.
- When needsRepeat is true, correctedSentence must be a natural corrected version and reply must briefly explain the mistake and ask the learner to say the corrected sentence again.
- When repeatMode is true and the learner is now correct or acceptably close, set needsRepeat to false and encourage them, then continue with a natural follow-up question.
- If repeatMode is true and the learner is still wrong, keep needsRepeat true.
- pronunciation is a short learner-friendly pronunciation tip only when the transcript suggests a likely pronunciation problem. Do not invent a problem when there is no evidence.
- pronunciation feedback is transcript-based; do not claim to have measured audio phonemes.
- scores are integers from 0 to 100.
- Keep reply short enough to speak naturally.

Return ONLY valid JSON with exactly this shape:
{
  "reply": "short spoken response",
  "needsRepeat": true,
  "correction": "short explanation or empty string",
  "correctedSentence": "correct sentence or empty string",
  "pronunciation": "short pronunciation tip or empty string",
  "scores": {
    "grammar": 0,
    "fluency": 0,
    "pronunciation": 0
  }
}
`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = result.text || "{}";
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) {
      return res.status(502).json({ error: "Kuttappu returned an invalid voice response." });
    }

    const normalized = {
      reply: String(parsed.reply || "let's keep practicing.").trim(),
      needsRepeat: Boolean(parsed.needsRepeat),
      correction: String(parsed.correction || "").trim(),
      correctedSentence: String(parsed.correctedSentence || "").trim(),
      pronunciation: String(parsed.pronunciation || "").trim(),
      scores: {
        grammar: Math.max(0, Math.min(100, Number(parsed.scores?.grammar) || 0)),
        fluency: Math.max(0, Math.min(100, Number(parsed.scores?.fluency) || 0)),
        pronunciation: Math.max(0, Math.min(100, Number(parsed.scores?.pronunciation) || 0)),
      },
    };

    // Flat fields match VoiceTutor.jsx; nested result remains for compatibility.\n    return res.json({ ...normalized, result: normalized });
  } catch (error) {
    console.error("❌ voice tutor error:", error);
    return res.status(500).json({
      error: error?.message || "voice tutor could not generate a response.",
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(
    `🚀 Kuttappu AI backend running on http://localhost:${PORT}`
  );
});