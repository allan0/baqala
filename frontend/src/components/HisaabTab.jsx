import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Clock, Wallet, ArrowRight, CheckCircle2, 
  Zap, Receipt, History, ExternalLink, RefreshCw,
  Wallet2, ArrowUpRight, ShieldCheck, Filter, Search,
  ChevronRight, Percent, Info, AlertCircle
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    ledger_title: "My Digital Ledger",
    total_owed: "Total Neighborhood Debt",
    settle_ton: "Settle with TON",
    verify_payment: "Verify Transaction",
    savings_tag: "TON Discount Applied",
    empty_ledger: "Your tab is clear! No active debts.",
    tab_active: "Active Tabs",
    tab_history: "Settlement History",
    merchant_label: "Shop",
    date_label: "Transaction Date",
    items_view: "Itemized List",
    rate_info: "1 TON ≈ 20.50 AED",
    wallet_needed: "Please link your TON wallet in the header first.",
    process_warning: "Opening wallet... return here to confirm ledger sync.",
    confirmed: "🎉 Transaction Anchored! Ledger updated."
  },
  ar: {
    ledger_title: "دفتر الحساب الرقمي",
    total_owed: "إجمالي الديون المستحقة",
    settle_ton: "تسوية بواسطة TON",
    verify_payment: "تأكيد العملية من السجل",
    savings_tag: "تم تطبيق خصم الكريبتو",
    empty_ledger: "حسابك صافي! لا توجد ديون حالياً.",
    tab_active: "الحسابات النشطة",
    tab_history: "سجل التسويات",
    merchant_label: "الدكان",
    date_label: "تاريخ الطلب",
    items_view: "تفاصيل الفاتورة",
    rate_info: "١ طن ≈ ٢٠.٥٠ درهم",
    wallet_needed: "يرجى ربط محفظة TON من الأعلى أولاً.",
    process_warning: "جاري فتح المحفظة... ارجع هنا لتحديث الدفتر بعد الدفع.",
    confirmed: "🎉 تم تأكيد الحوالة! تم تحديث الدفتر بنجاح."
  }
};

