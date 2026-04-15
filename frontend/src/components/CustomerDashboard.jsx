// ================================================
// frontend/src/components/CustomerDashboard.jsx
// VERSION 15 (PRODUCTION RESIDENT HUB)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, Search, MessageCircle, Sparkles, 
  Plus, Trash2, Lock, CheckCircle2, ChevronRight, 
  ChevronLeft, Store, LayoutGrid, RefreshCw, AlertCircle
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    search: "Search neighborhood stores...",
    nearby: "THE FARIJ (NEIGHBORHOOD)",
    open: "Open Now",
    back: "Back to Farij",
    apply_hisaab: "Apply for Hisaab",
    pending_hisaab: "Access Pending",
    approved_hisaab: "Trusted neighbor",
    chat_merchant: "Chat راعي الدكان",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "Review Tab",
    confirm_hisaab: "Commit to Ledger",
    checkout_locked: "Hisaab approval required to shop on credit.",
    request_access: "Request Credit Access",
    catalog: "Store Shelves",
    verified: "Verified Baqala",
    empty_farij: "No stores found in this area yet."
  },
  ar: {
    search: "دور على دكان بالفريج...",
    nearby: "دكاكين فريجنا",
    open: "مفتوح الآن",
    back: "رجوع للفريج",
    apply_hisaab: "تقديم طلب حساب",
    pending_hisaab: "قيد المراجعة",
    approved_hisaab: "جار موثوق",
    chat_merchant: "كلم راعي الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "عرض الحساب",
    confirm_hisaab: "تأكيد الطلب",
    checkout_locked: "لازم تطلب تفعيل الحساب عشان تطلب بالدين.",
    request_access: "طلب تفعيل الحساب",
    catalog: "أرفف الدكان",
    verified: "دكان موثق",
    empty_farij: "لا توجد دكاكين مسجلة في منطقتك حالياً."
  }
};

export default function CustomerDashboard({ user, lang, setActiveTab }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';

  // 1. Fetch Stores and Application Status
  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqalas/nearby`, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      setStores(res.data || []);
    } catch (e) {
      console.error("Neighborhood fetch failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, [user.id]);

  // 2. Actions
  const handleApplyHisaab = async (storeId) => {
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/hisaab/apply`, { 
        baqala_id: storeId 
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      // Refresh to update UI to 'pending'
      fetchStores();
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.pending_hisaab);
    } catch (e) {
      alert("Application failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
  };

  const handleCheckout = async () => {
    if (!selectedStore?.isApproved) return;
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/hisaab/checkout`, {
        baqala_id: selectedStore.id,
        items: cart
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      
      setCart([]);
      setShowCart(false);
      setSelectedStore(null);
      setActiveTab('hisaab'); // Send user to ledger view
    } catch (e) {
      alert("Ledger sync failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading && stores.length === 0) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Neighborhood...</p>
    </div>
  );

  return (
    <div className="px-5">
      {!selectedStore ? (
        /* --- LIST VIEW --- */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20`} size={20} />
            <input 
              className={`input-modern w-full ${isRTL ? 'pr-12 text-right' : 'pl-12 text-left'} !py-4`}
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px]">{t.nearby}</h3>
            <LayoutGrid size={14} className="text-white/10" />
          </div>

          <div className="space-y-4">
            {stores.length === 0 && <div className="text-center py-20 text-white/20 text-xs italic">{t.empty_farij}</div>}
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStore(store)}
                className="glass-card !p-0 overflow-hidden border-white/5"
              >
                <div className="h-32 w-full bg-white/5 flex items-center justify-center">
                    <Store size={32} className="text-teal-400 opacity-20" />
                </div>
                <div className="p-5 flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-black italic">{store.name}</h4>
                    <p className="text-teal-400 text-[9px] font-bold uppercase mt-1">{t.open}</p>
                  </div>
                  {store.isApproved && <CheckCircle2 size={18} className="text-teal-400" />}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* --- STORE VIEW --- */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
          <button 
            onClick={() => setSelectedStore(null)} 
            className="flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6 active:opacity-50"
          >
            <ChevronLeft size={14}/> {t.back}
          </button>

          <div className="glass-card !p-6 mb-8">
            <div className="flex justify-between items-center">
               <div>
                  <h2 className="text-3xl font-black italic mb-1">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase">{t.verified}</span>
                  </div>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl"><MapPin size={24} className="text-teal-400" /></div>
            </div>
          </div>

          {/* HISAAB STATUS */}
          {!selectedStore.isApproved && (
            <div className="glass-card !p-6 border-orange-500/20 bg-orange-500/[0.03] mb-8">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><Lock size={20}/></div>
                  <p className="font-black text-xs uppercase italic leading-tight">{t.checkout_locked}</p>
               </div>
               <button 
                 onClick={() => handleApplyHisaab(selectedStore.id)} 
                 disabled={selectedStore.isPending || isActionLoading}
                 className="w-full py-4 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase"
               >
                 {selectedStore.isPending ? t.pending_hisaab : t.request_access}
               </button>
            </div>
          )}

          {/* INVENTORY GRID */}
          <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px] mb-4 px-1">{t.catalog}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedStore.inventory || []).map(item => (
              <div key={item.id} className="glass-card !p-4">
                <div className="w-full aspect-square bg-white/5 rounded-xl mb-3 flex items-center justify-center text-2xl">🛍️</div>
                <h5 className="font-black text-[11px] leading-tight mb-3 h-8 line-clamp-2 italic">{item.name}</h5>
                <div className="flex items-center justify-between">
                  <p className="text-teal-400 font-black text-sm">AED {item.price}</p>
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center active:scale-90"
                  >
                    <Plus size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* FLOATING CART (HISAAB COMMIT) */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-5 z-50">
            <button onClick={() => setShowCart(true)} className="w-full btn-primary flex justify-between items-center px-8 !py-6">
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <span className="font-black italic uppercase text-xs">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/20 px-4 py-1.5 rounded-xl text-sm font-black tracking-tighter">
                AED {cart.reduce((s,i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CART MODAL */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <div onClick={() => setShowCart(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-8 border-t border-white/10 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase">Your Tab</h2>
                <button onClick={() => setCart([])} className="p-2 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={20}/></button>
              </div>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-8">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                       <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center font-black text-[10px]">{item.qty}x</span>
                       <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <span className="text-teal-400 font-black text-sm">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {!selectedStore?.isApproved ? (
                <div className="p-4 bg-orange-500/10 rounded-2xl flex items-center gap-3 text-orange-400 mb-6">
                    <AlertCircle size={20}/>
                    <p className="text-[10px] font-bold uppercase">{t.checkout_locked}</p>
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  disabled={isActionLoading}
                  className="btn-primary w-full !py-6"
                >
                  {isActionLoading ? <RefreshCw className="animate-spin" /> : t.confirm_hisaab}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
