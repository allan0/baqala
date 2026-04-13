// ================================================
// backend/routes.js - V3 (Context-Aware Shopping)
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: Geolocation Distance ---
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
// 1. VENDOR: Registration Fix & BI
// ==========================================

router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address, lat, lng } = req.body;
  
  // Create a clean unique ID
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const baqalaId = `${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name,
        owner_telegram_id: owner_id.toString(), // Must be string
        wallet_address,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      }])
      .select()
      .single();

    if (error) {
       console.error("Supabase Register Error:", error);
       return res.status(400).json({ error: error.message });
    }
    
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

    res.json({ 
      baqala, 
      metrics: {
        totalOutstanding,
        activeCustomers: 0 // Will link to applications table in next step
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. CUSTOMER: Repeat History & Profiles
// ==========================================

// Get list of Baqalas user has previously shopped at
router.get('/customer/:userId/history', async (req, res) => {
  try {
    // Select unique baqala_ids from unpaid_items linked to this user's profiles
    const { data, error } = await supabase
      .from('unpaid_items')
      .select('baqalas(id, name, lat, lng)')
      .filter('profile_id', 'in', 
        supabase.from('profiles').select('id').eq('user_telegram_id', req.params.userId.toString())
      );

    // Clean up duplicates
    const history = Array.from(new Set((data || []).map(item => JSON.stringify(item.baqalas))))
                         .map(str => JSON.parse(str))
                         .filter(Boolean);

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manage Family Profiles
router.get('/customer/:userId/profiles', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_telegram_id', req.params.userId.toString());
  res.json(data || []);
});

router.post('/customer/profile/add', async (req, res) => {
  const { userId, name } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ user_telegram_id: userId.toString(), name }])
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ==========================================
// 3. CORE DISCOVERY & BUYING
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const { data, error } = await supabase.from('baqalas').select('*, inventory(*)');
    if (error) throw error;

    if (lat && lng) {
      const nearby = data.map(b => ({
        ...b,
        distance: getDistance(parseFloat(lat), parseFloat(lng), b.lat, b.lng)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      return res.json(nearby);
    }
    res.json(data);
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

module.exports = router;
