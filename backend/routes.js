// ================================================
// backend/routes.js - VERSION 3.0 (Full Web3 MVP)
// ================================================
const express = require('express');
const { supabase, resolveProfile, getBaqalaByOwner } = require('./supabaseClient');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * MIDDLEWARE: Identify User
 * Uses headers to resolve Telegram ID to a Supabase UUID.
 */
const withUser = async (req, res, next) => {
    const telegramId = req.headers['telegram_id'];
    const displayName = req.headers['display_name'];
    
    if (!telegramId) return res.status(401).json({ error: "Telegram ID required" });
    
    const profile = await resolveProfile(telegramId, displayName);
    if (!profile) return res.status(500).json({ error: "Identity resolution failed" });
    
    req.user = profile;
    next();
};

// ================================================
// 1. IDENTITY & PROFILE
// ================================================

router.post('/user/sync', withUser, async (req, res) => {
    res.json({ success: true, user: req.user });
});

// ================================================
// 2. MERCHANT OPERATIONS (Fixed Listing)
// ================================================

router.get('/baqala/my-store', withUser, async (req, res) => {
    try {
        const { data: baqala, error } = await getBaqalaByOwner(req.user.id);
        if (error || !baqala) return res.status(404).json({ error: "No store found" });

        const { data: clients } = await supabase
            .from('hisaab_applications')
            .select('*, profiles(display_name, avatar_url)')
            .eq('baqala_id', baqala.id);

        res.json({ success: true, baqala, clients });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/baqala/register', withUser, async (req, res) => {
    const { name, wallet_address } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    try {
        const { data: store, error } = await supabase.from('baqalas').insert([{
            id: slug,
            owner_id: req.user.id,
            name,
            wallet_address
        }]).select().single();

        if (error) throw error;
        await supabase.from('profiles').update({ role: 'merchant' }).eq('id', req.user.id);
        res.json({ success: true, baqala: store });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/baqala/inventory/add', withUser, async (req, res) => {
    const { name, price, category } = req.body;
    
    try {
        // Find the baqala owned by this user
        const { data: baqala } = await getBaqalaByOwner(req.user.id);
        if (!baqala) return res.status(403).json({ error: "Merchant store not found" });

        const { data: item, error } = await supabase.from('inventory').insert([{
            baqala_id: baqala.id,
            name,
            price: parseFloat(price),
            category
        }]).select().single();

        if (error) throw error;

        // Note: SQL Trigger 'on_item_added' handles the BQT minting automatically
        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 3. HISAAB & TOKENOMICS (The Spending Engine)
// ================================================

router.post('/hisaab/checkout', withUser, async (req, res) => {
    const { baqala_id, items } = req.body; // items: [{id, qty}]
    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    try {
        let totalAED = 0;
        
        // Calculate total from DB prices (Don't trust frontend prices)
        for (const item of items) {
            const { data: inv } = await supabase.from('inventory').select('price').eq('id', item.id).single();
            if (inv) totalAED += parseFloat(inv.price) * (item.qty || 1);
        }

        // 1. Record the Debt
        const { error: debtError } = await supabase.from('hisaab_debts').insert([{
            resident_id: req.user.id,
            baqala_id,
            debt_amount: totalAED
        }]);
        if (debtError) throw debtError;

        // 2. Award Locked BQT (1:1 with AED)
        const { data: balance } = await supabase.from('token_balances').select('*').eq('profile_id', req.user.id).single();
        const newLocked = parseFloat(balance.locked_balance || 0) + totalAED;
        const newTotal = parseFloat(balance.total_earned || 0) + totalAED;

        await supabase.from('token_balances').update({ 
            locked_balance: newLocked, 
            total_earned: newTotal 
        }).eq('profile_id', req.user.id);

        // 3. Record Token Transaction
        await supabase.from('token_transactions').insert([{
            profile_id: req.user.id,
            baqala_id,
            type: 'earn_spend',
            amount: totalAED,
            description: `Earned from purchase at ${baqala_id}`
        }]);

        res.json({ success: true, totalAED, bqtAwarded: totalAED });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/token/balance', withUser, async (req, res) => {
    try {
        const { data } = await supabase.from('token_balances').select('*').eq('profile_id', req.user.id).single();
        res.json({ 
            success: true, 
            locked: data?.locked_balance || 0,
            available: data?.available_balance || 0 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 4. AI GENIE (Fuzzy Matching Logic)
// ================================================

router.post('/ai/parse', withUser, async (req, res) => {
    const { text, baqala_id } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: `Extract grocery items and quantities. UAE Context. 
                Return JSON only: {"items": [{"name": string, "qty": number}]}`
            }, { role: "user", content: text }],
            temperature: 0,
        });

        const parsed = JSON.parse(completion.choices[0].message.content);

        // SYNC: Match AI output with REAL database inventory
        if (baqala_id) {
            const { data: inventory } = await supabase.from('inventory').select('*').eq('baqala_id', baqala_id);
            
            parsed.items = parsed.items.map(aiItem => {
                // Find closest match in inventory (simple includes check)
                const match = inventory.find(inv => 
                    inv.name.toLowerCase().includes(aiItem.name.toLowerCase()) ||
                    aiItem.name.toLowerCase().includes(inv.name.toLowerCase())
                );
                return match ? { ...aiItem, id: match.id, price: match.price, matched: true } : { ...aiItem, matched: false };
            });
        }

        res.json({ success: true, items: parsed.items });
    } catch (err) {
        res.status(500).json({ error: "AI Parsing failed" });
    }
});

// ================================================
// 5. DISCOVERY
// ================================================

router.get('/baqalas/nearby', async (req, res) => {
    try {
        const { data: stores } = await supabase.from('baqalas').select('*, inventory(*)');
        res.json(stores || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
