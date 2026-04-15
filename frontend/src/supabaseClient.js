// ================================================
// frontend/src/supabaseClient.js
// VERSION 1 (PRODUCTION FRONTEND CLIENT)
// ================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase credentials missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your Vercel Environment Variables."
  );
}

// Create a single supabase client for the entire app
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

export default supabase;
