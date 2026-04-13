// ================================================
// backend/routes.js - MASTER MVP VERSION
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: Distance ---
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ==========================================
// 1. VENDOR & REGISTRATION
// ==========================================

router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address, lat, lng } = req.body;
  const baqalaId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name,
        owner_telegram_id: owner_id.toString(),
        wallet_address,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/baqala/owner/:ownerId', async (req, res) => {
  try {
    const { data: baqala } = await supabase
      .from('baqalas')
      .select('*, inventory(*)')
      .eq('owner_telegram_id', req.params.ownerId.toString())
      .maybeSingle();

    if (!baqala) return res.json({ baqala: null });

    const { data: debtData } = await supabase
      .from('unpaid_items')
      .select('price, qty')
      .eq('baqala_id', baqala.id);

    const totalOutstanding = debtData?.reduce((acc, item) => acc + (item.price * (item.qty || 1)), 0) || 0;

    res.json({ baqala, metrics: { totalOutstanding } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. CUSTOMER HISTORY & PROFILES
// ==========================================

router.get('/customer/:userId/history', async (req, res) => {
  try {
    // Basic history logic for MVP
    const { data } = await supabase.from('baqalas').select('*').limit(5);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/customer/:userId/profiles', async (req, res) => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*, unpaid_items(price, qty)')
      .eq('user_telegram_id', req.params.userId.toString());
    
    const enriched = (data || []).map(p => ({
      ...p,
      debt: p.unpaid_items?.reduce((acc, i) => acc + (parseFloat(i.price) * (i.qty || 1)), 0) || 0
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customer/profile/add', async (req, res) => {
  const { userId, name } = req.body;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ user_telegram_id: userId.toString(), name }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SHOPPING & DISCOVERY
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const { data } = await supabase.from('baqalas').select('*, inventory(*)');
    if (lat && lng && data) {
      const nearby = data.map(b => ({
        ...b,
        distance: getDistance(parseFloat(lat), parseFloat(lng), b.lat, b.lng)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      return res.json(nearby);
    }
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/hisaab/checkout', async (req, res) => {
  const { profile_id, baqala_id, items } = req.body;
  try {
    const insertData = items.map(item => ({
      profile_id,
      baqala_id,
      name: item.name,
      qty: item.qty || 1,
      price: item.price,
      crypto_discount: 10
    }));

    const { error } = await supabase.from('unpaid_items').insert(insertData);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. INVENTORY & AI
// ==========================================

router.post('/baqala/:baqalaId/item', async (req, res) => {
  const { baqalaId } = req.params;
  const { name, price, category } = req.body;
  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert({ baqala_id: baqalaId, name, price: parseFloat(price), category })
      .select().single();
    if (error) throw error;
    res.json({ success: true, inventory: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/parse', async (req, res) => {
  const { text } = req.body;
  const SYSTEM_PROMPT = `Extract order items/profile as JSON: {"profile": "string", "items": [{"name": "string", "qty": number, "price": number}]}`;
  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: text }],
      temperature: 0.1,
    });
    res.json({ success: true, orderData: JSON.parse(aiResponse.choices[0].message.content) });
  } catch (err) { res.status(500).json({ error: "AI Failed" }); }
});

module.exports = router;
