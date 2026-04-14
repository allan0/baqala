// ================================================
// backend/routes.js - VERSION 12 (ROBUST & CRM READY)
// ================================================

const express = require('express');
const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- UTILITY: ATOMIC USER SYNC ---
// Ensures a user exists in the system before relational actions occur
async function syncUserRecord(tgId, name = 'Resident') {
  if (!tgId) return null;
  const idStr = tgId.toString();
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        telegram_id: idStr, 
        name: name || 'Baqala User' 
      }, { onConflict: 'telegram_id' })
      .select();
    
    if (error) console.error("User Sync Failure:", error.message);
    return data;
  } catch (e) {
    console.error("User Sync Exception:", e);
    return null;
  }
}

// ==========================================
// 1. MERCHANT OPERATIONS (IDENTITY & SETTINGS)
// ==========================================

// Register a New Baqala (Merchant Side)
router.post('/baqala/register', async (req, res) => {
  const { name, owner_id, wallet_address } = req.body;

  if (!name || !owner_id) {
    return res.status(400).json({ error: "Missing critical metadata (Store Name/ID)" });
  }

  try {
    // 1. Sync owner first to prevent Foreign Key 500 error
    await syncUserRecord(owner_id, "Merchant Owner");

    // 2. Generate a clean URL slug for the store
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    const uniqueId = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('baqalas')
      .insert([{
        id: uniqueId,
        name: name,
        owner_telegram_id: owner_id.toString(),
        wallet_address: wallet_address || '',
        images: [], // High-end default is no photo until merchant adds
        crypto_discount: 10 // Default incentive
      }])
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });

  } catch (err) {
    console.error("Store Registration Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update Store Profile (Carousel, Name, Discount)
router.post('/baqala/:baqalaId/settings', async (req, res) => {
  const { baqalaId } = req.params;
  const { name, crypto_discount, images, wallet_address } = req.body;

  try {
    const { data, error } = await supabase
      .from('baqalas')
      .update({ 
        name,
        crypto_discount: parseInt(crypto_discount) || 10, 
        images: images || [], // Array of URLs
        wallet_address: wallet_address || ''
      })
      .eq('id', baqalaId)
      .select().single();

    if (error) throw error;
    res.json({ success: true, baqala: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. NETWORK DISCOVERY (Customer Side)
// ==========================================

router.get('/baqalas/nearby', async (req, res) => {
  const { user_id } = req.query; // Check if this resident is approved or pending
  
  try {
    const { data: stores, error } = await supabase
      .from('baqalas')
      .select('*, inventory(*)');

    if (error) throw error;

    if (!user_id || user_id === 'undefined') return res.json(stores || []);

    // Fetch Hisaab statuses for this specific resident
    const { data: apps } = await supabase
      .from('hisaab_applications')
      .select('baqala_id, status')
      .eq('telegram_id', user_id.toString());

    // Enrich the store data with user-specific permissions
    const enriched = (stores || []).map(s => {
      const myApp = apps?.find(a => a.baqala_id === s.id);
      return {
        ...s,
        isApproved: myApp?.status === 'approved',
        isPending: myApp?.status === 'pending'
      };
    });

    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. CRM: HISAAB APPLICATIONS
// ==========================================

// Resident applies for credit at a Baqala
router.post('/hisaab/apply', async (req, res) => {
  const { telegram_id, baqala_id, name } = req.body;
  try {
    await syncUserRecord(telegram_id, name);
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

// Merchant approves/rejects resident application
router.post('/hisaab/approve', async (req, res) => {
  const { application_id, status } = req.body; // 'approved' or 'rejected'
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
// 4. LEDGER OPERATIONS (Hisaab & Pay)
// ==========================================

router.get('/hisaab/outstanding', async (req, res) => {
  const { telegram_id } = req.query;
  if (!telegram_id) return res.json([]);
  
  try {
    const { data } = await supabase
      .from('hisaab_debts')
      .select('*, baqalas(name, wallet_address, crypto_discount)')
      .eq('telegram_id', telegram_id.toString());
    
    // Map to flat object for UI
    const mapped = (data || []).map(d => ({
      ...d,
      baqala_name: d.baqalas?.name || 'Local Shop',
      baqala_ton_address: d.baqalas?.wallet_address,
      crypto_discount: d.baqalas?.crypto_discount || 10
    }));
    res.json(mapped);
  } catch (e) { res.json([]); }
});

router.post('/hisaab/pay', async (req, res) => {
  const { debt_id, method } = req.body;
  try {
    const { data: debt } = await supabase
      .from('hisaab_debts')
      .select('*, baqalas(name)')
      .eq('id', debt_id)
      .single();

    if (!debt) return res.status(404).json({ error: "Tab not found" });

    // 1. Move record to immutable history
    await supabase.from('hisaab_history').insert([{
      telegram_id: debt.telegram_id,
      baqala_id: debt.baqala_id,
      baqala_name: debt.baqalas?.name,
      total_aed: debt.total_aed,
      items: debt.items,
      paid_with: method,
      settled_at: new Date().toISOString()
    }]);

    // 2. Remove from active debt
    await supabase.from('hisaab_debts').delete().eq('id', debt_id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. THE AI GENIE (KHALEEJI ENGINE)
// ==========================================

router.post('/ai/parse', async (req, res) => {
  const { text, lang } = req.body;
  
  try {
    const prompt = `
      System: You are the 'Baqala AI Genie'. 
      Context: Neighborhood grocery ordering in UAE (Dubai/Abu Dhabi). 
      Input: "${text}"
      Language: ${lang === 'ar' ? 'Emirati Arabic (Khaleeji)' : 'English'}
      
      Instructions: 
      1. Extract items, quantities, and estimate prices (Bread:1, Milk:2, Laban:1.5, Large Water:3, Chips:1).
      2. If "profile" is mentioned (e.g., "for the kids" / "على حساب العيال"), set profile name.
      3. Return ONLY valid JSON.
      
      Format:
      {
        "success": true,
        "orderData": {
          "items": [{"name": "item name", "qty": 1, "price": 2.5}],
          "profile": "Main"
        }
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    res.json(JSON.parse(response.choices[0].message.content));
  } catch (e) {
    console.error("Genie Error:", e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
