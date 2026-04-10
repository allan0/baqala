import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  RefreshCw,
  Users,
  Package,
  Layers,
  TrendingUp,
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user }) {
  // --- STATE ---
  const [myBaqala, setMyBaqala] = useState(null);
  const [apps, setApps] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Inventory Form State
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: 'snacks',
    cryptoDiscount: 10
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_URL}/api/baqala/owner/${user.id}`)
        .then(res => {
          if (res.data?.baqala) {
            setMyBaqala(res.data.baqala);
            setApps(res.data.applications || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  // --- ACTIONS ---
  const handleSyncLedger = () => {
    haptic('heavy');
    setIsSyncing(true);

    // Simulate Blockchain anchoring
    setTimeout(() => {
      setIsSyncing(false);
      WebApp?.showPopup({
        title: 'Ledger Anchored',
        message: 'Daily Hisaab records have been successfully synced to the Base Sepolia blockchain.',
        buttons: [{ type: 'ok' }]
      });
    }, 2500);
  };

  const addItem = async (e) => {
    e.preventDefault();
    haptic('light');

    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, newItem);
      
      setMyBaqala(prev => ({
        ...prev,
        inventory: [...(prev.inventory || []), res.data.inventory]
      }));

      setNewItem({
        name: '',
        price: '',
        category: 'snacks',
        cryptoDiscount: 10
      });

      WebApp?.showAlert("Item listed successfully!");
    } catch (err) {
      alert("Error adding item");
    }
  };

  // --- RENDER MODULES ---
  const renderMetrics = () => (
    <div className="metric-grid">
      <div className="metric-card card">
        <span><TrendingUp size={12} /> Daily Revenue</span>
        <h3>AED 1,240</h3>
        <p style={{ fontSize: '10px', color: 'var(--logo-teal)', marginTop: '5px' }}>
          +12% from yesterday
        </p>
      </div>
      <div className="metric-card card">
        <span><Layers size={12} /> Outstanding Hisaab</span>
        <h3 style={{ color: 'var(--logo-orange)' }}>AED 4,890</h3>
        <p style={{ fontSize: '10px', color: 'var(--lux-hint)', marginTop: '5px' }}>
          Across 14 profiles
        </p>
      </div>
    </div>
  );

  const renderOverview = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {renderMetrics()}

      <div className="card" style={{ border: '1px solid var(--logo-teal)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} className={isSyncing ? 'spin-anim' : ''} />
            Digital Ledger Sync
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--lux-hint)', margin: '10px 0 20px' }}>
            Lock current off-chain Hisaab debt into the blockchain for security.
          </p>
          <button
            className="btn-primary"
            onClick={handleSyncLedger}
            disabled={isSyncing}
          >
            {isSyncing ? "Verifying Transaction..." : "Sync Daily Ledger"}
          </button>
        </div>
        <BarChart3 
          size={100} 
          style={{ 
            position: 'absolute', 
            right: '-20px', 
            bottom: '-20px', 
            opacity: 0.05, 
            transform: 'rotate(-15deg)' 
          }} 
        />
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} /> Credit Applications
        </h4>
        {apps.length === 0 ? (
          <p style={{ color: 'var(--lux-hint)', fontSize: '14px' }}>
            No pending applications currently.
          </p>
        ) : (
          apps.map(app => (
            <div 
              key={app.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px 0', 
                borderBottom: '1px solid var(--lux-border)' 
              }}
            >
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {app.user_name || "New Customer"}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--logo-teal)', margin: 0 }}>
                  Requests Hisaab
                </p>
              </div>
              <button 
                className="btn-secondary" 
                style={{ width: 'auto', padding: '6px 15px', fontSize: '12px' }}
              >
                Review
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  const renderInventoryManager = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <h4>List New Item</h4>
        <form 
          onSubmit={addItem} 
          style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              style={{ flex: 2 }}
              placeholder="Item Name"
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
            <input
              style={{ flex: 1 }}
              type="number"
              placeholder="AED"
              value={newItem.price}
              onChange={e => setNewItem({ ...newItem, price: e.target.value })}
              required
            />
          </div>

          <select
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid var(--lux-border)',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '15px'
            }}
            value={newItem.category}
            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
          >
            <option value="snacks">Snacks</option>
            <option value="dairy">Dairy</option>
            <option value="beverages">Beverages</option>
            <option value="household">Household</option>
          </select>

          <button className="btn-primary" type="submit">
            Add to Inventory
          </button>
        </form>
      </div>

      <div className="card">
        <h4>Current Catalog</h4>
        <div style={{ marginTop: '15px' }}>
          {(myBaqala?.inventory || []).map(item => (
            <div 
              key={item.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '12px 0', 
                borderBottom: '1px solid var(--lux-border)' 
              }}
            >
              <span>
                {item.name} 
                <small style={{ color: 'var(--lux-hint)' }}> ({item.category})</small>
              </span>
              <span style={{ fontWeight: 700 }}>AED {item.price}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  // --- REGISTRATION VIEW (when no baqala is registered) ---
  if (!myBaqala) {
    return (
      <div className="app-container">
        <div className="card" style={{ marginTop: '20vh', textAlign: 'center' }}>
          <Package size={48} color="var(--logo-teal)" style={{ marginBottom: '20px' }} />
          <h3>Register Your Baqala</h3>
          <p style={{ color: 'var(--lux-hint)', margin: '10px 0 20px', fontSize: '14px' }}>
            Join the network to offer Digital Hisaab and Crypto payments to your customers.
          </p>
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              alert("Feature temporarily locked for xAI Review"); 
            }}
          >
            <input 
              placeholder="Store Name (e.g. Al Madina Baqala)" 
              required 
            />
            <input 
              placeholder="Wallet for Crypto Payments (0x...)" 
              required 
            />
            <button className="btn-primary" type="submit">
              Initialize Storefront
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN VENDOR DASHBOARD ---
  return (
    <div className="app-container">
      {/* Sub-Navigation for Vendor */}
      <div className="profile-tabs" style={{ marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} 
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} 
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'inventory' && renderInventoryManager()}
      
      {activeTab === 'settings' && (
        <div className="card">
          <h4>Store Profile</h4>
          <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--lux-hint)' }}>
            <p><strong>Merchant ID:</strong> {myBaqala.id}</p>
            <p><strong>Settlement Wallet:</strong> {myBaqala.wallet_address || 'Not Connected'}</p>
            <p style={{ marginTop: '15px' }}>
              Contact support to change your store location or ownership details.
            </p>
          </div>
          <button 
            className="btn-secondary" 
            style={{ marginTop: '20px' }} 
            onClick={() => WebApp?.openLink('https://t.me/baqala_support')}
          >
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
}
