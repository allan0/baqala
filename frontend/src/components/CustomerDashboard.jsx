import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "${API_URL}";
export default function CustomerDashboard({ user, profiles, setProfiles, walletAddress, connectWallet, nearbyBaqalas }) {
  const[activeProfileKey, setActiveProfileKey] = useState('main');

  const handleSettle = async (cryptoTotalAED) => {
    if (!walletAddress) return connectWallet();
    if (!window.ethereum) return alert("No Web3 wallet detected.");

    try {
      // DYNAMIC CONVERSION: Convert AED to ETH (Mock rate: 1 AED = 0.0001 ETH)
      const ethAmount = (cryptoTotalAED * 0.0001).toFixed(6);
      
      // We route the payment to a dummy address for testing, 
      // but in production this would be: targetBaqalaWallet = myBaqala.walletAddress
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
          <button key={key} className={`tab-btn ${activeProfileKey === key ? 'active' : ''}`} onClick={() => setActiveProfileKey(key)}>
            {p.name}
          </button>
        ))}
      </div>

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
      
      <div className="card">
        <h3>Unpaid Items</h3>
        <ul className="order-list">
          {activeProfile.unpaidItems.length === 0 ? <p style={{ opacity: 0.5 }}>No unpaid items.</p> : activeProfile.unpaidItems.map((item, i) => (
            <li key={i}>
              <div>
                <strong>{item.qty || 1}x {item.name}</strong> <br />
                <small style={{ color: 'green' }}>{item.cryptoDiscount}% Crypto Discount</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>AED {((item.price * (item.qty || 1)) * (1 - item.cryptoDiscount / 100)).toFixed(2)}</strong>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
