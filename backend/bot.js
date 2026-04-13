// ================================================
// backend/bot.js - MAIN ENTRY + AI AUTO-HISAAB
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', routes);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MINI_APP_URL = process.env.MINI_APP_URL || "https://baqala.vercel.app";

// ==========================================
// SYSTEM PROMPT FOR BOT CHAT
// ==========================================
const SYSTEM_PROMPT = `
You are a UAE Baqala Assistant. 
Extract items and target profile from the user's message.
Format strictly as JSON: 
{ 
  "intent": "purchase", 
  "profile": "string", 
  "items": [{"name": "string", "qty": number, "price": number}] 
}
Defaults: Profile="Main". 
Assumed Prices (AED): Laban=2, Chips=1.5, Bread=4.5, Milk=6, Water=1, Tea=15.
`;

// ==========================================
// HELPER: USER & PROFILE SYNC
// ==========================================
async function syncUserAndGetProfile(ctx) {
  const tgUser = ctx.from;
  const telegramId = tgUser.id.toString();

  try {
    // 1. Check/Create User
    let { data: user, error: uError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!user) {
      const { data: newUser } = await supabase.from('users').insert({
        telegram_id: telegramId,
        name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
        avatar_url: `https://ui-avatars.com/api/?name=${tgUser.first_name}`
      }).select().single();
      user = newUser;
      console.log(`✨ New User Registered: ${telegramId}`);
    }

    // 2. Check/Create "Main" Profile
    let { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_telegram_id', telegramId)
      .eq('name', 'Main')
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await supabase.from('profiles').insert({
        user_telegram_id: telegramId,
        name: 'Main'
      }).select().single();
      profile = newProfile;
    }

    return profile.id;
  } catch (err) {
    console.error("Sync Error:", err);
    return null;
  }
}

// ==========================================
// TELEGRAM BOT COMMANDS
// ==========================================

bot.start(async (ctx) => {
  await syncUserAndGetProfile(ctx);
  
  ctx.replyWithMarkdownV2(
    `🏪 *Welcome to Baqala Network\\!*\n\nI am your AI Grocery Genie\\. You can order by typing here or use the Mini App for a premium experience\\.`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Open Baqala App', MINI_APP_URL)],
      [Markup.button.url('💬 Support', 'https://t.me/baqala_support')]
    ])
  );
});

// Handle Orders via Direct Text
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  const profileId = await syncUserAndGetProfile(ctx);
  ctx.reply("🤖 Thinking...");

  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: text }],
      temperature: 0.1,
    });

    const orderData = JSON.parse(aiResponse.choices[0].message.content);
    
    if (orderData.items && orderData.items.length > 0) {
      // Find a default Baqala (for bot-only orders, we assign to a general pool or first available)
      // In production, users would 'link' to a specific Baqala first.
      const { data: firstBaqala } = await supabase.from('baqalas').select('id, name').limit(1).single();

      if (!firstBaqala) {
        return ctx.reply("🏪 No Baqalas found in the network yet. Please use the app to find one!");
      }

      // Map items for DB insertion
      const itemsToInsert = orderData.items.map(item => ({
        profile_id: profileId,
        baqala_id: firstBaqala.id,
        name: item.name,
        qty: item.qty || 1,
        price: item.price || 5,
        crypto_discount: 10
      }));

      const { error } = await supabase.from('unpaid_items').insert(itemsToInsert);

      if (error) throw error;

      let summary = `✅ *Items added to ${orderData.profile || 'Main'} Hisaab:*\n`;
      let total = 0;
      orderData.items.forEach(i => {
        const lineTotal = (i.qty || 1) * i.price;
        total += lineTotal;
        summary += `• ${i.qty || 1}x ${i.name} \\(AED ${lineTotal.toFixed(2)}\\)\n`;
      });
      summary += `\n💰 *Total added:* AED ${total.toFixed(2)}\n🏪 *Store:* ${firstBaqala.name}`;

      ctx.replyWithMarkdownV2(summary, Markup.inlineKeyboard([
        Markup.button.webApp('View Full Statement', MINI_APP_URL)
      ]));
    } else {
      ctx.reply("🤔 I couldn't find any items in that message. Try: 'Add 1 Laban to my tab'");
    }

  } catch (error) {
    console.error("AI Order Error:", error);
    ctx.reply("❌ Sorry, I had trouble processing that. Use the app instead?", 
      Markup.inlineKeyboard([Markup.button.webApp('Open App', MINI_APP_URL)])
    );
  }
});

// ==========================================
// SERVER STARTUP
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Baqala API: Port ${PORT}`);
});

bot.launch().then(() => console.log("🤖 Baqala Bot: Active"));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
