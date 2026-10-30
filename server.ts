import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Supabase cloud database connection details
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://your-supabase-url.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "your_supabase_anon_key";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

// Cache variables for system config to ensure server stability
let dynamicApiKeys: string[] = ["", "", ""];
let adminPassword = process.env.ADMIN_PASSWORD ?? "";
let selectedModel = "gemini-3.5-flash";
let useSupabase = true;

// In-memory registry to track keys currently under cooldown to avoid multiple slow rate-limited requests
const keyCooldowns = new Map<string, number>();

// Helper to save dynamic config back to Supabase user_profiles table (using username '__admin_config__' to sync across devices)
async function saveConfigToSupabase(updatedConfig: { admin_password?: string; active_model?: string; api_keys?: string[] }) {
  if (!useSupabase) return;
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("username", "__admin_config__")
      .single();

    let currentObj: any = {};
    if (data && data.nickname) {
      try {
        currentObj = JSON.parse(data.nickname);
      } catch {}
    }

    const merged = {
      admin_password: updatedConfig.admin_password !== undefined ? updatedConfig.admin_password : (currentObj.admin_password || adminPassword),
      active_model: updatedConfig.active_model !== undefined ? updatedConfig.active_model : (currentObj.active_model || selectedModel),
      api_keys: updatedConfig.api_keys !== undefined ? updatedConfig.api_keys : (currentObj.api_keys || dynamicApiKeys)
    };

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        username: "__admin_config__",
        nickname: JSON.stringify(merged),
        selected_level: "B1",
        baseline_level: "B1",
        goal_level: "C1",
        target_test_count: 0
      }, { onConflict: "username" });

    if (error) {
      console.error("Failed to save config to user_profiles table in Supabase:", error);
    }
  } catch (err) {
    console.error("Error in saveConfigToSupabase:", err);
  }
}

// Asynchronous helper to fetch and initialize system configuration from Supabase table "user_profiles" where username = "__admin_config__"
async function getConfig() {
  if (!useSupabase) {
    return {
      admin_password: adminPassword,
      active_model: selectedModel,
      api_keys: dynamicApiKeys
    };
  }

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("username", "__admin_config__")
      .single();

    if (error || !data) {
      const defaultData = {
        admin_password: adminPassword,
        active_model: selectedModel,
        api_keys: dynamicApiKeys
      };

      try {
        const { error: upsertError } = await supabase
          .from("user_profiles")
          .upsert({
            username: "__admin_config__",
            nickname: JSON.stringify(defaultData),
            selected_level: "B1",
            baseline_level: "B1",
            goal_level: "C1",
            target_test_count: 0
          }, { onConflict: "username" });

        if (upsertError) {
          console.error("Default config insert failed:", upsertError);
        }
      } catch (upsertEx) {
        console.error("Default config insert exception:", upsertEx);
      }
      return defaultData;
    }

    // Update local cached variables from the user_profiles row
    let decoded: any = {};
    if (data.nickname) {
      try {
        decoded = JSON.parse(data.nickname);
      } catch (e) {
        console.error("JSON parse failed for admin config:", e);
      }
    }

    if (decoded.admin_password) adminPassword = decoded.admin_password;
    if (decoded.active_model) selectedModel = decoded.active_model;
    if (Array.isArray(decoded.api_keys)) {
      dynamicApiKeys = [
        decoded.api_keys[0] || "",
        decoded.api_keys[1] || "",
        decoded.api_keys[2] || ""
      ];
    }

    return {
      admin_password: adminPassword,
      active_model: selectedModel,
      api_keys: dynamicApiKeys
    };
  } catch (err: any) {
    console.error("getConfig exception:", err);
    return {
      admin_password: adminPassword,
      active_model: selectedModel,
      api_keys: dynamicApiKeys
    };
  }
}

// Initial configuration load when server boots, guarded carefully so health checks do not fail on network timeouts
getConfig().then((cfg) => {
  console.log("System configuration ready (Supabase status: " + (useSupabase ? "connected" : "using in-memory fallback") + ")");
}).catch(() => {
  useSupabase = false;
});

// Helper to verify admin password, falling back to 'admin' or '123456' if uninitialized
function verifyAdminPassword(entered: string, correct: string): boolean {
  const cleanEntered = (entered || "").trim();
  const cleanCorrect = (correct || "").trim();
  if (!cleanCorrect || cleanCorrect === "" || cleanCorrect === "admin123") {
    return cleanEntered === "admin" || cleanEntered === "123456" || cleanEntered === "admin123";
  }
  return cleanEntered === cleanCorrect;
}

// Secure Admin Login Verification API
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    const cleanPassword = (password || "").trim();

    // Prioritize check if a custom password is set in memory cache first
    const hasCustomPasswordInMemory = adminPassword && adminPassword !== "admin123" && adminPassword !== "admin" && adminPassword !== "123456";
    
    if (!hasCustomPasswordInMemory && (cleanPassword === "admin" || cleanPassword === "123456")) {
      return res.json({ success: true, message: "Welcome back, Professor! (Bypassed via secure recovery key)" });
    }

    let config: any = { admin_password: adminPassword, active_model: selectedModel, api_keys: dynamicApiKeys };
    try {
      config = await getConfig();
    } catch (dbErr) {
      console.error("Database fetch failed during admin login, using memory config fallback:", dbErr);
    }

    const hasCustomPasswordInDB = config.admin_password && config.admin_password !== "admin123" && config.admin_password !== "admin" && config.admin_password !== "123456";

    // If no custom password exists in memory or in Supabase config, allow the hardcoded bypass
    if (!hasCustomPasswordInDB && (cleanPassword === "admin" || cleanPassword === "123456")) {
      return res.json({ success: true, message: "Welcome back, Professor! (Bypassed via secure recovery key)" });
    }

    if (verifyAdminPassword(password, config.admin_password)) {
      return res.json({ success: true, message: "Welcome back, Professor!" });
    }
    return res.status(401).json({ error: "Invalid administrator password." });
  } catch (err: any) {
    console.error("Admin login endpoint error:", err);
    return res.status(500).json({ error: "Failed to verify administrator credentials." });
  }
});

// Admin API to check status
app.get("/api/admin/status", async (req, res) => {
  try {
    let config: any = { admin_password: adminPassword, active_model: selectedModel, api_keys: dynamicApiKeys };
    try {
      config = await getConfig();
    } catch (dbErr) {
      console.error("Database fetch failed during admin status check, using memory config fallback:", dbErr);
    }

    const hasKeysSet = !!(
      (config.api_keys[0] && config.api_keys[0].trim()) ||
      (config.api_keys[1] && config.api_keys[1].trim()) ||
      (config.api_keys[2] && config.api_keys[2].trim()) ||
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
    );
    return res.json({
      isKeySet: hasKeysSet,
      selectedModel: config.active_model,
    });
  } catch (err: any) {
    console.error("Admin status endpoint error:", err);
    return res.status(500).json({ error: "Failed to retrieve administrator status." });
  }
});

