// ================================================
// backend/routes.js - COMPLETE MVP LOGIC
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: Geolocation Distance (Haversine) ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==========================================
// 1. AI GENIE: Parse and Extract
// ==========================================
router.post('/ai/parse', async (req, res) => {
  const { text } = req.body;
  
  const SYSTEM_PROMPT = `
    You are an AI order extractor for a UAE Baqala. 
    Extract the shopping items and a profile name if mentioned (defaults to "Main").
    Format strictly as JSON: 
    { 
      "profile": "string", 
      "items": [{"name": "string", "qty": number, "price": number, "category": "snacks"|"dairy"|"beverages"|"household"}] 
    }
    Assume these prices in AED if not specified: Laban Up=2, Oman Chips=1.5, Bread=4.5, Milk=6, Water=1.
  `;

  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ],
      temperature: 0.1,
    });

    const orderData = JSON.parse(aiResponse.choices[0].message.content);
    res.json({ success: true, orderData });
  } catch (err) {
    console.error("AI Parse Error:", err);
    res.status(500).json({ error: "Could not parse order" });
  }
});

// ==========================================
// 2. VENDOR: Registration & Dashboard BI
// ==========================================

// Register a new Baqala
router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address, lat, lng } = req.body;
  
  // Create a unique URL-friendly ID from name
  const baqalaId = name.toLowerCase().replace(/ /g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

  try {
    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name,
        owner_telegram_id: owner_id.toString(),
        wallet_address,
        lat,
        lng
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch vendor data & BI metrics
router.get('/baqala/owner/:ownerId', async (req, res) => {
  try {
    // 1. Fetch Store and Inventory
    const { data: baqala, error: bError } = await supabase
      .from('baqalas')
      .select('*, inventory(*)')
      .eq('owner_telegram_id', req.params.ownerId.toString())
      .maybeSingle();

    if (!baqala) return res.json({ baqala: null });

    // 2. Fetch Pending Applications
    const { data: applications } = await supabase
      .from('hisaab_applications')
      .select('*')
      .eq('baqala_id', baqala.id)
      .eq('status', 'pending');

    // 3. Calc Metrics: Aggregating unpaid items for this store
    const { data: debtData } = await supabase
      .from('unpaid_items')
      .select('price, qty')
      .eq('baqala_id', baqala.id);

    const totalOutstanding = debtData?.reduce((acc, item) => acc + (parseFloat(item.price) * (item.qty || 1)), 0) || 0;

    res.json({ 
      baqala, 
      applications: applications || [],
      metrics: {
        totalOutstanding,
        activeCustomers: applications?.filter(a => a.status === 'approved').length || 0,
        dailyTarget: 5000 // Placeholder for BI target
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. CUSTOMER: Discovery & Spending Hub
// ==========================================

// Discover nearby stores
router.get('/baqalas/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const { data, error } = await supabase.from('baqalas').select('*, inventory(*)');
    if (error) throw error;

    if (lat && lng) {
      const nearby = data.map(b => ({
        ...b,
        distance: getDistance(parseFloat(lat), parseFloat(lng), b.lat, b.lng)
      })).sort((a, b) => a.distance - b.distance);
      return res.json(nearby);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkout items to Hisaab
router.post('/hisaab/checkout', async (req, res) => {
  const { telegram_id, items, baqala_id, profile_name } = req.body;

  try {
    // 1. Ensure a profile exists for this user (Main Account)
    let { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_telegram_id', telegram_id.toString())
      .eq('name', profile_name || 'Main')
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: pError } = await supabase
        .from('profiles')
        .insert([{ user_telegram_id: telegram_id.toString(), name: profile_name || 'Main' }])
        .select()
        .single();
      if (pError) throw pError;
      profile = newProfile;
    }

    // 2. Insert items into unpaid_items
    const insertData = items.map(item => ({
      profile_id: profile.id,
      baqala_id: baqala_id,
      name: item.name,
      qty: item.qty || 1,
      price: item.price,
      crypto_discount: item.crypto_discount || 10
    }));

    const { error: iError } = await supabase.from('unpaid_items').insert(insertData);
    if (iError) throw iError;

    res.json({ success: true });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. INVENTORY MANAGEMENT
// ==========================================
router.post('/baqala/:baqalaId/item', async (req, res) => {
  const { baqalaId } = req.params;
  const { name, price, category, cryptoDiscount } = req.body;

  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        baqala_id: baqalaId,
        name,
        category: category || 'snacks',
        price: parseFloat(price),
        crypto_discount: parseInt(cryptoDiscount) || 10
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, inventory: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
