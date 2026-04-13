// ================================================
// frontend/src/components/CustomerDashboard.jsx
// V3: CONTEXT-AWARE SHOPPING + DYNAMIC PROFILES
// ================================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, History, ChevronRight, Package, 
  ShoppingCart, Search, ArrowLeft, Wallet, 
  Plus, Scan, CheckCircle2, UserPlus, X 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const SUGGESTIONS = ["Groceries", "Gas", "Drinking Water", "Kids Snack", "Home Repairs"];

export default function CustomerDashboard({ user, location, activeTab, setActiveTab }) {
  // --- STATE ---
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [regularBaqalas, setRegularBaqalas] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  
  // Profile Creation State
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // --- VERSION GUARDED HAPTICS ---
  const haptic = (style = 'light') => {
    try {
      if (WebApp?.HapticFeedback && WebApp.isVersionAtLeast('6.1')) {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    } catch (e) {}
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    if (user?.id) {
      fetchStores();
      fetchCustomerData();
    }
  }, [user, location, activeTab]);

  const fetchStores = async () => {
    try {
      const url = location 
        ? `${API_URL}/api/baqalas/nearby?lat=${location.lat}&lng=${location.lng}`
        : `${API_URL}/api/baqalas/nearby`;
      const res = await axios.get(url);
      setNearbyBaqalas(res.data || []);
    } catch (e) { console.error("Store fetch failed", e); }
  };

  const fetchCustomerData = async () => {
    try {
      const [histRes, profRes] = await Promise.all([
        axios.get(`${API_URL}/api/customer/${user.id}/history`),
        axios.get(`${API_URL}/api/customer/${user.id}/profiles`)
      ]);
      setRegularBaqalas(histRes.data || []);
      setProfiles(profRes.data || []);
    } catch (e) { console.error("Data sync failed", e); }
  };

  const handleAddProfile = async (name = newProfileName) => {
    if (!name.trim()) return;
    haptic('medium');
    try {
      const res = await axios.post(`${API_URL}/api/customer/profile/add`, {
        userId: user.id,
        name: name
      });
      setProfiles([...profiles, res.data]);
      setNewProfileName('');
      setIsAddingProfile(false);
    } catch (e) { alert("Error adding profile"); }
  };

  const handleCheckout = async (profileId) => {
    haptic('heavy');
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
        if (WebApp?.showAlert) WebApp.showAlert("✅ Added to Hisaab!");
      }
    } catch (err) { alert("Checkout failed."); }
    finally { setIsProcessing(false); }
  };

  // --- RENDER HELPERS ---

  const renderHome = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Search / QR Row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.4 }} />
          <input placeholder="Find a Baqala..." style={{ paddingLeft: '40px', marginBottom: 0, height: '48px' }} />
        </div>
        <button className="btn-secondary" style={{ width: '50px', padding: 0 }} onClick={() => WebApp?.showScanQrPopup({ text: "Scan Baqala QR Code" })}>
          <Scan size={20} />
        </button>
      </div>

      {/* regulars */}
      {regularBaqalas.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', opacity: 0.6 }}>YOUR REGULARS</h3>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '15px' }}>
            {regularBaqalas.map(b => (
              <motion.div key={b.id} className="card" onClick={() => setSelectedBaqala(b)} style={{ minWidth: '140px', padding: '15px' }}>
                <div style={{ fontSize: '24px' }}>🏪</div>
                <h4 style={{ fontSize: '13px', marginTop: '8px' }}>{b.name}</h4>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* nearby */}
      <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '10px 0 12px', opacity: 0.6 }}>NEARBY STORES</h3>
      <div className="baqala-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {nearbyBaqalas.map(b => (
          <div key={b.id} className="card" onClick={() => setSelectedBaqala(b)}>
             <h4 style={{ fontSize: '14px' }}>{b.name}</h4>
             <p style={{ fontSize: '11px', color: 'var(--logo-teal)', marginTop: '4px' }}>
                {b.distance ? `${b.distance.toFixed(1)} km away` : 'Welcome'}
             </p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderProfileTab = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: '20px' }}>
         <img src={user?.photo_url || `https://ui-avatars.com/api/?name=${user?.first_name}`} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--logo-teal)', marginBottom: '10px' }} />
         <h3>{user?.first_name}'s Network</h3>
         <p style={{ fontSize: '13px', color: 'var(--lux-hint)' }}>UAE Resident Profile</p>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', opacity: 0.6 }}>ACTIVE HISAAB ACCOUNTS</h3>
      {profiles.map(p => (
        <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '16px 20px' }}>
           <div>
              <h4 style={{ fontSize: '16px' }}>{p.name}</h4>
              <p style={{ fontSize: '12px', color: 'var(--logo-orange)' }}>Due: AED {p.debt || '0.00'}</p>
           </div>
           <ChevronRight size={18} opacity={0.3} />
        </div>
      ))}

      <button className="btn-secondary" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setIsAddingProfile(true)}>
        <UserPlus size={18} /> Add New Account
      </button>

      {/* Modal for Adding Profile */}
      <AnimatePresence>
        {isAddingProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, padding: '20px', display: 'flex', alignItems: 'center' }}>
            <div className="card" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3>New Account</h3>
                <X onClick={() => setIsAddingProfile(false)} />
              </div>
              <input autoFocus placeholder="Account Name (e.g. Gas)" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} />
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '15px 0' }}>
                {SUGGESTIONS.map(s => (
                  <span key={s} onClick={() => handleAddProfile(s)} style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px solid var(--lux-border)' }}>+ {s}</span>
                ))}
              </div>

              <button className="btn-primary" onClick={() => handleAddProfile()}>Create Account</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // --- MAIN RENDER ---
  if (selectedBaqala) {
    return (
      <div className="app-container" style={{ paddingBottom: '120px' }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', marginBottom: '15px' }} onClick={() => setSelectedBaqala(null)}>← Back</button>
        <div className="card" style={{ background: 'var(--shining-gradient)', border: 'none', color: 'white', marginBottom: '20px' }}>
          <h2>{selectedBaqala.name}</h2>
          <p style={{ fontSize: '13px', opacity: 0.8 }}>Shopping Session Active</p>
        </div>

        <div className="inventory-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {(selectedBaqala.inventory || []).map(item => (
            <div key={item.id} className="card" onClick={() => { haptic(); setCart([...cart, {...item, qty: 1}]); }}>
               <h4 style={{ fontSize: '14px' }}>{item.name}</h4>
               <p style={{ fontWeight: 800, color: 'var(--logo-teal)', marginTop: '5px' }}>AED {item.price}</p>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px' }}>
             <button className="btn-primary" onClick={() => setShowProfileSelector(true)}>Checkout {cart.length} Items</button>
          </div>
        )}

        {/* Profile Selector Sheet */}
        <AnimatePresence>
          {showProfileSelector && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--lux-dark)', borderTop: '1px solid var(--logo-teal)', padding: '20px', zIndex: 3000, borderTopLeftRadius: '25px', borderTopRightRadius: '25px' }}>
              <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Assign to Account?</h3>
              {profiles.map(p => (
                <button key={p.id} className="btn-secondary" style={{ marginBottom: '10px', justifyContent: 'space-between', display: 'flex' }} onClick={() => handleCheckout(p.id)}>
                   {p.name} Account <ChevronRight size={16} />
                </button>
              ))}
              <button className="btn-text" style={{ width: '100%', marginTop: '10px', color: '#ff4444' }} onClick={() => setShowProfileSelector(false)}>Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingBottom: '100px' }}>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'profile' && renderProfileTab()}
      {/* Other tabs remain similar but use profiles state */}
      {activeTab === 'hisaab' && (
        <div>
          <h2>Statement</h2>
          {profiles.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: '12px' }}>
               <h4>{p.name}</h4>
               <p style={{ color: 'var(--lux-hint)' }}>Total Outstanding: AED {p.debt || '0.00'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
