import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('baqala_mode') || 'customer');
  const [lang, setLang] = useState('en'); // 'en' or 'ar'
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('home');

  // Sync mode with localStorage
  useEffect(() => {
    localStorage.setItem('baqala_mode', viewMode);
  }, [viewMode]);

  const toggleMode = () => {
    const newMode = viewMode === 'customer' ? 'vendor' : 'customer';
    setViewMode(newMode);
    
    // Haptic feedback for mode switch
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i);
      return [...prev, {...item, qty: 1}];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const value = {
    user, setUser,
    viewMode, setViewMode, toggleMode,
    lang, setLang,
    cart, setCart, addToCart, removeFromCart,
    activeTab, setActiveTab
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
