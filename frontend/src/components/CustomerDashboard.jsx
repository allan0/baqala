// ================================================
// frontend/src/components/CustomerDashboard.jsx
// VERSION 18 (FULL RESTORATION & Hub NAVIGATION)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, Search, MessageCircle, Sparkles, 
  Plus, Trash2, Lock, CheckCircle2, ChevronRight, 
  ChevronLeft, Store, LayoutGrid, RefreshCw, AlertCircle,
  ArrowRight, ShoppingBag, Zap, UserPlus
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    search: "Search neighborhood stores...",
    nearby: "THE Hub (NEIGHBORHOOD)",
    open: "Active Now",
    back: "Back to Hub",
    apply_hisaab: "Open Hisaab Tab",
    pending_hisaab: "Approval Pending",
    approved_hisaab: "Trusted neighbor",
    chat_merchant: "Chat Baqala",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "Review Tab",
    confirm_hisaab: "Commit to Ledger",
    checkout_locked: "Identity required for credit.",
    guest_msg: "Link your identity in the Profile tab to enable shopping on credit.",
    catalog: "Store Shelves",
    verified: "Verified Merchant",
    empty_hub: "No stores registered in this farij yet."
  },
  ar: {
    search: "دور على دكان بالفريج...",
    nearby: "دكاكين فريجنا",
    open: "نشط الآن",
    back: "رجوع للمركز",
    apply_hisaab: "فتح حساب دين",
    pending_hisaab: "قيد المراجعة",
    approved_hisaab: "جار موثوق",
    chat_merchant: "كلم راعي الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "مراجعة الطلب",
    confirm_hisaab: "تأكيد الطلب",
    checkout_locked: "يجب إثبات الهوية للطلب بالدين.",
    guest_msg: "اربط هويتك من صفحة 'ملفي' لتتمكن من استخدام حساب الدين.",
    catalog: "أرفف الدكان",
    verified: "دكان موثق",
    empty_hub: "لا توجد دكاكين مسجلة في فريجكم حالياً."
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
  
  // Identity Check: Is this a Guest or a linked User?
  const isGuest = !user?.telegram_id && !user?.email;

  // 1. Discovery Engine: Fetch stores from the Grid
  const fetchNeighborhood = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqalas/nearby`, {
        headers: { 
          auth_id: user?.id, 
          telegram_id: user?.telegram_id 
        }
      });
      setStores(res.data || []);
    } catch (e) {
      console.error("Discovery error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNeighborhood(); }, [user?.id]);

  // 2. Identity Guard logic
  const handleProtectedAction = (callback) => {
    if (isGuest) {
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      alert(t.checkout_locked);
      setActiveTab('profile'); // Send them to the Me tab to link Gmail
      return;
    }
    callback();
  };

  const handleApply = async (storeId) => {
    handleProtectedAction(async () => {
      setIsActionLoading(true);
      try {
        await axios.post(`${API_URL}/api/hisaab/apply`, { baqala_id: storeId }, {
          headers: { auth_id: user.id, telegram_id: user.telegram_id }
        });
        fetchNeighborhood(); // Refresh statuses
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
      } catch (e) { alert("Application failed."); }
      finally { setIsActionLoading(false); }
    });
  };

  const handleCheckout = async () => {
    handleProtectedAction(async () => {
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
        setActiveTab('hisaab'); // Redirect to ledger view
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
      } catch (e) { alert("Checkout failed."); }
      finally { setIsActionLoading(false); }
    });
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
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
        /* --- VIEW: NEIGHBORHOOD DISCOVERY --- */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20`} size={20} />
            <input 
              className={`input-modern w-full ${isRTL ? 'pr-12' : 'pl-12'} !py-5 !rounded-[24px]`}
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[4px]">{t.nearby}</h3>
            <LayoutGrid size={14} className="text-white/10" />
          </div>

          <div className="space-y-4">
            {stores.length === 0 && <div className="text-center py-20 text-white/10 text-xs italic uppercase tracking-widest">{t.empty_hub}</div>}
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStore(store)}
                className="glass-card !p-0 overflow-hidden border-white/5 relative group bg-gradient-to-tr from-white/[0.03] to-transparent"
              >
                <div className="h-36 w-full bg-white/5 flex items-center justify-center relative">
                    <Store size={48} className="text-teal-400 opacity-20 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-6 flex justify-between items-center relative z-10">
                  <div>
                    <h4 className="text-2xl font-black italic tracking-tight mb-2">{store.name}</h4>
                    <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" /> {t.open}
                    </p>
                  </div>
                  {store.isApproved ? (
                    <div className="w-11 h-11 rounded-full bg-teal-400/10 flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-lg">
                        <CheckCircle2 size={24} />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white/10 border border-white/10">
                        <ChevronRight size={22} className={isRTL ? 'rotate-180' : ''} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* --- VIEW: STORE DETAIL & INVENTORY --- */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
          <button 
            onClick={() => setSelectedStore(null)} 
            className={`flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-8 active:scale-95 transition-transform ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>} {t.back}
          </button>

          <div className="glass-card !p-8 mb-10 border-teal-400/20 relative overflow-hidden bg-gradient-to-br from-teal-400/5 to-transparent shadow-2xl">
            <div className="absolute -right-4 -top-4 text-teal-400/5 rotate-12"><Store size={140}/></div>
            <div className="flex justify-between items-center relative z-10">
               <div>
                  <h2 className="text-4xl font-black italic mb-2 tracking-tighter leading-tight">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.verified}</span>
                  </div>
               </div>
               <div className="p-4 bg-black/40 rounded-full border border-white/10 shadow-inner"><MapPin size={28} className="text-teal-400" /></div>
            </div>
          </div>

          {/* HISAAB LOCK BANNER */}
          {!selectedStore.isApproved && (
            <div className="glass-card !p-8 border-orange-500/20 bg-orange-500/[0.02] mb-10 shadow-xl overflow-hidden relative">
               <Zap size={80} className="absolute -left-4 -top-4 text-orange-500/5 rotate-12" />
               <div className="flex items-start gap-5 mb-6 relative z-10">
                  <div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner shrink-0">
                    <Lock size={24}/>
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase italic text-white/90 leading-tight mb-1">{t.checkout_locked}</p>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter leading-relaxed">
                       {isGuest ? t.guest_msg : 'Open a trusted credit line with ra\'i al-baqala to enable checkout.'}
                    </p>
                  </div>
               </div>
               {isGuest ? (
                 <button onClick={() => setActiveTab('profile')} className="w-full py-4 bg-white text-black rounded-[20px] text-[11px] font-black uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-white/5">
                    Link Neighborhood Identity <ArrowRight size={16}/>
                 </button>
               ) : (
                 <button 
                    onClick={() => handleApply(selectedStore.id)} 
                    disabled={selectedStore.isPending || isActionLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-[20px] text-[11px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    {selectedStore.isPending ? t.pending_hisaab : t.apply_hisaab}
                 </button>
               )}
            </div>
          )}

          {/* SHELVES GRID */}
          <div className="flex items-center justify-between mb-6 px-1">
             <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[4px]">{t.catalog}</h3>
             <ShoppingBag size={14} className="text-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            {(selectedStore.inventory || []).length === 0 ? (
               <div className="col-span-2 py-12 text-center text-white/10 text-[10px] font-black uppercase tracking-[5px] italic">Private Shelves</div>
            ) : (
              selectedStore.inventory.map(item => (
                <div key={item.id} className="glass-card !p-5 border-white/5 flex flex-col justify-between hover:border-white/20 transition-all group">
                  <div>
                    <div className="w-full aspect-square bg-black/40 rounded-[28px] mb-4 flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-105 transition-transform duration-500">🛍️</div>
                    <h5 className="font-black text-[12px] leading-tight mb-4 h-10 line-clamp-2 italic text-white/90 px-1">{item.name}</h5>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <p className="text-teal-400 font-black text-sm tracking-tighter">AED {parseFloat(item.price).toFixed(2)}</p>
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-10 h-10 rounded-full bg-teal-400 text-black flex items-center justify-center active:scale-90 shadow-lg shadow-teal-400/20 transition-all hover:rotate-12"
                    >
                      <Plus size={20} strokeWidth={3}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* FLOAT: REVIEW CART */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-6 z-50">
            <button onClick={() => setShowCart(true)} className="w-full btn-primary flex justify-between items-center px-8 !py-6 !rounded-full shadow-2xl">
              <div className="flex items-center gap-4">
                <ShoppingCart size={24} />
                <span className="font-black italic uppercase text-xs tracking-widest">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/20 px-5 py-2 rounded-full text-sm font-black border border-white/10 tracking-tighter italic">
                AED {cart.reduce((s,i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CHECKOUT COMMIT */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[50px] p-8 pb-12 border-t border-white/10 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gradient">Your Farij Tab</h2>
                <button onClick={() => setCart([])} className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/10 active:scale-90 transition-all"><Trash2 size={24}/></button>
              </div>
              
              <div className="space-y-5 max-h-[35vh] overflow-y-auto mb-12 pr-2 scrollbar-hide">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-5">
                    <div className="flex items-center gap-5">
                       <span className="w-11 h-11 bg-teal-400/10 rounded-full flex items-center justify-center font-black text-sm text-teal-400 border border-teal-400/20">{item.qty}x</span>
                       <span className="font-bold text-base text-white/90">{item.name}</span>
                    </div>
                    <span className="text-teal-400 font-black text-base">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {!selectedStore?.isApproved ? (
                <div className="p-6 bg-orange-500/10 rounded-[32px] flex flex-col gap-3 text-orange-500 border border-orange-500/10 mb-2 text-center shadow-inner">
                    <div className="flex items-center justify-center gap-3">
                        <AlertCircle size={22}/>
                        <p className="text-xs font-black uppercase tracking-widest">{t.checkout_locked}</p>
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter leading-relaxed">
                       {isGuest ? t.guest_msg : 'Merchant approval is required to commit orders to your neighborhood ledger.'}
                    </p>
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  disabled={isActionLoading || cart.length === 0}
                  className="btn-primary w-full !py-6 !rounded-full text-xl shadow-[0_20px_40px_rgba(0,245,212,0.2)]"
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
