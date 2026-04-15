// ================================================
// frontend/src/components/CustomerDashboard.jsx
// VERSION 19 (FULL Hub RESTORATION & IDENTITY GUARD)
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
    nearby: "NEIGHBORHOOD Hub",
    open: "Active Now",
    back: "Back to Hub",
    apply_hisaab: "Open Hisaab Tab",
    pending_hisaab: "Approval Pending",
    approved_hisaab: "Trusted neighbor",
    chat_merchant: "Chat راعي الدكان",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "Review Tab",
    confirm_hisaab: "Commit to Ledger",
    checkout_locked: "Identity Required",
    guest_msg: "Link your identity in the Profile tab to enable credit shopping.",
    catalog: "Store Shelves",
    verified: "Verified Baqala",
    empty_hub: "No stores registered in this farij yet."
  },
  ar: {
    search: "دور على دكان بالفريج...",
    nearby: "دكاكين فريجنا",
    open: "نشط الآن",
    back: "رجوع",
    apply_hisaab: "فتح حساب دين",
    pending_hisaab: "قيد المراجعة",
    approved_hisaab: "جار موثوق",
    chat_merchant: "كلم راعي الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "مراجعة الطلب",
    confirm_hisaab: "تأكيد الطلب",
    checkout_locked: "يجب إثبات الهوية",
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
  
  // Identity Status: Guests (Web without login) vs Linked Users
  const isGuest = !user?.telegram_id && !user?.email;

  // 1. Fetch Real Data from the Network
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
  const checkIdentity = () => {
    if (isGuest) {
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      alert(t.checkout_locked + ": " + t.guest_msg);
      setActiveTab('profile'); // Send them to the Me tab to upgrade
      return false;
    }
    return true;
  };

  const handleApply = async (storeId) => {
    if (!checkIdentity()) return;
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/hisaab/apply`, { baqala_id: storeId }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      fetchNeighborhood();
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Application failed."); }
    finally { setIsActionLoading(false); }
  };

  const handleCheckout = async () => {
    if (!checkIdentity()) return;
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
      setActiveTab('hisaab'); 
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Checkout failed."); }
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

  if (isLoading && stores.length === 0) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing neighborhood...</p>
    </div>
  );

  return (
    <div className={`px-5 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {!selectedStore ? (
        /* --- Hub DISCOVERY VIEW --- */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-white/20`} size={20} />
            <input 
              className={`input-modern w-full ${isRTL ? 'pr-12' : 'pl-12'} !py-5 !rounded-full !bg-white/[0.02] border-white/5`}
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[4px]">{t.nearby}</h3>
            <LayoutGrid size={14} className="text-white/10" />
          </div>

          <div className="space-y-4">
            {stores.length === 0 && <div className="text-center py-20 text-white/10 text-[10px] font-black uppercase tracking-widest">{t.empty_hub}</div>}
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStore(store)}
                className="glass-card !p-0 overflow-hidden border-white/5 relative group bg-gradient-to-tr from-white/[0.03] to-transparent shadow-xl rounded-[32px]"
              >
                <div className="h-40 w-full bg-black/40 flex items-center justify-center relative overflow-hidden">
                    <Store size={56} className="text-teal-400 opacity-20 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent opacity-80" />
                </div>
                <div className="p-6 flex justify-between items-center relative z-10">
                  <div>
                    <h4 className="text-2xl font-black italic tracking-tight mb-2 leading-none">{store.name}</h4>
                    <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" /> {t.open}
                    </p>
                  </div>
                  {store.isApproved ? (
                    <div className="w-12 h-12 rounded-full bg-teal-400/10 flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-lg shadow-teal-400/10">
                        <CheckCircle2 size={26} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/10 border border-white/10 group-hover:bg-white/10 transition-colors">
                        <ChevronRight size={24} className={isRTL ? 'rotate-180' : ''} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* --- STORE Hub VIEW --- */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
          <button 
            onClick={() => setSelectedStore(null)} 
            className={`flex items-center gap-2 text-teal-400 text-[11px] font-black uppercase mb-8 active:scale-95 transition-transform ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>} {t.back}
          </button>

          <div className="glass-card !p-8 mb-10 border-teal-400/20 relative overflow-hidden bg-gradient-to-br from-teal-400/5 to-transparent shadow-2xl rounded-[40px]">
            <div className="absolute -right-6 -top-6 text-teal-400/5 rotate-12"><Store size={180}/></div>
            <div className="flex justify-between items-center relative z-10">
               <div>
                  <h2 className="text-4xl font-black italic mb-3 tracking-tighter leading-tight text-white">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} className="text-blue-400 shadow-xl" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.verified}</span>
                  </div>
               </div>
               <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center border border-white/10 shadow-2xl shrink-0"><MapPin size={32} className="text-teal-400" /></div>
            </div>
          </div>

          {/* HISAAB STATUS SECTION */}
          {!selectedStore.isApproved && (
            <div className="glass-card !p-8 border-orange-500/20 bg-orange-500/[0.02] mb-10 shadow-xl rounded-[32px] overflow-hidden relative">
               <Zap size={100} className="absolute -left-6 -top-6 text-orange-500/5 rotate-12" />
               <div className="flex items-start gap-6 mb-8 relative z-10">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner shrink-0">
                    <Lock size={28}/>
                  </div>
                  <div>
                    <p className="font-black text-base uppercase italic text-white/90 leading-tight mb-1.5">{t.checkout_locked}</p>
                    <p className="text-[11px] text-white/30 font-medium leading-relaxed">
                       {isGuest ? t.guest_msg : 'Commit your orders directly to the digital ledger after merchant verification.'}
                    </p>
                  </div>
               </div>
               {isGuest ? (
                 <button onClick={() => setActiveTab('profile')} className="w-full py-5 bg-white text-black rounded-full text-[11px] font-black uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-white/5">
                    Link Identity Hub <ArrowRight size={18} strokeWidth={3}/>
                 </button>
               ) : (
                 <button 
                    onClick={() => handleApply(selectedStore.id)} 
                    disabled={selectedStore.isPending || isActionLoading}
                    className="w-full py-5 bg-orange-500 text-white rounded-full text-[11px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    {selectedStore.isPending ? t.pending_hisaab : t.apply_hisaab}
                 </button>
               )}
            </div>
          )}

          {/* CATALOG / SHELVES */}
          <div className="flex items-center justify-between mb-8 px-2">
             <h3 className="text-[12px] font-black text-white/30 uppercase tracking-[5px]">{t.catalog}</h3>
             <ShoppingBag size={18} className="text-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {(selectedStore.inventory || []).length === 0 ? (
               <div className="col-span-2 py-16 text-center text-white/5 text-[11px] font-black uppercase tracking-[8px] italic border border-dashed border-white/5 rounded-[40px]">Private Shelves</div>
            ) : (
              selectedStore.inventory.map(item => (
                <div key={item.id} className="glass-card !p-6 border-white/5 flex flex-col justify-between hover:border-teal-400/20 transition-all group rounded-[32px] bg-white/[0.01]">
                  <div>
                    <div className="w-full aspect-square bg-black/60 rounded-full mb-6 flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">🛍️</div>
                    <h5 className="font-black text-[13px] leading-tight mb-5 h-10 line-clamp-2 italic text-white/90 px-1">{item.name}</h5>
                  </div>
                  <div className="flex items-center justify-between pt-5 border-t border-white/5">
                    <p className="text-teal-400 font-black text-base tracking-tighter italic">AED {parseFloat(item.price).toFixed(2)}</p>
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-12 h-12 rounded-full bg-teal-400 text-black flex items-center justify-center active:scale-90 shadow-2xl shadow-teal-400/30 transition-all hover:bg-white"
                    >
                      <Plus size={24} strokeWidth={4}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* FLOAT ACTION: CART PREVIEW */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 120, scale: 0.8 }} animate={{ y: 0, scale: 1 }} exit={{ y: 120, scale: 0.8 }} className="fixed bottom-28 left-0 right-0 px-8 z-50">
            <button onClick={() => setShowCart(true)} className="w-full btn-primary flex justify-between items-center px-10 !py-7 !rounded-full shadow-[0_20px_50px_rgba(0,245,212,0.3)]">
              <div className="flex items-center gap-5">
                <ShoppingCart size={28} />
                <span className="font-black italic uppercase text-sm tracking-widest">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/40 px-6 py-2.5 rounded-full text-base font-black border border-white/10 tracking-tighter italic">
                AED {cart.reduce((s,i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CHECKOUT COMMITMENT */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 30, stiffness: 200 }} className="relative w-full max-w-[500px] bg-[#0a0a0f] rounded-t-[60px] p-10 pb-14 border-t border-white/10 flex flex-col shadow-[0_-30px_100px_rgba(0,0,0,0.8)]">
              <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Your Tab</h2>
                <button onClick={() => setCart([])} className="p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/10 active:scale-90 transition-all"><Trash2 size={28}/></button>
              </div>
              
              <div className="space-y-6 max-h-[40vh] overflow-y-auto mb-12 pr-4 scrollbar-hide">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="flex items-center gap-6">
                       <span className="w-12 h-12 bg-teal-400/10 rounded-full flex items-center justify-center font-black text-base text-teal-400 border border-teal-400/20">{item.qty}x</span>
                       <span className="font-bold text-lg text-white/90">{item.name}</span>
                    </div>
                    <span className="text-teal-400 font-black text-lg italic">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {!selectedStore?.isApproved ? (
                <div className="p-8 bg-orange-500/10 rounded-[40px] flex flex-col gap-4 text-orange-500 border border-orange-500/20 mb-4 text-center shadow-inner">
                    <div className="flex items-center justify-center gap-4">
                        <AlertCircle size={28}/>
                        <p className="text-sm font-black uppercase tracking-[3px]">{t.checkout_locked}</p>
                    </div>
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                       {isGuest ? t.guest_msg : 'Baqala owner approval required for digital credit settlements.'}
                    </p>
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  disabled={isActionLoading || cart.length === 0}
                  className="btn-primary w-full !py-7 !rounded-full text-2xl shadow-[0_25px_60px_rgba(0,245,212,0.2)]"
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
