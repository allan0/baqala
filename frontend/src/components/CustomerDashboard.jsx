import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function CustomerDashboard({ user, profiles, setProfiles, walletAddress, connectWallet, nearbyBaqalas }) {
  const[activeProfileKey, setActiveProfileKey] = useState('main');
  const[selectedBaqala, setSelectedBaqala] = useState(null);
  const [cart, setCart] = useState([]);

  // Trigger Phone Vibrations
  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleSettle = async (cryptoTotalAED) => {
    triggerHaptic('heavy');
    if (!walletAddress) return connectWallet();
    if (!window.ethereum) return alert("No Web3 wallet detected.");

    try {
      const ethAmount = (cryptoTotalAED * 0.0001).toFixed(6);
      const targetBaqalaWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; 

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: targetBaqalaWallet, 
        value: ethers.parseEther(ethAmount.toString()) 
      });

      await axios.post(`${API_URL}/api/hisaab/${user.id}/settle`, { profileKey: activeProfileKey });
      setProfiles(prev => ({ ...prev, [activeProfileKey]: { ...prev[activeProfileKey], unpaidItems:[], debt: 0 } }));

      const successMsg = `Paid ${ethAmount} ETH (AED ${cryptoTotalAED.toFixed(2)}). Tx: ${tx.hash.substring(0, 10)}...`;
      WebApp?.isVersionAtLeast && WebApp.isVersionAtLeast('6.2') ? WebApp.showAlert(successMsg) : alert(successMsg);
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
        return true; // Closes the scanner
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
    if (cart.length === 0) return;
    triggerHaptic('medium');
    try {
      const payload = { profileKey: activeProfileKey, items: cart.map(i => ({...i, baqalaId: selectedBaqala.id})), baqalaId: selectedBaqala.id };
      const res = await axios.post(`${API_URL}/api/hisaab/${user.id}/buy`, payload);
      setProfiles(res.data.user.profiles);
      setCart([]);
      setSelectedBaqala(null);
      if (WebApp?.isVersionAtLeast && WebApp.isVersionAtLeast('6.2')) {
        WebApp.showAlert("Items added to your Hisaab successfully!");
      } else {
        alert("Items added to your Hisaab successfully!");
      }
    } catch (e) {
      alert(e.response?.data?.error || "Error purchasing items.");
    }
  };

  const activeProfile = profiles[activeProfileKey] || { name: 'Loading...', unpaidItems:[], debt: 0 };
  
  let cashTotal = 0;
  let cryptoTotal = 0;
  activeProfile.unpaidItems.forEach(item => {
    const itemTotal = item.price * (item.qty || 1);
    cashTotal += itemTotal;
    cryptoTotal += (itemTotal * (1 - (item.cryptoDiscount || 10) / 100));
  });

  return (
    <div className="customer-dashboard">
      <div className="profile-tabs">
        {Object.entries(profiles).map(([key, p]) => (
          <button key={key} className={`tab-btn ${activeProfileKey === key ? 'active' : ''}`} onClick={() => { setActiveProfileKey(key); triggerHaptic('light'); }}>
            {p.name}
          </button>
        ))}
      </div>

      {!selectedBaqala && (
        <>
          <div className="hisaab-card">
            <h2>{activeProfile.name}'s Hisaab</h2>
            <div className="price-split">
              <div className="price-box cash">
                <p>Cash Total</p>
                <h3>AED {cashTotal.toFixed(2)}</h3>
              </div>
              <div className="price-box crypto">
                <p>Crypto Total</p>
                <h3>AED {cryptoTotal.toFixed(2)}</h3>
              </div>
            </div>
            <button className="btn-primary mt-15" onClick={() => handleSettle(cryptoTotal)} disabled={cashTotal === 0}>
              {cashTotal === 0 ? "✅ All Settled" : walletAddress ? `💳 Pay ETH Equivalent` : "🔐 Connect Wallet"}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className="btn-secondary" onClick={handleScanQR} style={{ flex: 1, backgroundColor: '#064e3b', color: '#fff' }}>
              📷 Scan Baqala QR
            </button>
          </div>

          <h2 className="mt-15" style={{ marginBottom: '15px' }}>📍 Nearby Baqalas</h2>
          <div className="baqala-grid">
            {nearbyBaqalas.map(b => (
              <div key={b.id} className="card baqala-card" onClick={() => { setSelectedBaqala(b); triggerHaptic('light'); }}>
                <h3>{b.name}</h3>
                <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '10px' }}>
                  {b.distance ? `${b.distance.toFixed(2)} km away` : 'Distance unknown'}
                </p>
                <span className="btn-secondary" style={{ fontSize: '14px', textAlign:'center', padding:'8px' }}>Shop Here &gt;</span>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedBaqala && (
        <div className="storefront">
          <button className="btn-text mb-15" onClick={() => { setSelectedBaqala(null); setCart([]); triggerHaptic('light'); }}>
            ⬅ Back to Dashboard
          </button>
          
          <div className="store-header card" style={{ background: 'var(--primary-btn)', color: 'white' }}>
            <h2>{selectedBaqala.name}</h2>
            <p style={{ opacity: 0.9 }}>Buying for: <strong>{activeProfile.name}</strong></p>
          </div>

          <div className="inventory-grid mb-15">
            {selectedBaqala.inventory.length === 0 ? <p>No items available.</p> : selectedBaqala.inventory.map(item => (
              <div key={item.id} className="card item-card">
                <h4 style={{ marginBottom: '5px' }}>{item.name}</h4>
                <p className="cash-price">AED {item.price}</p>
                <p className="crypto-price">AED {(item.price * (1 - item.cryptoDiscount/100)).toFixed(2)}</p>
                <span className="discount-tag">{item.cryptoDiscount}% OFF</span>
                <button className="btn-secondary mt-15" onClick={() => addToCart(item)} style={{ padding: '8px' }}>
                  + Add
                </button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="floating-cart card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>🛒 Cart ({cart.reduce((acc, i) => acc + i.qty, 0)} items)</h3>
                <h3 style={{ color: 'var(--primary-btn)' }}>
                  AED {cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2)}
                </h3>
              </div>
              <button className="btn-primary" onClick={checkoutCart}>
                Put on Hisaab
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
