import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { uploadFile } from '../utils/upload';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, location }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [vendorApps, setVendorApps] = useState([]);
  const [newBaqalaName, setNewBaqalaName] = useState("");
  const [baqalaWallet, setBaqalaWallet] = useState("");
  const [newItem, setNewItem] = useState({ 
    name: '', 
    price: '', 
    cryptoDiscount: 10, 
    image: null 
  });
  const [creditLimitInput, setCreditLimitInput] = useState({});

  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  // Load baqala data
  useEffect(() => {
    if (user) {
      axios.get(`${API_URL}/api/baqala/owner/${user.id}`)
        .then(res => {
          if (res.data?.baqala) {
            setMyBaqala(res.data.baqala);
            setVendorApps(res.data.applications || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const handleRegisterBaqala = async (e) => {
    e.preventDefault();
    triggerHaptic('heavy');
    if (!location) return alert("Please allow location access.");

    try {
      const res = await axios.post(`${API_URL}/api/baqala`, {
        name: newBaqalaName,
        lat: location.lat,
        lng: location.lng,
        ownerId: user.id,
        walletAddress: baqalaWallet
      });
      setMyBaqala(res.data.baqala);
      WebApp?.showAlert ? WebApp.showAlert("Baqala registered!") : alert("Baqala registered!");
    } catch (err) {
      alert("Failed to register baqala.");
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) setNewItem({ ...newItem, image: file });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    triggerHaptic('light');
    if (!myBaqala) return alert("Register your baqala first.");

    let imageUrl = null;
    if (newItem.image) {
      imageUrl = await uploadFile(newItem.image, 'inventory-images').catch(err => {
        console.error(err);
        return null;
      });
    }

    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, {
        name: newItem.name,
        price: newItem.price,
        cryptoDiscount: newItem.cryptoDiscount,
        image_path: imageUrl
      });

      setMyBaqala(prev => ({ ...prev, inventory: res.data.inventory }));
      setNewItem({ name: '', price: '', cryptoDiscount: 10, image: null });
      WebApp?.showAlert ? WebApp.showAlert("Item added successfully!") : alert("Item added!");
    } catch (err) {
      alert("Failed to add item.");
    }
  };

  // Approve application
  const approveApplication = async (appId) => {
    triggerHaptic('medium');
    const limit = creditLimitInput[appId];
    if (!limit) return alert("Set credit limit");

    try {
      await axios.post(`${API_URL}/api/approve`, { appId, limit });
      WebApp?.showAlert(`Approved with AED ${limit} limit!`);
      
      const res = await axios.get(`${API_URL}/api/baqala/owner/${user.id}`);
      setVendorApps(res.data.applications || []);
    } catch (err) {
      alert("Failed to approve.");
    }
  };

  if (!myBaqala) {
    return (
      <div className="card">
        <h2>Register Your Baqala</h2>
        <form onSubmit={handleRegisterBaqala} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Baqala Name" value={newBaqalaName} onChange={e => setNewBaqalaName(e.target.value)} required />
          <input type="text" placeholder="Wallet Address (0x...)" value={baqalaWallet} onChange={e => setBaqalaWallet(e.target.value)} required />
          <button type="submit" className="btn-primary">Register Store</button>
        </form>
      </div>
    );
  }

  return (
    <div className="vendor-dashboard">
      <div className="card" style={{ background: 'var(--shining-gradient)', color: 'white', textAlign: 'center' }}>
        <h2>{myBaqala.name}</h2>
        <p>Store ID: {myBaqala.id}</p>
      </div>

      <button className="btn-primary" onClick={() => alert("Ledger sync coming soon")}>
        ⛓️ Sync Ledger to Blockchain
      </button>

      {/* Pending Applications */}
      {vendorApps.filter(a => a.status === 'pending').length > 0 && (
        <div className="card">
          <h3>Pending Hisaab Applications</h3>
          {vendorApps.filter(a => a.status === 'pending').map(app => (
            <div key={app.id} style={{ marginBottom: '15px' }}>
              <strong>{app.userName || 'Customer'}</strong> wants Hisaab
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <input 
                  type="number" 
                  placeholder="Limit (AED)" 
                  onChange={(e) => setCreditLimitInput({ ...creditLimitInput, [app.id]: e.target.value })}
                />
                <button className="btn-primary" onClick={() => approveApplication(app.id)}>Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item with Photo */}
      <div className="card">
        <h3>Add New Item to Inventory</h3>
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
          <input type="number" placeholder="Price (AED)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
          <input type="number" placeholder="Crypto Discount %" value={newItem.cryptoDiscount} onChange={e => setNewItem({...newItem, cryptoDiscount: e.target.value})} />
          <input type="file" accept="image/*" onChange={handleImageSelect} />
          <button type="submit" className="btn-secondary">Add Item with Photo</button>
        </form>
      </div>

      {/* Current Inventory */}
      <div className="card">
        <h3>Current Inventory</h3>
        {myBaqala.inventory?.length === 0 ? (
          <p>No items yet.</p>
        ) : (
          <ul className="order-list">
            {myBaqala.inventory.map(item => (
              <li key={item.id}>
                {item.name} — AED {item.price} 
                <span className="badge-crypto"> {item.crypto_discount}% OFF</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
