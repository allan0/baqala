// ================================================
// frontend/src/components/CustomerDashboard.jsx
// V5: GUEST MODE SUPPORTED FOR TESTING
// ================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, History, ChevronRight, Package, 
  Search, ArrowLeft, UserPlus, X, RefreshCw 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const SUGGESTIONS = ["Groceries", "Gas Tank", "Drinking Water", "Kids Snack"];

export default function CustomerDashboard({ user, location, activeTab, setActiveTab }) {
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // --- GUEST ID HANDLER ---
  const getEffectiveUserId = () => {
    if (user?.id) return user.id.toString();
    let guestId = localStorage.getItem('baqala_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('baqala_guest_id', guestId);
    }
    return guestId;
  };

  useEffect(() => {
    fetchStores();
    fetchCustomerData();
  }, [user, location, activeTab]);

  const fetchStores = async () => {
    try {
      const url = location 
        ? `${API_URL}/api/baqalas/nearby?lat=${location.lat}&lng=${location.lng}`
        : `${API_URL}/api/baqalas/nearby`;
      const res = await axios.get(url);
      setNearbyBaqalas(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchCustomerData = async () => {
    const userId = getEffectiveUserId();
    try {
      const profRes = await axios.get(`${API_URL}/api/customer/${userId}/profiles`);
      setProfiles(profRes.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAddProfile = async (name = newProfileName) => {
    if (!name.trim()) return;
    const userId = getEffectiveUserId();
    try {
      const res = await axios.post(`${API_URL}/api/customer/profile/add`, { userId, name });
      setProfiles([...profiles, { ...res.data, debt: 0 }]);
      setNewProfileName('');
      setIsAddingProfile(false);
    } catch (e) { alert("Error adding profile"); }
  };

  const handleCheckout = async (profileId) => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_URL}/api/hisaab/checkout`, {
        profile_id: profileId,
        baqala_id: selectedBaqala.id,
        items: cart
      });
      if (res.data.success) {
        setCart([]);
        setSelectedBaqala(null);
        setShowProfileSelector(false);
        setActiveTab('hisaab');
      }
    } catch (err) { alert("Checkout failed."); }
    finally { setIsProcessing(false); }
  };

  const renderHome = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {!user && <div style={{ background: 'var(--logo-teal)', color: 'black', padding: '8px', borderRadius: '8px', marginBottom: '20px', fontSize: '11px', fontWeight: 800, textAlign: 'center' }}>🧪 GUEST BROWSING ENABLED</div>}
      <div style={{ position: 'relative', marginBottom: '25px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.4 }} />
        <input placeholder="Search stores..." style={{ paddingLeft: '40px', marginBottom: 0, height: '48px' }} />
      </div>

      <h3 style={{ fontSize: '12px', fontWeight: 800, marginBottom: '12px', opacity: 0.5 }}>AVAILABLE STORES</h3>
      <div className="baqala-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {nearbyBaqalas.map(b => (
          <div key={b.id} className="card" onClick={() => setSelectedBaqala(b)}>
             <h4 style={{ fontSize: '14px' }}>{b.name}</h4>
             <p style={{ fontSize: '11px', color: 'var(--logo-teal)', marginTop: '5px' }}>{b.distance ? `${b.distance.toFixed(1)} km away` : 'Open'}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="app-container" style={{ paddingBottom: '100px' }}>
      {selectedBaqala ? (
        <div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', marginBottom: '15px' }} onClick={() => setSelectedBaqala(null)}>← Back</button>
          <div className="card" style={{ background: 'var(--shining-gradient)', border: 'none', color: 'white', marginBottom: '20px' }}>
             <h2>{selectedBaqala.name}</h2>
          </div>
          <div className="inventory-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {selectedBaqala.inventory?.map(item => (
              <div key={item.id} className="card" onClick={() => setCart([...cart, {...item, qty: 1}])}>
                 <h4>{item.name}</h4>
                 <p style={{ fontWeight: 800, color: 'var(--logo-teal)' }}>AED {item.price}</p>
              </div>
            ))}
          </div>
          {cart.length > 0 && <button className="btn-primary" style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px' }} onClick={() => setShowProfileSelector(true)}>Checkout {cart.length} Items</button>}
        </div>
      ) : (
        <>
          {activeTab === 'home' && renderHome()}
          {activeTab === 'profile' && (
            <div>
              <div className="card" style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h3>Guest Dashboard</h3>
                <p style={{ fontSize: '12px', color: 'var(--lux-hint)' }}>ID: {getEffectiveUserId()}</p>
              </div>
              <h3 style={{ fontSize: '12px', fontWeight: 800, marginBottom: '15px', opacity: 0.5 }}>HISAAB ACCOUNTS</h3>
              {profiles.map(p => (
                <div key={p.id} className="card" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.name}</span>
                  <span style={{ color: 'var(--logo-orange)' }}>AED {p.debt?.toFixed(2)}</span>
                </div>
              ))}
              <button className="btn-secondary" style={{ marginTop: '10px' }} onClick={() => setIsAddingProfile(true)}>+ Add Account</button>
            </div>
          )}
        </>
      )}

      {/* Profile Selector Overlay */}
      <AnimatePresence>
        {showProfileSelector && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--lux-dark)', borderTop: '1px solid var(--logo-teal)', padding: '25px', zIndex: 3000, borderTopLeftRadius: '30px', borderTopRightRadius: '30px' }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Assign to?</h3>
            {profiles.map(p => (
              <button key={p.id} className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => handleCheckout(p.id)}>{p.name}</button>
            ))}
            <button className="btn-text" style={{ width: '100%', color: '#ff4444' }} onClick={() => setShowProfileSelector(false)}>Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, padding: '20px', display: 'flex', alignItems: 'center' }}>
            <div className="card" style={{ width: '100%' }}>
              <h3>Add New Account</h3>
              <input autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)} style={{ marginTop: '20px' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '15px 0' }}>
                {SUGGESTIONS.map(s => <span key={s} onClick={() => handleAddProfile(s)} style={{ fontSize: '11px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid var(--lux-border)' }}>+ {s}</span>)}
              </div>
              <button className="btn-primary" onClick={() => handleAddProfile()}>Save</button>
              <button className="btn-text" style={{ width: '100%', marginTop: '10px' }} onClick={() => setIsAddingProfile(false)}>Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
