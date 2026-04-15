// ================================================
// frontend/src/components/CustomerDashboard.jsx
// VERSION 16 (PRODUCTION RESIDENT HUB)
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
    nearby: "NEIGHBORHOOD STORES",
    open: "Active Hub",
    back: "Back to Farij",
    apply_hisaab: "Open Hisaab",
    pending_hisaab: "Request Pending",
    approved_hisaab: "Trusted Neighbor",
    chat_merchant: "Message Baqala",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "Review Hisaab",
    confirm_hisaab: "Confirm Order",
    checkout_locked: "Merchant approval required to shop on credit.",
    request_access: "Request Credit Access",
    catalog: "Store Shelves",
    verified: "Verified Merchant",
    empty_farij: "No stores registered in this farij yet."
  },
  ar: {
    search: "دور على دكان بالفريج...",
    nearby: "دكاكين فريجنا",
    open: "متوفر الآن",
    back: "رجوع للفريج",
    apply_hisaab: "فتح حساب",
    pending_hisaab: "قيد المراجعة",
    approved_hisaab: "جار موثوق",
    chat_merchant: "مراسلة الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "مراجعة الحساب",
    confirm_hisaab: "تأكيد الطلب",
    checkout_locked: "لازم يوافق راعي الدكان أولاً عشان تطلب بالدين.",
    request_access: "طلب تفعيل الحساب",
    catalog: "أرفف الدكان",
    verified: "دكان موثق",
    empty_farij: "لا توجد دكاكين مسجلة في فريجكم حالياً."
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

  // 1. Fetch real stores and user's trust status (Hisaab Application)
  const fetchNeighborhood = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqalas/nearby`, {
        headers: { 
          auth_id: user.id, 
          telegram_id: user.telegram_id 
        }
      });
      setStores(res.data || []);
    } catch (e) {
      console.error("Neighborhood Sync Failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNeighborhood(); }, [user.id]);

  // 2. Action Handlers
  const handleApply = async (storeId) => {
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/hisaab/apply`, { baqala_id: storeId }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      fetchNeighborhood(); // Refresh statuses
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Application error."); }
    finally { setIsActionLoading(false); }
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
    if (!selectedStore?.isApproved || cart.length === 0) return;
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
      setActiveTab('hisaab'); // Redirect to ledger
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Checkout failed."); }
    finally { setIsActionLoading(false); }
  };

  if (isLoading && stores.length === 0) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Mapping Neighborhood...</p>
    </div>
  );

  return (
    <div className={`px-5 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {!selectedStore ? (
        /* --- LIST VIEW: NEIGHBORHOOD DISCOVERY --- */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20`} size={20} />
            <input 
              className={`input-modern w-full ${isRTL ? 'pr-12' : 'pl-12'} !py-4`}
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">{t.nearby}</h3>
            <LayoutGrid size={14} className="text-white/10" />
          </div>

          <div className="space-y-4">
            {stores.length === 0 && <div className="text-center py-20 text-white/10 text-xs italic uppercase tracking-widest">{t.empty_farij}</div>}
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStore(store)}
                className="glass-card !p-0 overflow-hidden border-white/5 group"
              >
                <div className="h-32 w-full bg-white/5 flex items-center justify-center group-hover:bg-teal-400/5 transition-colors">
                    <Store size={40} className="text-teal-400 opacity-20" />
                </div>
                <div className="p-5 flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-black italic tracking-tight">{store.name}</h4>
                    <p className="text-teal-400 text-[9px] font-black uppercase mt-1 tracking-widest">{t.open}</p>
                  </div>
                  {store.isApproved ? (
                    <CheckCircle2 size={22} className="text-teal-400 drop-shadow-[0_0_8px_rgba(0,245,212,0.5)]" />
                  ) : (
                    <ChevronRight size={20} className="text-white/10" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* --- STORE VIEW: SHELVES & CHECKOUT --- */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
          <button 
            onClick={() => setSelectedStore(null)} 
            className="flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={14}/> {t.back}
          </button>

          <div className="glass-card !p-6 mb-8 border-teal-400/20 bg-gradient-to-tr from-teal-400/5 to-transparent">
            <div className="flex justify-between items-center">
               <div>
                  <h2 className="text-3xl font-black italic mb-1 tracking-tighter">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{t.verified}</span>
                  </div>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-xl"><MapPin size={24} className="text-teal-400" /></div>
            </div>
          </div>

          {/* HISAAB APPLICATION BANNER */}
          {!selectedStore.isApproved && (
            <div className="glass-card !p-6 border-orange-500/20 bg-orange-500/[0.03] mb-8">
               <div className="flex items-center gap-4 mb-5">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><Lock size={20}/></div>
                  <p className="font-black text-xs uppercase italic leading-tight text-white/80">{t.checkout_locked}</p>
               </div>
               <button 
                 onClick={() => handleApply(selectedStore.id)} 
                 disabled={selectedStore.isPending || isActionLoading}
                 className="w-full py-4 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
               >
                 {selectedStore.isPending ? t.pending_hisaab : t.request_access}
               </button>
            </div>
          )}

          {/* CATALOG / SHELVES */}
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[3px] mb-5 px-1">{t.catalog}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedStore.inventory || []).length === 0 ? (
               <div className="col-span-2 py-10 text-center text-white/10 text-[10px] font-black uppercase tracking-widest">No items on shelves yet.</div>
            ) : (
              selectedStore.inventory.map(item => (
                <div key={item.id} className="glass-card !p-4 border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-full aspect-square bg-black/20 rounded-xl mb-4 flex items-center justify-center text-3xl shadow-inner">🛍️</div>
                  <h5 className="font-black text-[11px] leading-tight mb-3 h-8 line-clamp-2 italic">{item.name}</h5>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <p className="text-teal-400 font-black text-sm tracking-tighter">AED {parseFloat(item.price).toFixed(2)}</p>
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all text-teal-400 hover:bg-teal-400 hover:text-black"
                    >
                      <Plus size={18}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* FLOATING ACTION: REVIEW TAB */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-5 z-50">
            <button onClick={() => setShowCart(true)} className="w-full btn-primary flex justify-between items-center px-8 !py-6 shadow-[0_10px_30px_rgba(0,245,212,0.3)]">
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <span className="font-black italic uppercase text-xs tracking-wider">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/20 px-4 py-1.5 rounded-xl text-sm font-black tracking-tighter border border-white/5">
                AED {cart.reduce((s,i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: HISAAB COMMITMENT */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-8 pb-12 border-t border-white/10 flex flex-col shadow-2xl">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase tracking-tight">Your Farij Tab</h2>
                <button onClick={() => setCart([])} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/10"><Trash2 size={20}/></button>
              </div>
              
              <div className="space-y-4 max-h-[35vh] overflow-y-auto mb-10 pr-2 scrollbar-hide">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                       <span className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center font-black text-xs text-teal-400 border border-white/5">{item.qty}x</span>
                       <span className="font-bold text-sm text-white/90">{item.name}</span>
                    </div>
                    <span className="text-teal-400 font-black text-sm">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {!selectedStore?.isApproved ? (
                <div className="p-5 bg-orange-500/10 rounded-2xl flex items-center gap-4 text-orange-400 border border-orange-500/10 mb-2">
                    <AlertCircle size={22} className="flex-shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{t.checkout_locked}</p>
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  disabled={isActionLoading || cart.length === 0}
                  className="btn-primary w-full !py-6 text-lg shadow-xl shadow-teal-400/20"
                >
                  {isActionLoading ? <RefreshCw className="animate-spin mx-auto" /> : t.confirm_hisaab}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
