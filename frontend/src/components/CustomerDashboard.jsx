// ================================================
// frontend/src/components/CustomerDashboard.jsx
// REAL-TIME DISCOVERY + SHOPPING + HISAAB CHECKOUT
// ================================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  History, 
  ChevronRight, 
  Package, 
  ShoppingCart, 
  Search,
  ArrowLeft,
  Wallet
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CATEGORIES = [
  { id: 'all', name: 'All', icon: <Package size={16} /> },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Drinks', icon: '🥤' },
  { id: 'household', name: 'Home', icon: '🧼' },
];

export default function CustomerDashboard({ user, location, activeTab, setActiveTab }) {
  // --- STATE ---
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [hisaabSummary, setHisaabSummary] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    fetchStores();
    if (activeTab === 'hisaab') fetchHisaab();
  }, [activeTab, location]);

  const fetchStores = async () => {
    try {
      const url = location 
        ? `${API_URL}/api/baqalas/nearby?lat=${location.lat}&lng=${location.lng}`
        : `${API_URL}/api/baqalas/nearby`;
      const res = await axios.get(url);
      setNearbyBaqalas(res.data || []);
    } catch (e) {
      console.error("Store fetch failed", e);
    }
  };

  const fetchHisaab = async () => {
    if (!user?.id) return;
    try {
      // Fetches user summary from backend
      const res = await axios.get(`${API_URL}/api/hisaab/${user.id}/summary`);
      setHisaabSummary(res.data || []);
    } catch (e) {
      console.error("Hisaab fetch failed", e);
    }
  };

  const haptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // --- SHOPPING LOGIC ---
  const addToCart = (item) => {
    haptic('medium');
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    haptic('heavy');
    setIsProcessing(true);

    try {
      const res = await axios.post(`${API_URL}/api/hisaab/checkout`, {
        telegram_id: user.id,
        baqala_id: selectedBaqala.id,
        items: cart,
        profile_name: 'Main' // Default profile
      });

      if (res.data.success) {
        WebApp.showPopup({
          title: "Order Placed",
          message: `AED ${cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2)} added to your Hisaab tab at ${selectedBaqala.name}.`,
          buttons: [{ type: 'ok' }]
        });
        setCart([]);
        setSelectedBaqala(null);
        setActiveTab('hisaab');
      }
    } catch (err) {
      WebApp.showAlert("Checkout failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredInventory = useMemo(() => {
    if (!selectedBaqala?.inventory) return [];
    if (activeCategory === 'all') return selectedBaqala.inventory;
    return selectedBaqala.inventory.filter(i => i.category === activeCategory);
  }, [selectedBaqala, activeCategory]);

  // --- RENDER MODULES ---

  const renderHome = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Mini Hisaab Preview Card */}
      <div className="hisaab-card" onClick={() => setActiveTab('hisaab')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ fontWeight: 800, fontSize: '12px', opacity: 0.8, letterSpacing: '1px' }}>ACTIVE TAB</span>
          <History size={16} color="var(--logo-teal)" />
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'var(--lux-hint)' }}>Total Outstanding</p>
            <h3 style={{ fontSize: '22px' }}>AED {hisaabSummary.reduce((a, b) => a + b.cashTotal, 0).toFixed(2)}</h3>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--lux-border)', paddingLeft: '15px' }}>
            <p style={{ fontSize: '11px', color: 'var(--logo-teal)' }}>Crypto Settle</p>
            <h3 style={{ fontSize: '22px', color: 'var(--logo-teal)' }}>AED {hisaabSummary.reduce((a, b) => a + b.cryptoTotal, 0).toFixed(2)}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '25px 0 15px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Nearby Baqalas</h3>
        <span style={{ color: 'var(--logo-teal)', fontSize: '13px', fontWeight: 600 }} onClick={() => setActiveTab('stores')}>View All</span>
      </div>

      <div className="baqala-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {nearbyBaqalas.slice(0, 4).map(b => (
          <motion.div key={b.id} className="card" whileTap={{ scale: 0.95 }} onClick={() => { haptic('medium'); setSelectedBaqala(b); }}>
            <div style={{ fontSize: '32px', marginBottom: '10px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '15px' }}>🏪</div>
            <h4 style={{ fontSize: '14px', margin: 0 }}>{b.name}</h4>
            <p style={{ fontSize: '11px', color: 'var(--lux-hint)', marginTop: '4px' }}>
              <MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />
              {b.distance ? `${b.distance.toFixed(1)} km` : 'Open Now'}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStorefront = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', marginBottom: '15px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setSelectedBaqala(null)}>
        <ArrowLeft size={16} /> Back to Stores
      </button>

      <div className="card" style={{ background: 'var(--shining-gradient)', border: 'none', color: 'white', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px' }}>{selectedBaqala.name}</h2>
        <p style={{ fontSize: '13px', opacity: 0.8 }}>Quality Groceries & Digital Hisaab</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px' }}>
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => { haptic(); setActiveCategory(cat.id); }}
            style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap', border: 'none', background: activeCategory === cat.id ? 'var(--logo-teal)' : 'rgba(255,255,255,0.08)', color: activeCategory === cat.id ? 'black' : 'white' }}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="inventory-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {filteredInventory.map(item => (
          <motion.div key={item.id} className="card" style={{ position: 'relative', overflow: 'hidden' }} whileTap={{ scale: 0.98 }}>
            <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--logo-orange)', color: 'white', padding: '4px 8px', fontSize: '9px', fontWeight: 900, borderBottomLeftRadius: '12px' }}>10% OFF</span>
            <h4 style={{ fontSize: '15px', marginBottom: '4px' }}>{item.name}</h4>
            <p style={{ fontSize: '11px', color: 'var(--lux-hint)', textDecoration: 'line-through' }}>AED {item.price}</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--logo-teal)' }}>AED {(item.price * 0.9).toFixed(2)}</p>
            <button className="btn-secondary" style={{ padding: '8px', marginTop: '12px', fontSize: '12px' }} onClick={() => addToCart(item)}>+ Add to Tab</button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} style={{ position: 'fixed', bottom: '80px', left: '15px', right: '15px', z.index: 1000 }}>
            <div className="card" style={{ background: 'rgba(7, 11, 20, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid var(--logo-teal)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>{cart.length} Items Selected</h4>
                <p style={{ fontSize: '12px', color: 'var(--lux-hint)', margin: 0 }}>Total: AED {cart.reduce((a, b) => a + (b.price * b.qty), 0).toFixed(2)}</p>
              </div>
              <button className="btn-primary" style={{ width: 'auto', padding: '12px 24px' }} onClick={handleCheckout} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Checkout"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // --- MAIN VIEW LOGIC ---
  if (selectedBaqala) return <div className="app-container" style={{ paddingBottom: '150px' }}>{renderStorefront()}</div>;

  return (
    <div className="app-container" style={{ paddingBottom: '100px' }}>
      {activeTab === 'home' && renderHome()}
      
      {activeTab === 'hisaab' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 style={{ marginBottom: '20px' }}>Your Digital Hisaab</h2>
          {hisaabSummary.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <History size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
              <p style={{ color: 'var(--lux-hint)' }}>You don't have any active Hisaab tabs yet. Visit a nearby store to start one!</p>
            </div>
          ) : (
            hisaabSummary.map((h, i) => (
              <div key={i} className="card" style={{ marginBottom: '15px', borderLeft: '4px solid var(--logo-teal)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '17px' }}>{h.profileName} Profile</h4>
                  <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '10px' }}>{h.itemCount} items</span>
                </div>
                <div style={{ display: 'flex', marginTop: '15px', gap: '20px' }}>
                   <div>
                      <p style={{ fontSize: '11px', color: 'var(--lux-hint)' }}>Standard Due</p>
                      <p style={{ fontWeight: 800 }}>AED {h.cashTotal.toFixed(2)}</p>
                   </div>
                   <div>
                      <p style={{ fontSize: '11px', color: 'var(--logo-teal)' }}>Crypto Settle</p>
                      <p style={{ fontWeight: 800, color: 'var(--logo-teal)' }}>AED {h.cryptoTotal.toFixed(2)}</p>
                   </div>
                </div>
              </div>
            ))
          )}
          <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => WebApp.showAlert("Web3 Wallet integration coming in Phase 2!")}>
            <Wallet size={18} style={{ marginRight: '8px' }} /> Settle All via Crypto
          </button>
        </motion.div>
      )}

      {activeTab === 'stores' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '16px', opacity: 0.4 }} />
            <input placeholder="Search for a Baqala..." style={{ paddingLeft: '45px', marginBottom: 0 }} />
          </div>
          <div className="baqala-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {nearbyBaqalas.map(b => (
              <motion.div key={b.id} className="card" whileTap={{ scale: 0.95 }} onClick={() => setSelectedBaqala(b)}>
                <h4 style={{ fontSize: '15px' }}>{b.name}</h4>
                <p style={{ fontSize: '12px', color: 'var(--lux-hint)', marginTop: '5px' }}>
                  {b.distance ? `${b.distance.toFixed(1)} km away` : 'UAE'}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'profile' && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card" style={{ textAlign: 'center' }}>
               <img src={user?.photo_url || `https://ui-avatars.com/api/?name=${user?.first_name}`} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--logo-teal)', marginBottom: '15px' }} />
               <h3>{user?.first_name} {user?.last_name}</h3>
               <p style={{ color: 'var(--lux-hint)', fontSize: '13px' }}>Network Member since 2025</p>
            </div>
            <div className="card" style={{ marginTop: '20px' }}>
               <h4 style={{ marginBottom: '15px' }}>Family Sub-Profiles</h4>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--lux-border)' }}>
                  <span>Main Account</span>
                  <ChevronRight size={18} color="var(--lux-hint)" />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span>Kids Snack Tab</span>
                  <ChevronRight size={18} color="var(--lux-hint)" />
               </div>
            </div>
         </motion.div>
      )}
    </div>
  );
}
