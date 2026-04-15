// ================================================
// frontend/src/components/HisaabTab.jsx
// VERSION 21 (FULL LEDGER & IDENTITY RESTORATION)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Clock, Wallet, CheckCircle2, 
  Zap, Receipt, RefreshCw, Wallet2, ShieldCheck, 
  Percent, ChevronRight, AlertCircle, IdCard, Sparkles,
  Lock, ArrowRight, WalletCards, TrendingDown
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    ledger_title: "Active Ledger",
    total_owed: "Outstanding Debt",
    settle_ton: "Settle via TON",
    savings_alert: "TON Crypto Discount",
    empty_ledger: "All tabs are clear! Shukran.",
    tab_active: "Neighborhood Tabs",
    merchant_label: "Baqala Hub",
    fazaa_hub: "Fazaa Benefit Hub",
    fazaa_desc: "Link your Fazaa card for an extra 5% discount at participating stores.",
    fazaa_link: "Link Fazaa ID",
    fazaa_active: "Fazaa Verified",
    identity_locked: "Identity Required",
    identity_msg: "Please link your Gmail or Telegram in the 'Me' tab to access your digital hisaab.",
    link_now: "Link My Identity",
    rate_info: "1 TON ≈ 20.50 AED",
    protocol_sync: "Ledger Encrypted & Synchronized"
  },
  ar: {
    ledger_title: "دفتر الحساب",
    total_owed: "إجمالي الدين",
    settle_ton: "سداد بواسطة TON",
    savings_alert: "خصم تسوية الكريبتو",
    empty_ledger: "حسابك صافي! شكراً لك.",
    tab_active: "حسابات الفريج",
    merchant_label: "دكان",
    fazaa_hub: "مركز مزايا فزعة",
    fazaa_desc: "اربط بطاقة فزعة للحصول على خصم إضافي ٥٪ في الدكاكين المشاركة.",
    fazaa_link: "ربط بطاقة فزعة",
    fazaa_active: "تم تفعيل فزعة",
    identity_locked: "يجب إثبات الهوية",
    identity_msg: "يرجى ربط حسابك من صفحة 'ملفي' لتتمكن من رؤية وسداد ديونك في الفريج.",
    link_now: "ربط الهوية الآن",
    rate_info: "١ طن ≈ ٢٠.٥٠ درهم",
    protocol_sync: "السجل مشفر ومزامن بالكامل"
  }
};

