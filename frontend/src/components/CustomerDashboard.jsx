import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, ArrowLeft, Search, 
  MessageCircle, Sparkles, Info, Plus, Trash2,
  Lock, CheckCircle2, ChevronRight, ChevronLeft, Store,
  LayoutGrid, Navigation, Clock, Info as InfoIcon
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";
const BOT_USERNAME = "BaqalaNetworkBot"; // Ensure this matches your bot

// --- EMIRATI KHALEEJI LOCALIZATION ---
const loc = {
  en: {
    search: "Search neighborhood stores...",
    nearby: "THE NEIGHBORHOOD",
    open: "Open 24/7",
    back: "Go Back",
    apply_hisaab: "Apply for Hisaab",
    pending_hisaab: "Application Under Review",
    approved_hisaab: "Tab Active",
    chat_merchant: "Chat راعي الدكان",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "Review Tab",
    confirm_hisaab: "Commit to Digital Tab",
    no_items: "Inventory is currently private.",
    hisaab_locked: "You need an approved Digital Tab to order from this store.",
    inventory_label: "Available Items",
    verified: "Verified Merchant",
    empty_search: "No stores found in this area."
  },
  ar: {
    search: "دور على دكان...",
    nearby: "دكاكين الفريج",
    open: "مفتوح ٢٤ ساعة",
    back: "رجوع",
    apply_hisaab: "تقديم طلب حساب",
    pending_hisaab: "الطلب قيد المراجعة",
    approved_hisaab: "حسابك مفعل",
    chat_merchant: "كلم راعي الدكان",
    ask_ai: "المساعد الذكي",
    add_to_cart: "إضافة للحساب",
    view_tab: "عرض الحساب",
    confirm_hisaab: "تأكيد الطلب على الحساب",
    no_items: "البضاعة غير متوفرة حالياً.",
    hisaab_locked: "لازم يكون عندك حساب مفعل عشان تطلب من هالدكان.",
    inventory_label: "الأغراض المتوفرة",
    verified: "تاجر موثق",
    empty_search: "ما حصلنا دكاكين في هالمنطقة."
  }
};

