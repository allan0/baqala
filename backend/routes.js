// ================================================
// backend/routes.js - PROFESSIONAL V2 CORE
// AI GENIE + BI ENGINE + STORAGE + CRUD
// ================================================

const express = require('express');
const supabase = require('./supabaseClient');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: Geolocation Distance ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ==========================================
// 1. AI GENIE: Magic Order Extraction
// ==========================================
router.post('/ai/parse', async (req, res) => {
  const { text } = req.body;
  
  const SYSTEM_PROMPT = `
    You are an AI order extractor for a UAE Baqala. 
    Extract the shopping items and a profile name if mentioned.
    Format strictly as JSON: 
    { 
      "profile": "string", 
      "items": [{"name": "string", "qty": number, "price": number, "category": "snacks"|"dairy"|"beverages"|"household"}] 
    }
    If price is unknown, estimate in AED (e.g., Laban=2, Chips=1.5).
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
// 2. VENDOR BI: Business Intelligence Engine
// ==========================================
router.get('/baqala/owner/:ownerId', async (req, res) => {
  try {
    // 1. Fetch Baqala
    const { data: baqala } = await supabase
      .from('baqalas')
      .select('*, inventory(*)')
      .eq('owner_telegram_id', req.params.ownerId)
      .single();

    if (!baqala) return res.json(null);

    // 2. Fetch Applications
    const { data: applications } = await supabase
      .from('hisaab_applications')
      .select('*')
      .eq('baqala_id', baqala.id);

    // 3. Calc Metrics (outstanding debt across all profiles for this store)
    const { data: debtData } = await supabase
      .from('unpaid_items')
      .select('price, qty')
      .eq('baqala_id', baqala.id);

    const totalOutstanding = debtData?.reduce((acc, item) => acc + (item.price * (item.qty || 1)), 0) || 0;

    res.json({ 
      baqala, 
      applications: applications || [],
      metrics: {
        totalOutstanding,
        activeCustomers: applications?.filter(a => a.status === 'approved').length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. CUSTOMER ANALYTICS: Spending Hub
// ==========================================
router.get('/hisaab/:userId/summary', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, unpaid_items(price, qty, crypto_discount)')
      .eq('user_telegram_id', userId);

    const summary = profiles.map(p => {
      let cashTotal = 0;
      let cryptoTotal = 0;
      
      p.unpaid_items.forEach(item => {
        const itemTotal = item.price * (item.qty || 1);
        cashTotal += itemTotal;
        cryptoTotal += itemTotal * (1 - (item.crypto_discount || 10) / 100);
      });

      return {
        profileName: p.name,
        cashTotal,
        cryptoTotal,
        itemCount: p.unpaid_items.length
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. CORE BAQALA & INVENTORY
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
      })).sort((a, b) => a.distance - b.distance);
      return res.json(nearby);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/baqala/:baqalaId/item', async (req, res) => {
  const { baqalaId } = req.params;
  const { name, price, category, cryptoDiscount, image_path } = req.body;

  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        baqala_id: baqalaId,
        name,
        category: category || 'snacks',
        price: parseFloat(price),
        crypto_discount: parseInt(cryptoDiscount) || 10,
        image_path
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, inventory: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. STORAGE & HISAAB LOGIC
// ==========================================
router.post('/upload/:bucket', async (req, res) => {
  const { bucket } = req.params;
  const { fileName, fileBase64, contentType } = req.body;
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, { contentType: contentType || 'image/jpeg', upsert: true });

    if (error) throw error;
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(fileName);
    res.json({ success: true, publicUrl: publicUrl.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/hisaab/:userId/buy', async (req, res) => {
  const { userId } = req.params;
  const { profileKey, items, baqalaId } = req.body;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_telegram_id', userId)
      .eq('name', profileKey || 'Main')
      .single();

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const insertData = items.map(item => ({
      profile_id: profile.id,
      baqala_id: baqalaId,
      name: item.name,
      qty: item.qty || 1,
      price: item.price,
      crypto_discount: item.crypto_discount || 10
    }));

    const { error } = await supabase.from('unpaid_items').insert(insertData);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
