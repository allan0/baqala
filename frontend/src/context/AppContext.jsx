// ================================================
// frontend/src/context/AppContext.jsx
// VERSION 4.0 (Global State + Tokenomics Sync)
// ================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;
const WebApp = window.Telegram?.WebApp;

export const AppProvider = ({ children }) => {
  // 1. IDENTITY & PERSISTENCE STATES
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('baqala_mode') || 'customer');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [activeTab, setActiveTab] = useState('home');

  // 2. COMMERCE STATES
  const [cart, setCart] = useState([]);
  
  // 3. WEB3 & TOKENOMICS STATES
  const [balances, setBalances] = useState({
    locked: 0,
    available: 0,
    total: 0
  });
  const [globalBqtBalance, setGlobalBqtBalance] = useState(0); // Spendable alias

  // 4. PERSISTENCE SYNC
  useEffect(() => {
    localStorage.setItem('baqala_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('baqala_lang', lang);
    // Update HTML dir for RTL support
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // 5. TOKENOMICS REFRESH ENGINE
  // This function can be called from anywhere (Genie, Checkout, Hisaab Tab)
  const syncBqtBalances = useCallback(async (telegramId) => {
    const tgId = telegramId || user?.telegram_id || WebApp?.initDataUnsafe?.user?.id;
    if (!tgId) return;

    try {
      const res = await axios.get(`${API_URL}/api/token/balance`, {
        headers: { telegram_id: tgId.toString() }
      });

      if (res.data.success) {
        const { locked, available } = res.data;
        setBalances({
          locked: parseFloat(locked),
          available: parseFloat(available),
          total: parseFloat(locked) + parseFloat(available)
        });
        setGlobalBqtBalance(parseFloat(available));
      }
    } catch (err) {
      console.error("❌ Context Balance Sync Error:", err);
    }
  }, [user]);

  // 6. MODE TOGGLE LOGIC
  const toggleMode = () => {
    const newMode = viewMode === 'customer' ? 'vendor' : 'customer';
    setViewMode(newMode);
    
    // Haptic feedback for tactile feel
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  // 7. CART ACTIONS
  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => setCart([]);

  // 8. AUTO-SYNC ON INITIAL LOAD
  useEffect(() => {
    if (WebApp?.initDataUnsafe?.user?.id) {
      syncBqtBalances(WebApp.initDataUnsafe.user.id);
    }
  }, [syncBqtBalances]);

  const value = {
    // Identity
    user,
    setUser,
    viewMode,
    setViewMode,
    toggleMode,
    lang,
    setLang,
    activeTab,
    setActiveTab,
    
    // Commerce
    cart,
    setCart,
    addToCart,
    removeFromCart,
    clearCart,

    // Web3 / BQT
    balances,
    globalBqtBalance,
    setGlobalBqtBalance,
    syncBqtBalances
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