export default function CustomerDashboard({ user, wallet, setActiveTab, lang, initialStore }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Media States
  const [imgIndex, setImgIndex] = useState(0);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const userId = user?.id?.toString() || 'guest_resident';

  // --- FETCH NETWORK DATA ---
  useEffect(() => {
    const fetchStores = async () => {
      try {
        // We pass the user_id to let the backend check application status
        const res = await axios.get(`${API_URL}/api/baqalas/nearby?user_id=${userId}`);
        const data = res.data || [];
        setStores(data);

        // Handle Deep Link auto-opening
        if (initialStore) {
          const autoStore = data.find(s => s.id === initialStore);
          if (autoStore) setSelectedStore(autoStore);
        }
      } catch (e) {
        console.error("Fetch failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, [userId, initialStore]);

  const haptic = (style = 'light') => {
    try { WebApp?.HapticFeedback?.impactOccurred(style); } catch (e) {}
  };

  const handleApply = async (storeId) => {
    haptic('medium');
    try {
      await axios.post(`${API_URL}/api/hisaab/apply`, { 
        telegram_id: userId, 
        baqala_id: storeId,
        name: user?.first_name || 'Resident'
      });
      // Update local state to show pending
      setStores(stores.map(s => s.id === storeId ? { ...s, isPending: true } : s));
      WebApp?.showAlert(t.pending_hisaab);
    } catch (e) {
      alert("Application failed.");
    }
  };

  const handleChat = (id, mode) => {
    haptic('medium');
    // Deep Link back to the bot with specific context
    const link = `https://t.me/${BOT_USERNAME}?start=${mode}_${id}_${lang}`;
    if (WebApp?.openTelegramLink) WebApp.openTelegramLink(link);
    else window.open(link, '_blank');
  };

  const addToTab = (item) => {
    haptic('light');
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  // --- ROBUST MEDIA RENDERER ---
  const VisualHeader = ({ item, type = 'store' }) => {
    const images = item.images || [];
    
    // No Photos uploaded by owner: Show high-end fallback
    if (images.length === 0) {
      return (
        <div className={`w-full flex flex-col items-center justify-center bg-gradient-to-br from-white/5 to-white/10 relative overflow-hidden ${type === 'header' ? 'h-64' : 'h-32'}`}>
          <Store size={type === 'header' ? 64 : 32} className="text-teal-400 opacity-20 relative z-10" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#00f5d4 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <p className="text-[7px] font-black uppercase tracking-[3px] opacity-10 mt-3 z-10">Baqala Digital Hub</p>
        </div>
      );
    }

    // Carousel for multiple photos
    if (type === 'header' && images.length > 1) {
      return (
        <div className="relative h-64 w-full group">
          <motion.img 
            key={imgIndex}
            initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }}
            src={images[imgIndex]} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setImgIndex(prev => (prev > 0 ? prev - 1 : images.length - 1)) }} className="bg-black/40 backdrop-blur-md p-3 rounded-full">
              <ChevronLeft size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setImgIndex(prev => (prev + 1) % images.length) }} className="bg-black/40 backdrop-blur-md p-3 rounded-full">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
             {images.map((_, i) => (
               <div key={i} className={`h-1 rounded-full transition-all ${i === imgIndex ? 'w-4 bg-teal-400' : 'w-1 bg-white/20'}`} />
             ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`${type === 'header' ? 'h-64' : 'h-32'} w-full relative`}>
        <img src={images[0]} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
      </div>
    );
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] opacity-50">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px] italic">{isRTL ? "جاري مزامنة الفريج..." : "Syncing Neighborhood..."}</p>
    </div>
  );

  return (
    <div className={`px-5 pt-2 ${isRTL ? 'text-right' : ''}`}>
      
      {!selectedStore ? (
        /* 1. STORE LIST VIEW */
        <div className="space-y-6">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20`} size={20} />
            <input 
              className={`input-modern w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} !py-4`}
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px]">{t.nearby}</h3>
            <LayoutGrid size={14} className="text-white/20" />
          </div>

          <div className="space-y-4">
            {stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
              <motion.div 
                key={store.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedStore(store); setImgIndex(0); haptic(); }}
                className="glass-card !p-0 overflow-hidden relative group border-white/5 shadow-none"
              >
                <VisualHeader item={store} type="card" />
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-black">{store.name}</h4>
                      <p className="text-teal-400 text-[9px] font-bold uppercase mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                        {t.open} • {(getImgId(store.id) % 5) + 1} min
                      </p>
                    </div>
                    {store.isApproved && <CheckCircle2 size={18} className="text-teal-400" />}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {stores.length === 0 && (
              <div className="p-20 text-center text-white/20 italic text-sm">{t.empty_search}</div>
            )}
          </div>
        </div>
      ) : (
        /* 2. STORE DETAIL VIEW */
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-10">
          <button 
            onClick={() => setSelectedStore(null)} 
            className={`flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6 active:opacity-50 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>} {t.back}
          </button>

          <div className="glass-card !p-0 overflow-hidden mb-8 border-white/5">
            <VisualHeader item={selectedStore} type="header" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black italic">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">{t.verified}</span>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl">
                  <Navigation size={22} className="text-teal-400" />
                </div>
              </div>

              {/* ACTION BUTTONS (DEEP LINKS) */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleChat(selectedStore.id, 'merchant')} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase transition-all">
                  <MessageCircle size={16} className="text-blue-400" /> {t.chat_merchant}
                </button>
                <button onClick={() => handleChat(selectedStore.id, 'ai')} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase transition-all">
                  <Sparkles size={16} className="text-purple-400" /> {t.ask_ai}
                </button>
              </div>
            </div>
          </div>

          {/* HISAAB ACCESS CONTROL */}
          {!selectedStore.isApproved ? (
            <div className="glass-card !p-10 text-center border-orange-500/20 bg-orange-500/[0.02]">
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={36} className="text-orange-500" />
              </div>
              <h3 className="font-black text-xl mb-3">{isRTL ? "الحساب مقفول" : "Hisaab Locked"}</h3>
              <p className="text-xs text-[#94a3b8] mb-10 leading-relaxed font-medium">{t.hisaab_locked}</p>
              
              {selectedStore.isPending ? (
                <div className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-orange-400 italic">
                  {t.pending_hisaab}...
                </div>
              ) : (
                <button onClick={() => handleApply(selectedStore.id)} className="btn-primary w-full !py-5 !rounded-2xl">
                  {t.apply_hisaab}
                </button>
              )}
            </div>
          ) : (
            /* UNLOCKED INVENTORY */
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px]">{t.inventory_label}</h3>
                <Clock size={14} className="text-white/20" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {(selectedStore.inventory || []).map(item => (
                  <motion.div key={item.id} className="glass-card !p-3 group">
                    <div className="rounded-xl overflow-hidden mb-3 aspect-square bg-white/5">
                      <img src={item.image || `https://picsum.photos/id/${getImgId(item.id + item.name)}/300/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h5 className="font-black text-xs h-9 line-clamp-2 leading-tight px-1">{item.name}</h5>
                    <div className="flex items-center justify-between mt-4 bg-white/5 p-2 rounded-xl">
                      <p className="text-teal-400 font-black text-sm">AED {item.price}</p>
                      <button 
                        onClick={() => addToTab(item)}
                        className="w-8 h-8 rounded-lg bg-teal-400 text-black flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-teal-400/20"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* --- FLOATING CART TAB --- */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-5 z-50">
            <button 
              onClick={() => setShowCart(true)}
              className="w-full btn-primary flex justify-between items-center px-8 !py-5 !rounded-[24px] !shadow-2xl !shadow-teal-400/30"
            >
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

      {/* --- CART OVERLAY MODAL --- */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <div onClick={() => setShowCart(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-10 border-t border-white/10 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black italic">{isRTL ? "فاتورة الحساب" : "Tab Summary"}</h2>
                  <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mt-1">Ready for Hisaab entry</p>
                </div>
                <button onClick={() => { setCart([]); setShowCart(false); haptic('heavy'); }} className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-6 mb-12 max-h-[35vh] overflow-y-auto pr-2 scrollbar-hide">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-xs">{item.qty}x</div>
                       <div className="font-bold text-sm">{item.name}</div>
                    </div>
                    <span className="text-teal-400 font-black text-sm">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-8 px-2">
                  <span className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[3px]">Final Hisaab</span>
                  <span className="text-4xl font-black text-teal-400 tracking-tighter">
                    AED {cart.reduce((s,i) => s + (i.price * i.qty), 0).toFixed(2)}
                  </span>
                </div>
                <button className="btn-primary w-full italic uppercase !py-6 !text-lg !rounded-[24px]">
                   {t.confirm_hisaab}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Utility: Robust string-to-number for picsum IDs
function getImgId(str) {
  if (!str) return 10;
  const num = str.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (num % 80) + 10;
}
