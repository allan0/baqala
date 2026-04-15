// ================================================
// frontend/src/components/AIAssistant.jsx
// VERSION 16 (FULL AI RESTORATION & SYNC)
// ================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, X, Loader2, Wand2, 
  ShoppingCart, AlertCircle, CheckCircle,
  ArrowRight, Store, MessageSquare
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    title: "AI GENIE",
    subtitle: "Voice & Text Ordering",
    prompt: "Tell the Genie what you need... (e.g. 'Add 2 waters and one chips to my tab')",
    ordering_from: "Ordering From",
    nearest: "Nearest Store",
    send_intent: "Send Intent",
    success_msg: "Hisaab Ledger Updated!",
    error_msg: "I couldn't find those items. Try saying it differently.",
    guest_msg: "Please link your identity in 'Me' to enable AI ordering.",
    checking: "Checking Shelves...",
    link_now: "Link Account"
  },
  ar: {
    title: "المساعد الذكي",
    subtitle: "طلب الأغراض بالصوت والنص",
    prompt: "اكتب اللي تبغيه (مثلاً: 'ضف حبتين ماي وبطاطس عمان لحسابي')",
    ordering_from: "تطلب من دكان",
    nearest: "أقرب دكان",
    send_intent: "إرسال الطلب",
    success_msg: "تم تحديث دفتر الحساب!",
    error_msg: "ما لقيت هالأغراض، جرب توصفها بشكل أوضح.",
    guest_msg: "اربط حسابك من صفحة 'ملفي' لتفعيل الطلب بالذكاء الاصطناعي.",
    checking: "بشيك لك على الأرفف...",
    link_now: "ربط الحساب"
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

    // Identity Guard
    if (isGuest) {
      setStatus('guest_locked');
      haptic('heavy');
      return;
    }
    
    haptic('heavy');
    setStatus('processing');

    try {
      // 1. Get real-time parsing from backend (matched against store inventory)
      const res = await axios.post(`${API_URL}/api/ai/parse`, { 
        text: input,
        baqala_id: currentBaqala?.id
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });

      if (res.data.success && res.data.items.length > 0) {
        // 2. Commit AI-matched items directly to the database ledger
        const checkoutRes = await axios.post(`${API_URL}/api/hisaab/checkout`, {
          baqala_id: currentBaqala?.id || res.data.auto_baqala_id, // Fallback to nearest
          items: res.data.items 
        }, {
          headers: { auth_id: user.id, telegram_id: user.telegram_id }
        });

        if (checkoutRes.data.success) {
          setStatus('success');
          haptic('medium');
          setTimeout(() => {
            setIsOpen(false);
            setStatus('idle');
            setInput('');
            if (onOrderSuccess) onOrderSuccess();
          }, 2000);
        }
      } else {
        throw new Error("No match");
      }
    } catch (e) {
      console.error("Genie Error:", e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <>
      {/* Floating Sparkle Button (Circular Restoration) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            className="fixed bottom-28 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-orange-500 text-black shadow-[0_10px_30px_rgba(0,245,212,0.4)] z-40 flex items-center justify-center border-4 border-[#0a0a0f]"
            onClick={() => { haptic('light'); setIsOpen(true); }}
            whileTap={{ scale: 0.9 }}
          >
            <Sparkles size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl z-[100] flex flex-col p-6 ${isRTL ? 'font-arabic text-right' : ''}`}
          >
            {/* Header with Shimmering Logo Restoration */}
            <div className="flex justify-between items-center mb-10 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-400/20 rounded-full flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-inner">
                  <Wand2 size={24} />
                </div>
                <div>
                  <motion.h2 
                    animate={{ backgroundPosition: ["0%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="text-2xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent"
                  >
                    {t.title}
                  </motion.h2>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[2px]">{t.subtitle}</p>
                </div>
              </div>
              <button onClick={() => { setStatus('idle'); setIsOpen(false); }} className="p-3 bg-white/5 rounded-full text-white/40 active:scale-90"><X size={24}/></button>
            </div>

            {/* Store Context Card */}
            <div className="glass-card !bg-white/5 mb-8 border-white/5 flex items-center gap-4 py-5 shadow-inner">
               <div className="w-14 h-14 bg-black/40 rounded-full flex items-center justify-center text-2xl border border-white/10 shadow-lg">🏪</div>
               <div>
                  <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest leading-none mb-1.5">{t.ordering_from}</p>
                  <h3 className="font-black italic text-xl text-white">{currentBaqala?.name || t.nearest}</h3>
               </div>
            </div>

            {/* Input & Interaction Area */}
            <div className="flex-1 relative">
               <textarea 
                 autoFocus
                 value={input}
                 onChange={(e) => { setInput(e.target.value); if(status==='guest_locked') setStatus('idle'); }}
                 placeholder={t.prompt}
                 className="w-full h-48 bg-transparent text-2xl font-bold italic text-white placeholder:text-white/5 outline-none resize-none leading-relaxed px-2"
               />
               
               {/* OVERLAY STATES */}
               <AnimatePresence>
                 {status === 'processing' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-5 rounded-3xl">
                      <Loader2 className="animate-spin text-teal-400" size={56} />
                      <p className="text-xs font-black uppercase tracking-[4px] text-teal-400">{t.checking}</p>
                   </motion.div>
                 )}

                 {status === 'success' && (
                   <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-5 text-emerald-400 rounded-3xl">
                      <CheckCircle size={72} strokeWidth={2.5} />
                      <p className="text-lg font-black uppercase italic tracking-tight">{t.success_msg}</p>
                   </motion.div>
                 )}

                 {status === 'error' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-orange-500 rounded-3xl p-8 text-center">
                      <AlertCircle size={56} />
                      <p className="text-sm font-black uppercase leading-relaxed italic">{t.error_msg}</p>
                   </motion.div>
                 )}

                 {status === 'guest_locked' && (
                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center gap-6 rounded-3xl border border-orange-500/20">
                      <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500"><ShoppingCart size={40}/></div>
                      <p className="font-black text-sm uppercase italic text-white/90 leading-relaxed">{t.guest_msg}</p>
                      <button 
                        onClick={() => { setIsOpen(false); setActiveTab('profile'); }}
                        className="btn-primary w-full !py-4 flex items-center justify-center gap-3"
                      >
                        {t.link_now} <ArrowRight size={18} />
                      </button>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="pb-12">
              <button 
                onClick={handleAIProcess}
                disabled={!input.trim() || status === 'processing' || status === 'success'}
                className="btn-primary w-full !py-6 flex items-center justify-center gap-4 shadow-[0_15px_40px_rgba(0,245,212,0.2)]"
              >
                <span className="uppercase italic font-black text-xl tracking-tighter">{t.send_intent}</span>
                <Send size={22} />
              </button>
              
              <div className="flex items-center justify-center gap-6 mt-8 opacity-20">
                 <Store size={18} />
                 <MessageSquare size={18} />
                 <Sparkles size={18} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
