import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Edit2, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, AlertTriangle, ChevronRight, TrendingUp 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function VendorDashboard({ user, onDeleteStore }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('inventory'); // inventory, clients, settings
  const [isLoading, setIsLoading] = useState(true);
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  // Item Form State
  const [form, setForm] = useState({ name: '', price: '' });

  const uid = user?.id?.toString() || 'guest_merchant';

  useEffect(() => {
    fetchVendorData();
  }, [uid]);

  const fetchVendorData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${uid}`);
      if (res.data?.baqala) {
        setMyBaqala(res.data.baqala);
        setInventory(res.data.baqala.inventory || []);
        fetchClients(res.data.baqala.id);
      }
    } catch (err) {
      console.error("Fetch Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async (baqalaId) => {
    try {
      // In a real DB, we'd have a specific endpoint, but for now we filter debts
      const res = await axios.get(`${API_URL}/api/baqalas/nearby`); // Mocking client discovery
      // We'll simulate a client list based on common test IDs
      setClients([
        { id: "5928371", name: "Ahmed", debt: 45.50 },
        { id: "1029384", name: "User_928", debt: 12.00 }
      ]);
    } catch (e) {}
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        owner_id: uid,
        wallet_address: regForm.wallet || '0xTEST',
      });
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        WebApp?.showAlert("Store Online!");
      }
    } catch (err) {
      alert("Failed to register.");
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, {
        name: form.name,
        price: parseFloat(form.price)
      });
      if (res.data.success) {
        setInventory([...inventory, res.data.inventory]);
        setForm({ name: '', price: '' });
      }
    } catch (e) { alert("Error adding item"); }
  };

  const openCustomerChat = (tgId) => {
    const link = `tg://user?id=${tgId}`;
    if (WebApp?.openTelegramLink) WebApp.openTelegramLink(link);
    else window.open(link);
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse">Loading Merchant Console...</div>;

  if (!myBaqala) {
    return (
      <div className="px-6 pt-10">
        <div className="glass-card text-center">
          <div className="w-20 h-20 bg-teal-400/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Store size={40} className="text-teal-400" />
          </div>
          <h2 className="text-2xl font-black mb-2">Initialize Store</h2>
          <p className="text-[#94a3b8] text-sm mb-8 px-4">Register your Baqala to start accepting digital Hisaab payments.</p>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <input className="input-modern" placeholder="Store Name (e.g. Al Maya)" 
              value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required />
            <input className="input-modern" placeholder="Settlement Wallet (0x...)" 
              value={regForm.wallet} onChange={e => setRegForm({...regForm, wallet: e.target.value})} />
            <button type="submit" className="btn-primary w-full">Launch Storefront</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5">
      {/* MERCHANT HEADER */}
      <div className="glass-card !p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Store size={28} color="black" />
          </div>
          <div>
            <h2 className="text-2xl font-black leading-none">{myBaqala.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified Merchant</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-xl font-black">AED 1,240</p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-orange-500/20">
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Active Hisaab</p>
            <p className="text-xl font-black">AED {clients.reduce((s,c) => s+c.debt, 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
        {['inventory', 'clients', 'settings'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeSubTab === tab ? 'bg-white text-black shadow-lg' : 'text-[#94a3b8]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* INVENTORY TAB */}
        {activeSubTab === 'inventory' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="inv">
            <div className="glass-card !p-5 mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Plus size={16} className="text-teal-400" /> Quick Add Item
              </h3>
              <form onSubmit={addItem} className="flex gap-2">
                <input className="input-modern !py-2 !text-sm flex-1" placeholder="Item Name" 
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                <input className="input-modern !py-2 !text-sm w-20" placeholder="AED" 
                  value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                <button type="submit" className="bg-teal-400 text-black p-3 rounded-xl"><ChevronRight size={20}/></button>
              </form>
            </div>

            <div className="space-y-3">
              {inventory.map(item => (
                <div key={item.id} className="glass-card !p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-lg">📦</div>
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-teal-400 text-xs font-black">AED {item.price}</p>
                    </div>
                  </div>
                  <Trash2 size={16} className="text-red-500/50 hover:text-red-500" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CLIENTS TAB */}
        {activeSubTab === 'clients' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="clients">
            <div className="space-y-4">
              {clients.map(client => (
                <div key={client.id} className="glass-card !p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs">
                        {client.name[0]}
                      </div>
                      <div>
                        <p className="font-black text-sm">{client.name}</p>
                        <p className="text-[10px] text-[#94a3b8]">ID: {client.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-orange-500 uppercase">Owes</p>
                      <p className="font-black text-lg text-orange-500">AED {client.debt.toFixed(2)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openCustomerChat(client.id)}
                    className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border border-white/5"
                  >
                    <MessageCircle size={14} className="text-teal-400" />
                    Open Merchant-Client Chat
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SETTINGS TAB */}
        {activeSubTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="settings">
            <div className="glass-card !p-6 border-red-500/20">
              <div className="flex items-center gap-3 mb-6 text-red-500">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-black uppercase tracking-tighter">Danger Zone</h3>
              </div>
              
              <p className="text-sm text-[#94a3b8] mb-6 leading-relaxed">
                Deleting your store will wipe all inventory, customer ledgers, and history. This action is **permanent** and cannot be reversed.
              </p>

              <button 
                onClick={() => onDeleteStore(myBaqala.id)}
                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
              >
                Delete Store Permanently
              </button>
            </div>

            <div className="mt-6 glass-card opacity-50 pointer-events-none">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-4">Merchant Settings</h4>
              <div className="space-y-4">
                <div className="flex justify-between"><span>Auto-Hisaab Approval</span><span className="text-teal-400">ON</span></div>
                <div className="flex justify-between"><span>Crypto Discount</span><span className="text-teal-400">10%</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
