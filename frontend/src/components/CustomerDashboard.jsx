// ================================================
// frontend/src/components/CustomerDashboard.jsx
// VERSION 4.0 (Real Shelves + BQT Forecast + Geolocation)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, Search, MessageCircle, Sparkles, 
  Plus, Minus, Trash2, Lock, CheckCircle2, ChevronRight, 
  ChevronLeft, Store, LayoutGrid, RefreshCw, AlertCircle,
  ArrowRight, ShoppingBag, Zap, Navigation2
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL;

const loc = {
  en: {
    search: "Search neighborhood stores...",
    nearby: "Nearby Baqalas",
    explore: "Explore the Hub",
    open: "Active Hub",
    back: "Back to Map",
    apply: "Apply for Hisaab",
    pending: "Approval Pending",
    approved: "Trusted Neighbor",
    add_tab: "Add to Tab",
    view_tab: "Review Hisaab",
    commit: "Confirm & Earn BQT",
    forecast: "You will earn",
    verified: "Verified Merchant",
    empty: "No stores found in your street yet."
  },
  ar: {
    search: "بحث عن دكاكين فريجنا...",
    nearby: "دكاكين قريبة",
    explore: "استكشف المنطقة",
    open: "متوفر الآن",
    back: "رجوع للخريطة",
    apply: "فتح حساب دين",
    pending: "قيد الانتظار",
    approved: "جار موثوق",
    add_tab: "إضافة للحساب",
    view_tab: "مراجعة الطلب",
    commit: "تأكيد وكسب BQT",
    forecast: "ستحصل على",
    verified: "دكان موثق",
    empty: "لا توجد دكاكين مسجلة في منطقتك."
  }
};

