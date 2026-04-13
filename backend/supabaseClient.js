// ================================================
// backend/supabaseClient.js
// Centralized Supabase Client with RLS context support
// ================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Missing Supabase credentials in .env file");
  process.exit(1);
}

/**
 * Standard Supabase Client
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

/**
 * RLS Helper: returns a client scoped to a specific Telegram User.
 * This satisfies the SQL policy: current_setting('app.current_telegram_id')
 */
const getScopedClient = (telegramId) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-app-telegram-id': telegramId.toString(),
      },
    },
    db: {
      schema: 'public',
    },
  });
};

/**
 * Database initialization helper
 * Sets the local session variable for the current transaction
 */
async function setRlsContext(client, telegramId) {
  // We use a RPC or a simple query to set the session variable 
  // since Supabase RLS policies rely on current_setting
  await client.rpc('set_app_context', { tg_id: telegramId.toString() });
}

console.log("✅ Supabase client initialized for Baqala Network");

module.exports = {
  supabase,
  getScopedClient
};
