// ================================================
// frontend/src/components/CustomerDashboard.jsx
// VERSION 17 (FULL RESTORATION & IDENTITY GUARD)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, Search, MessageCircle, Sparkles, 
  Plus, Trash2, Lock, CheckCircle2, ChevronRight, 
  ChevronLeft, Store, LayoutGrid, RefreshCw, AlertCircle,
  UserPlus, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    search: "Search neighborhood stores...",
    nearby: "NEIGHBORHOOD HUB",
    open: "Open 24/7",
    back: "Back to Map",
    apply_hisaab: "Open Hisaab Tab",
    pending_hisaab: "Access Pending",
    approved_hisaab: "Trusted Resident",
    chat_merchant: "Chat راعي الدكان",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "Review Order",
    confirm_hisaab: "Commit to Ledger",
    checkout_locked: "Identity required to shop on credit.",
    guest_msg: "Link your identity in Profile to enable credit.",
    catalog: "Store Shelves",
    verified: "Verified Merchant",
    empty: "No baqalas found in this farij yet."
  },
  ar: {
    search: "دور على دكان بالفريج...",
    nearby: "دكاكين فريجنا",
    open: "مفتوح ٢٤ ساعة",
    back: "رجوع",
    apply_hisaab: "فتح حساب دين",
    pending_hisaab: "قيد المراجعة",
    approved_hisaab: "جار موثوق",
    chat_merchant: "كلم راعي الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "مراجعة الطلب",
    confirm_hisaab: "تأكيد الطلب",
    checkout_locked: "يجب تسجيل الدخول للطلب بالدين.",
    guest_msg: "اربط حسابك من صفحة 'ملفي' لتفعيل الحساب.",
    catalog: "أرفف الدكان",
    verified: "دكان موثق",
    empty: "لا توجد دكاكين مسجلة في الفريج حالياً."
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
  const isGuest = !user?.telegram_id && !user?.email;

  // 1. Fetch real neighborhood data
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
      console.error("Discovery error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNeighborhood(); }, [user?.id]);

  // 2. Identity Guard logic
  const checkIdentity = () => {
    if (isGuest) {
      WebApp?.showAlert?.(t.checkout_locked);
      setActiveTab('profile'); // Send them to link Gmail/Telegram
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
    } catch (e) { alert("Request failed."); }
    finally { setIsActionLoading(false); }
  };

  const handleCheckout = async () => {
    if (!checkIdentity()) return;
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
      setActiveTab('hisaab');
    } catch (e) { alert("Checkout failure."); }
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
      <p className="text-[10px] font-black uppercase tracking-[3px]">Mapping Grid...</p>
    </div>
  );

  return (
    <div className={`px-5 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {!selectedStore ? (
        /* --- VIEW 1: DISCOVERY --- */
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
            {stores.length === 0 && <div className="py-20 text-center text-white/10 text-xs italic uppercase">{t.empty}</div>}
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStore(store)}
                className="glass-card !p-0 overflow-hidden border-white/5 relative group"
              >
                <div className="h-36 w-full bg-white/5 flex items-center justify-center relative overflow-hidden">
                    <Store size={48} className="text-teal-400 opacity-20 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-5 flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-black italic tracking-tight leading-none mb-2">{store.name}</h4>
                    <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest">{t.open}</p>
                  </div>
                  {store.isApproved ? (
                    <div className="w-10 h-10 bg-teal-400/10 rounded-full flex items-center justify-center text-teal-400 border border-teal-400/20">
                        <CheckCircle2 size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/20 border border-white/10">
                        <ChevronRight size={20} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* --- VIEW 2: STORE DETAIL & SHELVES --- */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
          <button 
            onClick={() => setSelectedStore(null)} 
            className="flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6"
          >
            <ChevronLeft size={14}/> {t.back}
          </button>

          <div className="glass-card !p-6 mb-8 border-teal-400/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-teal-400/5 rotate-12"><Store size={120}/></div>
            <div className="flex justify-between items-center relative z-10">
               <div>
                  <h2 className="text-3xl font-black italic mb-1 tracking-tighter leading-none">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{t.verified}</span>
                  </div>
               </div>
               <div className="p-4 bg-white/5 rounded-full border border-white/10 shadow-2xl"><MapPin size={24} className="text-teal-400" /></div>
            </div>
          </div>

          {/* HISAAB STATUS / APPLY */}
          {!selectedStore.isApproved && (
            <div className="glass-card !p-6 border-orange-500/20 bg-orange-500/[0.03] mb-8 shadow-xl">
               <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/10"><Lock size={20}/></div>
                  <div>
                    <p className="font-black text-xs uppercase italic text-white/90">{t.checkout_locked}</p>
                    <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">{isGuest ? t.guest_msg : 'Application required'}</p>
                  </div>
               </div>
               {isGuest ? (
                 <button onClick={() => setActiveTab('profile')} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                    Link Identity <ArrowRight size={14}/>
                 </button>
               ) : (
                 <button 
                    onClick={() => handleApply(selectedStore.id)} 
                    disabled={selectedStore.isPending || isActionLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    {selectedStore.isPending ? t.pending_hisaab : t.apply_hisaab}
                 </button>
               )}
            </div>
          )}

          {/* CATALOG GRID */}
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[3px] mb-5 px-1">{t.catalog}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedStore.inventory || []).length === 0 ? (
               <div className="col-span-2 py-10 text-center text-white/5 text-[9px] font-black uppercase tracking-widest">Shelves are currently private.</div>
            ) : (
              selectedStore.inventory.map(item => (
                <div key={item.id} className="glass-card !p-4 border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="w-full aspect-square bg-black/40 rounded-[20px] mb-4 flex items-center justify-center text-3xl shadow-inner">🛍️</div>
                    <h5 className="font-black text-[11px] leading-tight mb-4 h-8 line-clamp-2 italic">{item.name}</h5>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-teal-400 font-black text-sm tracking-tighter">AED {parseFloat(item.price).toFixed(2)}</p>
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-9 h-9 rounded-xl bg-teal-400 text-black flex items-center justify-center active:scale-90 shadow-lg shadow-teal-400/20"
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

      {/* FLOAT ACTION: REVIEW TAB */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-5 z-50">
            <button onClick={() => setShowCart(true)} className="w-full btn-primary flex justify-between items-center px-8 !py-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <span className="font-black italic uppercase text-xs tracking-widest">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/20 px-4 py-1.5 rounded-xl text-sm font-black border border-white/5">
                AED {cart.reduce((s,i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: HISAAB ORDER COMMIT */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-8 pb-12 border-t border-white/10 flex flex-col shadow-2xl">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase tracking-tight">Neighborhood Tab</h2>
                <button onClick={() => setCart([])} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/10"><Trash2 size={20}/></button>
              </div>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-10 pr-2 scrollbar-hide">
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
                <div className="p-5 bg-orange-500/10 rounded-2xl flex flex-col gap-2 text-orange-400 border border-orange-500/10 mb-2 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <AlertCircle size={18}/>
                        <p className="text-[10px] font-black uppercase tracking-widest">{t.checkout_locked}</p>
                    </div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Your trust level is pending merchant approval.</p>
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  disabled={isActionLoading || cart.length === 0}
                  className="btn-primary w-full !py-6 text-lg"
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
