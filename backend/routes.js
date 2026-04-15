// ================================================
// backend/routes.js - VERSION 26 (STABLE PROD)
// ================================================
const express = require('express');
const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const crypto = require('crypto');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * IDENTITY RESOLVER
 * Maps Telegram, Web Auth, and Guests to a single UUID.
 */
async function resolveUser(req) {
    const authId = req.headers['auth_id']; 
    const telegramId = req.headers['telegram_id'];
    const displayName = req.headers['display_name'] || 'Resident';
    const avatarUrl = req.headers['avatar_url'] || null;

    try {
        let userId;

        // 1. Determine UUID
        if (authId && authId !== 'null' && authId !== 'undefined') {
            userId = authId;
        } else if (telegramId && telegramId !== 'null' && telegramId !== 'undefined') {
            // Consistent UUID from Telegram ID
            const hash = crypto.createHash('sha256').update(telegramId.toString()).digest('hex');
            userId = [
                hash.substring(0, 8), hash.substring(8, 12), hash.substring(12, 16),
                hash.substring(16, 20), hash.substring(20, 32)
            ].join('-');
        }

        if (!userId) return null;

        // 2. Fetch or Create Profile
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        
        if (!profile) {
            const { data: newUser, error: createError } = await supabase.from('profiles').insert([{
                id: userId,
                telegram_id: telegramId ? telegramId.toString() : null,
                display_name: displayName,
                avatar_url: avatarUrl,
                role: 'resident'
            }]).select().single();
            if (createError) throw createError;
            profile = newUser;
        } else {
            // Update photo/name if changed
            if (avatarUrl && profile.avatar_url !== avatarUrl) {
                await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
            }
        }
        return profile;
    } catch (e) {
        console.error("Identity Error:", e);
        return null;
    }
}

// ==========================================
// 1. IDENTITY & PROFILE
// ==========================================

router.post('/user/sync', async (req, res) => {
    const user = await resolveUser(req);
    // Never return 401 here to allow guests to enter.
    res.json({ success: true, user: user || null });
});

router.post('/user/update', async (req, res) => {
    const { id, display_name, role, fazaa_card } = req.body;
    try {
        const { data, error } = await supabase.from('profiles').update({ display_name, role, fazaa_card }).eq('id', id).select().single();
        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. MERCHANT HUB
// ==========================================

router.get('/baqala/my-store', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(404).json({ error: "Unauthorized" });

    try {
        const { data: baqala } = await supabase.from('baqalas').select('*, inventory(*)').eq('owner_id', user.id).maybeSingle();
        if (!baqala) return res.status(404).json({ error: "Not registered" });

        const { data: clients } = await supabase.from('hisaab_applications').select('*, profiles(display_name, avatar_url)').eq('baqala_id', baqala.id);
        res.json({ success: true, baqala, clients });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/baqala/inventory/add', async (req, res) => {
    try {
        const { baqala_id, name, price, category } = req.body;
        const { data, error } = await supabase.from('inventory').insert([{ baqala_id, name, price: parseFloat(price), category }]).select().single();
        if (error) throw error;
        res.json({ success: true, item: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. LEDGER & DISCOVERY
// ==========================================

router.post('/hisaab/apply', async (req, res) => {
    try {
        const user = await resolveUser(req);
        if (!user) return res.status(401).json({ error: "Auth required" });
        const { baqala_id } = req.body;
        await supabase.from('hisaab_applications').insert([{ resident_id: user.id, baqala_id, status: 'pending' }]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/hisaab/ledger', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.json([]);
    try {
        const { data, error } = await supabase.from('hisaab_debts').select('*, baqala:baqalas(name, wallet_address, crypto_discount)').eq('resident_id', user.id).eq('is_settled', false);
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
