import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function CustomerDashboard({ 
  user, 
  location, 
  walletAddress, 
  connectWallet,
  profiles,
  setProfiles,
  nearbyBaqalas,
  currentScreen,
  setCurrentScreen
}) {
  const [activeProfileKey, setActiveProfileKey] = useState('main');
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [cart, setCart] = useState([]);
  const [newProfileName, setNewProfileName] = useState("");

  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // --- ACTIONS ---

  const handleSettle = async () => {
    triggerHaptic('heavy');
    if (!walletAddress) return connectWallet();

    const activeProfile = profiles[activeProfileKey] || { unpaidItems:[] };
    let cryptoTotal = 0;
    activeProfile.unpaidItems.forEach(item => {
      const itemTotal = item.price * (item.qty || 1);
      cryptoTotal += (itemTotal * (1 - (item.cryptoDiscount || 10) / 100));
    });

    try {
      // Mock conversion: 1 AED = 0.0001 ETH
      const ethAmount = (cryptoTotal * 0.0001).toFixed(6); 
      const targetBaqalaWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Dummy Baqala Wallet

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: targetBaqalaWallet,
        value: ethers.parseEther(ethAmount.toString())
      });

      await axios.post(`${API_URL}/api/hisaab/${user.id}/settle`, { profileKey: activeProfileKey });

      // Update global profiles state
      setProfiles(prev => ({
        ...prev,
        [activeProfileKey]: { ...prev[activeProfileKey], unpaidItems:[], debt: 0 }
      }));

      const successMsg = `Paid ${ethAmount} ETH (~AED ${cryptoTotal.toFixed(2)}). Tx: ${tx.hash.substring(0, 10)}...`;
      WebApp?.showAlert ? WebApp.showAlert(successMsg) : alert(successMsg);
    } catch (error) {
      console.error("Transaction failed", error);
      alert("Payment cancelled or failed.");
    }
  };

  const handleScanQR = () => {
    triggerHaptic('heavy');
    if (WebApp?.showScanQrPopup) {
      WebApp.showScanQrPopup({ text: "Scan Baqala QR Code" }, (text) => {
        WebApp.showAlert(`Scanned Baqala ID: ${text}`);
        return true;
      });
    } else {
      alert("QR Scanner is only available on mobile Telegram.");
    }
  };

  const addToCart = (item) => {
    triggerHaptic('light');
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const checkoutCart = async () => {
    if (cart.length === 0 || !selectedBaqala) return;
    triggerHaptic('medium');

    try {
      const payload = {
        profileKey: activeProfileKey,
        items: cart.map(i => ({ ...i, baqalaId: selectedBaqala.id })),
        baqalaId: selectedBaqala.id
      };

      const res = await axios.post(`${API_URL}/api/hisaab/${user.id}/buy`, payload);

      setProfiles(res.data.user.profiles || profiles);
      setCart([]);
      setSelectedBaqala(null);
      setCurrentScreen('hisaab'); // Auto-redirect to Hisaab to see new debt

      const msg = "Items added to your Hisaab successfully!";
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);
    } catch (e) {
      alert(e.response?.data?.error || "Error purchasing items.");
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    triggerHaptic('medium');
    try {
      const res = await axios.post(`${API_URL}/api/hisaab/${user.id}/profile`, { name: newProfileName });
      setProfiles(res.data.profiles);
      setNewProfileName("");
      setActiveProfileKey(newProfileName.toLowerCase().replace(/\s+/g, '_'));
      const msg = `Profile '${newProfileName}' created successfully!`;
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);
    } catch (e) {
      console.error(e);
      alert("Failed to create profile.");
    }
  };

  // --- DATA CALCULATIONS ---
  const activeProfile = profiles[activeProfileKey] || { name: 'Main', unpaidItems:[], debt: 0 };

  let cashTotal = 0;
  let cryptoTotal = 0;
  activeProfile.unpaidItems.forEach(item => {
    const itemTotal = (item.price || 0) * (item.qty || 1);
    cashTotal += itemTotal;
    cryptoTotal += itemTotal * (1 - (item.cryptoDiscount || 10) / 100);
  });

  // =========================================
  // VIEW 1: STOREFRONT (When browsing a specific store)
  // =========================================
  if (selectedBaqala) {
    return (
      <div className="storefront">
        <button 
          className="btn-text mb-15" 
          onClick={() => { setSelectedBaqala(null); setCart([]); triggerHaptic('light'); }}
          style={{ marginBottom: '20px' }}
        >
          ⬅ Back to Stores
        </button>

        <div className="store-header card" style={{ background: 'var(--shining-gradient)', color: 'white', textAlign: 'center', border: 'none' }}>
          <h2>{selectedBaqala.name}</h2>
          <p style={{ opacity: 0.9, marginTop: '8px' }}>Shopping for <strong>{activeProfile.name}</strong></p>
        </div>

        <div className="inventory-grid">
          {selectedBaqala.inventory.length === 0 ? (
            <p style={{ color: 'var(--lux-hint)' }}>No items available yet.</p>
          ) : (
            selectedBaqala.inventory.map(item => (
              <div key={item.id} className="card item-card">
                <h4>{item.name}</h4>
                <p className="cash-price">AED {item.price}</p>
                <p className="crypto-price">AED {(item.price * (1 - item.cryptoDiscount / 100)).toFixed(2)}</p>
                <span className="discount-tag">{item.cryptoDiscount}% OFF</span>
                <button className="btn-secondary mt-15" onClick={() => addToCart(item)} style={{ padding: '8px' }}>
                  + Add to Cart
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="floating-cart card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>🛒 Cart ({cart.reduce((acc, i) => acc + i.qty, 0)} items)</h3>
              <h3 style={{ color: 'var(--logo-orange)' }}>
                AED {cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2)}
              </h3>
            </div>
            <button className="btn-primary" onClick={checkoutCart}>
              Put on Hisaab
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================
  // VIEW 2: MAIN DASHBOARD TABS
  // =========================================
  return (
    <div className="customer-dashboard">
      
      {/* --- HOME TAB --- */}
      {currentScreen === 'home' && (
        <>
          <div className="hisaab-card" style={{ marginBottom: '25px' }}>
            <h2 style={{ marginBottom: '15px' }}>{activeProfile.name}'s Hisaab</h2>
            <div className="price-split">
              <div className="price-box">
                <p>Cash Total</p>
                <h3>AED {cashTotal.toFixed(2)}</h3>
              </div>
              <div className="price-box crypto">
                <p>Crypto Total</p>
                <h3>AED {cryptoTotal.toFixed(2)}</h3>
              </div>
            </div>
            <button className="btn-primary" onClick={handleSettle} disabled={cashTotal === 0}>
              {cashTotal === 0 ? "✅ All Settled" : walletAddress ? "💳 Pay ETH Equivalent" : "🔐 Connect Wallet"}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
            <button className="btn-secondary" onClick={handleScanQR} style={{ flex: 1, backgroundColor: 'rgba(0, 212, 200, 0.1)', color: 'var(--logo-teal)', border: '1px solid var(--logo-teal)' }}>
              📷 Scan Baqala QR
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: 'var(--lux-text)' }}>📍 Nearby Stores</h3>
            <button className="btn-text" onClick={() => setCurrentScreen('stores')}>View All</button>
          </div>
          
          <div className="baqala-grid">
            {nearbyBaqalas.slice(0, 4).map(b => (
              <div key={b.id} className="card baqala-card" onClick={() => { setSelectedBaqala(b); triggerHaptic('light'); }}>
                <h3>{b.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--lux-hint)', marginTop: '5px' }}>
                  {b.distance ? `${b.distance.toFixed(2)} km away` : 'Nearby'}
                </p>
                <div className="btn-secondary" style={{ marginTop: '12px', textAlign: 'center', padding: '8px', fontSize: '13px' }}>
                  Shop Here →
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- HISAAB TAB --- */}
      {currentScreen === 'hisaab' && (
        <>
          <div className="hisaab-card">
            <h2>Hisaab Overview</h2>
            <div style={{ margin: '15px 0' }}>
              <p style={{ color: 'var(--lux-hint)', fontSize: '14px' }}>Active Profile: <strong style={{color: 'var(--lux-text)'}}>{activeProfile.name}</strong></p>
            </div>
            <div className="price-split">
              <div className="price-box">
                <p>Total Debt</p>
                <h3>AED {cashTotal.toFixed(2)}</h3>
              </div>
              <div className="price-box crypto">
                <p>Crypto Value</p>
                <h3>AED {cryptoTotal.toFixed(2)}</h3>
              </div>
            </div>
            <button className="btn-primary" onClick={handleSettle} disabled={cashTotal === 0}>
               {cashTotal === 0 ? "✅ All Settled" : "💳 Settle via Crypto"}
            </button>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '15px' }}>🧾 Unpaid Items</h3>
            <ul className="order-list">
              {activeProfile.unpaidItems.length === 0 ? (
                <p style={{ color: 'var(--lux-hint)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                  You have no pending debts on this profile! 🎉
                </p>
              ) : (
                activeProfile.unpaidItems.map((item, i) => (
                  <li key={i}>
                    <div>
                      <strong style={{color: 'var(--lux-text)'}}>{item.qty || 1}x {item.name}</strong> <br />
                      <span className="badge-crypto" style={{marginTop: '5px', display: 'inline-block'}}>{item.cryptoDiscount}% OFF</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="cash-price">AED {(item.price * (item.qty || 1)).toFixed(2)}</span>
                      <strong className="crypto-price" style={{display: 'block'}}>AED {((item.price * (item.qty || 1)) * (1 - item.cryptoDiscount / 100)).toFixed(2)}</strong>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {/* --- STORES TAB --- */}
      {currentScreen === 'stores' && (
        <>
          <h3 style={{ marginBottom: '15px', color: 'var(--lux-text)' }}>🛍️ All Nearby Stores</h3>
          {nearbyBaqalas.length === 0 ? (
             <p style={{ color: 'var(--lux-hint)', textAlign: 'center', marginTop: '40px' }}>No Baqalas found in your area.</p>
          ) : (
            <div className="baqala-grid">
              {nearbyBaqalas.map(b => (
                <div key={b.id} className="card baqala-card" onClick={() => { setSelectedBaqala(b); triggerHaptic('light'); }}>
                  <h3>{b.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--lux-hint)', marginTop: '5px' }}>
                    {b.distance ? `${b.distance.toFixed(2)} km` : 'Nearby'}
                  </p>
                  <div style={{ marginTop: '15px', textAlign: 'center', padding: '8px', fontSize: '13px' }} className="btn-secondary">
                    Browse Inventory →
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- PROFILE TAB --- */}
      {currentScreen === 'profile' && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>👤 Profiles & Settings</h2>
          
          <p style={{ fontSize: '14px', color: 'var(--lux-hint)', marginBottom: '10px' }}>Select Active Profile:</p>
          <div className="profile-tabs" style={{ marginBottom: '30px' }}>
            {Object.keys(profiles).map(key => (
              <button
                key={key}
                className={`tab-btn ${activeProfileKey === key ? 'active' : ''}`}
                onClick={() => { setActiveProfileKey(key); triggerHaptic('light'); }}
              >
                {profiles[key].name}
              </button>
            ))}
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--lux-border)', margin: '25px 0', opacity: 0.3 }} />
          
          <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Create New Profile</h3>
          <p style={{ fontSize: '13px', color: 'var(--lux-hint)', marginBottom: '15px' }}>
            Separate your Hisaab for kids, business, or family members.
          </p>
          <form onSubmit={handleCreateProfile} className="flex-form">
            <input 
              type="text" 
              placeholder="e.g., Kids Snacks" 
              value={newProfileName} 
              onChange={(e) => setNewProfileName(e.target.value)} 
              required 
            />
            <button type="submit" className="btn-secondary" style={{ width: 'auto' }}>
              + Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
