// ================================================
// frontend/src/components/VendorDashboard.jsx
// VERSION 16 (PRODUCTION MERCHANT HUB)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, ChevronRight, 
  TrendingUp, Check, X, Percent, UserCheck,
  LayoutDashboard, CreditCard, Save, Smartphone,
  Image as ImageIcon, Clock, Phone, Link as LinkIcon
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    tab_stats: "Ledger",
    tab_catalog: "Shelves",
    tab_residents: "Neighbors",
    tab_shop: "Edit Shop",
    daily_sales: "Daily Revenue",
    neighborhood_debt: "Neighborhood Debt",
    trusted_neighbors: "Active Tabs",
    add_product: "List New Item",
    item_placeholder: "e.g. Al Ain Water 1.5L",
    price_label: "Price (AED)",
    approve_btn: "Approve Hisaab",
    chat_btn: "Contact",
    discount_label: "Crypto Settle Discount (%)",
    no_residents: "No credit requests yet.",
    shop_name: "Baqala Name",
    payout_wallet: "TON Payout Wallet",
    sync_btn: "Sync Digital Identity",
    pending: "Access Request",
    approved: "Trusted neighbor",
    register_title: "Merchant Onboarding",
    register_desc: "Register your baqala to start managing digital credit tabs for your neighborhood.",
    init_btn: "Initialize Storefront"
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
    chat_btn: "تواصل",
    discount_label: "خصم الكريبتو (%)",
    no_residents: "لا يوجد طلبات حالياً.",
    shop_name: "اسم الدكان",
    payout_wallet: "محفظة TON للاستلام",
    sync_btn: "تحديث هوية الدكان",
    pending: "طلب اشتراك",
    approved: "جار موثوق",
    register_title: "تسجيل تاجر جديد",
    register_desc: "سجل دكانك الآن لتفعيل حسابات 'الدفتر' الرقمية لجيرانك.",
    init_btn: "تفعيل الدكان الرقمي"
  }
};

