// ================================================
// frontend/src/components/AIAssistant.jsx
// VERSION 5.0 (AI Intent Engine + BQT Reward Sync)
// ================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, X, Loader2, Wand2, 
  ShoppingCart, AlertCircle, CheckCircle,
  ArrowRight, Store, MessageSquare, Mic,
  UserCircle, Zap, PackageCheck
} from 'lucide-react';
import axios from 'axios';
import { useApp } from '../context/AppContext';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL;

const loc = {
  en: {
    title: "AI GENIE",
    subtitle: "Intent-to-Ledger Hub",
    prompt: "Tell the Genie what you need... (e.g. 'Get me 2 Labans and Oman chips')",
    ordering_from: "Contextual Hub",
    nearest: "Neighborhood Store",
    btn_cast: "Cast Intent",
    parsing: "Consulting the Grid...",
    committing: "Anchoring to Hisaab...",
    success: "Success! Ledger Entry Confirmed.",
    earned: "Tokens Earned:",
    error_match: "Genie couldn't find those items on the shelves. Try again?",
    error_generic: "The Grid is flickering. Please try manually."
  },
  ar: {
    title: "المساعد الذكي",
    subtitle: "مركز تحويل الطلبات",
    prompt: "اطلب اللي تبغيه... (مثلاً: 'حبتين لبن وبطاطس عمان')",
    ordering_from: "الدكان المتصل",
    nearest: "دكان الفريج",
    btn_cast: "إرسال الطلب",
    parsing: "جاري فحص الأرفف...",
    committing: "تثبيت في الحساب...",
    success: "تم! تم تسجيل الطلب في حسابك.",
    earned: "التوكنات المكتسبة:",
    error_match: "المساعد ما لقى هالأغراض بالأرفف، جرب توصفها بشكل أوضح.",
    error_generic: "عذراً، حدث خطأ في النظام. جرب مرة ثانية."
  }
};

