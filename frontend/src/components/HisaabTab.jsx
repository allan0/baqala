// ================================================
// frontend/src/components/AIAssistant.jsx
// VERSION 19 (FULL AI Hub RESTORATION)
// ================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, X, Loader2, Wand2, 
  ShoppingCart, AlertCircle, CheckCircle,
  ArrowRight, Store, MessageSquare, Mic,
  UserCircle, ShoppingBag
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    title: "AI GENIE",
    subtitle: "Digital Order Bridge",
    prompt: "Tell the Genie what you need... (e.g. 'Get me 2 Al Ain waters and Oman chips')",
    ordering_from: "Active Store Context",
    nearest: "Nearest neighborhood store",
    send_intent: "Cast Magic",
    success_msg: "Ledger Entry Synchronized!",
    error_msg: "I couldn't match those items to the shelves. Try being more specific.",
    guest_msg: "Identity Required. Link your account in the 'Me' tab to enable digital hisaab ordering.",
    checking: "Consulting the shelves...",
    link_now: "Upgrade Identity Hub"
  },
  ar: {
    title: "المساعد الذكي",
    subtitle: "طلب الأغراض بالذكاء الاصطناعي",
    prompt: "اطلب اللي تبغيه (مثلاً: 'ضف حبتين ماي العين وبطاطس عمان لحسابي')",
    ordering_from: "مركز الدكان الحالي",
    nearest: "أقرب دكان في الفريج",
    send_intent: "إرسال الطلب",
    success_msg: "تم تحديث الحساب الرقمي!",
    error_msg: "ما لقيت هالأغراض بالأرفف، جرب توصفها بشكل أوضح.",
    guest_msg: "يجب إثبات الهوية. اربط حسابك من صفحة 'ملفي' لتتمكن من استخدام حساب الدين.",
    checking: "جاري البحث في الأرفف...",
    link_now: "ترقية الهوية الآن"
  }
};

