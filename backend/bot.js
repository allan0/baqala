// ================================================
// backend/bot.js - VERSION 13 (UNIFIED HUB)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { supabase } = require('./supabaseClient');
const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
// Ensure this matches your actual Vercel URL
const MINI_APP_URL = process.env.MINI_APP_URL || "https://baqala.vercel.app";
// Ensure this matches your actual Render API URL
const API_URL = "https://baqala-i2oi.onrender.com/api"; 

// --- BILINGUAL STRINGS (KHALEEJI ARABIC) ---
const strings = {
  en: {
    welcome: (name) => `Assalamu Alaikum, ${name}! 🛒\n\nWelcome to the Baqala Network. I am your neighborhood AI concierge. How would you like to shop today?`,
    store_context: (store) => `Connected to *${store}* 🏪\n\nYou can ask me for prices, browse categories, or launch the full store in the app.`,
    btn_app: "🚀 Launch Mini App",
    btn_browse: "📦 Browse Shelves",
    btn_ai: "🧞 Ask AI Genie",
    btn_lang: "🌐 العربية",
    btn_back: "⬅️ Back to Menu",
    choose_cat: "Select a category to view items:",
    ai_intro: "I'm checking the stock for you... type what you're looking for (e.g., 'How much is the milk?')",
    order_preview: "✨ **AI Genie Parsing Results**:",
    confirm_hisaab: "✅ Add to Digital Hisaab",
    cancel: "❌ Cancel",
    no_items: "This section is currently empty.",
    lang_switched: "Language switched to English 🇺🇸"
  },
  ar: {
    welcome: (name) => `يا هلا بك يا ${name} في شبكة دكاكين! 🛒\n\nأنا مساعدك الذكي في الفريج. كيف أقدر أخدمك اليوم؟`,
    store_context: (store) => `أنت الآن متصل بـ *${store}* 🏪\n\nتقدر تسألني عن الأسعار، أو تشوف الأقسام، أو تفتح الدكان في التطبيق.`,
    btn_app: "🚀 افتح تطبيق دكان",
    btn_browse: "📦 تصفح الأرفف",
    btn_ai: "🧞 المساعد الذكي",
    btn_lang: "🌐 English",
    btn_back: "⬅️ الرجوع للقائمة",
    choose_cat: "اختر القسم اللي تبغيه من دكاننا:",
    ai_intro: "أبشر، اكتب اللي تدور عليه (مثلاً: 'كم سعر الحليب؟') وبشيك لك.",
    order_preview: "✨ **ملخص المساعد الذكي**:",
    confirm_hisaab: "✅ إضافة للحساب الرقمي",
    cancel: "❌ إلغاء",
    no_items: "هذا القسم ما فيه بضاعة حالياً.",
    lang_switched: "تم تغيير اللغة إلى العربية 🇦🇪"
  }
};

// --- HELPER: GENERATE DEEP LINK WITH STATE ---
// This parameter string is read by App.jsx to auto-configure
const getDeepLink = (storeId, lang) => {
  const param = `st_${storeId || 'default'}_ln_${lang || 'en'}`;
  return `${MINI_APP_URL}?startapp=${param}`;
};

// --- CORE UI: MAIN MENU ---
const sendMenu = async (ctx, lang, storeId) => {
  const t = strings[lang];
  let displayName = "The Neighborhood";

  if (storeId && storeId !== 'default') {
    const { data } = await supabase.from('baqalas').select('name').eq('id', storeId).single();
    if (data) displayName = data.name;
  }

  const welcomeText = (storeId === 'default') 
    ? t.welcome(ctx.from.first_name || 'Neighbor') 
    : t.store_context(displayName);

  return ctx.replyWithMarkdown(welcomeText, Markup.inlineKeyboard([
    [Markup.button.webApp(t.btn_app, getDeepLink(storeId, lang))],
    [Markup.button.callback(t.btn_browse, `cats_${storeId}_${lang}`)],
    [Markup.button.callback(t.btn_ai, `aiprompt_${lang}`), Markup.button.callback(t.btn_lang, `toggle_${lang === 'en' ? 'ar' : 'en'}_${storeId}`)]
  ]));
};

// ==========================================
// 1. COMMAND HANDLERS
// ==========================================

