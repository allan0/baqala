// ================================================
// backend/bot.js - FINAL STABLE VERSION
// ================================================

require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// Standard Middleware
app.use(cors());
app.use(express.json());

// MOUNT ROUTES
app.use('/api', routes);

// HEALTH CHECK (To verify server is up)
app.get('/', (req, res) => res.send('Baqala API is Running'));

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Bot Commands
bot.start((ctx) => ctx.reply('Welcome to Baqala Network! Use the app to order.'));

// Startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API Server listening on port ${PORT}`);
});

bot.launch()
  .then(() => console.log('🤖 Telegram Bot started'))
  .catch(err => console.error('Bot Error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
