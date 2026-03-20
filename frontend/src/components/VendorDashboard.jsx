import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "${API_URL}";
export default function VendorDashboard({ user, location }) {
  const[myBaqala, setMyBaqala] = useState(null);
  const [vendorApps, setVendorApps] = useState([]);
  const [newBaqalaName, setNewBaqalaName] = useState("");
  const[baqalaWallet, setBaqalaWallet] = useState("");
  const [newItem, setNewItem] = useState({ name: '', price: '', cryptoDiscount: 10 });
  const [creditLimitInput, setCreditLimitInput] = useState({});

  useEffect(() => {
    if (user) {
      axios.get(`${API_URL}/api/baqala/owner/${user.id}`).then(res => {
        if (res.data) {
          setMyBaqala(res.data.baqala);
          setVendorApps(res.data.applications ||[]);
        }
      }).catch(console.error);
    }
  }, [user]);

  const handleRegisterBaqala = async (e) => {
    e.preventDefault();
    if (!location) return alert("Please allow location access to register a Baqala.");
    const res = await axios.post(`${API_URL}/api/baqala`, {
      name: newBaqalaName, lat: location.lat, lng: location.lng, ownerId: user.id, walletAddress: baqalaWallet
    });
    setMyBaqala(res.data.baqala);
    setVendorApps([]);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, newItem);
    setMyBaqala({ ...myBaqala, inventory: res.data.inventory });
    setNewItem({ name: '', price: '', cryptoDiscount: 10 });
  };

  const approveApplication = async (appId) => {
    const limit = creditLimitInput[appId];
    if (!limit || limit <= 0) return alert("Please set a valid credit limit.");
    await axios.post(`${API_URL}/api/approve`, { appId, limit });
    alert(`Approved with AED ${limit} limit!`);
    const vendorRes = await axios.get(`${API_URL}/api/baqala/owner/${user.id}`);
    setVendorApps(vendorRes.data.applications);
  };

  const handleSyncLedger = async () => {
    await axios.post('${API_URL}/api/sync-ledger', { baqalaId: myBaqala.id });
    const msg = "Daily Ledger successfully synced to the Blockchain!";
    WebApp?.isVersionAtLeast && WebApp.isVersionAtLeast('6.2') ? WebApp.showAlert(msg) : alert(msg);
  };

  if (!myBaqala) {
    return (
      <div className="card">
        <h2>Register Your Baqala</h2>
        <form onSubmit={handleRegisterBaqala} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <input type="text" placeholder="Baqala Name" value={newBaqalaName} onChange={e => setNewBaqalaName(e.target.value)} required style={{padding: '10px', border: '1px solid #d1fae5', borderRadius: '10px'}}/>
          <input type="text" placeholder="Web3 Wallet Address (0x...)" value={baqalaWallet} onChange={e => setBaqalaWallet(e.target.value)} required style={{padding: '10px', border: '1px solid #d1fae5', borderRadius: '10px'}}/>
          <button type="submit" className="btn-primary">Register Store</button>
        </form>
      </div>
    );
  }

  return (
    <div className="vendor-dashboard">
      <h2>🏪 {myBaqala.name} Dashboard</h2>
      <p style={{ fontSize: '12px', wordBreak: 'break-all', marginBottom: '15px' }}>Wallet: {myBaqala.walletAddress || 'Not set'}</p>

      <button className="btn-primary mb-15" onClick={handleSyncLedger} style={{background: '#064e3b'}}>
        ⛓️ Sync Daily Ledger to Blockchain
      </button>

      {vendorApps.filter(a => a.status === 'pending').length > 0 && (
        <div className="card" style={{ border: '2px solid #f59e0b' }}>
          <h3 style={{ color: '#f59e0b' }}>Pending Applications</h3>
          <ul className="order-list">
            {vendorApps.filter(a => a.status === 'pending').map(app => (
              <li key={app.id} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <strong>{app.userName}</strong> wants Hisaab.
                <div className="flex-form" style={{ width: '100%', marginTop: '10px' }}>
                  <input type="number" placeholder="Limit (AED)" style={{flex: 1, padding: '8px', border: '1px solid #d1fae5', borderRadius: '10px'}} onChange={(e) => setCreditLimitInput({ ...creditLimitInput, [app.id]: e.target.value })} />
                  <button className="btn-secondary" style={{padding: '8px 16px'}} onClick={() => approveApplication(app.id)}>Approve</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Add to Inventory</h3>
        <form onSubmit={handleAddItem} className="inventory-form" style={{marginTop: '15px'}}>
          <input type="text" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
          <input type="number" placeholder="Price (AED)" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} required />
          <input type="number" placeholder="Crypto Discount %" value={newItem.cryptoDiscount} onChange={e => setNewItem({ ...newItem, cryptoDiscount: e.target.value })} required />
          <button type="submit" className="btn-secondary" style={{padding: '12px'}}>Add Item</button>
        </form>
      </div>

      <div className="card">
        <h3>Current Inventory</h3>
        <ul className="order-list">
          {myBaqala.inventory.length === 0 ? <p style={{opacity: 0.5}}>No items added yet.</p> : myBaqala.inventory.map(item => (
            <li key={item.id}>
              <span>{item.name} <br/><small style={{opacity: 0.6}}>AED {item.price}</small></span>
              <span className="badge-crypto">{item.cryptoDiscount}% Crypto Off</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
