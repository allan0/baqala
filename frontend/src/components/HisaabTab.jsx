import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Clock, Wallet, ArrowRight, CheckCircle2, 
  AlertCircle, Zap, Receipt, History, ExternalLink, RefreshCw,
  Wallet2, ArrowUpRight, ShieldCheck, Filter, Search
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    ledger_title: "My Hisaab Ledger",
    active_balance: "Total Owed",
    settle_ton: "Settle with TON",
    savings_alert: "TON Savings Applied",
    verify_btn: "Confirm on Ledger",
    empty_ledger: "Your tab is clear! No debts found.",
    history_label: "Past Settlements",
    active_label: "Open Tabs",
    merchant: "Shop",
    date: "Recorded On",
    items_count: "Items",
    nano_warning: "Opening wallet... please return to verify.",
    verification_success: "🎉 Transaction Verified! Ledger updated.",
    exchange_rate: "1 TON ≈ 20.50 AED",
    itemized_view: "View Items"
  },
  ar: {
    ledger_title: "دفتر الحساب الرقمي",
    active_balance: "المبلغ المطلوب",
    settle_ton: "تسوية بواسطة TON",
    savings_alert: "تم تطبيق خصم الكريبتو",
    verify_btn: "تأكيد العملية",
    empty_ledger: "حسابك صافي! ما عليك أي ديون حالياً.",
    history_label: "سجل المدفوعات",
    active_label: "الحسابات المفتوحة",
    merchant: "الدكان",
    date: "تاريخ الطلب",
    items_count: "أغراض",
    nano_warning: "جاري فتح المحفظة... ارجع هنا للتأكيد بعد الدفع.",
    verification_success: "🎉 تم التأكد من الدفع! تم تحديث السجل.",
    exchange_rate: "١ طن ≈ ٢٠.٥٠ درهم",
    itemized_view: "تفاصيل الأغراض"
  }
};