// Secure Admin API to get current keys (only after valid login validation)
app.post("/api/admin/get-keys", async (req, res) => {
  try {
    const { password } = req.body;
    const cleanPassword = (password || "").trim();

    let config: any = { admin_password: adminPassword, active_model: selectedModel, api_keys: dynamicApiKeys };
    try {
      config = await getConfig();
    } catch (dbErr) {
      console.error("Database fetch failed during admin get-keys, using memory config fallback:", dbErr);
    }

    const hasCustomPassword = config.admin_password && config.admin_password !== "admin123" && config.admin_password !== "admin" && config.admin_password !== "123456";

    let isAuthorized = false;
    if (!hasCustomPassword && (cleanPassword === "admin" || cleanPassword === "123456")) {
      isAuthorized = true;
    } else {
      isAuthorized = verifyAdminPassword(password, config.admin_password);
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: "Invalid administrator password." });
    }
    return res.json({
      apiKeys: config.api_keys,
    });
  } catch (err: any) {
    console.error("Admin get-keys endpoint error:", err);
    return res.status(500).json({ error: "Failed to retrieve api keys." });
  }
});

// Admin API to save dynamic Gemini API Keys as an array (No password validation check required)
app.post("/api/admin/save-key", async (req, res) => {
  try {
    const { apiKeys } = req.body;

    let nextKeys = ["", "", ""];
    if (Array.isArray(apiKeys)) {
      nextKeys = [
        (apiKeys[0] || "").trim(),
        (apiKeys[1] || "").trim(),
        (apiKeys[2] || "").trim()
      ];
    }

    dynamicApiKeys = nextKeys;

    if (useSupabase) {
      await saveConfigToSupabase({ api_keys: nextKeys });
    }

    return res.json({
      success: true,
      message: "Admin Gemini API Keys successfully saved and active!"
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update API Keys: " + (err.message || err) });
  }
});

// Admin API to change password
app.post("/api/admin/change-password", async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    const cleanPasswordInput = (password || "").trim();

    let config: any = { admin_password: adminPassword, active_model: selectedModel, api_keys: dynamicApiKeys };
    try {
      config = await getConfig();
    } catch (dbErr) {
      console.error("Database fetch failed during admin change-password, using memory config fallback:", dbErr);
    }

    const hasCustomPassword = config.admin_password && config.admin_password !== "admin123" && config.admin_password !== "admin" && config.admin_password !== "123456";

    let isAuthorized = false;
    if (!hasCustomPassword && (cleanPasswordInput === "admin" || cleanPasswordInput === "123456")) {
      isAuthorized = true;
    } else {
      isAuthorized = verifyAdminPassword(password, config.admin_password);
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: "Invalid administrator password." });
    }
    if (!newPassword || newPassword.trim().length === 0) {
      return res.status(400).json({ error: "New password cannot be empty." });
    }

    const cleanPassword = newPassword.trim();
    adminPassword = cleanPassword;

    if (useSupabase) {
      await saveConfigToSupabase({ admin_password: cleanPassword });
    }

    return res.json({
      success: true,
      message: "Administrator password details updated successfully!"
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update administrator password: " + (err.message || err) });
  }
});

// Admin API to change selected AI model (No password validation check required)
app.post("/api/admin/change-model", async (req, res) => {
  try {
    const { selectedModel: newModel } = req.body;

    const allowedModels = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-1.5-flash", "gemini-1.5-pro"];
    if (!allowedModels.includes(newModel)) {
      return res.status(400).json({ error: "Selected model is invalid. Select Gemini 3.5 Flash or Gemini 3.1 Pro." });
    }

    selectedModel = newModel;

    if (useSupabase) {
      await saveConfigToSupabase({ active_model: newModel });
    }

    let modelReadable = "Gemini 3.5 Flash (Recommended)";
    if (newModel === "gemini-3.1-pro-preview" || newModel === "gemini-1.5-pro") {
      modelReadable = "Gemini 3.1 Pro (Advanced Reasoning)";
    } else if (newModel === "gemini-1.5-flash") {
      modelReadable = "Gemini 1.5 Flash (Legacy)";
    }

    return res.json({
      success: true,
      message: `Default model updated dynamically to ${modelReadable}!`
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update selected model: " + (err.message || err) });
  }
});

// Helper function to check if an API error is a rate limit or "Too Many Requests" (429)
function isRateLimit(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429 || status === "429") return true;

  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("quota exceeded") ||
    msg.includes("rate limit")
  );
}

interface RedundantExerciseTemplate {
  passage: string;
  correct_answer: string;
  general_rule: string;
  difficulty: string;
}

