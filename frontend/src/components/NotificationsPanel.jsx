// ================================================
// frontend/src/components/NotificationsPanel.jsx
// VERSION 2 (Telegram MVP - Mobile Fixed + Dark Theme)
// ================================================
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, RefreshCw, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    title: "Notifications",
    resident: "For You",
    merchant: "My Store",
    clear: "Clear All",
    empty: "No new notifications."
  },
  ar: {
    title: "الإشعارات",
    resident: "لك",
    merchant: "متجري",
    clear: "مسح الكل",
    empty: "لا توجد إشعارات جديدة."
  }
};

export default function NotificationsPanel({ show, onClose, lang, user }) {
  const [activeTab, setActiveTab] = useState('resident');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const t = loc[lang] || loc.en;
  const isRTL = lang === 'ar';

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/notifications?telegram_id=${user.telegram_id || user.id}`);
      setNotifications(res.data || []);
    } catch (e) {
      console.error("Notifications fetch failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (show) fetchNotifications();
  }, [show, user]);

  const clearAll = async () => {
    try {
      await axios.post(`${API_URL}/api/notifications/read`, {
        telegram_id: user.telegram_id || user.id,
        profile_type: activeTab
      });
      setNotifications(prev => prev.filter(n => n.profile_type !== activeTab));
    } catch (e) {
      console.error("Clear notifications failed", e);
    }
  };

  const currentNotifications = notifications.filter(n => n.profile_type === activeTab);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="relative w-full max-w-[500px] h-[78vh] bg-[#0a0a0f] rounded-t-[40px] border-t border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={26} className="text-teal-400" />
                <h2 className="text-2xl font-black italic">{t.title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/10 rounded-2xl text-white/60 active:bg-red-500/20"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-6 py-4 bg-white/5 flex gap-2">
              <button 
                onClick={() => setActiveTab('resident')}
                className={`flex-1 py-3 text-sm font-black rounded-3xl transition-all ${activeTab === 'resident' ? 'bg-white text-black' : 'text-white/40'}`}
              >
                {t.resident}
              </button>
              <button 
                onClick={() => setActiveTab('merchant')}
                className={`flex-1 py-3 text-sm font-black rounded-3xl transition-all ${activeTab === 'merchant' ? 'bg-white text-black' : 'text-white/40'}`}
              >
                {t.merchant}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <RefreshCw className="animate-spin text-teal-400" size={32} />
                </div>
              ) : currentNotifications.length === 0 ? (
                <div className="text-center py-20 text-white/30 italic text-sm">
                  {t.empty}
                </div>
              ) : (
                currentNotifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 flex gap-4"
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="font-bold text-base leading-tight">{notif.title}</p>
                        <span className="text-[10px] text-white/40 whitespace-nowrap">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 mt-1 leading-snug">{notif.message}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {currentNotifications.length > 0 && (
              <div className="p-6 border-t border-white/10">
                <button 
                  onClick={clearAll}
                  className="w-full py-4 bg-red-500/10 text-red-400 font-black text-sm uppercase tracking-widest rounded-3xl active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  {t.clear}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
