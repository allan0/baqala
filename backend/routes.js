// ================================================
// backend/routes.js - COMPLETE V7 (Hisaab + Wallet Ready)
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
      name: isGuest ? 'Guest Tester' : 'Telegram User',
      wallet_address: null // will be updated when wallet connects
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
// 2. EXISTING ROUTES (KEPT + STABILIZED)
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
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/customer/:userId/profiles', async (req, res) => {
  try {
    const { data } = await supabase.from('profiles').select('*, unpaid_items(price, qty)').eq('user_telegram_id', req.params.userId.toString());
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
  try {
    await forceUserSync(req.body.userId);
    const { data, error } = await supabase.from('profiles').insert([{ 
      user_telegram_id: req.body.userId.toString(), 
      name: req.body.name 
    }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/baqalas/nearby', async (req, res) => {
  try {
    const { data } = await supabase.from('baqalas').select('*, inventory(*)');
    res.json(data || []);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

router.post('/baqala/:baqalaId/item', async (req, res) => {
  try {
    const { data, error } = await supabase.from('inventory').insert({ 
      baqala_id: req.params.baqalaId, 
      name: req.body.name, 
      price: parseFloat(req.body.price)
    }).select().single();

    if (error) {
      console.error("Supabase insert error in /item route:", error);
      throw error;
    }

    res.json({ success: true, inventory: data });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ================================================
// 3. HISaab SYSTEM (NEW - FULL IMPLEMENTATION)
// ================================================

// Get outstanding debts
router.get('/hisaab/outstanding', async (req, res) => {
  const telegramId = req.query.telegram_id || req.headers['x-app-telegram-id'];
  if (!telegramId) return res.status(400).json({ error: "Missing telegram_id" });

  try {
    const { data, error } = await supabase
      .from('hisaab_debts')
      .select('*')
      .eq('telegram_id', telegramId.toString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get history
router.get('/hisaab/history', async (req, res) => {
  const telegramId = req.query.telegram_id || req.headers['x-app-telegram-id'];
  if (!telegramId) return res.status(400).json({ error: "Missing telegram_id" });

  try {
    const { data, error } = await supabase
      .from('hisaab_history')
      .select('*')
      .eq('telegram_id', telegramId.toString())
      .order('settled_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkout - create new debt
router.post('/hisaab/checkout', async (req, res) => {
  const { telegram_id, baqala_id, profile_name = 'Main', items } = req.body;

  if (!telegram_id || !baqala_id || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const totalAed = items.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);

  try {
    await forceUserSync(telegram_id);

    const { data, error } = await supabase
      .from('hisaab_debts')
      .insert([{
        telegram_id: telegram_id.toString(),
        baqala_id,
        profile_name,
        items,
        total_aed: totalAed
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, debt: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay with Crypto - move debt to history
router.post('/hisaab/pay', async (req, res) => {
  const { telegram_id, debt_id, tx_hash } = req.body;

  if (!telegram_id || !debt_id) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data: debt, error: fetchErr } = await supabase
      .from('hisaab_debts')
      .select('*')
      .eq('id', debt_id)
      .eq('telegram_id', telegram_id.toString())
      .single();

    if (fetchErr || !debt) return res.status(404).json({ error: "Debt not found" });

    // Move to history
    await supabase.from('hisaab_history').insert([{
      telegram_id: debt.telegram_id,
      baqala_id: debt.baqala_id,
      profile_name: debt.profile_name,
      items: debt.items,
      total_aed: debt.total_aed,
      paid_with: 'crypto',
      tx_hash: tx_hash || null
    }]);

    // Delete from outstanding
    await supabase.from('hisaab_debts').delete().eq('id', debt_id);

    res.json({ success: true, message: "Hisaab settled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