export default function HisaabTab({ user, lang, setActiveTab }) {
  const [debts, setDebts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [fazaaInput, setFazaaInput] = useState('');
  
  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  
  // Identity Status: Guests (unlinked) vs Registered Users
  const isGuest = !user?.telegram_id && !user?.email;
  const TON_EXCHANGE_RATE = 20.50; 

  // 1. Fetch real ledger data via Identity Bridge
  const fetchLedger = async () => {
    if (isGuest) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/hisaab/ledger`, {
        headers: { 
          auth_id: user?.id, 
          telegram_id: user?.telegram_id 
        }
      });
      setDebts(res.data || []);
    } catch (e) {
      console.error("Ledger sync failure", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, [user?.id]);

  // 2. Fazaa Card Sync (Hits persistent Database Profile)
  const handleLinkFazaa = async () => {
    if (!fazaaInput.trim() || !user?.id) return;
    setIsLinking(true);
    try {
      const res = await axios.post(`${API_URL}/api/user/update`, {
        id: user.id,
        fazaa_card: fazaaInput
      });
      if (res.data.success) {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        // Force refresh to reload App component with new profile data
        window.location.reload(); 
      }
    } catch (e) {
      alert("Fazaa verification failed.");
    } finally {
      setIsLinking(false);
    }
  };

  // 3. Web3 Payment Engine (TON Bridge)
  const handleSettle = (debt) => {
    // Dynamic Discount Math
    const baseDiscount = debt.baqala?.crypto_discount || 10;
    const bonusDiscount = user?.fazaa_card ? 5 : 0;
    const totalDiscount = baseDiscount + bonusDiscount;

    const finalAed = debt.total_aed * (1 - totalDiscount / 100);
    const tonAmount = (finalAed / TON_EXCHANGE_RATE).toFixed(4);
    
    // Pick up real store wallet address from DB
    const merchantWallet = debt.baqala?.wallet_address || "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
    const memo = `Baqala_Settle_${debt.id.slice(0,8)}`;
    
    // Telegram Wallet Deep Link
    const tonUrl = `https://t.me/wallet/transfer?address=${merchantWallet}&amount=${tonAmount}&text=${encodeURIComponent(memo)}`;

    if (WebApp?.openTelegramLink) {
        WebApp.openTelegramLink(tonUrl);
    } else {
        window.open(tonUrl, '_blank');
    }
    
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('heavy');
  };

  const totalBalance = debts.reduce((sum, d) => sum + parseFloat(d.total_aed), 0);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Mapping Ledger Grid...</p>
    </div>
  );

  // --- Hub LOCK SCREEN (For Guest browsing) ---
  if (isGuest) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-12 pt-24 text-center">
       <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_20px_50px_rgba(0,245,212,0.5)] border border-white/5">
         <Lock size={48} className="text-orange-500 opacity-40" />
       </div>
       <h2 className="text-3xl font-black italic uppercase mb-4 tracking-tighter text-white">{t.identity_locked}</h2>
       <p className="text-white/40 text-sm mb-12 leading-relaxed font-medium uppercase tracking-widest">{t.identity_msg}</p>
       <button onClick={() => setActiveTab('profile')} className="btn-primary w-full !py-6 !rounded-full flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all">
          <span className="font-black italic text-lg tracking-tighter">{t.link_now}</span> <ArrowRight size={22} strokeWidth={3} />
       </button>
    </motion.div>
  );

  // --- FULL LEDGER VIEW ---
  return (
    <div className={`px-5 pt-4 pb-32 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* SHIMMERING Hub CARD: Balance Summary */}
      <div className="glass-card !bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20 mb-12 overflow-hidden relative shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-[50px]">
        <Sparkles className="absolute -right-10 -top-10 text-teal-400/10" size={200} />
        <p className="text-[10px] font-black uppercase text-teal-400 mb-3 tracking-[5px] ml-1">{t.total_owed}</p>
        <h2 className="text-6xl font-black italic tracking-tighter mb-12 text-white leading-none">AED {totalBalance.toFixed(2)}</h2>
        
        <div className="flex items-center gap-6 p-6 bg-black/40 rounded-[36px] border border-white/5 backdrop-blur-2xl shadow-inner">
           <div className="w-16 h-16 bg-teal-400 rounded-full flex items-center justify-center text-black shadow-lg shadow-teal-400/30 shrink-0">
              <Percent size={32} strokeWidth={4} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase leading-none mb-2 text-white/90 tracking-widest">{t.savings_alert}</p>
              <p className="text-[11px] text-white/30 font-bold uppercase tracking-tighter italic">~AED {(totalBalance * 0.1).toFixed(2)} neighborhood savings</p>
           </div>
        </div>
      </div>

      {/* REWARDS: FAZAA Benefit Center */}
      <div className="glass-card mb-12 border-blue-500/10 relative overflow-hidden rounded-[40px] bg-gradient-to-tr from-blue-500/[0.02] to-transparent">
         <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-blue-400 rotate-12"><WalletCards size={150}/></div>
         <div className="flex items-center gap-6 mb-10 relative z-10 px-1">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
               <IdCard size={36} />
            </div>
            <div>
               <h3 className="font-black italic uppercase text-xl tracking-tighter leading-tight text-white">{t.fazaa_hub}</h3>
               <p className="text-[10px] text-white/30 font-bold uppercase mt-1.5 tracking-[3px] leading-none">Trust Level Benefits</p>
            </div>
         </div>

         {user?.fazaa_card ? (
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-emerald-500/10 rounded-[32px] border border-emerald-500/20 flex justify-between items-center shadow-inner">
              <div className="flex items-center gap-5">
                 <ShieldCheck className="text-emerald-400" size={28} />
                 <span className="text-base font-black uppercase text-emerald-400 tracking-widest font-mono italic">ID: {user.fazaa_card}</span>
              </div>
              <CheckCircle2 size={28} className="text-emerald-400 shadow-xl" />
           </motion.div>
         ) : (
           <div className="space-y-6 relative z-10 px-2">
              <p className="text-xs text-white/40 leading-relaxed font-medium italic">{t.fazaa_desc}</p>
              <div className="flex gap-4">
                 <input 
                   className="input-modern flex-1 !py-5 !text-base !bg-white/[0.02] !rounded-full border-white/5 shadow-inner" 
                   placeholder="Card ID" 
                   value={fazaaInput}
                   onChange={e => setFazaaInput(e.target.value)}
                 />
                 <button onClick={handleLinkFazaa} disabled={isLinking || !fazaaInput} className="bg-white text-black px-10 rounded-full font-black uppercase text-[11px] active:scale-95 shadow-2xl transition-all hover:bg-teal-400">
                    {isLinking ? '...' : t.fazaa_link}
                 </button>
              </div>
           </div>
         )}
      </div>

      {/* Hub TABS LISTING */}
      <div className="flex items-center justify-between mb-10 px-4">
        <h3 className="text-[14px] font-black text-white/40 uppercase tracking-[6px] italic">{t.tab_active}</h3>
        <span className="text-[10px] font-black text-teal-400/60 uppercase bg-teal-400/5 px-4 py-2 rounded-full border border-teal-400/10 font-mono tracking-tighter">{t.rate_info}</span>
      </div>
      
      <div className="space-y-8">
        {debts.length === 0 ? (
          <div className="glass-card py-24 text-center border-dashed border-white/10 bg-transparent shadow-none rounded-[60px]">
             <TrendingDown className="mx-auto mb-8 text-white/10" size={64} strokeWidth={1} />
             <p className="text-[11px] font-black text-white/20 uppercase tracking-[10px] italic">{t.empty_ledger}</p>
          </div>
        ) : (
          debts.map(debt => (
            <motion.div key={debt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card !p-0 overflow-hidden border-white/5 rounded-[50px] shadow-[0_30px_70px_rgba(0,0,0,0.5)] hover:border-teal-400/30 transition-all group">
               <div className="p-10 border-b border-white/5 flex justify-between items-start bg-gradient-to-tr from-white/[0.02] to-transparent">
                  <div>
                     <p className="text-[11px] font-black text-teal-400 uppercase mb-3 tracking-[5px]">{t.merchant_label}</p>
                     {/* FIX: Dynamically pulled store name instead of "ali al baqala" */}
                     <h4 className="text-3xl font-black italic tracking-tighter text-white leading-none group-hover:text-teal-400 transition-colors uppercase">{debt.baqala?.name || 'Local Store'}</h4>
                     <p className="text-[10px] text-white/30 mt-6 font-bold uppercase tracking-[4px]">{new Date(debt.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-5xl font-black tracking-tighter italic text-white leading-none uppercase">AED {parseFloat(debt.total_aed).toFixed(2)}</p>
                     <div className="flex items-center gap-3 justify-end text-white/40 mt-4">
                        <Wallet2 size={18} />
                        <span className="text-[14px] font-black uppercase tracking-tighter font-mono italic">~{ (debt.total_aed / TON_EXCHANGE_RATE).toFixed(3) } TON</span>
                     </div>
                  </div>
               </div>

               <div className="p-8 bg-black/20 flex gap-5">
                  <button onClick={() => handleSettle(debt)} className="flex-1 btn-primary !py-6 !text-[12px] !rounded-full uppercase tracking-[5px] shadow-2xl active:scale-95 group">
                     <Zap size={24} fill="currentColor" className="mr-2 group-hover:scale-125 transition-transform" /> {t.settle_ton}
                  </button>
                  <button className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/30 active:bg-white/10 transition-all shadow-inner group-hover:text-white">
                     <Receipt size={32} />
                  </button>
               </div>
            </motion.div>
          ))
        )}
      </div>
      
      <p className="text-center text-[10px] text-white/10 font-black uppercase tracking-[10px] pt-24 italic opacity-30 pb-10">
         {t.protocol_sync}
      </p>
    </div>
  );
}
