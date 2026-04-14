// ================================================
// backend/routes.js - VERSION 10 (PRO-LEVEL CRM)
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- MIDDLEWARE: Global User Sync ---
// Ensures every interaction updates the user's name/ID in our network
async function syncUser(tgId, name = 'Resident') {
  const idStr = tgId.toString();
  await supabase.from('users').upsert({ 
    telegram_id: idStr, 
    name: name 
  }, { onConflict: 'telegram_id' });
}

// ==========================================
// 1. NEIGHBORHOOD NETWORK (Discovery)
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
  const { user_id } = req.query; // Check if current user is approved
  try {
    const { data: stores, error } = await supabase
      .from('baqalas')
      .select('*, inventory(*)');

    if (error) throw error;

    if (!user_id) return res.json(stores);

    // Check Hisaab permissions for this specific resident
    const { data: apps } = await supabase
      .from('hisaab_applications')
      .select('baqala_id, status')
      .eq('telegram_id', user_id.toString());

    const enriched = stores.map(s => {
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
// 2. MERCHANT CRM & SETTINGS
// ==========================================

// Register a new Baqala
router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address } = req.body;
  try {
    await syncUser(owner_id, "Merchant");
    const baqalaId = `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name,
        owner_telegram_id: owner_id.toString(),
        wallet_address,
        images: [], // Start with empty carousel
        crypto_discount: 10
      }])
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch Store Data (Owner View)
router.get('/baqala/owner/:ownerId', async (req, res) => {
  try {
    const { data: baqala } = await supabase
      .from('baqalas')
      .select('*, inventory(*)')
      .eq('owner_telegram_id', req.params.ownerId.toString())
      .maybeSingle();

    if (!baqala) return res.json({ baqala: null });

    // Fetch all residents who applied or have tabs
    const { data: clients } = await supabase
      .from('hisaab_applications')
      .select('*, users(name)')
      .eq('baqala_id', baqala.id);

    res.json({ baqala, clients });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Identity (Photos, Discounts, Wallet)
router.post('/baqala/:baqalaId/settings', async (req, res) => {
  const { crypto_discount, images, wallet_address } = req.body;
  try {
    const { data, error } = await supabase
      .from('baqalas')
      .update({ 
        crypto_discount, 
        images, 
        wallet_address 
      })
      .eq('id', req.params.baqalaId)
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Dissolve Storefront (Delete Everything)
router.delete('/baqala/:baqalaId', async (req, res) => {
  const { baqalaId } = req.params;
  try {
    await supabase.from('inventory').delete().eq('baqala_id', baqalaId);
    await supabase.from('hisaab_debts').delete().eq('baqala_id', baqalaId);
    await supabase.from('hisaab_applications').delete().eq('baqala_id', baqalaId);
    await supabase.from('baqalas').delete().eq('id', baqalaId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. HISAAB PROTOCOL (Apply & Approve)
// ==========================================

router.post('/hisaab/apply', async (req, res) => {
  const { telegram_id, baqala_id, name } = req.body;
  try {
    await syncUser(telegram_id, name);
    const { data, error } = await supabase
      .from('hisaab_applications')
      .insert([{ 
        telegram_id: telegram_id.toString(), 
        baqala_id, 
        status: 'pending' 
      }]).select().single();

    if (error) throw error;
    res.json({ success: true, application: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/hisaab/approve', async (req, res) => {
  const { application_id, status } = req.body;
  try {
    const { data, error } = await supabase
      .from('hisaab_applications')
      .update({ status })
      .eq('id', application_id)
      .select().single();

    if (error) throw error;
    res.json({ success: true, application: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. SETTLEMENT & HISTORY
// ==========================================

router.post('/hisaab/pay', async (req, res) => {
  const { telegram_id, debt_id, method } = req.body;
  try {
    const { data: debt } = await supabase
      .from('hisaab_debts')
      .select('*, baqalas(name, wallet_address)')
      .eq('id', debt_id)
      .single();

    if (!debt) return res.status(404).json({ error: "Record missing" });

    // VERIFICATION LOGIC:
    // In production, we use TON API to check if a transaction exists 
    // with message: `BaqalaSettlement_${debt_id}`
    const verified = true; 

    if (verified) {
      await supabase.from('hisaab_history').insert([{
        telegram_id: debt.telegram_id,
        baqala_id: debt.baqala_id,
        baqala_name: debt.baqalas.name,
        total_aed: debt.total_aed,
        items: debt.items,
        paid_with: method,
        settled_at: new Date().toISOString()
      }]);

      await supabase.from('hisaab_debts').delete().eq('id', debt_id);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Ledger entry not found" });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FETCHING USER LEDGER ---
router.get('/hisaab/outstanding', async (req, res) => {
  try {
    const { data } = await supabase
      .from('hisaab_debts')
      .select('*, baqalas(name, wallet_address, crypto_discount)')
      .eq('telegram_id', req.query.telegram_id.toString());
    
    // Map baqala fields to the debt object for easy UI access
    const mapped = data.map(d => ({
      ...d,
      baqala_name: d.baqalas.name,
      baqala_ton_address: d.baqalas.wallet_address,
      crypto_discount: d.baqalas.crypto_discount
    }));
    res.json(mapped || []);
  } catch (e) { res.status(500).json([]); }
});

router.get('/hisaab/history', async (req, res) => {
  try {
    const { data } = await supabase
      .from('hisaab_history')
      .select('*')
      .eq('telegram_id', req.query.telegram_id.toString())
      .order('settled_at', { ascending: false });
    res.json(data || []);
  } catch (e) { res.status(500).json([]); }
});

// ==========================================
// 5. AI GENIE PARSING (Emirati Context)
// ==========================================

router.post('/ai/parse', async (req, res) => {
  const { text, lang } = req.body;
  try {
    const prompt = `
      System: You are the Baqala AI Genie.
      Input: "${text}"
      User Language: ${lang === 'ar' ? 'Emirati Arabic (Khaleeji)' : 'English'}
      
      Task: Parse the items, quantities, and prices (estimate prices if unknown: Milk=2, Bread=1, Chips=1.5, Water=1).
      Context: User is likely ordering groceries from a Dubai/Abu Dhabi neighborhood shop. 
      Arabic users use terms like "أبى" (want), "طرش" (send/bring), "حساب" (tab).
      
      Return ONLY JSON:
      {
        "success": true,
        "orderData": {
          "items": [{"name": "item", "qty": 1, "price": 2.5}],
          "profile": "Main"
        }
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview", // Higher quality for parsing
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    res.json(JSON.parse(response.choices[0].message.content));
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;
