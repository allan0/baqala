// ================================================
// backend/bot.js - MAIN ENTRY POINT (Supabase Version)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
const express = require('express');
const cors = require('cors');

const supabase = require('./supabaseClient');
const routes = require('./routes');   // ← New routes file

const app = express();
app.use(cors());
app.use(express.json());

// Mount all API routes under /api
app.use('/api', routes);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
      Markup.button.webApp('Open Baqala App', process.env.MINI_APP_URL)
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
      // TODO: Later we will insert into unpaid_items table here
    }

    await ctx.reply(replyText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([Markup.button.webApp('View in App', process.env.MINI_APP_URL)])
    });

  } catch (error) {
    console.error("AI Order Error:", error);
    ctx.reply("Sorry, I couldn't process your order. Please try again.");
  }
});

// ==========================================
// EXPRESS SERVER + ROUTES
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Baqala Backend Server running on port ${PORT}`);
  console.log(`📡 Connected to Supabase`);
});

bot.launch()
  .then(() => console.log("🤖 Telegram Bot is running..."))
  .catch((err) => console.error("❌ Bot failed to start:", err.message));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
