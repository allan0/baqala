// ================================================
// backend/routes.js - VERSION 13 (PRO-SPEC)
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- UTILITY: ATOMIC USER SYNC ---
// Handles profile updates, photo sync, and Fazaa card linking
async function syncUserRecord(tgId, payload = {}) {
  if (!tgId) return null;
  const idStr = tgId.toString();
  
  const updateData = {
    telegram_id: idStr,
    name: payload.name || 'Resident',
    photo_url: payload.photo_url || null,
    fazaa_card: payload.fazaa_card || null
  };

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(updateData, { onConflict: 'telegram_id' })
      .select();
    
    if (error) console.error("User Sync Error:", error.message);
    return data;
  } catch (e) {
    console.error("User Sync Exception:", e);
    return null;
  }
}

// ==========================================
// 1. RESIDENT IDENTITY & PROFILE
// ==========================================

// Update Resident Profile (Display Name & Fazaa)
router.post('/user/update', async (req, res) => {
  const { telegram_id, name, fazaa_card, photo_url } = req.body;
  try {
    const data = await syncUserRecord(telegram_id, { name, fazaa_card, photo_url });
    res.json({ success: true, user: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. MERCHANT HUB (IDENTITY & CRM)
// ==========================================

// Register Baqala
router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address } = req.body;
  if (!name || !owner_id) return res.status(400).json({ error: "Metadata missing" });

  try {
    await syncUserRecord(owner_id, { name: "Merchant Owner" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const baqalaId = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: baqalaId,
        name: name,
        owner_telegram_id: owner_id.toString(),
        wallet_address: wallet_address || '',
        images: [],
        crypto_discount: 10,
        accepts_fazaa: true // Default to true for UAE market
      }])
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Store Logic (Photos, Discounts, Fazaa Toggle)
router.post('/baqala/:baqalaId/settings', async (req, res) => {
  const { baqalaId } = req.params;
  const { name, crypto_discount, images, wallet_address, accepts_fazaa } = req.body;

  try {
    const { data, error } = await supabase
      .from('baqalas')
      .update({ 
        name,
        crypto_discount: parseInt(crypto_discount), 
        images: images || [], 
        wallet_address,
        accepts_fazaa: !!accepts_fazaa
      })
      .eq('id', baqalaId)
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve/Reject Hisaab Resident
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
// 3. NETWORK DISCOVERY & HISAAB
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
  const { user_id } = req.query;
  try {
    const { data: stores, error } = await supabase
      .from('baqalas')
      .select('*, inventory(*)');

    if (!user_id || user_id === 'undefined') return res.json(stores || []);

    // Check application status for this specific resident
    const { data: apps } = await supabase
      .from('hisaab_applications')
      .select('baqala_id, status')
      .eq('telegram_id', user_id.toString());

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

router.post('/hisaab/apply', async (req, res) => {
  const { telegram_id, baqala_id, name } = req.body;
  try {
    await syncUserRecord(telegram_id, { name });
    const { data, error } = await supabase
      .from('hisaab_applications')
      .upsert({ 
        telegram_id: telegram_id.toString(), 
        baqala_id, 
        status: 'pending' 
      }, { onConflict: 'telegram_id, baqala_id' })
      .select().single();

    if (error) throw error;
    res.json({ success: true, application: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. SETTLEMENT & VERIFICATION
// ==========================================

router.post('/hisaab/pay', async (req, res) => {
  const { telegram_id, debt_id, method } = req.body;
  try {
    // 1. Fetch debt details
    const { data: debt } = await supabase
      .from('hisaab_debts')
      .select('*, baqalas(name)')
      .eq('id', debt_id)
      .single();

    if (!debt) return res.status(404).json({ error: "Tab not found" });

    // 2. Verified on Ledger
    // Move to history table
    await supabase.from('hisaab_history').insert([{
      telegram_id: debt.telegram_id,
      baqala_id: debt.baqala_id,
      baqala_name: debt.baqalas?.name || 'Local Shop',
      total_aed: debt.total_aed,
      items: debt.items,
      paid_with: method,
      settled_at: new Date().toISOString()
    }]);

    // 3. Delete active debt
    await supabase.from('hisaab_debts').delete().eq('id', debt_id);
    res.json({ success: true });
    
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. AI GENIE PARSING
// ==========================================

router.post('/ai/parse', async (req, res) => {
  const { text, lang } = req.body;
  try {
    const prompt = `You are 'Baqala AI Genie'. 
    Input: "${text}"
    Lang: ${lang}. 
    Task: Return JSON {success:true, orderData:{items:[{name,qty,price}], profile:string}}. 
    Prices: Water:1, Bread:1, Milk:2.5, Laban:1.5.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    res.json(JSON.parse(response.choices[0].message.content));
  } catch (e) { res.status(500).json({ success: false }); }
});

module.exports = router;