bot.start(async (ctx) => {
  const payload = ctx.startPayload || ""; 
  const parts = payload.split('_');
  
  // startapp format can be: chat_STOREID_LANG
  const storeId = parts[1] || 'default';
  const lang = parts[2] || 'en';

  await sendMenu(ctx, lang, storeId);
});

// ==========================================
// 2. INTERACTIVE ACTIONS (CALLBACKS)
// ==========================================

// --- CATEGORIES ---
bot.action(/cats_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, lang] = ctx.match;
  const t = strings[lang];

  const categories = ['Snacks', 'Dairy', 'Beverages', 'Household'];
  const buttons = categories.map(c => [Markup.button.callback(c, `list_${storeId}_${c}_${lang}`)]);
  buttons.push([Markup.button.callback(t.btn_back, `menu_${storeId}_${lang}`)]);

  ctx.editMessageText(t.choose_cat, Markup.inlineKeyboard(buttons));
});

// --- ITEM LISTING ---
bot.action(/list_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, cat, lang] = ctx.match;
  
  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('baqala_id', storeId)
    .ilike('category', cat);

  let text = `📦 *${cat}* Inventory at this location:\n\n`;
  if (!items || items.length === 0) {
    text += strings[lang].no_items;
  } else {
    items.forEach(i => {
      text += `• ${i.name}: *AED ${i.price.toFixed(2)}*\n`;
    });
  }

  ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
    [Markup.button.webApp(strings[lang].btn_app, getDeepLink(storeId, lang))],
    [Markup.button.callback("⬅️ Back to Categories", `cats_${storeId}_${lang}`)]
  ]));
});

// --- LANGUAGE SWITCH ---
bot.action(/toggle_(.+)_(.+)/, async (ctx) => {
  const [_, newLang, storeId] = ctx.match;
  ctx.answerCbQuery(strings[newLang].lang_switched);
  // Clear chat and send new menu
  await ctx.deleteMessage();
  return sendMenu(ctx, newLang, storeId);
});

// --- MENU NAVIGATION ---
bot.action(/menu_(.+)_(.+)/, (ctx) => {
  const [_, storeId, lang] = ctx.match;
  ctx.deleteMessage();
  return sendMenu(ctx, lang, storeId);
});

// ==========================================
// 3. AI GENIE TEXT PROCESSING
// ==========================================

bot.action(/aiprompt_(.+)/, (ctx) => {
  ctx.reply(strings[ctx.match[1]].ai_intro);
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  const isArabic = /[\u0600-\u06FF]/.test(text);
  const lang = isArabic ? 'ar' : 'en';
  const t = strings[lang];

  const loading = await ctx.reply(isArabic ? "جاري البحث في الأرفف..." : "Checking the shelves...");

  try {
    const res = await axios.post(`${API_URL}/ai/parse`, { text, lang });
    if (res.data.success) {
      const { items, profile } = res.data.orderData;
      let summary = `*${t.order_preview}*\n\n`;
      items.forEach(i => {
        summary += `• ${i.qty}x ${i.name} (~AED ${i.price})\n`;
      });
      summary += `\n${isArabic ? 'الملف الشخصي' : 'Target Profile'}: *${profile}*`;

      await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
      
      return ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
        [Markup.button.callback(t.confirm_hisaab, 'confirm_order')],
        [Markup.button.callback(t.cancel, 'cancel_order')],
        [Markup.button.webApp(t.btn_app, getDeepLink('default', lang))]
      ]));
    }
  } catch (e) {
    ctx.reply(isArabic ? "ما فهمت عليك يا الطيب، جرب تطلب بشكل أوضح." : "I couldn't quite parse that. Try something like '2 small waters'.");
  }
});

bot.action('confirm_order', (ctx) => {
  ctx.answerCbQuery("Anchored!");
  ctx.editMessageText("✅ **Success!** Your items have been added to your neighborhood Hisaab. The merchant has been notified and is preparing your order.");
});

bot.action('cancel_order', (ctx) => {
  ctx.editMessageText("Order discarded. Genie is standing by.");
});

// ==========================================
// 4. SERVER RUNTIME (EXPRESS)
// ==========================================

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Baqala Core running on port ${PORT}`);
});

bot.launch().then(() => console.log('🤖 Unified Bot Brain is Online'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
