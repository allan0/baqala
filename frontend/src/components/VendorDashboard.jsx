// ================================================
// frontend/src/components/VendorDashboard.jsx
// VERSION 4.0 (Fixed Listing + Merchant Tokenomics)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, TrendingUp, 
  Check, X, UserCheck, CreditCard, Sparkles,
  Zap, ArrowRight, Wallet, Info
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL;

const loc = {
  en: {
    ledger: "Ledger",
    shelves: "Shelves",
    neighbors: "Neighbors",
    hub: "Hub Info",
    revenue: "Today's Revenue",
    outstanding: "Total Out on Hisaab",
    bqt_minted: "BQT Minted (Rewards)",
    add_item: "List New Product",
    item_name: "Item Name (e.g. Al Ain Water)",
    item_price: "Price (AED)",
    mint_preview: "You earn 1 BQT for every 1 AED listed.",
    approve: "Approve Hisaab",
    no_apps: "No pending neighbor requests.",
    verified: "Verified Hub",
    init_title: "Initialize Your Baqala",
    init_desc: "Join the network to offer digital credit and earn BQT tokens for every product you list.",
    btn_list: "Push to Shelves",
    btn_init: "Launch Storefront"
  },
  ar: {
    ledger: "السجل",
    shelves: "الأرفف",
    neighbors: "الجيران",
    hub: "بيانات الدكان",
    revenue: "دخل اليوم",
    outstanding: "ديون معلقة",
    bqt_minted: "BQT المكتسبة",
    add_item: "إضافة منتج جديد",
    item_name: "اسم المنتج",
    item_price: "السعر (درهم)",
    mint_preview: "ستحصل على 1 BQT مقابل كل 1 درهم.",
    approve: "تفعيل الحساب",
    no_apps: "لا توجد طلبات حالياً.",
    verified: "دكان موثق",
    init_title: "تفعيل متجرك الرقمي",
    init_desc: "انضم للشبكة لتفعيل الدفع الآجل لعملائك واكسب توكنات مقابل كل منتج تعرضه.",
    btn_list: "عرض بالأرفف",
    btn_init: "إطلاق المتجر"
  }
};

