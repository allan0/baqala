// ================================================
// frontend/src/components/AIAssistant.jsx
// VERSION 15 (PRODUCTION ACTIONABLE AI GENIE)
// ================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, X, Loader2, Wand2, 
  ShoppingCart, AlertCircle, CheckCircle 
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

export default function AIAssistant({ user, lang, currentBaqala, onOrderSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, error

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleAIProcess = async () => {
    if (!input.trim() || status === 'processing') return;
    
    haptic('heavy');
    setStatus('processing');

    try {
      // 1. Send intent to AI Parser
      // We pass the baqala_id so the AI knows which inventory to look at
      const res = await axios.post(`${API_URL}/api/ai/parse`, { 
        text: input,
        lang: lang,
        baqala_id: currentBaqala?.id
      }, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });

      if (res.data.success && res.data.items.length > 0) {
        // 2. Commit the AI-parsed items directly to the Ledger
        const checkoutRes = await axios.post(`${API_URL}/api/hisaab/checkout`, {
          baqala_id: currentBaqala?.id,
          items: res.data.items // Items found by AI in the real inventory
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
        throw new Error("No items matched");
      }
    } catch (e) {
      console.error("AI Error:", e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <>
      {/* Floating Sparkle Toggle */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="fixed bottom-28 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-purple-600 text-white shadow-2xl z-40 flex items-center justify-center"
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
            className="fixed inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl z-[100] flex flex-col p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-10 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-400/20 rounded-xl flex items-center justify-center text-teal-400">
                  <Wand2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tight">AI Genie</h2>
                  <p className="text-[10px] font-bold text-white/30 uppercase">Voice & Text Ordering</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 rounded-full text-white/40"><X/></button>
            </div>

            {/* Context Card */}
            <div className="glass-card !bg-white/5 mb-6 border-white/5 flex items-center gap-4">
               <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-2xl">🏪</div>
               <div>
                  <p className="text-[9px] font-black text-teal-400 uppercase">Ordering From</p>
                  <h3 className="font-black italic text-lg">{currentBaqala?.name || "Nearest Baqala"}</h3>
               </div>
            </div>

            {/* Input Area */}
            <div className="flex-1 relative">
               <textarea 
                 autoFocus
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder="Tell the Genie what you need... (e.g. 'Add 2 water and one chips to my tab')"
                 className="w-full h-40 bg-transparent text-2xl font-bold italic text-white placeholder:text-white/10 outline-none resize-none leading-relaxed"
               />
               
               {status === 'processing' && (
                 <div className="absolute inset-0 bg-[#0a0a0f]/50 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-teal-400" size={48} />
                    <p className="text-xs font-black uppercase tracking-[3px] text-teal-400">Checking Shelves...</p>
                 </div>
               )}

               {status === 'success' && (
                 <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-emerald-400">
                    <CheckCircle size={64} />
                    <p className="text-sm font-black uppercase italic">Hisaab Ledger Updated!</p>
                 </motion.div>
               )}

               {status === 'error' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-orange-500">
                    <AlertCircle size={48} />
                    <p className="text-xs font-bold uppercase text-center">I couldn't find those items.<br/>Try saying it differently.</p>
                 </div>
               )}
            </div>

            {/* Action Bar */}
            <div className="pb-10">
              <button 
                onClick={handleAIProcess}
                disabled={!input.trim() || status !== 'idle'}
                className="btn-primary w-full !py-6 flex items-center justify-center gap-3"
              >
                <span className="uppercase italic font-black text-lg">Send Intent</span>
                <Send size={20} />
              </button>
              <p className="text-center text-[10px] text-white/20 mt-6 font-bold uppercase tracking-widest">
                The Genie uses real-time store inventory
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
