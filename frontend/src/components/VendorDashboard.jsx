// ================================================
// frontend/src/components/VendorDashboard.jsx
// V6: CRASH-PROOF + GUEST COMPATIBLE
// ================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, MapPin, RefreshCw, TrendingUp, Layers } from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [metrics, setMetrics] = useState({ totalOutstanding: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '' });

  // --- VERSION SAFE NOTIFICATIONS ---
  const safeAlert = (msg) => {
    if (WebApp?.isVersionAtLeast && WebApp.isVersionAtLeast('6.0') && WebApp.showAlert) {
      try { WebApp.showAlert(msg); return; } catch (e) {}
    }
    alert(msg);
  };

  const getEffectiveUserId = () => {
    if (user?.id) return user.id.toString();
    let gid = localStorage.getItem('baqala_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('baqala_guest_id', gid);
    }
    return gid;
  };

  useEffect(() => { fetchVendorData(); }, [user]);

  const fetchVendorData = async () => {
    const uid = getEffectiveUserId();
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${uid}`);
      if (res.data?.baqala) {
        setMyBaqala(res.data.baqala);
        setMetrics(res.data.metrics || { totalOutstanding: 0 });
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const uid = getEffectiveUserId();
    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        owner_id: uid,
        wallet_address: regForm.wallet,
        lat: location?.lat || 25.20,
        lng: location?.lng || 55.27
      });
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        safeAlert("🏪 Storefront Live!");
      }
    } catch (err) {
      safeAlert("Error: " + (err.response?.data?.error || "Registration failed"));
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, {
        name: newItem.name,
        price: newItem.price
      });
      if (res.data.success) {
        setMyBaqala(prev => ({ ...prev, inventory: [...(prev.inventory || []), res.data.inventory] }));
        setNewItem({ name: '', price: '' });
      }
    } catch (err) { safeAlert("Item add failed"); }
  };

  if (isLoading) return <div style={{textAlign:'center', paddingTop:'40vh'}}><RefreshCw className="spin-anim" /></div>;

  if (!myBaqala) return (
    <div className="app-container">
      <div className="card" style={{marginTop:'5vh', textAlign:'center'}}>
        <Store size={40} color="var(--logo-teal)" style={{margin:'0 auto 20px'}}/>
        <h2>Open Your Store</h2>
        <form onSubmit={handleRegister} style={{display:'flex', flexDirection:'column', gap:'12px', marginTop:'20px'}}>
          <input placeholder="Shop Name" required value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
          <input placeholder="Wallet Address" value={regForm.wallet} onChange={e=>setRegForm({...regForm, wallet:e.target.value})} />
          <button className="btn-primary" type="submit">Register Now</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="profile-tabs" style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
        {['overview', 'inventory'].map(t => (
          <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)} style={{flex:1}}>{t}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="metric-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
          <div className="metric-card"><span>REVENUE</span><h3>AED 0.00</h3></div>
          <div className="metric-card" style={{borderLeft:'3px solid var(--logo-orange)'}}>
            <span>HISAAB</span>
            <h3>AED {metrics.totalOutstanding.toFixed(2)}</h3>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="card">
            <h4>Add Item</h4>
            <form onSubmit={addItem} style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'10px'}}>
              <input placeholder="Name" required value={newItem.name} onChange={e=>setNewItem({...newItem, name:e.target.value})} />
              <input type="number" placeholder="Price" required value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} />
              <button className="btn-primary" type="submit">Add Product</button>
            </form>
          </div>
          <div className="card" style={{marginTop:'15px'}}>
             {myBaqala.inventory?.map(i => (
               <div key={i.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--lux-border)'}}>
                 <span>{i.name}</span>
                 <strong>AED {i.price}</strong>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
