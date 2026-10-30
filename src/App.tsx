import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Sparkles, 
  Award, 
  ChevronRight, 
  AlertCircle, 
  GraduationCap, 
  HelpCircle,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Activity,
  BarChart3,
  Link,
  ExternalLink,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { LOCALIZED_TEXT, Language } from "./translations";

const SUPABASE_URL = "https://seqtlrekbovfwytnipns.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QKKl7SBn8LKdwDRida8vjw_Gmo66N3H";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Standard question interface
interface Exercise {
  id: number;
  type: string;
  passage?: string; // Add optional passage for reading/cloze blocks
  question: string;
  options: string[];
  correct_answer: string;
  general_rule?: string;
  option_feedbacks?: { [optionText: string]: string };
  original_sentence?: string;
  key_word?: string;
  incomplete_sentence?: string;
}

interface TestLog {
  id: string;
  timestamp: string;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  topic: string;
  taskType: string;
  overallPercentage?: number;
  grammarTopic?: string;
  difficulty?: string;
}

interface StudentProfile {
  nickname: string;
  baselineLevel: string;
  goalLevel: string;
  testHistory: TestLog[];
  targetTestCount?: number;
}

interface ExamSet {
  topic: string;
  difficulty: string;
  exercises: Exercise[];
}

// Preloaded 2 B1 Present Perfect questions requested by user as start state
const INITIAL_EXAM: ExamSet = {
  topic: "Present Tenses (Simple, Continuous, Perfect, Perfect Continuous)",
  difficulty: "B1",
  exercises: [
    {
      id: 1,
      type: "multiple-choice-grammar",
      passage: "",
      question: "She ________ to Paris twice this year.",
      options: ["has went", "has been", "went", "is going"],
      correct_answer: "has been",
      general_rule: "Present Perfect connects past actions to present results when the time period is ongoing.",
      option_feedbacks: {
        "has went": "Incorrect because 'went' is the past simple form; the past participle is 'gone' or 'been'.",
        "has been": "Correct. 'Has been' indicates a completed visit within the ongoing period 'this year'.",
        "went": "Incorrect. Simple Past requires a completed time frame, but 'this year' is still ongoing.",
        "is going": "Incorrect. Present continuous describes an action in progress, not completed visits."
      },
      original_sentence: "",
      key_word: "",
      incomplete_sentence: ""
    },
    {
      id: 2,
      type: "multiple-choice-grammar",
      passage: "",
      question: "They haven't finished their project ________.",
      options: ["already", "still", "yet", "since"],
      correct_answer: "yet",
      general_rule: "'Yet' is standard in negative Present Perfect sentences to show something is expected.",
      option_feedbacks: {
        "already": "Incorrect. 'Already' is typically used in positive Present Perfect sentences, not negative ones.",
        "still": "Incorrect. While grammatically possible, 'still' would usually go before 'haven't'.",
        "yet": "Correct. 'Yet' placed at the end is the standard negative marker for an expected action.",
        "since": "Incorrect. 'Since' requires a starting point in time (e.g., 'since Monday')."
      },
      original_sentence: "",
      key_word: "",
      incomplete_sentence: ""
    }
  ]
};

const THEMATIC_CONTEXTS = [
  "General / Mixed Topics",
  "AI and the Future",
  "History and Heritage",
  "Climate Change & Environment",
  "Space Exploration",
  "Education in the Digital Age",
  "Globalization and Culture",
  "Biotechnology and Health",
  "Business and Startups",
  "Media and Misinformation",
  "Urbanization & Smart Cities",
  "Science and Ethics",
  "Arts and Modern Society",
  "Psychology & Human Behavior",
  "Digital Privacy & Technology",
  "Future of Work & Global Economy"
];

// Quick selection topic suggestions
const SUGGESTED_TOPICS = [
  "Present Tenses (Simple, Continuous, Perfect, Perfect Continuous)",
  "Past Tenses (Simple, Continuous, Perfect, Perfect Continuous)",
  "Future Forms & Expressing the Future",
  "Conditionals (Zero, First, Second, Third, and Mixed Conditionals)",
  "Passive Voice & Causative Structures (Have/Get something done)",
  "Modal Verbs (Ability, Obligation, Permission, Deduction)",
  "Gerunds and Infinitives (Verb patterns)",
  "Articles (A, An, The, Zero Article)",
  "Relative Clauses (Defining and Non-defining)",
  "Reported Speech & Indirect Questions",
  "Subjunctive Mood & Inversion (e.g., Had I known..., Bare Infinitive)",
  "Phrasal Verbs (Idiomatic particle verbs)",
  "Prepositions of Place, Time, and Dependent Prepositions",
  "Adjectives vs. Adverbs (Comparatives, Superlatives, and Order)",
  "Pronouns & Determiners (Quantifiers: Few, Little, Most, Each, Every)",
  "Conjunctions & Discourse Markers (Linking words)",
  "Idioms, Collocations & Advanced Lexis",
  "Common Mistakes & False Friends"
];

const TOPICS_DICTIONARY: Record<string, Record<string, string>> = {
  "Present Tenses (Simple, Continuous, Perfect, Perfect Continuous)": {
    ru: "Настоящие времена",
    de: "Präsens-Zeitformen",
    fr: "Temps du présent",
    it: "Tempi al presente",
    es: "Tiempos del presente",
    zh: "现在时态",
    ja: "現在時制",
    ko: "현재 시제"
  },
  "Past Tenses (Simple, Continuous, Perfect, Perfect Continuous)": {
    ru: "Прошедшие времена",
    de: "Vergangenheits-Zeitformen",
    fr: "Temps du passé",
    it: "Tempi al passato",
    es: "Tiempos del pasado",
    zh: "过去时态",
    ja: "過去時制",
    ko: "과거 시제"
  },
  "Future Forms & Expressing the Future": {
    ru: "Будущее время",
    de: "Zukunft-Zeitformen",
    fr: "Formes du futur",
    it: "Forme future",
    es: "Formas del futuro",
    zh: "将来时态",
    ja: "未来時制",
    ko: "미래 시제"
  },
  "Conditionals (Zero, First, Second, Third, and Mixed Conditionals)": {
    ru: "Условные предложения",
    de: "Konditionalsätze",
    fr: "Conditionnels",
    it: "Condizionali",
    es: "Condicionales",
    zh: "条件句",
    ja: "仮定法・条件文",
    ko: "조건문"
  },
  "Passive Voice & Causative Structures (Have/Get something done)": {
    ru: "Пассивный залог и каузатив",
    de: "Passiv & Kausativ",
    fr: "Voix passive & causatives",
    it: "Forma passiva e causativa",
    es: "Voz pasiva y causativos",
    zh: "被动语态与使役",
    ja: "受動態と使役文",
    ko: "수동태 및 사역 구조"
  },
  "Modal Verbs (Ability, Obligation, Permission, Deduction)": {
    ru: "Модальные глаголы",
    de: "Modalverben",
    fr: "Verbes modaux",
    it: "Verbi modali",
    es: "Verbos modales",
    zh: "情态动词",
    ja: "助動詞",
    ko: "조동사"
  },
  "Gerunds and Infinitives (Verb patterns)": {
    ru: "Герундий и инфинитив",
    de: "Gerundium & Infinitiv",
    fr: "Gérondifs & infinitifs",
    it: "Gerundi e infiniti",
    es: "Gerundios e infinitivos",
    zh: "动名词与不定式",
    ja: "動名詞と不定詞",
    ko: "동명사와 부정사"
  },
  "Articles (A, An, The, Zero Article)": {
    ru: "Артикли",
    de: "Artikel",
    fr: "Articles",
    it: "Articoli",
    es: "Artículos",
    zh: "冠词",
    ja: "冠詞",
    ko: "관사"
  },
  "Relative Clauses (Defining and Non-defining)": {
    ru: "Относительные придаточные",
    de: "Relativsätze",
    fr: "Propositions relatives",
    it: "Frasi relative",
    es: "Oraciones de relativo",
    zh: "关系从句",
    ja: "関係節",
    ko: "관계절"
  },
  "Reported Speech & Indirect Questions": {
    ru: "Косвенная речь",
    de: "Indirekte Rede",
    fr: "Discours rapporté",
    it: "Discorso indiretto",
    es: "Estilo indirecto",
    zh: "间接引语",
    ja: "直接話法と間接話法",
    ko: "간접 화법"
  },
  "Subjunctive Mood & Inversion (e.g., Had I known..., Bare Infinitive)": {
    ru: "Сослагательное наклонение и инверсия",
    de: "Konjunktiv & Inversion",
    fr: "Subjonctif & inversion",
    it: "Congiuntivo e inversione",
    es: "Subjuntivo e inversión",
    zh: "虚拟语气与倒装",
    ja: "仮定法と倒置",
    ko: "가정법 및 도치"
  },
  "Phrasal Verbs (Idiomatic particle verbs)": {
    ru: "Фразовые глаголы",
    de: "Phrasal Verbs",
    fr: "Verbes à particule",
    it: "Verbi frasali",
    es: "Verbos frasales",
    zh: "短语动词",
    ja: "句動詞",
    ko: "구동사"
  },
  "Prepositions of Place, Time, and Dependent Prepositions": {
    ru: "Предлоги места, времени и зависимые предлоги",
    de: "Präpositionen",
    fr: "Prépositions",
    it: "Preposizioni",
    es: "Preposiciones",
    zh: "介词",
    ja: "前置詞",
    ko: "전치사"
  },
  "Adjectives vs. Adverbs (Comparatives, Superlatives, and Order)": {
    ru: "Прилагательные и наречия",
    de: "Adjektive vs. Adverbien",
    fr: "Adjectifs & adverbes",
    it: "Aggettivi e avverbi",
    es: "Adjetivos y adverbios",
    zh: "形容词与副词",
    ja: "形容詞と副詞",
    ko: "형용사 및 부사"
  },
  "Pronouns & Determiners (Quantifiers: Few, Little, Most, Each, Every)": {
    ru: "Местоимения и определители",
    de: "Pronomen & Quantoren",
    fr: "Pronoms & déterminants",
    it: "Pronomi e determinanti",
    es: "Pronombres y determinantes",
    zh: "代词与限定词",
    ja: "代名詞と限定詞",
    ko: "대명사 및 한정사"
  },
  "Conjunctions & Discourse Markers (Linking words)": {
    ru: "Союзы и дискурсивные маркеры",
    de: "Konjunktionen & Bindewörter",
    fr: "Conjonctions & connecteurs",
    it: "Congiunzioni",
    es: "Conjunciones y conectores",
    zh: "连词与语篇标志",
    ja: "接続詞とディスコースマーカー",
    ko: "접속사 및 담화 표지"
  },
  "Idioms, Collocations & Advanced Lexis": {
    ru: "Идиомы и коллокации",
    de: "Idiome & Kollokationen",
    fr: "Idiotismes & collocations",
    it: "Idiomi e collocazioni",
    es: "Modismos y colocaciones",
    zh: "习语与搭配",
    ja: "イディオムとコロケーション",
    ko: "관용구 및 연어"
  },
  "Common Mistakes & False Friends": {
    ru: "Типичные ошибки и ложные друзья",
    de: "Typische Fehler & Falsche Freunde",
    fr: "Erreurs courantes",
    it: "Errori comuni",
    es: "Errores comunes",
    zh: "常见错误与易混词",
    ja: "よくある間違いと空似言葉",
    ko: "흔한 실수 및 거짓 친구"
  }
};

const getHybridTopicName = (item: string, lang: string) => {
  if (lang === "en" || !TOPICS_DICTIONARY[item]) return item;
  const localized = TOPICS_DICTIONARY[item][lang];
  return localized ? `${localized} (${item})` : item;
};

