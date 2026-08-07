import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://your-supabase-url.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "your_supabase_anon_key";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  try {
    console.log("Checking user_profiles schema...");
    const { data: profs, error: err1 } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1);
    
    if (err1) {
      console.error("Error fetching user_profiles:", err1);
    } else {
      console.log("user_profiles row:", profs);
    }

    console.log("Attempting to insert a test user profile...");
    const testUsername = "temp_test_user_" + Math.floor(Math.random() * 1000000);
    const { error: insProfErr } = await supabase
      .from("user_profiles")
      .insert({
        username: testUsername,
        nickname: "Temp Test User",
        selected_level: "B1",
        baseline_level: "B1",
        goal_level: "C1",
        target_test_count: 12
      });
    
    if (insProfErr) {
      console.error("Error inserting user_profile:", insProfErr);
    } else {
      console.log("Successfully inserted user_profile!");
    }

    console.log("Attempting to insert a test result with created_at and test_level...");
    const { error: insResErr } = await supabase
      .from("test_results")
      .insert({
        username: testUsername,
        score: 85,
        total_questions: 10,
        correct_answers: 8,
        created_at: new Date().toISOString(),
        test_level: "B1"
      });

    if (insResErr) {
      console.error("Error inserting test_result:", insResErr);
    } else {
      console.log("Successfully inserted test_result!");
    }
  } catch (err: any) {
    console.error("Unexpected error:", err);
  }
}

run();

