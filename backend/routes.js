// ================================================
// backend/routes.js - V6 (Bulletproof Registration)
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const router = express.Router();

// --- HELPER: Aggressive User Sync ---
async function forceUserSync(telegramId) {
  const idStr = telegramId.toString();
  const isGuest = idStr.startsWith('guest');
  
  const { data, error } = await supabase
    .from('users')
    .upsert({ 
      telegram_id: idStr, 
      name: isGuest ? 'Guest Tester' : 'Telegram User' 
    }, { onConflict: 'telegram_id' })
    .select();

  if (error) console.error("‼️ Critical User Sync Failure:", error.message);
  return data;
}

// ==========================================
// 1. VENDOR REGISTRATION
// ==========================================

router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address, lat, lng } = req.body;
  
  try {
    // Force sync user first
    await forceUserSync(owner_id);

    const baqalaId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name,
        owner_telegram_id: owner_id.toString(),
        wallet_address: wallet_address || '0xTEST',
        lat: parseFloat(lat || 0),
        lng: parseFloat(lng || 0)
      }])
      .select()
      .single();

    if (error) {
       console.error("Supabase Insert Error:", error.message);
       return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, baqala: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. OTHER ROUTES (RETAINED & STABILIZED)
// ==========================================

router.get('/baqala/owner/:ownerId', async (req, res) => {
  try {
    const { data: baqala } = await supabase
      .from('baqalas')
      .select('*, inventory(*)')
      .eq('owner_telegram_id', req.params.ownerId.toString())
      .maybeSingle();

    if (!baqala) return res.json({ baqala: null });

    const { data: debtData } = await supabase.from('unpaid_items').select('price, qty').eq('baqala_id', baqala.id);
    const totalOutstanding = debtData?.reduce((acc, item) => acc + (parseFloat(item.price) * (item.qty || 1)), 0) || 0;

    res.json({ baqala, metrics: { totalOutstanding } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customer/:userId/profiles', async (req, res) => {
  try {
    const { data } = await supabase.from('profiles').select('*, unpaid_items(price, qty)').eq('user_telegram_id', req.params.userId.toString());
    const enriched = (data || []).map(p => ({
      ...p,
      debt: p.unpaid_items?.reduce((acc, i) => acc + (parseFloat(i.price) * (i.qty || 1)), 0) || 0
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/customer/profile/add', async (req, res) => {
  try {
    await forceUserSync(req.body.userId);
    const { data, error } = await supabase.from('profiles').insert([{ user_telegram_id: req.body.userId.toString(), name: req.body.name }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/baqalas/nearby', async (req, res) => {
  try {
    const { data } = await supabase.from('baqalas').select('*, inventory(*)');
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/baqala/:baqalaId/item', async (req, res) => {
  try {
    // *** FIX: Removed the 'category' field from the insert object ***
    const { data, error } = await supabase.from('inventory').insert({ 
      baqala_id: req.params.baqalaId, 
      name: req.body.name, 
      price: parseFloat(req.body.price)
    }).select().single();

    if (error) {
      // Added more detailed logging for future errors
      console.error("Supabase insert error in /item route:", error);
      throw error;
    }

    res.json({ success: true, inventory: data });
  } catch (err) { 
    // Return the specific Supabase error to the frontend if available
    res.status(500).json({ error: err.message }); 
  }
});

module.exports = router;
