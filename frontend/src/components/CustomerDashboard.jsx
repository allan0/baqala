import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, ArrowLeft, Search, 
  MessageCircle, Sparkles, Plus, Trash2,
  Lock, CheckCircle2, ChevronRight, ChevronLeft, Store,
  LayoutGrid, RefreshCw, Smartphone
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";
const BOT_USERNAME = "BaqalaNetworkBot"; 

// --- LOCALIZATION (KHALEEJI FOCUS) ---
const loc = {
  en: {
    search: "Search neighborhood stores...",
    nearby: "Your Neighborhood",
    open: "Open 24/7",
    back: "Back",
    apply_hisaab: "Apply for Hisaab",
    pending_hisaab: "Application Pending",
    approved_hisaab: "Trusted Resident",
    chat_merchant: "Chat راعي الدكان",
    ask_ai: "AI Genie",
    add_to_cart: "Add to Tab",
    view_tab: "View My Tab",
    confirm_hisaab: "Commit to Hisaab",
    no_items: "This merchant hasn't listed items.",
    hisaab_locked: "A Digital Tab is required to order from this store.",
    inventory_label: "Inventory Catalog",
    verified: "Verified Merchant",
    empty_search: "No stores found."
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
    confirm_hisaab: "تأكيد الطلب على الحساب",
    no_items: "ما فيه بضاعة مسجلة حالياً.",
    hisaab_locked: "لازم يكون عندك حساب مفعل عشان تطلب من هالدكان.",
    inventory_label: "الأغراض المتوفرة",
    verified: "تاجر موثق",
    empty_search: "ما حصلنا دكاكين."
  }
};