export default function AIAssistant({ user, lang, currentBaqala, setActiveTab, onOrderSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, guest_locked

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  
  // Identity Guard check: Determine if user is a Guest or Authenticated
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
      // 1. AI Parsing Request: Matched against real shelves of CURRENT store
      const res = await axios.post(`${API_URL}/api/ai/parse`, { 
        text: input,
        baqala_id: currentBaqala?.id
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });

      if (res.data.success && res.data.items.length > 0) {
        // 2. Commit Order: Directly add AI-matched items to the DB Ledger
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
            if (onOrderSuccess) onOrderSuccess(); // Refresh dashboards
          }, 2500);
        }
      } else {
        throw new Error("No inventory match");
      }
    } catch (e) {
      console.error("AI Genie Sync Failure:", e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <>
      {/* Floating Circular Toggle (Restored Gradient & Shimmer) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, rotate: -180, y: 50 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0, rotate: 180, y: 50 }}
            className="fixed bottom-32 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-orange-500 text-black shadow-[0_20px_50px_rgba(0,245,212,0.5)] z-[45] flex items-center justify-center border-4 border-[#0a0a0f] active:scale-90 transition-transform"
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
            className={`fixed inset-0 bg-[#0a0a0f]/98 backdrop-blur-3xl z-[100] flex flex-col p-8 ${isRTL ? 'font-arabic text-right' : ''}`}
          >
            {/* Header: Restored Shimmering Brand Identity */}
            <div className="flex justify-between items-center mb-12 pt-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-teal-400/10 rounded-full flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-inner">
                  <Wand2 size={32} />
                </div>
                <div>
                  <motion.h2 
                    animate={{ backgroundPosition: ["0%", "200%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent leading-none"
                  >
                    {t.title}
                  </motion.h2>
                  <p className="text-[11px] font-black text-white/20 uppercase tracking-[4px] mt-2 leading-none">{t.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => { setStatus('idle'); setIsOpen(false); }} 
                className="p-4 bg-white/5 rounded-full text-white/40 active:bg-red-500/20 active:text-red-500 transition-all shadow-xl"
              >
                <X size={32}/>
              </button>
            </div>

            {/* Context Hub Card: Awareness of Active Store */}
            <div className="glass-card !bg-white/[0.02] mb-12 border-white/5 flex items-center gap-6 py-8 shadow-inner rounded-[40px] px-8 border-b-4 border-white/[0.03]">
               <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center text-3xl border border-white/10 shadow-2xl shrink-0">🏪</div>
               <div>
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-[4px] leading-none mb-2.5">{t.ordering_from}</p>
                  <h3 className="font-black italic text-2xl text-white tracking-tighter leading-tight uppercase line-clamp-1">
                    {currentBaqala?.name || t.nearest}
                  </h3>
               </div>
            </div>

            {/* AI Textarea & Feedback Area */}
            <div className="flex-1 relative">
               <textarea 
                 autoFocus
                 value={input}
                 onChange={(e) => { setInput(e.target.value); if(status==='guest_locked') setStatus('idle'); }}
                 placeholder={t.prompt}
                 className="w-full h-64 bg-transparent text-3xl font-bold italic text-white placeholder:text-white/5 outline-none resize-none leading-relaxed px-4 scrollbar-hide"
               />
               
               {/* STATUS OVERLAYS Restoration */}
               <AnimatePresence>
                 {status === 'processing' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 rounded-[50px] border border-teal-400/10 shadow-2xl">
                      <div className="relative">
                        <Loader2 className="animate-spin text-teal-400" size={100} strokeWidth={1} />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-400/50" size={40} />
                      </div>
                      <p className="text-sm font-black uppercase tracking-[8px] text-teal-400 animate-pulse italic">{t.checking}</p>
                   </motion.div>
                 )}

                 {status === 'success' && (
                   <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 text-emerald-400 rounded-[50px] border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.2)]">
                      <div className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center border-4 border-emerald-500/20">
                        <CheckCircle size={64} strokeWidth={3} />
                      </div>
                      <p className="text-3xl font-black uppercase italic tracking-tighter">{t.success_msg}</p>
                   </motion.div>
                 )}

                 {status === 'error' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 text-orange-500 rounded-[50px] p-12 text-center border border-orange-500/20 shadow-[0_0_80px_rgba(249,115,22,0.1)]">
                      <AlertCircle size={80} strokeWidth={1.5} />
                      <p className="text-xl font-black uppercase leading-loose italic tracking-tight">{t.error_msg}</p>
                   </motion.div>
                 )}

                 {status === 'guest_locked' && (
                   <motion.div 
                     initial={{ y: 50, opacity: 0 }} 
                     animate={{ y: 0, opacity: 1 }} 
                     className="absolute inset-0 bg-[#0a0a0f]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center gap-10 rounded-[50px] border border-orange-500/30 shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
                   >
                      <div className="w-28 h-28 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 shadow-2xl border border-orange-500/10 ring-8 ring-orange-500/5">
                        <ShoppingBag size={56}/>
                      </div>
                      <p className="font-black text-xl uppercase italic text-white/90 leading-snug tracking-tighter">{t.guest_msg}</p>
                      <button 
                        onClick={() => { setIsOpen(false); setActiveTab('profile'); }}
                        className="btn-primary w-full !py-6 flex items-center justify-center gap-5 shadow-[0_30px_60px_rgba(0,245,212,0.3)] !rounded-full group active:scale-95"
                      >
                        <span className="uppercase font-black italic text-lg tracking-[2px]">{t.link_now}</span> 
                        <ArrowRight size={24} strokeWidth={3} className="group-hover:translate-x-2 transition-transform" />
                      </button>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Cast Intent: Main Action Button Restoration */}
            <div className="pb-20">
              <button 
                onClick={handleAIProcess}
                disabled={!input.trim() || status === 'processing' || status === 'success'}
                className="btn-primary w-full !py-8 flex items-center justify-center gap-5 shadow-[0_30px_70px_rgba(0,245,212,0.4)] !rounded-full active:scale-95 transition-all group"
              >
                <span className="uppercase italic font-black text-3xl tracking-tighter">{t.send_intent}</span>
                <Send size={32} className="group-active:translate-x-4 transition-transform" />
              </button>
              
              <div className="flex items-center justify-center gap-12 mt-16 opacity-10">
                 <Mic size={28} />
                 <Store size={28} />
                 <MessageSquare size={28} />
                 <Sparkles size={28} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
