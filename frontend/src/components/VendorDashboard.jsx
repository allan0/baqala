// ================================================
// frontend/src/components/VendorDashboard.jsx
// VERSION 22 (FULL MERCHANT HUB RESTORATION)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, ChevronRight, 
  TrendingUp, Check, X, Percent, UserCheck,
  LayoutDashboard, CreditCard, Save, Smartphone,
  Zap, ShieldCheck, UserPlus, Image as ImageIcon,
  AlertCircle, ShoppingBag, Receipt
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    tab_stats: "Ledger",
    tab_catalog: "Shelves",
    tab_residents: "Neighbors",
    tab_shop: "Shop Hub",
    daily_sales: "Today's Revenue",
    neighborhood_debt: "Outstanding Debt",
    trusted_neighbors: "Active Tabs",
    add_product: "Add New Product",
    item_placeholder: "e.g. Al Ain Water 1.5L",
    price_label: "Price (AED)",
    approve_btn: "Verify Hisaab",
    chat_btn: "Open Chat",
    discount_label: "Settlement Reward (%)",
    no_residents: "No neighbor requests yet.",
    shop_name: "Baqala Hub Name",
    payout_wallet: "TON Payout Address",
    sync_btn: "Update Identity",
    pending: "Access Request",
    approved: "Trusted",
    register_title: "Merchant Hub Gateway",
    register_desc: "Register your Baqala to automate neighborhood credit tabs and earn through secure crypto settlements.",
    init_btn: "Initialize Storefront"
  },
  ar: {
    tab_stats: "السجل",
    tab_catalog: "الأرفف",
    tab_residents: "السكان",
    tab_shop: "مركز الدكان",
    daily_sales: "دخل اليوم",
    neighborhood_debt: "ديون الفريج",
    trusted_neighbors: "الجيران الموثوقون",
    add_product: "إضافة منتج جديد",
    item_placeholder: "مثلاً: ماي العين ١.٥ لتر",
    price_label: "السعر (درهم)",
    approve_btn: "تفعيل الحساب",
    chat_btn: "محادثة",
    discount_label: "مكافأة السداد بالكريبتو (%)",
    no_residents: "لا يوجد طلبات حالياً.",
    shop_name: "اسم الدكان",
    payout_wallet: "محفظة TON للاستلام",
    sync_btn: "تحديث البيانات",
    pending: "قيد الطلب",
    approved: "جار موثوق",
    register_title: "بوابة التجار",
    register_desc: "سجل دكانك الآن لتفعيل حسابات 'الدفتر' الرقمية لجيرانك وقبول الدفع بالكريبتو.",
    init_btn: "تفعيل المتجر الرقمي"
  }
};