export default function HisaabTab({ user, wallet, lang }) {
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeView, setActiveView] = useState('active'); // active, history
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null); 
  const [expandedId, setExpandedId] = useState(null);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const userId = user?.id?.toString() || 'guest_resident';

  // --- TON EXCHANGE ENGINE ---
  const TON_RATE = 20.50; // 1 TON = 20.50 AED

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [outRes, histRes] = await Promise.all([
        axios.get(`${API_URL}/api/hisaab/outstanding?telegram_id=${userId}`),
        axios.get(`${API_URL}/api/hisaab/history?telegram_id=${userId}`)
      ]);
      setOutstanding(outRes.data || []);
      setHistory(histRes.data || []);
    } catch (e) {
      console.error("Ledger Sync Failure", e);
    } finally {
      setIsLoading(false);
    }
  };

  const haptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) {
      try { WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
    }
  };

  // --- REAL ON-CHAIN SETTLEMENT LOGIC ---
  const handleSettle = async (debt) => {
    if (!wallet) {
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.wallet_needed);
      else alert(t.wallet_needed);
      return;
    }

    haptic('heavy');
    
    const discount = debt.crypto_discount || 10;
    const finalAed = debt.total_aed * (1 - discount / 100);
    const tonAmount = (finalAed / TON_RATE).toFixed(4);
    const nanoTons = Math.floor(tonAmount * 1000000000);

    const merchantWallet = debt.baqala_ton_address || "EQA123...PLACEHOLDER";
    const memo = `Baqala_Settle_${debt.id}`;
    const tonUrl = `ton://transfer/${merchantWallet}?amount=${nanoTons}&text=${encodeURIComponent(memo)}`;

    if (WebApp?.openLink) {
      WebApp.openLink(tonUrl);
    } else {
      window.location.href = tonUrl;
    }

    setVerifyingId(debt.id);
    if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.process_warning);
  };

  const verifyOnChain = async (debtId) => {
    haptic('medium');
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/hisaab/pay`, {
        telegram_id: userId,
        debt_id: debtId,
        method: 'TON'
      });

      if (res.data.success) {
        setVerifyingId(null);
        fetchData();
        if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.confirmed);
      }
    } catch (e) {
      alert(isRTL ? "ما حصلنا الحوالة للحين. انتظر دقيقة وجرب مرة ثانية." : "Transaction not yet indexed. Please wait 60s.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = outstanding.reduce((sum, d) => sum + parseFloat(d.total_aed), 0);

  if (isLoading && outstanding.length === 0) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">{isRTL ? "جاري مزامنة الدفتر..." : "Syncing Ledger..."}</p>
    </div>
  );

  return (
    <div className={`px-5 pt-4 ${isRTL ? 'font-arabic' : ''}`}>
      
      <div className="glass-card !p-8 mb-8 bg-gradient-to-br from-teal-400/[0.08] to-transparent border-teal-400/20 relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
           <div>
              <h1 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px] mb-3">{t.total_owed}</h1>
              <div className="flex items-baseline gap-2">
                 <span className="text-teal-400 font-black text-2xl italic leading-none">AED</span>
                 <span className="text-6xl font-black tracking-tighter leading-none">{totalBalance.toFixed(2)}</span>
              </div>
           </div>
           <div className="p-4 bg-teal-400 rounded-3xl shadow-[0_0_40px_rgba(0,245,212,0.3)]">
              <Receipt size={32} color="black" />
           </div>
        </div>

        <div className="mt-8 flex items-center gap-3 text-[9px] font-black text-white/30 uppercase tracking-[2px]">
           <Zap size={14} className="text-teal-400 animate-pulse" />
           {t.rate_info}
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-400/10 blur-[60px] rounded-full" />
      </div>

      <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 mb-8 border border-white/5">
        <button 
          onClick={() => { setActiveView('active'); haptic(); }}
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
            activeView === 'active' ? 'bg-white text-black shadow-2xl' : 'text-white/30'
          }`}
        >
          {t.tab_active}
        </button>
        <button 
          onClick={() => { setActiveView('history'); haptic(); }}
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
            activeView === 'history' ? 'bg-white text-black shadow-2xl' : 'text-white/30'
          }`}
        >
          {t.tab_history}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'active' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="active" className="space-y-4 pb-20">
             {outstanding.length === 0 ? (
               <div className="glass-card !p-16 text-center opacity-30 border-dashed">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400" />
                  <p className="text-xs font-black uppercase tracking-[2px]">{t.empty_ledger}</p>
               </div>
             ) : (
               outstanding.map(debt => (
                 <div key={debt.id} className="glass-card !p-6 border-white/5 relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <h3 className="font-black text-xl italic leading-none mb-2">{debt.baqala_name || t.merchant_label}</h3>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                             <Clock size={10} /> {new Date(debt.created_at).toLocaleDateString()}
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-2xl font-black text-white tracking-tighter">AED {parseFloat(debt.total_aed).toFixed(2)}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-teal-400">
                             <Percent size={10} />
                             <span className="text-[9px] font-black uppercase">-{debt.crypto_discount || 10}% {t.savings_tag}</span>
                          </div>
                       </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 mb-6">
                       <button 
                        onClick={() => setExpandedId(expandedId === debt.id ? null : debt.id)}
                        className="text-[9px] font-black uppercase text-blue-400 flex items-center gap-1.5"
                       >
                         {t.items_view} <ChevronRight size={10} className={`transition-transform ${expandedId === debt.id ? 'rotate-90' : ''}`} />
                       </button>
                       <AnimatePresence>
                         {expandedId === debt.id && (
                           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="py-4 space-y-2">
                                 {(debt.items || []).map((item, idx) => (
                                   <div key={idx} className="flex justify-between text-xs font-medium text-white/40 italic px-2 uppercase tracking-tighter">
                                      <span>{item.qty}x {item.name}</span>
                                      <span>AED {(item.price * item.qty).toFixed(2)}</span>
                                   </div>
                                 ))}
                              </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>

                    {verifyingId === debt.id ? (
                      <button 
                        onClick={() => verifyOnChain(debt.id)}
                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse"
                      >
                        <ShieldCheck size={18} /> {t.verify_btn}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSettle(debt)}
                        className="w-full btn-primary !bg-gradient-to-r !from-blue-600 !to-blue-400 !text-white !py-4.5 !rounded-2xl flex items-center justify-center gap-3 !shadow-none active:scale-95 transition-all"
                      >
                        <Wallet2 size={18} />
                        <span className="font-black uppercase text-[10px] tracking-[2px] italic">{t.settle_ton}</span>
                      </button>
                    )}
                 </div>
               ))
             )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="history" className="space-y-3 pb-24">
             {history.length === 0 ? (
               <div className="p-20 text-center opacity-10 italic text-[10px] uppercase tracking-[3px]">No records found</div>
             ) : (
               history.map(entry => (
                 <div key={entry.id} className="glass-card !p-5 flex items-center justify-between border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white/5 rounded-[20px] flex items-center justify-center text-white/20">
                          <History size={20} />
                       </div>
                       <div>
                          <p className="font-black text-base italic leading-tight mb-1">{entry.baqala_name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">{new Date(entry.settled_at).toLocaleDateString()}</span>
                             <div className="w-1 h-1 rounded-full bg-white/10" />
                             <span className="text-[9px] text-teal-400 font-black uppercase tracking-tighter">TON_SETTLED</span>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-emerald-400 text-lg leading-none">AED {parseFloat(entry.total_aed).toFixed(2)}</p>
                       <div className="flex items-center justify-end gap-1 mt-1 text-white/20">
                          <span className="text-[8px] font-black uppercase">Verified</span>
                          <ArrowUpRight size={10} />
                       </div>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom Wallet2 icon helper (if Wallet2 is missing from imports)
function Wallet2({ size, className }) {
    return <Wallet size={size} className={className} />;
}
