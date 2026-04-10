// ================================================
// backend/routes.js - FULL CRUD + STORAGE UPLOADS
// ================================================

const express = require('express');
const supabase = require('./supabaseClient');
const router = express.Router();

// Helper distance function
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ========================
// 1. BAQALAS ROUTES
// ========================
router.get('/baqalas/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const { data, error } = await supabase.from('baqalas').select('*');
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

router.post('/baqala', async (req, res) => {
  const { name, lat, lng, ownerId, walletAddress } = req.body;
  const baqalaId = `bq_${Date.now()}`;

  try {
    const { data, error } = await supabase
      .from('baqalas')
      .insert({ id: baqalaId, name, owner_telegram_id: ownerId, lat, lng, wallet_address: walletAddress })
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
      .select('*')
      .eq('owner_telegram_id', req.params.ownerId)
      .single();

    if (!baqala) return res.json(null);

    const { data: applications } = await supabase
      .from('hisaab_applications')
      .select('*')
      .eq('baqala_id', baqala.id);

    res.json({ baqala, applications: applications || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// 2. INVENTORY + STORAGE UPLOAD
// ========================
router.post('/baqala/:baqalaId/item', async (req, res) => {
  const { baqalaId } = req.params;
  const { name, price, cryptoDiscount } = req.body;

  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        baqala_id: baqalaId,
        name,
        price: parseFloat(price),
        crypto_discount: parseInt(cryptoDiscount) || 10
      })
      .select();

    if (error) throw error;
    res.json({ success: true, inventory: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// 3. STORAGE UPLOAD ENDPOINTS (Key Feature)
// ========================

// Upload image to any bucket
router.post('/upload/:bucket', async (req, res) => {
  const { bucket } = req.params; // baqala-photos, inventory-images, receipts, payment-screenshots
  const { fileName, fileBase64, contentType } = req.body;

  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    res.json({ success: true, path: data.path, publicUrl: publicUrl.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// 4. HISAAB ROUTES
// ========================
router.post('/hisaab/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_telegram_id: userId, name })
      .select();

    if (error) throw error;
    res.json({ success: true, profiles: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply', async (req, res) => {
  const { userId, baqalaId } = req.body;
  try {
    const { data, error } = await supabase
      .from('hisaab_applications')
      .insert({ user_telegram_id: userId, baqala_id: baqalaId, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/approve', async (req, res) => {
  const { appId, limit } = req.body;
  try {
    const { error } = await supabase
      .from('hisaab_applications')
      .update({ status: 'approved', credit_limit: parseFloat(limit) })
      .eq('id', appId);
    if (error) throw error;
    res.json({ success: true });
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
      qty: item.qty,
      price: item.price,
      crypto_discount: item.cryptoDiscount || 10
    }));

    const { error } = await supabase.from('unpaid_items').insert(insertData);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/hisaab/:userId/settle', async (req, res) => {
  const { userId } = req.params;
  const { profileKey } = req.body;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_telegram_id', userId)
      .eq('name', profileKey || 'Main')
      .single();

    if (profile) {
      await supabase.from('unpaid_items').delete().eq('profile_id', profile.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
