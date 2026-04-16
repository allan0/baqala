// ================================================
// frontend/src/context/AppContext.jsx
// VERSION 2 (Telegram MVP + AI Genie Global Support)
// ================================================
import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('baqala_mode') || 'customer');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [globalBqtBalance, setGlobalBqtBalance] = useState(0); // Optional quick access

  // Persist mode
  useEffect(() => {
    localStorage.setItem('baqala_mode', viewMode);
  }, [viewMode]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('baqala_lang', lang);
  }, [lang]);

  const toggleMode = () => {
    const newMode = viewMode === 'customer' ? 'vendor' : 'customer';
    setViewMode(newMode);
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const value = {
    user,
    setUser,
    viewMode,
    setViewMode,
    toggleMode,
    lang,
    setLang,
    cart,
    setCart,
    addToCart,
    removeFromCart,
    activeTab,
    setActiveTab,
    globalBqtBalance,
    setGlobalBqtBalance   // Can be used later for quick header display
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
