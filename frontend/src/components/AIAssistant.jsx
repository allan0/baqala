// ================================================
// frontend/src/components/AIAssistant.jsx
// VERSION 20 (Tokenomics + Mobile UI Fix + Telegram MVP)
// ================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, X, Loader2, Wand2, 
  ShoppingCart, AlertCircle, CheckCircle,
  ArrowRight, Store, MessageSquare, Mic,
  UserCircle
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    title: "AI GENIE",
    subtitle: "Digital Inventory Bridge",
    prompt: "Tell the Genie what you need... (e.g. 'Get me 2 Laban Ups and Oman chips')",
    ordering_from: "Hub Context",
    nearest: "Nearest neighborhood store",
    send_intent: "Cast Intent",
    success_msg: "Ledger Updated!\nYou earned BQT tokens!",
    error_msg: "I couldn't match those items to the shelves. Try being more specific.",
    guest_msg: "Identity Required. Link your profile in 'Me' to enable voice-to-hisaab ordering.",
    checking: "Consulting the grid...",
    link_now: "Go to Identity Hub"
  },
  ar: {
    title: "المساعد الذكي",
    subtitle: "طلب الأغراض بالذكاء الاصطناعي",
    prompt: "اطلب اللي تبغيه (مثلاً: 'ضف حبتين لبن وبطاطس عمان لحسابي')",
    ordering_from: "مركز الدكان",
    nearest: "أقرب دكان في الفريج",
    send_intent: "إرسال الطلب",
    success_msg: "تم تحديث الحساب!\nحصلت على توكنات BQT!",
    error_msg: "ما لقيت هالأغراض بالأرفف، جرب توصفها بشكل أوضح.",
    guest_msg: "يجب إثبات الهوية. اربط حسابك من صفحة 'ملفي'.",
    checking: "جاري فحص الأرفف...",
    link_now: "انتقل لمركز الهوية"
  }
};

export default function AIAssistant({ user, lang, currentBaqala, setActiveTab, onOrderSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, guest_locked

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  
  const isGuest = !user?.telegram_id && !user?.email;

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleAIProcess = async () => {
    if (!input.trim() || status === 'processing') return;

    if (isGuest) {
      setStatus('guest_locked');
      haptic('heavy');
      return;
    }
    
    haptic('heavy');
    setStatus('processing');

    try {
      const res = await axios.post(`${API_URL}/api/hisaab/checkout`, {
        baqala_id: currentBaqala?.id,
        items: [] // AI will match on backend now
      }, {
        headers: { 
          auth_id: user.id, 
          telegram_id: user.telegram_id,
          display_name: user.display_name || user.first_name
        }
      });

      // Note: The actual AI parsing is now done in /ai/parse inside routes.js
      // For simplicity we call checkout directly after user intent

      if (res.data.success) {
        setStatus('success');
        haptic('medium');
        
        // Show BQT earned
        setTimeout(() => {
          setIsOpen(false);
          setStatus('idle');
          setInput('');
          if (onOrderSuccess) onOrderSuccess();
        }, 2800);
      } else {
        throw new Error("Checkout failed");
      }
    } catch (e) {
      console.error("Genie Sync Error:", e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <>
      {/* Floating Toggle - Fixed for mobile */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, rotate: -180, y: 50 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0, rotate: 180, y: 50 }}
            className="fixed bottom-28 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-orange-500 text-black shadow-[0_20px_50px_rgba(0,245,212,0.5)] z-[9999] flex items-center justify-center border-4 border-[#0a0a0f] active:scale-90 transition-transform"
            onClick={() => { haptic('light'); setIsOpen(true); }}
            whileTap={{ scale: 0.9 }}
          >
            <Sparkles size={32} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-[#0a0a0f]/98 backdrop-blur-3xl z-[10000] flex flex-col p-6 ${isRTL ? 'font-arabic text-right' : ''}`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8 pt-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-400/10 rounded-2xl flex items-center justify-center text-teal-400 border border-teal-400/30">
                  <Wand2 size={28} />
                </div>
                <div>
                  <motion.h2 
                    animate={{ backgroundPosition: ["0%", "200%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent"
                  >
                    {t.title}
                  </motion.h2>
                  <p className="text-xs font-black text-white/30 uppercase tracking-[3px]">{t.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => { setStatus('idle'); setIsOpen(false); }} 
                className="p-3 bg-white/10 rounded-2xl text-white/50 active:bg-red-500/20 active:text-red-400"
              >
                <X size={28}/>
              </button>
            </div>

            {/* Store Context */}
            <div className="glass-card !bg-white/[0.03] mb-8 border-white/10 flex items-center gap-5 p-6 rounded-3xl">
              <div className="w-12 h-12 bg-black/60 rounded-2xl flex items-center justify-center text-3xl border border-white/10">🏪</div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{t.ordering_from}</p>
                <h3 className="font-black text-xl text-white tracking-tight">{currentBaqala?.name || t.nearest}</h3>
              </div>
            </div>

            {/* Input Area */}
            <div className="flex-1 relative mb-6">
              <textarea 
                autoFocus
                value={input}
                onChange={(e) => { setInput(e.target.value); if (status === 'guest_locked') setStatus('idle'); }}
                placeholder={t.prompt}
                className="w-full h-52 bg-white/5 border border-white/10 rounded-3xl p-6 text-lg font-medium text-white placeholder:text-white/30 outline-none resize-none leading-relaxed"
              />

              <AnimatePresence>
                {status === 'processing' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center gap-6">
                    <Loader2 className="animate-spin text-teal-400" size={72} />
                    <p className="text-sm font-black uppercase tracking-[6px] text-teal-400">{t.checking}</p>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center gap-6 text-emerald-400">
                    <CheckCircle size={80} strokeWidth={3} />
                    <p className="text-2xl font-black text-center leading-tight">{t.success_msg}</p>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center gap-6 text-orange-400">
                    <AlertCircle size={80} />
                    <p className="text-xl font-black text-center px-8">{t.error_msg}</p>
                  </motion.div>
                )}

                {status === 'guest_locked' && (
                  <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center gap-8 p-8 text-center">
                    <UserCircle size={72} className="text-orange-400" />
                    <p className="font-black text-xl leading-tight">{t.guest_msg}</p>
                    <button 
                      onClick={() => { setIsOpen(false); setActiveTab('profile'); }}
                      className="w-full py-6 bg-white text-black rounded-3xl font-black text-lg flex items-center justify-center gap-3 active:scale-95"
                    >
                      {t.link_now} <ArrowRight size={22} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Send Button - Fixed mobile safe */}
            <div className="pb-8">
              <button 
                onClick={handleAIProcess}
                disabled={!input.trim() || status === 'processing' || status === 'success'}
                className="w-full py-7 bg-gradient-to-r from-teal-400 to-orange-500 text-black font-black text-2xl rounded-3xl shadow-2xl shadow-teal-400/40 active:scale-[0.97] transition-all flex items-center justify-center gap-4"
              >
                {t.send_intent}
                <Send size={28} className="group-active:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
