// ================================================
// frontend/src/components/VendorDashboard.jsx
// V7: ROBUST ADD-ITEM + LOGGING
// ================================================

import React, { useState, useEffect } from 'react';
import { Store, RefreshCw, TrendingUp, Layers, Package } from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [metrics, setMetrics] = useState({ totalOutstanding: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'snacks' });

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
    } catch (err) { console.error("Fetch failed", err); }
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
      }
    } catch (err) { alert("Registration failed: " + err.message); }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!myBaqala?.id) return;
    
    // Ensure numeric price
    const priceNum = parseFloat(newItem.price);
    if (isNaN(priceNum)) return alert("Invalid Price");

    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, {
        name: newItem.name,
        price: priceNum,
        category: newItem.category
      });
      if (res.data.success) {
        setMyBaqala(prev => ({ 
          ...prev, 
          inventory: [...(prev.inventory || []), res.data.inventory] 
        }));
        setNewItem({ name: '', price: '', category: 'snacks' });
      }
    } catch (err) { 
      console.error("Add Item Error Details:", err.response?.data);
      alert("Error: " + (err.response?.data?.error || "Check backend console")); 
    }
  };

  if (isLoading) return <div style={{textAlign:'center', paddingTop:'40vh'}}><RefreshCw className="spin-anim" /></div>;

  if (!myBaqala) return (
    <div className="app-container">
      <div className="card" style={{marginTop:'5vh', textAlign:'center'}}>
        <Store size={40} color="var(--logo-teal)" style={{margin:'0 auto 20px'}}/>
        <h2>Open Store</h2>
        <form onSubmit={handleRegister} style={{display:'flex', flexDirection:'column', gap:'12px', marginTop:'20px'}}>
          <input placeholder="Shop Name" required value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
          <input placeholder="Wallet Address" value={regForm.wallet} onChange={e=>setRegForm({...regForm, wallet:e.target.value})} />
          <button className="btn-primary" type="submit">Start Testing</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="profile-tabs" style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
        {['overview', 'inventory'].map(t => (
          <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)} style={{flex:1, padding: '10px'}}>{t.toUpperCase()}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="metric-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
          <div className="metric-card"><span>REVENUE</span><h3>AED 0.00</h3></div>
          <div className="metric-card" style={{borderLeft:'3px solid var(--logo-orange)'}}>
            <span>HISAAB DUE</span>
            <h3>AED {metrics.totalOutstanding.toFixed(2)}</h3>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="card">
            <h4>Add Product</h4>
            <form onSubmit={addItem} style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'15px'}}>
              <input placeholder="Item Name" required value={newItem.name} onChange={e=>setNewItem({...newItem, name:e.target.value})} />
              <input type="number" placeholder="Price (AED)" required value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} />
              <select 
                style={{background: '#ffffff0d', color: 'white', padding: '12px', borderRadius: '10px', border: '1px solid var(--lux-border)'}}
                value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}
              >
                <option value="snacks">Snacks</option>
                <option value="dairy">Dairy</option>
                <option value="beverages">Beverages</option>
                <option value="household">Household</option>
              </select>
              <button className="btn-primary" type="submit">List Now</button>
            </form>
          </div>
          <div className="card" style={{marginTop:'15px'}}>
             {myBaqala.inventory?.map(i => (
               <div key={i.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--lux-border)'}}>
                 <span>{i.name}</span>
                 <strong>AED {parseFloat(i.price).toFixed(2)}</strong>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
