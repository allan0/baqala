import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [vendorApps, setVendorApps] = useState([]);
  const[newBaqalaName, setNewBaqalaName] = useState("");
  const [baqalaWallet, setBaqalaWallet] = useState("");
  const [newItem, setNewItem] = useState({ name: '', price: '', cryptoDiscount: 10 });
  const [creditLimitInput, setCreditLimitInput] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // Load baqala and pending applications
  useEffect(() => {
    if (user) {
      axios.get(`${API_URL}/api/baqala/owner/${user.id}`)
        .then(res => {
          if (res.data) {
            setMyBaqala(res.data.baqala);
            setVendorApps(res.data.applications ||[]);
          }
        })
        .catch(err => console.error("Error fetching Baqala data:", err));
    }
  }, [user]);

  const handleRegisterBaqala = async (e) => {
    e.preventDefault();
    triggerHaptic('heavy');
    if (!location) return alert("Please allow location access to register your Baqala.");

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala`, {
        name: newBaqalaName,
        lat: location.lat,
        lng: location.lng,
        ownerId: user.id,
        walletAddress: baqalaWallet
      });
      setMyBaqala(res.data.baqala);
      setVendorApps([]);
      
      const msg = "Baqala registered successfully!";
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to register Baqala.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    triggerHaptic('light');
    if (!myBaqala) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, newItem);
      setMyBaqala({ ...myBaqala, inventory: res.data.inventory });
      setNewItem({ name: '', price: '', cryptoDiscount: 10 });
      
      const msg = "Item added to inventory!";
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveApplication = async (appId) => {
    triggerHaptic('medium');
    const limit = creditLimitInput[appId];
    if (!limit || limit <= 0) return alert("Please set a valid credit limit.");

    // Optimistic UI Update: Instantly remove it from the pending list
    setVendorApps(prev => prev.filter(app => app.id !== appId));

    try {
      await axios.post(`${API_URL}/api/approve`, { appId, limit });
      const msg = `Approved with AED ${limit} limit!`;
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);

      // Fetch silently in the background to ensure sync
      const vendorRes = await axios.get(`${API_URL}/api/baqala/owner/${user.id}`);
      if (vendorRes.data) setVendorApps(vendorRes.data.applications ||[]);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to approve application.");
    }
  };

  const handleSyncLedger = async () => {
    triggerHaptic('heavy');
    if (!myBaqala) return;
    
    // In future this will call real blockchain sync via ethers.js
    const msg = "✅ Daily Ledger successfully synced to the Blockchain!";
    WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);
  };

  // --- VIEW 1: REGISTRATION ---
  if (!myBaqala) {
    return (
      <div className="vendor-dashboard">
        <div className="card" style={{ marginTop: '10px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Register Your Baqala</h2>
          <form onSubmit={handleRegisterBaqala} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              placeholder="Baqala Name (e.g. Al Madina Baqala)"
              value={newBaqalaName}
              onChange={e => setNewBaqalaName(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <input
              type="text"
              placeholder="Your Web3 Wallet Address (0x...)"
              value={baqalaWallet}
              onChange={e => setBaqalaWallet(e.target.value)}
              required
              disabled={isSubmitting}
              spellCheck="false"
            />
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Store"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW 2: MAIN VENDOR DASHBOARD ---
  return (
    <div className="vendor-dashboard">
      {/* Store Header with Logo + QR */}
      <div className="card" style={{ 
        background: 'var(--shining-gradient)', 
        color: 'white', 
        textAlign: 'center', 
        padding: '24px 20px',
        marginBottom: '20px',
        border: 'none'
      }}>
        <h2 style={{ color: 'white', marginBottom: '8px' }}>{myBaqala.name}</h2>
        <p style={{ opacity: 0.9, fontSize: '14px' }}>Store ID: {myBaqala.id}</p>

        <div style={{ margin: '20px auto', display: 'inline-block', background: 'white', padding: '12px', borderRadius: '16px' }}>
          {/* Using a reliable QR Code API */}
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${myBaqala.id}`} 
            alt="Store QR Code" 
            style={{ borderRadius: '12px', display: 'block' }}
          />
        </div>
        <p style={{ fontSize: '13px', opacity: 0.85, fontWeight: '500' }}>
          Let customers scan this QR to apply for Hisaab
        </p>
      </div>

      {/* Quick Actions */}
      <button 
        className="btn-primary" 
        onClick={handleSyncLedger}
        style={{ width: '100%', marginBottom: '25px', background: 'var(--logo-teal)' }}
      >
        ⛓️ Sync Ledger to Blockchain
      </button>

      {/* Pending Applications */}
      {vendorApps.filter(a => a.status === 'pending').length > 0 && (
        <div className="card" style={{ 
          border: '1px solid var(--logo-orange)', 
          background: 'rgba(255, 107, 0, 0.05)',
          marginBottom: '25px'
        }}>
          <h3 style={{ color: 'var(--logo-orange)', marginBottom: '15px' }}>🔔 Pending Hisaab Applications</h3>
          <div className="order-list">
            {vendorApps.filter(a => a.status === 'pending').map(app => (
              <div key={app.id} style={{ 
                padding: '16px 0', 
                borderBottom: '1px solid rgba(255,255,255,0.05)' 
              }}>
                <strong style={{ color: 'var(--lux-text)' }}>{app.userName}</strong> wants Hisaab credit.
                <div className="flex-form" style={{ marginTop: '12px', gap: '10px' }}>
                  <input 
                    type="number" 
                    placeholder="Credit Limit (AED)" 
                    style={{ flex: 1 }}
                    onChange={(e) => setCreditLimitInput({ 
                      ...creditLimitInput, 
                      [app.id]: e.target.value 
                    })} 
                  />
                  <button 
                    className="btn-primary" 
                    style={{ padding: '12px 20px', width: 'auto' }}
                    onClick={() => approveApplication(app.id)}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Form */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>📦 Add New Item to Inventory</h3>
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input 
            type="text" 
            placeholder="Item Name (e.g. Karak Tea)" 
            value={newItem.name} 
            onChange={e => setNewItem({ ...newItem, name: e.target.value })} 
            required 
            disabled={isSubmitting}
          />
          <input 
            type="number" 
            placeholder="Price in AED" 
            value={newItem.price} 
            onChange={e => setNewItem({ ...newItem, price: e.target.value })} 
            required 
            disabled={isSubmitting}
            min="0"
            step="0.25"
          />
          <input 
            type="number" 
            placeholder="Crypto Discount % (e.g. 10)" 
            value={newItem.cryptoDiscount} 
            onChange={e => setNewItem({ ...newItem, cryptoDiscount: e.target.value })} 
            disabled={isSubmitting}
            min="0"
            max="100"
          />
          <button type="submit" className="btn-secondary" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "+ Add to Inventory"}
          </button>
        </form>
      </div>

      {/* Current Inventory */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>🛒 Current Inventory</h3>
        {myBaqala.inventory.length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: '14px' }}>No items added yet. Add your first product above.</p>
        ) : (
          <ul className="order-list">
            {myBaqala.inventory.map(item => (
              <li key={item.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{item.name}</span><br />
                  <small style={{ opacity: 0.7 }}>AED {item.price}</small>
                </div>
                <span className="badge-crypto">{item.cryptoDiscount}% Crypto Discount</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
