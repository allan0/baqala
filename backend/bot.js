// ================================================
// backend/bot.js - MAIN ENTRY POINT (Supabase Version)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
const express = require('express');
const cors = require('cors');

const supabase = require('./supabaseClient');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

// Mount all API routes under /api
app.use('/api', routes);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// BETTER ENVIRONMENT CHECK FOR RENDER
// ==========================================
console.log("🚀 Starting Baqala Backend on Render...");

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TELEGRAM_BOT_TOKEN'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ MISSING ENVIRONMENT VARIABLE: ${key}`);
    console.error("Please add it in Render Dashboard → Environment tab");
    process.exit(1);
  }
}

console.log("✅ All required environment variables are loaded");
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? "✓ Set" : "✗ Missing"}`);
// ==========================================
// SYSTEM PROMPT FOR AI ORDER EXTRACTION
// ==========================================
const SYSTEM_PROMPT = `
You are an AI order extractor for a UAE Baqala. 
Extract intent, items, and the target profile/person if mentioned.
Format strictly as JSON: 
{ 
  "intent": "purchase", 
  "payment": "hisaab"|"cash", 
  "profile": "string", 
  "items": [{"name": "string", "qty": number, "price": number}] 
}
Assume reasonable AED prices.
`;

// ==========================================
// HELPER FUNCTIONS
// ==========================================
async function initUserIfMissing(telegramId, name = "User") {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error checking user:", error);
      return;
    }

    if (!data) {
      await supabase.from('users').insert({
        telegram_id: telegramId,
        name: name,
        reminder_threshold: 100
      });
      console.log(`New user created: ${name} (${telegramId})`);
    }
  } catch (err) {
    console.error("initUserIfMissing failed:", err);
  }
}

// ==========================================
// TELEGRAM BOT LOGIC
// ==========================================
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const name = ctx.from.first_name || "User";

  await initUserIfMissing(userId, name);

  ctx.reply(
    '🏪 Welcome to Baqala Network!\n\nOpen the Mini App to browse nearby stores, apply for Hisaab, and manage your orders.',
    Markup.inlineKeyboard([
      Markup.button.webApp('Open Baqala App', process.env.MINI_APP_URL || 'https://baqala.vercel.app')
    ])
  );
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  await initUserIfMissing(userId, ctx.from.first_name);

  ctx.reply("🤖 Processing your order with AI...");

  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: ctx.message.text }
      ],
      temperature: 0.1,
    });

    const orderData = JSON.parse(aiResponse.choices[0].message.content);

    let replyText = `🧾 **Order Summary**\n`;
    let addedCost = 0;

    orderData.items.forEach(item => {
      const itemTotal = (item.qty || 1) * item.price;
      addedCost += itemTotal;
      replyText += `- ${item.qty || 1}x ${item.name} (AED ${itemTotal.toFixed(2)})\n`;
    });

    if (orderData.payment === 'hisaab') {
      replyText += `\n**✅ Added to Hisaab:** AED ${addedCost.toFixed(2)}`;
    }

    await ctx.reply(replyText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([Markup.button.webApp('View in App', process.env.MINI_APP_URL || 'https://baqala.vercel.app')])
    });

  } catch (error) {
    console.error("AI Order Error:", error);
    ctx.reply("Sorry, I couldn't process your order. Please try again or speak more clearly.");
  }
});

// ==========================================
// EXPRESS SERVER
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Baqala Backend Server is running on port ${PORT}`);
  console.log(`📡 Connected to Supabase successfully`);
});

bot.launch()
  .then(() => console.log("🤖 Telegram Bot is running successfully..."))
  .catch((err) => {
    console.error("❌ Telegram Bot failed to start:", err.message);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
