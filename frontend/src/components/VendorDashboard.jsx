// ================================================
// frontend/src/components/VendorDashboard.jsx
// VERSION 17 (FULL MERCHANT Hub RESTORATION)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, ChevronRight, 
  TrendingUp, Check, X, Percent, UserCheck,
  LayoutDashboard, CreditCard, Save, Smartphone,
  Zap, ShieldCheck, UserPlus, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    tab_stats: "Ledger",
    tab_catalog: "Shelves",
    tab_residents: "Neighbors",
    tab_shop: "Shop Profile",
    daily_sales: "Daily Revenue",
    neighborhood_debt: "Outstanding Debt",
    trusted_neighbors: "Active Tabs",
    add_product: "List New Item",
    item_placeholder: "e.g. Al Ain Water 1.5L",
    price_label: "Price (AED)",
    approve_btn: "Approve Hisaab",
    chat_btn: "Open Chat",
    discount_label: "Crypto Payout Discount (%)",
    no_residents: "No credit requests yet.",
    shop_name: "Baqala Display Name",
    payout_wallet: "TON Payout Address",
    sync_btn: "Update Storefront",
    pending: "Access Request",
    approved: "Trusted Resident",
    register_title: "Join the Network",
    register_desc: "Register your Baqala to provide digital credit tabs and accept crypto payments from your neighbors.",
    init_btn: "Register My Store"
  },
  ar: {
    tab_stats: "السجل",
    tab_catalog: "الأرفف",
    tab_residents: "الجيران",
    tab_shop: "تعديل الدكان",
    daily_sales: "دخل اليوم",
    neighborhood_debt: "ديون الفريج",
    trusted_neighbors: "الحسابات النشطة",
    add_product: "إضافة منتج",
    item_placeholder: "مثلاً: ماي العين ١.٥ لتر",
    price_label: "السعر (درهم)",
    approve_btn: "تفعيل الحساب",
    chat_btn: "محادثة",
    discount_label: "خصم تسوية الكريبتو (%)",
    no_residents: "لا يوجد طلبات حالياً.",
    shop_name: "اسم الدكان",
    payout_wallet: "محفظة TON للاستلام",
    sync_btn: "تحديث البيانات",
    pending: "طلب اشتراك",
    approved: "جار موثوق",
    register_title: "انضم للشبكة",
    register_desc: "سجل دكانك الآن لتفعيل حسابات 'الدفتر' الرقمية لجيرانك وقبول الدفع بالكريبتو.",
    init_btn: "تسجيل دكاني"
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

  // 1. Fetch real Merchant Hub data
  const fetchHub = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqala/my-store`, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        setInventory(res.data.baqala.inventory || []);
        setResidents(res.data.clients || []);
      }
    } catch (e) {
      console.warn("User is not a registered merchant yet.");
      setMyBaqala(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHub(); }, [user.id]);

  // 2. Action Handlers
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        wallet_address: regForm.wallet
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      // Force reload to let App.jsx pick up the new 'merchant' role
      window.location.reload();
    } catch (e) {
      alert("Registration error. Try a different name.");
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
    } catch (e) { alert("Failed to list item."); }
    finally { setIsActionLoading(false); }
  };

  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/baqala/inventory/${id}`);
      setInventory(prev => prev.filter(i => i.id !== id));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    } catch (e) { alert("Delete failed."); }
  };

  const handleApprove = async (appId) => {
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { 
        application_id: appId, 
        status: 'approved' 
      });
      setResidents(prev => prev.map(r => r.id === appId ? { ...r, status: 'approved' } : r));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Approval failed."); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Merchant Ledger...</p>
    </div>
  );

  // --- VIEW 1: REGISTRATION FLOW (For non-merchants) ---
  if (!myBaqala) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 pt-20 text-center">
      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/10">
        <Store size={48} className="text-teal-400 opacity-40" />
      </div>
      <h2 className="text-2xl font-black italic uppercase mb-4 tracking-tighter">{t.register_title}</h2>
      <p className="text-white/40 text-sm mb-12 leading-relaxed">{t.register_desc}</p>
      
      <form onSubmit={handleRegister} className="space-y-4 text-left">
        <div>
          <label className="text-[10px] font-black uppercase text-white/30 ml-3 mb-2 block">{t.shop_name}</label>
          <input 
            className="input-modern w-full !rounded-[24px]" 
            placeholder="e.g. Al Madina Baqala"
            value={regForm.name} 
            onChange={e => setRegForm({...regForm, name: e.target.value})}
            required 
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-white/30 ml-3 mb-2 block">{t.payout_wallet}</label>
          <input 
            className="input-modern w-full !rounded-[24px]" 
            placeholder="TON Settlement Address"
            value={regForm.wallet} 
            onChange={e => setRegForm({...regForm, wallet: e.target.value})}
          />
        </div>
        <button type="submit" disabled={isActionLoading} className="btn-primary w-full !py-6 mt-8">
          {isActionLoading ? <RefreshCw className="animate-spin mx-auto" /> : t.init_btn}
        </button>
      </form>
    </motion.div>
  );

  // --- VIEW 2: MERCHANT Hub (For registered merchants) ---
  return (
    <div className={`px-5 pt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* Sub-Navigation Tabs */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-full p-1 mb-8 border border-white/5">
        {['stats', 'catalog', 'residents', 'shop'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${
              activeTab === tab ? 'bg-white text-black shadow-lg' : 'text-white/30'
            }`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* STATS & LEDGER OVERVIEW */}
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="glass-card !p-6 border-white/5 bg-gradient-to-br from-teal-500/10 to-transparent">
                  <TrendingUp size={16} className="text-teal-400 mb-3" />
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t.daily_sales}</p>
                  <p className="text-2xl font-black italic tracking-tighter text-white">AED 0.00</p>
               </div>
               <div className="glass-card !p-6 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent">
                  <CreditCard size={16} className="text-orange-500 mb-3" />
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t.neighborhood_debt}</p>
                  <p className="text-2xl font-black italic tracking-tighter text-orange-500">
                    AED {residents.filter(r=>r.status==='approved').length * 0}
                  </p>
               </div>
            </div>

            <div className="glass-card !p-6">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[4px] text-white/30">{t.trusted_neighbors}</h3>
                  <Users size={16} className="text-teal-400" />
               </div>
               <div className="flex -space-x-4 overflow-hidden">
                  {residents.filter(r=>r.status==='approved').length === 0 ? (
                    <p className="text-[10px] text-white/20 italic font-bold uppercase tracking-widest">No active neighbor tabs.</p>
                  ) : (
                    residents.filter(r=>r.status==='approved').map((r, i) => (
                      <div key={i} className="w-14 h-14 rounded-full border-4 border-[#0a0a0f] bg-teal-400 flex items-center justify-center text-black font-black shadow-xl uppercase border-2 border-teal-400/50">
                         {r.profiles?.display_name?.[0]}
                      </div>
                    ))
                  )}
               </div>
            </div>
          </motion.div>
        )}

        {/* SHELVES (Inventory Management) */}
        {activeTab === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
             <div className="glass-card">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2 text-teal-400">
                   <Plus size={14}/> {t.add_product}
                </h3>
                <form onSubmit={handleAddItem} className="space-y-4">
                   <input className="input-modern w-full" placeholder={t.item_placeholder} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} required />
                   <div className="flex gap-2">
                      <input className="input-modern flex-1" type="number" step="0.01" placeholder={t.price_label} value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} required />
                      <button type="submit" disabled={isActionLoading} className="bg-teal-400 text-black px-8 rounded-2xl font-black uppercase italic text-xs shadow-lg active:scale-95 transition-all">
                        {isActionLoading ? '...' : 'List'}
                      </button>
                   </div>
                </form>
             </div>

             <div className="grid grid-cols-2 gap-4 pb-20">
                {inventory.map(item => (
                  <div key={item.id} className="glass-card !p-4 relative group hover:border-teal-400/30 transition-colors">
                     <div className="w-full aspect-square bg-black/40 rounded-2xl mb-4 flex items-center justify-center text-3xl shadow-inner">📦</div>
                     <h5 className="font-black text-[11px] leading-tight mb-2 truncate italic text-white/80 px-1">{item.name}</h5>
                     <p className="text-teal-400 font-black text-sm tracking-tighter px-1">AED {parseFloat(item.price).toFixed(2)}</p>
                     <button onClick={()=>handleDeleteItem(item.id)} className="absolute top-2 right-2 p-2 bg-red-500/10 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* NEIGHBORS (Hisaab CRM) */}
        {activeTab === 'residents' && (
          <motion.div key="residents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pb-20">
             {residents.length === 0 ? (
               <div className="p-20 text-center opacity-20 italic text-xs font-bold uppercase tracking-widest">{t.no_residents}</div>
             ) : (
               residents.map(r => (
                 <div key={r.id} className={`glass-card !p-6 border-white/5 ${r.status === 'pending' ? 'border-orange-500/30 bg-orange-500/[0.02]' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center font-black uppercase shadow-inner text-teal-400 border border-white/10">
                             {r.profiles?.display_name?.[0]}
                          </div>
                          <div>
                             <p className="font-black text-lg italic text-white">{r.profiles?.display_name}</p>
                             <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter mt-1">ID: {r.resident_id.slice(0,8)}</p>
                          </div>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                          {r.status === 'approved' ? t.approved : t.pending}
                       </span>
                    </div>

                    <div className="flex gap-2">
                       {r.status === 'pending' && (
                         <button onClick={() => handleApprove(r.id)} className="flex-1 bg-teal-400 text-black py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <UserCheck size={16} /> {t.approve_btn}
                         </button>
                       )}
                       <button className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all group">
                          <MessageCircle size={16} className="text-blue-400 group-hover:scale-110 transition-transform" /> {t.chat_btn}
                       </button>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}

        {/* SHOP EDIT / PROFILE */}
        {activeTab === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 pb-20">
             <div className="glass-card space-y-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-teal-400/10 rounded-full flex items-center justify-center text-teal-400 border border-teal-400/20"><Settings size={22}/></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[3px] text-white/50">Digital Storefront Identity</h3>
                </div>
                
                <div>
                   <p className="text-[9px] font-black uppercase text-white/20 mb-2 ml-2">{t.shop_name}</p>
                   <input className="input-modern w-full !bg-white/[0.02]" value={myBaqala.name} readOnly />
                </div>

                <div>
                   <p className="text-[9px] font-black uppercase text-white/20 mb-2 ml-2">{t.payout_wallet}</p>
                   <input className="input-modern w-full !bg-white/[0.02]" value={myBaqala.wallet_address || 'None Linked'} readOnly />
                </div>

                <div className="p-5 bg-orange-500/10 rounded-3xl border border-orange-500/20 flex gap-4 items-start">
                   <AlertCircle size={24} className="text-orange-500 shrink-0" />
                   <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                      Store metadata (Location, Branding, Payout Wallets) is verified via neighborhood consensus. Contact Protocol Admin to update.
                   </p>
                </div>
             </div>
             <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-[4px] pt-8">Baqala Hub ID: {myBaqala.id}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
