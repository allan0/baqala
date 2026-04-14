// ================================================
// backend/bot.js - VERSION 11 (UNIFIED ECOSYSTEM)
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
const API_URL = `https://baqala-i2oi.onrender.com/api`; // Your Render URL

// --- COMPREHENSIVE LOCALIZATION ---
const strings = {
  en: {
    welcome_new: (name) => `Assalamu Alaikum, ${name}! 🛒\n\nWelcome to the Baqala Network. I am your AI assistant for the neighborhood. How can I help you today?`,
    welcome_store: (store) => `Connected to *${store}* 🏪\n\nYou can ask me for prices, browse categories, or open the store in the app.`,
    btn_open_app: "🚀 Open in Mini App",
    btn_browse: "📦 Browse Categories",
    btn_ai: "🧞 Ask AI Genie",
    btn_lang: "🌐 العربية",
    btn_switch_store: "🏪 Switch Store",
    choose_cat: "Select a category to see what's on the shelves:",
    ai_intro: "I'm checking the stock... type what you need (e.g., 'How much is the Laban?')",
    no_items: "This section is empty right now.",
    order_summary: "✨ AI Genie Summary:",
    confirm_hisaab: "✅ Confirm & Add to Hisaab",
    cancel: "❌ Cancel"
  },
  ar: {
    welcome_new: (name) => `يا هلا بك يا ${name} في شبكة دكاكين! 🛒\n\nأنا مساعدك الذكي في الفريج. كيف أقدر أخدمك اليوم؟`,
    welcome_store: (store) => `أنت الآن متصل بـ *${store}* 🏪\n\nتقدر تسألني عن الأسعار، تشوف الأقسام، أو تفتح الدكان في التطبيق.`,
    btn_open_app: "🚀 افتح تطبيق دكان",
    btn_browse: "📦 تصفح الأقسام",
    btn_ai: "🧞 المساعد الذكي",
    btn_lang: "🌐 English",
    btn_switch_store: "🏪 تغيير الدكان",
    choose_cat: "اختر القسم اللي تبغيه من دكاننا:",
    ai_intro: "أبشر، اكتب اللي تدور عليه (مثلاً: 'كم سعر الحليب؟') وبشيك لك.",
    no_items: "هذا القسم ما فيه بضاعة حالياً.",
    order_summary: "✨ ملخص المساعد الذكي:",
    confirm_hisaab: "✅ تأكيد وإضافة للحساب",
    cancel: "❌ إلغاء"
  }
};

// --- HELPER: GENERATE DEEP LINK ---
// This tells the Mini App exactly which store and language to load
const getAppUrl = (storeId, lang) => {
  const param = `st_${storeId}_ln_${lang}`;
  return `${MINI_APP_URL}?startapp=${param}`;
};

// --- MAIN MENU RENDERER ---
const sendMainMenu = async (ctx, lang, storeId) => {
  const t = strings[lang];
  let storeName = "The Network";

  if (storeId && storeId !== 'default') {
    const { data } = await supabase.from('baqalas').select('name').eq('id', storeId).single();
    if (data) storeName = data.name;
  }

  const text = (storeId === 'default') ? t.welcome_new(ctx.from.first_name) : t.welcome_store(storeName);

  return ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
    [Markup.button.webApp(t.btn_open_app, getAppUrl(storeId, lang))],
    [Markup.button.callback(t.btn_browse, `cats_${storeId}_${lang}`)],
    [Markup.button.callback(t.btn_ai, `aiprompt_${lang}`), Markup.button.callback(t.btn_lang, `togglelang_${lang === 'en' ? 'ar' : 'en'}_${storeId}`)]
  ]));
};

// ==========================================
// 1. COMMANDS & DEEP LINKING
// ==========================================

bot.start(async (ctx) => {
  const payload = ctx.startPayload || ""; 
  const parts = payload.split('_');
  
  // startapp format: chat_STOREID_LANG
  const storeId = parts[1] || 'default';
  const lang = parts[2] || 'en';

  await sendMainMenu(ctx, lang, storeId);
});

// ==========================================
// 2. CATEGORY & ITEM BROWSING
// ==========================================

bot.action(/cats_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, lang] = ctx.match;
  const t = strings[lang];

  const categories = ['Snacks', 'Dairy', 'Beverages', 'Household'];
  const buttons = categories.map(c => [Markup.button.callback(c, `items_${storeId}_${c}_${lang}`)]);
  buttons.push([Markup.button.callback("⬅️ Back", `menu_${storeId}_${lang}`)]);

  ctx.editMessageText(t.choose_cat, Markup.inlineKeyboard(buttons));
});

bot.action(/items_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, cat, lang] = ctx.match;
  
  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('baqala_id', storeId)
    .ilike('category', cat);

  let listText = `📦 *${cat}* items at this Baqala:\n\n`;
  if (!items || items.length === 0) {
    listText += strings[lang].no_items;
  } else {
    items.forEach(i => {
      listText += `• ${i.name}: *AED ${i.price.toFixed(2)}*\n`;
    });
  }

  ctx.replyWithMarkdown(listText, Markup.inlineKeyboard([
    [Markup.button.webApp("🛒 Add to Tab in App", getAppUrl(storeId, lang))],
    [Markup.button.callback("⬅️ Back to Categories", `cats_${storeId}_${lang}`)]
  ]));
});

// ==========================================
// 3. AI CHAT INTERFACE
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

  const wait = await ctx.reply(isAr ? "جاري البحث..." : "Thinking...");

  try {
    const res = await axios.post(`${API_URL}/ai/parse`, { text, lang });
    if (res.data.success) {
      const { items, profile } = res.data.orderData;
      let summary = `*${t.order_summary}*\n\n`;
      items.forEach(i => summary += `• ${i.qty}x ${i.name} (~AED ${i.price})\n`);
      summary += `\nTarget Profile: *${profile}*`;

      await ctx.telegram.deleteMessage(ctx.chat.id, wait.message_id);
      ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
        [Markup.button.callback(t.confirm_hisaab, 'confirm_order')],
        [Markup.button.callback(t.cancel, 'cancel_order')]
      ]));
    }
  } catch (e) {
    ctx.reply(isAr ? "ما فهمت عليك، جرب مرة ثانية." : "I couldn't parse that. Try something simpler!");
  }
});

// ==========================================
// 4. LANGUAGE & NAVIGATION
// ==========================================

bot.action(/togglelang_(.+)_(.+)/, (ctx) => {
  const [_, newLang, storeId] = ctx.match;
  ctx.answerCbQuery(newLang === 'ar' ? "تم تغيير اللغة" : "Language Switched");
  return sendMainMenu(ctx, newLang, storeId);
});

bot.action(/menu_(.+)_(.+)/, (ctx) => {
  const [_, storeId, lang] = ctx.match;
  ctx.deleteMessage();
  return sendMainMenu(ctx, lang, storeId);
});

bot.action('confirm_order', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("✅ Done! Items added to your neighborhood Hisaab. The merchant is preparing them now.");
});

bot.action('cancel_order', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("Discarded.");
});

// ==========================================
// 5. SERVER INFRASTRUCTURE
// ==========================================

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes); // Mount routes for internal AI parsing calls

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Baqala Backend Active on ${PORT}`));

bot.launch().then(() => console.log('🤖 Bot Logic Online'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