export default function VendorDashboard({ user, lang }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [residents, setResidents] = useState([]); 
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Forms
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'snacks' });
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';

  // 1. Merchant Sync: Identify store owner context
  const fetchMerchantHub = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqala/my-store`, {
        headers: { 
          auth_id: user.id, 
          telegram_id: user.telegram_id 
        }
      });
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        setInventory(res.data.baqala.inventory || []);
        setResidents(res.data.clients || []);
      }
    } catch (e) {
      console.warn("Store registry 404 or unauthorized access.");
      setMyBaqala(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMerchantHub(); }, [user.id]);

  // 2. Action Engine
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        wallet_address: regForm.wallet
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      if (res.data.success) {
        window.location.reload(); // Refresh to flip user role globally in App.jsx
      }
    } catch (e) {
      alert("Store registration error. Name might be taken.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/inventory/add`, {
        baqala_id: myBaqala.id,
        ...itemForm
      });
      setInventory(prev => [...prev, res.data.item]);
      setItemForm({ name: '', price: '', category: 'snacks' });
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Listing failed."); }
    finally { setIsActionLoading(false); }
  };

  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/baqala/inventory/${id}`);
      setInventory(prev => prev.filter(i => i.id !== id));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    } catch (e) { alert("Delete operation failed."); }
  };

  const handleApprove = async (appId) => {
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { 
        application_id: appId, 
        status: 'approved' 
      });
      setResidents(prev => prev.map(r => r.id === appId ? { ...r, status: 'approved' } : r));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Verification failure."); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Merchant Ledger...</p>
    </div>
  );

  // --- STATE 1: Hub INITIALIZATION (Registration) ---
  if (!myBaqala) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 pt-20 text-center">
      <div className="w-24 h-24 bg-teal-400/10 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl border border-teal-400/20 ring-8 ring-teal-400/5">
        <Store size={48} className="text-teal-400" />
      </div>
      <motion.h2 
        animate={{ backgroundPosition: ["0%", "200%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="text-3xl font-black italic uppercase mb-4 tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent"
      >
        {t.register_title}
      </motion.h2>
      <p className="text-white/40 text-sm mb-12 leading-relaxed font-medium px-4">{t.register_desc}</p>
      
      <form onSubmit={handleRegister} className="space-y-6 text-left">
        <div>
          <label className="text-[10px] font-black uppercase text-white/30 ml-5 tracking-[2px] block mb-2">{t.shop_name}</label>
          <input className="input-modern w-full !rounded-full !py-5" placeholder="e.g. Al Farij Hub" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-white/30 ml-5 tracking-[2px] block mb-2">{t.payout_wallet}</label>
          <input className="input-modern w-full !rounded-full !py-5" placeholder="TON Settlement Address" value={regForm.wallet} onChange={e => setRegForm({...regForm, wallet: e.target.value})} />
        </div>
        <button type="submit" disabled={isActionLoading} className="btn-primary w-full !py-6 mt-8 !rounded-full text-xl shadow-xl shadow-teal-400/20 active:scale-95 transition-all">
          {isActionLoading ? <RefreshCw className="animate-spin mx-auto" /> : t.init_btn}
        </button>
      </form>
    </motion.div>
  );

  // --- STATE 2: Hub MANAGEMENT ---
  return (
    <div className={`px-5 pt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* Pills: Navigation Tab Restoration */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-full p-1.5 mb-10 border border-white/5 shadow-2xl">
        {['stats', 'catalog', 'residents', 'shop'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light'); }}
            className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${
              activeTab === tab ? 'bg-white text-black shadow-2xl scale-105 font-bold' : 'text-white/30'
            }`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* Hub LEDGER / DASHBOARD */}
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
               <div className="glass-card !p-8 border-white/5 bg-gradient-to-br from-teal-500/10 to-transparent shadow-xl rounded-[32px]">
                  <TrendingUp size={20} className="text-teal-400 mb-4" />
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-none mb-1.5">{t.daily_sales}</p>
                  <h3 className="text-2xl font-black italic tracking-tighter text-white">AED 0.00</h3>
               </div>
               <div className="glass-card !p-8 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent shadow-xl rounded-[32px]">
                  <CreditCard size={20} className="text-orange-500 mb-4" />
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-none mb-1.5">{t.neighborhood_debt}</p>
                  <h3 className="text-2xl font-black italic tracking-tighter text-orange-500">
                    AED {residents.filter(r=>r.status==='approved').length * 0}
                  </h3>
               </div>
            </div>

            <div className="glass-card !p-8 shadow-2xl rounded-[40px]">
               <div className="flex justify-between items-center mb-10 px-2">
                  <h3 className="text-[12px] font-black uppercase tracking-[5px] text-white/30 italic">Neighborhood Hub Status</h3>
                  <Users size={20} className="text-teal-400" />
               </div>
               <div className="flex -space-x-5 overflow-hidden pb-4">
                  {residents.filter(r=>r.status==='approved').length === 0 ? (
                    <p className="text-[10px] text-white/20 italic font-black uppercase tracking-widest ml-4">No trusted neighbors yet.</p>
                  ) : (
                    residents.filter(r=>r.status==='approved').map((r, i) => (
                        <div key={i} className="w-16 h-16 rounded-full border-4 border-[#0a0a0f] bg-teal-400 flex items-center justify-center text-black font-black shadow-2xl uppercase text-lg border-2 border-teal-400/50 hover:translate-y-[-10px] transition-transform overflow-hidden cursor-pointer">
                           {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} className="w-full h-full object-cover" /> : r.profiles?.display_name?.[0]}
                        </div>
                     ))
                  )}
               </div>
            </div>
          </motion.div>
        )}

        {/* SHELVES Hub (Inventory) */}
        {activeTab === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24">
             <div className="glass-card !p-8 shadow-xl border-white/5 rounded-[40px]">
                <h3 className="text-[11px] font-black uppercase tracking-[4px] mb-8 flex items-center gap-3 text-teal-400">
                   <Plus size={18} strokeWidth={4}/> {t.add_product}
                </h3>
                <form onSubmit={handleAddItem} className="space-y-5">
                   <input className="input-modern w-full !rounded-[24px] shadow-inner" placeholder={t.item_placeholder} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} required />
                   <div className="flex gap-4">
                      <input className="input-modern flex-1 !rounded-[24px] shadow-inner" type="number" step="0.01" placeholder={t.price_label} value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} required />
                      <button type="submit" disabled={isActionLoading} className="bg-teal-400 text-black px-10 rounded-full font-black uppercase italic text-[11px] shadow-lg shadow-teal-400/20 active:scale-90 transition-all">
                        {isActionLoading ? '...' : 'List Item'}
                      </button>
                   </div>
                </form>
             </div>

             <div className="grid grid-cols-2 gap-6">
                {inventory.map(item => (
                  <div key={item.id} className="glass-card !p-5 relative group hover:border-teal-400/30 transition-all rounded-[32px] bg-white/[0.01] shadow-inner border-white/5">
                     <div className="w-full aspect-square bg-black/40 rounded-full mb-6 flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">📦</div>
                     <h5 className="font-black text-[13px] leading-tight mb-2 truncate italic text-white/95 px-1">{item.name}</h5>
                     <p className="text-teal-400 font-black text-sm tracking-tighter italic px-1 leading-none">AED {parseFloat(item.price).toFixed(2)}</p>
                     <button onClick={()=>handleDeleteItem(item.id)} className="absolute top-4 right-4 p-2.5 bg-red-500/10 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 shadow-xl"><Trash2 size={16}/></button>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* NEIGHBORS Hub (Resident Approvals) */}
        {activeTab === 'residents' && (
          <motion.div key="residents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24">
             {residents.length === 0 ? (
               <div className="py-24 text-center opacity-20 italic text-xs font-black uppercase tracking-[10px] leading-loose">No neighbor profiles found.</div>
             ) : (
               residents.map(r => (
                 <div key={r.id} className={`glass-card !p-8 border-white/5 ${r.status === 'pending' ? 'border-orange-500/30 bg-orange-500/[0.01]' : ''} shadow-2xl rounded-[40px]`}>
                    <div className="flex justify-between items-start mb-10 px-2">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-[#0a0a0f] rounded-full flex items-center justify-center font-black uppercase shadow-2xl text-teal-400 border border-white/10 text-xl overflow-hidden ring-8 ring-white/5">
                             {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} className="w-full h-full object-cover" /> : r.profiles?.display_name?.[0]}
                          </div>
                          <div>
                             <p className="font-black text-xl italic text-white leading-tight mb-2 uppercase">{r.profiles?.display_name || "Neighbor"}</p>
                             <p className="text-[9px] text-white/30 font-bold uppercase tracking-[3px]">Protocol ID: {r.resident_id.slice(0,12)}</p>
                          </div>
                       </div>
                       <span className={`text-[9px] font-black uppercase px-4 py-2 rounded-full border ${r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse'}`}>
                          {r.status === 'approved' ? t.approved : t.pending}
                       </span>
                    </div>

                    <div className="flex gap-4">
                       {r.status === 'pending' && (
                         <button onClick={() => handleApprove(r.id)} className="flex-1 bg-teal-400 text-black py-4.5 rounded-full text-[12px] font-black uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-teal-400/20 border-b-4 border-teal-600">
                            <UserCheck size={20} strokeWidth={3}/> {t.approve_btn}
                         </button>
                       )}
                       <button className="flex-1 bg-white/5 border border-white/10 text-white py-4.5 rounded-full text-[12px] font-black uppercase flex items-center justify-center gap-3 active:bg-white/10 transition-all shadow-inner group">
                          <MessageCircle size={20} className="text-blue-400 group-hover:scale-125 transition-transform" /> {t.chat_btn}
                       </button>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}

        {/* STORE IDENTITY SETTINGS Hub */}
        {activeTab === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-24">
             <div className="glass-card !p-10 space-y-12 shadow-2xl rounded-[50px] border-white/5">
                <div className="flex items-center gap-6 mb-2">
                    <div className="w-16 h-16 bg-teal-400/10 rounded-full flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-inner"><Settings size={32}/></div>
                    <h3 className="text-[14px] font-black uppercase tracking-[6px] text-white/40 italic leading-none">Hub Profile Config</h3>
                </div>
                
                <div className="space-y-4 px-2">
                   <p className="text-[10px] font-black uppercase text-white/30 ml-6 tracking-[4px] leading-none">{t.shop_name}</p>
                   <input className="input-modern w-full !rounded-full !py-6 !bg-black/40 shadow-inner text-white/90 border-white/10" value={myBaqala.name} readOnly />
                </div>

                <div className="space-y-4 px-2">
                   <p className="text-[10px] font-black uppercase text-white/30 ml-6 tracking-[4px] leading-none">{t.payout_wallet}</p>
                   <input className="input-modern w-full !rounded-full !py-6 font-mono text-[11px] !bg-black/40 shadow-inner text-white/80 border-white/10" value={myBaqala.wallet_address || 'NOT CONNECTED'} readOnly />
                </div>

                <div className="p-8 bg-[#1a150e] border border-orange-500/20 rounded-[50px] flex gap-8 items-start shadow-inner">
                   <AlertCircle size={36} className="text-orange-500 shrink-0 mt-1" />
                   <p className="text-xs text-white/50 leading-loose font-medium uppercase tracking-[3px] italic">
                      Core store metadata (GPS Coordinates, Settlement Wallet) is verified by protocol admins. Contact support to request manual overrides.
                   </p>
                </div>
             </div>
             <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-[15px] pt-12 italic opacity-20">Hub ID: {myBaqala.id}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