export default function VendorDashboard({ user, lang }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [residents, setResidents] = useState([]); 
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Form States
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'snacks' });
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';

  // 1. Fetch real Merchant Data
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
      console.warn("User is not a registered merchant yet.");
      setMyBaqala(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMerchantHub(); }, [user.id]);

  // 2. Actions
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
        // Force refresh to update the global user role to 'merchant'
        window.location.reload();
      }
    } catch (e) {
      alert("Registration failed. Please try again.");
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
    } catch (e) { alert("Failed to add item."); }
    finally { setIsActionLoading(false); }
  };

  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/baqala/inventory/${id}`);
      setInventory(prev => prev.filter(i => i.id !== id));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    } catch (e) { alert("Delete failed."); }
  };

  const handleApproveResident = async (appId) => {
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { 
        application_id: appId, 
        status: 'approved' 
      });
      setResidents(prev => prev.map(r => r.id === appId ? { ...r, status: 'approved' } : r));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Approval error."); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Merchant Hub...</p>
    </div>
  );

  // --- REGISTRATION VIEW ---
  if (!myBaqala) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 pt-20 text-center">
      <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/5">
        <Store size={48} className="text-teal-400 opacity-40" />
      </div>
      <h2 className="text-2xl font-black italic uppercase mb-4">{t.register_title}</h2>
      <p className="text-white/40 text-sm mb-10 leading-relaxed">{t.register_desc}</p>
      
      <form onSubmit={handleRegister} className="space-y-4 text-left">
        <div>
          <label className="text-[10px] font-black uppercase text-white/20 ml-2 mb-2 block">{t.shop_name}</label>
          <input 
            className="input-modern w-full !bg-white/[0.02]" 
            placeholder="e.g. Al Madina Baqala"
            value={regForm.name} 
            onChange={e => setRegForm({...regForm, name: e.target.value})}
            required 
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-white/20 ml-2 mb-2 block">{t.payout_wallet}</label>
          <input 
            className="input-modern w-full !bg-white/[0.02]" 
            placeholder="TON Wallet Address (Optional)"
            value={regForm.wallet} 
            onChange={e => setRegForm({...regForm, wallet: e.target.value})}
          />
        </div>
        <button type="submit" disabled={isActionLoading} className="btn-primary w-full !py-6 mt-6">
          {isActionLoading ? <RefreshCw className="animate-spin mx-auto" /> : t.init_btn}
        </button>
      </form>
    </motion.div>
  );

  // --- MERCHANT DASHBOARD VIEW ---
  return (
    <div className={`px-5 pt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* Tab Navigation */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 mb-8 border border-white/5">
        {['stats', 'catalog', 'residents', 'shop'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === tab ? 'bg-white text-black shadow-lg scale-105' : 'text-white/30'
            }`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* LEDGER & STATS */}
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="glass-card !p-6">
                  <TrendingUp size={16} className="text-teal-400 mb-3" />
                  <p className="text-[10px] font-black opacity-30 uppercase">{t.daily_sales}</p>
                  <p className="text-2xl font-black italic tracking-tighter">AED 0.00</p>
               </div>
               <div className="glass-card !p-6 border-orange-500/20">
                  <CreditCard size={16} className="text-orange-500 mb-3" />
                  <p className="text-[10px] font-black opacity-30 uppercase">{t.neighborhood_debt}</p>
                  <p className="text-2xl font-black italic tracking-tighter text-orange-500">
                    AED {residents.filter(r=>r.status==='approved').length * 0}
                  </p>
               </div>
            </div>

            <div className="glass-card">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[3px]">{t.trusted_neighbors}</h3>
                  <Users size={16} className="opacity-20" />
               </div>
               <div className="flex -space-x-3">
                 {residents.filter(r=>r.status==='approved').length === 0 ? (
                    <p className="text-[10px] text-white/20 italic">No neighbor tabs active.</p>
                 ) : (
                    residents.filter(r=>r.status==='approved').map((r, i) => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-[#0a0a0f] bg-teal-400 flex items-center justify-center text-black font-black shadow-xl uppercase">
                          {r.profiles?.display_name?.[0]}
                        </div>
                     ))
                 )}
               </div>
            </div>
          </motion.div>
        )}

        {/* SHELVES & INVENTORY */}
        {activeTab === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="glass-card">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2">
                   <Plus size={14} className="text-teal-400" /> {t.add_product}
                </h3>
                <form onSubmit={handleAddItem} className="space-y-4">
                   <input className="input-modern w-full" placeholder={t.item_placeholder} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} required />
                   <div className="flex gap-2">
                      <input className="input-modern flex-1" type="number" step="0.01" placeholder={t.price_label} value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} required />
                      <button type="submit" disabled={isActionLoading} className="bg-teal-400 text-black px-6 rounded-2xl font-black uppercase italic text-[10px]">
                        {isActionLoading ? '...' : 'Add'}
                      </button>
                   </div>
                </form>
             </div>

             <div className="grid grid-cols-2 gap-4 pb-20">
                {inventory.map(item => (
                  <div key={item.id} className="glass-card !p-4 relative group">
                     <div className="w-full aspect-square bg-white/5 rounded-xl mb-4 flex items-center justify-center text-3xl">📦</div>
                     <h5 className="font-black text-[11px] leading-tight mb-2 truncate italic">{item.name}</h5>
                     <p className="text-teal-400 font-black text-sm tracking-tighter">AED {parseFloat(item.price).toFixed(2)}</p>
                     <button onClick={()=>handleDeleteItem(item.id)} className="absolute top-2 right-2 p-2 text-red-500/40 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* NEIGHBORS (CRM) */}
        {activeTab === 'residents' && (
          <motion.div key="residents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-20">
             {residents.length === 0 ? (
               <div className="p-20 text-center opacity-20 italic text-xs font-bold uppercase tracking-widest">{t.no_residents}</div>
             ) : (
               residents.map(r => (
                 <div key={r.id} className={`glass-card !p-6 border-white/5 ${r.status === 'pending' ? 'border-orange-500/30 bg-orange-500/[0.02]' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/5 rounded-[18px] flex items-center justify-center font-black uppercase shadow-inner text-teal-400 border border-white/10">
                             {r.profiles?.display_name?.[0]}
                          </div>
                          <div>
                             <p className="font-black text-lg italic">{r.profiles?.display_name}</p>
                             <p className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">ID: {r.resident_id.slice(0,8)}</p>
                          </div>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                          {r.status === 'approved' ? t.approved : t.pending}
                       </span>
                    </div>

                    <div className="flex gap-2">
                       {r.status === 'pending' && (
                         <button onClick={() => handleApproveResident(r.id)} className="flex-1 bg-teal-400 text-black py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                            <UserCheck size={14} /> {t.approve_btn}
                         </button>
                       )}
                       <button className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                          <MessageCircle size={14} className="text-blue-400" /> {t.chat_btn}
                       </button>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}

        {/* SHOP SETTINGS */}
        {activeTab === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
             <div className="glass-card space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] flex items-center gap-2">
                   <Settings size={14} className="text-teal-400" /> Digital Storefront
                </h3>
                
                <div>
                   <p className="text-[9px] font-black uppercase text-white/30 mb-2 ml-1">{t.shop_name}</p>
                   <input className="input-modern" value={myBaqala.name} readOnly />
                </div>

                <div>
                   <p className="text-[9px] font-black uppercase text-white/30 mb-2 ml-1">{t.payout_wallet}</p>
                   <input className="input-modern" value={myBaqala.wallet_address || 'None Linked'} readOnly />
                </div>

                <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                   <p className="text-[11px] text-orange-400 font-medium leading-relaxed">
                      To update your official store name, location, or payout wallet, please contact neighborhood support via the Telegram Bot.
                   </p>
                </div>
             </div>
             <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pt-4 italic">Baqala ID: {myBaqala.id}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
