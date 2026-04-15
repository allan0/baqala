// ================================================
// frontend/src/components/AIAssistant.jsx
// VERSION 17 (FULL AI RESTORATION & Hub SYNC)
// ================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, X, Loader2, Wand2, 
  ShoppingCart, AlertCircle, CheckCircle,
  ArrowRight, Store, MessageSquare, Mic
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    title: "AI GENIE",
    subtitle: "Digital Order Bridge",
    prompt: "Tell the Genie what you need... (e.g. 'Get me 2 Al Ain waters and Oman chips')",
    ordering_from: "Active Store context",
    nearest: "Nearest neighborhood store",
    send_intent: "Cast Magic",
    success_msg: "Ledger Updated!",
    error_msg: "I couldn't match those items to the shelves. Try being more specific.",
    guest_msg: "Identity required. Link your profile in 'Me' to enable AI hisaab ordering.",
    checking: "Consulting the shelves...",
    link_now: "Go to Identity Hub"
  },
  ar: {
    title: "المساعد الذكي",
    subtitle: "طلب الأغراض بالذكاء الاصطناعي",
    prompt: "اطلب اللي تبغيه (مثلاً: 'ضف حبتين ماي العين وبطاطس عمان لحسابي')",
    ordering_from: "تطلب من دكان",
    nearest: "أقرب دكان في الفريج",
    send_intent: "إرسال الطلب",
    success_msg: "تم تحديث الحساب الرقمي!",
    error_msg: "ما لقيت هالأغراض بالأرفف، جرب توصفها بشكل أوضح.",
    guest_msg: "يجب إثبات الهوية. اربط حسابك من صفحة 'ملفي' لتفعيل الطلب.",
    checking: "جاري البحث في الأرفف...",
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

    // --- IDENTITY GUARD ---
    if (isGuest) {
      setStatus('guest_locked');
      haptic('heavy');
      return;
    }
    
    haptic('heavy');
    setStatus('processing');

    try {
      // 1. AI Parsing Request (Sends current Baqala context)
      const res = await axios.post(`${API_URL}/api/ai/parse`, { 
        text: input,
        baqala_id: currentBaqala?.id
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });

      if (res.data.success && res.data.items.length > 0) {
        // 2. Commit AI-matched items to the live database ledger
        const checkoutRes = await axios.post(`${API_URL}/api/hisaab/checkout`, {
          baqala_id: currentBaqala?.id, 
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
          }, 2500);
        }
      } else {
        throw new Error("No inventory match");
      }
    } catch (e) {
      console.error("AI Genie Failure:", e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <>
      {/* Floating Circular Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="fixed bottom-32 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-orange-500 text-black shadow-[0_15px_40px_rgba(0,245,212,0.4)] z-[45] flex items-center justify-center border-4 border-[#0a0a0f]"
            onClick={() => { haptic('light'); setIsOpen(true); }}
            whileTap={{ scale: 0.9 }}
          >
            <Sparkles size={30} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-[#0a0a0f]/98 backdrop-blur-3xl z-[100] flex flex-col p-6 ${isRTL ? 'font-arabic text-right' : ''}`}
          >
            {/* Header with Restored Shimmering Brand */}
            <div className="flex justify-between items-center mb-12 pt-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-teal-400/10 rounded-full flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-inner">
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
                  <p className="text-[11px] font-black text-white/30 uppercase tracking-[3px] leading-none mt-1">{t.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => { setStatus('idle'); setIsOpen(false); }} 
                className="p-3.5 bg-white/5 rounded-full text-white/40 active:bg-white/10 transition-colors"
              >
                <X size={28}/>
              </button>
            </div>

            {/* Context Awareness Card */}
            <div className="glass-card !bg-white/[0.02] mb-10 border-white/5 flex items-center gap-5 py-6 shadow-inner rounded-[32px]">
               <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center text-3xl border border-white/10 shadow-xl">🏪</div>
               <div>
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest leading-none mb-2">{t.ordering_from}</p>
                  <h3 className="font-black italic text-2xl text-white tracking-tight">{currentBaqala?.name || t.nearest}</h3>
               </div>
            </div>

            {/* Input & Animated Status Area */}
            <div className="flex-1 relative">
               <textarea 
                 autoFocus
                 value={input}
                 onChange={(e) => { setInput(e.target.value); if(status==='guest_locked') setStatus('idle'); }}
                 placeholder={t.prompt}
                 className="w-full h-56 bg-transparent text-3xl font-bold italic text-white placeholder:text-white/5 outline-none resize-none leading-snug px-3"
               />
               
               {/* OVERLAY STATES Restoration */}
               <AnimatePresence>
                 {status === 'processing' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 rounded-[40px]">
                      <div className="relative">
                        <Loader2 className="animate-spin text-teal-400" size={80} strokeWidth={1} />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-400/50" size={32} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-[6px] text-teal-400 animate-pulse">{t.checking}</p>
                   </motion.div>
                 )}

                 {status === 'success' && (
                   <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 text-emerald-400 rounded-[40px]">
                      <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border-4 border-emerald-500/20">
                        <CheckCircle size={56} strokeWidth={3} />
                      </div>
                      <p className="text-2xl font-black uppercase italic tracking-tighter">{t.success_msg}</p>
                   </motion.div>
                 )}

                 {status === 'error' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 text-orange-500 rounded-[40px] p-10 text-center">
                      <AlertCircle size={64} />
                      <p className="text-lg font-black uppercase leading-relaxed italic">{t.error_msg}</p>
                   </motion.div>
                 )}

                 {status === 'guest_locked' && (
                   <motion.div 
                     initial={{ y: 30, opacity: 0 }} 
                     animate={{ y: 0, opacity: 1 }} 
                     className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10 text-center gap-8 rounded-[40px] border border-orange-500/20"
                   >
                      <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 shadow-2xl border border-orange-500/10">
                        <ShoppingCart size={48}/>
                      </div>
                      <p className="font-black text-lg uppercase italic text-white/90 leading-tight tracking-tight">{t.guest_msg}</p>
                      <button 
                        onClick={() => { setIsOpen(false); setActiveTab('profile'); }}
                        className="btn-primary w-full !py-5 flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,245,212,0.2)]"
                      >
                        <span className="uppercase font-black italic tracking-widest">{t.link_now}</span> 
                        <ArrowRight size={22} strokeWidth={3} />
                      </button>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Premium Control Bar */}
            <div className="pb-16">
              <button 
                onClick={handleAIProcess}
                disabled={!input.trim() || status === 'processing' || status === 'success'}
                className="btn-primary w-full !py-7 flex items-center justify-center gap-4 shadow-[0_25px_60px_rgba(0,245,212,0.3)] !rounded-full active:scale-95 transition-all"
              >
                <span className="uppercase italic font-black text-2xl tracking-tighter">{t.send_intent}</span>
                <Send size={26} />
              </button>
              
              <div className="flex items-center justify-center gap-10 mt-12 opacity-10">
                 <Mic size={24} />
                 <Store size={24} />
                 <MessageSquare size={24} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