export default function AIAssistant({ user, lang, currentBaqala, setActiveTab }) {
  const { syncBqtBalances } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, parsing, committing, success, error
  const [rewardNotice, setRewardNotice] = useState(0);

  const t = useMemo(() => loc[lang] || loc.en, [lang]);
  const isRTL = lang === 'ar';

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleCastIntent = async () => {
    if (!input.trim() || status !== 'idle') return;

    haptic('heavy');
    setStatus('parsing');

    try {
      // 1. AI Parsing & Database Matching
      // This route (File 3) matches text to real inventory IDs
      const parseRes = await axios.post(`${API_URL}/api/ai/parse`, {
        text: input,
        baqala_id: currentBaqala?.id || 'default-baqala' 
      }, {
        headers: { telegram_id: user?.telegram_id }
      });

      const matchedItems = parseRes.data.items.filter(i => i.matched);
      
      if (matchedItems.length === 0) {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      // 2. Auto-Checkout Commitment
      setStatus('committing');
      const checkoutRes = await axios.post(`${API_URL}/api/hisaab/checkout`, {
        baqala_id: currentBaqala?.id || 'default-baqala',
        items: matchedItems.map(i => ({ id: i.id, qty: i.qty }))
      }, {
        headers: { telegram_id: user.telegram_id }
      });

      if (checkoutRes.data.success) {
        setRewardNotice(checkoutRes.data.bqtAwarded);
        setStatus('success');
        haptic('notification');

        // 3. Global Web3 Refresh
        // Ensure the header BQT updates immediately
        await syncBqtBalances(user.telegram_id);

        setTimeout(() => {
          setIsOpen(false);
          setStatus('idle');
          setInput('');
        }, 3500);
      }

    } catch (e) {
      console.error("Genie System Failure", e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            onClick={() => { haptic('light'); setIsOpen(true); }}
            className="fixed bottom-28 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-orange-500 text-black shadow-[0_15px_40px_rgba(0,245,212,0.4)] z-[999] flex items-center justify-center border-4 border-[#0a0a0f] active:scale-90 transition-transform"
          >
            <Sparkles size={30} fill="currentColor" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* OVERLAY INTERFACE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-[#0a0a0f]/98 backdrop-blur-3xl z-[10000] flex flex-col p-8 ${isRTL ? 'font-arabic text-right' : ''}`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-10 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-400/10 rounded-2xl flex items-center justify-center text-teal-400 border border-teal-400/20 shadow-inner">
                  <Wand2 size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
                    {t.title}
                  </h2>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[4px]">{t.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => { if(status === 'idle') setIsOpen(false); }}
                className="p-3 bg-white/5 rounded-2xl text-white/30 active:bg-red-500/20 active:text-red-400"
              >
                <X size={28} />
              </button>
            </div>

            {/* Hub Info */}
            <div className="glass-card !bg-white/[0.02] mb-10 border-white/5 flex items-center gap-5 p-6 rounded-[32px]">
               <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center text-2xl border border-white/10 shadow-2xl">🏪</div>
               <div>
                  <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1">{t.ordering_from}</p>
                  <h3 className="font-bold text-white tracking-tight">{currentBaqala?.name || t.nearest}</h3>
               </div>
            </div>

            {/* Input & Animated States */}
            <div className="flex-1 relative">
              <textarea 
                autoFocus
                disabled={status !== 'idle'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.prompt}
                className="w-full h-48 bg-transparent text-2xl font-bold italic text-white placeholder:text-white/5 outline-none resize-none leading-relaxed px-2 scrollbar-hide"
              />

              <AnimatePresence>
                {/* PROCESSING OVERLAY */}
                {(status === 'parsing' || status === 'committing') && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 rounded-[40px] border border-white/5"
                  >
                    <Loader2 className="animate-spin text-teal-400" size={64} strokeWidth={1} />
                    <p className="text-sm font-black uppercase tracking-[6px] text-teal-400 animate-pulse italic">
                      {status === 'parsing' ? t.parsing : t.committing}
                    </p>
                  </motion.div>
                )}

                {/* SUCCESS OVERLAY */}
                {status === 'success' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-teal-400 flex flex-col items-center justify-center gap-6 rounded-[40px] text-black shadow-[0_0_100px_rgba(0,245,212,0.3)]"
                  >
                    <div className="w-24 h-24 rounded-full bg-black/10 flex items-center justify-center">
                      <PackageCheck size={56} strokeWidth={3} />
                    </div>
                    <p className="text-2xl font-black italic tracking-tighter text-center px-10">{t.success}</p>
                    <div className="mt-4 flex items-center gap-2 bg-black text-teal-400 px-6 py-3 rounded-full font-black text-sm uppercase">
                       <Zap size={16} fill="currentColor" /> {t.earned} +{rewardNotice.toFixed(0)} BQT
                    </div>
                  </motion.div>
                )}

                {/* ERROR OVERLAY */}
                {status === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-orange-500/10 flex flex-col items-center justify-center gap-4 rounded-[40px] border border-orange-500/30 text-center p-10"
                  >
                    <AlertCircle size={64} className="text-orange-500" />
                    <p className="text-lg font-black italic text-white leading-tight uppercase">{t.error_match}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Button */}
            <div className="pb-10">
              <button 
                onClick={handleCastIntent}
                disabled={!input.trim() || status !== 'idle'}
                className="btn-primary w-full !py-7 !rounded-[32px] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,245,212,0.3)] disabled:opacity-20 transition-all group"
              >
                <span className="uppercase font-black italic text-2xl tracking-tighter">{t.btn_cast}</span>
                <Send size={24} className="group-active:translate-x-2 transition-transform" />
              </button>
              
              <div className="flex justify-center gap-8 mt-12 opacity-5">
                <Mic size={24} />
                <MessageSquare size={24} />
                <Zap size={24} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