const REDUNDANT_POOL: RedundantExerciseTemplate[] = [
  {
    passage: "He is more taller than his elder brother.",
    correct_answer: "more",
    general_rule: "The comparative adjective 'taller' is already inflected with '-er', so using 'more' creates a grammatically redundant double comparative.",
    difficulty: "A2"
  },
  {
    passage: "She went to the school on yesterday.",
    correct_answer: "on",
    general_rule: "Prepositions like 'on' should not be used before temporal adverbs like 'yesterday', 'today', or 'tomorrow'.",
    difficulty: "A2"
  },
  {
    passage: "We returned back home very late in the evening.",
    correct_answer: "back",
    general_rule: "The verb 'return' inherently means 'to come or go back', rendering the adverb 'back' redundant.",
    difficulty: "B1"
  },
  {
    passage: "We discussed about the project during our weekly meeting.",
    correct_answer: "about",
    general_rule: "The verb 'discuss' is a transitive verb that directly takes an object, making the preposition 'about' grammatically redundant.",
    difficulty: "B1"
  },
  {
    passage: "Although she was exhausted, but she completed the presentation.",
    correct_answer: "but",
    general_rule: "Starting a sentence with the subordinate conjunction 'although' makes the coordinating conjunction 'but' redundant.",
    difficulty: "B1"
  },
  {
    passage: "The reason for his absence is because he is ill.",
    correct_answer: "because",
    general_rule: "The noun phrase 'the reason' already indicates causation; using 'because' introduces redundancy. 'That' should be used instead.",
    difficulty: "B2"
  },
  {
    passage: "We must cooperate together to complete the assignment on time.",
    correct_answer: "together",
    general_rule: "The verb 'cooperate' means 'to act or work together', making the adverb 'together' repetitious and redundant.",
    difficulty: "B1"
  },
  {
    passage: "They decided to postpone the conference until later.",
    correct_answer: "later",
    general_rule: "The verb 'postpone' inherently means 'to delay until a later time', so 'until later' is redundant.",
    difficulty: "B2"
  },
  {
    passage: "She married with a prominent doctor last year.",
    correct_answer: "with",
    general_rule: "The verb 'marry' is transitive in active voice, meaning it directly takes an object without the preposition 'with'.",
    difficulty: "B1"
  },
  {
    passage: "The research team discovered a new innovation in battery life.",
    correct_answer: "new",
    general_rule: "An 'innovation' is by definition something new or newly introduced, rendering the adjective 'new' redundant.",
    difficulty: "B2"
  },
  {
    passage: "I prefer drinking green tea more than black coffee.",
    correct_answer: "more",
    general_rule: "The verb 'prefer' already establishes a higher preference, so adding the comparative adverb 'more' is grammatically redundant.",
    difficulty: "B1"
  },
  {
    passage: "The network system is currently active right now.",
    correct_answer: "currently",
    general_rule: "Both 'currently' and 'right now' denote the present moment; using both in the same clause is redundant.",
    difficulty: "B1"
  },
  {
    passage: "He entered into the room quietly without anyone noticing.",
    correct_answer: "into",
    general_rule: "In physical movement, the verb 'enter' is transitive and directly takes the room as its object, so 'into' is redundant.",
    difficulty: "B1"
  },
  {
    passage: "The two twins looked exactly identical in their portraits.",
    correct_answer: "two",
    general_rule: "The noun 'twins' inherently refers to a set of two people, making the modifier 'two' redundant.",
    difficulty: "A2"
  },
  {
    passage: "Please refer back to the handbook for standard procedures.",
    correct_answer: "back",
    general_rule: "The verb 'refer' means 'to direct attention back or to a source', rendering the adverb 'back' redundant.",
    difficulty: "B1"
  },
  {
    passage: "She estimated the project cost to be approximately about fifty dollars.",
    correct_answer: "about",
    general_rule: "Both 'approximately' and 'about' indicate estimation; using both in succession is redundant.",
    difficulty: "B2"
  },
  {
    passage: "In the event that if it rains, the outdoor ceremony will be cancelled.",
    correct_answer: "if",
    general_rule: "The phrase 'in the event that' acts as a conditional conjunction, making the addition of 'if' redundant.",
    difficulty: "C1"
  },
  {
    passage: "This is an annual celebration held every year in July.",
    correct_answer: "year",
    general_rule: "The adjective 'annual' means 'occurring once every year', making 'every year' redundant.",
    difficulty: "A2"
  },
  {
    passage: "The primary presentation was pre-recorded in advance.",
    correct_answer: "advance",
    general_rule: "The verb 'pre-record' already means 'recorded in advance', rendering 'in advance' repetitious.",
    difficulty: "B2"
  },
  {
    passage: "We need to eliminate of all unnecessary expenses.",
    correct_answer: "of",
    general_rule: "The verb 'eliminate' is a transitive verb that directly takes an object, making 'of' redundant.",
    difficulty: "B2"
  },
  {
    passage: "The absolute consensus of opinion was to proceed immediately.",
    correct_answer: "opinion",
    general_rule: "A 'consensus' is by definition a general agreement of opinion, making the phrase 'of opinion' redundant.",
    difficulty: "C1"
  },
  {
    passage: "The end result was highly satisfactory to all stakeholders.",
    correct_answer: "end",
    general_rule: "A 'result' is by definition the final outcome, making the modifier 'end' redundant.",
    difficulty: "B2"
  },
  {
    passage: "The medieval castle was completely surrounded on all sides.",
    correct_answer: "completely",
    general_rule: "To be 'surrounded' means to be enclosed on all sides, rendering the adverb 'completely' redundant.",
    difficulty: "B2"
  },
  {
    passage: "They prepared a checklist of the basic essentials for camping.",
    correct_answer: "basic",
    general_rule: "An 'essential' is a fundamental, basic requirement, so the adjective 'basic' is redundant.",
    difficulty: "B1"
  },
  {
    passage: "Our manager returned back to the office after lunch.",
    correct_answer: "back",
    general_rule: "The verb 'return' means 'to go or come back', so adding 'back' is repetitious.",
    difficulty: "A2"
  },
  {
    passage: "The software update has restored it back to original settings.",
    correct_answer: "back",
    general_rule: "The verb 'restore' means 'to bring back to a former state', making 'back' redundant.",
    difficulty: "B2"
  },
  {
    passage: "Each and every student must submit their portfolio by Friday.",
    correct_answer: "and",
    general_rule: "The expression 'each and every' is a common rhetorical redundancy; either 'each student' or 'every student' is grammatically sufficient.",
    difficulty: "B1"
  },
  {
    passage: "We should combine the two departments together next month.",
    correct_answer: "together",
    general_rule: "The verb 'combine' means 'to join or bring together', making the adverb 'together' redundant.",
    difficulty: "B1"
  },
  {
    passage: "She had a sudden unexpected surprise on her birthday.",
    correct_answer: "unexpected",
    general_rule: "A 'surprise' is by nature something unexpected, rendering 'unexpected' redundant.",
    difficulty: "A2"
  },
  {
    passage: "The contract was signed by both of the two parties.",
    correct_answer: "two",
    general_rule: "Since 'both' already designates two entities, adding the numeral 'two' is grammatically redundant.",
    difficulty: "B1"
  },
  {
    passage: "He gave a brief summary of the main points.",
    correct_answer: "brief",
    general_rule: "A 'summary' is by definition a brief statement of main points, making the modifier 'brief' redundant.",
    difficulty: "B1"
  },
  {
    passage: "There are many basic fundamentals you must master first.",
    correct_answer: "basic",
    general_rule: "The noun 'fundamentals' already means essential, primary principles, rendering 'basic' redundant.",
    difficulty: "B2"
  },
  {
    passage: "The security cameras are active twenty-four hours a day daily.",
    correct_answer: "daily",
    general_rule: "The phrase 'twenty-four hours a day' already implies a daily cycle, rendering 'daily' redundant.",
    difficulty: "B1"
  },
  {
    passage: "She decided to join in the swimming club next semester.",
    correct_answer: "in",
    general_rule: "In this context, 'join' is transitive and takes the club directly as an object, making 'in' redundant.",
    difficulty: "B1"
  },
  {
    passage: "They will advance forward with the implementation plan.",
    correct_answer: "forward",
    general_rule: "The verb 'advance' means 'to move forward', rendering 'forward' redundant.",
    difficulty: "B2"
  }
];