export default function HisaabTab({ user, wallet, lang }) {
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeView, setActiveView] = useState('active'); // active, history
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(null); // ID of debt being verified
  const [showItemDetails, setShowItemDetails] = useState(null);

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const userId = user?.id?.toString() || 'guest_resident';

  // --- TON PRICING ENGINE ---
  const AED_TO_TON_RATE = 20.50; 

  useEffect(() => {
    fetchLedger();
  }, [userId]);

  const fetchLedger = async () => {
    try {
      const [outRes, histRes] = await Promise.all([
        axios.get(`${API_URL}/api/hisaab/outstanding?telegram_id=${userId}`),
        axios.get(`${API_URL}/api/hisaab/history?telegram_id=${userId}`)
      ]);
      setOutstanding(outRes.data || []);
      setHistory(histRes.data || []);
    } catch (e) {
      console.error("Ledger Fetch Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const haptic = (style = 'light') => {
    try { WebApp?.HapticFeedback?.impactOccurred(style); } catch (e) {}
  };

  // --- TON DEEP LINK SETTLEMENT ---
  const initiateSettlement = async (debt) => {
    if (!wallet) {
      WebApp?.showAlert(isRTL ? "اربط محفظة TON أولاً من الأعلى!" : "Please connect your TON wallet from the top bar!");
      return;
    }

    haptic('heavy');
    const discount = debt.crypto_discount || 10;
    const discountedAed = debt.total_aed * (1 - discount / 100);
    const tonAmount = (discountedAed / AED_TO_TON_RATE).toFixed(4);
    const nanoTons = Math.floor(tonAmount * 1000000000);

    const merchantAddress = debt.baqala_ton_address || "EQA123...MERCHANT_ADDR";
    const memo = `BaqalaSettlement_${debt.id}`;
    
    // NATIVE TON DEEP LINK
    const tonLink = `ton://transfer/${merchantAddress}?amount=${nanoTons}&text=${encodeURIComponent(memo)}`;

    if (WebApp?.openLink) {
      WebApp.openLink(tonLink);
    } else {
      window.location.href = tonLink;
    }

    // Set state to show "Verify" button
    setIsVerifying(debt.id);
    WebApp?.showAlert(t.nano_warning);
  };

  const confirmPayment = async (debtId) => {
    haptic('medium');
    setIsLoading(true);
    try {
      // Backend polls blockchain for memo matching debtId
      const res = await axios.post(`${API_URL}/api/hisaab/pay`, {
        telegram_id: userId,
        debt_id: debtId,
        method: 'TON'
      });

      if (res.data.success) {
        WebApp?.showAlert(t.verification_success);
        fetchLedger();
        setIsVerifying(null);
      }
    } catch (e) {
      WebApp?.showAlert(isRTL ? "ما حصلنا الحوالة للحين. انتظر دقيقة وجرب مرة ثانية." : "Transaction not found yet. Please wait 60 seconds for block confirmation.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalOwed = outstanding.reduce((s, d) => s + parseFloat(d.total_aed), 0);

  if (isLoading && outstanding.length === 0) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-40">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest">{isRTL ? "جاري جلب السجلات..." : "Accessing Vault..."}</p>
    </div>
  );

  return (
    <div className={`px-5 pt-4 ${isRTL ? 'font-arabic' : ''}`}>
      
      {/* 1. MASTER LEDGER BALANCE */}
      <div className="glass-card !p-8 mb-8 bg-gradient-to-br from-teal-400/[0.07] to-transparent border-teal-400/20 relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h1 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px] mb-3">{t.active_balance}</h1>
            <div className="flex items-baseline gap-2">
               <span className="text-teal-400 font-black text-2xl">AED</span>
               <span className="text-6xl font-black italic tracking-tighter leading-none">{totalOwed.toFixed(2)}</span>
            </div>
          </div>
          <div className="p-4 bg-teal-400 rounded-3xl shadow-[0_0_30px_rgba(0,245,212,0.3)]">
             <Receipt size={28} color="black" />
          </div>
        </div>
        
        <div className="mt-8 flex items-center gap-3 text-[9px] font-black text-white/30 uppercase tracking-widest">
           <Zap size={14} className="text-teal-400 animate-pulse" />
           {t.exchange_rate}
        </div>

        {/* Abstract decorative shape */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-400/10 blur-[60px] rounded-full" />
      </div>

      {/* 2. SUB-NAVIGATION */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 mb-8 border border-white/5">
        <button onClick={() => { setActiveView('active'); haptic(); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'active' ? 'bg-white text-black shadow-2xl' : 'text-white/40'}`}>
          {t.active_label}
        </button>
        <button onClick={() => { setActiveView('history'); haptic(); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'history' ? 'bg-white text-black shadow-2xl' : 'text-white/40'}`}>
          {t.history_label}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'active' ? (
          /* --- ACTIVE TABS VIEW --- */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="active" className="space-y-4">
            {outstanding.length === 0 ? (
              <div className="glass-card !p-16 text-center opacity-40">
                <CheckCircle2 size={50} className="mx-auto mb-4 text-emerald-400" />
                <p className="text-xs font-black uppercase tracking-[2px]">{t.empty_ledger}</p>
              </div>
            ) : (
              outstanding.map(debt => (
                <div key={debt.id} className="glass-card !p-6 border-white/5 relative group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-black text-xl italic">{debt.baqala_name || t.merchant}</h3>
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-tighter mt-1">{new Date(debt.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white leading-none">AED {parseFloat(debt.total_aed).toFixed(2)}</p>
                      <div className="flex items-center justify-end gap-1 mt-2">
                         <Percent size={10} className="text-teal-400" />
                         <span className="text-[9px] text-teal-400 font-black uppercase">-{debt.crypto_discount || 10}% TON {t.savings_alert}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8 border-t border-white/5 pt-4">
                    <button 
                      onClick={() => setShowItemDetails(showItemDetails === debt.id ? null : debt.id)}
                      className="text-[9px] font-black uppercase text-blue-400 flex items-center gap-1"
                    >
                      {t.itemized_view} <ChevronRight size={10} className={showItemDetails === debt.id ? 'rotate-90' : ''} />
                    </button>
                    
                    {showItemDetails === debt.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pb-2 overflow-hidden">
                        {(debt.items || []).map((i, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-medium text-white/50 italic px-2">
                             <span>{i.qty}x {i.name}</span>
                             <span>AED {(i.price * i.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {isVerifying === debt.id ? (
                    <button 
                      onClick={() => confirmPayment(debt.id)}
                      className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-pulse"
                    >
                      <ShieldCheck size={18} /> {t.verify_btn}
                    </button>
                  ) : (
                    <button 
                      onClick={() => initiateSettlement(debt)}
                      className="w-full btn-primary !py-4 flex items-center justify-center gap-3 !rounded-2xl !bg-gradient-to-r !from-blue-600 !to-blue-400 !text-white !shadow-none hover:scale-[1.02] transition-transform"
                    >
                      <Wallet2 size={18} />
                      <span className="font-black uppercase text-xs tracking-widest italic">{t.settle_ton}</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        ) : (
          /* --- HISTORY VIEW --- */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="history" className="space-y-3 pb-12">
            {history.length === 0 ? (
              <div className="p-20 text-center opacity-10 italic text-xs uppercase tracking-widest">No record of past transactions</div>
            ) : (
              history.map(entry => (
                <div key={entry.id} className="glass-card !p-5 flex items-center justify-between border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20">
                      <History size={20} />
                    </div>
                    <div>
                      <p className="font-black text-base italic">{entry.baqala_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">{new Date(entry.settled_at).toLocaleDateString()}</span>
                        <div className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="text-[9px] text-teal-400 font-black uppercase tracking-tighter">TON_NETWORK</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400 text-lg">AED {parseFloat(entry.total_aed).toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-1 text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">
                      Verified <ArrowUpRight size={10} />
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

// Utility Icons
function Percent({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  );
}

function ChevronRight({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
