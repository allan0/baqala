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
  Package
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// --- CATEGORIES ---
const CATEGORIES = [
  { id: 'all', name: 'All', icon: <Package size={18} /> },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Drinks', icon: '🥤' },
  { id: 'household', name: 'Home', icon: '🧼' },
];

export default function CustomerDashboard({ 
  user, 
  location, 
  activeTab, 
  setActiveTab,
  setLocation   // New prop to request location on demand
}) {
  // --- STATE ---
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- HAPTICS ---
  const haptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  // --- LOCATION REQUEST (only when needed) ---
  const requestLocation = () => {
    haptic('medium');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLocation = { 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude 
          };
          setLocation(newLocation);
          fetchNearby(newLocation);
        },
        () => {
          WebApp.showAlert("Location access denied. Showing all stores.");
          fetchNearby(null);
        }
      );
    } else {
      fetchNearby(null);
    }
  };

  // --- DATA FETCHING ---
  const fetchNearby = async (loc = null) => {
    setIsLoading(true);
    try {
      let url = `${API_URL}/api/baqalas/nearby`;
      if (loc) {
        url += `?lat=${loc.lat}&lng=${loc.lng}`;
      }
      const res = await axios.get(url);
      setNearbyBaqalas(res.data || []);
    } catch (e) {
      console.error("Failed to fetch nearby baqalas", e);
      WebApp.showAlert("Could not load stores. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stores when "stores" tab is selected or location changes
  useEffect(() => {
    if (activeTab === 'stores' || selectedBaqala) {
      if (location) {
        fetchNearby(location);
      } else {
        fetchNearby(null);
      }
    }
  }, [activeTab, location]);

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
      {/* Spending Hub */}
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

      {/* Nearby Stores Preview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '25px 0 15px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Nearby Baqalas</h3>
        <span 
          style={{ color: 'var(--logo-teal)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} 
          onClick={() => setActiveTab('stores')}
        >
          View All →
        </span>
      </div>

      <div className="baqala-grid">
        {nearbyBaqalas.slice(0, 2).map((b) => (
          <motion.div 
            key={b.id} 
            className="card" 
            whileTap={{ scale: 0.96 }}
            onClick={() => { haptic('medium'); setSelectedBaqala(b); }}
          >
            <div style={{ 
              background: 'var(--secondary-bg)', 
              height: '100px', 
              borderRadius: '15px', 
              marginBottom: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '42px' 
            }}>
              🏪
            </div>
            <h4 style={{ margin: 0 }}>{b.name}</h4>
            <p style={{ fontSize: '11px', color: 'var(--lux-hint)', marginTop: '4px' }}>
              <MapPin size={10} style={{ marginRight: '4px' }} /> 
              {b.distance ? `${b.distance.toFixed(1)} km` : 'Near you'}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStorefront = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button 
        className="btn-secondary" 
        style={{ width: 'auto', padding: '10px 15px', marginBottom: '20px' }} 
        onClick={() => { setSelectedBaqala(null); setCart([]); }}
      >
        ← Back to Stores
      </button>

      <div className="card" style={{ background: 'var(--shining-gradient)', border: 'none', color: 'white' }}>
        <h2 style={{ marginBottom: '5px' }}>{selectedBaqala.name}</h2>
        <p style={{ opacity: 0.9, fontSize: '14px' }}>Quality Groceries & Digital Hisaab</p>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 0', marginBottom: '10px' }}>
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => { haptic('light'); setActiveCategory(cat.id); }}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '20px', 
              whiteSpace: 'nowrap',
              background: activeCategory === cat.id ? 'var(--logo-teal)' : 'rgba(255,255,255,0.08)',
              color: activeCategory === cat.id ? '#000' : 'white',
              border: 'none'
            }}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Inventory Grid */}
      <div className="inventory-grid">
        {(filteredInventory.length > 0 ? filteredInventory : [
          {id: 1, name: 'Laban Up', price: 2, category: 'dairy'},
          {id: 2, name: 'Oman Chips', price: 1.5, category: 'snacks'},
          {id: 3, name: 'Karak Tea Pack', price: 15, category: 'beverages'}
        ]).map(item => (
          <motion.div key={item.id} className="card item-card" whileTap={{ scale: 0.98 }}>
            <span className="discount-tag">10% OFF</span>
            <div>
              <h4 style={{ marginBottom: '6px' }}>{item.name}</h4>
              <p style={{ fontSize: '12px', color: 'var(--lux-hint)', textDecoration: 'line-through' }}>
                AED {item.price}
              </p>
              <p style={{ fontSize: '19px', fontWeight: 800, color: 'var(--logo-teal)' }}>
                AED {(item.price * 0.9).toFixed(2)}
              </p>
            </div>
            <button 
              className="btn-secondary" 
              style={{ padding: '8px', fontSize: '13px', marginTop: '12px' }} 
              onClick={() => addToCart(item)}
            >
              + Add to Cart
            </button>
          </motion.div>
        ))}
      </div>

      {/* Floating Cart */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            className="floating-cart"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: '80px',
              left: '20px',
              right: '20px',
              background: 'var(--lux-glass)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid var(--lux-border)',
              zIndex: 900
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>{cart.length} Items</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--lux-hint)' }}>Ready for Hisaab</p>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: 'auto', padding: '12px 28px' }}
                onClick={() => { haptic('heavy'); WebApp.showAlert("Order sent to Hisaab!"); setCart([]); }}
              >
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
          <img 
            src={user?.photo_url || `https://ui-avatars.com/api/?name=${user?.first_name}`} 
            style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid var(--logo-teal)' }} 
            alt="Profile"
          />
          <div>
            <h4 style={{ margin: 0 }}>{user?.first_name} {user?.last_name}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--lux-hint)' }}>Member since 2025</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '15px' }}>Manage Family Profiles</h4>
        {['Main Account', 'Kids Snack Tab'].map((p, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '14px 0', 
            borderBottom: i === 0 ? '1px solid var(--lux-border)' : 'none' 
          }}>
            <span>{p}</span>
            <ChevronRight size={18} color="var(--lux-hint)" />
          </div>
        ))}
        <button style={{ marginTop: '15px', color: 'var(--logo-teal)', fontWeight: 700 }}>+ Add New Profile</button>
      </div>
    </motion.div>
  );

  // --- MAIN RENDER LOGIC ---
  if (selectedBaqala) {
    return <div className="app-container">{renderStorefront()}</div>;
  }

  return (
    <div className="app-container">
      {activeTab === 'home' && renderHome()}
      {activeTab === 'profile' && renderProfileHub()}
      
      {activeTab === 'stores' && (
        <div>
          <button 
            className="btn-primary" 
            onClick={requestLocation}
            style={{ marginBottom: '20px' }}
          >
            <MapPin size={18} style={{ marginRight: '8px' }} />
            Find Nearby Baqalas
          </button>

          <div className="baqala-grid">
            {nearbyBaqalas.length > 0 ? (
              nearbyBaqalas.map(b => (
                <motion.div 
                  key={b.id} 
                  className="card" 
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedBaqala(b)}
                >
                  <h4>{b.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--lux-hint)' }}>
                    {b.distance ? `${b.distance.toFixed(1)} km away` : 'Available now'}
                  </p>
                </motion.div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--lux-hint)', padding: '40px 20px' }}>
                Tap the button above to find nearby stores
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'hisaab' && (
        <div className="card">
          <h3>Your Hisaab Records</h3>
          <p style={{ color: 'var(--lux-hint)', marginTop: '20px' }}>
            No unpaid items found in recent history.
          </p>
        </div>
      )}
    </div>
  );
}
