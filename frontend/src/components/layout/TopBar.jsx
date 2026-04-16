// ================================================
// frontend/src/components/layout/TopBar.jsx
// VERSION 3 (Telegram MVP + Tokenomics + Mobile Safe)
// ================================================
import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Bell, ShieldCheck, Sparkles } from 'lucide-react';

export default function TopBar() {
  const { user, viewMode, toggleMode, lang, globalBqtBalance } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'تصبح على خير';
  };

  const isRTL = lang === 'ar';

  return (
    <div className="top-bar px-5 py-4 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-[500px] mx-auto">
        
        {/* Left: Logo + Mode Switch */}
        <div className="flex items-center gap-3">
          <motion.img 
            src="/baqalaslogo.png" 
            alt="Baqala" 
            className="w-9 h-9 cursor-pointer"
            whileTap={{ scale: 0.85, rotate: -12 }}
            onClick={toggleMode}
          />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              {viewMode === 'customer' ? 'RESIDENT' : 'MERCHANT'}
            </span>
            <p className="text-sm font-bold text-white">
              {user?.display_name || user?.first_name || 'Neighbor'}
            </p>
          </div>
        </div>

        {/* Right: BQT Balance + Notifications */}
        <div className="flex items-center gap-4">
          
          {/* BQT Token Display */}
          {viewMode === 'customer' && (
            <div className="flex items-center gap-1.5 bg-white/5 px-4 py-1.5 rounded-3xl border border-teal-400/20">
              <Sparkles size={16} className="text-teal-400" />
              <span className="font-black text-teal-400 text-sm">
                {globalBqtBalance || 0} BQT
              </span>
            </div>
          )}

          {/* Mode Icon */}
          {viewMode === 'vendor' && (
            <ShieldCheck size={22} className="text-teal-400" />
          )}

          {/* Notifications */}
          <button className="relative p-2">
            <Bell size={22} className="text-white/70" />
            {/* Optional red dot for new notifications */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </div>
  );
}
