// ================================================
// backend/routes.js - VERSION 17 (FINAL PRODUCTION)
// ================================================
const express = require('express');
const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * UNIFIED IDENTITY RESOLVER
 * Converts headers (auth_id or telegram_id) into a single DB profile.
 */
async function resolveUser(req) {
    const authId = req.headers['auth_id']; // UUID from Supabase Auth (Gmail/Email)
    const telegramId = req.headers['telegram_id']; // String ID from Telegram

    try {
        if (authId) {
            const { data } = await supabase.from('profiles').select('*').eq('id', authId).single();
            return data;
        } else if (telegramId) {
            // Find user by Telegram ID
            let { data: profile } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId.toString()).single();
            
            // If Telegram user doesn't exist in 'profiles' yet, create them.
            // Note: This user won't have an 'auth.users' entry until they link an email.
            if (!profile) {
                const { data: newUser, error } = await supabase.from('profiles').insert([{
                    telegram_id: telegramId.toString(),
                    display_name: req.headers['display_name'] || 'Resident',
                    role: 'resident'
                }]).select().single();
                if (error) throw error;
                profile = newUser;
            }
            return profile;
        }
    } catch (e) {
        console.error("Identity Resolution Error:", e);
        return null;
    }
    return null;
}

// ==========================================
// 1. AUTH & PROFILE MANAGEMENT
// ==========================================

// Sync user on frontend mount
router.post('/user/sync', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ success: true, user });
});

// Update profile details (Name, Fazaa, Avatar)
router.post('/user/update', async (req, res) => {
    const { id, display_name, role, fazaa_card, avatar_url } = req.body;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ display_name, role, fazaa_card, avatar_url })
            .eq('id', id)
            .select().single();
        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. MERCHANT HUB (BAQALA OWNER)
// ==========================================

// Fetch current user's baqala data (Fixes the "Section not showing" bug)
router.get('/baqala/my-store', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: "User context required" });

    try {
        // Find baqala owned by this user UUID
        const { data: baqala, error: bError } = await supabase
            .from('baqalas')
            .select('*, inventory(*)')
            .eq('owner_id', user.id)
            .single();

        if (bError || !baqala) return res.status(404).json({ error: "No baqala found" });

        // Fetch pending/approved credit applications for this store
        const { data: clients } = await supabase
            .from('hisaab_applications')
            .select('*, profiles(display_name, avatar_url)')
            .eq('baqala_id', baqala.id);

        res.json({ success: true, baqala, clients });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Register a new Baqala storefront
router.post('/baqala/register', async (req, res) => {
    const user = await resolveUser(req);
    const { name, wallet_address } = req.body;
    if (!user) return res.status(401).json({ error: "Must be logged in" });

    try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
        
        const { data: store, error } = await supabase.from('baqalas').insert([{
            id: slug,
            owner_id: user.id,
            owner_telegram_id: user.telegram_id,
            name,
            wallet_address
        }]).select().single();

        if (error) throw error;

        // Upgrade user profile role to 'merchant'
        await supabase.from('profiles').update({ role: 'merchant' }).eq('id', user.id);

        res.json({ success: true, baqala: store });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add items to baqala inventory
router.post('/baqala/inventory/add', async (req, res) => {
    const { baqala_id, name, price, category } = req.body;
    try {
        const { data, error } = await supabase.from('inventory').insert([{
            baqala_id, name, price: parseFloat(price), category
        }]).select().single();
        if (error) throw error;
        res.json({ success: true, item: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete item from inventory
router.delete('/baqala/inventory/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('inventory').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. HISAAB CORE (RESIDENT LEDGER)
// ==========================================

// Apply for a credit tab at a store
router.post('/hisaab/apply', async (req, res) => {
    const user = await resolveUser(req);
    const { baqala_id } = req.body;
    try {
        const { error } = await supabase.from('hisaab_applications').insert([{
            resident_id: user.id,
            baqala_id,
            status: 'pending'
        }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve/Reject a resident's application
router.post('/hisaab/approve', async (req, res) => {
    const { application_id, status } = req.body;
    try {
        const { data, error } = await supabase
            .from('hisaab_applications')
            .update({ status })
            .eq('id', application_id)
            .select('*, profiles(telegram_id)').single();
        
        if (error) throw error;

        // Optional: Notify via Telegram bot if user has a telegram_id
        if (req.bot && data.profiles?.telegram_id) {
            req.bot.sendNotification(data.profiles.telegram_id, "✅ *Hisaab Approved!*\nYour credit application has been accepted. You can now shop on credit.");
        }

        res.json({ success: true, application: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a new debt entry (Checkout)
router.post('/hisaab/checkout', async (req, res) => {
    const user = await resolveUser(req);
    const { baqala_id, items } = req.body;
    const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);

    try {
        const { data, error } = await supabase.from('hisaab_debts').insert([{
            resident_id: user.id,
            baqala_id,
            items,
            total_aed: total
        }]).select().single();

        if (error) throw error;
        res.json({ success: true, debt: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch user's active debts
router.get('/hisaab/ledger', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { data, error } = await supabase
            .from('hisaab_debts')
            .select('*, baqala:baqalas(name, wallet_address, crypto_discount)')
            .eq('resident_id', user.id)
            .eq('is_settled', false)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. DISCOVERY & SEARCH
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
    const user = await resolveUser(req);
    try {
        const { data: stores } = await supabase.from('baqalas').select('*, inventory(*)');
        if (!user) return res.json(stores || []);

        const { data: apps } = await supabase.from('hisaab_applications').select('*').eq('resident_id', user.id);

        const enriched = (stores || []).map(s => {
            const app = apps?.find(a => a.baqala_id === s.id);
            return {
                ...s,
                isApproved: app?.status === 'approved',
                isPending: app?.status === 'pending'
            };
        });
        res.json(enriched);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. AI GENIE PARSING (REAL INVENTORY)
// ==========================================

router.post('/ai/parse', async (req, res) => {
    const { text, lang, baqala_id } = req.body;
    
    try {
        // Fetch real items for the context of the AI
        const { data: inventory } = await supabase
            .from('inventory')
            .select('name, price')
            .eq('baqala_id', baqala_id);

        const inventoryList = inventory.map(i => `${i.name} (AED ${i.price})`).join(', ');

        const prompt = `
            You are the Baqala AI Genie. 
            User Input: "${text}"
            Store Shelves: [${inventoryList}]
            
            Task:
            1. Extract quantity and match user request to items in the list.
            2. If an item matches, return its real name and price from the list.
            3. Return ONLY a valid JSON:
            {
                "success": true,
                "items": [{"name": "string", "qty": number, "price": number}]
            }
            If no items match the shelves, return {"success": false, "items": []}.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        res.json(JSON.parse(response.choices[0].message.content));
    } catch (e) {
        console.error("AI Parser Failure:", e);
        res.status(500).json({ success: false, items: [] });
    }
});

module.exports = router;
