// ================================================
// frontend/src/components/VendorDashboard.jsx
// FULL MVP VENDOR MANAGEMENT + BI ENGINE
// ================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Layers, 
  RefreshCw, 
  Users, 
  Package, 
  Plus, 
  Store, 
  MapPin, 
  Wallet,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  // --- STATE ---
  const [myBaqala, setMyBaqala] = useState(null);
  const [apps, setApps] = useState([]);
  const [metrics, setMetrics] = useState({ totalOutstanding: 0, activeCustomers: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State for Registration
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  
  // Form State for Inventory
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: 'snacks',
    cryptoDiscount: 10
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    if (user?.id) {
      fetchVendorData();
    }
  }, [user]);

  const fetchVendorData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${user.id}`);
      if (res.data?.baqala) {
        setMyBaqala(res.data.baqala);
        setApps(res.data.applications || []);
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // --- ACTIONS ---
  const handleRegister = async (e) => {
    e.preventDefault();
    haptic('heavy');
    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        owner_id: user.id,
        wallet_address: regForm.wallet,
        lat: location?.lat || 25.2048, // Fallback to Dubai
        lng: location?.lng || 55.2708
      });

      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        WebApp.showAlert("🏪 Storefront registered successfully!");
      }
    } catch (err) {
      WebApp.showAlert("Error registering store. Please try again.");
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
        setNewItem({ name: '', price: '', category: 'snacks', cryptoDiscount: 10 });
        WebApp.showAlert("Item added to catalog!");
      }
    } catch (err) {
      WebApp.showAlert("Failed to add item.");
    }
  };

  const syncLedger = () => {
    haptic('heavy');
    setIsSyncing(true);
    // Simulate Blockchain anchoring interaction
    setTimeout(() => {
      setIsSyncing(false);
      WebApp.showPopup({
        title: "Ledger Anchored",
        message: "Digital Hisaab ledger synced to Base Sepolia successfully.",
        buttons: [{ type: "ok" }]
      });
    }, 2000);
  };

  // --- SUB-COMPONENTS ---
  const renderRegistration = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-container">
      <div className="card" style={{ marginTop: '10vh', textAlign: 'center' }}>
        <Store size={48} color="var(--logo-teal)" style={{ marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '10px' }}>Register Your Baqala</h2>
        <p style={{ color: 'var(--lux-hint)', fontSize: '14px', marginBottom: '25px' }}>
          Connect your UAE neighborhood store to the Digital Hisaab network.
        </p>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            placeholder="Store Name (e.g. Al Maya Baqala)" 
            required 
            value={regForm.name}
            onChange={e => setRegForm({...regForm, name: e.target.value})}
          />
          <input 
            placeholder="Crypto Settlement Wallet (0x...)" 
            required 
            value={regForm.wallet}
            onChange={e => setRegForm({...regForm, wallet: e.target.value})}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <MapPin size={18} color="var(--logo-orange)" />
            <span style={{ fontSize: '12px', color: 'var(--lux-hint)' }}>
              {location ? `Location Found: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Detecting GPS location..."}
            </span>
          </div>

          <button className="btn-primary" type="submit" disabled={!location}>
            Initialize Storefront
          </button>
        </form>
      </div>
    </motion.div>
  );

  const renderOverview = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Metrics Row */}
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div className="metric-card">
          <span style={{ fontSize: '11px', color: 'var(--lux-hint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} /> DAILY REVENUE
          </span>
          <h3 style={{ fontSize: '24px', marginTop: '5px' }}>AED 0.00</h3>
        </div>
        <div className="metric-card">
          <span style={{ fontSize: '11px', color: 'var(--lux-hint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={12} /> OUTSTANDING
          </span>
          <h3 style={{ fontSize: '24px', marginTop: '5px', color: 'var(--logo-orange)' }}>
            AED {metrics.totalOutstanding.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Sync Ledger Card */}
      <div className="card" style={{ border: '1px solid rgba(0, 212, 200, 0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} className={isSyncing ? 'spin-anim' : ''} />
            Digital Ledger Sync
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--lux-hint)', margin: '10px 0 20px' }}>
            Anchor your current off-chain debt to the blockchain for security.
          </p>
          <button className="btn-primary" onClick={syncLedger} disabled={isSyncing}>
            {isSyncing ? "Connecting to Base..." : "Sync Daily Ledger"}
          </button>
        </div>
      </div>

      {/* Applications */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Users size={18} /> Credit Applications
        </h4>
        {apps.length === 0 ? (
          <p style={{ color: 'var(--lux-hint)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No pending applications.</p>
        ) : (
          apps.map(app => (
            <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--lux-border)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{app.user_name || "New Customer"}</p>
                <p style={{ fontSize: '11px', color: 'var(--logo-teal)' }}>Requests Hisaab</p>
              </div>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}>Review</button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  const renderInventory = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <h4>List New Item</h4>
        <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              style={{ flex: 2 }} placeholder="Item Name" required 
              value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
            <input 
              style={{ flex: 1 }} type="number" placeholder="AED" required 
              value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})}
            />
          </div>
          <select 
            style={{ background: '#ffffff0d', color: 'white', border: '1px solid var(--lux-border)', padding: '14px', borderRadius: '12px' }}
            value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}
          >
            <option value="snacks">🍿 Snacks</option>
            <option value="dairy">🥛 Dairy</option>
            <option value="beverages">🥤 Beverages</option>
            <option value="household">🧼 Household</option>
          </select>
          <button className="btn-primary" type="submit">Add to Catalog</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h4>Current Catalog</h4>
        <div style={{ marginTop: '15px' }}>
          {(myBaqala?.inventory || []).length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--lux-hint)', padding: '20px' }}>Your catalog is empty.</p>
          ) : (
            myBaqala.inventory.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--lux-border)' }}>
                <span style={{ fontSize: '14px' }}>{item.name} <small style={{ opacity: 0.5 }}>({item.category})</small></span>
                <span style={{ fontWeight: 700 }}>AED {parseFloat(item.price).toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );

  // --- MAIN RENDER ---
  if (isLoading) return <div className="app-container" style={{ textAlign: 'center', paddingTop: '40vh' }}><RefreshCw className="spin-anim" /></div>;
  if (!myBaqala) return renderRegistration();

  return (
    <div className="app-container" style={{ paddingBottom: '120px' }}>
      {/* Sub Tabs */}
      <div className="profile-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        {[
          { id: 'overview', icon: <LayoutDashboard size={16} />, label: 'BI Overview' },
          { id: 'inventory', icon: <Package size={16} />, label: 'Inventory' },
          { id: 'settings', icon: <Settings size={16} />, label: 'Settings' }
        ].map(tab => (
          <button 
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { haptic('light'); setActiveTab(tab.id); }}
            style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'inventory' && renderInventory()}
      {activeTab === 'settings' && (
        <div className="card">
          <h3>Store Settings</h3>
          <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--lux-hint)' }}>
            <p><strong>Merchant ID:</strong> {myBaqala.id}</p>
            <p><strong>Settlement Wallet:</strong> {myBaqala.wallet_address}</p>
            <p style={{ marginTop: '15px' }}>Store is live and visible to nearby customers.</p>
          </div>
          <button className="btn-secondary" style={{ marginTop: '30px' }} onClick={() => WebApp.openLink('https://t.me/baqala_support')}>
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
}
