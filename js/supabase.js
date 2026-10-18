const SUPABASE_URL = "https://jwphpfxfdghtqminrcah.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AwYB9l0qMui8DgYmyXVSLA_Ja1TdExA";

if (!window.supabase?.createClient) {
  throw new Error("Supabase JS did not load. Check the CDN script in index.html.");
}

window.skiddioSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);