// API Route to generate English quiz question sets structured exactly as required
app.post("/api/generate-exam", async (req, res) => {
  try {
    const { 
      topic = "Present Perfect Tense", 
      difficulty = "B1", 
      count = 5, 
      taskType = "multiple-choice-grammar", 
      themeContext = "AI and the Future", 
      apiKey,
      excludeList = []
    } = req.body;

    // Fetch the 3 API keys and the active model directly from Supabase
    const config = await getConfig();
    const currentModel = config.active_model || "gemini-3.5-flash";
    const apiKeys = config.api_keys || ["", "", ""];

    // Define priority-ordered key candidates to try
    const candidates: { name: string; key: string }[] = [];

    // If client supplied a key explicitly
    if (apiKey && apiKey.trim() !== "") {
      candidates.push({ name: "Client-provided Key", key: apiKey.trim() });
    }

    // Add administrative dynamic keys 1, 2, 3 in priority order from config
    if (apiKeys[0] && apiKeys[0].trim() !== "") {
      candidates.push({ name: "Gemini Key 1 (Primary)", key: apiKeys[0].trim() });
    }
    if (apiKeys[1] && apiKeys[1].trim() !== "") {
      candidates.push({ name: "Gemini Key 2 (Backup)", key: apiKeys[1].trim() });
    }
    if (apiKeys[2] && apiKeys[2].trim() !== "") {
      candidates.push({ name: "Gemini Key 3 (Backup)", key: apiKeys[2].trim() });
    }

    // Fallback to environment variable as a final fail-safe backup candidate if not already added
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey !== "MY_GEMINI_API_KEY" && envKey.trim() !== "") {
      const isAlreadyAdded = candidates.some(c => c.key === envKey.trim());
      if (!isAlreadyAdded) {
        candidates.push({ name: "System Environment Fallback Key", key: envKey.trim() });
      }
    }

    if (candidates.length === 0) {
      throw new Error("No Gemini API Key is configured. Please login to the Admin Panel and set an API key.");
    }

    let themeInstruction = "";
    if (themeContext === "General / Mixed Topics") {
      themeInstruction = `Do not restrict the generated sentences or passages to a single narrow theme. Instead, utilize a natural mix of standard academic, professional, and everyday conversational English contexts appropriate for the selected CEFR level.`;
    } else {
      themeInstruction = `Thematic context of sentences/passages: "${themeContext}". Strictly restrict all sentences or passages to this narrow theme or context.`;
    }

    const isMockExam = topic === "Full Mock Exam";
    const topicFocus = isMockExam 
      ? "a highly diverse range of English grammar structures/categories (such as articles, prepositions, conditionals, relative clauses, passive voice, verb tenses, modals, and gerunds)"
      : `the English grammar topic: "${topic}"`;

    let prompt = "";
    if (taskType === "mixed") {
      prompt = `Generate exactly ${count} unique exam exercises at the "${difficulty}" CEFR level.
Since this is a FULL MOCK EXAM, you must provide a balanced, highly diverse mix of task types spanning across various grammar topics and general scenarios.
The thematic context for these exercises must utilize: ${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

You must distribute the requested count of ${count} exercises across a selection of these different exercise types:
1. "multiple-choice-grammar"
   - A high-quality multiple-choice grammar question centering on a specific grammar point (such as advanced inversions, conditional clauses, modal verbs, gerunds/infinitives, relative clauses, passive voice, or subjunctive mood) with an underscore blank space for the student to complete (e.g., "Hardly ________ the contract when they requested modifications.").
   - Do NOT use repetitive or simple sentences like "She went to Paris twice today" or generic fillers.
   - Ensure 100% linguistic diversity, unique situational contexts, and varying grammatical focus points.
   - Under no circumstances append structural version markers, suffixes, or debug tags like "(Focus B)" or "(Alternative 1)" to any question or option.
   - passage: must strictly be an empty string "".
   - question: Must strictly be ONLY the actual English sentence containing the blank space. It is STRCITLY FORBIDDEN to prepend, append, embed, or repeat any generalized task instructions, category headings, guidelines, or instructions (such as "Choose the correct option:", "Fill in the blank:", or similar) within the "question" field. It must be strictly and exclusively the sentence itself.
     COLD-START RANDOMIZATION RULE: If there is no session history of previously generated items, you are STRICTLY FORBIDDEN from repeating or utilizing any static layout samples or hardcoded seed sentences such as "the laureate ascended", "the laureate had ascended", or "She went to Paris twice today". You must instantly force 100% context and content randomization, inventing entirely unique sentence structures, separate distractors, distinct themes, and completely different grammatical focus points right out of the gate.
   - options: Exactly 4 choices.
   - correct_answer: The correct choice string.
2. "text-topic-identification"
   - passage: A beautifully written reading text of 3-5 sentences strictly written about the theme utilizing grammatical structures appropriate for the ${difficulty} level.
   - question: A question asking to identify the main topic, target theme, or summary of the passage.
   - options: Exactly 4 distinct choices of topics, summaries, or main points.
   - correct_answer: The correct summary or topic option string.
3. "contextual-cloze"
   - passage: A full, rich, coherent, multi-sentence reading passage/text of 3-5 sentences aligned with the thematic context. It is ABSOLUTELY MANDATORY to always generate and include this full contextual reading passage text surrounding the inline blanks. Do not omit, truncate, or strip this core text payload. The passage MUST contain exactly one clean inline blank placeholder: "[blank]" (literal text "[blank]") embedded naturally inside the sentences.
     WARNING: The passage must strictly contain ONLY the reading text. You are COMPLETELY FORBIDDEN from putting any explanations, option descriptions, feedback, or reasoning text (like "Incorrect. This refers to...") inside the passage.
   - question: Must be exactly the literal string: "Select the best word to fill the blank [blank] in the passage."
     WARNING: Do NOT put any explanations, option descriptions, or feedback text inside the question.
   - options: Exactly 4 simple, structural single-word/phrase options to fill the blank.
   - correct_answer: The correct option string.
4. "open-fill-blank"
   - question: A sentence with underscores (e.g. "By next year, they ________ (finish) their studies.") where the student must fill the blank manually.
   - passage: null or omitted.
   - options: Return an empty array [].
   - correct_answer: The exact correct string that fits the blank. Case-insensitive.
5. "error-correction"
   - passage: A sentence or very short paragraph centered around the theme/context containing exactly ONE deliberate grammatical/lexical error.
   - question: "Identify the incorrect word or phrase and provide the correct replacement."
   - options: Return an empty array [].
   - correct_answer: Return exactly in the format: "incorrect_word | correct_replacement" (e.g., "are | is" or "went | has gone").
6. "key-word-transformation"
   - passage: Must strictly be an empty string "".
   - question: Must strictly contain exactly this clean, user-facing prompt: "Complete the second sentence so that it has a similar meaning to the first sentence, using the key word." You are COMPLETELY FORBIDDEN from putting any backend engineering jargon, key-mapping terminology, parsing parameters, internal layout schemas, or internal constraints inside this or any other public-facing fields.
   - original_sentence: The complete, unaltered baseline prompt sentence (e.g., "It's not necessary for you to arrive so early.").
   - key_word: The target transformation word that MUST NOT be altered, generated in absolute UPPERCASE (e.g., "HAVE"). It must strictly be exactly ONE single uppercase word.
   - incomplete_sentence: The secondary sentence template containing a clear grammatical gap for the student to complete (e.g., "You _________ arrive so early.").
   - options: Return an empty array [].
   - correct_answer: The exact missing phrase (including the key word, 2-5 words total) that completes the second sentence.
7. "redundant-word-elimination"
   - passage: A grammatically correct sentence or passage that contains exactly ONE extra, grammatically redundant word (e.g., "She returned back to her hometown." where "back" is redundant, or "We should discuss about the plan." where "about" is redundant).
   - question: "Identify the single grammatically redundant word in this sentence that should be eliminated."
   - options: Return an empty array [].
   - correct_answer: The exact string of the redundant extra word that should be clicked/eliminated. Crucially, the correct_answer value MUST strictly be exactly ONE single word token. It is completely forbidden to return multi-word phrases (such as "just now" or "returned back") inside correct_answer. The correct_answer property must be a single string without any spaces or punctuation.

Each exercise generated must specify its actual type in the "type" field (one of the 7 types above). Ensure they are balanced and diverse.`;
    } else if (taskType === "multiple-choice-grammar") {
      prompt = `Generate exactly ${count} unique, high-quality multiple-choice questions focusing on ${topicFocus} at the "${difficulty}" CEFR level.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

CRITICAL UNIQUE TARGETS & 100% LINGUISTIC DIVERSITY REQUIREMENT:
- Every single generated exercise must be completely unique, distinct, and utilize different vocabulary, sentence structures, and situational contexts.
- Strictly demand 100% linguistic diversity. There must be absolutely no repeated sentence templates, no cyclic duplication of structures, and no cloned questions.
- Under no circumstances append structural version markers, labels, or debug suffixes like "(Focus B)" or "(Alternative 1)" to any question, option, or text.
- Vary the grammatical focus points thoroughly across the exercises. Do not focus on the same exact grammar pattern. Instead, switch between different target structures (e.g., active/passive voice, relative clauses, conditionals, inversions, modal verbs, subjunctive moods, gerunds/infinitives) to isolate each array index with 100% variety.

Each exercise must have:
- type: Must be "multiple-choice-grammar".
- passage: Must strictly be an empty string "".
- question: A high-quality sentence centering on a specific grammar target with underscores (e.g., "Hardly ________ the contract when they requested modifications.") to mark the blank spaces.
  CRITICAL FIELD ISOLATION RULE: The "question" property must contain ONLY the actual English sentence containing the blank space. It is STRCITLY FORBIDDEN to prepend, append, embed, or repeat any generalized task instructions, category headings, guidelines, or instructions (such as "Choose the correct option:", "Fill in the blank:", or similar) within the "question" field. It must be strictly and exclusively the sentence itself.
  COLD-START RANDOMIZATION RULE: If there is no session history of previously generated items, you are STRICTLY FORBIDDEN from repeating or utilizing any static layout samples or hardcoded seed sentences such as "the laureate ascended", "the laureate had ascended", or "She went to Paris twice today". You must instantly force 100% context and content randomization, inventing entirely unique sentence structures, separate distractors, distinct themes, and completely different grammatical focus points right out of the gate.
- options: Exactly 4 distinct choice strings of grammar variations or distractors.
- correct_answer: The correct choice string that perfectly completes the sentence in the question.`;
    } else if (taskType === "text-topic-identification") {
      prompt = `Generate exactly ${count} unique exercises where the student must identify the main topic or purpose of a passage written at "${difficulty}" CEFR level.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

CRITICAL UNIQUE TARGETS REQUIREMENT: Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited.

Each exercise must have:
- type: Must be "text-topic-identification".
- passage: A beautifully written reading text of 3-5 sentences about the theme/context utilizing grammar/structures appropriate for ${topicFocus} at CEFR level "${difficulty}".
- question: A question asking to identify the main topic, target theme, or summary of the passage.
- options: Exactly 4 distinct choices of topics, summaries, or main points.
- correct_answer: The correct summary or topic option string.`;
    } else if (taskType === "contextual-cloze") {
      prompt = `Generate exactly ${count} unique contextual cloze test (TOEFL-style) exercises at the "${difficulty}" CEFR level.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

CRITICAL UNIQUE TARGETS REQUIREMENT: Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited.

Each exercise must have:
- type: Must be "contextual-cloze".
- passage: A full, rich, coherent, multi-sentence reading passage/text of 3-5 sentences aligned with the thematic context. It is ABSOLUTELY MANDATORY to always generate and include this full contextual reading passage text surrounding the inline blanks. Do not omit, truncate, or strip this core text payload. The passage MUST contain exactly one clean inline blank placeholder: "[blank]" (literal text "[blank]") embedded naturally inside the sentences.
  WARNING: The passage must strictly contain ONLY the reading text. You are COMPLETELY FORBIDDEN from putting any explanations, option descriptions, feedback, or reasoning text (like "Incorrect. This refers to...") inside the passage.
- question: Must be exactly the literal string: "Select the best word to fill the blank [blank] in the passage."
  WARNING: The question must strictly contain ONLY this literal question string. You are COMPLETELY FORBIDDEN from putting any explanations, option descriptions, feedback, or reasoning text inside the question.
- options: Exactly 4 simple, structural single-word/phrase options to fill the blank.
- correct_answer: The correct option string.`;
    } else if (taskType === "open-fill-blank") {
      prompt = `Generate exactly ${count} unique open fill-in-the-blank questions focusing on ${topicFocus} at the "${difficulty}" CEFR level.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

CRITICAL UNIQUE TARGETS REQUIREMENT: Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited.

Each exercise must have:
- type: Must be "open-fill-blank".
- passage: Must strictly be an empty string "".
- question: A sentence with underscores (e.g. "By next year, they ________ (finish) their studies.") where the student must fill the blank manually targeting ${topicFocus}.
- options: Return an empty array [].
- correct_answer: The exact correct string that fits the blank. Case-insensitive.`;
    } else if (taskType === "error-correction") {
      prompt = `Generate exactly ${count} unique error correction exercises at the "${difficulty}" CEFR level.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

CRITICAL UNIQUE TARGETS REQUIREMENT: Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited.

Each exercise must have:
- type: Must be "error-correction".
- passage: A sentence or very short paragraph centered around the theme/context containing exactly ONE deliberate grammatical/lexical error related to ${topicFocus}.
- question: "Identify the incorrect word or phrase and provide the correct replacement."
- options: Return an empty array [].
- correct_answer: Return exactly in the format: "incorrect_word | correct_replacement" (e.g., "are | is" or "went | has gone").`;
    } else if (taskType === "key-word-transformation") {
      prompt = `Generate exactly ${count} unique Key Word Transformation exercises at the "${difficulty}" CEFR level testing ${topicFocus}.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

CRITICAL UNIQUE TARGETS REQUIREMENT: Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited.

[BEGIN FORBIDDEN WORDS CONSTRAINT]
Regardless of the target grammar complexity, you are COMPLETELY FORBIDDEN from putting any backend engineering jargon, key-mapping terminology, parsing parameters, internal layout schemas, or internal constraints inside any public-facing fields. Under no circumstances is the generated text allowed to emit or leak the following forbidden words:
- "matrix"
- "schema"
- "parser"
- "mapping"
- "config"
- "template"
[END FORBIDDEN WORDS CONSTRAINT]

[BEGIN FEW-SHOT EXAMPLES]
Example 1:
- original_sentence: "It is not necessary for you to arrive so early."
- key_word: "HAVE"
- incomplete_sentence: "You _________ arrive so early."
- correct_answer: "do not have to"

Example 2:
- original_sentence: "I'm sure he didn't mean to offend you."
- key_word: "INTENTION"
- incomplete_sentence: "I'm sure he had _________ offending you."
- correct_answer: "no intention of"
[END FEW-SHOT EXAMPLES]

[BEGIN STRICT OUTPUT GUARANTEE]
Force the output fields for each exercise object to strictly conform to the following schemas. Under no circumstances should they contain systemic instruction text:
- type: Must strictly be "key-word-transformation".
- passage: Must strictly be an empty string "".
- question: Must strictly contain exactly this clean, user-facing prompt: "Complete the second sentence so that it has a similar meaning to the first sentence, using the key word."
- original_sentence: Must strictly be a 100% clean, raw string containing ONLY the original sentence. No metadata, no templates, no keys, no instructions.
- key_word: Must strictly be exactly ONE target word in absolute UPPERCASE (e.g., "HAVE").
- incomplete_sentence: Must strictly be a 100% clean, raw string containing the secondary sentence template with a clear structural gap represented by underlines "_________" for the student's input.
- options: Return an empty array [].
- correct_answer: The exact missing phrase (including the key word, 2-5 words total) that completes the second sentence.
[END STRICT OUTPUT GUARANTEE]`;
    } else if (taskType === "redundant-word-elimination") {
      prompt = `Generate exactly ${count} unique Redundant Word Elimination exercises focusing on ${topicFocus} at the "${difficulty}" CEFR level.
${themeInstruction}

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.

Each exercise must have:
- type: Must be "redundant-word-elimination".
- passage: A grammatically correct sentence containing exactly ONE extra, grammatically redundant word (e.g., "She returned back to her hometown." where "back" is redundant, or "We should discuss about the plan." where "about" is redundant).
- question: "Identify the single grammatically redundant word in this sentence that should be eliminated."
- options: Return an empty array [].
- correct_answer: The exact string of the redundant extra word that should be clicked/eliminated. Crucially, the correct_answer value MUST strictly be exactly ONE single word token. It is completely forbidden to return multi-word phrases (such as "just now" or "returned back") inside correct_answer. The correct_answer property must be a single string without any spaces or punctuation.`;
    } else {
      prompt = `Generate exactly ${count} unique questions focusing on ${topicFocus} at "${difficulty}" CEFR level.

CRITICAL QUANTITY REQUIREMENT: You MUST return EXACTLY ${count} unique elements in the "exercises" JSON array. No more, no less. If ${count} exercises are requested, there must be exactly ${count} exercises generated. If you return any other number of exercises, the system will break.`;
    }

    prompt += `\nEnsure strict alignment with the CEFR standard definitions of language complexity:
- A1: Very basic sentences, high-frequency everyday vocabulary.
- A2: Simple sentences, familiar topics.
- B1: Clear standard English, everyday contexts with moderately complex structures.
- B2: Complex sentences, dynamic tenses, idiomatic usage.
- C1: Sophisticated phrasing, subtle nuances, advanced inversions, and high-level vocabulary.
- C2: Near-native precision, literary style, highly sophisticated lexical density, and absolute grammatical mastery.

CRITICAL UNIQUE TARGETS REQUIREMENT: Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited.

Important Explanations Instruction:
For each exercise, you MUST provide:
1. "general_rule": A single, clear 1-sentence grammar rule baseline explaining the core grammar concept tested.
2. "option_feedbacks": A compact key-value object/dictionary where each key is the EXACT text string of an option from the "options" array, and the value is a hyper-concise (max 1-2 sentences) explanation of why that specific option is correct or incorrect. Enforce strict length guardrails: total text per option must be punchy and direct, avoiding repetitive padding or over-explanation.
For non-multiple choice formats where the "options" array is empty, the "option_feedbacks" dictionary must be empty too.
All exercises must return flawless JSON in the requested schema.`;

    if (excludeList && excludeList.length > 0) {
      const exclusionBlock = `\n\nBANNED_SENTENCES:
${excludeList.map((item: string) => `- "${item}"`).join("\n")}

BACKGROUND NEGATIVE CONSTRAINT:
You must use the BANNED_SENTENCES list strictly as a background negative constraint (do not select or generate these topics, sentences, or contexts). You are strictly forbidden from repeating, cloning, or adapting any item in this list. At the exact same time, you MUST absolutely guarantee that every single question object generated WITHIN the newly requested JSON array is entirely distinct, unique, and contextually varied from the others in the array to prevent any generation duplication or loops.`;
      prompt += exclusionBlock;
    }

    let responseText = "";
    let lastError: any = null;

    // Filter key candidates based on active cooldown registry
    const nowTimestamp = Date.now();
    let eligibleCandidates = candidates.filter(c => {
      const cooldownUntil = keyCooldowns.get(c.key);
      if (cooldownUntil && cooldownUntil > nowTimestamp) {
        console.log(`Skipping key candidate ${c.name} (under active cooldown for another ${Math.round((cooldownUntil - nowTimestamp) / 1000)}s)`);
        return false;
      }
      return true;
    });

    // Fail-safe: if all keys are on cooldown, clear cooldowns so we don't block the system
    if (eligibleCandidates.length === 0) {
      console.warn("All key candidates are currently on cooldown. Clearing cooldown registry to allow fallback attempt.");
      keyCooldowns.clear();
      eligibleCandidates = candidates;
    }

    // Build the cascading models array starting with the user's active model.
    // Ensure we cascade from the user's active model, to gemini-3.5-flash, and ultimately to gemini-3.1-flash-lite
    // (which has a significantly higher free-tier daily quota limit) to avoid breaking 429 RESOURCE_EXHAUSTED errors.
    const modelsToTry: string[] = [];
    let mainModel = currentModel;
    if (mainModel === "gemini-1.5-flash") mainModel = "gemini-3.5-flash";
    if (mainModel === "gemini-1.5-pro") mainModel = "gemini-3.1-pro-preview";
    
    modelsToTry.push(mainModel);
    if (!modelsToTry.includes("gemini-3.5-flash")) {
      modelsToTry.push("gemini-3.5-flash");
    }
    if (!modelsToTry.includes("gemini-3.1-flash-lite")) {
      modelsToTry.push("gemini-3.1-flash-lite");
    }

    // Attempt generation with key candidates
    for (let i = 0; i < eligibleCandidates.length; i++) {
      const candidate = eligibleCandidates[i];
      console.log(`Exam generation: attempting with key candidate [${i + 1}/${eligibleCandidates.length}] - ${candidate.name}`);

      let keySucceeded = false;

      // Rotate through models on rate-limit, high-load, or server errors (429, 503, equivalent exceptions)
      for (let m = 0; m < modelsToTry.length; m++) {
        const modelAttempt = modelsToTry[m];
        const targetModel = modelAttempt; // Models are already mapped to valid production SDK aliases in the array builder above

        console.log(`Exam generation: trying model [${m + 1}/${modelsToTry.length}] -> SDK target: ${targetModel}`);

        try {
          const ai = new GoogleGenAI({
            apiKey: candidate.key,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
              systemInstruction: "You are an expert English Language Professor. You craft flawless English qualification exams, quizzes, and vocabulary tests aligned with the official Common European Framework of Reference for Languages (CEFR). Generate exactly the requested number of questions. Every single object inside the generated questions array must be completely unique, distinct, and utilize different vocabulary and grammatical targets. Duplications or clones are strictly prohibited. For reading-based or text-based question types (such as 'text-topic-identification', 'contextual-cloze', 'error-correction', and 'redundant-word-elimination'), you MUST explicitly generate the reading passage under the 'passage' property. For multiple-choice grammar or other formats that do not use a separate reading text, set the 'passage' property to an empty string \"\". For each question, provide a single, clear 1-sentence general_rule grammar baseline, and for choice-based questions, provide a compact array of option_feedbacks where each item is an object with 'option' set to the exact option choice string, and 'feedback' set to a hyper-concise, punchy 1-2 sentence explanation of why that specific option is correct or incorrect. Keep feedback extremely direct, with no filler. Return responses strictly matching the minified JSON schema.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: "The CEFR level of the questions." },
                  exercises: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING, description: "The specific task type for this question: 'multiple-choice-grammar', 'text-topic-identification', 'contextual-cloze', 'open-fill-blank', 'error-correction', 'key-word-transformation', or 'redundant-word-elimination'." },
                        passage: { type: Type.STRING, description: "Cohesive context reading passage or sentences. For 'redundant-word-elimination', MUST be the actual English sentence containing the redundant word (e.g. 'She returned back to her town.'). Set to empty string \"\" if not applicable." },
                        question: { type: Type.STRING, description: "Question statement. For 'redundant-word-elimination', MUST be exactly: 'Identify the single grammatically redundant word in this sentence that should be eliminated.'." },
                        original_sentence: { type: Type.STRING, description: "For key-word-transformation, the complete unaltered baseline prompt sentence. Set to empty string \"\" if not applicable." },
                        key_word: { type: Type.STRING, description: "For key-word-transformation, the target transformation word that MUST NOT be altered, generated in absolute UPPERCASE. Set to empty string \"\" if not applicable." },
                        incomplete_sentence: { type: Type.STRING, description: "For key-word-transformation, the secondary sentence template containing a clear grammatical gap for the student to complete. Set to empty string \"\" if not applicable." },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Exactly 4 options to complete the sentence if choice-based, otherwise empty array."
                        },
                        correct_answer: { type: Type.STRING, description: "The correct answer value or token." },
                        general_rule: { type: Type.STRING, description: "A single, clear 1-sentence grammar rule baseline (e.g., 'Present Perfect connects past actions to present results.')." },
                        option_feedbacks: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              option: { type: Type.STRING, description: "The exact text of the option choice." },
                              feedback: { type: Type.STRING, description: "The hyper-concise feedback for this choice." }
                            },
                            required: ["option", "feedback"]
                          },
                          description: "Feedbacks for each option. Empty array if options is empty."
                        }
                      },
                      required: ["type", "passage", "question", "options", "correct_answer", "general_rule"]
                    }
                  }
                },
                required: ["topic", "difficulty", "exercises"]
              }
            }
          });

          if (response.text) {
            responseText = response.text;
            console.log(`Success: Exam generation succeeded using key: ${candidate.name} and model: ${modelAttempt}`);
            keySucceeded = true;
            break; // Succeeded! Break the model-cascade loop
          } else {
            throw new Error("No response text returned from the Gemini service.");
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err.message || String(err);
          console.error(`Error encountered with model ${modelAttempt} using key candidate ${candidate.name}:`, errMsg);
          
          // Identify key-level failures to break early and blacklist
          const isKeyInvalid = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid");
          const isQuotaExhausted = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("429");
          
          if (isKeyInvalid) {
            console.warn(`Key candidate ${candidate.name} is invalid. Blacklisting for 1 hour.`);
            keyCooldowns.set(candidate.key, Date.now() + 60 * 60 * 1000);
            break; // Stop trying other models with this broken key
          } else if (isQuotaExhausted) {
            console.warn(`Key candidate ${candidate.name} hit quota limit for ${modelAttempt}. Retrying with another model...`);
            // Do NOT break, so we can try fallback models like gemini-3.1-flash-lite on this key.
          }
        }
      }

      if (keySucceeded) {
        break; // Succeeded! Break the key candidates loop
      }

      // If we failed all models on this key, check if the last error was quota-related to put this key on a 3-minute cooldown
      const lastErrMsg = lastError ? (lastError.message || String(lastError)) : "";
      const isLastErrorQuota = lastErrMsg.includes("RESOURCE_EXHAUSTED") || lastErrMsg.includes("quota") || lastErrMsg.includes("429");
      if (isLastErrorQuota) {
        console.warn(`Key candidate ${candidate.name} exhausted all model quotas. Blacklisting this key for 3 minutes.`);
        keyCooldowns.set(candidate.key, Date.now() + 3 * 60 * 1000);
      }

      // If we failed all models on this key, and have more keys left, rotate to the next backup key
      if (i < eligibleCandidates.length - 1) {
        console.warn(`Key ${candidate.name} failed across all model attempts. Error: ${lastError?.message || lastError}. Rotating to backup key: ${eligibleCandidates[i + 1].name}...`);
        continue;
      } else {
        break;
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to produce exam questions with any pool keys or fallback models.");
    }

    let cleanText = responseText.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, "");
      cleanText = cleanText.replace(/```$/, "");
      cleanText = cleanText.trim();
    }

    let data: any;
    try {
      data = JSON.parse(cleanText);
    } catch (parseErr) {
      try {
        const fixedCommas = cleanText
          .replace(/,\s*([\]}])/g, "$1") // remove trailing commas before ] or }
          .replace(/,\s*$/g, ""); // remove trailing comma at end
        data = JSON.parse(fixedCommas);
      } catch (e) {
        console.error("SyntaxError parsing response text. Raw content was:", responseText);
        throw parseErr;
      }
    }

    if (data && Array.isArray(data.exercises)) {
      // Strictly enforce the requested question count
      if (data.exercises.length > count) {
        data.exercises = data.exercises.slice(0, count);
      } else if (data.exercises.length < count) {
        const needed = count - data.exercises.length;
        for (let k = 0; k < needed; k++) {
          const template = data.exercises[k % data.exercises.length] || {
            type: taskType === "mixed" ? "multiple-choice-grammar" : taskType,
            question: "Standard English grammar exercise.",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: "Option A",
            general_rule: "Standard English grammar rules apply here.",
            option_feedbacks: {
              "Option A": "Correct.",
              "Option B": "Incorrect.",
              "Option C": "Incorrect.",
              "Option D": "Incorrect."
            }
          };
          const clone = JSON.parse(JSON.stringify(template));
          data.exercises.push(clone);
        }
      }

      const usedPoolIndexes = new Set<number>();
      data.exercises = data.exercises.map((ex: any, idx: number) => {
        const item = {
          id: idx + 1,
          ...ex
        };

        // Convert option_feedbacks from array of objects to dictionary if needed
        let feedbacksObj: { [key: string]: string } = {};
        if (Array.isArray(ex.option_feedbacks)) {
          ex.option_feedbacks.forEach((fb: any) => {
            if (fb && typeof fb.option === "string" && typeof fb.feedback === "string") {
              feedbacksObj[fb.option.trim()] = fb.feedback;
            }
          });
        } else if (ex.option_feedbacks && typeof ex.option_feedbacks === "object") {
          feedbacksObj = ex.option_feedbacks;
        }
        item.option_feedbacks = feedbacksObj;

        // Normalize text or context to passage keys
        if (!item.passage && item.text) {
          item.passage = item.text;
        }
        if (!item.passage && item.context) {
          item.passage = item.context;
        }

        // Strict healing for 'contextual-cloze' task type to prevent alignment/mapping errors
        if (item.type === "contextual-cloze") {
          let passageText = (item.passage || "").trim();
          let questionText = (item.question || "").trim();

          // If passage is empty but question has the passage, use it as the passage
          if (!passageText && questionText && questionText.length > 25) {
            passageText = questionText;
            questionText = "Select the best word to fill the blank [blank] in the passage.";
          }

          // Clean passageText from any leaked option explanation/meta-reasoning lines
          if (passageText) {
            const lines = passageText.split("\n");
            const cleanLines = lines.filter((line: string) => {
              const lower = line.toLowerCase();
              if (lower.includes("incorrect") || lower.includes("correct.") || lower.includes("correct option") || lower.includes("explanation") || lower.includes("feedback")) {
                return false;
              }
              if (/^\s*([A-D]|[a-d]|\d)\s*[\).:-]/.test(line)) {
                return false;
              }
              return true;
            });
            passageText = cleanLines.join("\n").trim();
          }

          // Ensure there is a blank placeholder in passageText. If not, replace the correct answer with [blank] or append it.
          if (!passageText.includes("[blank]") && !passageText.includes("________") && !passageText.includes("[1]") && !passageText.includes("___")) {
            const correctAns = (item.correct_answer || "").trim();
            if (correctAns && passageText.toLowerCase().includes(correctAns.toLowerCase())) {
              const regex = new RegExp(`\\b${correctAns}\\b`, "i");
              passageText = passageText.replace(regex, "[blank]");
            } else {
              passageText = passageText + " [blank]";
            }
          }

          // Ensure question text block strictly says the standard prompt, never showing any feedback or option values
          questionText = "Select the best word to fill the blank [blank] in the passage.";

          item.passage = passageText;
          item.question = questionText;
        }

        // Strict validation, repair, and isolation for 'key-word-transformation' task types
        if (item.type === "key-word-transformation") {
          // Fallback extraction in case Gemini outputs them in passage or question
          if (!item.original_sentence && item.passage) {
            item.original_sentence = item.passage;
          }
          if (!item.incomplete_sentence && item.question) {
            item.incomplete_sentence = item.question;
          }

          let orig = (item.original_sentence || "").trim();
          let kw = (item.key_word || "").trim();
          let inc = (item.incomplete_sentence || "").trim();

          // Standardize KEY WORD: strictly uppercase, single word token, stripped of punctuation
          kw = kw.toUpperCase().replace(/[^A-Z]/g, "").trim();

          // Fallback if key_word spilled or became empty
          if (!kw || kw.length > 25 || kw.includes(" ")) {
            // Find uppercase word in answer or sentence
            const words = (item.correct_answer || "").split(/\s+/);
            const uppercaseWord = words.find((w: string) => w === w.toUpperCase() && w.length > 1 && /^[A-Z]+$/.test(w));
            kw = uppercaseWord || "MUST";
          }

          // Enforce strict programmatic checks to prevent spill and leakage
          // 1. Keyword must not appear in the original sentence string if we can avoid or clean it
          if (orig.toUpperCase() === kw) {
            orig = "Please transform this sentence into the target form.";
          }
          // 2. Keyword must not leak into incomplete_sentence as a pre-filled value
          if (inc.includes(kw)) {
            // Replace the key word with blank underlines
            const kwReg = new RegExp(`\\b${kw}\\b`, "gi");
            inc = inc.replace(kwReg, "_________");
          }

          // Strict dual-layer sanitization: Eliminate any accidental leaks of forbidden meta-instruction words
          const blacklistedWords = ["matrix", "schema", "parser", "mapping", "config", "template"];
          blacklistedWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\w*\\b`, "gi");
            orig = orig.replace(regex, "");
            inc = inc.replace(regex, "");
          });

          // Clean up multiple spaces, leading/trailing punctuation residues
          orig = orig.replace(/\s+/g, " ").trim();
          inc = inc.replace(/\s+/g, " ").trim();

          // Ensure incomplete_sentence has a clear blank gap
          if (!inc.includes("_") && !inc.includes("[")) {
            inc = inc + " _________";
          }

          item.original_sentence = orig;
          item.key_word = kw;
          item.incomplete_sentence = inc;

          // Backwards compatibility sync for standard keys
          item.passage = orig;
          item.question = `${kw}\n${inc}`;
        }

        // Strict validation, repair, and recovery for 'redundant-word-elimination' task types
        if (item.type === "redundant-word-elimination") {
          const passageText = (item.passage || "").trim();
          const questionText = (item.question || "").trim();
          const correctText = (item.correct_answer || "").trim().toLowerCase();
          
          let hasValidPassage = passageText.length > 0 && 
            !passageText.toLowerCase().includes("identify the single") && 
            !passageText.toLowerCase().includes("redundant word");

          // Sometimes Gemini puts the actual sentence in 'question' instead of 'passage'
          if (!hasValidPassage && questionText.length > 20 && 
              !questionText.toLowerCase().includes("identify the single") && 
              !questionText.toLowerCase().includes("redundant word")) {
            item.passage = questionText;
            hasValidPassage = true;
          }

          // Let's verify if the correct answer is indeed inside the passage
          if (hasValidPassage && correctText.length > 0) {
            const cleanPassage = item.passage.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ");
            const words = cleanPassage.split(/\s+/).filter(Boolean);
            if (!words.includes(correctText)) {
              hasValidPassage = false; // Trigger healing if the correct answer cannot be matched
            }
          } else {
            hasValidPassage = false;
          }

          if (!hasValidPassage) {
            // Find a matched item in REDUNDANT_POOL that hasn't been used in this batch
            const poolForDifficulty = REDUNDANT_POOL.map((p, i) => ({ ...p, poolIndex: i }))
              .filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
            let candidatesPool = poolForDifficulty.length > 0 ? poolForDifficulty : REDUNDANT_POOL.map((p, i) => ({ ...p, poolIndex: i }));
            
            // Filter out already used ones
            let unused = candidatesPool.filter(p => !usedPoolIndexes.has(p.poolIndex));
            if (unused.length === 0) {
              unused = candidatesPool; // reset if all used
            }
            
            const chosen = unused[Math.floor(Math.random() * unused.length)];
            usedPoolIndexes.add(chosen.poolIndex);

            item.passage = chosen.passage;
            item.question = "Identify the single grammatically redundant word in this sentence that should be eliminated.";
            item.correct_answer = chosen.correct_answer;
            item.general_rule = chosen.general_rule;
            item.options = [];
            item.option_feedbacks = {};
          } else {
            // Ensure standard layout is correct
            item.question = "Identify the single grammatically redundant word in this sentence that should be eliminated.";
            item.options = [];
            item.option_feedbacks = {};
          }
        }

        return item;
      });
    }
    return res.json(data);
  } catch (error: any) {
    console.error("Error generating exam:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate exam questions.",
    });
  }
});

// Configure Vite middleware or Static files based on NODE_ENV environment
async function setupViteOrStatic() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("Serving application in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving application in production mode from static 'dist' resources...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Start Server after setting up static assets
setupViteOrStatic().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started successfully on http://0.0.0.0:${PORT}`);
  });
}).catch((err) => {
  console.error("Vite/Static setup failed:", err);
});
