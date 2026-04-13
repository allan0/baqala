// ================================================
// frontend/src/components/VendorDashboard.jsx
// FIXED REGISTRATION + VERSION 6.0 COMPATIBILITY
// ================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Layers, RefreshCw, Users, Package, 
  Store, MapPin, LayoutDashboard, Settings, AlertCircle 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  // --- STATE ---
  const [myBaqala, setMyBaqala] = useState(null);
  const [metrics, setMetrics] = useState({ totalOutstanding: 0, activeCustomers: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [regError, setRegError] = useState(null);

  // Form State
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'snacks' });

  // --- VERSION COMPATIBLE HAPTICS ---
  const haptic = (style = 'medium') => {
    try {
      if (WebApp?.HapticFeedback && WebApp.isVersionAtLeast('6.1')) {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    } catch (e) { console.warn("Haptics not supported"); }
  };

  useEffect(() => {
    if (user?.id) fetchVendorData();
    else setIsLoading(false);
  }, [user]);

  const fetchVendorData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${user.id}`);
      if (res.data?.baqala) {
        setMyBaqala(res.data.baqala);
        setMetrics(res.data.metrics || { totalOutstanding: 0 });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);
    haptic('heavy');

    if (!location) {
      setRegError("GPS coordinates not found. Please enable location in Telegram.");
      return;
    }

    const payload = {
      name: regForm.name,
      owner_id: user.id.toString(), // Ensure String
      wallet_address: regForm.wallet,
      lat: location.lat,
      lng: location.lng
    };

    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, payload);
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        if (WebApp?.showAlert) WebApp.showAlert("🏪 Store Registered!");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed. Check database RLS.";
      setRegError(msg);
      console.error("Reg Error:", err);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    haptic('light');
    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, newItem);
      if (res.data.success) {
        setMyBaqala(prev => ({
          ...prev,
          inventory: [...(prev.inventory || []), res.data.inventory]
        }));
        setNewItem({ name: '', price: '', category: 'snacks' });
      }
    } catch (err) { alert("Failed to add item."); }
  };

  // --- VIEWS ---

  if (isLoading) return <div style={{ textAlign: 'center', paddingTop: '40vh' }}><RefreshCw className="spin-anim" /></div>;

  if (!myBaqala) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-container">
      <div className="card" style={{ marginTop: '5vh', textAlign: 'center' }}>
        <Store size={48} color="var(--logo-teal)" style={{ marginBottom: '20px', alignSelf: 'center' }} />
        <h2 style={{ marginBottom: '10px' }}>Open Your Store</h2>
        <p style={{ color: 'var(--lux-hint)', fontSize: '14px', marginBottom: '25px' }}>
          Enter your details to start accepting Hisaab payments.
        </p>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            placeholder="Store Name (e.g. Sunny Baqala)" required 
            value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})}
          />
          <input 
            placeholder="Settlement Wallet (0x...)" required 
            value={regForm.wallet} onChange={e => setRegForm({...regForm, wallet: e.target.value})}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: location ? '1px solid var(--logo-teal)' : '1px solid #ff4444' }}>
            <MapPin size={18} color={location ? "var(--logo-teal)" : "#ff4444"} />
            <span style={{ fontSize: '12px', color: location ? 'white' : '#ff4444' }}>
              {location ? `GPS Locked: ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "Waiting for GPS..."}
            </span>
          </div>

          {regError && (
            <div style={{ color: '#ff4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
              <AlertCircle size={14} /> {regError}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={!location}>
            Initialize Storefront
          </button>
        </form>
      </div>
    </motion.div>
  );

  return (
    <div className="app-container" style={{ paddingBottom: '120px' }}>
      <div className="profile-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        {['overview', 'inventory', 'settings'].map(tab => (
          <button 
            key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { haptic('light'); setActiveTab(tab); }}
            style={{ flex: 1, textTransform: 'capitalize', padding: '12px' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="metric-card">
              <span className="mode-label"><TrendingUp size={10} /> REVENUE</span>
              <h3 style={{ fontSize: '22px' }}>AED 0.00</h3>
            </div>
            <div className="metric-card">
              <span className="mode-label"><Layers size={10} /> HISAAB DUE</span>
              <h3 style={{ fontSize: '22px', color: 'var(--logo-orange)' }}>AED {metrics.totalOutstanding.toFixed(2)}</h3>
            </div>
          </div>

          <div className="card" style={{ border: '1px solid var(--logo-teal)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} className={isSyncing ? 'spin-anim' : ''} />
              Digital Ledger Sync
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--lux-hint)', margin: '10px 0 15px' }}>
              Anchor off-chain debt to the blockchain.
            </p>
            <button className="btn-primary" onClick={() => { setIsSyncing(true); setTimeout(()=>setIsSyncing(false), 2000); }}>
              Sync Ledger
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'inventory' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card">
            <h4>Add New Item</h4>
            <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <input placeholder="Name" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <input type="number" placeholder="Price (AED)" required value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <button className="btn-primary" type="submit">List Item</button>
            </form>
          </div>
          <div className="card" style={{ marginTop: '20px' }}>
            <h4>Catalog</h4>
            {(myBaqala.inventory || []).map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--lux-border)' }}>
                <span style={{ fontSize: '14px' }}>{item.name}</span>
                <span style={{ fontWeight: 700 }}>AED {item.price}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>{myBaqala.name}</h3>
          <p style={{ fontSize: '14px', color: 'var(--lux-hint)' }}>Merchant ID: {myBaqala.id}</p>
          <p style={{ fontSize: '14px', color: 'var(--lux-hint)' }}>Wallet: {myBaqala.wallet_address}</p>
        </div>
      )}
    </div>
  );
}