const parseMultipleChoiceQuestion = (qText: string) => {
  const colonIndex = qText.indexOf(":");
  if (colonIndex !== -1) {
    const instruction = qText.substring(0, colonIndex + 1).trim();
    let sentence = qText.substring(colonIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (sentence.startsWith("'") && sentence.endsWith("'")) || 
      (sentence.startsWith('"') && sentence.endsWith('"')) ||
      (sentence.startsWith('‘') && sentence.endsWith('’')) ||
      (sentence.startsWith('“') && sentence.endsWith('”'))
    ) {
      sentence = sentence.substring(1, sentence.length - 1).trim();
    }
    sentence = sentence.replace(/^['"“‘](.*)['"”’]$/, '$1').trim();
    return { instruction, sentence };
  }
  
  const quoteMatch = qText.match(/^(Choose the correct option.*?)\s+['"“‘](.*?)['"”’]\.?$/i) ||
                    qText.match(/^(Select the correct option.*?)\s+['"“‘](.*?)['"”’]\.?$/i);
  if (quoteMatch) {
    let sentence = quoteMatch[2].trim();
    sentence = sentence.replace(/^['"“‘](.*)['"”’]$/, '$1').trim();
    return {
      instruction: quoteMatch[1].trim(),
      sentence
    };
  }

  if (qText.includes("________") || qText.includes("[blank]")) {
    return {
      instruction: "Choose the correct option to fill the blank:",
      sentence: qText
    };
  }

  return {
    instruction: "Choose the correct option to complete the sentence:",
    sentence: qText
  };
};

export default function App() {
  // UI Language Switcher state
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("linguist_ui_language");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("linguist_ui_language", lang);
  }, [lang]);

  // Helper translation function
  const t = (key: keyof import("./translations").TranslationSet, variables?: Record<string, string | number>) => {
    const dict = LOCALIZED_TEXT[lang] || LOCALIZED_TEXT.en;
    let text = dict[key] || LOCALIZED_TEXT.en[key] || "";
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return text;
  };

  // Admin-related states
  const [serverHasKey, setServerHasKey] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(() => {
    return window.location.search.includes("admin=true");
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("admin_logged_in") === "true";
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminApiKeyInput1, setAdminApiKeyInput1] = useState<string>(() => {
    return localStorage.getItem("cached_admin_api_key_1") || "";
  });
  const [adminApiKeyInput2, setAdminApiKeyInput2] = useState<string>(() => {
    return localStorage.getItem("cached_admin_api_key_2") || "";
  });
  const [adminApiKeyInput3, setAdminApiKeyInput3] = useState<string>(() => {
    return localStorage.getItem("cached_admin_api_key_3") || "";
  });
  const [showAdminApiKey, setShowAdminApiKey] = useState<boolean>(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminSaveMessage, setAdminSaveMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);

  // New dynamic model and admin password management states
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [isSavingModel, setIsSavingModel] = useState<boolean>(false);
  const [modelSaveMessage, setModelSaveMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [adminNewPassword, setAdminNewPassword] = useState<string>("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState<string>("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordSaveMessage, setPasswordSaveMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Student Portal / Session states
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const saved = localStorage.getItem("linguist_student_username");
    return saved ? saved.toLowerCase().trim() : null;
  });
  const [nicknameInput, setNicknameInput] = useState<string>("");
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [hasExistingProfile, setHasExistingProfile] = useState<boolean>(false);
  const [baseline, setBaseline] = useState<string>("B1");
  const [goal, setGoal] = useState<string>("C1");
  const [testHistory, setTestHistory] = useState<TestLog[]>([]);
  const [targetTestCount, setTargetTestCount] = useState<number>(12);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<string | null>(() => {
    return localStorage.getItem("linguist_session_start_timestamp");
  });
  const [testsCompletedThisSession, setTestsCompletedThisSession] = useState<number>(() => {
    const saved = localStorage.getItem("linguist_tests_completed_this_session");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showSessionCompletionModal, setShowSessionCompletionModal] = useState<boolean>(false);

  // Score Prediction Sandbox States
  const [sandboxLevel, setSandboxLevel] = useState<string>("");
  const [sandboxAccuracy, setSandboxAccuracy] = useState<number | null>(null);
  const [sandboxQuestionCount, setSandboxQuestionCount] = useState<number | null>(null);
  const [useLatestForPrediction, setUseLatestForPrediction] = useState<boolean>(false);

  useEffect(() => {
    if (sessionStartTimestamp) {
      localStorage.setItem("linguist_session_start_timestamp", sessionStartTimestamp);
    } else {
      localStorage.removeItem("linguist_session_start_timestamp");
    }
  }, [sessionStartTimestamp]);

  useEffect(() => {
    localStorage.setItem("linguist_tests_completed_this_session", String(testsCompletedThisSession));
  }, [testsCompletedThisSession]);

  const activeTestHistory = useMemo(() => {
    if (!sessionStartTimestamp) return testHistory;
    return testHistory.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      const startTime = new Date(sessionStartTimestamp).getTime();
      return logTime >= startTime;
    });
  }, [testHistory, sessionStartTimestamp]);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [testSubmitError, setTestSubmitError] = useState<string | null>(null);
  const [showChartGuide, setShowChartGuide] = useState<boolean>(false);
  const [showForecast, setShowForecast] = useState<boolean>(false);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);

  const LEVEL_VALUES: { [key: string]: number } = {
    "A1": 1,
    "A2": 2,
    "B1": 3,
    "B2": 4,
    "C1": 5,
    "C2": 6
  };

  const calculateRoadmapStats = (base: string, target: string) => {
    const baseVal = LEVEL_VALUES[base] || 1;
    const targetVal = LEVEL_VALUES[target] || 1;
    const gap = Math.max(1, targetVal - baseVal);
    
    let scaler = 1.0;
    if (targetVal === 6) {
      scaler = gap === 5 ? 1.5 : (gap === 4 ? 1.8 : (gap === 3 ? 2.2 : (gap === 2 ? 3.0 : 4.2)));
    } else if (targetVal === 5) {
      scaler = gap === 4 ? 1.8 : 2.5;
    } else if (targetVal === 4) {
      scaler = 1.6;
    } else if (targetVal === 3) {
      scaler = 1.2;
    } else {
      scaler = 1.1;
    }
    
    const recommendedTests = Math.max(6, Math.round(gap * 6 * scaler));
    const totalQuestions = recommendedTests * 10;
    
    return {
      gap,
      recommendedTests,
      totalQuestions
    };
  };

  const getAIRecommendation = (base: string, target: string) => {
    const baseVal = LEVEL_VALUES[base] || 1;
    const targetVal = LEVEL_VALUES[target] || 1;
    const gap = targetVal - baseVal;
    const { recommendedTests, totalQuestions } = calculateRoadmapStats(base, target);

    if (gap >= 3) {
      return t("aiRecMultiTierLeap", { tests: recommendedTests, questions: totalQuestions });
    }
    if (target === "C2") {
      return t("aiRecC2Mastery", { tests: recommendedTests, questions: totalQuestions });
    }
    if (target === "C1") {
      return t("aiRecC1Leap", { tests: recommendedTests, questions: totalQuestions });
    }
    if (target === "B2") {
      return t("aiRecB2Fluency", { tests: recommendedTests, questions: totalQuestions });
    }
    if (target === "A2" || target === "B1") {
      return t("aiRecFoundationalTier", { tests: recommendedTests, questions: totalQuestions });
    }
    return t("aiRecDefaultCommitment", { tests: recommendedTests });
  };

  // Profile lookup helpers
  const getStudentProfile = (nickname: string): StudentProfile => {
    const data = localStorage.getItem(`student_${nickname}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        // ignore parsing error
      }
    }
    return {
      nickname,
      baselineLevel: "",
      goalLevel: "",
      testHistory: []
    };
  };

  const saveStudentProfile = (nickname: string, profile: StudentProfile) => {
    localStorage.setItem(`student_${nickname}`, JSON.stringify(profile));
  };

  const refreshTestHistory = async (username: string) => {
    try {
      const { data: resultsData, error: resultsErr } = await supabase
        .from("test_results")
        .select("*")
        .eq("username", username)
        .order("created_at", { ascending: true });

      if (!resultsErr && resultsData) {
        // Sort chronologically by created_at first, and then auto-increment ID to resolve any overlaps
        const sortedData = [...resultsData].sort((a: any, b: any) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.id || 0) - (b.id || 0);
        });

        const mappedHistory = sortedData.map((row: any, idx: number) => {
          const categories = ["multiple_choice_grammar", "key_word_transformation", "redundant_word_elimination"];
          const taskType = categories[idx % categories.length];
          return {
            id: row.id.toString(),
            timestamp: row.created_at || new Date().toISOString(),
            accuracy: row.score,
            totalQuestions: row.total_questions,
            correctAnswers: row.correct_answers,
            topic: "English Grammar",
            taskType: taskType,
            overallPercentage: row.score,
            difficulty: row.test_level || "B1"
          };
        });
        setTestHistory([...mappedHistory]);
      } else {
        setTestHistory([]);
      }
    } catch (e) {
      console.error("Error refreshing test history:", e);
    }
  };

  const loadSupabaseUserAndHistory = async (username: string) => {
    setIsSessionLoading(true);
    setLoginError(null);
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileErr) {
        if (profileErr.code === "PGRST116") {
          // No user found - trigger onboarding flow
          setIsOnboarding(true);
          setBaseline("B1");
          setGoal("C1");
          setTargetTestCount(12);
          setTestHistory([]);
          setHasExistingProfile(false);
        } else {
          // Genuine database / network error
          console.error("Database error fetching profile:", profileErr);
          setLoginError(`Database Error: ${profileErr.message} (Code: ${profileErr.code || "unknown"})`);
          setCurrentUser(null);
        }
      } else if (!profileData) {
        setIsOnboarding(true);
        setBaseline("B1");
        setGoal("C1");
        setTargetTestCount(12);
        setTestHistory([]);
        setHasExistingProfile(false);
      } else {
        setBaseline(profileData.baseline_level || "B1");
        setGoal(profileData.goal_level || "C1");
        setTargetTestCount(profileData.target_test_count || 12);
        setIsOnboarding(false);
        setLoginError(null);
        setHasExistingProfile(true);

        await refreshTestHistory(username);
      }
    } catch (err: any) {
      console.error("Error loading profile from Supabase:", err);
      setLoginError(`Unexpected connection error: ${err.message || err}`);
      setCurrentUser(null);
    } finally {
      setIsSessionLoading(false);
    }
  };

  // Check onboarding status on login
  useEffect(() => {
    if (currentUser) {
      const oldUser = localStorage.getItem("linguist_student_username");
      if (oldUser && oldUser.toLowerCase().trim() !== currentUser.toLowerCase().trim()) {
        // Different user logged in - reset active session stats
        setSessionStartTimestamp(null);
        setTestsCompletedThisSession(0);
        setShowSessionCompletionModal(false);
      }
      localStorage.setItem("linguist_student_username", currentUser);
      loadSupabaseUserAndHistory(currentUser);
    } else {
      localStorage.removeItem("linguist_student_username");
      setTestHistory([]);
      setIsOnboarding(false);
    }
  }, [currentUser]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNickname = nicknameInput.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanNickname) return;
    setCurrentUser(cleanNickname);
  };

  const handleSaveOnboarding = async () => {
    if (!currentUser) return;
    setIsSessionLoading(true);
    setOnboardingError(null);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          username: currentUser,
          nickname: currentUser,
          selected_level: baseline,
          baseline_level: baseline,
          goal_level: goal,
          target_test_count: targetTestCount
        }, { onConflict: "username" });

      if (error) {
        console.error("Failed to save profile to Supabase:", error);
        setOnboardingError(`Failed to save configuration: ${error.message}`);
        return; // Stay on onboarding screen
      }

      // 1. Completely flush any placeholder/stale seed data & reset exam states
      setCurrentExam({
        topic: "-- ALL GRAMMAR TOPICS (Mixed Exam) --",
        difficulty: baseline,
        exercises: []
      });
      setSelectedAnswers({});
      setSubmitted(false);
      setExplanationVisible({});
      setShowValidation(false);

      // 2. Correctly serialize the newly selected level metrics into form state
      setDifficulty(baseline);
      setTopic("-- ALL GRAMMAR TOPICS (Mixed Exam) --");
      setTaskType("mixed");
      setThemeContext("General / Mixed Topics");
      setCustomTopic("");
      setCustomTheme("");
      setCount(5);

      // 3. Initialize a clean, properly structured local session payload/profile
      saveStudentProfile(currentUser, {
        nickname: currentUser,
        baselineLevel: baseline,
        goalLevel: goal,
        testHistory: [],
        targetTestCount: targetTestCount
      });

      setOnboardingError(null);
      setTestHistory([]);
      setSessionStartTimestamp(new Date().toISOString());
      setTestsCompletedThisSession(0);
      setHasExistingProfile(true);
      setIsOnboarding(false);
    } catch (err: any) {
      console.error("Error saving onboarding to Supabase:", err);
      setOnboardingError(`Unexpected save error: ${err.message || err}`);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleLogOutStudent = () => {
    setCurrentUser(null);
    setNicknameInput("");
    setSessionStartTimestamp(null);
    setTestsCompletedThisSession(0);
    setShowSessionCompletionModal(false);
    setHasExistingProfile(false);
    localStorage.removeItem("linguist_session_start_timestamp");
    localStorage.removeItem("linguist_tests_completed_this_session");
  };

  // Status check for server-side API Key on boot
  const checkServerKeyStatus = async () => {
    try {
      const res = await fetch("/api/admin/status");
      if (res.ok) {
        const data = await res.json();
        setServerHasKey(data.isKeySet);
        if (data.selectedModel) {
          setSelectedModel(data.selectedModel);
        }
      }
    } catch (err) {
      console.error("Failed to check server key state:", err);
    }
  };

  useEffect(() => {
    checkServerKeyStatus();
  }, []);

  // Fetch secret keys from the server securely
  const fetchSecretKeys = async (pwd?: string) => {
    const passwordToUse = pwd || adminPasswordInput;
    if (!passwordToUse) return;

    try {
      const res = await fetch("/api/admin/get-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordToUse })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.apiKeys)) {
          setAdminApiKeyInput1(data.apiKeys[0] || "");
          setAdminApiKeyInput2(data.apiKeys[1] || "");
          setAdminApiKeyInput3(data.apiKeys[2] || "");
          localStorage.setItem("cached_admin_api_key_1", data.apiKeys[0] || "");
          localStorage.setItem("cached_admin_api_key_2", data.apiKeys[1] || "");
          localStorage.setItem("cached_admin_api_key_3", data.apiKeys[2] || "");
        }
      }
    } catch (err) {
      console.error("Failed to load secret keys from server:", err);
    }
  };

  // Handle Admin Password Login securely with the backend
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPasswordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminLoggedIn(true);
        setAdminLoginError(null);
        localStorage.setItem("admin_logged_in", "true");
        // Pull down the active settings
        checkServerKeyStatus();
        fetchSecretKeys(adminPasswordInput);
      } else {
        setAdminLoginError(data.error || "Invalid administrator password.");
      }
    } catch (err: any) {
      setAdminLoginError("Communication failure. Please verify the server is running.");
    }
  };

  // Handle Admin Log Out
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminPasswordInput("");
    setAdminSaveMessage(null);
    setModelSaveMessage(null);
    setPasswordSaveMessage(null);
    localStorage.removeItem("admin_logged_in");
  };

  // Handle Admin Keys Save (Keys 1, 2, 3 as rotation array)
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKey(true);
    setAdminSaveMessage(null);

    const passwordToUse = adminPasswordInput

    try {
      // 1. Pull the entire current array/object state of API keys from the server first to ensure full structural integrity
      let currentServerKeys: string[] = ["", "", ""];
      try {
        const getRes = await fetch("/api/admin/get-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: passwordToUse })
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          if (Array.isArray(getData.apiKeys)) {
            currentServerKeys = [
              getData.apiKeys[0] || "",
              getData.apiKeys[1] || "",
              getData.apiKeys[2] || ""
            ];
          }
        }
      } catch (getErr) {
        console.warn("Failed to pre-fetch keys for merging, falling back to local input states:", getErr);
      }

      // 2. Merge current server key structure with inputs cleanly
      const keysArray = [
        adminApiKeyInput1 !== undefined ? adminApiKeyInput1.trim() : (currentServerKeys[0] || ""),
        adminApiKeyInput2 !== undefined ? adminApiKeyInput2.trim() : (currentServerKeys[1] || ""),
        adminApiKeyInput3 !== undefined ? adminApiKeyInput3.trim() : (currentServerKeys[2] || "")
      ];

      // 3. Save the full collection payload so that all items persist globally
      const res = await fetch("/api/admin/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordToUse,
          apiKeys: keysArray
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save keys.");
      }

      // 4. Update local input states & localStorage caches with the fully persisted collection
      setAdminApiKeyInput1(keysArray[0]);
      setAdminApiKeyInput2(keysArray[1]);
      setAdminApiKeyInput3(keysArray[2]);
      localStorage.setItem("cached_admin_api_key_1", keysArray[0]);
      localStorage.setItem("cached_admin_api_key_2", keysArray[1]);
      localStorage.setItem("cached_admin_api_key_3", keysArray[2]);
      
      // 5. Wrap and write all three key input fields to Supabase in the '__project_links__' profile row to ensure multi-device sync
      try {
        await supabase
          .from("user_profiles")
          .upsert({
            username: "__project_links__",
            nickname: JSON.stringify(projectLinks),
            selected_level: keysArray[0] || "B1",
            baseline_level: keysArray[1] || "B1",
            goal_level: keysArray[2] || "C1",
            target_test_count: 0
          }, { onConflict: "username" });
      } catch (dbErr) {
        console.warn("Failed to backup keys to fallback row in Supabase user_profiles:", dbErr);
      }
      
      setAdminSaveMessage({ text: data.message, error: false });
      
      // Update local flag indicating key pool is alive
      setServerHasKey(!!(keysArray[0] || keysArray[1] || keysArray[2]));
    } catch (error: any) {
      setAdminSaveMessage({ text: error.message || "Failed to update key pool.", error: true });
    } finally {
      setIsSavingKey(false);
    }
  };

  // Save selected model choice dynamically
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingModel(true);
    setModelSaveMessage(null);
    try {
      const res = await fetch("/api/admin/change-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPasswordInput,
          selectedModel: selectedModel
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change active model.");
      }
      setModelSaveMessage({ text: data.message, error: false });
    } catch (err: any) {
      setModelSaveMessage({ text: err.message || "Failed to save model choice.", error: true });
    } finally {
      setIsSavingModel(false);
    }
  };

  // Handle changing admin login password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewPassword.trim()) {
      setPasswordSaveMessage({ text: "The new password cannot be blank.", error: true });
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setPasswordSaveMessage({ text: "Passwords do not match. Please verify and try again.", error: true });
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordSaveMessage(null);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPasswordInput,
          newPassword: adminNewPassword.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save new password.");
      }
      setPasswordSaveMessage({ text: data.message, error: false });
      setAdminPasswordInput(adminNewPassword.trim());
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (err: any) {
      setPasswordSaveMessage({ text: err.message || "Failed to update password.", error: true });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Exam states
  const [currentExam, setCurrentExam] = useState<ExamSet>(INITIAL_EXAM);
  const [previouslyGeneratedQuestions, setPreviouslyGeneratedQuestions] = useState<string[]>(() => {
    return INITIAL_EXAM.exercises.map(ex => {
      return [ex.question, ex.passage, ex.original_sentence].filter(Boolean).join(" | ");
    });
  });
  const [selectedAnswers, setSelectedAnswers] = useState<{ [exerciseId: number]: string }>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [explanationVisible, setExplanationVisible] = useState<{ [exerciseId: number]: boolean }>({});
  const [showValidation, setShowValidation] = useState<boolean>(false);

  // Premium & Reactive "My Other Projects" link widget states
  const [projectLinks, setProjectLinks] = useState<{ id: string; name: string; url: string }[]>(() => {
    const saved = localStorage.getItem("linguist_project_links");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: "1", name: "AI Vocabulary Builder", url: "https://ai.studio/build" },
      { id: "2", name: "Grammar Master Pro", url: "https://ai.studio/build" }
    ];
  });
  const [newLinkName, setNewLinkName] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");

  const fetchProjectLinksFromSupabase = async () => {
    try {
      let combinedLinks: { id: string; name: string; url: string }[] = [];
      
      // 1. Try dedicated table first
      const { data, error } = await supabase
        .from("project_links")
        .select("*");
      
      if (!error && data && data.length > 0) {
        combinedLinks = data.map((item: any) => ({
          id: String(item.id || item.link_id),
          name: item.name || item.link_name || "",
          url: item.url || item.link_url || ""
        }));
      }
      
      // 2. Also fetch from fallback user_profiles to ensure we never lose anything past index 0
      const { data: profData, error: profError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("username", "__project_links__")
        .single();
         
      if (!profError && profData) {
        // Load the keys if present in '__project_links__' profile row
        if (profData.selected_level && profData.selected_level !== "B1") {
          setAdminApiKeyInput1(profData.selected_level);
          localStorage.setItem("cached_admin_api_key_1", profData.selected_level);
        }
        if (profData.baseline_level && profData.baseline_level !== "B1") {
          setAdminApiKeyInput2(profData.baseline_level);
          localStorage.setItem("cached_admin_api_key_2", profData.baseline_level);
        }
        if (profData.goal_level && profData.goal_level !== "C1") {
          setAdminApiKeyInput3(profData.goal_level);
          localStorage.setItem("cached_admin_api_key_3", profData.goal_level);
        }

        if (profData.nickname) {
          try {
            const parsed = JSON.parse(profData.nickname);
            if (Array.isArray(parsed)) {
              const linkMap = new Map();
              combinedLinks.forEach(l => linkMap.set(l.id, l));
              parsed.forEach(l => linkMap.set(l.id, l));
              combinedLinks = Array.from(linkMap.values());
            }
          } catch {}
        }
      }

      if (combinedLinks.length > 0) {
        setProjectLinks(combinedLinks);
        localStorage.setItem("linguist_project_links", JSON.stringify(combinedLinks));
      }
    } catch (e) {
      console.error("Failed to fetch project links from Supabase, using local fallback", e);
    }
  };

  const saveProjectLinksToSupabase = async (links: { id: string; name: string; url: string }[]) => {
    try {
      // 1. Update the dedicated table by clearing and inserting the exact links collection (no merge, so deletions persist)
      const { error: delError } = await supabase.from("project_links").delete().not("id", "is", null);
      if (!delError) {
        const rows = links.map(l => ({ id: l.id, name: l.name, url: l.url }));
        await supabase.from("project_links").insert(rows);
      }
      
      // 2. Overwrite the __project_links__ fallback row with the exact updated links and current keys
      await supabase
        .from("user_profiles")
        .upsert({
          username: "__project_links__",
          nickname: JSON.stringify(links),
          selected_level: adminApiKeyInput1 || "B1",
          baseline_level: adminApiKeyInput2 || "B1",
          goal_level: adminApiKeyInput3 || "C1",
          target_test_count: 0
        }, { onConflict: "username" });
    } catch (e) {
      console.error("Failed to save project links to Supabase:", e);
    }
  };

  useEffect(() => {
    fetchProjectLinksFromSupabase();
  }, []);

  const handleCancelOnboarding = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsOnboarding(false);
  };

  const handleAddProjectLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    
    let formattedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    const newLink = {
      id: Date.now().toString(),
      name: newLinkName.trim(),
      url: formattedUrl
    };

    const updated = [...projectLinks, newLink];
    setProjectLinks(updated);
    localStorage.setItem("linguist_project_links", JSON.stringify(updated));
    setNewLinkName("");
    setNewLinkUrl("");

    await saveProjectLinksToSupabase(updated);
  };

  const handleRemoveProjectLink = async (id: string) => {
    const updated = projectLinks.filter(link => link.id !== id);
    setProjectLinks(updated);
    localStorage.setItem("linguist_project_links", JSON.stringify(updated));

    await saveProjectLinksToSupabase(updated);
  };

  const isQuestionAnswered = (ex: Exercise) => {
    const ans = selectedAnswers[ex.id];
    if (ans === undefined || ans === null) return false;
    if (ex.type === "error-correction") {
      if (!ans.includes("|")) return false;
      const [w, c] = ans.split("|");
      return w.trim() !== "" && c.trim() !== "";
    }
    return ans.trim() !== "";
  };

  // Form generator states
  const [topic, setTopic] = useState<string>("-- ALL GRAMMAR TOPICS (Mixed Exam) --");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("B1");
  const [count, setCount] = useState<number>(5);
  const [taskType, setTaskType] = useState<string>("mixed");
  const [themeContext, setThemeContext] = useState<string>("General / Mixed Topics");
  const [customTheme, setCustomTheme] = useState<string>("");
  
  // Fisher-Yates programmatic option shuffler helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  
  // Progress/API states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selection handlers
  const handleSelectAnswer = (exerciseId: number, answer: string) => {
    if (submitted) return; // Lock selections after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [exerciseId]: answer
    }));
  };

  const toggleExplanation = (exerciseId: number) => {
    setExplanationVisible(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  // Submit test
  const handleSubmitQuiz = async () => {
    // Pre-submission validation check
    const unansweredExercises = currentExam.exercises.filter(ex => !isQuestionAnswered(ex));
    if (unansweredExercises.length > 0) {
      setShowValidation(true);
      // Automatically and smoothly scroll the browser window to the very first unanswered question
      const firstUnanswered = unansweredExercises[0];
      const element = document.getElementById(`question-card-${firstUnanswered.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return; // PREVENT submission
    }

    setSubmitted(true);
    setTestSubmitError(null);
    
    if (currentUser) {
      let correctCount = 0;
      currentExam.exercises.forEach(ex => {
        if (isAnswerCorrect(ex, selectedAnswers[ex.id])) {
          correctCount++;
        }
      });
      const totalQuestions = currentExam.exercises.length;
      const pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      
      // Optimistic update to guarantee instant, zero-latency re-render of SVG trajectory and counters
      const categories = ["multiple_choice_grammar", "key_word_transformation", "redundant_word_elimination"];
      const nextIdx = testHistory.length;
      const optimisticTaskType = categories[nextIdx % categories.length];

      const newLocalLog = {
        id: "temp_" + Date.now(),
        timestamp: new Date().toISOString(),
        accuracy: pct,
        totalQuestions: totalQuestions,
        correctAnswers: correctCount,
        topic: "English Grammar",
        taskType: optimisticTaskType,
        overallPercentage: pct,
        difficulty: currentExam.difficulty || difficulty || "B1"
      };
      
      setTestHistory(prev => {
        const updated = [...prev, newLocalLog];
        return updated.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });

      try {
        const { error } = await supabase
          .from("test_results")
          .insert({
            username: currentUser,
            score: pct,
            total_questions: totalQuestions,
            correct_answers: correctCount,
            created_at: new Date().toISOString(),
            test_level: currentExam.difficulty || difficulty || "B1"
          });

        if (error) {
          console.error("Failed to save test result to Supabase: " + JSON.stringify(error));
          setTestSubmitError(`Failed to save results to cloud: ${error.message} (Code: ${error.code})`);
        } else {
          setTestSubmitError(null);
        }
      } catch (e: any) {
        console.error("Unexpected error saving test result:", e);
        setTestSubmitError(`Unexpected error saving results: ${e.message || e}`);
      }
      
      await refreshTestHistory(currentUser);

      const nextCount = testsCompletedThisSession + 1;
      setTestsCompletedThisSession(nextCount);
      if (nextCount === targetTestCount) {
        setShowSessionCompletionModal(true);
      }
    }
  };

  // Reset current attempt
  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setExplanationVisible({});
    setShowValidation(false);
    setCurrentExam({
      topic: "",
      difficulty: "",
      exercises: []
    });
  };

  const isAnswerCorrect = (ex: Exercise, userAns: string) => {
    if (!userAns) return false;
    const cleanUser = userAns.trim().toLowerCase();
    const cleanCorrect = (ex.correct_answer || "").trim().toLowerCase();

    if (ex.type === "error-correction") {
      const cParts = (ex.correct_answer || "").split("|").map(s => s.trim().toLowerCase());
      const correctWord = cParts[0] || "";
      const correctReplacement = cParts.length > 1 ? cParts[1] || "" : cParts[0] || "";

      if (userAns.includes("|")) {
        const uParts = userAns.split("|");
        const userSelectedPart = uParts[0] || "";
        const userCorrectionText = uParts[1] || "";

        const passage = ex.passage || ex.question || "";
        const words = passage.split(/\s+/).filter(Boolean);
        
        let userSelectedPhrase = userSelectedPart;
        const indexTokens = userSelectedPart.split(",").filter(Boolean);
        const isAllDigits = indexTokens.every(token => /^\d+$/.test(token));
        
        if (isAllDigits && indexTokens.length > 0) {
          const selectedIndices = indexTokens.map(Number);
          userSelectedPhrase = selectedIndices.map(idx => words[idx] || "").join(" ");
        }

        const cleanUserWord = userSelectedPhrase.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
        const cleanCorrectWord = correctWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
        const cleanUserCorrectionText = userCorrectionText.trim().toLowerCase();
        const cleanCorrectReplacement = correctReplacement.trim().toLowerCase();

        return cleanUserWord === cleanCorrectWord && cleanUserCorrectionText === cleanCorrectReplacement;
      } else {
        return cleanUser === correctReplacement;
      }
    }

    if (ex.type === "redundant-word-elimination") {
      const idx = parseInt(userAns, 10);
      if (isNaN(idx)) return false;
      const tokens = (ex.passage || ex.question || "").split(/\s+/);
      const chosenToken = tokens[idx];
      if (!chosenToken) return false;
      const cleanUserToken = chosenToken.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const cleanCorrectTarget = (ex.correct_answer || "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      return cleanUserToken === cleanCorrectTarget;
    }

    if (ex.type === "open-fill-blank" || ex.type === "key-word-transformation") {
      return cleanUser === cleanCorrect;
    }

    return userAns === ex.correct_answer;
  };

  // Calculate score
  const getScore = () => {
    let correctCount = 0;
    currentExam.exercises.forEach(ex => {
      if (isAnswerCorrect(ex, selectedAnswers[ex.id])) {
        correctCount++;
      }
    });
    return correctCount;
  };

  // Trigger Gemini API to generate new questions
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!serverHasKey) {
      setErrorMsg("Please enter your API Key to generate exercises.");
      setLoading(false);
      return;
    }

    const isMockExam = topic === "-- ALL GRAMMAR TOPICS (Mixed Exam) --";
    const chosenTopic = isMockExam ? "Full Mock Exam" : (topic === "custom" ? customTopic.trim() : topic);
    const chosenTaskType = taskType;
    const chosenTheme = isMockExam ? "General / Mixed Topics" : (themeContext === "custom" ? customTheme.trim() : themeContext);

    try {
      const response = await fetch("/api/generate-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: chosenTopic,
          difficulty,
          count,
          taskType: chosenTaskType,
          themeContext: chosenTheme,
          excludeList: previouslyGeneratedQuestions
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch from exam generation API.");
      }

      const data: ExamSet = await response.json();

      if (data && data.exercises) {
        const newQuestions = data.exercises.map(ex => {
          return [ex.question, ex.passage, ex.original_sentence].filter(Boolean).join(" | ");
        });
        setPreviouslyGeneratedQuestions(prev => [...prev, ...newQuestions]);
      }
      
      // Auto-populate custom standard explanations if Gemini doesn't return any, and dynamically shuffle option choices
      const fullyFeaturedExercises = data.exercises.map((ex, index) => {
        let options = ex.options || [];
        if (options.length > 0) {
          options = shuffleArray(options);
        }

        // Auto-populate general_rule if missing
        const general_rule = ex.general_rule || `The correct grammar response is '${ex.correct_answer}' based on standard English rules for ${data.topic} at the ${data.difficulty} level.`;

        // Auto-populate option_feedbacks if missing and there are options
        let option_feedbacks = ex.option_feedbacks || {};
        if (options.length > 0 && Object.keys(option_feedbacks).length === 0) {
          options.forEach(opt => {
            if (opt === ex.correct_answer) {
              option_feedbacks[opt] = `Correct. '${opt}' fits the context perfectly according to standard English rules.`;
            } else {
              option_feedbacks[opt] = `Incorrect choice. '${opt}' does not meet the grammatical or semantic criteria for this sentence.`;
            }
          });
        }

        let original_sentence = ex.original_sentence || "";
        let key_word = ex.key_word || "";
        let incomplete_sentence = ex.incomplete_sentence || "";
        let passage = ex.passage || "";
        let question = ex.question || "";

        if (ex.type === "key-word-transformation") {
          let detectedKeyword = "";
          
          // Helper to extract uppercase word wrapped in asterisks
          const extractKeyword = (text: string) => {
            if (!text) return text;
            const match = text.match(/\*\*([A-Z\s\-]{2,20})\*\*/);
            if (match) {
              detectedKeyword = match[1].trim();
              return text.replace(match[0], "").trim();
            }
            return text;
          };

          let cleanOriginal = original_sentence;
          let cleanIncomplete = incomplete_sentence;
          let cleanQuestion = question;
          let cleanPassage = passage;

          cleanOriginal = extractKeyword(cleanOriginal);
          cleanIncomplete = extractKeyword(cleanIncomplete);
          cleanQuestion = extractKeyword(cleanQuestion);
          cleanPassage = extractKeyword(cleanPassage);

          // If we didn't find it wrapped in asterisks, let's look for any uppercase word on its own line
          if (!detectedKeyword) {
            const checkLines = (text: string) => {
              if (!text) return text;
              const lines = text.split("\n");
              for (let line of lines) {
                const trimmed = line.trim();
                if (/^[A-Z\s\-]{2,20}$/.test(trimmed)) {
                  detectedKeyword = trimmed;
                  return lines.filter(l => l.trim() !== trimmed).join("\n").trim();
                }
              }
              return text;
            };
            cleanOriginal = checkLines(cleanOriginal);
            cleanIncomplete = checkLines(cleanIncomplete);
            cleanQuestion = checkLines(cleanQuestion);
            cleanPassage = checkLines(cleanPassage);
          }

          const finalKeyword = detectedKeyword || key_word || "";

          // Clean up "stray instruction block" or "text remnants from other exercise types"
          const cleanStrayInstructions = (text: string) => {
            if (!text) return text;
            return text
              .replace(/REPLACE SELECTED WORD.*$/gi, "")
              .replace(/Identify the incorrect word.*$/gi, "")
              .replace(/Choose the correct option.*$/gi, "")
              .replace(/Select the best word.*$/gi, "")
              .trim();
          };

          cleanOriginal = cleanStrayInstructions(cleanOriginal);
          cleanIncomplete = cleanStrayInstructions(cleanIncomplete);
          cleanQuestion = cleanStrayInstructions(cleanQuestion);
          cleanPassage = cleanStrayInstructions(cleanPassage);

          let finalOriginal = cleanOriginal || cleanPassage || "";
          let finalIncomplete = cleanIncomplete || cleanQuestion || "";

          // Clean up final values
          if (finalOriginal.startsWith(":") || finalOriginal.startsWith("-")) {
            finalOriginal = finalOriginal.substring(1).trim();
          }
          if (finalIncomplete.startsWith(":") || finalIncomplete.startsWith("-")) {
            finalIncomplete = finalIncomplete.substring(1).trim();
          }

          original_sentence = finalOriginal;
          key_word = finalKeyword;
          incomplete_sentence = finalIncomplete;
        }

        return {
          ...ex,
          id: ex.id || index + 1,
          type: ex.type || "",
          passage: ex.type === "key-word-transformation" ? "" : passage,
          question: ex.type === "key-word-transformation" ? "" : question,
          options,
          correct_answer: ex.correct_answer || "",
          general_rule,
          option_feedbacks,
          original_sentence: ex.type === "key-word-transformation" ? original_sentence : (ex.original_sentence || ""),
          key_word: ex.type === "key-word-transformation" ? key_word : (ex.key_word || ""),
          incomplete_sentence: ex.type === "key-word-transformation" ? incomplete_sentence : (ex.incomplete_sentence || "")
        };
      });

      setCurrentExam({
        topic: data.topic,
        difficulty: data.difficulty,
        exercises: fullyFeaturedExercises
      });
      setSelectedAnswers({});
      setSubmitted(false);
      setExplanationVisible({});
      setShowValidation(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while connecting to Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const isAllAnswered = () => {
    return currentExam.exercises.every(isQuestionAnswered);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-white" id="root-exam-app">
        {projectLinks.length > 0 && (
          <div className="w-full bg-[#1e293b] border-b border-slate-700/80 py-3 px-6 sm:px-8 flex items-center justify-between text-[11px] text-slate-200 font-semibold z-50 shrink-0 shadow-sm" id="global-utility-bar">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="font-extrabold text-slate-100 uppercase tracking-widest text-[9px]">OTHER PROJECTS</span>
            </div>
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar scroll-smooth">
              {projectLinks.map((link, idx) => (
                <React.Fragment key={link.id}>
                  {idx > 0 && <span className="text-slate-600 select-none">|</span>}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 hover:text-blue-400 font-medium transition-colors hover:underline tracking-tight inline-flex items-center space-x-1"
                  >
                    <span>{link.name}</span>
                    <ExternalLink className="h-2.5 w-2.5 text-slate-400 hover:text-blue-400 transition-colors" />
                  </a>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center p-4">
        {/* striking, dark-themed minimalist Student Portal Sign-In card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
          id="student-signin-card"
        >
          {/* Subtle gradient light background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Language selection in Sign-In */}
          <div className="absolute top-4 right-4 z-20">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none font-semibold cursor-pointer"
              id="signin-lang-switcher"
            >
              <option value="en">🇬🇧 EN</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="de">🇩🇪 DE</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="it">🇮🇹 IT</option>
              <option value="es">🇪🇸 ES</option>
              <option value="zh">🇨🇳 ZH</option>
              <option value="ja">🇯🇵 JA</option>
              <option value="ko">🇰🇷 KO</option>
            </select>
          </div>

          <div className="text-center mb-8 relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">{t("studentPortal")}</h2>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">{t("signIntoTrack")}</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5 relative z-10">
            <div>
              <label htmlFor="student-nickname" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {t("alphanumericNickname")}
              </label>
              <input
                type="text"
                id="student-nickname"
                required
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder={t("nicknamePlaceholder")}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                {t("nicknameHint")}
              </p>
            </div>

            {loginError && (
              <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSessionLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/15 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{isSessionLoading ? t("connecting") : t("enterStudentPortal")}</span>
            </button>
          </form>
        </motion.div>
        </div>
      </div>
    );
  }

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white" id="root-exam-app">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="h-10 w-10 text-blue-500 animate-spin" />
          <div>
            <h3 className="text-lg font-bold text-white">{t("synchronizingProfile")}</h3>
            <p className="text-slate-400 text-xs mt-1">{t("calibratingSyllabus")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-white" id="root-exam-app">
        {projectLinks.length > 0 && (
          <div className="w-full bg-[#1e293b] border-b border-slate-700/80 py-3 px-6 sm:px-8 flex items-center justify-between text-[11px] text-slate-200 font-semibold z-50 shrink-0 shadow-sm" id="global-utility-bar">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="font-extrabold text-slate-100 uppercase tracking-widest text-[9px]">OTHER PROJECTS</span>
            </div>
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar scroll-smooth">
              {projectLinks.map((link, idx) => (
                <React.Fragment key={link.id}>
                  {idx > 0 && <span className="text-slate-600 select-none">|</span>}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 hover:text-blue-400 font-medium transition-colors hover:underline tracking-tight inline-flex items-center space-x-1"
                  >
                    <span>{link.name}</span>
                    <ExternalLink className="h-2.5 w-2.5 text-slate-400 hover:text-blue-400 transition-colors" />
                  </a>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
          id="student-onboarding-card"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Compact language selector inside Onboarding screen */}
          <div className="absolute top-4 right-4 z-20">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none font-semibold cursor-pointer"
              id="onboarding-lang-switcher"
            >
              <option value="en">🇬🇧 EN</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="de">🇩🇪 DE</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="it">🇮🇹 IT</option>
              <option value="es">🇪🇸 ES</option>
              <option value="zh">🇨🇳 ZH</option>
              <option value="ja">🇯🇵 JA</option>
              <option value="ko">🇰🇷 KO</option>
            </select>
          </div>

          <div className="text-center mb-6 relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">{t("diagnosticCalibration")}</h2>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">
              {t("welcomeLearner", { name: currentUser || "" })}
            </p>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="select-baseline" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t("currentStartingLevel")}
                </label>
                <select
                  id="select-baseline"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm font-semibold text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="A1" className="bg-slate-900">A1 (Beginner)</option>
                  <option value="A2" className="bg-slate-900">A2 (Elementary)</option>
                  <option value="B1" className="bg-slate-900">B1 (Intermediate)</option>
                  <option value="B2" className="bg-slate-900">B2 (Upper Intermediate)</option>
                  <option value="C1" className="bg-slate-900">C1 (Advanced)</option>
                  <option value="C2" className="bg-slate-900">C2 (Proficiency)</option>
                </select>
              </div>

              <div>
                <label htmlFor="select-goal" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t("targetDestinationLevel")}
                </label>
                <select
                  id="select-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm font-semibold text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="A1" className="bg-slate-900">A1 (Beginner)</option>
                  <option value="A2" className="bg-slate-900">A2 (Elementary)</option>
                  <option value="B1" className="bg-slate-900">B1 (Intermediate)</option>
                  <option value="B2" className="bg-slate-900">B2 (Upper Intermediate)</option>
                  <option value="C1" className="bg-slate-900">C1 (Advanced)</option>
                  <option value="C2" className="bg-slate-900">C2 (Proficiency)</option>
                </select>
              </div>
            </div>

            {/* Roadmap Commitment Slider */}
            <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <label htmlFor="input-target-test-count" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("roadmapCommitment")}
                </label>
                <span className="font-mono text-xs font-bold bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                  {targetTestCount} {t("quizMilestones")} (~{targetTestCount * 10} {t("questions")})
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {t("howManyMilestones")}
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-xs font-mono text-slate-500">4</span>
                <input
                  type="range"
                  id="input-target-test-count"
                  min="4"
                  max="35"
                  value={targetTestCount}
                  onChange={(e) => setTargetTestCount(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none border border-slate-800"
                />
                <span className="text-xs font-mono text-slate-500">35</span>
              </div>
            </div>

            {/* Smart AI Recommendation Notice */}
            <div className="bg-amber-950/20 border border-amber-900/40 text-amber-200/90 rounded-xl p-4 text-xs font-medium space-y-1.5 leading-relaxed shadow-lg">
              <p className="text-amber-400 font-extrabold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                <span>✨</span> {t("aiRecommendationNotice")}
              </p>
              <p className="font-sans font-medium text-slate-300">
                {getAIRecommendation(baseline, goal)}
              </p>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal bg-slate-950 p-3.5 border border-slate-850 rounded-xl">
              {t("establishingCalibration")}
            </p>

            {onboardingError && (
              <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{onboardingError}</span>
              </div>
            )}

            <div className="flex gap-3">
              {hasExistingProfile && (
                <button
                  type="button"
                  onClick={handleCancelOnboarding}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-sm py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 border border-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t("cancel") || "Back"}</span>
                </button>
              )}
              <button
                onClick={handleSaveOnboarding}
                disabled={isSessionLoading}
                className={`flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/15 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 ${!hasExistingProfile ? 'w-full' : ''}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSessionLoading ? t("savingCalibration") : t("saveStartTraining")}</span>
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col" id="root-exam-app">
      {/* Slim, Elegant Global Utility Bar pinned at the ABSOLUTE TOP of the viewport */}
      {projectLinks.length > 0 && (
        <div className="w-full bg-[#1e293b] border-b border-slate-700/80 py-3 px-6 sm:px-8 flex items-center justify-between text-[11px] text-slate-200 font-semibold z-50 shrink-0 shadow-sm" id="global-utility-bar">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="font-extrabold text-slate-100 uppercase tracking-widest text-[9px]">OTHER PROJECTS</span>
          </div>
          <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar scroll-smooth">
            {projectLinks.map((link, idx) => (
              <React.Fragment key={link.id}>
                {idx > 0 && <span className="text-slate-600 select-none">|</span>}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-200 hover:text-blue-400 font-medium transition-colors hover:underline tracking-tight inline-flex items-center space-x-1"
                >
                  <span>{link.name}</span>
                  <ExternalLink className="h-2.5 w-2.5 text-slate-400 hover:text-blue-400 transition-colors" />
                </a>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {/* Sleek Top Navigation Bar */}
      <header className="h-16 bg-[#0f172a] border-b border-slate-800 sticky top-0 z-50 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-md" id="app-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-xs">
            <span className="text-white font-bold text-lg italic">E</span>
          </div>
          <h1 className="text-white font-bold text-lg sm:text-xl tracking-tight">
            Linguist <span className="text-blue-400">Exam</span>
          </h1>
          <span className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 hidden sm:inline-block">
            Gemini GenAI
          </span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Language Switcher Dropdown */}
          <div className="flex items-center gap-2" id="lang-switcher-container">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none hidden md:inline">{t("languageSelect")}</span>
            {/* Mobile View: Compact Flags + Codes */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="block md:hidden bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
              id="lang-switcher-mobile"
            >
              <option value="en">🇬🇧 EN</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="de">🇩🇪 DE</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="it">🇮🇹 IT</option>
              <option value="es">🇪🇸 ES</option>
              <option value="zh">🇨🇳 ZH</option>
              <option value="ja">🇯🇵 JA</option>
              <option value="ko">🇰🇷 KO</option>
            </select>

            {/* Desktop View: Flags + Full Names */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="hidden md:block bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
              id="lang-switcher"
            >
              <option value="en">🇬🇧 English (EN)</option>
              <option value="ru">🇷🇺 Русский (RU)</option>
              <option value="de">🇩🇪 Deutsch (DE)</option>
              <option value="fr">🇫🇷 Français (FR)</option>
              <option value="it">🇮🇹 Italiano (IT)</option>
              <option value="es">🇪🇸 Español (ES)</option>
              <option value="zh">🇨🇳 中文 (ZH)</option>
              <option value="ja">🇯🇵 日本語 (JA)</option>
              <option value="ko">🇰🇷 한국어 (KO)</option>
            </select>
          </div>

          <div className="text-right">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Exam Language</p>
            <p className="text-xs sm:text-sm text-slate-200 font-medium">English Grammar</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 shadow-xs flex items-center justify-center">
            <span className="text-slate-200 font-bold text-xs font-mono">EN</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8" id="app-main-content">

        {/* Diagnostic Path Header Card */}
        {currentUser && (
          <div className="mb-6 bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden" id="personal-track-card">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {/* Left side: Active Learner */}
            <div className="flex items-center space-x-3.5 relative z-10 shrink-0">
              <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/25">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">{t("activeLearner")}</p>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 mt-1.5">
                  {currentUser} 
                  <span className="text-slate-500 text-xs font-normal">| {t("studentPortal")}</span>
                </h2>
              </div>
            </div>

            {/* Middle & Right side containing CEFR and analytics blocks, responsive layout */}
            <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-6 relative z-10 lg:border-l lg:border-slate-800 lg:pl-6 w-full lg:w-auto">
              {/* Personal Track */}
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 leading-none">{t("personalTrack")}</p>
                <div className="inline-flex items-center space-x-2.5 bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-sm font-bold font-mono text-slate-200 mt-1">
                  <span className="text-blue-400">{baseline || "B1"}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="text-green-400">{goal || "C1"}</span>
                </div>
              </div>

              {/* REMAINING ROADMAP TESTS */}
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 leading-none">{t("remainingRoadmapTests")}</p>
                <div className="inline-flex items-center bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-sm font-bold font-mono text-amber-400 mt-1">
                  {Math.max(0, (targetTestCount || 12) - testHistory.length)}
                </div>
              </div>

              {/* RECOMMENDED REMAINING QUESTIONS */}
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 leading-none">{t("recommendedRemainingQs")}</p>
                <div className="inline-flex items-center bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-sm font-bold font-mono text-blue-400 mt-1">
                  {(() => {
                    const bLevel = baseline || "B1";
                    const gLevel = goal || "C1";
                    const { totalQuestions: totalRecQuestions } = calculateRoadmapStats(bLevel, gLevel);
                    const solvedQuestions = testHistory.reduce((sum, q) => sum + q.totalQuestions, 0);
                    return Math.max(0, totalRecQuestions - solvedQuestions);
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 sm:ml-auto">
                {/* Calibration / Adjust Route Button */}
                <button
                  onClick={() => setIsOnboarding(true)}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer self-center"
                  title={t("recalibrate")}
                >
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span>{t("recalibrate")}</span>
                </button>

                {/* Log out/Switch Student Action */}
                <button
                  onClick={handleLogOutStudent}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ml-4 self-center"
                  title={t("switchStudent")}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("switchStudent")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: AI Generator Form Sidebar */}
          <div className="lg:col-span-4 space-y-6" id="generator-sidebar">
            <div className="bg-white rounded-2xl border border-slate-250/60 p-6 shadow-xs">
              <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-3">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{t("quizGenerator")}</h2>
              </div>

              <form onSubmit={handleGenerateExam} className="space-y-4" id="generator-form">
                {/* Friendly warning if no key is configured on server */}
                {!serverHasKey && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col space-y-2 text-amber-700 font-semibold text-xs shadow-xs" id="empty-key-warning-sidebar">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <p className="leading-normal">
                        No custom API key is loaded. Provide a key in the Admin Panel for high-volume generations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(true)}
                      className="w-full bg-slate-900 text-white font-bold py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-[10px] text-center cursor-pointer"
                    >
                      Open Admin Panel
                    </button>
                  </div>
                )}

                {/* Topic Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t("grammarTopic")}
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setCustomTopic(""); // Clear custom input on select change
                    }}
                    id="select-topic"
                  >
                    <option value="-- ALL GRAMMAR TOPICS (Mixed Exam) --">{t("allGrammarTopics")}</option>
                    {SUGGESTED_TOPICS.map((item) => (
                      <option key={item} value={item}>
                        {getHybridTopicName(item, lang)}
                      </option>
                    ))}
                    <option value="custom">-- {t("customTopicName")} --</option>
                  </select>
                </div>

                 {/* Custom Topic text field if 'custom' is selected */}
                {(topic === "custom") && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-xs font-semibold text-slate-600 block">{t("customTopicName")}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 focus:outline-none"
                      placeholder="e.g. Gerund vs Infinitive, Idioms"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      required={topic === "custom"}
                      id="input-custom-topic"
                    />
                  </motion.div>
                )}

                {/* Task Type Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t("taskType")}
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    id="select-task-type"
                  >
                    <option value="mixed">-- {t("mixedFormats")} --</option>
                    <option value="multiple-choice-grammar">{t("multipleChoiceGrammar")}</option>
                    <option value="text-topic-identification">{t("textTopicIdentification")}</option>
                    <option value="contextual-cloze">{t("contextualCloze")}</option>
                    <option value="open-fill-blank">{t("openFillBlank")}</option>
                    <option value="error-correction">{t("errorCorrection")}</option>
                    <option value="key-word-transformation">{t("keyWordTransformation")}</option>
                    <option value="redundant-word-elimination">{t("redundantWordElimination")}</option>
                  </select>
                </div>

                {/* Thematic Context Selection, hidden completely for all grammar topics mixed exam */}
                {topic !== "-- ALL GRAMMAR TOPICS (Mixed Exam) --" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {t("thematicContext")}
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                        value={themeContext}
                        onChange={(e) => {
                          setThemeContext(e.target.value);
                          setCustomTheme(""); // Clear custom input on select change
                        }}
                        id="select-theme"
                      >
                        {THEMATIC_CONTEXTS.map((theme) => (
                          <option key={theme} value={theme}>
                            {theme}
                          </option>
                        ))}
                        <option value="custom">-- {t("customThematicContext")} --</option>
                      </select>
                    </div>

                    {/* Custom Theme text field if 'custom' is selected */}
                    {(themeContext === "custom") && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                      >
                        <label className="text-xs font-semibold text-slate-600 block">{t("customThematicContext")}</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 focus:outline-none"
                          placeholder="e.g. Cooking, Modern Architecture"
                          value={customTheme}
                          onChange={(e) => setCustomTheme(e.target.value)}
                          required={themeContext === "custom"}
                          id="input-custom-theme"
                        />
                      </motion.div>
                    )}
                  </>
                )}

                {/* Grid for Difficulty & Question Count */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {t("difficultyCefr")}
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      id="select-difficulty"
                    >
                      <option value="A1">A1 (Beginner)</option>
                      <option value="A2">A2 (Elementary)</option>
                      <option value="B1">B1 (Intermediate)</option>
                      <option value="B2">B2 (Upper-Intermediate)</option>
                      <option value="C1">C1 (Advanced)</option>
                      <option value="C2">C2 (Proficiency)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {t("questionCount")}
                      </label>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {count} {count === 1 ? 'Question' : t("questions")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="25"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                        id="range-count"
                      />
                      <input
                        type="number"
                        min="1"
                        max="25"
                        value={count}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(25, Number(e.target.value)));
                          setCount(val || 1);
                        }}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-center text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-slate-950 font-mono"
                        id="input-count"
                      />
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                  id="btn-generate-exam"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>{t("generatingQuiz")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-blue-200" />
                      <span>{t("generateQuizButton")}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Hint / API Warning box */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col space-y-3"
                id="error-notification"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-850 space-y-1">
                    <span className="font-bold">Generation Error</span>
                    <p className="font-medium text-red-800 leading-relaxed">{errorMsg}</p>
                    <p className="mt-1 text-slate-500 leading-normal">
                      Tip: Make sure you added your <code className="bg-red-100 px-1 rounded">GEMINI_API_KEY</code> within the AI Studio Secrets tab.
                    </p>
                  </div>
                </div>

                {(errorMsg.toLowerCase().includes("quota") || 
                  errorMsg.toLowerCase().includes("429") || 
                  errorMsg.toLowerCase().includes("exhausted") || 
                  errorMsg.toLowerCase().includes("rate limit") || 
                  errorMsg.toLowerCase().includes("limit exceeded")) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5 text-xs text-amber-900 leading-normal font-medium mt-1">
                    <p className="font-bold text-amber-950 flex items-center gap-1">⚠️ API Quota / Rate Limit Exceeded</p>
                    <p>
                      The default free-tier API keys have reached their quota limits. You can bypass this immediately by using your own Gemini API Key! 
                    </p>
                    <p>
                      It takes 30 seconds to get a free personal API key, and you can add it directly to this app's System Control Panel.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAdminModal(true)}
                        className="bg-slate-900 text-white font-bold rounded-lg px-3.5 py-2 hover:bg-slate-800 transition-colors inline-flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>Open Admin Panel</span>
                      </button>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white border border-amber-300 text-amber-950 font-bold rounded-lg px-3.5 py-2 hover:bg-amber-100 transition-colors inline-flex items-center justify-center text-center cursor-pointer"
                      >
                        Get Free API Key &rarr;
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Quick Suggestions box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hidden lg:block" id="tips-container">
              <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center space-x-1.5">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span>Practice Focus Topics</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Choose a grammar syllabus topic below to set the core of your next study session.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TOPICS.map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => {
                      setTopic(suggested);
                      setCustomTopic("");
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                      (topic === suggested)
                        ? "bg-blue-600 border-blue-700 text-white shadow-xs"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-750"
                    }`}
                  >
                    {getHybridTopicName(suggested, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Quiz Card Area */}
          <div className="lg:col-span-8 space-y-6" id="exam-taker-panel">
            {currentExam.exercises.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center space-y-6 flex flex-col items-center justify-center min-h-[400px]"
                id="idle-session-container"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-xs">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Start a New Practice Session
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    Select a grammar topic, CEFR level, and the desired question count from the generator panel, then click <strong className="text-blue-600">Generate Grammar Challenges</strong> to start a customized practice quiz.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-150 text-[11px] font-bold text-slate-600">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    Powered by Google Gemini GenAI
                  </span>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Topic Information Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="exam-header-card">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-blue-200">
                    Active Exam
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-slate-200">
                    {currentExam.difficulty}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {currentExam.topic}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Complete all custom grammar challenges below to measure your performance.
                </p>
              </div>

              <div className="shrink-0 flex items-center space-x-2">
                <button
                  onClick={handleResetQuiz}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center space-x-1.5 border border-slate-200 cursor-pointer"
                  id="btn-reset"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restart Session</span>
                </button>
              </div>
            </div>

            {/* Score / Completion Summary */}
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-2xl font-sans text-white p-6 shadow-md border border-slate-800 flex items-center justify-between"
                id="result-banner"
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                    Exam Completed
                  </span>
                  <h4 className="text-3xl font-bold mt-1 tracking-tight">
                    Your Score: <span className="text-blue-400">{getScore()} / {currentExam.exercises.length}</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                    {getScore() === currentExam.exercises.length 
                      ? "Flawless score! Exceptional English language command!" 
                      : "Good effort! Review the detailed answers and grammatical breakdowns below."}
                  </p>
                </div>
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-700/80 flex items-center justify-center shrink-0">
                  <Award className="h-10 w-10 text-blue-400" />
                </div>
              </motion.div>
            )}

            {/* Questions List */}
            <div className="space-y-6" id="questions-list">
              {currentExam.exercises.map((exercise, index) => {
                const isCorrect = isAnswerCorrect(exercise, selectedAnswers[exercise.id]);
                const isSelected = (opt: string) => selectedAnswers[exercise.id] === opt;
                const unansweredHighlight = showValidation && !isQuestionAnswered(exercise);

                return (
                  <div
                    key={exercise.id}
                    className={`bg-white rounded-2xl border transition-all duration-300 p-6 ${
                      submitted 
                        ? isCorrect 
                          ? "border-green-300 shadow-xs shadow-green-50/20 bg-green-50/5" 
                          : "border-red-200 shadow-xs shadow-red-50/20 bg-red-50/5"
                        : unansweredHighlight
                          ? "border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)] bg-red-50/5"
                          : "border-slate-200 hover:border-slate-300"
                    }`}
                    id={`question-card-${exercise.id}`}
                  >
                    {/* Exercise Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2.5">
                        <span className="h-6 w-6 text-xs font-bold bg-slate-900 text-white rounded-lg flex items-center justify-center font-mono">
                          {index + 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {exercise.type ? exercise.type.replace("-", " ") : "multiple choice"}
                        </span>
                      </div>
                      
                      {/* Submission state badge */}
                      {submitted && (
                        <span>
                          {isCorrect ? (
                            <span className="text-green-700 bg-green-50 text-[11px] font-bold px-3 py-1 rounded-full border border-green-200 flex items-center space-x-1">
                              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-600" />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="text-red-700 bg-red-50 text-[11px] font-bold px-3 py-1 rounded-full border border-red-200 flex items-center space-x-1">
                              <XCircle className="h-3.5 w-3.5 mt-0.5 text-red-600" />
                              <span>Incorrect</span>
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Render according to Exercise Type */}
                    <div className="space-y-4">
                      {(!exercise.type || exercise.type === "multiple-choice" || exercise.type === "multiple-choice-grammar") && (
                        <>
                          {(() => {
                            const { instruction, sentence } = parseMultipleChoiceQuestion(exercise.question || "");
                            let translatedInstruction = instruction;
                            if (instruction.toLowerCase().includes("fill the blank") || instruction.toLowerCase().includes("fill-in-the-blank")) {
                              translatedInstruction = t("instrChoiceBlank");
                            } else if (instruction.toLowerCase().includes("complete the sentence")) {
                              translatedInstruction = t("instrChoiceSentence");
                            } else {
                              translatedInstruction = t("instrChoiceSentence");
                            }
                            return (
                              <div className="mb-4 flex flex-col space-y-2">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                  {translatedInstruction}
                                </span>
                                <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4">
                                  {sentence}
                                </p>
                              </div>
                            );
                          })()}
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id={`options-${exercise.id}`}>
                            {(exercise.options || []).map((option) => {
                              const isThisCorrectOption = option === exercise.correct_answer;
                              const isThisSelectedOption = isSelected(option);

                              let optionStyle = "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800 cursor-pointer";
                              if (submitted) {
                                if (isThisCorrectOption) {
                                  optionStyle = "bg-green-50 border-green-400 text-green-950 font-semibold cursor-default";
                                } else if (isThisSelectedOption && !isCorrect) {
                                  optionStyle = "bg-red-50 border-red-300 text-red-950 cursor-default";
                                } else {
                                  optionStyle = "bg-slate-50/50 border-slate-100 opacity-55 text-slate-400 cursor-default";
                                }
                              } else if (isThisSelectedOption) {
                                optionStyle = "bg-blue-50 border-blue-600 text-blue-900 font-semibold ring-2 ring-blue-500/20";
                              }

                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleSelectAnswer(exercise.id, option)}
                                  disabled={submitted}
                                  className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all focus:outline-none flex items-center justify-between ${optionStyle}`}
                                >
                                  <span>{option}</span>
                                  {isThisSelectedOption && !submitted && (
                                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {exercise.type === "text-topic-identification" && (
                        <>
                          <div className="mb-3 flex flex-col space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                              {t("instrTopicIdentification")}
                            </span>
                          </div>
                          {exercise.passage && (
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 leading-relaxed text-sm italic font-medium mb-3">
                              {exercise.passage}
                            </div>
                          )}
                          <div className="mb-4">
                            <p className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                              {exercise.question || "Which of the following best summarizes or identifies the main topic of the passage above?"}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id={`options-${exercise.id}`}>
                            {(exercise.options || []).map((option) => {
                              const isThisCorrectOption = option === exercise.correct_answer;
                              const isThisSelectedOption = isSelected(option);

                              let optionStyle = "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800 cursor-pointer";
                              if (submitted) {
                                if (isThisCorrectOption) {
                                  optionStyle = "bg-green-50 border-green-400 text-green-950 font-semibold cursor-default";
                                } else if (isThisSelectedOption && !isCorrect) {
                                  optionStyle = "bg-red-50 border-red-300 text-red-950 cursor-default";
                                } else {
                                  optionStyle = "bg-slate-50/50 border-slate-100 opacity-55 text-slate-400 cursor-default";
                                }
                              } else if (isThisSelectedOption) {
                                optionStyle = "bg-blue-50 border-blue-600 text-blue-900 font-semibold ring-2 ring-blue-500/20";
                              }

                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleSelectAnswer(exercise.id, option)}
                                  disabled={submitted}
                                  className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all focus:outline-none flex items-center justify-between ${optionStyle}`}
                                >
                                  <span>{option}</span>
                                  {isThisSelectedOption && !submitted && (
                                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {exercise.type === "contextual-cloze" && (
                        <>
                          <div className="mb-2">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                              {t("instrClozeInline")}
                            </p>
                            {(() => {
                              const fullText = exercise.passage || exercise.question;
                              const parts = fullText.split(/________|\[blank\]|\[1\]/);
                              return (
                                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-slate-700 leading-relaxed text-sm md:text-base font-medium">
                                  {parts.map((part, pIdx) => (
                                    <React.Fragment key={pIdx}>
                                      {part}
                                      {pIdx < parts.length - 1 && (
                                        <select
                                          value={selectedAnswers[exercise.id] || ""}
                                          onChange={(e) => handleSelectAnswer(exercise.id, e.target.value)}
                                          disabled={submitted}
                                          className={`mx-2 px-2.5 py-1 rounded-lg border text-xs sm:text-sm font-bold inline-block focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                                            submitted
                                              ? selectedAnswers[exercise.id] === exercise.correct_answer
                                                ? "bg-green-100 border-green-400 text-green-950"
                                                : "bg-red-100 border-red-350 text-red-950"
                                              : "bg-white border-slate-300 text-blue-700 hover:border-slate-400 cursor-pointer shadow-xs"
                                          }`}
                                        >
                                          <option value="">-- select --</option>
                                          {(exercise.options || []).map((opt) => (
                                            <option key={opt} value={opt}>
                                              {opt}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          {submitted && !isCorrect && (
                            <div className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
                              Your answer: "{selectedAnswers[exercise.id] || "(None)"}" &bull; Correct: "{exercise.correct_answer}"
                            </div>
                          )}
                        </>
                      )}

                      {exercise.type === "open-fill-blank" && (
                        <>
                          <div className="mb-3 flex flex-col space-y-2">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                              {t("instrOpenFillBlank")}
                            </span>
                            <p className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                              {exercise.question}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={selectedAnswers[exercise.id] || ""}
                              onChange={(e) => handleSelectAnswer(exercise.id, e.target.value)}
                              disabled={submitted}
                              className={`w-full max-w-md bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                                submitted
                                  ? isCorrect
                                    ? "bg-green-50 border-green-400 text-green-950 font-bold"
                                    : "bg-red-50 border-red-300 text-red-950 font-bold"
                                  : "border-slate-200 text-slate-950 placeholder:text-slate-400 focus:bg-white focus:border-blue-500"
                              }`}
                              placeholder="Type your target answer here (case-insensitive)..."
                            />
                            {submitted && !isCorrect && (
                              <div className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 max-w-md">
                                Your answer: "{selectedAnswers[exercise.id] || "(None)"}" &bull; Correct: "{exercise.correct_answer}"
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {exercise.type === "error-correction" && (
                        <>
                          <div className="mb-3">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                              {t("instrErrorCorrection")}
                            </p>
                          </div>

                          {(() => {
                            const passage = exercise.passage || exercise.question || "";
                            const words = passage.split(/\s+/).filter(Boolean);
                            const currentAns = selectedAnswers[exercise.id] || "";
                            
                            const [indicesPart, correctionText] = currentAns.includes("|")
                              ? currentAns.split("|")
                              : ["", currentAns];

                            const selectedIndices = indicesPart 
                              ? indicesPart.split(",").filter(Boolean).map(Number).sort((a, b) => a - b)
                              : [];

                            const selectedPhrase = selectedIndices.map(idx => words[idx] || "").join(" ");

                            const handleWordClick = (wordIdx: number) => {
                              if (submitted) return;
                              let newIndices = [...selectedIndices];
                              if (newIndices.includes(wordIdx)) {
                                newIndices = newIndices.filter(i => i !== wordIdx);
                              } else {
                                newIndices.push(wordIdx);
                              }
                              newIndices.sort((a, b) => a - b);
                              const newIndicesStr = newIndices.join(",");
                              handleSelectAnswer(exercise.id, `${newIndicesStr}|${correctionText}`);
                            };

                            const handleCorrectionChange = (text: string) => {
                              if (submitted) return;
                              const indicesStr = selectedIndices.join(",");
                              handleSelectAnswer(exercise.id, `${indicesStr}|${text}`);
                            };

                            const getCorrectPhraseIndices = () => {
                              const cParts = (exercise.correct_answer || "").split("|").map(s => s.trim().toLowerCase());
                              const correctWord = cParts[0] || "";
                              const correctWords = correctWord.split(/\s+/).filter(Boolean).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase());
                              if (correctWords.length === 0) return [];
                              
                              const cleanedPassageWords = words.map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase());
                              
                              for (let start = 0; start <= cleanedPassageWords.length - correctWords.length; start++) {
                                let match = true;
                                for (let j = 0; j < correctWords.length; j++) {
                                  if (cleanedPassageWords[start + j] !== correctWords[j]) {
                                    match = false;
                                    break;
                                  }
                                }
                                if (match) {
                                  return Array.from({ length: correctWords.length }, (_, idx) => start + idx);
                                }
                              }
                              return cleanedPassageWords.map((cw, idx) => correctWords.includes(cw) ? idx : -1).filter(idx => idx !== -1);
                            };
                            
                            const correctIndices = getCorrectPhraseIndices();

                             return (
                              <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-slate-800 leading-relaxed text-sm font-medium flex flex-wrap gap-y-2.5 gap-x-0 items-center">
                                  {words.map((word, wIdx) => {
                                    const isSelectedWord = selectedIndices.includes(wIdx);
                                    const isCorrectErrorWord = correctIndices.includes(wIdx);

                                    // Check neighbors for grouping selection/correction
                                    let isGroupedLeft = false;
                                    let isGroupedRight = false;

                                    if (submitted) {
                                      if (isSelectedWord && isCorrectErrorWord) {
                                        // True Positive neighbor checks
                                        isGroupedLeft = wIdx > 0 && selectedIndices.includes(wIdx - 1) && correctIndices.includes(wIdx - 1);
                                        isGroupedRight = wIdx < words.length - 1 && selectedIndices.includes(wIdx + 1) && correctIndices.includes(wIdx + 1);
                                      } else if (isSelectedWord && !isCorrectErrorWord) {
                                        // False Positive neighbor checks
                                        isGroupedLeft = wIdx > 0 && selectedIndices.includes(wIdx - 1) && !correctIndices.includes(wIdx - 1);
                                        isGroupedRight = wIdx < words.length - 1 && selectedIndices.includes(wIdx + 1) && !correctIndices.includes(wIdx + 1);
                                      } else if (!isSelectedWord && isCorrectErrorWord) {
                                        // False Negative neighbor checks
                                        isGroupedLeft = wIdx > 0 && !selectedIndices.includes(wIdx - 1) && correctIndices.includes(wIdx - 1);
                                        isGroupedRight = wIdx < words.length - 1 && !selectedIndices.includes(wIdx + 1) && correctIndices.includes(wIdx + 1);
                                      }
                                    } else {
                                      if (isSelectedWord) {
                                        isGroupedLeft = wIdx > 0 && selectedIndices.includes(wIdx - 1);
                                        isGroupedRight = wIdx < words.length - 1 && selectedIndices.includes(wIdx + 1);
                                      }
                                    }

                                    // Rounding styles
                                    let roundedClass = "rounded-lg";
                                    if (isGroupedLeft && isGroupedRight) {
                                      roundedClass = "rounded-none";
                                    } else if (isGroupedLeft) {
                                      roundedClass = "rounded-r-lg rounded-l-none";
                                    } else if (isGroupedRight) {
                                      roundedClass = "rounded-l-lg rounded-r-none";
                                    }

                                    // Padding styles with 1px compensation for border-2 (False Negatives) to prevent layout shifting
                                    let paddingClass = "px-2 py-1";
                                    const isFalseNegative = submitted && !isSelectedWord && isCorrectErrorWord;

                                    if (isFalseNegative) {
                                      if (isGroupedLeft && isGroupedRight) {
                                        paddingClass = "pl-[5px] pr-[5px] py-[3px]";
                                      } else if (isGroupedLeft) {
                                        paddingClass = "pl-[5px] pr-[7px] py-[3px]";
                                      } else if (isGroupedRight) {
                                        paddingClass = "pl-[7px] pr-[5px] py-[3px]";
                                      } else {
                                        paddingClass = "px-[7px] py-[3px]";
                                      }
                                    } else {
                                      if (isGroupedLeft && isGroupedRight) {
                                        paddingClass = "pl-1.5 pr-1.5 py-1";
                                      } else if (isGroupedLeft) {
                                        paddingClass = "pl-1.5 pr-2 py-1";
                                      } else if (isGroupedRight) {
                                        paddingClass = "pl-2 pr-1.5 py-1";
                                      } else {
                                        paddingClass = "px-2 py-1";
                                      }
                                    }

                                    // Margins (to eliminate gap-x space dynamically)
                                    let marginClass = "mx-[3px]";
                                    if (isGroupedLeft && isGroupedRight) {
                                      marginClass = "mx-0";
                                    } else if (isGroupedLeft) {
                                      marginClass = "ml-0 mr-[3px]";
                                    } else if (isGroupedRight) {
                                      marginClass = "ml-[3px] mr-0";
                                    }

                                    // Borders
                                    let borderClass = isFalseNegative ? "border-2 border-dashed" : "border";
                                    if (isGroupedLeft) {
                                      borderClass += " border-l-0";
                                    }
                                    if (isGroupedRight) {
                                      borderClass += " border-r-0";
                                    }

                                    let wordStyle = `hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border-transparent ${marginClass} ${roundedClass} ${paddingClass} ${borderClass}`;
                                    if (submitted) {
                                      if (isSelectedWord && isCorrectErrorWord) {
                                        // TRUE POSITIVE: Solid vibrant green
                                        wordStyle = `bg-green-500/20 text-green-800 ring-2 ring-green-500/20 font-bold cursor-default border-green-500 ${marginClass} ${roundedClass} ${paddingClass} ${borderClass}`;
                                      } else if (isSelectedWord && !isCorrectErrorWord) {
                                        // FALSE POSITIVE: Solid alert red
                                        wordStyle = `bg-red-500/20 text-red-800 ring-2 ring-red-500/20 font-bold cursor-default border-red-500 ${marginClass} ${roundedClass} ${paddingClass} ${borderClass}`;
                                      } else if (!isSelectedWord && isCorrectErrorWord) {
                                        // FALSE NEGATIVE: High contrast dashed green border overlay
                                        wordStyle = `bg-green-500/5 text-green-800 font-bold cursor-default border-green-500/70 ${marginClass} ${roundedClass} ${paddingClass} ${borderClass}`;
                                      } else {
                                        // Normal Unselected Word
                                        wordStyle = `opacity-50 text-slate-400 cursor-default border-transparent ${marginClass} ${roundedClass} ${paddingClass} ${borderClass}`;
                                      }
                                    } else if (isSelectedWord) {
                                      // Solving state clicked: translucent purple capsule theme
                                      wordStyle = `bg-purple-500/20 text-purple-900 ring-2 ring-purple-400/40 font-bold border-purple-400/50 shadow-xs ${marginClass} ${roundedClass} ${paddingClass} ${borderClass}`;
                                    }

                                    return (
                                      <button
                                        key={wIdx}
                                        type="button"
                                        disabled={submitted}
                                        onClick={() => handleWordClick(wIdx)}
                                        className={`transition-all text-sm font-semibold select-none ${wordStyle}`}
                                      >
                                        {word}
                                      </button>
                                    );
                                  })}
                                </div>

                                {!selectedPhrase && !submitted && (
                                  <div className="text-xs text-slate-400 font-medium italic">
                                    💡 Click on the incorrect word or words in the passage above to select them as the error.
                                  </div>
                                )}

                                {selectedPhrase && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-1.5 max-w-md bg-slate-50/50 p-4 border border-slate-100 rounded-xl"
                                  >
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                      Replace selected {selectedIndices.length > 1 ? "phrase" : "word"} <span className="text-slate-800 dark:text-slate-200 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 font-mono">"{selectedPhrase}"</span> with:
                                    </label>
                                    <input
                                      type="text"
                                      value={correctionText}
                                      onChange={(e) => handleCorrectionChange(e.target.value)}
                                      disabled={submitted}
                                      placeholder="e.g. is"
                                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                                        submitted
                                          ? isCorrect
                                            ? "bg-green-50 border-green-400 text-green-950"
                                            : "bg-red-50 border-red-300 text-red-950"
                                          : "border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                                      }`}
                                    />
                                  </motion.div>
                                )}

                                {submitted && (
                                  <div className={`text-xs font-semibold p-3 rounded-lg border max-w-2xl mt-3 ${
                                    isCorrect 
                                      ? "text-green-700 bg-green-50 border-green-100" 
                                      : "text-red-700 bg-red-50 border-red-100"
                                  }`}>
                                    <div className="flex items-center space-x-1.5 mb-1 font-bold">
                                      <span>Result Analysis:</span>
                                    </div>
                                    <div className="space-y-1 font-medium">
                                      <p>
                                        Your input: Selected <span className="font-bold">"{selectedPhrase || "(None)"}"</span> → Replaced with <span className="font-bold">"{correctionText || "(None)"}"</span>
                                      </p>
                                      <p>
                                        Expected Correction: Selected <span className="font-bold">"{(() => {
                                          const cParts = (exercise.correct_answer || "").split("|").map(s => s.trim());
                                          return cParts[0] || "";
                                        })()}"</span> → Replace with <span className="font-bold">"{(() => {
                                          const cParts = (exercise.correct_answer || "").split("|").map(s => s.trim());
                                          return cParts.length > 1 ? cParts[1] : cParts[0] || "";
                                        })()}"</span>
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}

                      {exercise.type === "redundant-word-elimination" && (
                        <>
                          <div className="mb-3">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                              {t("instrRedundantWord")}
                            </p>
                          </div>

                          {(() => {
                            const sentenceText = exercise.passage || exercise.question || "";
                            const tokens = sentenceText.split(/\s+/).filter(Boolean);
                            const selectedIdxStr = selectedAnswers[exercise.id];
                            const selectedIdx = selectedIdxStr !== undefined ? parseInt(selectedIdxStr, 10) : -1;

                            return (
                              <div className="flex flex-wrap gap-x-1.5 gap-y-1 items-baseline p-4 bg-slate-50/50 border border-slate-100/80 rounded-2xl mb-4 max-w-3xl text-base leading-relaxed text-slate-800 font-sans">
                                {tokens.map((token, idx) => {
                                  const isSelected = selectedIdx === idx;
                                  
                                  // Determine if this token matches correct redundant word text
                                  const cleanToken = token.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
                                  const cleanCorrectTarget = exercise.correct_answer.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
                                  const isTokenCorrectRedundant = cleanToken === cleanCorrectTarget;

                                  let tokenStyles = "transition-all duration-200 cursor-pointer select-none py-0.5 px-0.5 inline-block rounded-sm text-base font-medium ";
                                  
                                  if (!submitted) {
                                    if (isSelected) {
                                      tokenStyles += "line-through decoration-2 text-blue-600 font-semibold opacity-75 bg-blue-50/40";
                                    } else {
                                      tokenStyles += "text-slate-800 hover:text-blue-600 hover:bg-slate-100/60";
                                    }
                                  } else {
                                    // Submitted state
                                    const userWasCorrect = isAnswerCorrect(exercise, selectedIdxStr);
                                    if (isSelected) {
                                      if (isTokenCorrectRedundant) {
                                        tokenStyles += "line-through decoration-2 text-green-600 decoration-green-600 font-bold bg-green-50/30";
                                      } else {
                                        tokenStyles += "line-through decoration-2 text-red-500 decoration-red-500 font-bold bg-red-50/30";
                                      }
                                    } else if (isTokenCorrectRedundant && !userWasCorrect) {
                                      tokenStyles += "line-through decoration-2 text-green-600 decoration-green-600 font-bold bg-green-50/30";
                                    } else {
                                      tokenStyles += "text-slate-400 opacity-65 cursor-default";
                                    }
                                  }

                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={submitted}
                                      onClick={() => {
                                        if (isSelected) {
                                          const newAnswers = { ...selectedAnswers };
                                          delete newAnswers[exercise.id];
                                          setSelectedAnswers(newAnswers);
                                        } else {
                                          handleSelectAnswer(exercise.id, String(idx));
                                        }
                                      }}
                                      className={`${tokenStyles} focus:outline-none`}
                                    >
                                      {token}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {submitted && (
                            <div className="mt-3">
                              {isCorrect ? (
                                <div className="text-xs text-green-700 font-semibold bg-green-50 p-2.5 rounded-lg border border-green-100 max-w-2xl">
                                  Well done! You successfully identified and eliminated the redundant word "{exercise.correct_answer}".
                                </div>
                              ) : (
                                <div className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 max-w-2xl">
                                  Incorrect selection. The redundant word that should be eliminated is "{exercise.correct_answer}".
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {exercise.type === "key-word-transformation" && (
                        <>
                          {/* Top Layer: Original Sentence in clear body typography */}
                          <div className="mb-4">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                              {t("instrOriginalSentence")}
                            </span>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                              {exercise.original_sentence || exercise.passage || "No original sentence provided."}
                            </p>
                          </div>

                          {/* Middle Layer: Prominent centered high-contrast block badge with adjacent sub-label */}
                          <div className="my-5 flex flex-col items-center justify-center p-4 bg-slate-100 border border-slate-200 rounded-xl">
                            <p className="text-xs font-bold text-slate-500 tracking-wider mb-2 text-center">
                              {t("instrKeyWord")}
                            </p>
                            <div className="px-6 py-2.5 bg-white text-slate-950 border-2 border-slate-950 font-mono font-extrabold text-lg tracking-widest rounded-xl shadow-sm text-center">
                              {(exercise.key_word || (exercise.question ? exercise.question.split("\n")[0] : "") || "KEY WORD").toUpperCase()}
                            </div>
                          </div>

                          {/* Bottom Layer: Incomplete sentence with inline input container directly where gap resides */}
                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-4">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
                              {t("instrTransformSentence")}
                            </span>
                            {(() => {
                              const incompleteSentence = exercise.incomplete_sentence || (exercise.question ? exercise.question.split("\n")[1] : "") || "_________";
                              const parts = incompleteSentence.split(/_{3,}|\[blank\]/g);

                              if (parts.length > 1) {
                                return (
                                  <div className="text-base font-semibold text-slate-800 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-3">
                                    <span>{parts[0]}</span>
                                    <input
                                      type="text"
                                      value={selectedAnswers[exercise.id] || ""}
                                      onChange={(e) => handleSelectAnswer(exercise.id, e.target.value)}
                                      disabled={submitted}
                                      className={`inline-block min-w-[200px] max-w-[360px] bg-white border-b-2 text-center px-3 py-1 text-sm font-bold focus:outline-none transition-all ${
                                        submitted
                                          ? isCorrect
                                            ? "bg-green-50 border-green-500 text-green-900"
                                            : "bg-red-50 border-red-500 text-red-900"
                                          : "border-slate-400 text-slate-950 focus:border-blue-500 placeholder:text-slate-400"
                                      }`}
                                      placeholder="type missing words..."
                                      id={`input-inline-kw-${exercise.id}`}
                                    />
                                    <span>{parts.slice(1).join(" ")}</span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="space-y-3">
                                    <p className="text-base font-semibold text-slate-800">{incompleteSentence}</p>
                                    <input
                                      type="text"
                                      value={selectedAnswers[exercise.id] || ""}
                                      onChange={(e) => handleSelectAnswer(exercise.id, e.target.value)}
                                      disabled={submitted}
                                      className={`w-full max-w-md bg-white border rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                                        submitted
                                          ? isCorrect
                                            ? "bg-green-50 border-green-400 text-green-950 font-bold"
                                            : "bg-red-50 border-red-300 text-red-950 font-bold"
                                          : "border-slate-200 text-slate-950 placeholder:text-slate-400 focus:bg-white"
                                      }`}
                                      placeholder="Type missing words (2 to 5 words, including key word)..."
                                      id={`input-fallback-kw-${exercise.id}`}
                                    />
                                  </div>
                                );
                              }
                            })()}

                            {submitted && !isCorrect && (
                              <div className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 mt-3 max-w-xl">
                                Your answer: "{selectedAnswers[exercise.id] || "(None)"}" &bull; Correct phrase: "{exercise.correct_answer}"
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Explanations & feedback section */}
                    {submitted && (
                      <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleExplanation(exercise.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                          <span>{explanationVisible[exercise.id] ? "Hide Explanation" : "Reveal Explanation & Grammar Rule"}</span>
                        </button>
                        
                        <AnimatePresence>
                          {explanationVisible[exercise.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl mt-2 text-xs leading-relaxed text-slate-700" id={`unified-explanation-${exercise.id}`}>
                                <div className="space-y-3">
                                  {/* Section heading indicating comprehensive analysis */}
                                  <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-200/60 pb-1.5">
                                    <HelpCircle className="h-4 w-4 text-slate-500" />
                                    <span className="uppercase tracking-wider text-[10px]">Academic Breakdown & Targeted Feedback</span>
                                  </div>

                                  {/* General rule baseline (Scenario A & B) */}
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block font-mono">Grammar Rule Baseline</span>
                                    <p className="text-slate-800 font-medium leading-relaxed">
                                      {exercise.general_rule}
                                    </p>
                                  </div>

                                  {/* Option Feedbacks block */}
                                  {exercise.options && exercise.options.length > 0 && exercise.option_feedbacks && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                                      {isCorrect ? (
                                        // Scenario A: Correctly Answered
                                        <div className="p-3 bg-green-50/50 border border-green-200 rounded-xl space-y-1">
                                          <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 block font-mono">Your Correct Choice: "{exercise.correct_answer}"</span>
                                          <p className="text-green-950 font-medium text-xs leading-relaxed">
                                            {exercise.option_feedbacks[exercise.correct_answer] || `Correct. '${exercise.correct_answer}' is the proper grammatical choice.`}
                                          </p>
                                        </div>
                                      ) : (
                                        // Scenario B: Incorrectly Answered
                                        <div className="space-y-3">
                                          {/* Feedback for the Correct Option */}
                                          <div className="p-3 bg-green-50/50 border border-green-200 rounded-xl space-y-1">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 block font-mono">Correct Option Feedback: "{exercise.correct_answer}"</span>
                                            <p className="text-green-950 font-medium text-xs leading-relaxed">
                                              {exercise.option_feedbacks[exercise.correct_answer] || `The correct answer is '${exercise.correct_answer}'.`}
                                            </p>
                                          </div>
                                          
                                          {/* Distinctively styled feedback for student's selected incorrect option */}
                                          {selectedAnswers[exercise.id] && exercise.option_feedbacks[selectedAnswers[exercise.id]] && (
                                            <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                                              <span className="text-[10px] uppercase tracking-wider font-bold text-red-700 block font-mono">Your Chosen Option Analysis: "{selectedAnswers[exercise.id]}"</span>
                                              <p className="text-red-950 font-medium text-xs leading-relaxed">
                                                {exercise.option_feedbacks[selectedAnswers[exercise.id]]}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Form Submissions Panel */}
            <div className="space-y-3" id="submission-footer-panel">
              {testSubmitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{testSubmitError}</span>
                </div>
              )}
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {submitted ? (
                    <span>{t("restartSession")}</span>
                  ) : (
                    <span>
                      {t("questions")}: <span className="text-slate-900">{Object.keys(selectedAnswers).length}</span> / <span className="text-slate-900">{currentExam.exercises.length}</span>
                    </span>
                  )}
                </div>

                {!submitted && (
                  <button
                    onClick={handleSubmitQuiz}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-xs flex items-center space-x-1.5 self-end sm:self-auto cursor-pointer"
                    id="btn-submit-exam"
                  >
                    <span>{t("scoreAndSubmit")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </>)}
        </div>
      </div>

        {/* Live Academic Performance Ledger Section */}
        {(() => {
          const targetLevel = goal || "C1";
          const baselineLevel = baseline || "B1";

          const calculateProjectedScores = (cefr: string, accuracy: number, qCount: number) => {
            const cefrScoreRanges: Record<string, { ieltsMin: number; ieltsMax: number; toeflMin: number; toeflMax: number }> = {
              "A1": { ieltsMin: 1.0, ieltsMax: 3.0, toeflMin: 0, toeflMax: 19 },
              "A2": { ieltsMin: 3.0, ieltsMax: 4.0, toeflMin: 20, toeflMax: 45 },
              "B1": { ieltsMin: 4.0, ieltsMax: 5.5, toeflMin: 46, toeflMax: 71 },
              "B2": { ieltsMin: 5.5, ieltsMax: 6.5, toeflMin: 72, toeflMax: 94 },
              "C1": { ieltsMin: 7.0, ieltsMax: 8.0, toeflMin: 95, toeflMax: 114 },
              "C2": { ieltsMin: 8.5, ieltsMax: 9.0, toeflMin: 115, toeflMax: 120 }
            };

            const range = cefrScoreRanges[cefr] || cefrScoreRanges["B1"];
            
            // Question count weight acts as statistical confidence.
            // Minimum questions is 3, typical comprehensive test is 15-20.
            // Under 15 questions we apply a penalty factor due to high statistical variance.
            const confidenceFactor = Math.min(1.0, 0.70 + 0.30 * (Math.max(3, qCount) - 3) / 12);
            
            // CEFR acts as baseline anchor, modified by accuracy and confidence factor.
            const dynamicFactor = (accuracy / 100) * confidenceFactor;
            
            const rawIelts = range.ieltsMin + (range.ieltsMax - range.ieltsMin) * dynamicFactor;
            const rawToefl = range.toeflMin + (range.toeflMax - range.toeflMin) * dynamicFactor;

            const ielts = Math.min(9.0, Math.max(1.0, Math.round(rawIelts * 2) / 2));
            const toefl = Math.min(120, Math.max(0, Math.round(rawToefl)));

            let ieltsDesc = "Non-User";
            if (ielts >= 8.5) ieltsDesc = "Expert User (C2)";
            else if (ielts >= 7.0) ieltsDesc = "Very Good User (C1)";
            else if (ielts >= 5.5) ieltsDesc = "Competent User (B2)";
            else if (ielts >= 4.0) ieltsDesc = "Modest User (B1)";
            else if (ielts >= 3.0) ieltsDesc = "Extremely Limited (A2)";
            else if (ielts >= 1.0) ieltsDesc = "Intermittent (A1)";

            let toeflDesc = "Beginner";
            if (toefl >= 110) toeflDesc = "Expert (C2)";
            else if (toefl >= 94) toeflDesc = "Advanced (C1)";
            else if (toefl >= 60) toeflDesc = "High Intermediate (B2)";
            else if (toefl >= 32) toeflDesc = "Intermediate (B1)";
            else if (toefl >= 10) toeflDesc = "High Beginner (A2)";
            else if (toefl >= 0) toeflDesc = "Beginner (A1)";

            return { ielts, toefl, ieltsDesc, toeflDesc, confidenceFactor };
          };

          const activeLevel = baselineLevel;
          const cumulativeAccuracy = testHistory.length > 0
            ? Math.round(testHistory.reduce((sum, item) => sum + item.accuracy, 0) / testHistory.length)
            : 75;
          const totalQuestionsCount = testHistory.reduce((sum, item) => sum + item.totalQuestions, 0);

          const { ielts, toefl, ieltsDesc, toeflDesc, confidenceFactor } = calculateProjectedScores(
            activeLevel,
            cumulativeAccuracy,
            totalQuestionsCount
          );

          const cefrThresholds: Record<string, number> = {
            "A1": 60,
            "A2": 65,
            "B1": 70,
            "B2": 78,
            "C1": 85,
            "C2": 92
          };
          const targetThreshold = cefrThresholds[targetLevel] || 85;

          // Compute sub-vector metrics based on question-level aggregates
          const getMetricsForSubVector = (types: string[], ecMultiplier: number = 0) => {
            if (!activeTestHistory || activeTestHistory.length === 0) {
              return { accuracy: 0, progress: 0, count: 0 };
            }

            let correctSum = 0;
            let totalSum = 0;

            activeTestHistory.forEach(log => {
              if (!log) return;
              if (types.includes(log.taskType)) {
                correctSum += log.correctAnswers ?? 0;
                totalSum += log.totalQuestions ?? 0;
              } else if (log.taskType === "error_correction" && ecMultiplier > 0) {
                correctSum += Math.round((log.correctAnswers ?? 0) * ecMultiplier);
                totalSum += Math.round((log.totalQuestions ?? 0) * ecMultiplier);
              }
            });

            if (totalSum <= 0) {
              return { accuracy: 0, progress: 0, count: 0 };
            }

            const rawAvg = (correctSum / totalSum) * 100;
            const accuracy = isNaN(rawAvg) || rawAvg < 0 || rawAvg > 100 ? 0 : Math.round(rawAvg);
            
            // Calculate total question pool target as: Target Questions = targetTestCount * 10, divided evenly among the three Grammar Sub-Vectors
            const totalTargetQuestions = (targetTestCount || 12) * 10;
            const masteryTarget = Math.max(1, Math.round(totalTargetQuestions / 3));
            const progress = Math.min(100, Math.max(0, Math.round((correctSum / masteryTarget) * 100)));

            return { accuracy, progress, count: totalSum };
          };

          const grammarMetric = getMetricsForSubVector(["multiple_choice_grammar"]);
          const mappingMetric = getMetricsForSubVector(["key_word_transformation"], 0.5);
          const scanningMetric = getMetricsForSubVector(["redundant_word_elimination"], 0.5);

          const grammarAcc = grammarMetric.progress ?? 0;
          const grammarCount = grammarMetric.count ?? 0;

          const mappingAcc = mappingMetric.progress ?? 0;
          const mappingCount = mappingMetric.count ?? 0;

          const scanningAcc = scanningMetric.progress ?? 0;
          const scanningCount = scanningMetric.count ?? 0;

          // Dynamic Chronological Path Coloring (Adaptive Trend Colors)
          let trendColor = "#10b981"; // Growth / Default
          let trendName = "Growth";
          if (activeTestHistory.length >= 2) {
            const latest = activeTestHistory[activeTestHistory.length - 1].accuracy;
            const previous = activeTestHistory[activeTestHistory.length - 2].accuracy;
            if (latest > previous) {
              trendColor = "#10b981"; // Ultra-Vibrant Emerald Green
              trendName = "Growth";
            } else if (latest < previous) {
              trendColor = "#ef4444"; // High-Alert Crimson Red
              trendName = "Downward";
            } else {
              trendColor = "#f59e0b"; // Neon Cyberpunk Gold/Yellow
              trendName = "Stagnant";
            }
          }

          let localizedTrendName = trendName;
          if (trendName === "Growth") localizedTrendName = t("trendGrowth");
          else if (trendName === "Downward") localizedTrendName = t("trendDownward");
          else if (trendName === "Stagnant") localizedTrendName = t("trendStagnant");

          const scoreTrendText = t("scoreTrendLabel").replace("{trend}", localizedTrendName);

          return (
            <div className="mt-12 bg-[#0f172a] border border-[#1e293b] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden" id="performance-ledger-section">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10 border-b border-slate-800 pb-6">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" style={{ backgroundColor: trendColor }} />
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{t("activeMetricsSyllabus")}</h3>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">{t("metricsSubtitle")}</p>
                </div>
              </div>

              {activeTestHistory.length === 0 ? (
                <div className="bg-[#1e293b]/30 border border-[#1e293b] rounded-2xl p-8 text-center relative z-10" id="ledger-empty-state">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <BarChart3 className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="text-slate-300 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                    {t("noProgressDesc")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                  {/* SVG Chronological Graph */}
                  <div className="lg:col-span-7 bg-[#1e293b]/20 border border-[#1e293b] rounded-2xl p-5" id="chronological-chart-panel">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest leading-none">{t("syllabusMasteryTrajectory")}</h4>
                        <span className="text-[10px] text-slate-500 font-medium">{t("forecastHelpText")}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[9px] font-bold">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-0.5" style={{ backgroundColor: trendColor }} />
                          <span style={{ color: trendColor }}>{scoreTrendText}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-0.5 border-t border-dashed border-[#38bdf8]" />
                          <span className="text-sky-400">{t("targetLabel")} ({targetThreshold}%)</span>
                        </div>
                        {activeTestHistory.length >= 2 && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-0.5 border-t border-dotted border-emerald-500/60" style={{ borderColor: trendColor }} />
                            <span style={{ color: trendColor }} className="opacity-60">{t("trajectoryLabel")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SVG Implementation */}
                    {(() => {
                      const svgW = 600;
                      const svgH = 300;
                      const padL = 45;
                      const padR = 65;
                      const padT = 90;
                      const padB = 40;
                      const innerW = svgW - padL - padR;
                      const innerH = svgH - padT - padB;

                      const cefrWeights: Record<string, number> = {
                        A1: 0.8,
                        A2: 1.0,
                        B1: 1.4,
                        B2: 1.8,
                        C1: 2.3,
                        C2: 3.0
                      };

                      const getCefrMultiplier = (difficulty?: string) => {
                        if (!difficulty) return 1.0;
                        const upper = difficulty.toUpperCase().trim();
                        return cefrWeights[upper] || 1.0;
                      };

                      const getTrendImpactLabel = (difficulty?: string) => {
                        const level = (difficulty || "B1").toUpperCase().trim();
                        if (level.startsWith("C")) {
                          return `🔥 High (${level})`;
                        } else if (level.startsWith("B")) {
                          return `⚡ Medium (${level})`;
                        } else {
                          return `🟢 Base (${level})`;
                        }
                      };

                      const n = activeTestHistory.length;
                      const totalTicks = showForecast
                        ? Math.max(targetTestCount || 12, n + 2)
                        : Math.max(2, n);

                      const getX = (index: number) => {
                        if (totalTicks <= 1) return padL;
                        return padL + (index / (totalTicks - 1)) * innerW;
                      };
                      const getY = (yVal: number) => (svgH - 25) - (yVal / 100) * (svgH - 50);

                       let slope = 0;
                       let intercept = 0;
                       const hasTrajectory = n >= 2;
 
                       if (hasTrajectory) {
                         let sumW = 0;
                         let sumWX = 0;
                         let sumWY = 0;
                         let sumWXY = 0;
                         let sumWX2 = 0;
                         for (let i = 0; i < n; i++) {
                           const x = i + 1;
                           const y = activeTestHistory[i].accuracy;
                           const cefrMultiplier = getCefrMultiplier(activeTestHistory[i].difficulty);
                           const w = (activeTestHistory[i].totalQuestions || 1) * cefrMultiplier;
                           sumW += w;
                           sumWX += w * x;
                           sumWY += w * y;
                           sumWXY += w * x * y;
                           sumWX2 += w * x * x;
                         }
                         const denom = sumW * sumWX2 - sumWX * sumWX;
                         if (denom !== 0) {
                           slope = (sumW * sumWXY - sumWX * sumWY) / denom;
                         }
                         const meanWX = sumWX / sumW;
                         const meanWY = sumWY / sumW;
                         intercept = meanWY - slope * meanWX;
                       }

                      const getProjectedAcc = (i: number) => {
                        const raw = slope * (i + 1) + intercept;
                        return Math.max(0, Math.min(100, raw));
                      };

                      const trajectoryPoints: string[] = [];
                      if (hasTrajectory && n > 0) {
                        const lastX = getX(n - 1);
                        const lastY = getY(activeTestHistory[n - 1].accuracy);
                        trajectoryPoints.push(`${lastX},${lastY}`);
                        for (let i = n; i < totalTicks; i++) {
                          trajectoryPoints.push(`${getX(i)},${getY(getProjectedAcc(i))}`);
                        }
                      }
                      const trajectoryPathD = trajectoryPoints.length > 0 ? `M ${trajectoryPoints.join(" L ")}` : "";

                      const dividerX = getX(n - 1);

                      const pointsStr = activeTestHistory
                        .map((log, i) => `${getX(i)},${getY(log.accuracy)}`)
                        .join(" ");

                      const targetLineY = getY(targetThreshold);

                      // Slope descriptions
                      const velocityMsg = hasTrajectory
                        ? slope > 0
                          ? `Learning velocity of +${slope.toFixed(1)}% accuracy per session (${trendName} trend).`
                          : slope < 0
                            ? `Learning velocity of ${slope.toFixed(1)}% accuracy per session (${trendName} trend).`
                            : `Neutral learning velocity (${trendName} trend).`
                        : "Complete more quizzes to map your accuracy learning velocity.";

                      return (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                <Sparkles className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-100">{t("trajectoryLabel")}</h4>
                                <p className="text-xs text-slate-400 font-medium">{t("forecastHelpText")}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowForecast(!showForecast)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all duration-200 flex items-center gap-1.5 shadow-md ${
                                showForecast
                                  ? "bg-orange-500 text-white border-orange-400 hover:bg-orange-600 shadow-orange-500/10"
                                  : "bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                              }`}
                              id="toggle-forecast-mode-btn"
                            >
                              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                              <span>{showForecast ? t("simulateTrajectoryActive") : t("simulateTrajectory")}</span>
                            </button>
                          </div>

                          <div className="w-full overflow-x-auto select-none" style={{ scrollbarWidth: "none" }}>
                            <svg viewBox={`0 -65 ${svgW} ${svgH + 65}`} className="w-full min-w-[500px] h-auto overflow-visible" id="svg-performance-graph">
                              <defs>
                                <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={trendColor} stopOpacity="0.15" />
                                  <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                                </linearGradient>
                                <filter id="shadowGlow" x="-10%" y="-10%" width="120%" height="120%">
                                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={trendColor} floodOpacity="0.4" />
                                </filter>
                                <clipPath id="chart-area-clip">
                                  <rect
                                    x={0}
                                    y={-65}
                                    width={svgW}
                                    height={svgH + 130}
                                  />
                                </clipPath>
                              </defs>

                              {/* Horizontal Grid */}
                              {[0, 25, 50, 75, 100].map((gridY) => (
                                <g key={gridY}>
                                  <line
                                    x1={padL}
                                    y1={getY(gridY)}
                                    x2={getX(totalTicks - 1)}
                                    y2={getY(gridY)}
                                    stroke="#334155"
                                    strokeWidth="1"
                                    className="opacity-100"
                                  />
                                  <text
                                    x={padL - 10}
                                    y={getY(gridY) + 3}
                                    textAnchor="end"
                                    fill="#e2e8f0"
                                    className="font-mono text-[10px] font-semibold"
                                  >
                                    {gridY}%
                                  </text>
                                </g>
                              ))}

                              {/* Vertical Grid */}
                              {(() => {
                                return Array.from({ length: totalTicks }).map((_, i) => {
                                  const isReal = i < n;
                                  const showLabel = (i + 1) === 1 || (i + 1) % 2 === 0;
                                  return (
                                    <g key={i}>
                                      <line
                                        x1={getX(i)}
                                        y1={getY(100)}
                                        x2={getX(i)}
                                        y2={getY(0)}
                                        stroke="#334155"
                                        strokeWidth="1"
                                        className="opacity-100"
                                      />
                                      {showLabel && (
                                        <text
                                          x={getX(i)}
                                          y={getY(0) + 15}
                                          textAnchor="middle"
                                          fill={isReal ? "#10b981" : "#f97316"}
                                          className={`font-mono text-[10px] ${isReal ? "font-extrabold" : "font-semibold"}`}
                                        >
                                          {i + 1}
                                        </text>
                                      )}
                                    </g>
                                  );
                                });
                              })()}

                              {/* Target Goal Line */}
                              <line
                                x1={padL}
                                y1={targetLineY}
                                x2={getX(totalTicks - 1)}
                                y2={targetLineY}
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                                className="opacity-80"
                              />
                              <text
                                x={getX(totalTicks - 1) + 6}
                                y={targetLineY + 3}
                                className="fill-sky-400 font-mono text-[8px] font-bold"
                              >
                                Goal ({targetLevel})
                              </text>

                              {/* Dynamic Transition Divider */}
                              {showForecast && n > 0 && (
                                <g>
                                  <line
                                    x1={dividerX}
                                    y1={getY(100)}
                                    x2={dividerX}
                                    y2={getY(0)}
                                    stroke="#475569"
                                    strokeWidth="1.5"
                                    strokeDasharray="4,4"
                                    className="opacity-95"
                                  />
                                  {/* Projection Phase Label */}
                                  <text
                                    x={dividerX > svgW * 0.75 ? dividerX - 12 : dividerX + 12}
                                    y={getY(100) - 10}
                                    textAnchor={dividerX > svgW * 0.75 ? "end" : "start"}
                                    fill="#f97316"
                                    fontSize="10px"
                                    fontWeight="700"
                                    className="font-sans text-[10px] font-bold tracking-wider fill-orange-400"
                                  >
                                    {t("expectedProgressLabel")}
                                  </text>
                                </g>
                              )}

                              {/* Background Smoky Haze Glows for all historical nodes (Layer 1 - Bottom) */}
                              {activeTestHistory.map((log, i) => {
                                const cx = getX(i);
                                const cy = getY(log.accuracy);
                                const isHovered = hoveredNodeIndex === i;
                                const baseR = 4 + (log.totalQuestions * 0.2);
                                const rVal = isHovered ? baseR + 2 : baseR;

                                const difficultyStr = (log.difficulty || "B1").toUpperCase().trim();
                                const isLevel2 = difficultyStr.endsWith("2");
                                let glowFill = "#6366f1"; // default B-Levels
                                if (difficultyStr.startsWith("A")) {
                                  glowFill = "#06b6d4"; // Tech Teal / Cyan
                                } else if (difficultyStr.startsWith("B")) {
                                  glowFill = "#6366f1"; // Intellectual Indigo / Purple
                                } else if (difficultyStr.startsWith("C")) {
                                  glowFill = "#d946ef"; // Neon Fuchsia / Rose
                                }

                                const opacityBoost = isLevel2 ? 0.10 : 0.0;
                                const opacity1 = 0.30 + opacityBoost;
                                const opacity2 = 0.15 + opacityBoost;
                                const opacity3 = 0.05 + opacityBoost;

                                return (
                                  <g key={`glow-${log.id}`} className="pointer-events-none">
                                    {/* Smoky Haze Glow Layer 3 (Outer dissipation) */}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={rVal + 12}
                                      fill={glowFill}
                                      stroke="none"
                                      opacity={opacity3}
                                      style={{ filter: "blur(4px)" }}
                                      className="transition-all duration-150"
                                    />
                                    {/* Smoky Haze Glow Layer 2 (Medium haze) */}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={rVal + 7}
                                      fill={glowFill}
                                      stroke="none"
                                      opacity={opacity2}
                                      style={{ filter: "blur(4px)" }}
                                      className="transition-all duration-150"
                                    />
                                    {/* Smoky Haze Glow Layer 1 (Inner smoke) */}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={rVal + 3}
                                      fill={glowFill}
                                      stroke="none"
                                      opacity={opacity1}
                                      style={{ filter: "blur(4px)" }}
                                      className="transition-all duration-150"
                                    />
                                  </g>
                                );
                              })}

                              {/* Area underlay (Layer 2 - Middle) */}
                              {n > 1 && (
                                <path
                                  d={`M ${getX(0)} ${getY(0)} L ${activeTestHistory.map((log, i) => `${getX(i)} ${getY(log.accuracy)}`).join(" L ")} L ${getX(n - 1)} ${getY(0)} Z`}
                                  fill="url(#scoreGlow)"
                               />
                              )}

                              {/* Segmented historical line (Layer 2 - Middle) */}
                              {n > 1 && activeTestHistory.map((log, i) => {
                                if (i === 0) return null;
                                const prevLog = activeTestHistory[i - 1];
                                const isFlat = log.accuracy === prevLog.accuracy;
                                let segmentStroke = "#22c55e";
                                let segmentWidth = "3.5";
                                if (log.accuracy > prevLog.accuracy) {
                                  segmentStroke = "#22c55e";
                                } else if (isFlat) {
                                  segmentStroke = "#facc15";
                                  segmentWidth = "3";
                                } else {
                                  segmentStroke = "#ef4444";
                                }
                                return (
                                  <line
                                    key={`hist-seg-${i}`}
                                    x1={getX(i - 1)}
                                    y1={getY(prevLog.accuracy)}
                                    x2={getX(i)}
                                    y2={getY(log.accuracy)}
                                    stroke={segmentStroke}
                                    strokeWidth={segmentWidth}
                                    strokeLinecap="round"
                                    filter={isFlat ? undefined : "url(#shadowGlow)"}
                                  />
                                );
                              })}

                              {/* Trajectory projection line (Layer 2 - Middle) */}
                              {showForecast && hasTrajectory && trajectoryPathD && (
                                <path
                                  d={trajectoryPathD}
                                  fill="none"
                                  stroke="#f97316"
                                  strokeWidth="2.5"
                                  strokeDasharray="4,4"
                                  opacity="0.7"
                                  clipPath="url(#chart-area-clip)"
                                />
                              )}

                              {/* Interactive History Nodes (Layer 3 - Foreground/Top) */}
                              {activeTestHistory.map((log, i) => {
                                const cx = getX(i);
                                const cy = getY(log.accuracy);
                                const isHovered = hoveredNodeIndex === i;
                                const baseR = 4 + (log.totalQuestions * 0.2);
                                const rVal = isHovered ? baseR + 2 : baseR;
                                
                                let nodeColor = "#22c55e";
                                if (i > 0) {
                                  const prevLog = activeTestHistory[i - 1];
                                  if (log.accuracy >= prevLog.accuracy) {
                                    nodeColor = "#22c55e";
                                  } else {
                                    nodeColor = "#ef4444";
                                  }
                                }

                                const mult = getCefrMultiplier(log.difficulty);
                                const hasGlow = mult > 1.0;
                                const blurVal = hasGlow ? (mult - 1.0) * 4 : 0;
                                const glowColor = nodeColor;

                                return (
                                  <g
                                    key={`node-${log.id}`}
                                    className="group"
                                    onMouseEnter={() => setHoveredNodeIndex(i)}
                                    onMouseLeave={() => setHoveredNodeIndex(null)}
                                  >
                                    {/* Invisible hover area */}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={Math.max(12, baseR + 4)}
                                      className="fill-transparent cursor-pointer"
                                    />
                                    {/* Main interactive historical node */}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={rVal}
                                      stroke="#0f172a"
                                      strokeWidth={isHovered ? 3 : 2}
                                      style={{
                                        fill: nodeColor,
                                        filter: hasGlow ? `drop-shadow(0 0 ${blurVal}px ${glowColor})` : undefined,
                                      }}
                                      className="cursor-pointer transition-all duration-150"
                                    />
                                    <g className={`${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-200`}>
                                      <rect
                                        x={cx - 65}
                                        y={Math.max(5, cy - 54)}
                                        width="130"
                                        height="44"
                                        rx="6"
                                        fill="#0f172a"
                                        stroke="#1e293b"
                                        strokeWidth="1.5"
                                      />
                                      <text
                                        x={cx}
                                        y={Math.max(17, cy - 42)}
                                        textAnchor="middle"
                                        className="fill-white font-bold font-mono text-[8.5px]"
                                      >
                                        {log.accuracy}% ({log.correctAnswers}/{log.totalQuestions})
                                      </text>
                                      <text
                                        x={cx}
                                        y={Math.max(27, cy - 32)}
                                        textAnchor="middle"
                                        className="fill-slate-400 text-[6.5px] font-bold uppercase tracking-wider truncate"
                                      >
                                        {log.topic.length > 20 ? log.topic.slice(0, 18) + "..." : log.topic}
                                      </text>
                                      <text
                                        x={cx}
                                        y={Math.max(37, cy - 22)}
                                        textAnchor="middle"
                                        className="fill-amber-400 text-[6.5px] font-bold uppercase tracking-wider"
                                      >
                                        Trend Impact: {getTrendImpactLabel(log.difficulty)}
                                      </text>
                                    </g>
                                  </g>
                                );
                              })}

                              {/* Trajectory projection nodes with glows (Layer 3 - Foreground/Top) */}
                              {showForecast && hasTrajectory && Array.from({ length: totalTicks - n }).map((_, idx) => {
                                const nodeIndex = n + idx;
                                const clampedAcc = getProjectedAcc(nodeIndex);
                                const cx = getX(nodeIndex);
                                const cy = getY(clampedAcc);
                                const nodeIdx = nodeIndex;
                                const isHovered = hoveredNodeIndex === nodeIdx;
                                return (
                                  <g
                                    key={`proj-node-${nodeIndex}`}
                                    className="group"
                                    onMouseEnter={() => setHoveredNodeIndex(nodeIdx)}
                                    onMouseLeave={() => setHoveredNodeIndex(null)}
                                  >
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r="12"
                                      className="fill-transparent cursor-pointer"
                                    />
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={isHovered ? 5.5 : 3.5}
                                      fill="#0f172a"
                                      stroke="#f97316"
                                      strokeWidth="2"
                                      className="cursor-pointer transition-all duration-150"
                                    />
                                    <g className={`${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-200`}>
                                      <rect
                                        x={cx - 50}
                                        y={Math.max(10, cy - 36)}
                                        width="100"
                                        height="24"
                                        rx="4"
                                        fill="#0f172a"
                                        stroke="#f97316"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={cx}
                                        y={Math.max(22, cy - 22)}
                                        textAnchor="middle"
                                        fill="#f97316"
                                        className="font-bold font-mono text-[8px]"
                                      >
                                        Expected: {Math.round(clampedAcc)}%
                                      </text>
                                    </g>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>

                          {/* Interactive Explanatory Chart Guide (Legend Accordion) */}
                          <div className="flex flex-col items-center mt-2">
                            <button
                              onClick={() => setShowChartGuide(!showChartGuide)}
                              className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 hover:border-slate-700"
                              id="chart-guide-toggle-btn"
                            >
                              {t("howToReadChart")}
                            </button>
                            
                            <AnimatePresence>
                              {showChartGuide && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="w-full mt-3 overflow-hidden"
                                >
                                  <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 text-xs space-y-2.5 text-slate-300 shadow-xl max-w-full">
                                    <p className="font-extrabold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2 uppercase tracking-wide text-[10px]">
                                      <span>📊</span> {t("chartGuideTitle")}
                                    </p>
                                    <div className="space-y-2 font-sans">
                                      <div className="flex items-start gap-2.5 leading-relaxed">
                                        <span className="text-emerald-400 font-bold shrink-0 text-sm">•</span>
                                        <span>{t("chartGuideGreenMarkers")}</span>
                                      </div>
                                      <div className="flex items-start gap-2.5 leading-relaxed">
                                        <span className="text-[#f97316] font-bold shrink-0 text-sm">•</span>
                                        <span>{t("chartGuideOrangeLine")}</span>
                                      </div>
                                      <div className="flex items-start gap-2.5 leading-relaxed">
                                        <span className="text-slate-400 font-bold shrink-0 text-sm">•</span>
                                        <span>{t("chartGuideDivider")}</span>
                                      </div>
                                    </div>

                                    <div className="border-t border-slate-850 pt-3 mt-3">
                                      <p className="font-extrabold text-amber-400 uppercase tracking-wide text-[10px] mb-2">
                                        🎓 Mathematical Calibration Methodology
                                      </p>
                                      <div className="space-y-3 font-sans text-slate-300 text-[11px] leading-relaxed">
                                        <div>
                                          <strong className="text-slate-100 block mb-0.5">Multi-Dimensional Visual Encoding:</strong>
                                          <span>The chart employs an advanced plotting matrix where the <strong>Size of the Data Point (Dot)</strong> dynamically represents the <strong>quantity/volume of questions</strong> evaluated in that session, and the <strong>Color and Brightness of the Glowing Aura</strong> explicitly maps to the <strong>CEFR difficulty tier</strong> (from A1 up to C2).</span>
                                        </div>
                                        <div>
                                          <strong className="text-slate-100 block mb-0.5">Relative vs Absolute Scoring:</strong>
                                          <span>The vertical Y-axis tracks "Relative Session Accuracy" (0% to 100%). A 100% score on an A1 test and a 100% score on a C2 test will both hit the visual peak of the chart to reflect flawless execution within that specific session.</span>
                                        </div>
                                        <div>
                                          <strong className="text-slate-100 block mb-0.5">Predictive Score Translation:</strong>
                                          <span>The underlying predictive forecasting model synthesizes these three core metrics (accuracy percentage, question volume via dot size, and CEFR tier via aura multiplier) to extrapolate the student's absolute global <strong>Predicted Proficiency Milestone</strong> (projected IELTS/TOEFL band and score equivalence, scaling dynamic CEFR weights to project these specific international English language bands).</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                            <div className="flex items-center space-x-2">
                              <Activity className="h-4 w-4 text-emerald-400 shrink-0" style={{ color: trendColor }} />
                              <span className="font-semibold text-slate-300">{velocityMsg}</span>
                            </div>
                            <div className="text-right font-mono text-[10px] text-slate-500 font-bold">
                              Track: <span className="text-blue-400">{baselineLevel}</span> &rarr; <span style={{ color: trendColor }}>{targetLevel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Skill Mastery Matrix */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6" id="skill-matrix-panel">
                    <div className="bg-[#1e293b]/20 border border-[#1e293b] rounded-2xl p-5 flex-1">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">{t("grammarSubVectors")}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mb-6">{t("grammarSubVectorsSubtitle")}</p>

                      <div className="space-y-6">
                        {/* Grammar Accuracy */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                              <span className="font-bold text-slate-300">{t("grammarMasteryTitle")}</span>
                            </div>
                            <span className="font-mono font-black text-cyan-400">{grammarAcc}% <span className="text-[9px] text-slate-500">({grammarCount} {t("questions")})</span></span>
                          </div>
                          <div className="h-4 bg-slate-950/90 rounded-full border border-slate-800/80 p-[2px] relative overflow-visible">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${grammarAcc}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 rounded-full"
                              style={{ filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.75))" }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">{t("grammarMasteryDesc")}</p>
                        </div>

                        {/* Structural Mapping */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                              <span className="font-bold text-slate-300">{t("structuralMasteryTitle")}</span>
                            </div>
                            <span className="font-mono font-black text-indigo-400">{mappingAcc}% <span className="text-[9px] text-slate-500">({mappingCount} {t("questions")})</span></span>
                          </div>
                          <div className="h-4 bg-slate-950/90 rounded-full border border-slate-800/80 p-[2px] relative overflow-visible">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${mappingAcc}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                              style={{ filter: "drop-shadow(0 0 8px rgba(129, 140, 248, 0.75))" }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">{t("structuralMasteryDesc")}</p>
                        </div>

                        {/* Analytical Scanning */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                              <span className="font-bold text-slate-300">{t("analyticalMasteryTitle")}</span>
                            </div>
                            <span className="font-mono font-black text-emerald-400">{scanningAcc}% <span className="text-[9px] text-slate-500">({scanningCount} {t("questions")})</span></span>
                          </div>
                          <div className="h-4 bg-slate-950/90 rounded-full border border-slate-800/80 p-[2px] relative overflow-visible">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${scanningAcc}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-full"
                              style={{ filter: "drop-shadow(0 0 8px rgba(52, 211, 153, 0.75))" }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">{t("analyticalMasteryDesc")}</p>
                        </div>
                      </div>
                    </div>

                      {/* Projected Exam Scores - Fully Automated, Read-Only Scoreboard */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl" id="score-prediction-panel">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                            <Award className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">
                              {t("projectedExamScoresTitle")}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                              Continuous Performance Translation
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                          Live Analytical Sync
                        </span>
                      </div>

                      {/* Score metrics presentation with beautiful design and negative space */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* IELTS Band badge */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-5 text-center relative overflow-hidden flex flex-col items-center justify-center group transition-all duration-300 hover:border-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-3">
                            IELTS Equivalence
                          </span>
                          <div className="w-16 h-16 rounded-full border border-cyan-500/20 bg-cyan-950/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.1)] mb-3 transition-transform duration-300 group-hover:scale-105">
                            <span className="text-2xl font-black text-cyan-400 font-mono">
                              {ielts.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-200 tracking-wide">
                            IELTS Band: {ielts.toFixed(1)}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 mt-1">
                            {ieltsDesc}
                          </span>
                        </div>

                        {/* TOEFL iBT badge */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-5 text-center relative overflow-hidden flex flex-col items-center justify-center group transition-all duration-300 hover:border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                          <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-3">
                            TOEFL iBT Score
                          </span>
                          <div className="w-16 h-16 rounded-full border border-purple-500/20 bg-purple-950/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.1)] mb-3 transition-transform duration-300 group-hover:scale-105">
                            <span className="text-2xl font-black text-purple-400 font-mono">
                              {toefl}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-200 tracking-wide">
                            TOEFL iBT: {toefl}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 mt-1">
                            {toeflDesc}
                          </span>
                          <span className="text-[10px] font-bold text-purple-300/95 mt-2 bg-purple-950/30 px-2 py-0.5 rounded-md border border-purple-900/30">
                            {t("expectedRangeLabel")}: {Math.max(0, toefl - 5)} - {Math.min(120, toefl + 5)}
                          </span>
                        </div>
                      </div>

                      {/* Advanced Data Reliability and US University Target Match Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Data Reliability (Prediction Confidence) */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 flex flex-col justify-center items-center text-center transition-all duration-300 hover:border-blue-500/10">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                            {t("dataReliabilityLabel")}
                          </span>
                          {totalQuestionsCount < 50 ? (
                            <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3.5 py-1.5 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[11px] font-black tracking-wide uppercase">
                                {t("reliabilityLow")}
                              </span>
                            </div>
                          ) : totalQuestionsCount <= 150 ? (
                            <div className="inline-flex items-center space-x-1.5 bg-slate-400/10 border border-slate-400/20 text-slate-300 px-3.5 py-1.5 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span className="text-[11px] font-black tracking-wide uppercase">
                                {t("reliabilityMedium")}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[11px] font-black tracking-wide uppercase">
                                {t("reliabilityHigh")}
                              </span>
                            </div>
                          )}
                          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mt-2.5">
                            Based on {totalQuestionsCount} Questions Completed
                          </p>
                        </div>

                        {/* US University Target Match Tier */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 flex flex-col justify-center items-center text-center transition-all duration-300 hover:border-blue-500/10">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                            US University Target
                          </span>
                          {toefl >= 100 || ielts >= 7.5 ? (
                            <div className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-purple-500/15 to-amber-500/15 border border-amber-500/30 text-amber-300 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.15)] text-center">
                              <span className="text-[11px] font-black tracking-wide uppercase">
                                {t("tierTop")}
                              </span>
                            </div>
                          ) : toefl >= 80 || ielts >= 6.5 ? (
                            <div className="inline-flex items-center space-x-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-3.5 py-1.5 rounded-full text-center">
                              <span className="text-[11px] font-black tracking-wide uppercase">
                                {t("tierMid")}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 px-3.5 py-1.5 rounded-full text-center">
                              <span className="text-[11px] font-black tracking-wide uppercase">
                                {t("tierEntry")}
                              </span>
                            </div>
                          )}
                          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mt-2.5">
                            Academic Eligibility Tier
                          </p>
                        </div>
                      </div>

                      {/* Read-Only Analytical Footer Panel */}
                      <div className="bg-slate-950/40 border border-slate-850/80 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="space-y-1">
                            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">CEFR Anchor</span>
                            <span className="block text-xs font-black text-slate-300">{activeLevel}</span>
                          </div>
                          <div className="space-y-1 border-x border-slate-800/40">
                            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">Live Accuracy</span>
                            <span className="block text-xs font-black text-amber-400">{cumulativeAccuracy}%</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">Question Volume</span>
                            <span className="block text-xs font-black text-cyan-400">{totalQuestionsCount} Qs</span>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-850/60 flex items-start space-x-2">
                          <span className="text-xs mt-0.5">💡</span>
                          <p className="text-[9px] text-slate-400 leading-normal font-medium">
                            Predictions are algorithmically generated based on your real syllabus performance history: <strong>CEFR {activeLevel} Level</strong> difficulty baseline, adjusted with a <strong>{Math.round(confidenceFactor * 100)}% confidence factor</strong> determined by your total completed answering volume.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Footer credits line */}
      <footer 
        className="text-center py-12 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold border-t border-slate-200 bg-white mt-16 select-none" 
        id="app-footer"
      >
        Linguist Exam &copy; {new Date().getFullYear()}{" "}
        <span 
          onDoubleClick={() => setShowAdminModal(true)}
          className="cursor-pointer px-1 hover:text-blue-500 transition-colors"
          title="Double-click to access System Admin Portal"
        >
          &bull;
        </span>{" "}
        Sleek Interface Edition
      </footer>

      {/* "What's Next?" Choice Component / Modal */}
      <AnimatePresence>
        {showSessionCompletionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="session-completion-modal">
            {/* Backdrop with a dark-slate tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setShowSessionCompletionModal(false)}
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative z-10 text-white overflow-hidden"
              id="session-completion-card"
            >
              {/* Decorative radial gradient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-4 relative z-10">
                {/* Big Badge Icon */}
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 relative">
                  <Award className="h-8 w-8 text-slate-950 animate-bounce" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-slate-900">
                    <Sparkles className="h-2 w-2 text-white animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                    {t("targetReachedCongrats")}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                    {t("metricsSubtitle")}
                  </p>
                </div>

                {/* Session statistics summary */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t("quizMilestones")}</span>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{testsCompletedThisSession}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t("meanSyllabusScore")}</span>
                    <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                      {activeTestHistory.length > 0 
                        ? Math.round(activeTestHistory.reduce((sum, item) => sum + item.accuracy, 0) / activeTestHistory.length) 
                        : 0}%
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  {/* Option A: Continue Session */}
                  <button
                    type="button"
                    onClick={() => setShowSessionCompletionModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm py-4 px-6 rounded-2xl border border-slate-700/80 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                    id="btn-session-continue"
                  >
                    <span>{t("continueSession")}</span>
                  </button>

                  {/* Option B: Start a New Graph */}
                  <button
                    type="button"
                    onClick={() => {
                      setSessionStartTimestamp(new Date().toISOString());
                      setTestsCompletedThisSession(0);
                      setShowSessionCompletionModal(false);
                      handleResetQuiz();
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                    id="btn-session-reset-graph"
                  >
                    <span>{t("startNewGraph")}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Admin Modal Panel */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setShowAdminModal(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative z-10 space-y-4 text-slate-800 max-h-[90vh] overflow-y-auto"
              id="admin-modal-container"
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    {isAdminLoggedIn ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Admin Control Panel</h3>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System Settings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {!isAdminLoggedIn ? (
                /* Admin Login Form */
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Administrator Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter admin password..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-950 font-sans"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {adminLoginError && (
                    <div className="text-xs text-red-600 flex items-center space-x-1.5 bg-red-50 p-2.5 rounded-lg border border-red-100 animate-pulse">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{adminLoginError}</span>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Authenticate</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Authenticated State - Settings Sections */
                <div className="space-y-5 divide-y divide-slate-100">
                  
                  {/* SECTION 1: API KEYS COLLECTION */}
                  <form onSubmit={handleSaveApiKey} className="space-y-4 pb-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Gemini API Keys</h4>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        serverHasKey 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                      }`}>
                        {serverHasKey ? "Active Keys Ready" : "Keys Missing"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      The server always starts generating tests using Key 1. If it encounters a 429 rate limit error, it seamlessly rotates to backup keys.
                    </p>
                    
                    <div className="space-y-3">
                      {/* Key 1 */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Gemini API Key 1 (Primary)
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAdminApiKey(!showAdminApiKey)}
                            className="text-[9px] text-blue-600 hover:text-blue-700 font-bold focus:outline-none cursor-pointer"
                          >
                            {showAdminApiKey ? "Hide Keys" : "Show Keys"}
                          </button>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Key className="h-4 w-4" />
                          </div>
                          <input
                            type={showAdminApiKey ? "text" : "password"}
                            placeholder="Enter Primary API Key (Key 1)..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono transition-colors text-slate-950"
                            value={adminApiKeyInput1}
                            onChange={(e) => setAdminApiKeyInput1(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Key 2 */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Gemini API Key 2 (Backup)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Key className="h-4 w-4" />
                          </div>
                          <input
                            type={showAdminApiKey ? "text" : "password"}
                            placeholder="Enter Backup API Key (Key 2)..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono transition-colors text-slate-950"
                            value={adminApiKeyInput2}
                            onChange={(e) => setAdminApiKeyInput2(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Key 3 */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Gemini API Key 3 (Backup)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Key className="h-4 w-4" />
                          </div>
                          <input
                            type={showAdminApiKey ? "text" : "password"}
                            placeholder="Enter Backup API Key (Key 3)..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono transition-colors text-slate-950"
                            value={adminApiKeyInput3}
                            onChange={(e) => setAdminApiKeyInput3(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {adminSaveMessage && (
                      <div className={`text-[11px] p-2.5 rounded-lg border ${
                        adminSaveMessage.error 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}>
                        {adminSaveMessage.text}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingKey}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{isSavingKey ? "Saving Pool..." : "Save Keys"}</span>
                      </button>
                    </div>
                  </form>

                  {/* SECTION 2: AI MODEL SELECTOR */}
                  <form onSubmit={handleSaveModel} className="space-y-3 py-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Select AI Model</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Choose the dynamic model family that our server uses to generate quiz exercises.
                    </p>
                    <div className="space-y-1">
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended - Fast & Budget-Friendly)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced Reasoning - For complex checks)</option>
                      </select>
                    </div>

                    {modelSaveMessage && (
                      <div className={`text-[11px] p-2.5 rounded-lg border ${
                        modelSaveMessage.error 
                          ? "bg-red-50 text-red-700 border-red-205" 
                          : "bg-green-50 text-green-700 border-green-205"
                      }`}>
                        {modelSaveMessage.text}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingModel}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>{isSavingModel ? "Saving..." : "Save Model"}</span>
                      </button>
                    </div>
                  </form>

                  {/* SECTION 3: CHANGE PASSWORD */}
                  <form onSubmit={handleChangePassword} className="space-y-3 py-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Change Admin Password</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Set a custom password to overwrite the default administrator login. This persists securely on the server.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                        <input
                          type="password"
                          placeholder="New password..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 text-slate-900 focus:outline-none"
                          value={adminNewPassword}
                          onChange={(e) => setAdminNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                        <input
                          type="password"
                          placeholder="Confirm..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 text-slate-900 focus:outline-none"
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    {passwordSaveMessage && (
                      <div className={`text-[11px] p-2.5 rounded-lg border ${
                        passwordSaveMessage.error 
                          ? "bg-red-50 text-red-700 border-red-205" 
                          : "bg-green-50 text-green-700 border-green-205"
                      }`}>
                        {passwordSaveMessage.text}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>{isUpdatingPassword ? "Updating..." : "Update Password"}</span>
                      </button>
                    </div>
                  </form>

                  {/* SECTION 4: PROJECT LINK MANAGEMENT */}
                  <div className="space-y-3 py-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Manage Portfolio Links</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Add, view, and manage dynamic hyperlinks displayed on the public student dashboard widget.
                    </p>

                    {/* Current Links List */}
                    {projectLinks.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Links</p>
                        <div className="divide-y divide-slate-150">
                          {projectLinks.map((link) => (
                            <div key={link.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 text-xs">
                              <div className="truncate pr-4">
                                <p className="font-semibold text-slate-800 truncate">{link.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{link.url}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveProjectLink(link.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors shrink-0"
                                title="Remove link"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Link Form */}
                    <form onSubmit={handleAddProjectLink} className="space-y-2.5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add New Link</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Project Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. My Portfolio"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={newLinkName}
                            onChange={(e) => setNewLinkName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Project URL</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. portfolio.com"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Add Link</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* GENERAL BAR */}
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-[10px] text-slate-400 font-medium font-sans">Professor Active Session</span>
                    <button
                      type="button"
                      onClick={handleAdminLogout}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
