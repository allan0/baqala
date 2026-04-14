// ================================================
// backend/bot.js - VERSION 12 (UNIFIED BRAIN)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { supabase } = require('./supabaseClient');
const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL || "https://baqala.vercel.app";
const API_URL = "https://baqala-i2oi.onrender.com/api"; 

// --- COMPREHENSIVE BILINGUAL STRINGS (KHALEEJI FOCUS) ---
const strings = {
  en: {
    welcome: (name) => `Assalamu Alaikum, ${name}! 🛒\n\nWelcome to the Baqala Network. I am your neighborhood AI genie. How would you like to shop today?`,
    store_context: (store) => `Connected to *${store}* 🏪\n\nYou can browse categories below, ask me for prices, or open the full experience in the app.`,
    btn_app: "🚀 Open Mini App",
    btn_browse: "📦 Browse Categories",
    btn_ai: "🧞 Ask AI Genie",
    btn_lang: "🌐 العربية",
    btn_stores: "🏪 Switch Store",
    choose_cat: "Select a category to see what's on the shelves:",
    ai_intro: "I'm checking the stock... type what you need (e.g., 'How much is the Laban?')",
    order_summary: "✨ **AI Genie Summary**:",
    confirm_hisaab: "✅ Add to Digital Tab",
    cancel: "❌ Cancel",
    back: "⬅️ Back to Menu"
  },
  ar: {
    welcome: (name) => `يا هلا بك يا ${name} في شبكة دكاكين! 🛒\n\nأنا مساعدك الذكي في الفريج. كيف أقدر أخدمك اليوم؟`,
    store_context: (store) => `أنت الآن متصل بـ *${store}* 🏪\n\nتقدر تتصفح الأقسام، تسألني عن الأسعار، أو تفتح الدكان في التطبيق.`,
    btn_app: "🚀 افتح تطبيق دكان",
    btn_browse: "📦 تصفح الأقسام",
    btn_ai: "🧞 المساعد الذكي",
    btn_lang: "🌐 English",
    btn_stores: "🏪 تغيير الدكان",
    choose_cat: "اختر القسم اللي تبغيه من دكاننا:",
    ai_intro: "أبشر، اكتب اللي تدور عليه (مثلاً: 'كم سعر الحليب؟') وبشيك لك.",
    order_summary: "✨ **ملخص المساعد الذكي**:",
    confirm_hisaab: "✅ إضافة للحساب الرقمي",
    cancel: "❌ إلغاء",
    back: "⬅️ الرجوع للقائمة"
  }
};

// --- HELPER: GENERATE UNIFIED DEEP LINK ---
// Format: st_STOREID_ln_LANG
const getDeepLink = (storeId, lang) => {
  const param = `st_${storeId || 'default'}_ln_${lang || 'en'}`;
  return `${MINI_APP_URL}?startapp=${param}`;
};

// --- RENDERER: DYNAMIC MAIN MENU ---
const renderMenu = async (ctx, lang, storeId) => {
  const t = strings[lang];
  let storeName = "The Network";

  if (storeId && storeId !== 'default') {
    const { data } = await supabase.from('baqalas').select('name').eq('id', storeId).single();
    if (data) storeName = data.name;
  }

  const welcomeText = (storeId === 'default') 
    ? t.welcome(ctx.from.first_name) 
    : t.store_context(storeName);

  return ctx.replyWithMarkdown(welcomeText, Markup.inlineKeyboard([
    [Markup.button.webApp(t.btn_app, getDeepLink(storeId, lang))],
    [Markup.button.callback(t.btn_browse, `cats_${storeId}_${lang}`)],
    [Markup.button.callback(t.btn_ai, `aiprompt_${lang}`), Markup.button.callback(t.btn_lang, `toggle_${lang === 'en' ? 'ar' : 'en'}_${storeId}`)]
  ]));
};

// ==========================================
// 1. START COMMAND (DEEP LINKING)
// ==========================================

