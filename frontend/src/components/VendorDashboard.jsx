import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Edit2, Trash2, RefreshCw, Package } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WebApp = window.Telegram?.WebApp;

export default function VendorDashboard({ user }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', price: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });

  const uid = user?.id?.toString() || localStorage.getItem('baqala_guest_id') || 'guest_' + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${uid}`);
      if (res.data?.baqala) {
        setMyBaqala(res.data.baqala);
        setInventory(res.data.baqala.inventory || []);
      }
    } catch (err) {
      console.error("Fetch vendor data failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name) return;

    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        owner_id: uid,
        wallet_address: regForm.wallet || '0xTEST',
        lat: 25.20,
        lng: 55.27
      });
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        WebApp?.showAlert("Store registered successfully!");
      }
    } catch (err) {
      WebApp?.showAlert("Registration failed: " + err.message);
    }
  };

  const addOrUpdateItem = async (e) => {
    e.preventDefault();
    if (!myBaqala || !form.name || !form.price) return;

    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum)) return WebApp?.showAlert("Invalid price");

    try {
      if (editingItem) {
        // TODO: Implement PUT endpoint later for real edit
        WebApp?.showAlert("Edit functionality coming soon");
      } else {
        const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, {
          name: form.name,
          price: priceNum
        });
        if (res.data.success) {
          setInventory([...inventory, res.data.inventory]);
          setForm({ name: '', price: '' });
          WebApp?.HapticFeedback?.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error(err);
      WebApp?.showAlert("Failed to add item");
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm("Delete this item permanently?")) return;

    try {
      // TODO: Add DELETE endpoint in backend later
      setInventory(inventory.filter(i => i.id !== itemId));
      WebApp?.HapticFeedback?.impactOccurred('medium');
    } catch (err) {
      WebApp?.showAlert("Delete failed");
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, price: item.price });
  };

  if (isLoading) {
    return (
      <div className="app-container flex items-center justify-center h-96">
        <RefreshCw className="animate-spin" size={32} />
      </div>
    );
  }

  if (!myBaqala) {
    return (
      <div className="app-container">
        <div className="glass-card mt-12 text-center">
          <Store size={48} className="mx-auto mb-6 text-[#00f5d4]" />
          <h2 className="text-2xl font-bold mb-2">Open Your Store</h2>
          <p className="text-[#94a3b8] mb-8">Register your baqala to start managing inventory</p>
          
          <form onSubmit={handleRegister} className="space-y-5">
            <input
              className="input-modern w-full"
              placeholder="Baqala Name"
              value={regForm.name}
              onChange={e => setRegForm({ ...regForm, name: e.target.value })}
              required
            />
            <input
              className="input-modern w-full"
              placeholder="Wallet Address (optional)"
              value={regForm.wallet}
              onChange={e => setRegForm({ ...regForm, wallet: e.target.value })}
            />
            <button type="submit" className="btn-primary w-full py-4 text-lg">
              Register Store
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="glass-card mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#00f5d4] to-[#ff5e00] rounded-2xl flex items-center justify-center">
            <Store size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-bold">{myBaqala.name}</h2>
            <p className="text-[#00f5d4] text-sm">Your Store • {inventory.length} items listed</p>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Form */}
      <div className="glass-card mb-10">
        <h3 className="font-semibold text-xl mb-5 flex items-center gap-3">
          <Package size={24} /> {editingItem ? 'Edit Item' : 'Add New Product'}
        </h3>
        <form onSubmit={addOrUpdateItem} className="space-y-5">
          <input
            className="input-modern w-full"
            placeholder="Item name (e.g. Al Ain Water)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input-modern w-full"
            type="number"
            step="0.01"
            placeholder="Price in AED"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary w-full py-4 text-lg">
            {editingItem ? 'Update Item' : 'Add to Inventory'}
          </button>
        </form>
      </div>

      {/* Inventory Grid */}
      <div>
        <h3 className="text-sm font-bold tracking-widest text-[#94a3b8] mb-5">INVENTORY ({inventory.length})</h3>
        
        {inventory.length === 0 ? (
          <div className="glass-card text-center py-20">
            <Package size={48} className="mx-auto mb-6 text-[#94a3b8]" />
            <p className="text-xl">No items yet</p>
            <p className="text-[#94a3b8]">Add your first product above</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {inventory.map((item) => (
              <motion.div 
                key={item.id} 
                className="glass-card overflow-hidden"
                whileHover={{ scale: 1.03 }}
              >
                <img 
                  src={`https://picsum.photos/id/${item.id % 100 + 10}/400/280`} 
                  alt={item.name}
                  className="w-full h-40 object-cover"
                />
                <div className="p-5">
                  <h4 className="font-semibold line-clamp-2 min-h-[48px]">{item.name}</h4>
                  <p className="text-2xl font-bold text-[#00f5d4] mt-3">
                    AED {parseFloat(item.price).toFixed(2)}
                  </p>

                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => startEdit(item)}
                      className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="flex-1 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
