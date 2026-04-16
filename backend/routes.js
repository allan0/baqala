// ================================================
// backend/routes.js - VERSION 27 (Tokenomics + Full Hisaab + PI Prep)
// ================================================
const express = require('express');
const { supabase, getOrCreateTokenBalance } = require('./supabaseClient');
const { OpenAI } = require('openai');
const crypto = require('crypto');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ================================================
// IDENTITY RESOLVER (Telegram + Future PI/Gmail)
// ================================================
async function resolveUser(req) {
    const authId = req.headers['auth_id'];
    const telegramId = req.headers['telegram_id'];
    const displayName = req.headers['display_name'] || 'Resident';
    const avatarUrl = req.headers['avatar_url'] || null;

    try {
        let userId;

        if (authId && authId !== 'null' && authId !== 'undefined') {
            userId = authId;
        } else if (telegramId && telegramId !== 'null' && telegramId !== 'undefined') {
            const hash = crypto.createHash('sha256').update(telegramId.toString()).digest('hex');
            userId = [
                hash.substring(0, 8), hash.substring(8, 12), hash.substring(12, 16),
                hash.substring(16, 20), hash.substring(20, 32)
            ].join('-');
        }

        if (!userId) return null;

        let { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

        if (!profile) {
            const { data: newUser, error } = await supabase.from('profiles').insert([{
                id: userId,
                telegram_id: telegramId ? telegramId.toString() : null,
                display_name: displayName,
                avatar_url: avatarUrl,
                role: 'resident'
            }]).select().single();
            if (error) throw error;
            profile = newUser;
        } else if (avatarUrl && profile.avatar_url !== avatarUrl) {
            await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
        }

        // Ensure token balance exists
        await getOrCreateTokenBalance(profile.id);

        return profile;
    } catch (e) {
        console.error("Identity Error:", e);
        return null;
    }
}

// ================================================
// 1. IDENTITY & PROFILE
// ================================================

router.post('/user/sync', async (req, res) => {
    const user = await resolveUser(req);
    res.json({ success: true, user: user || null });
});

router.post('/user/update', async (req, res) => {
    const { id, display_name, role, fazaa_card } = req.body;
    try {
        const { data, error } = await supabase.from('profiles').update({ display_name, role, fazaa_card }).eq('id', id).select().single();
        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 2. MERCHANT HUB
// ================================================

router.get('/baqala/my-store', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(404).json({ error: "Unauthorized" });

    try {
        const { data: baqala } = await supabase.from('baqalas').select('*, inventory(*)').eq('owner_id', user.id).maybeSingle();
        if (!baqala) return res.status(404).json({ error: "Not registered" });

        const { data: clients } = await supabase.from('hisaab_applications').select('*, profiles(display_name, avatar_url)').eq('baqala_id', baqala.id);
        res.json({ success: true, baqala, clients });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/baqala/register', async (req, res) => {
    try {
        const user = await resolveUser(req);
        if (!user) return res.status(401).json({ error: "Identity required" });

        const { name, wallet_address } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

        const { data: store, error } = await supabase.from('baqalas').insert([{
            id: slug,
            owner_id: user.id,
            owner_telegram_id: user.telegram_id,
            name,
            wallet_address
        }]).select().single();

        if (error) throw error;
        await supabase.from('profiles').update({ role: 'merchant' }).eq('id', user.id);
        res.json({ success: true, baqala: store });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/baqala/inventory/add', async (req, res) => {
    try {
        const { baqala_id, name, price, category } = req.body;
        const { data, error } = await supabase.from('inventory').insert([{ baqala_id, name, price: parseFloat(price), category }]).select().single();
        if (error) throw error;
        res.json({ success: true, item: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 3. LEDGER & HISAB + TOKENOMICS
// ================================================

router.post('/hisaab/apply', async (req, res) => {
    try {
        const user = await resolveUser(req);
        if (!user) return res.status(401).json({ error: "Auth required" });
        const { baqala_id } = req.body;
        await supabase.from('hisaab_applications').insert([{ resident_id: user.id, baqala_id, status: 'pending' }]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/hisaab/ledger', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.json([]);
    try {
        const { data, error } = await supabase.from('hisaab_debts').select('*, baqala:baqalas(name, wallet_address)').eq('resident_id', user.id).eq('is_settled', false);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW: Checkout with automatic BQT token issuance (1 BQT = 1 AED spent)
router.post('/hisaab/checkout', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: "Auth required" });

    const { baqala_id, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: "No items" });

    try {
        let totalAED = 0;
        const orderItems = [];

        for (const item of items) {
            const { data: inv } = await supabase.from('inventory').select('price').eq('id', item.id).single();
            if (!inv) continue;
            const price = parseFloat(inv.price);
            const qty = parseFloat(item.qty) || 1;
            totalAED += price * qty;
            orderItems.push({ ...item, price });
        }

        // Record debt
        const { error: debtError } = await supabase.from('hisaab_debts').insert([{
            resident_id: user.id,
            baqala_id,
            debt: totalAED
        }]);
        if (debtError) throw debtError;

        // Award BQT tokens (1:1 with AED spent)
        const { data: balance } = await getOrCreateTokenBalance(user.id);
        const newBalance = parseFloat(balance.bqt_balance) + totalAED;

        await supabase.from('token_balances').update({ bqt_balance: newBalance }).eq('profile_id', user.id);

        // Record transaction
        await supabase.from('token_transactions').insert([{
            profile_id: user.id,
            baqala_id,
            type: 'earn',
            amount: totalAED,
            aed_equivalent: totalAED,
            description: `Purchase at ${baqala_id} - ${items.length} items`
        }]);

        res.json({ success: true, totalAED, bqtAwarded: totalAED });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// NEW: Get token balance
router.get('/token/balance', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: "Auth required" });

    try {
        const { data } = await supabase.from('token_balances').select('bqt_balance').eq('profile_id', user.id).single();
        res.json({ success: true, bqt: data ? parseFloat(data.bqt_balance) : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW: Redeem BQT (1 BQT = 1 AED discount/settlement)
router.post('/token/redeem', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: "Auth required" });

    const { amount, baqala_id } = req.body; // amount in AED/BQT
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    try {
        const { data: balance } = await supabase.from('token_balances').select('bqt_balance').eq('profile_id', user.id).single();
        if (!balance || parseFloat(balance.bqt_balance) < amount) {
            return res.status(400).json({ error: "Insufficient BQT" });
        }

        // Reduce balance
        const newBalance = parseFloat(balance.bqt_balance) - amount;
        await supabase.from('token_balances').update({ bqt_balance: newBalance }).eq('profile_id', user.id);

        // Record transaction
        await supabase.from('token_transactions').insert([{
            profile_id: user.id,
            baqala_id: baqala_id || null,
            type: 'redeem',
            amount: amount,
            aed_equivalent: amount,
            description: 'BQT redemption for Hisaab settlement'
        }]);

        res.json({ success: true, redeemed: amount, remainingBQT: newBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 4. AI GENIE (Parse → Match inventory)
// ================================================

router.post('/ai/parse', async (req, res) => {
    const { text, lang = 'en', baqala_id } = req.body;
    if (!text) return res.status(400).json({ success: false });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: `You are a helpful grocery assistant for a UAE baqala. Extract items with quantity. Return ONLY valid JSON: { "items": [{ "name": "...", "qty": number }], "profile": "main" or "kids" etc }`
            }, { role: "user", content: text }],
            temperature: 0.3,
            max_tokens: 300
        });

        const raw = completion.choices[0].message.content;
        const parsed = JSON.parse(raw);

        // Optional: match against real inventory if baqala_id provided
        if (baqala_id) {
            const { data: inventory } = await supabase.from('inventory').select('id, name, price').eq('baqala_id', baqala_id);
            // Simple fuzzy match can be improved later
            parsed.items = parsed.items.map(item => {
                const match = inventory.find(i => i.name.toLowerCase().includes(item.name.toLowerCase().slice(0, 4)));
                return match ? { ...item, id: match.id, price: match.price } : item;
            });
        }

        res.json({ success: true, items: parsed.items, orderData: parsed });
    } catch (e) {
        console.error("AI Parse Error:", e);
        res.json({ success: false, error: "Parse failed" });
    }
});

// ================================================
// 5. DISCOVERY
// ================================================

router.get('/baqalas/nearby', async (req, res) => {
    const user = await resolveUser(req);
    try {
        const { data: stores } = await supabase.from('baqalas').select('*, inventory(*)');
        if (!user) return res.json(stores || []);

        const { data: apps } = await supabase.from('hisaab_applications').select('*').eq('resident_id', user.id);
        const enriched = (stores || []).map(s => {
            const app = apps?.find(a => a.baqala_id === s.id);
            return { ...s, isApproved: app?.status === 'approved', isPending: app?.status === 'pending' };
        });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// NOTIFICATIONS (already used by bot)
// ================================================
router.post('/notifications', async (req, res) => {
    // This route can be used by bot or other services
    const { telegram_id, title, message, icon, cta_text, profile_type } = req.body;
    try {
        await supabase.from('notifications').insert([{
            telegram_id,
            title,
            message,
            icon: icon || 'Bell',
            cta_text,
            profile_type: profile_type || 'resident'
        }]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
