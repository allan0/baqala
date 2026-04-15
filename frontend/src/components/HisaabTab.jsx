// ================================================
// frontend/src/components/HisaabTab.jsx
// VERSION 18 (FULL LEDGER & WEB3 RESTORATION)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Clock, Wallet, CheckCircle2, 
  Zap, Receipt, RefreshCw, Wallet2, ShieldCheck, 
  Percent, ChevronRight, AlertCircle, IdCard, Sparkles,
  Lock, ArrowRight, WalletCards
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    ledger_title: "Active Ledger",
    total_owed: "Outstanding Tab",
    settle_ton: "Settle via TON",
    savings_alert: "TON Settle Discount",
    empty_ledger: "Your tabs are clear! Shukran.",
    tab_active: "Neighborhood Tabs",
    merchant_label: "Baqala",
    fazaa_hub: "Fazaa Benefit Hub",
    fazaa_desc: "Link your Fazaa card for a 5% bonus discount at participating stores.",
    fazaa_link: "Link Fazaa ID",
    fazaa_active: "Fazaa Verified",
    identity_locked: "Identity Required",
    identity_msg: "Please link your Gmail or Telegram in the 'Me' tab to access your neighborhood credit ledger.",
    link_now: "Link Account",
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
    merchant_label: "الدكان",
    fazaa_hub: "مركز مزايا فزعة",
    fazaa_desc: "اربط بطاقة فزعة للحصول على خصم إضافي ٥٪ في الدكاكين المشاركة.",
    fazaa_link: "ربط بطاقة فزعة",
    fazaa_active: "تم تفعيل فزعة",
    identity_locked: "يجب إثبات الهوية",
    identity_msg: "يرجى ربط حسابك من صفحة 'ملفي' لتتمكن من رؤية وسداد ديونك في الفريج.",
    link_now: "ربط الحساب",
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
  const isGuest = !user?.telegram_id && !user?.email;
  const TON_EXCHANGE_RATE = 20.50; 

  // 1. Fetch real ledger entries
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

  // 2. Fazaa Card Sync (Persistent DB Update)
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
        // We reload the app to let App.jsx fetch the updated profile with Fazaa ID
        window.location.reload(); 
      }
    } catch (e) {
      alert("Verification error.");
    } finally {
      setIsLinking(false);
    }
  };

  // 3. TON Web3 Bridge
  const handleSettle = (debt) => {
    const baseDiscount = debt.baqala?.crypto_discount || 10;
    const bonusDiscount = user?.fazaa_card ? 5 : 0;
    const totalDiscount = baseDiscount + bonusDiscount;

    const finalAed = debt.total_aed * (1 - totalDiscount / 100);
    const tonAmount = (finalAed / TON_EXCHANGE_RATE).toFixed(4);
    
    // Merchant wallet or protocol fallback
    const merchantWallet = debt.baqala?.wallet_address || "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
    const memo = `Baqala_Settlement_${debt.id.slice(0,8)}`;
    
    // Format for Telegram Wallet
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
      <p className="text-[10px] font-black uppercase tracking-[3px]">Mapping Ledger...</p>
    </div>
  );

  // --- GUEST VIEW (RESTRICTED) ---
  if (isGuest) return (
    <div className="px-10 pt-20 text-center">
       <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl border border-white/5">
         <Lock size={48} className="text-orange-500 opacity-40" />
       </div>
       <h2 className="text-3xl font-black italic uppercase mb-4 tracking-tighter text-white">{t.identity_locked}</h2>
       <p className="text-white/40 text-sm mb-12 leading-relaxed font-medium">{t.identity_msg}</p>
       <button onClick={() => setActiveTab('profile')} className="btn-primary w-full !py-6 !rounded-full flex items-center justify-center gap-3 shadow-xl shadow-teal-400/10 active:scale-95 transition-all">
          <UserPlus size={20} strokeWidth={3}/> {t.link_now}
       </button>
    </div>
  );

  // --- FULL LEDGER VIEW ---
  return (
    <div className={`px-5 pt-4 pb-32 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* SHIMMERING TOTAL CARD */}
      <div className="glass-card !bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20 mb-10 overflow-hidden relative shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <Sparkles className="absolute -right-8 -top-8 text-teal-400/10" size={180} />
        <p className="text-[10px] font-black uppercase text-teal-400 mb-2 tracking-[4px]">{t.total_owed}</p>
        <h2 className="text-6xl font-black italic tracking-tighter mb-10 text-white">AED {totalBalance.toFixed(2)}</h2>
        
        <div className="flex items-center gap-5 p-5 bg-black/40 rounded-[32px] border border-white/5 backdrop-blur-xl shadow-inner">
           <div className="w-14 h-14 bg-teal-400 rounded-full flex items-center justify-center text-black shadow-lg shadow-teal-400/20 shrink-0">
              <Percent size={28} strokeWidth={3} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase leading-none mb-1.5 text-white/90 tracking-widest">{t.savings_alert}</p>
              <p className="text-xs text-white/40 font-bold">~AED {(totalBalance * 0.1).toFixed(2)} protocol savings found</p>
           </div>
        </div>
      </div>

      {/* BENEFITS HUB (FAZAA) */}
      <div className="glass-card mb-10 border-blue-500/10 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-blue-400 rotate-12"><WalletCards size={120}/></div>
         <div className="flex items-center gap-5 mb-8 relative z-10">
            <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
               <IdCard size={32} />
            </div>
            <div>
               <h3 className="font-black italic uppercase text-lg tracking-tighter leading-tight">{t.fazaa_hub}</h3>
               <p className="text-[10px] text-white/30 font-bold uppercase mt-1 tracking-widest">Neighborhood Trust Rewards</p>
            </div>
         </div>

         {user?.fazaa_card ? (
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-5 bg-emerald-500/10 rounded-[28px] border border-emerald-500/20 flex justify-between items-center shadow-inner">
              <div className="flex items-center gap-4">
                 <ShieldCheck className="text-emerald-400" size={24} />
                 <span className="text-sm font-black uppercase text-emerald-400 tracking-widest font-mono">ID: {user.fazaa_card}</span>
              </div>
              <CheckCircle2 size={24} className="text-emerald-400" />
           </motion.div>
         ) : (
           <div className="space-y-5 relative z-10">
              <p className="text-[11px] text-white/40 leading-relaxed px-1 font-medium italic">{t.fazaa_desc}</p>
              <div className="flex gap-2">
                 <input 
                   className="input-modern flex-1 !py-5 !text-base !bg-white/[0.02] !rounded-[24px] !border-white/5" 
                   placeholder="Fazaa ID Number" 
                   value={fazaaInput}
                   onChange={e => setFazaaInput(e.target.value)}
                 />
                 <button onClick={handleLinkFazaa} disabled={isLinking || !fazaaInput} className="bg-white text-black px-8 rounded-full font-black uppercase text-[10px] active:scale-95 shadow-xl transition-all hover:bg-teal-400">
                    {isLinking ? '...' : t.fazaa_link}
                 </button>
              </div>
           </div>
         )}
      </div>

      {/* ACTIVE TABS LISTING */}
      <div className="flex items-center justify-between mb-8 px-2">
        <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[5px]">{t.tab_active}</h3>
        <span className="text-[9px] font-black text-white/20 uppercase bg-white/5 px-3 py-1.5 rounded-full border border-white/5">{t.rate_info}</span>
      </div>
      
      <div className="space-y-5">
        {debts.length === 0 ? (
          <div className="glass-card py-20 text-center border-dashed border-white/10 bg-transparent shadow-none">
             <Clock className="mx-auto mb-5 text-white/10" size={48} strokeWidth={1} />
             <p className="text-xs font-black text-white/20 uppercase tracking-[6px]">{t.empty_ledger}</p>
          </div>
        ) : (
          debts.map(debt => (
            <motion.div key={debt.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card !p-0 overflow-hidden border-white/5 hover:border-teal-400/20 transition-colors shadow-2xl">
               <div className="p-8 border-b border-white/5 flex justify-between items-start">
                  <div>
                     <p className="text-[10px] font-black text-teal-400 uppercase mb-2 tracking-[3px]">{t.merchant_label}</p>
                     <h4 className="text-2xl font-black italic tracking-tighter text-white">{debt.baqala?.name}</h4>
                     <p className="text-[10px] text-white/30 mt-3 font-bold uppercase tracking-widest">{new Date(debt.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-4xl font-black tracking-tighter italic text-white">AED {parseFloat(debt.total_aed).toFixed(2)}</p>
                     <div className="flex items-center gap-2 justify-end text-white/40 mt-2">
                        <Wallet2 size={14} />
                        <span className="text-[11px] font-black uppercase tracking-tighter font-mono italic">~{ (debt.total_aed / TON_EXCHANGE_RATE).toFixed(3) } TON</span>
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-white/[0.01] flex gap-4">
                  <button onClick={() => handleSettle(debt)} className="flex-1 btn-primary !py-4.5 !text-[11px] !rounded-full uppercase tracking-[3px] shadow-2xl active:scale-95">
                     <Zap size={18} fill="currentColor" className="mr-1" /> {t.settle_ton}
                  </button>
                  <button className="px-6 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/30 active:bg-white/10 transition-colors">
                     <Receipt size={22} />
                  </button>
               </div>
            </motion.div>
          ))
        )}
      </div>
      
      <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-[6px] pt-16 italic opacity-50">
         {t.protocol_sync}
      </p>
    </div>
  );
}
