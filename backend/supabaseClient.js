// ================================================
// backend/supabaseClient.js - VERSION 3.0 (Web3 & Tokenomics Engine)
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
 * Core Supabase Client
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

/**
 * IDENTITY RESOLVER
 * Converts a Telegram ID into a Supabase Profile UUID.
 * Creates the profile and initial token balance if they don't exist.
 */
async function resolveProfile(telegramId, displayName = 'Resident', avatarUrl = null) {
  if (!telegramId) return null;
  const tgStr = telegramId.toString();

  try {
    // 1. Check for existing profile
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', tgStr)
      .maybeSingle();

    if (error) throw error;

    // 2. Create profile if it's a first-time user
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          telegram_id: tgStr,
          display_name: displayName,
          avatar_url: avatarUrl,
          role: 'resident'
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      profile = newProfile;
    }

    // 3. Ensure Token Balance row exists and check for Monthly Unlocks
    await ensureTokenomics(profile.id);

    return profile;
  } catch (err) {
    console.error("❌ Profile Resolution Error:", err.message);
    return null;
  }
}

/**
 * TOKENOMICS ENGINE
 * 1. Ensures a row exists in token_balances
 * 2. Triggers the SQL function perform_monthly_unlock if 30 days have passed
 */
async function ensureTokenomics(profileId) {
  try {
    const { data: balance, error: fetchError } = await supabase
      .from('token_balances')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!balance) {
      // Create initial zero balance
      await supabase
        .from('token_balances')
        .insert([{ profile_id: profileId, locked_balance: 0, available_balance: 0 }]);
      return;
    }

    // Check if it's time for the monthly 10% unlock
    const lastUnlock = new Date(balance.last_unlock_date);
    const now = new Date();
    const daysSince = (now - lastUnlock) / (1000 * 60 * 60 * 24);

    if (daysSince >= 30 && balance.locked_balance > 0) {
      console.log(`💎 Triggering monthly BQT unlock for ${profileId}`);
      const { error: rpcError } = await supabase.rpc('perform_monthly_unlock', { 
        target_user_id: profileId 
      });
      if (rpcError) throw rpcError;
    }
  } catch (err) {
    console.error("❌ Tokenomics Sync Error:", err.message);
  }
}

/**
 * MERCHANT HELPER
 * Fetches store details along with inventory
 */
async function getBaqalaByOwner(profileId) {
  return await supabase
    .from('baqalas')
    .select('*, inventory(*)')
    .eq('owner_id', profileId)
    .maybeSingle();
}

console.log("✅ Supabase Engine v3.0 Online (BQT Tokenomics + Identity Mapping)");

module.exports = {
  supabase,
  resolveProfile,
  ensureTokenomics,
  getBaqalaByOwner
};
