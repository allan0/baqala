import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Bell, User, Store, Trash2, CheckCircle2, UserCheck, 
  UserPlus, RefreshCw 
} from 'lucide-react';
import axios from 'axios';

const API_URL = "https://baqala-i2oi.onrender.com";
const WebApp = window.Telegram?.WebApp;

// A simple component to render icons by name
const Icon = ({ name, ...props }) => {
  const icons = { User, Store, CheckCircle2, UserCheck, UserPlus };
  const LucideIcon = icons[name] || Bell;
  return <LucideIcon {...props} />;
};

export default function NotificationsPanel({ show, onClose, lang, user }) {
  const [activeTab, setActiveTab] = useState('resident');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const t = {
    en: { title: "Notifications", resident: "For You", merchant: "My Store", clear: "Clear All", empty: "No new notifications." },
    ar: { title: "الإشعارات", resident: "لك", merchant: "متجري", clear: "مسح الكل", empty: "لا توجد إشعارات جديدة." }
  }[lang];

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/notifications?telegram_id=${user.id}`);
      setNotifications(res.data || []);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      fetchNotifications();
    }
  }, [show, user]);
  
  const clearAll = async () => {
    try {
        await axios.post(`${API_URL}/api/notifications/read`, {
            telegram_id: user.id,
            profile_type: activeTab
        });
        // Optimistic UI update
        setNotifications(prev => prev.filter(n => n.profile_type !== activeTab));
    } catch (e) {
        console.error("Failed to mark notifications as read", e);
    }
  };

  const currentNotifications = notifications.filter(n => n.profile_type === activeTab);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="relative w-full max-w-[500px] h-[80vh] bg-[#161b22] rounded-t-[40px] border-t border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic flex items-center gap-3"><Bell /> {t.title}</h2>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X size={20} className="text-white/40" /></button>
              </div>
              <div className="flex bg-white/5 p-1 rounded-2xl">
                 <button onClick={() => setActiveTab('resident')} className={`flex-1 py-2 text-xs font-bold rounded-xl ${activeTab === 'resident' ? 'bg-white text-black' : 'text-white/40'}`}>{t.resident}</button>
                 <button onClick={() => setActiveTab('merchant')} className={`flex-1 py-2 text-xs font-bold rounded-xl ${activeTab === 'merchant' ? 'bg-white text-black' : 'text-white/40'}`}>{t.merchant}</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <AnimatePresence>
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-white/30">
                        <RefreshCw className="animate-spin" />
                    </div>
                ) : currentNotifications.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/30 text-sm py-20 italic">{t.empty}</motion.div>
                ) : (
                  currentNotifications.map((notif, i) => (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4"
                    >
                      <div className="w-8 h-8 flex-shrink-0 bg-white/5 rounded-full flex items-center justify-center mt-1">
                        <Icon name={notif.icon} className={notif.icon === 'CheckCircle2' ? 'text-emerald-400' : 'text-white/50'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <h4 className="font-bold text-sm mb-1">{notif.title}</h4>
                           <p className="text-[10px] text-white/30 whitespace-nowrap">{new Date(notif.created_at).toLocaleDateString()}</p>
                        </div>
                        <p className="text-xs text-white/50 leading-snug mb-3">{notif.message}</p>
                        {notif.cta_text && <button className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-md">{notif.cta_text}</button>}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {currentNotifications.length > 0 && 
              <div className="p-6 border-t border-white/10">
                <button onClick={clearAll} className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <Trash2 size={14} /> {t.clear}
                </button>
              </div>
            }
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
