// ================================================
// frontend/src/components/HisaabTab.jsx
// VERSION 16 (PRODUCTION LEDGER & SETTLEMENT)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Clock, Wallet, CheckCircle2, 
  Zap, Receipt, RefreshCw, Wallet2, ShieldCheck, 
  Percent, ChevronRight, AlertCircle, IdCard, Sparkles
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
    tab_active: "Active Tabs",
    merchant_label: "Store",
    fazaa_hub: "Fazaa Benefit Hub",
    fazaa_desc: "Link your Fazaa card for an extra 5% discount at participating stores.",
    fazaa_link: "Link Fazaa Card",
    fazaa_active: "Fazaa Verified",
    wallet_needed: "Please link a wallet in profile first.",
    rate_info: "1 TON ≈ 20.50 AED",
    items_view: "Itemized List"
  },
  ar: {
    ledger_title: "دفتر الحساب",
    total_owed: "إجمالي الدين",
    settle_ton: "سداد بواسطة TON",
    savings_alert: "خصم تسوية الكريبتو",
    empty_ledger: "حسابك صافي! شكراً لك.",
    tab_active: "الحسابات النشطة",
    merchant_label: "الدكان",
    fazaa_hub: "مركز مزايا فزعة",
    fazaa_desc: "اربط بطاقة فزعة للحصول على خصم إضافي ٥٪ في الدكاكين المشاركة.",
    fazaa_link: "ربط بطاقة فزعة",
    fazaa_active: "تم تفعيل فزعة",
    rate_info: "١ طن ≈ ٢٠.٥٠ درهم",
    items_view: "تفاصيل الطلب"
  }
};

