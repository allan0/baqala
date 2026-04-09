// ================================================
// backend/bot.js - MAIN FILE (Supabase Version)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
const express = require('express');
const cors = require('cors');

const supabase = require('./supabaseClient');   // ← New Supabase client

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// 1. SYSTEM PROMPT (AI Order Extractor)
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
// 2. HELPER FUNCTIONS
// ==========================================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Initialize user if not exists
async function initUserIfMissing(telegramId, name = "User") {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error("Error checking user:", error);
    return null;
  }

  if (!data) {
    await supabase.from('users').insert({
      telegram_id: telegramId,
      name: name,
      reminder_threshold: 100
    });
  }
  return true;
}

// ==========================================
// 3. TELEGRAM BOT LOGIC
// ==========================================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const name = ctx.from.first_name;

  await initUserIfMissing(userId, name);

  ctx.reply('Welcome to the Baqala Network! Open the Mini App to browse nearby Baqalas, apply for Hisaab, and settle debts.',
    Markup.inlineKeyboard([Markup.button.webApp('Open Baqala App', process.env.MINI_APP_URL)])
  );
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  await initUserIfMissing(userId, ctx.from.first_name);

  ctx.reply("Processing your order using AI...");

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

    // For now we use 'main' profile. Later we can improve this.
    let profileKey = (orderData.profile || 'main').toLowerCase().replace(/\s+/g, '_');

    let replyText = `🧾 **Order Summary:**\n`;
    let addedCost = 0;

    orderData.items.forEach(item => {
      const itemTotal = item.qty * item.price;
      addedCost += itemTotal;
      replyText += `- ${item.qty}x ${item.name} (AED ${itemTotal.toFixed(2)})\n`;
    });

    if (orderData.payment === 'hisaab') {
      // TODO: Insert into unpaid_items table (we'll implement in next files)
      replyText += `\n**Added to Hisaab:** AED ${addedCost.toFixed(2)}`;
    }

    await ctx.reply(replyText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([Markup.button.webApp('View Hisaab', process.env.MINI_APP_URL)])
    });

  } catch (error) {
    console.error(error);
    ctx.reply("Sorry, I couldn't process that order.");
  }
});

// ==========================================
// 4. EXPRESS API SERVER (to be updated gradually)
// ==========================================
app.get('/api/baqalas/nearby', async (req, res) => {
  const { lat, lng } = req.query;

  let query = supabase.from('baqalas').select('*');

  if (lat && lng) {
    // Simple distance calculation can be improved later with PostGIS
    const { data } = await query;
    const nearby = data.map(b => ({
      ...b,
      distance: getDistance(parseFloat(lat), parseFloat(lng), b.lat, b.lng)
    })).sort((a, b) => a.distance - b.distance);
    return res.json(nearby);
  }

  const { data } = await query;
  res.json(data || []);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'supabase' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Secure API Server running on port ${PORT}`);
});

bot.launch()
  .then(() => console.log("🤖 Baqala AI Bot is running..."))
  .catch((err) => console.error("❌ Telegram Bot failed to start:", err.message));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
