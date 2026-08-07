# Linguist Exam - Automated Diagnostic & Score Forecasting Engine

Linguist Exam is an interactive AI-driven diagnostic platform designed to evaluate real-time English proficiency, target key grammatical weaknesses, and predict performance on standardized international exams (TOEFL iBT & IELTS). Built as a specialized module within a 3-product educational ecosystem, it turns raw practice telemetry into actionable academic metrics for students and university admissions committees.

## 📌 Motivation & Engineering Context
Preparing for standardized exams like TOEFL and IELTS often leaves students guessing where they actually stand before test day. I built Linguist Exam to serve as a precise, mathematical calibration tool. Instead of relying on static, pre-written quiz sets, this engine dynamically generates context-aware exercises using LLMs, verifies answers with strict multi-layer guardrails, and maps every interaction into a multi-dimensional analytics model to forecast final test scores with statistical confidence.

## 🛠 Tech Stack & Architecture
* **Frontend:** React, TypeScript, Vite, Tailwind CSS (Custom dark high-contrast design system)
* **Backend Runtime & API Router:** Node.js, Express
* **Database & Cloud State:** Supabase (PostgreSQL with real-time state synchronization)
* **AI Engine:** Google Gemini API (Structured JSON schema validation pipelines & system prompt anchors)

## ✨ Core Features & Technical Highlights

* **Adaptive AI Test Generation:**
  Dynamically generates Multiple Choice (Grammar/Syntax) and Key Word Transformation exercises. Prompts are anchored to strict JSON schemas to ensure zero-hallucination outputs and zero UI breaks during dynamic rendering.

* **4D Multi-Dimensional Progress Analytics:**
  A custom visual chart that maps 4 key variables onto a single interface:
  * **Y-Axis:** Execution Accuracy (0–100%)
  * **X-Axis:** Chronological Session Order
  * **Node Size:** Question Volume (sample size per test)
  * **Glowing Aura:** Dynamic CEFR Level difficulty (A1 to C2 color-coded neon indicators)

* **Predictive Test Scoring Engine (TOEFL / IELTS):**
  A live analytics scoreboard that fetches historic telemetry from Supabase and applies a predictive algorithm:
  Score = Accuracy Percentage * CEFR Baseline Multiplier * Volume Confidence Weight
  * **TOEFL iBT Prediction:** Displays an integer score estimate alongside a dynamic ±5 point error margin (e.g., 78–88).
  * **IELTS Band Prediction:** Calculates academic band scores from 1.0 to 9.0 in precise 0.5 increments.
  * **Statistical Confidence Metric:** Automatically evaluates data reliability based on historical sample size (<50 questions = Gathering Data, >150 questions = Mathematically Validated).
  * **US University Target Match:** Maps predicted scores directly against US college admission standards (Ivy League / Top-50 / Regional).

* **Thread-Safe Cloud Persistence:**
  Built with custom state-lock hydration (isHydrated) in Supabase to prevent initial race conditions and ensure zero data loss across multi-device and incognito sessions.

* **Full 9-Language Localization:**
  Complete UI internationalization supporting English, Russian, German, French, Italian, Spanish, Chinese, Japanese, and Korean with responsive flag selector dropdowns.

## 🚀 Local Development Setup

1. Clone the repository: `git clone https://github.com/Amusia-Mikhail/linguist-exam.git`

2. Install dependencies: `npm install`

3. Configure Environment Variables in a `.env` file:
   * `GEMINI_API_KEY=your_gemini_api_key`
   * `VITE_SUPABASE_URL=your_supabase_url`
   * `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`

4. Launch the app: `npm run dev`


