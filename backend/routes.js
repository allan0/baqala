// ================================================
// backend/routes.js - VERSION 8 (Store Management + AI Parse)
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: Aggressive User Sync ---
async function forceUserSync(telegramId) {
  const idStr = telegramId.toString();
  const { data } = await supabase
    .from('users')
    .upsert({ 
      telegram_id: idStr, 
      name: idStr.startsWith('guest') ? 'Guest' : 'Telegram User'
    }, { onConflict: 'telegram_id' })
    .select();
  return data;
}

// ==========================================
// 1. STORE MANAGEMENT (CRUD)
// ==========================================

// Register Baqala
router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address } = req.body;
  try {
    await forceUserSync(owner_id);
    const baqalaId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name,
        owner_telegram_id: owner_id.toString(),
        wallet_address: wallet_address || '0xTEST'
      }])
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE STORE (The "Danger Zone" Logic)
router.delete('/baqala/:baqalaId', async (req, res) => {
  const { baqalaId } = req.params;
  try {
    // 1. Delete Inventory
    await supabase.from('inventory').delete().eq('baqala_id', baqalaId);
    // 2. Delete Active Debts
    await supabase.from('hisaab_debts').delete().eq('baqala_id', baqalaId);
    // 3. Delete the Store itself
    const { error } = await supabase.from('baqalas').delete().eq('id', baqalaId);
    
    if (error) throw error;
    res.json({ success: true, message: "Store and all associated data wiped." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. MERCHANT INSIGHTS (Client List)
// ==========================================

router.get('/baqala/:baqalaId/clients', async (req, res) => {
  const { baqalaId } = req.params;
  try {
    // Fetch all debts for this baqala
    const { data: debts, error } = await supabase
      .from('hisaab_debts')
      .select('telegram_id, total_aed, users(name)')
      .eq('baqala_id', baqalaId);

    if (error) throw error;

    // Grouping logic: Merge multiple debts into one client record
    const clientMap = debts.reduce((acc, curr) => {
      const id = curr.telegram_id;
      if (!acc[id]) {
        acc[id] = { 
          id, 
          name: curr.users?.name || `User_${id.slice(-4)}`, 
          debt: 0 
        };
      }
      acc[id].debt += parseFloat(curr.total_aed);
      return acc;
    }, {});

    res.json(Object.values(clientMap));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. AI PARSE (The Magic Genie)
// ==========================================

router.post('/ai/parse', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const prompt = `
      You are the Baqala AI Genie. Parse the following user request into a JSON object.
      Request: "${text}"
      
      Rules:
      1. Extract items, quantities, and estimated prices (default to 2.0 if unknown).
      2. Identify a "profile" if mentioned (e.g., "Kids", "Family", "Main").
      
      Return ONLY this format:
      {
        "success": true,
        "orderData": {
          "items": [{"name": "item name", "qty": 1, "price": 2.0}],
          "profile": "Main"
        }
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    res.json(parsed);
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ success: false, error: "Genie was unable to parse that request." });
  }
});

// ==========================================
// 4. EXISTING CORE ROUTES (Simplified)
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
  const { data } = await supabase.from('baqalas').select('*, inventory(*)');
  res.json(data || []);
});

router.get('/baqala/owner/:ownerId', async (req, res) => {
  const { data: baqala } = await supabase
    .from('baqalas')
    .select('*, inventory(*)')
    .eq('owner_telegram_id', req.params.ownerId.toString())
    .maybeSingle();
  res.json({ baqala });
});

router.post('/baqala/:baqalaId/item', async (req, res) => {
  const { data, error } = await supabase.from('inventory').insert({ 
    baqala_id: req.params.baqalaId, 
    name: req.body.name, 
    price: parseFloat(req.body.price)
  }).select().single();
  res.json({ success: true, inventory: data });
});

router.post('/hisaab/checkout', async (req, res) => {
  const { telegram_id, baqala_id, items, profile_name = 'Main' } = req.body;
  const total = items.reduce((s, i) => s + (parseFloat(i.price) * (i.qty || 1)), 0);
  const { data, error } = await supabase.from('hisaab_debts').insert([{
    telegram_id: telegram_id.toString(),
    baqala_id,
    profile_name,
    items,
    total_aed: total
  }]).select().single();
  res.json({ success: true, debt: data });
});

module.exports = router;
