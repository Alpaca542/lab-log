import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xqjwuepjtozhpvtsiyrg.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxand1ZXBqdG96aHB2dHNpeXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTE3ODMsImV4cCI6MjA3MTQyNzc4M30.al3WNqa5myI1nyAI9bpZfOp5plGF9F3QYrtUuvEIXhI";

if (!supabaseUrl) {
    // eslint-disable-next-line no-console
    console.warn("Supabase URL not set");
}
if (!supabaseKey) {
    console.warn("Supabase anon key not set – auth calls may fail.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
});

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseKey;
export const logout = async () => {
    await supabase.auth.signOut();
};

export default supabase;
