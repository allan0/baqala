// ================================================
// backend/bot.js - VERSION 15 (Tokenomics + Full Telegram MVP)
// ================================================

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { supabase } = require('./supabaseClient');
const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const MINI_APP_URL = "https://baqala.vercel.app";
const BOT_HANDLE = "Baqalas_bot";
const API_URL = "https://baqala-i2oi.onrender.com/api";

// --- KHALEEJI & ENGLISH LOCALIZATION ---
const strings = {
  en: {
    welcome: (name) => `Assalamu Alaikum, ${name}! 🛒\n\nI am your neighborly AI concierge. I can check prices, browse categories, or open your neighborhood stores.`,
    store_context: (store) => `Connected to *${store}* 🏪\n\nHow can I help you shop today?`,
    btn_app: "🚀 Open Mini App",
    btn_browse: "📦 Browse Shelves",
    btn_ai: "🧞 Talk to AI Genie",
    btn_lang: "🌐 العربية",
    btn_back: "⬅️ Back to Menu",
    choose_cat: "Select a category to view live prices:",
    ai_intro: "I'm checking the shelves... what are you looking for? (e.g., 'How much is the Laban?')",
    order_preview: "✨ **AI Genie Parsing Results**:",
    confirm_hisaab: "✅ Add to Digital Hisaab",
    cancel: "❌ Cancel",
    no_items: "This section is currently empty.",
    lang_switched: "Language switched to English 🇺🇸",
    open_cart: "🛒 Finish Order in App",
    processing: "Processing...",
    balance: (bqt) => `💎 *Your Baqala Tokens*\n\nYou have *${bqt} BQT*\n(1 BQT = 1 AED spent or redeemed)`
  },
  ar: {
    welcome: (name) => `يا هلا بك يا ${name} في شبكة دكاكين! 🛒\n\nأنا مساعدك الذكي في الفريج.`,
    store_context: (store) => `أنت الآن متصل بـ *${store}* 🏪\n\nكيف أقدر أخدمك اليوم؟`,
    btn_app: "🚀 افتح تطبيق دكان",
    btn_browse: "📦 تصفح الأرفف",
    btn_ai: "🧞 المساعد الذكي",
    btn_lang: "🌐 English",
    btn_back: "⬅️ الرجوع للقائمة",
    choose_cat: "اختر القسم اللي تبغيه من دكاننا:",
    ai_intro: "أبشر، اكتب اللي تدور عليه (مثلاً: 'كم سعر الحليب؟')",
    order_preview: "✨ **ملخص المساعد الذكي**:",
    confirm_hisaab: "✅ إضافة للحساب الرقمي",
    cancel: "❌ إلغاء",
    no_items: "هذا القسم ما فيه بضاعة حالياً.",
    lang_switched: "تم تغيير اللغة إلى العربية 🇦🇪",
    open_cart: "🛒 كمل الطلب في التطبيق",
    processing: "لحظات...",
    balance: (bqt) => `💎 *توكنات بقالاتك*\n\nلديك *${bqt} BQT*\n(1 BQT = 1 درهم صرفت أو استرددت)`
  }
};

// --- DEEP LINK ---
const getDeepLink = (storeId, lang) => {
  const param = `st_${storeId || 'default'}_ln_${lang || 'en'}`;
  return `https://t.me/${BOT_HANDLE}/app?startapp=${param}`;
};

// --- SEND MENU ---
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
    [Markup.button.url(t.btn_app, getDeepLink(storeId, lang))],
    [Markup.button.callback(t.btn_browse, `cats_${storeId}_${lang}`)],
    [Markup.button.callback(t.btn_ai, `aiprompt_${lang}`), Markup.button.callback(t.btn_lang, `toggle_${lang === 'en' ? 'ar' : 'en'}_${storeId}`)]
  ]));
};

// ==========================================
// COMMAND HANDLERS
// ==========================================

bot.start(async (ctx) => {
  const payload = ctx.startPayload || ""; 
  const parts = payload.split('_');
  const storeId = payload.startsWith('st_') ? parts[1] : 'default';
  const lang = payload.includes('_ln_') ? parts[parts.length - 1] : 'en';

  const processingMessage = await ctx.reply(strings[lang].processing);

  try {
    await sendMenu(ctx, lang, storeId);
  } catch (error) {
    console.error("Error in /start handler:", error);
    ctx.reply("Sorry, something went wrong.");
  } finally {
    ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
  }
});

