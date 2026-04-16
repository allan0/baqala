// ================================================
// frontend/src/components/layout/TopBar.jsx
// VERSION 4.0 (BQT Wallet Header + Mode Switcher)
// ================================================
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  ShieldCheck, 
  Sparkles, 
  User, 
  Store,
  ChevronDown,
  Diamond
} from 'lucide-react';

export default function TopBar() {
  const { 
    user, 
    viewMode, 
    toggleMode, 
    lang, 
    globalBqtBalance 
  } = useApp();

  const isRTL = lang === 'ar';

  // Dynamic greeting based on UAE time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (lang === 'ar') {
      if (hour < 12) return 'صباح الخير';
      if (hour < 18) return 'مساء الخير';
      return 'يا هلا بك';
    }
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, [lang]);

  const haptic = (style = 'medium') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const handleModeToggle = () => {
    haptic('heavy');
    toggleMode(); // Swaps between 'customer' and 'vendor'
  };

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-2xl px-5 py-4">
      <div className="max-w-[500px] mx-auto flex items-center justify-between">
        
        {/* LEFT: Logo & Profile Status */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <motion.div 
            whileTap={{ scale: 0.9, rotate: -10 }}
            onClick={handleModeToggle}
            className="relative cursor-pointer"
          >
            <img 
              src="/baqalaslogo.png" 
              alt="Baqala Logo" 
              className="w-10 h-10 rounded-xl shadow-lg border border-white/10"
              onError={(e) => e.target.src = 'https://ui-avatars.com/api/?name=B&background=00f5d4&color=000'}
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-400 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center">
              {viewMode === 'customer' ? (
                <User size={10} className="text-black" strokeWidth={4} />
              ) : (
                <Store size={10} className="text-black" strokeWidth={4} />
              )}
            </div>
          </motion.div>

          <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-black uppercase tracking-widest ${viewMode === 'customer' ? 'text-teal-400' : 'text-orange-500'}`}>
                {viewMode === 'customer' ? (lang === 'ar' ? 'ساكن' : 'Resident') : (lang === 'ar' ? 'تاجر' : 'Merchant')}
              </span>
              {viewMode === 'vendor' && <ShieldCheck size={10} className="text-orange-500" />}
            </div>
            <h2 className="text-sm font-black text-white italic tracking-tight truncate w-24">
              {user?.display_name || 'Neighbor'}
            </h2>
          </div>
        </div>

        {/* RIGHT: Spendable BQT & Notifications */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          
          {/* BQT SPENDABLE PILL */}
          <AnimatePresence mode="wait">
            {viewMode === 'customer' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 bg-teal-400/10 border border-teal-400/20 px-3 py-1.5 rounded-full"
              >
                <div className="relative">
                  <Diamond size={14} className="text-teal-400 fill-teal-400/20" />
                  <motion.div 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 blur-sm text-teal-400"
                  >
                    <Diamond size={14} />
                  </motion.div>
                </div>
                <span className="text-xs font-black text-teal-400 tracking-tighter">
                  {parseFloat(globalBqtBalance || 0).toFixed(0)} <span className="opacity-60 text-[10px]">BQT</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NOTIFICATION BELL */}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => haptic('light')}
            className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#0a0a0f]"></span>
          </motion.button>
          
        </div>
      </div>
    </header>
  );
}
