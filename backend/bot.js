// ================================================
// backend/bot.js - VERSION 8 (Deep Linking & AI)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const routes = require('./routes');

const app = express();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL || "https://baqala.vercel.app";
const API_URL = `http://localhost:${process.env.PORT || 3000}/api`;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.get('/', (req, res) => res.send('Baqala API & Bot active.'));

// ==========================================
// TELEGRAM BOT LOGIC
// ==========================================

// 1. HANDLE /START (With Deep Linking)
bot.start(async (ctx) => {
  const startPayload = ctx.startPayload; // This catches the "chat_STOREID" part
  const firstName = ctx.from.first_name || 'Neighbor';

  if (startPayload && startPayload.startsWith('chat_')) {
    const storeId = startPayload.replace('chat_', '');
    
    // Welcome user to the specific store
    return ctx.reply(
      `Welcome to ${storeId.split('-')[0].toUpperCase()} Baqala! 🏪\n\n` +
      `I am your AI Assistant for this store. You can:\n` +
      `1. Order via text (e.g., "Send me 2 Laban Ups and bread")\n` +
      `2. Check your Hisaab tab\n` +
      `3. Chat with the shop owner.`,
      Markup.inlineKeyboard([
        [Markup.button.webApp('🛒 Open Storefront', `${MINI_APP_URL}`)],
        [Markup.button.callback('📒 View My Hisaab', 'view_hisaab')]
      ])
    );
  }

  // Generic Start
  ctx.reply(
    `Assalamu Alaikum, ${firstName}! Welcome to the Baqala Network. 🛒\n\n` +
    `Modernizing UAE neighborhood stores with Digital Hisaab and Crypto micro-payments.`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Launch Baqala Network', MINI_APP_URL)],
      [Markup.button.url('📢 Join Community', 'https://t.me/baqala_network')]
    ])
  );
});

// 2. AI ORDERING VIA TEXT
bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  // Ignore commands
  if (text.startsWith('/')) return;

  const loadingMsg = await ctx.reply('🧞 Thinking...');

  try {
    // Call the AI Parsing route we created in routes.js
    const response = await axios.post(`${API_URL}/ai/parse`, { text });
    
    if (response.data.success) {
      const { items, profile } = response.data.orderData;
      
      let summary = `✨ **AI Genie parsed your order:**\n\n`;
      items.forEach(i => {
        summary += `• ${i.qty}x ${i.name}\n`;
      });
      summary += `\nAdding to profile: **${profile}**`;

      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      
      return ctx.reply(summary, Markup.inlineKeyboard([
        [Markup.button.callback('✅ Confirm & Add to Hisaab', 'confirm_ai_order')],
        [Markup.button.callback('❌ Cancel', 'cancel_order')]
      ]));
    }
  } catch (e) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    ctx.reply("The Genie is a bit confused. Try saying something like: 'Get me two milks and a chocolate on my main tab.'");
  }
});

// 3. ACTION HANDLERS (Callback Queries)
bot.action('view_hisaab', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Opening your records...", Markup.inlineKeyboard([
    [Markup.button.webApp('📒 Open Hisaab Tab', `${MINI_APP_URL}`)]
  ]));
});

bot.action('confirm_ai_order', (ctx) => {
  ctx.answerCbQuery("Order confirmed!");
  ctx.editMessageText("✅ Order confirmed and added to your store tab. The merchant has been notified!");
});

bot.action('cancel_order', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("Order cancelled. Anything else I can help with?");
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Baqala Backend running on port ${PORT}`);
});

bot.launch().then(() => console.log('🤖 Baqala Bot is Online'));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
