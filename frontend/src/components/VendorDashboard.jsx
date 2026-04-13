// ================================================
// frontend/src/components/VendorDashboard.jsx
// V5: GUEST MODE SUPPORTED FOR TESTING
// ================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Layers, RefreshCw, Users, Package, 
  Store, MapPin, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  // --- STATE ---
  const [myBaqala, setMyBaqala] = useState(null);
  const [metrics, setMetrics] = useState({ totalOutstanding: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [regError, setRegError] = useState(null);

  // Form State
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'snacks' });

  // --- GUEST ID HANDLER ---
  const getEffectiveUserId = () => {
    if (user?.id) return user.id.toString();
    
    // Check for existing test guest ID in browser
    let guestId = localStorage.getItem('baqala_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('baqala_guest_id', guestId);
    }
    return guestId;
  };

  useEffect(() => {
    fetchVendorData();
  }, [user]);

  const fetchVendorData = async () => {
    const userId = getEffectiveUserId();
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${userId}`);
      if (res.data?.baqala) {
        setMyBaqala(res.data.baqala);
        setMetrics(res.data.metrics || { totalOutstanding: 0 });
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);
    const userId = getEffectiveUserId();

    // In Guest Mode, if location is missing, we use mock coordinates
    const finalLat = location?.lat || 25.2048;
    const finalLng = location?.lng || 55.2708;

    const payload = {
      name: regForm.name,
      owner_id: userId,
      wallet_address: regForm.wallet || '0xTEST_WALLET',
      lat: finalLat,
      lng: finalLng
    };

    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, payload);
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        if (WebApp?.showAlert) WebApp.showAlert("🏪 Test Store Registered!");
      }
    } catch (err) {
      setRegError(err.response?.data?.error || "Registration failed.");
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, newItem);
      if (res.data.success) {
        setMyBaqala(prev => ({
          ...prev,
          inventory: [...(prev.inventory || []), res.data.inventory]
        }));
        setNewItem({ name: '', price: '', category: 'snacks' });
      }
    } catch (err) { alert("Error adding item."); }
  };

  if (isLoading) return <div style={{ textAlign: 'center', paddingTop: '45vh' }}><RefreshCw className="spin-anim" color="var(--logo-teal)" /></div>;

  // VIEW: Register your Baqala
  if (!myBaqala) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-container">
      {!user && (
        <div style={{ background: 'var(--logo-orange)', color: 'black', padding: '10px', borderRadius: '10px', marginBottom: '15px', fontSize: '12px', fontWeight: 800, textAlign: 'center' }}>
          🧪 TEST MODE: GUEST USER ACTIVE
        </div>
      )}
      <div className="card" style={{ marginTop: '2vh', textAlign: 'center' }}>
        <Store size={40} color="var(--logo-teal)" style={{ margin: '0 auto 20px' }} />
        <h2>Open Your Store</h2>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <input placeholder="Store Name" required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} />
          <input placeholder="Wallet (0x...)" value={regForm.wallet} onChange={e => setRegForm({...regForm, wallet: e.target.value})} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px' }}>
            {location ? <CheckCircle2 size={18} color="var(--logo-teal)" /> : <MapPin size={18} color="var(--logo-orange)" />}
            <span style={{ fontSize: '12px' }}>{location ? "GPS Synced" : "Using Default Location (Dubai)"}</span>
          </div>

          {regError && <div style={{ color: '#ff4444', fontSize: '12px' }}>{regError}</div>}
          <button className="btn-primary" type="submit">Initialize Storefront</button>
        </form>
      </div>
    </motion.div>
  );

  return (
    <div className="app-container" style={{ paddingBottom: '120px' }}>
      <div className="profile-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        {['overview', 'inventory', 'settings'].map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} style={{ flex: 1, textTransform: 'uppercase', padding: '14px', fontSize: '11px' }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="metric-card">
               <span style={{fontSize: '10px'}}>REVENUE</span>
               <h3 style={{ fontSize: '22px' }}>AED 0.00</h3>
            </div>
            <div className="metric-card" style={{ borderLeft: '3px solid var(--logo-orange)' }}>
               <span style={{fontSize: '10px'}}>OUTSTANDING</span>
               <h3 style={{ fontSize: '22px', color: 'var(--logo-orange)' }}>AED {metrics.totalOutstanding.toFixed(2)}</h3>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'inventory' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card">
            <h4>Add New Product</h4>
            <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
              <input placeholder="Product Name" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <input type="number" placeholder="Price (AED)" required value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <button className="btn-primary" type="submit">Add to Catalog</button>
            </form>
          </div>
          <div className="card" style={{ marginTop: '20px' }}>
            {myBaqala.inventory?.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--lux-border)' }}>
                <span>{item.name}</span>
                <span style={{ fontWeight: 800, color: 'var(--logo-teal)' }}>AED {item.price}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <div className="card">
          <h3>{myBaqala.name}</h3>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>Owner ID: {getEffectiveUserId()}</p>
        </div>
      )}
    </div>
  );
}