// New command: /balance
bot.command('balance', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  try {
    const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_id', telegramId).single();
    if (!profile) return ctx.reply("Please start the bot first with /start");

    const { data } = await supabase.from('token_balances').select('bqt_balance').eq('profile_id', profile.id).single();
    const bqt = data ? parseFloat(data.bqt_balance).toFixed(0) : 0;

    const lang = /[\u0600-\u06FF]/.test(ctx.message.text) ? 'ar' : 'en';
    ctx.replyWithMarkdown(strings[lang].balance(bqt));
  } catch (e) {
    ctx.reply("Could not fetch your balance.");
  }
});

// ==========================================
// INVENTORY BROWSING
// ==========================================

bot.action(/cats_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, lang] = ctx.match;
  const t = strings[lang];

  const categories = ['Snacks', 'Dairy', 'Beverages', 'Household'];
  const buttons = categories.map(c => [Markup.button.callback(c, `list_${storeId}_${c}_${lang}`)]);
  buttons.push([Markup.button.callback(t.btn_back, `menu_${storeId}_${lang}`)]);

  ctx.editMessageText(t.choose_cat, Markup.inlineKeyboard(buttons));
});

bot.action(/list_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, storeId, cat, lang] = ctx.match;
  const t = strings[lang];

  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('baqala_id', storeId)
    .ilike('category', cat);

  let text = `📦 *${cat}* Inventory at this Baqala:\n\n`;
  if (!items || items.length === 0) {
    text += t.no_items;
  } else {
    items.forEach(i => {
      text += `• ${i.name}: *AED ${i.price.toFixed(2)}*\n`;
    });
  }

  ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
    [Markup.button.url(t.open_cart, getDeepLink(storeId, lang))],
    [Markup.button.callback("⬅️ Back to Categories", `cats_${storeId}_${lang}`)]
  ]));
});

// ==========================================
// LANGUAGE & NAVIGATION
// ==========================================

bot.action(/toggle_(.+)_(.+)/, async (ctx) => {
  const [_, newLang, storeId] = ctx.match;
  ctx.answerCbQuery(strings[newLang].lang_switched);
  await ctx.deleteMessage();
  return sendMenu(ctx, newLang, storeId);
});

bot.action(/menu_(.+)_(.+)/, (ctx) => {
  const [_, storeId, lang] = ctx.match;
  ctx.deleteMessage();
  return sendMenu(ctx, lang, storeId);
});

// ==========================================
// AI GENIE
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

  const loading = await ctx.reply(isArabic ? "جاري البحث..." : "Checking shelves...");

  try {
    const res = await axios.post(`${API_URL}/ai/parse`, { text, lang });
    if (res.data.success) {
      const { items } = res.data.orderData;
      let summary = `*${t.order_preview}*\n\n`;
      items.forEach(i => summary += `• ${i.qty}x ${i.name}\n`);

      await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
      
      return ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
        [Markup.button.callback(t.confirm_hisaab, 'confirm_order')],
        [Markup.button.callback(t.cancel, 'cancel_order')],
        [Markup.button.url(t.btn_app, getDeepLink('default', lang))]
      ]));
    }
  } catch (e) {
    ctx.reply(isArabic ? "ما فهمت عليك، جرب مرة ثانية." : "I couldn't parse that. Try something like '2 small waters'.");
  } finally {
    ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id).catch(() => {});
  }
});

bot.action('confirm_order', async (ctx) => {
  ctx.answerCbQuery("Ledger Updated!");
  ctx.editMessageText("✅ **Success!** Your order has been anchored to your Digital Hisaab.\n\nYou earned BQT tokens! Use /balance to check.");
});

bot.action('cancel_order', (ctx) => {
  ctx.editMessageText("Discarded.");
});

// ==========================================
// NOTIFICATION HELPER
// ==========================================

const sendNotification = async (telegramId, message, keyboard) => {
  try {
    await bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    return { success: true };
  } catch (error) {
    console.error(`Failed to send notification to ${telegramId}:`, error);
    return { success: false, error };
  }
};

// ==========================================
// SERVER
// ==========================================

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', (req, res, next) => {
  req.bot = { sendNotification };
  next();
}, routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Baqala Protocol running on port ${PORT}`);
});

bot.launch().then(() => console.log('🤖 @Baqalas_bot is Online'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = {
  bot,
  sendNotification,
};
