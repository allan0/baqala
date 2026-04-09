// ================================================
// backend/supabaseClient.js
// Centralized Supabase Client for the entire backend
// ================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Missing Supabase credentials in .env file");
  console.error("Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env");
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'x-application-name': 'baqala-network'
    }
  }
});

console.log("✅ Supabase client initialized successfully");

module.exports = supabase;
