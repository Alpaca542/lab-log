import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xqjwuepjtozhpvtsiyrg.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxand1ZXBqdG96aHB2dHNpeXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTE3ODMsImV4cCI6MjA3MTQyNzc4M30.al3WNqa5myI1nyAI9bpZfOp5plGF9F3QYrtUuvEIXhI";
const supabase = createClient(supabaseUrl, supabaseKey);

// Export URL & anon key for direct Edge Function fetch (needed for SSE streaming)
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseKey;

export default supabase;