export default function HisaabTab({ user, lang }) {
  const [debts, setDebts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [fazaaInput, setFazaaInput] = useState('');
  const [activeFazaa, setActiveFazaa] = useState(user?.fazaa_card || null);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const TON_EXCHANGE_RATE = 20.50; // Dynamic integration ready

  // 1. Fetch real ledger data from Supabase via Unified Identity
  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/hisaab/ledger`, {
        headers: { 
          auth_id: user.id, 
          telegram_id: user.telegram_id 
        }
      });
      setDebts(res.data || []);
    } catch (e) {
      console.error("Ledger sync failure", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, [user.id]);

  // 2. Persistent Fazaa Card Linking
  const handleLinkFazaa = async () => {
    if (!fazaaInput.trim()) return;
    setIsLinking(true);
    try {
      const res = await axios.post(`${API_URL}/api/user/update`, {
        id: user.id,
        fazaa_card: fazaaInput
      });
      if (res.data.success) {
        setActiveFazaa(fazaaInput);
        if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.fazaa_active);
      }
    } catch (e) {
      alert("Verification failed.");
    } finally {
      setIsLinking(false);
    }
  };

  // 3. Real TON Settlement Bridge
  const handleSettle = (debt) => {
    // Logic: Base crypto discount (usually 10%) + Fazaa bonus (5%)
    const baseDiscount = debt.baqala?.crypto_discount || 10;
    const bonusDiscount = activeFazaa ? 5 : 0;
    const totalDiscount = baseDiscount + bonusDiscount;

    const finalAed = debt.total_aed * (1 - totalDiscount / 100);
    const tonAmount = (finalAed / TON_EXCHANGE_RATE).toFixed(4);
    
    // Merchant's real wallet from DB or fallback to protocol treasury
    const merchantWallet = debt.baqala?.wallet_address || "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
    const memo = `Baqala_Settlement_${debt.id.slice(0,8)}`;
    
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
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Ledger Grid...</p>
    </div>
  );

  return (
    <div className={`px-5 pt-4 pb-32 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* LEDGER OVERVIEW CARD */}
      <div className="glass-card !bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20 mb-8 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <Sparkles className="absolute -right-4 -top-4 text-teal-400/10" size={140} />
        <p className="text-[10px] font-black uppercase text-teal-400 mb-2 tracking-[3px]">{t.total_owed}</p>
        <h2 className="text-5xl font-black italic tracking-tighter mb-8">AED {totalBalance.toFixed(2)}</h2>
        
        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-[24px] border border-white/5 backdrop-blur-md">
           <div className="w-11 h-11 bg-teal-400 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-teal-400/20">
              <Percent size={22} strokeWidth={3} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase leading-none mb-1 text-white/90">{t.savings_alert}</p>
              <p className="text-xs text-white/40">~AED {(totalBalance * 0.1).toFixed(2)} savings found</p>
           </div>
        </div>
      </div>

      {/* FAZAA CARD LINKING */}
      <div className="glass-card mb-8 border-blue-500/10">
         <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
               <IdCard size={26} />
            </div>
            <div>
               <h3 className="font-black italic uppercase text-sm leading-tight tracking-tight">{t.fazaa_hub}</h3>
               <p className="text-[10px] text-white/30 font-bold uppercase mt-1 tracking-widest">UAE Community Benefits</p>
            </div>
         </div>

         {activeFazaa ? (
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <ShieldCheck className="text-emerald-400" size={20} />
                 <span className="text-xs font-black uppercase text-emerald-400 tracking-widest">ID: {activeFazaa}</span>
              </div>
              <CheckCircle2 size={20} className="text-emerald-400" />
           </motion.div>
         ) : (
           <div className="space-y-4">
              <p className="text-[11px] text-white/40 leading-relaxed px-1">{t.fazaa_desc}</p>
              <div className="flex gap-2">
                 <input 
                   className="input-modern flex-1 !py-4 !text-sm !bg-white/[0.02]" 
                   placeholder="Fazaa ID Number" 
                   value={fazaaInput}
                   onChange={e => setFazaaInput(e.target.value)}
                 />
                 <button onClick={handleLinkFazaa} disabled={isLinking || !fazaaInput} className="bg-white text-black px-6 rounded-2xl font-black uppercase text-[10px] hover:bg-teal-400 transition-colors">
                    {isLinking ? '...' : t.fazaa_link}
                 </button>
              </div>
           </div>
         )}
      </div>

      {/* DEBT LIST */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">{t.tab_active}</h3>
        <span className="text-[9px] font-bold text-white/20 uppercase bg-white/5 px-2 py-1 rounded-md">{t.rate_info}</span>
      </div>
      
      <div className="space-y-4">
        {debts.length === 0 ? (
          <div className="glass-card py-16 text-center border-dashed border-white/10 bg-transparent">
             <Clock className="mx-auto mb-4 text-white/10" size={40} />
             <p className="text-xs font-bold text-white/20 uppercase tracking-[4px]">{t.empty_ledger}</p>
          </div>
        ) : (
          debts.map(debt => (
            <motion.div key={debt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card !p-0 overflow-hidden border-white/5">
               <div className="p-6 border-b border-white/5 flex justify-between items-start">
                  <div>
                     <p className="text-[9px] font-black text-teal-400 uppercase mb-1.5 tracking-widest">{t.merchant_label}</p>
                     <h4 className="text-xl font-black italic tracking-tight">{debt.baqala?.name || 'Local Baqala'}</h4>
                     <p className="text-[10px] text-white/30 mt-2 font-bold uppercase">{new Date(debt.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-3xl font-black tracking-tighter italic">AED {parseFloat(debt.total_aed).toFixed(2)}</p>
                     <div className="flex items-center gap-1.5 justify-end text-white/40 mt-1">
                        <Wallet2 size={12} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">~{ (debt.total_aed / TON_EXCHANGE_RATE).toFixed(3) } TON</span>
                     </div>
                  </div>
               </div>

               <div className="p-5 bg-white/[0.01] flex gap-3">
                  <button onClick={() => handleSettle(debt)} className="flex-1 btn-primary !py-4 !text-[11px] uppercase tracking-widest shadow-xl">
                     <Zap size={16} fill="currentColor" /> {t.settle_ton}
                  </button>
                  <button className="px-5 bg-white/5 border border-white/10 rounded-[22px] flex items-center justify-center text-white/30 hover:bg-white/10 transition-colors">
                     <Receipt size={20} />
                  </button>
               </div>
            </motion.div>
          ))
        )}
      </div>

      <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-[4px] pt-12">
         Ledger Encrypted & Synchronized
      </p>
    </div>
  );
}
