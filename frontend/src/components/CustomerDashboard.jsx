import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { uploadFile } from '../utils/upload';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function CustomerDashboard({
  user,
  location,
  walletAddress,
  connectWallet,
  profiles,
  setProfiles,
  currentScreen,
  setCurrentScreen
}) {
  const [activeProfileKey, setActiveProfileKey] = useState('main');
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [cart, setCart] = useState([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);

  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // Fetch nearby baqalas
  useEffect(() => {
    const fetchBaqalas = async () => {
      try {
        const url = location
          ? `${API_URL}/api/baqalas/nearby?lat=${location.lat}&lng=${location.lng}`
          : `${API_URL}/api/baqalas/nearby`;
        const res = await axios.get(url);
        setNearbyBaqalas(res.data || []);
      } catch (err) {
        console.error("Failed to fetch baqalas:", err);
      }
    };
    fetchBaqalas();
  }, [location]);

  // Settle with Crypto + Screenshot Upload
  const handleSettle = async () => {
    triggerHaptic('heavy');
    if (!walletAddress) return connectWallet();

    const activeProfile = profiles[activeProfileKey] || { unpaidItems: [] };
    let cryptoTotal = 0;

    activeProfile.unpaidItems.forEach(item => {
      const itemTotal = (item.price || 0) * (item.qty || 1);
      cryptoTotal += itemTotal * (1 - (item.cryptoDiscount || 10) / 100);
    });

    setIsLoading(true);

    try {
      const ethAmount = (cryptoTotal * 0.0001).toFixed(6);
      const targetBaqalaWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: targetBaqalaWallet,
        value: ethers.parseEther(ethAmount)
      });

      // Upload screenshot if selected
      let screenshotUrl = null;
      if (paymentScreenshot) {
        screenshotUrl = await uploadFile(paymentScreenshot, 'payment-screenshots');
      }

      // Save settlement
      await axios.post(`${API_URL}/api/hisaab/${user.id}/settle`, {
        profileKey: activeProfileKey,
        screenshot_path: screenshotUrl,
        amount: cryptoTotal,
        tx_hash: tx.hash
      });

      // Clear local state
      setProfiles(prev => ({
        ...prev,
        [activeProfileKey]: { ...prev[activeProfileKey], unpaidItems: [], debt: 0 }
      }));

      setPaymentScreenshot(null);

      const msg = `✅ Payment successful!\nPaid ${ethAmount} ETH (~AED ${cryptoTotal.toFixed(2)})`;
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);

    } catch (error) {
      console.error(error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => {
    triggerHaptic('heavy');
    if (WebApp?.showScanQrPopup) {
      WebApp.showScanQrPopup({ text: "Scan Baqala QR Code" }, (text) => {
        WebApp.showAlert(`Scanned: ${text}`);
        return true;
      });
    } else {
      alert("QR Scanner only available in Telegram mobile.");
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

      setProfiles(res.data.user?.profiles || profiles);
      setCart([]);
      setSelectedBaqala(null);
      setCurrentScreen('hisaab');

      WebApp?.showAlert ? WebApp.showAlert("✅ Items added to Hisaab!") : alert("Items added to Hisaab!");
    } catch (e) {
      alert(e.response?.data?.error || "Error adding items.");
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    triggerHaptic('medium');

    try {
      const res = await axios.post(`${API_URL}/api/hisaab/${user.id}/profile`, { name: newProfileName });
      setProfiles(res.data.profiles || profiles);
      setNewProfileName("");
      const newKey = newProfileName.toLowerCase().replace(/\s+/g, '_');
      setActiveProfileKey(newKey);
    } catch (e) {
      alert("Failed to create profile.");
    }
  };

  const activeProfile = profiles[activeProfileKey] || { name: 'Main', unpaidItems: [] };
  let cashTotal = 0;
  let cryptoTotal = 0;

  activeProfile.unpaidItems.forEach(item => {
    const itemTotal = (item.price || 0) * (item.qty || 1);
    cashTotal += itemTotal;
    cryptoTotal += itemTotal * (1 - (item.cryptoDiscount || 10) / 100);
  });

  // Storefront View
  if (selectedBaqala) {
    return (
      <div className="storefront">
        <button className="btn-text mb-15" onClick={() => { setSelectedBaqala(null); setCart([]); }}>
          ⬅ Back to Stores
        </button>

        <div className="store-header card" style={{ background: 'var(--shining-gradient)', color: 'white', textAlign: 'center' }}>
          <h2>{selectedBaqala.name}</h2>
          <p>Shopping for <strong>{activeProfile.name}</strong></p>
        </div>

        <div className="inventory-grid">
          {selectedBaqala.inventory?.length === 0 ? (
            <p>No items available yet.</p>
          ) : selectedBaqala.inventory.map(item => (
            <div key={item.id} className="card item-card">
              <h4>{item.name}</h4>
              <p className="cash-price">AED {item.price}</p>
              <p className="crypto-price">AED {(item.price * (1 - (item.crypto_discount || 10) / 100)).toFixed(2)}</p>
              <span className="discount-tag">{item.crypto_discount}% OFF</span>
              <button className="btn-secondary mt-15" onClick={() => addToCart(item)}>
                + Add to Cart
              </button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="floating-cart card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>🛒 Cart ({cart.reduce((acc, i) => acc + (i.qty || 1), 0)} items)</h3>
              <h3 style={{ color: 'var(--logo-orange)' }}>
                AED {cart.reduce((acc, i) => acc + (i.price * (i.qty || 1)), 0).toFixed(2)}
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

  // Main Dashboard
  return (
    <div className="customer-dashboard">

      {/* HOME TAB */}
      {currentScreen === 'home' && (
        <>
          <div className="hisaab-card">
            <h2>{activeProfile.name}'s Hisaab</h2>
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
            <button 
              className="btn-primary" 
              onClick={handleSettle} 
              disabled={isLoading || cashTotal === 0}
            >
              {isLoading ? "Processing..." : cashTotal === 0 ? "✅ All Settled" : "💳 Pay with Crypto"}
            </button>
          </div>

          {/* Payment Screenshot Upload */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Upload Payment Screenshot (Optional)</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setPaymentScreenshot(e.target.files[0])} 
            />
            {paymentScreenshot && <p style={{ color: 'var(--logo-teal)', marginTop: '8px' }}>✅ Screenshot ready</p>}
          </div>

          <button className="btn-secondary" onClick={handleScanQR} style={{ width: '100%', margin: '15px 0' }}>
            📷 Scan Baqala QR
          </button>

          <h3>Nearby Baqalas</h3>
          <div className="baqala-grid">
            {nearbyBaqalas.slice(0, 4).map(b => (
              <div key={b.id} className="card baqala-card" onClick={() => { setSelectedBaqala(b); triggerHaptic('light'); }}>
                <h3>{b.name}</h3>
                <p>{b.distance ? `${b.distance.toFixed(2)} km away` : ''}</p>
                <div className="btn-secondary" style={{ marginTop: '12px', textAlign: 'center' }}>
                  Shop Here →
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* HISAAB TAB */}
      {currentScreen === 'hisaab' && (
        <div className="hisaab-card">
          <h2>Hisaab Overview</h2>
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
        </div>
      )}

      {/* STORES TAB */}
      {currentScreen === 'stores' && (
        <>
          <h3>All Nearby Stores</h3>
          <div className="baqala-grid">
            {nearbyBaqalas.map(b => (
              <div key={b.id} className="card baqala-card" onClick={() => { setSelectedBaqala(b); triggerHaptic('light'); }}>
                <h3>{b.name}</h3>
                <p>{b.distance ? `${b.distance.toFixed(2)} km` : ''}</p>
                <div className="btn-secondary" style={{ marginTop: '15px', textAlign: 'center' }}>
                  Browse →
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PROFILE TAB */}
      {currentScreen === 'profile' && (
        <div className="card">
          <h2>👤 Profiles</h2>
          <div className="profile-tabs">
            {Object.keys(profiles).map(key => (
              <button
                key={key}
                className={`tab-btn ${activeProfileKey === key ? 'active' : ''}`}
                onClick={() => setActiveProfileKey(key)}
              >
                {profiles[key].name}
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateProfile} style={{ marginTop: '20px' }}>
            <input
              type="text"
              placeholder="New Profile Name"
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              required
            />
            <button type="submit" className="btn-secondary">Create Profile</button>
          </form>
        </div>
      )}
    </div>
  );
}
