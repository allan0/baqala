import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, ArrowLeft, Search, 
  MessageCircle, Sparkles, Plus, Trash2,
  Lock, CheckCircle2, ChevronRight, ChevronLeft, Store,
  LayoutGrid, RefreshCw, Smartphone, Send, AlertCircle
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";
const BOT_USERNAME = "Baqalas_bot"; // FIXED HANDLE

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    search: "Search local baqalas...",
    nearby: "THE NEIGHBORHOOD",
    open: "Open 24/7",
    back: "Back",
    apply_hisaab: "Apply for Hisaab",
    pending_hisaab: "Application Pending",
    approved_hisaab: "Trusted Resident",
    chat_merchant: "Chat راعي الدكان",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "View My Tab",
    confirm_hisaab: "Confirm Order",
    checkout_locked: "Hisaab access required for checkout.",
    request_access: "Request Credit Access",
    no_items: "Inventory is currently private.",
    catalog: "Baqala Catalog",
    verified: "Verified Hub"
  },
  ar: {
    search: "دور على دكان بالفريج...",
    nearby: "دكاكين فريجنا",
    open: "مفتوح ٢٤ ساعة",
    back: "رجوع",
    apply_hisaab: "تقديم طلب حساب",
    pending_hisaab: "الطلب قيد المراجعة",
    approved_hisaab: "حسابك مفعل",
    chat_merchant: "كلم راعي الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "عرض الحساب",
    confirm_hisaab: "تأكيد الطلب",
    checkout_locked: "لازم تطلب تفعيل الحساب عشان تطلب.",
    request_access: "طلب تفعيل الحساب",
    no_items: "البضاعة غير متوفرة حالياً.",
    catalog: "أرفف الدكان",
    verified: "دكان موثق"
  }
};

