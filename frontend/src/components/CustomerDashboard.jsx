import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, History, Plus, Minus, 
  Trash2, ArrowLeft, Search, MessageCircle, Sparkles, Info 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Replace with your actual bot username (without the @)
const BOT_USERNAME = "Baqalas_bot"; 

export default function CustomerDashboard({ user, walletAddress, activeTab, setActiveTab }) {
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id?.toString() || 'guest_user';

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/baqalas/nearby`);
        setNearbyBaqalas(res.data || []);
      } catch (e) {
        console.error("Store Fetch Error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, []);

  // --- HELPERS ---
  const getImgId = (id) => {
    if (!id) return 10;
    const num = parseInt(id.toString().replace(/[^0-9]/g, ''));
    return isNaN(num) ? 15 : num % 100;
  };

  const haptic = (type = 'light') => {
    try { WebApp?.HapticFeedback?.impactOccurred(type); } catch (e) {}
  };

  const handleChatWithMerchant = (baqalaId) => {
    haptic('medium');
    // Deep link: opens the bot and sends /start chat_baqalaId
    const link = `https://t.me/${BOT_USERNAME}?start=chat_${baqalaId}`;
    if (WebApp?.openTelegramLink) {
      WebApp.openTelegramLink(link);
    } else {
      window.open(link, '_blank');
    }
  };

  const addToCart = (item) => {
    haptic('light');
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleCheckout = async () => {
    if (!selectedBaqala || cart.length === 0) return;
    try {
      await axios.post(`${API_URL}/api/hisaab/checkout`, {
        telegram_id: userId,
        baqala_id: selectedBaqala.id,
        items: cart
      });

      if (WebApp?.isVersionAtLeast('6.2')) {
        WebApp.showAlert("✅ Order successfully added to your Hisaab!");
      } else {
        alert("✅ Order added to Hisaab!");
      }

      setCart([]);
      setShowCart(false);
      setSelectedBaqala(null);
      setActiveTab('hisaab');
    } catch (err) {
      alert("Checkout failed. Please try again.");
    }
  };

  const filteredStores = useMemo(() => {
    return nearbyBaqalas.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [nearbyBaqalas, searchQuery]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 opacity-50">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-400 mb-4"></div>
      <p className="text-sm font-bold uppercase tracking-widest">Scanning Network...</p>
    </div>
  );

  return (
    <div className="px-5 pt-2">
      {/* SEARCH BAR */}
      {!selectedBaqala && (
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400/50" size={18} />
          <input 
            type="text" 
            placeholder="Find a baqala..."
            className="input-modern w-full !pl-12 !py-3 !text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* STORE LIST */}
      {!selectedBaqala ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[2px]">Verified Baqalas</h3>
            <MapPin size={14} className="text-teal-400" />
          </div>
          
          {filteredStores.map(baqala => (
            <motion.div 
              key={baqala.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedBaqala(baqala); haptic(); }}
              className="glass-card !p-0 overflow-hidden relative group"
            >
              <img 
                src={`https://picsum.photos/id/${getImgId(baqala.id) + 20}/600/300`} 
                className="w-full h-32 object-cover opacity-40 group-active:opacity-60 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <h4 className="text-xl font-bold">{baqala.name}</h4>
                <div className="flex items-center gap-2 text-teal-400 text-[10px] font-bold uppercase mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Open Now • {getImgId(baqala.id) % 5} min away
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* SELECTED STORE VIEW */
        <div className="pb-10">
          <button 
            onClick={() => setSelectedBaqala(null)}
            className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase mb-6"
          >
            <ArrowLeft size={16} /> Back to Network
          </button>

          <div className="glass-card !p-6 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black">{selectedBaqala.name}</h2>
                <p className="text-[#94a3b8] text-xs mt-1">Premium Merchant ID: {selectedBaqala.id}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl">
                <Info size={20} className="text-teal-400" />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => handleChatWithMerchant(selectedBaqala.id)}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-xs font-bold transition-all"
              >
                <MessageCircle size={16} className="text-blue-400" />
                Chat Merchant
              </button>
              <button 
                onClick={() => handleChatWithMerchant(selectedBaqala.id + "_ai")}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-xs font-bold transition-all"
              >
                <Sparkles size={16} className="text-purple-400" />
                Ask AI Bot
              </button>
            </div>
          </div>

          <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[2px] mb-4 px-1">Inventory Catalog</h3>
          <div className="grid grid-cols-2 gap-3">
            {(selectedBaqala.inventory || []).map(item => (
              <motion.div key={item.id} className="glass-card !p-3">
                <img 
                  src={`https://picsum.photos/id/${getImgId(item.id) + 50}/200/200`} 
                  className="rounded-xl mb-3 aspect-square object-cover"
                />
                <h5 className="font-bold text-sm leading-tight h-9 line-clamp-2">{item.name}</h5>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-teal-400 font-black text-lg">AED {item.price}</p>
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING CART TAB */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-24 left-0 right-0 px-5 z-50 pointer-events-none"
          >
            <button 
              onClick={() => setShowCart(true)}
              className="w-full btn-primary !rounded-2xl shadow-2xl pointer-events-auto flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={20} />
                <span className="font-bold">{cart.length} Items</span>
              </div>
              <span className="bg-black/20 px-3 py-1 rounded-lg text-sm font-black">
                AED {cart.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CART MODAL */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)} 
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[32px] p-8 border-t border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">Your Tab</h2>
                <Trash2 onClick={() => setCart([])} size={20} className="text-red-500 opacity-50" />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-teal-400">AED {item.price} each</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-black">{item.qty}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[#94a3b8] font-bold uppercase text-xs tracking-widest">Total Hisaab</span>
                  <span className="text-3xl font-black text-teal-400">
                    AED {cart.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)}
                  </span>
                </div>
                <button onClick={handleCheckout} className="btn-primary w-full">
                  Commit to Digital Tab
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