export default function CustomerDashboard({ user, lang, setActiveTab }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]); // [{id, name, price, qty}]
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  const t = useMemo(() => loc[lang] || loc.en, [lang]);
  const isRTL = lang === 'ar';

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqalas/nearby`, {
        headers: { telegram_id: user?.telegram_id }
      });
      setStores(res.data || []);
    } catch (e) {
      console.error("Discovery error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, [user]);

  // Cart Management
  const updateQty = (item, delta) => {
    haptic('light');
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) return prev.filter(i => i.id !== item.id);
        return prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i);
      }
      if (delta > 0) return [...prev, { ...item, qty: 1 }];
      return prev;
    });
  };

  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + (i.price * i.qty), 0), [cart]);

  const handleCheckout = async () => {
    haptic('heavy');
    try {
      const res = await axios.post(`${API_URL}/api/hisaab/checkout`, {
        baqala_id: selectedStore.id,
        items: cart.map(i => ({ id: i.id, qty: i.qty }))
      }, {
        headers: { telegram_id: user.telegram_id }
      });

      if (res.data.success) {
        WebApp?.showAlert(`Tab Updated! +${res.data.bqtAwarded.toFixed(0)} BQT Earned.`);
        setCart([]);
        setShowCheckout(false);
        setSelectedStore(null);
        setActiveTab('hisaab');
      }
    } catch (e) {
      alert("Checkout failed. Please try again.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[4px]">Mapping Neighborhood...</p>
    </div>
  );

  return (
    <div className={`px-5 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {!selectedStore ? (
        /* VIEW: DISCOVERY MAP/LIST */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="relative pt-2">
            <Search className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-white/20`} size={20} />
            <input 
              className={`input-modern w-full ${isRTL ? 'pr-12' : 'pl-12'} !bg-white/[0.03] border-white/5`}
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[4px]">{t.nearby}</h3>
            <Navigation2 size={14} className="text-teal-400" />
          </div>

          <div className="space-y-4">
            {stores.length === 0 && <p className="text-center py-10 text-white/20 italic">{t.empty}</p>}
            {stores.map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => { haptic('medium'); setSelectedStore(store); }}
                className="glass-card !p-0 overflow-hidden border-white/5 bg-gradient-to-tr from-white/[0.02] to-transparent shadow-xl"
              >
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-black/60 rounded-2xl flex items-center justify-center text-3xl border border-white/5">🏪</div>
                    <div>
                      <h4 className="text-xl font-black italic text-white">{store.name}</h4>
                      <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest">{t.open}</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className={`text-white/10 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* VIEW: STORE SHELVES */
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-32">
          <button 
            onClick={() => setSelectedStore(null)} 
            className={`flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ChevronLeft size={16} /> {t.back}
          </button>

          <div className="glass-card !p-8 border-teal-400/20 bg-gradient-to-br from-teal-400/5 to-transparent mb-8">
            <h2 className="text-3xl font-black italic tracking-tighter mb-2">{selectedStore.name}</h2>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.verified}</span>
            </div>
          </div>

          {/* DYNAMIC INVENTORY */}
          <div className="grid grid-cols-2 gap-4">
            {(!selectedStore.inventory || selectedStore.inventory.length === 0) ? (
              <div className="col-span-2 py-20 text-center opacity-20 italic">No items listed yet.</div>
            ) : (
              selectedStore.inventory.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <div key={item.id} className="glass-card !p-5 flex flex-col justify-between border-white/5 hover:border-teal-400/20 transition-all">
                    <div>
                      <div className="w-full aspect-square bg-black/40 rounded-xl mb-4 flex items-center justify-center text-4xl shadow-inner">📦</div>
                      <h5 className="font-bold text-sm leading-tight text-white/90 h-10 line-clamp-2 italic">{item.name}</h5>
                      <p className="text-teal-400 font-black text-lg mt-2">AED {parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between bg-white/5 rounded-xl p-1">
                      {inCart ? (
                        <>
                          <button onClick={() => updateQty(item, -1)} className="w-8 h-8 flex items-center justify-center text-white/40"><Minus size={16}/></button>
                          <span className="font-black text-sm">{inCart.qty}</span>
                          <button onClick={() => updateQty(item, 1)} className="w-8 h-8 flex items-center justify-center text-teal-400"><Plus size={16}/></button>
                        </>
                      ) : (
                        <button 
                          onClick={() => updateQty(item, 1)}
                          className="w-full py-2 text-[10px] font-black uppercase tracking-tighter text-teal-400"
                        >
                          {t.add_tab}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {/* FLOAT: CART OVERLAY */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }} 
            exit={{ y: 100 }} 
            className="fixed bottom-28 left-0 right-0 px-6 z-50"
          >
            <button 
              onClick={() => setShowCheckout(true)}
              className="btn-primary w-full !py-6 flex justify-between items-center px-8 shadow-[0_20px_50px_rgba(0,245,212,0.4)]"
            >
              <div className="flex items-center gap-4">
                <ShoppingCart size={24} />
                <span className="font-black italic uppercase text-sm tracking-widest">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/20 px-4 py-1.5 rounded-full font-black text-lg italic">
                AED {cartTotal.toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCheckout(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              className="relative w-full max-w-[500px] bg-[#0a0a0f] rounded-t-[40px] border-t border-white/10 p-8 flex flex-col"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8" />
              <h3 className="text-3xl font-black italic tracking-tighter mb-8">Confirm Ledger Entry</h3>
              
              <div className="space-y-4 mb-8 max-h-60 overflow-y-auto scrollbar-hide">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="font-bold italic text-white/80">{item.qty}x {item.name}</span>
                    <span className="text-teal-400 font-black">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* BQT FORECAST */}
              <div className="bg-teal-400/10 border border-teal-400/20 rounded-2xl p-6 mb-8 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase text-teal-400 tracking-widest mb-1">{t.forecast}</p>
                   <p className="text-3xl font-black tracking-tighter text-teal-400">{cartTotal.toFixed(0)} BQT</p>
                </div>
                <Sparkles className="text-teal-400 animate-pulse" size={32} />
              </div>

              <button 
                onClick={handleCheckout}
                className="btn-primary w-full !py-6 !rounded-2xl text-xl shadow-2xl mb-4"
              >
                {t.commit}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
