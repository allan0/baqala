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

  // Enhanced Settle with Screenshot Upload
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
      // 1. Send Crypto Transaction
      const ethAmount = (cryptoTotal * 0.0001).toFixed(6);
      const targetBaqalaWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: targetBaqalaWallet,
        value: ethers.parseEther(ethAmount)
      });

      // 2. Upload screenshot if user selected one
      let screenshotUrl = null;
      if (paymentScreenshot) {
        screenshotUrl = await uploadFile(paymentScreenshot, 'payment-screenshots');
      }

      // 3. Record payment on backend
      await axios.post(`${API_URL}/api/hisaab/${user.id}/settle`, { 
        profileKey: activeProfileKey,
        screenshot_path: screenshotUrl,
        amount: cryptoTotal,
        tx_hash: tx.hash
      });

      // 4. Clear local hisaab
      setProfiles(prev => ({
        ...prev,
        [activeProfileKey]: { ...prev[activeProfileKey], unpaidItems: [], debt: 0 }
      }));

      setPaymentScreenshot(null);

      const msg = `✅ Payment successful!\nPaid ${ethAmount} ETH (~AED ${cryptoTotal.toFixed(2)})`;
      WebApp?.showAlert ? WebApp.showAlert(msg) : alert(msg);

    } catch (error) {
      console.error("Settle failed:", error);
      const errorMsg = error.message || "Payment failed. Please try again.";
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => {
    triggerHaptic('heavy');
    if (WebApp?.showScanQrPopup) {
      WebApp.showScanQrPopup({ text: "Scan Baqala QR" }, (text) => {
        WebApp.showAlert(`Scanned: ${text}`);
        return true;
      });
    } else {
      alert("QR Scanner only available in Telegram mobile app.");
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

      WebApp?.showAlert ? WebApp.showAlert("✅ Added to Hisaab!") : alert("Added to Hisaab!");
    } catch (e) {
      alert(e.response?.data?.error || "Failed to add items.");
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

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

  // Storefront
  if (selectedBaqala) {
    return (
      <div className="storefront">
        <button className="btn-text mb-15" onClick={() => { setSelectedBaqala(null); setCart([]); }}>
          ⬅ Back
        </button>

        <div className="store-header card" style={{ background: 'var(--shining-gradient)', color: 'white' }}>
          <h2>{selectedBaqala.name}</h2>
        </div>

        <div className="inventory-grid">
          {selectedBaqala.inventory?.map(item => (
            <div key={item.id} className="card item-card">
              <h4>{item.name}</h4>
              <p className="cash-price">AED {item.price}</p>
              <p className="crypto-price">AED {(item.price * (1 - (item.crypto_discount || 10) / 100)).toFixed(2)}</p>
              <button className="btn-secondary mt-15" onClick={() => addToCart(item)}>
                + Add
              </button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="floating-cart card">
            <h3>Cart ({cart.reduce((acc, i) => acc + i.qty, 0)})</h3>
            <button className="btn-primary" onClick={checkoutCart}>
              Put on Hisaab
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {currentScreen === 'home' && (
        <>
          <div className="hisaab-card">
            <h2>{activeProfile.name}'s Hisaab</h2>
            <div className="price-split">
              <div className="price-box">
                <p>Cash</p>
                <h3>AED {cashTotal.toFixed(2)}</h3>
              </div>
              <div className="price-box crypto">
                <p>Crypto</p>
                <h3>AED {cryptoTotal.toFixed(2)}</h3>
              </div>
            </div>
            <button className="btn-primary" onClick={handleSettle} disabled={isLoading || cashTotal === 0}>
              {isLoading ? "Processing..." : cashTotal === 0 ? "✅ Settled" : "💳 Pay with Crypto"}
            </button>
          </div>

          {/* Payment Screenshot Upload */}
          <div className="card" style={{ marginTop: '15px' }}>
            <h3>Upload Payment Screenshot (Optional)</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setPaymentScreenshot(e.target.files[0])} 
            />
          </div>

          <button className="btn-secondary" onClick={handleScanQR} style={{ width: '100%', margin: '15px 0' }}>
            📷 Scan Baqala QR
          </button>

          <h3>Nearby Baqalas</h3>
          <div className="baqala-grid">
            {nearbyBaqalas.slice(0, 4).map(b => (
              <div key={b.id} className="card baqala-card" onClick={() => setSelectedBaqala(b)}>
                <h3>{b.name}</h3>
                <p>{b.distance ? `${b.distance.toFixed(2)} km` : ''}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {currentScreen === 'hisaab' && (
        <div className="hisaab-card">
          <h2>Hisaab Overview</h2>
          <div className="price-split">
            <div className="price-box">
              <p>Total Debt</p>
              <h3>AED {cashTotal.toFixed(2)}</h3>
            </div>
            <div className="price-box crypto">
              <p>Crypto</p>
              <h3>AED {cryptoTotal.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'profile' && (
        <div className="card">
          <h2>Manage Profiles</h2>
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

          <form onSubmit={handleCreateProfile}>
            <input 
              type="text" 
              placeholder="New Profile Name" 
              value={newProfileName} 
              onChange={e => setNewProfileName(e.target.value)} 
            />
            <button type="submit" className="btn-secondary">Create Profile</button>
          </form>
        </div>
      )}
    </div>
  );
}
