require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

// ==========================================
// 1. PERSISTENT JSON DATABASE SETUP
// ==========================================
const DB_FILE = path.join(__dirname, 'database.json');
const defaultDB = {
    users: {},     
    baqalas: {
        'bq_mock': { 
            id: 'bq_mock', name: "Al Madina Baqala (Mock)", ownerId: "12345", 
            lat: 24.4539, lng: 54.3773, 
            inventory:[{ id: 1, name: "Karak", price: 2, cryptoDiscount: 10 }] 
        }
    },   
    applications:[] 
};

let db;
if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
} else {
    db = defaultDB;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}


// ==========================================
// 2. SECURITY MIDDLEWARE (TELEGRAM AUTH)
// ==========================================
const authenticateTelegram = (req, res, next) => {
    const initData = req.headers['x-telegram-init-data'];
    
    // Bypass for local desktop development
    if (!initData && process.env.NODE_ENV !== 'production') {
        return next(); 
    }
    
    if (!initData) return res.status(401).json({ error: "Missing Telegram Auth Data" });

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        
        const dataCheckString = Array.from(urlParams.entries())
            .map(([key, value]) => `${key}=${value}`)
            .sort()
            .join('\n');
            
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
                                .update(process.env.TELEGRAM_BOT_TOKEN)
                                .digest();
                                
        const calculatedHash = crypto.createHmac('sha256', secretKey)
                                     .update(dataCheckString)
                                     .digest('hex');
        
        if (calculatedHash !== hash) {
            return res.status(403).json({ error: "Invalid Signature. Hacker detected!" });
        }
        next(); 
    } catch (err) {
        return res.status(403).json({ error: "Auth verification failed." });
    }
};

// Apply security to all /api/ routes
app.use('/api', authenticateTelegram);


// ==========================================
// 3. TELEGRAM AI BOT LOGIC
// ==========================================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function initUserIfMissing(userId, name = "User") {
    if (!db.users[userId]) {
        db.users[userId] = {
            name: name,
            reminderThreshold: 100, 
            profiles: { main: { name: 'Main', debt: 0, unpaidItems:[] } }
        };
        saveDB();
    }
}

const SYSTEM_PROMPT = `
You are an AI order extractor for a UAE Baqala. 
Extract intent, items, and the target profile/person if mentioned.
Format strictly as JSON: 
{ "intent": "purchase", "payment": "hisaab"|"cash", "profile": "string", "items":[{"name": "string", "qty": number, "price": number}] }
Assume reasonable AED prices.
`;

