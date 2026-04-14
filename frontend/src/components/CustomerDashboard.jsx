import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingCart, History, Plus, Minus, Trash2, ArrowLeft, Search 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function CustomerDashboard({ user, walletAddress, activeTab, setActiveTab }) {
  const [nearbyBaqalas, setNearbyBaqalas] = useState([]);
  const [selectedBaqala, setSelectedBaqala] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id?.toString() || localStorage.getItem('baqala_guest_id') || 'guest_' + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    fetchStores();
    fetchProfiles();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/baqalas/nearby`);
      setNearbyBaqalas(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/customer/${userId}/profiles`);
      setProfiles(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredStores = useMemo(() => {
    if (!searchQuery) return nearbyBaqalas;
    return nearbyBaqalas.filter(b => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [nearbyBaqalas, searchQuery]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    WebApp?.HapticFeedback?.impactOccurred('light');
  };

  const updateQty = (id, newQty) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (!selectedBaqala || cart.length === 0) return;

    const profile = profiles[0] || { id: 'main', name: 'Main' };

    try {
      await axios.post(`${API_URL}/api/hisaab/checkout`, {
        telegram_id: userId,
        baqala_id: selectedBaqala.id,
        profile_name: profile.name,
        items: cart
      });

      WebApp?.showPopup({
        title: "✅ Order Added to Hisaab",
        message: `${cart.length} items added to ${profile.name}`,
        buttons: [{ type: 'ok' }]
      });

      setCart([]);
      setShowCart(false);
      setSelectedBaqala(null);
      setActiveTab('hisaab');
    } catch (err) {
      WebApp?.showAlert("Checkout failed. Please try again.");
    }
  };

  // Mock previous purchases (replace with real API later)
  const previousPurchases = [
    { id: 101, name: "Al Ain Water 1.5L", price: 3.5, date: "2 days ago" },
    { id: 102, name: "Laban Up", price: 5.0, date: "1 week ago" },
  ];

  if (isLoading) {
    return <div className="app-container flex items-center justify-center h-96 text-[#94a3b8]">Loading nearby baqalas...</div>;
  }

  return (
    <div className="app-container pb-24">
      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-5 top-4 text-[#00f5d4]" size={22} />
        <input
          type="text"
          placeholder="Search stores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-modern w-full pl-14 py-4 text-lg"
        />
      </div>

      {/* Store List or Selected Store View */}
      {!selectedBaqala ? (
        <>
          <h3 className="text-sm font-bold tracking-widest text-[#94a3b8] mb-5">NEARBY BAQALAS</h3>
          <div className="space-y-5">
            {filteredStores.map((baqala) => (
              <motion.div
                key={baqala.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedBaqala(baqala)}
                className="glass-card overflow-hidden cursor-pointer group"
              >
                <div className="h-52 relative">
                  <img 
                    src={`https://picsum.photos/id/${baqala.id % 100 + 50}/800/400`} 
                    alt={baqala.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <h3 className="text-2xl font-bold tracking-tight">{baqala.name}</h3>
                    <p className="flex items-center gap-2 text-[#00f5d4] text-sm mt-1">
                      <MapPin size={16} /> ~1.2 km away • Open 24/7
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Previously Bought Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold tracking-widest text-[#94a3b8]">PREVIOUSLY BOUGHT</h3>
              <History size={20} className="text-[#00f5d4]" />
            </div>
            <div className="space-y-4">
              {previousPurchases.map(item => (
                <div key={item.id} className="glass-card flex justify-between items-center p-5">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-[#94a3b8]">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#00f5d4] font-bold">AED {item.price}</p>
                    <button 
                      onClick={() => addToCart(item)}
                      className="text-xs text-teal-400 hover:text-white mt-2 transition-colors"
                    >
                      Re-order +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Selected Baqala View */
        <div>
          <button 
            onClick={() => setSelectedBaqala(null)}
            className="flex items-center gap-2 text-[#00f5d4] mb-6 font-medium"
          >
            <ArrowLeft size={20} /> Back to stores
          </button>

          <div className="glass-card mb-8 overflow-hidden">
            <div className="h-64 -mx-5 -mt-5">
              <img 
                src={`https://picsum.photos/id/${selectedBaqala.id % 100 + 50}/800/400`} 
                alt={selectedBaqala.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h2 className="text-3xl font-bold">{selectedBaqala.name}</h2>
              <p className="text-[#00f5d4] mt-1">Premium Grocery • Open 24/7</p>
            </div>
          </div>

          <h3 className="text-sm font-bold tracking-widest text-[#94a3b8] mb-5">AVAILABLE ITEMS</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedBaqala.inventory || []).map(item => (
              <motion.div 
                key={item.id}
                whileHover={{ scale: 1.03 }}
                className="glass-card overflow-hidden"
              >
                <img 
                  src={`https://picsum.photos/id/${item.id % 100 + 10}/400/280`} 
                  alt={item.name}
                  className="w-full h-40 object-cover"
                />
                <div className="p-5">
                  <h4 className="font-semibold line-clamp-2 h-12">{item.name}</h4>
                  <p className="text-2xl font-bold text-[#00f5d4] mt-3">
                    AED {parseFloat(item.price).toFixed(2)}
                  </p>
                  <button 
                    onClick={() => addToCart(item)}
                    className="mt-5 w-full py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add to Cart
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && !showCart && (
          <motion.button
            initial={{ scale: 0, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 30 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-28 right-6 bg-gradient-to-r from-[#00f5d4] to-[#ff5e00] text-black font-bold px-7 py-4 rounded-full shadow-2xl flex items-center gap-3 z-50 text-base"
          >
            <ShoppingCart size={24} />
            <span>{cart.length} items • AED {totalPrice.toFixed(2)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col"
          >
            <div className="p-6 flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Your Cart</h2>
                <button onClick={() => setShowCart(false)} className="text-4xl text-white/70">×</button>
              </div>

              {cart.map(item => (
                <div key={item.id} className="glass-card flex gap-5 mb-5 p-5">
                  <img 
                    src={`https://picsum.photos/id/${item.id % 100 + 10}/100/100`} 
                    alt={item.name}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{item.name}</h4>
                    <p className="text-[#00f5d4] font-medium">AED {item.price}</p>
                    
                    <div className="flex items-center gap-6 mt-6">
                      <button 
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="font-mono text-2xl font-medium">{item.qty}</span>
                      <button 
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
                      >
                        <Plus size={18} />
                      </button>

                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-12 border-t border-white/10 pt-8 text-right">
                <p className="text-sm text-[#94a3b8]">Total Amount</p>
                <p className="text-5xl font-bold text-[#00f5d4]">AED {totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0a0a0f]">
              <button 
                onClick={handleCheckout}
                className="btn-primary w-full py-5 text-lg font-semibold"
              >
                Add to Hisaab
              </button>
              <p className="text-center text-xs text-[#94a3b8] mt-4">Your order will be added to your digital tab</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