export default function CustomerDashboard({ user, lang, setActiveTab }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Media Carousel State
  const [imgIndex, setImgIndex] = useState(0);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const userId = user?.id?.toString() || 'guest_user';

  // --- DATA LOADING ---
  useEffect(() => {
    fetchStores();
  }, [userId]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/baqalas/nearby?user_id=${userId}`);
      setStores(res.data || []);
    } catch (e) {
      console.error("Network sync error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyHisaab = async (storeId) => {
    try {
      await axios.post(`${API_URL}/api/hisaab/apply`, { 
        telegram_id: userId, 
        baqala_id: storeId,
        name: user?.first_name || 'Resident'
      });
      // Instant UI feedback
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isPending: true } : s));
      if (selectedStore?.id === storeId) {
        setSelectedStore({ ...selectedStore, isPending: true });
      }
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.pending_hisaab);
    } catch (e) { alert("Failed to send request."); }
  };

  const openBotDeepLink = (storeId, mode) => {
    // deep link to @Baqalas_bot
    const link = `https://t.me/${BOT_USERNAME}?start=${mode}_${storeId}_${lang}`;
    if (WebApp?.openTelegramLink) WebApp.openTelegramLink(link);
    else window.open(link, '_blank');
  };

  const addToTab = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
  };

  const handleCheckout = async () => {
    if (!selectedStore?.isApproved) {
       if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.checkout_locked);
       return;
    }
    
    try {
      await axios.post(`${API_URL}/api/hisaab/checkout`, {
        telegram_id: userId,
        baqala_id: selectedStore.id,
        items: cart
      });
      setCart([]);
      setShowCart(false);
      setSelectedStore(null);
      setActiveTab('hisaab');
    } catch (e) { alert("Checkout error"); }
  };

  // --- MEDIA COMPONENT ---
  const VisualHeader = ({ item, mode = 'card' }) => {
    const images = item.images || [];
    
    if (images.length === 0) {
      return (
        <div className={`w-full bg-white/5 flex flex-col items-center justify-center relative ${mode === 'header' ? 'h-64' : 'h-32'}`}>
          <Store size={mode === 'header' ? 64 : 24} className="text-teal-400 opacity-20" />
          <p className="text-[7px] font-black uppercase tracking-[3px] opacity-10 mt-3">Baqala Digital Hub</p>
        </div>
      );
    }

    if (mode === 'header' && images.length > 1) {
      return (
        <div className="relative h-64 w-full bg-black overflow-hidden group">
          <motion.img 
            key={imgIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            src={images[imgIndex]} className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent opacity-60" />
          
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between">
            <button onClick={() => setImgIndex(p => p > 0 ? p - 1 : images.length - 1)} className="p-2 bg-black/40 backdrop-blur-xl rounded-full"><ChevronLeft/></button>
            <button onClick={() => setImgIndex(p => (p + 1) % images.length)} className="p-2 bg-black/40 backdrop-blur-xl rounded-full"><ChevronRight/></button>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === imgIndex ? 'w-4 bg-teal-400' : 'w-1 bg-white/20'}`} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`${mode === 'header' ? 'h-64' : 'h-32'} w-full overflow-hidden`}>
        <img src={images[0]} className="w-full h-full object-cover" />
      </div>
    );
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
        <div className="space-y-6">
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
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedStore(store); setImgIndex(0); }}
                className="glass-card !p-0 overflow-hidden relative group border-white/5"
              >
                <VisualHeader item={store} mode="card" />
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-black italic">{store.name}</h4>
                      <p className="text-teal-400 text-[9px] font-bold uppercase mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                        {t.open}
                      </p>
                    </div>
                    {store.isApproved && <CheckCircle2 size={18} className="text-teal-400" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* --- STORE VIEW --- */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
          <button 
            onClick={() => setSelectedStore(null)} 
            className={`flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6 active:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>} {t.back}
          </button>

          <div className="glass-card !p-0 overflow-hidden mb-8">
            <VisualHeader item={selectedStore} mode="header" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black italic">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{t.verified}</span>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl">
                   <MapPin size={24} className="text-teal-400" />
                </div>
              </div>

              {/* CHAT ACTIONS */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => openBotDeepLink(selectedStore.id, 'merchant')} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase">
                  <MessageCircle size={16} className="text-blue-400" /> {t.chat_merchant}
                </button>
                <button onClick={() => openBotDeepLink(selectedStore.id, 'ai')} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase">
                  <Sparkles size={16} className="text-purple-400" /> {t.ask_ai}
                </button>
              </div>
            </div>
          </div>

          {/* HISAAB UNLOCK BANNER */}
          {!selectedStore.isApproved && (
            <div className="glass-card !p-6 border-orange-500/20 bg-orange-500/[0.03] mb-8">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><Lock size={20}/></div>
                  <div>
                     <p className="font-black text-sm uppercase italic">{t.checkout_locked}</p>
                     <p className="text-[10px] text-white/40">Open inventory browsing enabled.</p>
                  </div>
               </div>
               {selectedStore.isPending ? (
                 <button className="w-full py-4 bg-white/5 rounded-xl text-[10px] font-black uppercase text-orange-400 italic border border-orange-500/10" disabled>
                    {t.pending_hisaab}
                 </button>
               ) : (
                 <button onClick={() => handleApplyHisaab(selectedStore.id)} className="w-full py-4 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-orange-500/20">
                    {t.request_access}
                 </button>
               )}
            </div>
          )}

          {/* CATALOG GRID */}
          <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px] mb-4 px-1">{t.catalog}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedStore.inventory || []).map(item => (
              <motion.div key={item.id} className="glass-card !p-3">
                <div className="rounded-xl overflow-hidden mb-3 aspect-square bg-white/5">
                  <img src={item.image || `https://picsum.photos/id/${(item.id % 50) + 10}/300/300`} className="w-full h-full object-cover" alt={item.name} />
                </div>
                <h5 className="font-black text-[11px] h-8 line-clamp-2 leading-tight px-1">{item.name}</h5>
                <div className="flex items-center justify-between mt-4 bg-black/20 p-2 rounded-xl">
                  <p className="text-teal-400 font-black text-sm">AED {item.price}</p>
                  <button onClick={() => addToTab(item)} className="w-8 h-8 rounded-lg bg-teal-400 text-black flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={16}/></button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* FLOAT CART */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-5 z-50">
            <button onClick={() => setShowCart(true)} className="w-full btn-primary flex justify-between items-center px-8 !py-6 !rounded-[24px]">
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <span className="font-black italic uppercase text-xs tracking-widest">{t.view_tab} ({cart.length})</span>
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
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-10 border-t border-white/10 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase">{isRTL ? "الحساب" : "Your Tab"}</h2>
                <button onClick={() => setCart([])} className="p-2 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={20}/></button>
              </div>
              <div className="space-y-4 max-h-[30vh] overflow-y-auto mb-10 pr-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                       <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center font-black text-xs">{item.qty}x</span>
                       <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <span className="text-teal-400 font-black">AED {item.price}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCheckout} className="btn-primary w-full italic uppercase !py-6 !text-lg !rounded-[24px]">
                 {t.confirm_hisaab}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