export default function VendorDashboard({ user, lang }) {
  const [activeTab, setActiveTab] = useState('ledger');
  const [baqala, setBaqala] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'snacks' });
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });

  const t = useMemo(() => loc[lang] || loc.en, [lang]);
  const isRTL = lang === 'ar';

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const fetchStoreData = async () => {
    if (!user?.telegram_id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqala/my-store`, {
        headers: { telegram_id: user.telegram_id }
      });
      if (res.data.success) {
        setBaqala(res.data.baqala);
        setClients(res.data.clients || []);
      }
    } catch (e) {
      setBaqala(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStoreData(); }, [user]);

  // FIX: Inventory Listing Logic
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price) return;
    
    haptic('heavy');
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/inventory/add`, 
        { ...itemForm },
        { headers: { telegram_id: user.telegram_id } }
      );
      
      if (res.data.success) {
        // Optimistic UI Update
        setBaqala(prev => ({
          ...prev,
          inventory: [res.data.item, ...prev.inventory]
        }));
        setItemForm({ name: '', price: '', category: 'snacks' });
        WebApp?.showAlert(`Product listed! +${parseFloat(itemForm.price).toFixed(0)} BQT Minted.`);
      }
    } catch (err) {
      alert("Listing failed. Check your connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, 
        { name: regForm.name, wallet_address: regForm.wallet },
        { headers: { telegram_id: user.telegram_id } }
      );
      if (res.data.success) window.location.reload();
    } catch (e) {
      alert("Registration failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-40">
      <RefreshCw className="animate-spin text-teal-400 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[4px]">Accessing Merchant Hub...</p>
    </div>
  );

  // Initial Registration View
  if (!baqala) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 pt-16 text-center">
      <div className="w-24 h-24 bg-teal-400/10 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-teal-400/20">
        <Store size={48} className="text-teal-400" />
      </div>
      <h2 className="text-3xl font-black italic tracking-tighter mb-4">{t.init_title}</h2>
      <p className="text-white/40 text-sm leading-relaxed mb-10">{t.init_desc}</p>
      
      <form onSubmit={handleRegister} className="space-y-4">
        <input 
          className="input-modern !rounded-3xl !py-6" 
          placeholder={t.item_name} 
          value={regForm.name} 
          onChange={e => setRegForm({...regForm, name: e.target.value})} 
          required 
        />
        <input 
          className="input-modern !rounded-3xl !py-6" 
          placeholder="TON Payout Address (0x...)" 
          value={regForm.wallet} 
          onChange={e => setRegForm({...regForm, wallet: e.target.value})} 
        />
        <button type="submit" disabled={actionLoading} className="btn-primary w-full !py-6 !rounded-3xl shadow-2xl">
           {actionLoading ? <RefreshCw className="animate-spin mx-auto" /> : t.btn_init}
        </button>
      </form>
    </motion.div>
  );

  return (
    <div className={`px-5 pt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* MERCHANT TABS */}
      <div className="flex bg-white/5 rounded-2xl p-1.5 mb-8 border border-white/5">
        {['ledger', 'shelves', 'neighbors', 'hub'].map(tab => (
          <button
            key={tab}
            onClick={() => { haptic('light'); setActiveTab(tab); }}
            className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-teal-400 text-black shadow-lg' : 'text-white/30 hover:text-white'}`}
          >
            {t[tab]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: LEDGER (Stats) */}
        {activeTab === 'ledger' && (
          <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 border-white/5">
                <TrendingUp size={20} className="text-teal-400 mb-3" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{t.revenue}</p>
                <p className="text-2xl font-black italic">AED 0.00</p>
              </div>
              <div className="glass-card p-6 border-teal-400/20 bg-teal-400/[0.02]">
                <Zap size={20} className="text-teal-400 mb-3" />
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-400 mb-1">{t.bqt_minted}</p>
                <p className="text-2xl font-black italic text-teal-400">0.00</p>
              </div>
            </div>
            
            <div className="glass-card p-8 border-orange-500/20 bg-orange-500/[0.02]">
                <p className="text-[10px] font-black uppercase tracking-[4px] text-white/30 mb-2">{t.outstanding}</p>
                <h2 className="text-5xl font-black tracking-tighter italic">AED 0.00</h2>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SHELVES (Inventory Management) */}
        {activeTab === 'shelves' && (
          <motion.div key="shelves" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-32">
            <div className="glass-card p-8 border-teal-400/20 bg-white/[0.01]">
              <h3 className="font-black text-lg italic uppercase tracking-tight mb-6 flex items-center gap-3">
                <Plus size={24} className="text-teal-400" /> {t.add_item}
              </h3>
              
              <form onSubmit={handleAddItem} className="space-y-4">
                <input 
                  className="input-modern !rounded-2xl !py-5" 
                  placeholder={t.item_name} 
                  value={itemForm.name} 
                  onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                  required 
                />
                <div className="flex gap-3">
                  <input 
                    className="input-modern flex-1 !rounded-2xl !py-5" 
                    type="number" 
                    placeholder={t.item_price} 
                    value={itemForm.price} 
                    onChange={e => setItemForm({...itemForm, price: e.target.value})} 
                    required 
                  />
                  <button type="submit" disabled={actionLoading} className="w-16 h-16 bg-teal-400 text-black rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-xl shadow-teal-400/20">
                    {actionLoading ? <RefreshCw className="animate-spin" /> : <ArrowRight size={28} strokeWidth={3} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <Sparkles size={12} className="text-teal-400" />
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{t.mint_preview}</p>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {baqala.inventory?.map(item => (
                <div key={item.id} className="glass-card !p-5 relative group border-white/5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-2">{item.category}</p>
                  <h5 className="font-bold text-sm mb-4 italic truncate pr-6">{item.name}</h5>
                  <p className="text-teal-400 font-black text-lg">AED {parseFloat(item.price).toFixed(2)}</p>
                  <button className="absolute top-4 right-4 text-white/10 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 3: NEIGHBORS (Hisaab Approval) */}
        {activeTab === 'neighbors' && (
          <motion.div key="neighbors" className="space-y-4 pb-32">
            {clients.length === 0 ? (
              <div className="py-20 text-center opacity-20">
                 <Users size={64} className="mx-auto mb-4" />
                 <p className="text-sm font-bold uppercase tracking-widest">{t.no_apps}</p>
              </div>
            ) : (
              clients.map(client => (
                <div key={client.id} className="glass-card !p-6 flex justify-between items-center border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 text-xl font-black">
                      {client.profiles?.display_name?.[0]}
                    </div>
                    <div>
                      <p className="font-black italic text-white">{client.profiles?.display_name}</p>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Resident Client</p>
                    </div>
                  </div>
                  {client.status === 'pending' ? (
                    <button className="bg-teal-400 text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter active:scale-95 transition-all">
                      {t.approve}
                    </button>
                  ) : (
                    <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                      <UserCheck size={20} />
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* TAB 4: HUB INFO */}
        {activeTab === 'hub' && (
          <motion.div key="hub" className="space-y-6">
             <div className="glass-card p-8 border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Check size={32} strokeWidth={4} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tighter">{baqala.name}</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.verified}</p>
                  </div>
                </div>
                
                <div className="space-y-4 pt-6 border-t border-white/5">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Global Hub ID</span>
                      <code className="text-xs text-teal-400 bg-teal-400/5 px-2 py-1 rounded">{baqala.id}</code>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Settlement Wallet</span>
                      <span className="text-[10px] font-medium text-white/60 truncate w-32 text-right">{baqala.wallet_address || "None"}</span>
                   </div>
                </div>
             </div>
             
             <button className="btn-secondary w-full !py-5 !rounded-2xl text-white/40 flex items-center justify-center gap-3">
               <Settings size={18} /> Update Store Settings
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