export default function CustomerDashboard({ user, lang, initialStore, setActiveTab }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Media Carousel Index
  const [imgIndex, setImgIndex] = useState(0);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const userId = user?.id?.toString() || 'guest_user';

  // --- DATA LOADING ---
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/baqalas/nearby?user_id=${userId}`);
        const data = res.data || [];
        setStores(data);

        // Handle Deep Link from Bot
        if (initialStore) {
          const target = data.find(s => s.id === initialStore);
          if (target) setSelectedStore(target);
        }
      } catch (e) {
        console.error("Network sync error", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, [userId, initialStore]);

  const haptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleApply = async (storeId) => {
    haptic('medium');
    try {
      await axios.post(`${API_URL}/api/hisaab/apply`, { 
        telegram_id: userId, 
        baqala_id: storeId,
        name: user?.first_name || 'Resident'
      });
      setStores(stores.map(s => s.id === storeId ? { ...s, isPending: true } : s));
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.pending_hisaab);
    } catch (e) { alert("Failed to send request."); }
  };

  const handleDeepLinkChat = (id, type) => {
    haptic('heavy');
    // Start parameter format: type_storeId_lang
    const link = `https://t.me/${BOT_USERNAME}?start=${type}_${id}_${lang}`;
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

  // --- COMPREHENSIVE MEDIA RENDERER ---
  const VisualBox = ({ item, type = 'card' }) => {
    const images = item.images || [];
    
    // Fallback if merchant hasn't uploaded a photo
    if (images.length === 0) {
      return (
        <div className={`w-full bg-white/5 flex flex-col items-center justify-center relative overflow-hidden ${type === 'header' ? 'h-64' : 'h-32'}`}>
          <Store size={type === 'header' ? 48 : 24} className="text-teal-400 opacity-20 z-10" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#00f5d4 2px, transparent 2px)', backgroundSize: '15px 15px' }} />
          <p className="text-[7px] font-black uppercase tracking-[3px] opacity-10 mt-3 z-10">Baqala Protocol</p>
        </div>
      );
    }

    // Carousel Logic for Header
    if (type === 'header' && images.length > 1) {
      return (
        <div className="relative h-64 w-full bg-black overflow-hidden group">
          <motion.img 
            key={imgIndex}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            src={images[imgIndex]} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent opacity-60" />
          
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between">
            <button onClick={() => setImgIndex(prev => prev > 0 ? prev - 1 : images.length - 1)} className="p-3 bg-black/40 backdrop-blur-xl rounded-full"><ChevronLeft size={20}/></button>
            <button onClick={() => setImgIndex(prev => (prev + 1) % images.length)} className="p-3 bg-black/40 backdrop-blur-xl rounded-full"><ChevronRight size={20}/></button>
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
      <div className={`${type === 'header' ? 'h-64' : 'h-32'} w-full overflow-hidden`}>
        <img src={images[0]} className="w-full h-full object-cover" />
      </div>
    );
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <RefreshCw className="animate-spin text-teal-400 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[3px] opacity-40 italic">Syncing Baqala Network...</p>
    </div>
  );

  return (
    <div className="px-5">
      {!selectedStore ? (
        /* 1. DISCOVERY VIEW */
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
                onClick={() => { setSelectedStore(store); setImgIndex(0); haptic(); }}
                className="glass-card !p-0 overflow-hidden relative group border-white/5 shadow-none"
              >
                <VisualBox item={store} type="card" />
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-black italic">{store.name}</h4>
                      <p className="text-teal-400 text-[9px] font-bold uppercase mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                        {t.open} • Nearby
                      </p>
                    </div>
                    {store.isApproved && <ShieldCheck size={18} className="text-teal-400" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* 2. STORE PAGE VIEW */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
          <button 
            onClick={() => setSelectedStore(null)} 
            className={`flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase mb-6 active:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>} {t.back}
          </button>

          <div className="glass-card !p-0 overflow-hidden mb-8">
            <VisualBox item={selectedStore} type="header" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black italic">{selectedStore.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 size={12} className="text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{t.verified}</span>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-[22px]">
                   <MapPin size={24} className="text-teal-400" />
                </div>
              </div>

              {/* ACTION LINKS (TO BOT) */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleDeepLinkChat(selectedStore.id, 'merchant')} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase">
                  <MessageCircle size={16} className="text-blue-400" /> {t.chat_merchant}
                </button>
                <button onClick={() => handleDeepLinkChat(selectedStore.id, 'ai')} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase">
                  <Sparkles size={16} className="text-purple-400" /> {t.ask_ai}
                </button>
              </div>
            </div>
          </div>

          {/* HISAAB ACCESS LOGIC */}
          {!selectedStore.isApproved ? (
            <div className="glass-card !p-12 text-center border-orange-500/20 bg-orange-500/[0.02]">
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={32} className="text-orange-500" />
              </div>
              <h3 className="font-black text-xl mb-3 uppercase tracking-tighter">{isRTL ? "الحساب مغلق" : "Tab Access Restricted"}</h3>
              <p className="text-xs text-[#94a3b8] mb-10 leading-relaxed font-medium">{t.hisaab_locked}</p>
              
              {selectedStore.isPending ? (
                <div className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-orange-400 italic flex items-center justify-center gap-3">
                  <RefreshCw size={14} className="animate-spin" /> {t.pending_hisaab}...
                </div>
              ) : (
                <button onClick={() => handleApply(selectedStore.id)} className="btn-primary w-full !py-6 !rounded-[24px] !text-lg">
                  {t.apply_hisaab}
                </button>
              )}
            </div>
          ) : (
            /* UNLOCKED INVENTORY VIEW */
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px]">{t.inventory_label}</h3>
                <LayoutGrid size={14} className="text-white/10" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {(selectedStore.inventory || []).map(item => (
                  <motion.div key={item.id} className="glass-card !p-3">
                    <div className="rounded-xl overflow-hidden mb-3 aspect-square bg-white/5">
                      <img src={item.image || `https://picsum.photos/id/${(item.id % 50) + 10}/300/300`} className="w-full h-full object-cover" />
                    </div>
                    <h5 className="font-black text-xs leading-tight h-9 line-clamp-2 px-1">{item.name}</h5>
                    <div className="flex items-center justify-between mt-4 bg-black/20 p-2 rounded-xl">
                      <p className="text-teal-400 font-black text-sm">AED {item.price}</p>
                      <button onClick={() => addToTab(item)} className="w-8 h-8 rounded-lg bg-teal-400 text-black flex items-center justify-center shadow-lg"><Plus size={16}/></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* FLOAT CART ACTION */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 px-5 z-50">
            <button 
              onClick={() => setShowCart(true)}
              className="w-full btn-primary flex justify-between items-center px-8 !py-6 !rounded-[24px] !shadow-2xl shadow-teal-400/20"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <span className="font-black italic uppercase text-xs">{t.view_tab} ({cart.length})</span>
              </div>
              <span className="bg-black/20 px-4 py-1.5 rounded-xl text-sm font-black">
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
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic">{isRTL ? "ملخص الفاتورة" : "Review Tab"}</h2>
                <Trash2 onClick={() => setCart([])} size={20} className="text-red-500 opacity-20" />
              </div>

              <div className="space-y-6 mb-12 max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-xs">{item.qty}x</div>
                       <div className="font-bold text-sm truncate max-w-[150px]">{item.name}</div>
                    </div>
                    <span className="text-teal-400 font-black text-sm">AED {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-8 px-2">
                  <span className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[3px]">Total To Ledger</span>
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
