// ================================================
// backend/supabaseClient.js - VERSION 2.0 (Tokenomics + PI Ready)
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
 * Standard Supabase Client (used by most routes)
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: { 'x-application-name': 'baqala-network' }
  }
});

/**
 * RLS Scoped Client - Critical for Telegram users
 * Uses the custom policy: current_setting('app.current_telegram_id')
 */
const getScopedClient = (telegramId) => {
  if (!telegramId) {
    console.warn("⚠️ getScopedClient called without telegramId");
    return supabase;
  }

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
 * Sets the RLS context for the current transaction
 * This satisfies the PostgreSQL policy we created in the SQL schema
 */
async function setRlsContext(client, telegramId) {
  if (!telegramId) return;
  try {
    await client.rpc('set_app_context', { tg_id: telegramId.toString() });
  } catch (err) {
    console.error("Failed to set RLS context:", err.message);
  }
}

/**
 * Quick helper to get or create token balance for a user
 * (Used by tokenomics logic later)
 */
async function getOrCreateTokenBalance(profileId) {
  const { data, error } = await supabase
    .from('token_balances')
    .select('bqt_balance')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: newBalance } = await supabase
      .from('token_balances')
      .insert([{ profile_id: profileId, bqt_balance: 0 }])
      .select()
      .single();
    return newBalance;
  }
  return data;
}

console.log("✅ Supabase client initialized - Baqala Network v2.0 (Tokenomics + PI Ready)");

module.exports = {
  supabase,
  getScopedClient,
  setRlsContext,
  getOrCreateTokenBalance   // ← New helper for tokenomics
};