bot.start((ctx) => {
    initUserIfMissing(ctx.from.id, ctx.from.first_name);
    ctx.reply('Welcome to the Baqala Network! Open the Mini App to browse nearby Baqalas, apply for Hisaab, and settle debts.',
        Markup.inlineKeyboard([Markup.button.webApp('Open Baqala App', process.env.MINI_APP_URL)])
    );
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    initUserIfMissing(userId, ctx.from.first_name);

    ctx.reply("Processing your order using AI...");
    try {
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages:[
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: ctx.message.text }
            ],
            temperature: 0.1,
        });

        const orderData = JSON.parse(aiResponse.choices[0].message.content);
        let profileKey = (orderData.profile || 'main').toLowerCase().replace(/\s+/g, '_');
        
        if (!db.users[userId].profiles[profileKey]) {
            db.users[userId].profiles[profileKey] = { name: orderData.profile || 'Main', debt: 0, unpaidItems:[] };
        }

        let replyText = `🧾 **Order Summary (${db.users[userId].profiles[profileKey].name}):**\n`;
        let addedCost = 0;

        orderData.items.forEach(item => {
            const itemTotal = item.qty * item.price;
            addedCost += itemTotal;
            replyText += `- ${item.qty}x ${item.name} (AED ${itemTotal.toFixed(2)})\n`;
            
            if (orderData.payment === 'hisaab') {
                db.users[userId].profiles[profileKey].unpaidItems.push({
                    ...item, cryptoDiscount: 10, baqalaId: 'ai-bot'
                });
            }
        });
        
        if (orderData.payment === 'hisaab') {
            db.users[userId].profiles[profileKey].debt += addedCost;
            saveDB(); 
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
// 4. REST API ENDPOINTS
// ==========================================
app.get('/api/user/:userId', (req, res) => {
    initUserIfMissing(req.params.userId, req.query.name);
    const userApps = db.applications.filter(a => String(a.userId) === String(req.params.userId));
    res.json({ user: db.users[req.params.userId], applications: userApps });
});

app.post('/api/hisaab/:userId/profile', (req, res) => {
    initUserIfMissing(req.params.userId);
    const { name } = req.body;
    const profileKey = name.toLowerCase().replace(/\s+/g, '_');
    if (!db.users[req.params.userId].profiles[profileKey]) {
        db.users[req.params.userId].profiles[profileKey] = { name, debt: 0, unpaidItems:[] };
        saveDB();
    }
    res.json(db.users[req.params.userId]);
});

app.post('/api/user/:userId/threshold', (req, res) => {
    initUserIfMissing(req.params.userId);
    db.users[req.params.userId].reminderThreshold = Number(req.body.threshold) || 100;
    saveDB();
    res.json({ success: true, threshold: db.users[req.params.userId].reminderThreshold });
});

app.post('/api/baqala', (req, res) => {
    const { name, lat, lng, ownerId, walletAddress } = req.body;
    const baqalaId = 'bq_' + Date.now();
    db.baqalas[baqalaId] = { id: baqalaId, name, lat, lng, ownerId, walletAddress, inventory:[] };
    saveDB();
    res.json({ success: true, baqala: db.baqalas[baqalaId] });
});

app.post('/api/baqala/:baqalaId/item', (req, res) => {
    const { name, price, cryptoDiscount } = req.body;
    const baqala = db.baqalas[req.params.baqalaId];
    if (baqala) {
        baqala.inventory.push({ id: Date.now(), name, price: parseFloat(price), cryptoDiscount: parseFloat(cryptoDiscount) });
        saveDB();
        res.json({ success: true, inventory: baqala.inventory });
    } else {
        res.status(404).json({ error: "Baqala not found" });
    }
});

app.get('/api/baqala/owner/:ownerId', (req, res) => {
    const baqala = Object.values(db.baqalas).find(b => String(b.ownerId) === String(req.params.ownerId));
    if (!baqala) return res.json(null);
    const apps = db.applications.filter(a => a.baqalaId === baqala.id);
    res.json({ baqala, applications: apps });
});

app.get('/api/baqalas/nearby', (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.json(Object.values(db.baqalas));

    const nearby = Object.values(db.baqalas).map(b => {
        return { ...b, distance: getDistance(lat, lng, b.lat, b.lng) };
    }).sort((a, b) => a.distance - b.distance);
    
    res.json(nearby);
});

app.post('/api/apply', (req, res) => {
    const { userId, userName, baqalaId } = req.body;
    const exists = db.applications.find(a => a.userId == userId && a.baqalaId == baqalaId);
    if (exists) return res.status(400).json({ error: "Application already exists" });

    db.applications.push({ id: Date.now(), userId, userName, baqalaId, status: 'pending', limit: 0 });
    saveDB();
    
    const baqala = db.baqalas[baqalaId];
    if (baqala) {
        bot.telegram.sendMessage(baqala.ownerId, `🔔 **New Hisaab Application!**\nCustomer: ${userName}\nOpen your Vendor Dashboard to approve and set a limit.`, { parse_mode: "Markdown" }).catch(err => console.error(err));
    }
    res.json({ success: true });
});

app.post('/api/approve', (req, res) => {
    const { appId, limit } = req.body;
    const appRecord = db.applications.find(a => a.id === appId);
    if (appRecord) {
        appRecord.status = 'approved';
        appRecord.limit = Number(limit);
        saveDB();
        bot.telegram.sendMessage(appRecord.userId, `🎉 **Hisaab Approved!**\nYour credit limit at a local Baqala has been set to AED ${limit}. You can now purchase items on credit!`, { parse_mode: "Markdown" }).catch(err => console.error(err));
    }
    res.json({ success: true });
});

app.post('/api/hisaab/:userId/buy', (req, res) => {
    const { profileKey, items, baqalaId } = req.body; 
    const userId = req.params.userId;
    initUserIfMissing(userId);
    
    const approval = db.applications.find(a => String(a.userId) === String(userId) && a.baqalaId === baqalaId && a.status === 'approved');
    if (!approval) return res.status(403).json({ error: "You are not approved for Hisaab at this Baqala." });

    const targetProfile = db.users[userId].profiles[profileKey];
    let newCost = 0;
    
    items.forEach(item => {
        newCost += (item.price * item.qty);
        targetProfile.unpaidItems.push(item);
    });

    if ((targetProfile.debt + newCost) > approval.limit) {
        return res.status(400).json({ error: `Purchase exceeds credit limit of AED ${approval.limit}` });
    }

    targetProfile.debt += newCost;
    saveDB();

    res.json({ success: true, user: db.users[userId] });
});

app.post('/api/hisaab/:userId/settle', (req, res) => {
    const { profileKey } = req.body;
    initUserIfMissing(req.params.userId);
    db.users[req.params.userId].profiles[profileKey].unpaidItems = [];
    db.users[req.params.userId].profiles[profileKey].debt = 0;
    saveDB();
    res.json({ success: true });
});

bot.launch()
    .then(() => console.log("🤖 Baqala AI Bot is running..."))
    .catch((err) => {
        console.error("❌ Telegram Bot failed to start:", err.message);
        console.error("💡 Tip: If you are in the UAE, ensure your VPN is active to reach api.telegram.org.");
    });app.listen(3000, () => console.log("🌐 Secure API Server running on port 3000"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