bot.start(async (ctx) => {
  const payload = ctx.startPayload || ""; 
  const parts = payload.split('_');
  
  // startapp format: chat_STOREID_LANG or ai_STOREID_LANG
  const type = parts[0] || 'generic';
  const storeId = parts[1] || 'default';
  const lang = parts[2] || 'en';

  await renderMenu(ctx, lang, storeId);
});

// ==========================================
// 2. CATEGORY BROWSING LOGIC
// ==========================================

bot.action(/cats_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, lang] = ctx.match;
  const t = strings[lang];

  // Common Baqala Categories
  const cats = ['Snacks', 'Dairy', 'Beverages', 'Household'];
  const buttons = cats.map(c => [Markup.button.callback(c, `list_${storeId}_${c}_${lang}`)]);
  buttons.push([Markup.button.callback(t.back, `menu_${storeId}_${lang}`)]);

  ctx.editMessageText(t.choose_cat, Markup.inlineKeyboard(buttons));
});

bot.action(/list_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, cat, lang] = ctx.match;
  
  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('baqala_id', storeId)
    .ilike('category', cat);

  let text = `📦 *${cat}* Inventory:\n\n`;
  if (!items || items.length === 0) text += strings[lang].no_items;
  else items.forEach(i => text += `• ${i.name}: *AED ${i.price.toFixed(2)}*\n`);

  ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
    [Markup.button.webApp(strings[lang].btn_app, getDeepLink(storeId, lang))],
    [Markup.button.callback("⬅️ Back", `cats_${storeId}_${lang}`)]
  ]));
});

// ==========================================
// 3. AI GENIE CONTEXTUAL CHAT
// ==========================================

bot.action(/aiprompt_(.+)/, (ctx) => {
  const lang = ctx.match[1];
  ctx.reply(strings[lang].ai_intro);
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  const isAr = /[\u0600-\u06FF]/.test(text);
  const lang = isAr ? 'ar' : 'en';
  const t = strings[lang];

  const loading = await ctx.reply(isAr ? "جاري البحث في الرفوف..." : "Checking the shelves...");

  try {
    const res = await axios.post(`${API_URL}/ai/parse`, { text, lang });
    if (res.data.success) {
      const { items, profile } = res.data.orderData;
      let summary = `${t.order_summary}\n\n`;
      items.forEach(i => summary += `• ${i.qty}x ${i.name} (~AED ${i.price})\n`);
      summary += `\n${isAr ? 'الملف' : 'Profile'}: *${profile}*`;

      await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
      ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
        [Markup.button.callback(t.confirm_hisaab, 'confirm_order')],
        [Markup.button.callback(t.cancel, 'cancel_order')],
        [Markup.button.webApp(t.btn_app, getDeepLink('default', lang))]
      ]));
    }
  } catch (e) {
    ctx.reply(isAr ? "السموحة، ما فهمت عليك. جرب طلب أبسط." : "I couldn't parse that. Try something simpler like '2 waters'.");
  }
});

// ==========================================
// 4. NAVIGATION & LANGUAGE
// ==========================================

bot.action(/toggle_(.+)_(.+)/, (ctx) => {
  const [_, newLang, storeId] = ctx.match;
  return renderMenu(ctx, newLang, storeId);
});

bot.action(/menu_(.+)_(.+)/, (ctx) => {
  const [_, storeId, lang] = ctx.match;
  ctx.deleteMessage();
  return renderMenu(ctx, lang, storeId);
});

bot.action('confirm_order', (ctx) => {
  ctx.answerCbQuery("Done!");
  ctx.editMessageText("✅ Order Anchored! The merchant is preparing your items and your Digital Hisaab has been updated.");
});

bot.action('cancel_order', (ctx) => {
  ctx.editMessageText("Order discarded.");
});

// ==========================================
// 5. SERVER RUNTIME (EXPRESS)
// ==========================================

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes); // Shared API routes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend Protocol Active on ${PORT}`));

bot.launch().then(() => console.log('🤖 Unified Bot Brain Online'));

// Graceful Shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
