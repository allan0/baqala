// ================================================
// frontend/src/components/VendorDashboard.jsx
// VERSION 23 (Mobile UI Fixed + Tokenomics + Full Merchant MVP)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, TrendingUp, 
  Check, X, UserCheck, CreditCard, Sparkles
} from 'lucide-react';
import axios from 'axios';

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
    no_residents: "No neighbor requests yet.",
    shop_name: "Baqala Hub Name",
    payout_wallet: "TON Payout Address",
    init_btn: "Initialize Storefront",
    bqt_earned: "BQT Earned Today"
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
    no_residents: "لا يوجد طلبات حالياً.",
    shop_name: "اسم الدكان",
    payout_wallet: "محفظة TON للاستلام",
    init_btn: "تفعيل المتجر الرقمي",
    bqt_earned: "BQT المكتسبة اليوم"
  }
};

export default function VendorDashboard({ user, lang }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [residents, setResidents] = useState([]); 
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'snacks' });
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';

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
      setMyBaqala(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMerchantHub(); }, [user.id]);

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
      if (res.data.success) window.location.reload();
    } catch (e) {
      alert("Store registration error.");
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
    } catch (e) { alert("Listing failed."); }
    finally { setIsActionLoading(false); }
  };

  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/baqala/inventory/${id}`);
      setInventory(prev => prev.filter(i => i.id !== id));
    } catch (e) { alert("Delete failed."); }
  };

  const handleApprove = async (appId) => {
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { 
        application_id: appId, 
        status: 'approved' 
      });
      setResidents(prev => prev.map(r => r.id === appId ? { ...r, status: 'approved' } : r));
    } catch (e) { alert("Verification failure."); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <RefreshCw className="animate-spin text-teal-400 mb-4" size={40} />
      </div>
    );
  }

  if (!myBaqala) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 pt-20 text-center">
        <Store size={64} className="mx-auto mb-8 text-teal-400" />
        <h2 className="text-3xl font-black italic mb-4">{t.shop_name}</h2>
        <form onSubmit={handleRegister} className="space-y-6">
          <input className="input-modern w-full !rounded-3xl !py-6" placeholder={t.shop_name} value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required />
          <input className="input-modern w-full !rounded-3xl !py-6" placeholder={t.payout_wallet} value={regForm.wallet} onChange={e => setRegForm({...regForm, wallet: e.target.value})} />
          <button type="submit" disabled={isActionLoading} className="btn-primary w-full !py-7 !rounded-3xl text-xl">
            {isActionLoading ? <RefreshCw className="animate-spin mx-auto" /> : t.init_btn}
          </button>
        </form>
      </motion.div>
    );
  }

  return (
    <div className={`px-5 pt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Tab Pills */}
      <div className="flex bg-white/5 rounded-3xl p-1 mb-8">
        {['stats', 'catalog', 'residents', 'shop'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-xs font-black uppercase rounded-3xl transition-all ${activeTab === tab ? 'bg-white text-black shadow-xl' : 'text-white/40'}`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div key="stats" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6">
                <TrendingUp size={20} className="text-teal-400 mb-2" />
                <p className="text-xs uppercase tracking-widest text-white/40">{t.daily_sales}</p>
                <p className="text-3xl font-black">AED 0</p>
              </div>
              <div className="glass-card p-6 border-teal-400/30">
                <Sparkles size={20} className="text-teal-400 mb-2" />
                <p className="text-xs uppercase tracking-widest text-white/40">{t.bqt_earned}</p>
                <p className="text-3xl font-black text-teal-400">0 BQT</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'catalog' && (
          <motion.div key="catalog" className="space-y-6 pb-24">
            <div className="glass-card p-6">
              <h3 className="font-black mb-6 flex items-center gap-2"><Plus size={20} />{t.add_product}</h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <input className="input-modern w-full !rounded-3xl" placeholder={t.item_placeholder} value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
                <div className="flex gap-4">
                  <input className="input-modern flex-1 !rounded-3xl" type="number" placeholder={t.price_label} value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} required />
                  <button type="submit" className="bg-teal-400 text-black px-8 rounded-3xl font-black">Add</button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {inventory.map(item => (
                <div key={item.id} className="glass-card p-5 relative">
                  <h5 className="font-black text-sm mb-2">{item.name}</h5>
                  <p className="text-teal-400 font-black">AED {parseFloat(item.price).toFixed(2)}</p>
                  <button onClick={() => handleDeleteItem(item.id)} className="absolute top-4 right-4 text-red-400"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'residents' && (
          <motion.div key="residents" className="space-y-4 pb-24">
            {residents.length === 0 ? (
              <p className="text-center py-20 text-white/30">{t.no_residents}</p>
            ) : (
              residents.map(r => (
                <div key={r.id} className="glass-card p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center font-black">
                      {r.profiles?.display_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-bold">{r.profiles?.display_name}</p>
                      <p className="text-xs text-white/40">Resident</p>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <button onClick={() => handleApprove(r.id)} className="bg-teal-400 text-black px-6 py-3 rounded-3xl text-sm font-black">
                      {t.approve_btn}
                    </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'shop' && (
          <motion.div key="shop" className="space-y-8 pb-24">
            <div className="glass-card p-8">
              <p className="text-xs font-black uppercase mb-2">{t.shop_name}</p>
              <p className="text-2xl font-black">{myBaqala.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
