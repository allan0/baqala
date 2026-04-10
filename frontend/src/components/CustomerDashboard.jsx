import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBasket, 
  MapPin, 
  CreditCard, 
  History, 
  Plus, 
  ArrowRight, 
  ChevronRight,
  Filter,
  Package
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// --- CATEGORIES DATA ---
const CATEGORIES = [
  { id: 'all', name: 'All', icon: <Package size={18} /> },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Drinks', icon: '🥤' },
  { id: 'household', name: 'Home', icon: '🧼' },
];

export default function CustomerDashboard({ user, location, activeTab, setActiveTab }) {
  // --- STATE ---
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- DATA FETCHING ---
  const fetchNearby = async () => {
    try {
      const url = location 
        ? `${API_URL}/api/baqalas/nearby?lat=${location.lat}&lng=${location.lng}`
        : `${API_URL}/api/baqalas/nearby`;
      const res = await axios.get(url);
      setNearbyBaqalas(res.data || []);
    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  useEffect(() => { fetchNearby(); }, [location]);

  // --- HAPTICS ---
  const haptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // --- SHOPPING LOGIC ---
  const filteredInventory = useMemo(() => {
    if (!selectedBaqala?.inventory) return [];
    if (activeCategory === 'all') return selectedBaqala.inventory;
    return selectedBaqala.inventory.filter(item => item.category === activeCategory);
  }, [selectedBaqala, activeCategory]);

  const addToCart = (item) => {
    haptic('medium');
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  // --- RENDER HELPERS ---
  const renderHome = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* 📊 SPENDING METRICS HUB */}
      <div className="hisaab-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', opacity: 0.7 }}>CURRENT HISAAB</span>
          <History size={18} style={{ opacity: 0.5 }} />
        </div>
        <div className="price-split">
          <div className="price-box">
            <p>Cash Tab</p>
            <h3>AED 142.50</h3>
          </div>
          <div className="price-box crypto">
            <p>Crypto Settle</p>
            <h3>AED 128.25</h3>
          </div>
        </div>
        <button className="btn-primary" onClick={() => haptic('heavy')}>
          Settle via Crypto (10% OFF)
        </button>
      </div>

      {/* 📍 NEARBY STORES (The "Mall" Preview) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '25px 0 15px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Nearby Baqalas</h3>
        <span style={{ color: 'var(--logo-teal)', fontSize: '13px', fontWeight: 600 }} onClick={() => setActiveTab('stores')}>View All</span>
      </div>

      <div className="baqala-grid">
        {nearbyBaqalas.slice(0, 2).map((b) => (
          <motion.div 
            key={b.id} 
            className="card" 
            whileTap={{ scale: 0.96 }}
            onClick={() => { haptic('medium'); setSelectedBaqala(b); }}
          >
            <div style={{ background: 'var(--secondary-bg)', height: '100px', borderRadius: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
              🏪
            </div>
            <h4 style={{ margin: 0 }}>{b.name}</h4>
            <p style={{ fontSize: '11px', color: 'var(--lux-hint)', marginTop: '4px' }}>
              <MapPin size={10} inline /> {b.distance ? `${b.distance.toFixed(1)} km` : 'Near you'}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStorefront = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button className="btn-secondary" style={{ width: 'auto', padding: '10px 15px', marginBottom: '20px' }} onClick={() => { setSelectedBaqala(null); setCart([]); }}>
        ← Back to Stores
      </button>

      <div className="card" style={{ background: 'var(--shining-gradient)', border: 'none' }}>
        <h2 style={{ color: 'white', marginBottom: '5px' }}>{selectedBaqala.name}</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Quality Groceries & Digital Hisaab</p>
      </div>

      {/* Category Pills */}
      <div className="profile-tabs" style={{ marginBottom: '20px' }}>
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => { haptic('light'); setActiveCategory(cat.id); }}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      <div className="inventory-grid">
        {(filteredInventory.length > 0 ? filteredInventory : [
          {id: 1, name: 'Laban Up', price: 2, cat: 'dairy'},
          {id: 2, name: 'Oman Chips', price: 1.5, cat: 'snacks'},
          {id: 3, name: 'Karak Tea Pack', price: 15, cat: 'beverages'}
        ]).map(item => (
          <motion.div key={item.id} className="card item-card" whileTap={{ scale: 0.98 }}>
            <span className="discount-tag">10% OFF</span>
            <div>
              <h4 style={{ marginBottom: '4px' }}>{item.name}</h4>
              <p style={{ fontSize: '12px', color: 'var(--lux-hint)', textDecoration: 'line-through' }}>AED {item.price}</p>
              <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--logo-teal)' }}>AED {(item.price * 0.9).toFixed(2)}</p>
            </div>
            <button className="btn-secondary" style={{ padding: '8px', fontSize: '12px', marginTop: '10px' }} onClick={() => addToCart(item)}>
              + Add
            </button>
          </motion.div>
        ))}
      </div>

      {/* Floating Cart */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            className="floating-cart"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>{cart.length} Items</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--lux-hint)' }}>Adding to Hisaab</p>
              </div>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 25px' }} onClick={() => { haptic('heavy'); WebApp.showAlert("Order Placed!"); setCart([]); }}>
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderProfileHub = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <h3>👤 Personal Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <img src={user?.photo_url || "https://ui-avatars.com/api/?name=" + user?.first_name} style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
          <div>
            <h4 style={{ margin: 0 }}>{user?.first_name} {user?.last_name}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--lux-hint)' }}>Member since 2024</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '15px' }}>Security & Sync</h4>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="https://www.svgrepo.com/show/355037/google.svg" width="18" /> Sync with Google
        </button>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '15px' }}>Manage Family Profiles</h4>
        {['Main Account', 'Kids Snack Tab'].map(p => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--lux-border)' }}>
            <span>{p}</span>
            <ChevronRight size={18} color="var(--lux-hint)" />
          </div>
        ))}
        <button className="btn-text" style={{ marginTop: '15px', color: 'var(--logo-teal)' }}>+ Add New Profile</button>
      </div>
    </motion.div>
  );

  // --- MAIN RENDER LOGIC ---
  if (selectedBaqala) return <div className="app-container">{renderStorefront()}</div>;

  return (
    <div className="app-container">
      {activeTab === 'home' && renderHome()}
      {activeTab === 'profile' && renderProfileHub()}
      {activeTab === 'stores' && (
        <div className="baqala-grid">
          {nearbyBaqalas.map(b => (
            <div key={b.id} className="card" onClick={() => setSelectedBaqala(b)}>
              <h4>{b.name}</h4>
              <p>{b.distance?.toFixed(1)} km</p>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'hisaab' && (
        <div className="card">
          <h3>Your Hisaab Records</h3>
          <p style={{ color: 'var(--lux-hint)', marginTop: '10px' }}>No unpaid items found in recent history.</p>
        </div>
      )}
    </div>
  );
}
