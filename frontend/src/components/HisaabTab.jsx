import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Clock, Wallet, ArrowRight, CheckCircle2, 
  Zap, Receipt, History, ExternalLink, RefreshCw,
  Wallet2, ArrowUpRight, ShieldCheck, Percent, 
  ChevronRight, Info, AlertCircle, Award, IdCard, Sparkles
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    ledger_title: "Hisaab & Benefits",
    total_owed: "Outstanding Debt",
    settle_ton: "Settle with TON",
    verify_payment: "Verify Payment",
    savings_alert: "TON Crypto Discount",
    empty_ledger: "All tabs are clear.",
    tab_active: "Active Tabs",
    tab_history: "History",
    merchant_label: "Shop",
    date_label: "Date",
    fazaa_hub: "Fazaa Benefit Hub",
    fazaa_desc: "Link your Fazaa card for extra discounts at participating baqalas.",
    fazaa_link: "Link Fazaa Card",
    fazaa_active: "Fazaa Linked",
    fazaa_savings: "Fazaa Discount Applied",
    rate_info: "1 TON ≈ 20.50 AED",
    wallet_needed: "Please connect your TON wallet.",
    confirmed: "🎉 Ledger Entry Synchronized!",
    items_view: "Itemized List"
  },
  ar: {
    ledger_title: "الحساب والمزايا",
    total_owed: "الديون المستحقة",
    settle_ton: "تسوية بواسطة TON",
    verify_payment: "تأكيد السداد",
    savings_alert: "خصم تسوية الكريبتو",
    empty_ledger: "حسابك صافي! لا توجد ديون.",
    tab_active: "الحسابات النشطة",
    tab_history: "السجلات",
    merchant_label: "الدكان",
    date_label: "التاريخ",
    fazaa_hub: "مركز مزايا فزعة",
    fazaa_desc: "اربط بطاقة فزعة للحصول على خصومات إضافية في الدكاكين المشاركة.",
    fazaa_link: "ربط بطاقة فزعة",
    fazaa_active: "تم تفعيل فزعة",
    fazaa_savings: "تم تطبيق خصم فزعة",
    rate_info: "١ طن ≈ ٢٠.٥٠ درهم",
    wallet_needed: "يرجى ربط محفظة TON أولاً.",
    confirmed: "🎉 تم تحديث سجل الحساب بنجاح!",
    items_view: "تفاصيل الأغراض"
  }
};

export default function HisaabTab({ user, wallet, lang }) {
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeView, setActiveView] = useState('active'); // active, history
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null); 
  const [expandedId, setExpandedId] = useState(null);

  // Fazaa Logic State
  const [fazaaCard, setFazaaCard] = useState(localStorage.getItem('baqala_fazaa') || null);
  const [isLinkingFazaa, setIsLinkingFazaa] = useState(false);
  const [fazaaInput, setFazaaInput] = useState('');

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const userId = user?.id?.toString() || 'guest_resident';

  // --- TON PRICING ENGINE ---
  const TON_RATE = 20.50; 

  useEffect(() => {
    fetchLedger();
  }, [userId]);

  const fetchLedger = async () => {
    try {
      // NOTE: These endpoints don't exist yet, this is predictive based on request.
      // Will need to be added to routes.js
      // const [outRes, histRes] = await Promise.all([
      //   axios.get(`${API_URL}/api/hisaab/outstanding?telegram_id=${userId}`),
      //   axios.get(`${API_URL}/api/hisaab/history?telegram_id=${userId}`)
      // ]);
      // setOutstanding(outRes.data || []);
      // setHistory(histRes.data || []);
      console.log("Fetching ledger... (using mock data for now)");
    } catch (e) {
      console.error("Ledger Fetch Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const haptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleLinkFazaa = async () => {
    if (!fazaaInput.trim()) return;
    localStorage.setItem('baqala_fazaa', fazaaInput);
    setFazaaCard(fazaaInput);
    setIsLinkingFazaa(false);
    haptic('success');
    
    // Sync with backend
    try {
      await axios.post(`${API_URL}/api/user/update`, {
        telegram_id: userId,
        fazaa_card: fazaaInput
      });
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.fazaa_active);
    } catch (e) {
      console.error("Fazaa Sync Error", e);
      alert("Could not sync Fazaa card with backend.");
    }
  };


  const handleSettle = async (debt) => {
    if (!wallet) {
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.wallet_needed);
      return;
    }
    haptic('heavy');
    
    let totalDiscount = debt.crypto_discount || 10;
    if (fazaaCard && debt.accepts_fazaa) totalDiscount += 5; // 5% extra for Fazaa

    const finalAed = debt.total_aed * (1 - totalDiscount / 100);
    const tonAmount = (finalAed / TON_RATE).toFixed(4);
    const nanoTons = Math.floor(tonAmount * 1000000000);

    const merchantWallet = debt.baqala_ton_address || "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"; // Default test wallet
    const memo = `Baqala_Settlement_${debt.id}`;
    const tonUrl = `ton://transfer/${merchantWallet}?amount=${nanoTons}&text=${encodeURIComponent(memo)}`;

    if (WebApp?.openLink) WebApp.openLink(tonUrl);
    else window.location.href = tonUrl;

    setVerifyingId(debt.id);
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
        fetchLedger();
        if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.confirmed);
      }
    } catch (e) {
      alert("Verification Pending...");
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = outstanding.reduce((sum, d) => sum + parseFloat(d.total_aed), 0);

  if (isLoading && outstanding.length === 0) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Accessing Ledger...</p>
    </div>
  );

  return (
    <div className={`px-5 pt-4 ${isRTL ? 'font-arabic' : ''}`}>
      
      {/* 1. FAZAA Hub - Premium Component */}
      <div className="glass-card !p-0 overflow-hidden mb-6 border-[#FACC15]/20 bg-gradient-to-br from-[#FACC15]/5 to-transparent">
        <div className="p-6">
           <div className="flex justify-between items-start mb-4">
              <div>
                 <h3 className="font-black text-lg italic text-[#FACC15] flex items-center gap-2">
                    <Award size={20} /> {t.fazaa_hub}
                 </h3>
                 <p className="text-[10px] text-white/40 mt-1">{t.fazaa_desc}</p>
              </div>
              <Sparkles size={24} className="text-[#FACC15] opacity-20" />
           </div>

           {fazaaCard ? (
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-[#FACC15] rounded-full flex items-center justify-center text-black font-black">F</div>
                   <div>
                      <p className="text-xs font-black uppercase tracking-widest text-[#FACC15]">Active Member</p>
                      <p className="font-mono text-xs opacity-60">**** **** {fazaaCard.slice(-4)}</p>
                   </div>
                </div>
                <CheckCircle2 size={20} className="text-emerald-400" />
             </div>
           ) : (
             <button 
              onClick={() => setIsLinkingFazaa(true)}
              className="w-full py-4 bg-[#FACC15] text-black rounded-2xl font-black uppercase text-xs shadow-xl shadow-[#FACC15]/10 active:scale-95 transition-all"
             >
               {t.fazaa_link}
             </button>
           )}
        </div>
      </div>

      {/* 2. TOTAL BALANCE */}
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
      </div>

      {/* 3. TABS */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 mb-8 border border-white/5">
        <button onClick={() => setActiveView('active')} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'active' ? 'bg-white text-black shadow-2xl' : 'text-white/30'}`}>
          {t.tab_active}
        </button>
        <button onClick={() => setActiveView('history')} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'history' ? 'bg-white text-black shadow-2xl' : 'text-white/30'}`}>
          {t.tab_history}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'active' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="active" className="space-y-4 pb-20">
             {outstanding.length === 0 ? (
               <div className="p-20 text-center opacity-30 italic text-xs uppercase tracking-widest">{t.empty_ledger}</div>
             ) : (
               outstanding.map(debt => (
                 <div key={debt.id} className="glass-card !p-6 border-white/5 relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <h3 className="font-black text-xl italic leading-none mb-2">{debt.baqala_name || t.merchant_label}</h3>
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">{new Date(debt.created_at).toLocaleDateString()}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-2xl font-black text-white tracking-tighter">AED {parseFloat(debt.total_aed).toFixed(2)}</p>
                          {fazaaCard && debt.accepts_fazaa && (
                            <div className="flex items-center justify-end gap-1 mt-1 text-[#FACC15]">
                               <Percent size={10} />
                               <span className="text-[9px] font-black uppercase">{t.fazaa_savings}</span>
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 mb-6">
                       <button onClick={() => setExpandedId(expandedId === debt.id ? null : debt.id)} className="text-[9px] font-black uppercase text-blue-400 flex items-center gap-1.5">
                         {t.items_view} <ChevronRight size={10} className={`transition-transform ${expandedId === debt.id ? 'rotate-90' : ''}`} />
                       </button>
                       <AnimatePresence>
                         {expandedId === debt.id && (
                           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="py-4 space-y-2">
                                 {(debt.items || []).map((item, idx) => (
                                   <div key={idx} className="flex justify-between text-xs font-medium text-white/40 italic px-2">
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
                      <button onClick={() => verifyOnChain(debt.id)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 animate-pulse shadow-lg shadow-emerald-500/20">
                        <ShieldCheck size={18} /> {t.verify_payment}
                      </button>
                    ) : (
                      <button onClick={() => handleSettle(debt)} className="w-full btn-primary !bg-gradient-to-r !from-blue-600 !to-blue-400 !text-white !py-4.5 !rounded-2xl flex items-center justify-center gap-3 shadow-none active:scale-95 transition-all">
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
             {history.map(entry => (
               <div key={entry.id} className="glass-card !p-5 flex items-center justify-between border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white/5 rounded-[20px] flex items-center justify-center text-white/20">
                        <History size={20} />
                     </div>
                     <div>
                        <p className="font-black text-base italic leading-tight mb-1">{entry.baqala_name}</p>
                        <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">{new Date(entry.settled_at).toLocaleDateString()}</span>
                     </div>
                  </div>
                  <p className="font-black text-emerald-400 text-lg">AED {parseFloat(entry.total_aed).toFixed(2)}</p>
               </div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAZAA LINK MODAL */}
      <AnimatePresence>
        {isLinkingFazaa && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <div onClick={() => setIsLinkingFazaa(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-[400px] glass-card !p-10 border-[#FACC15]/30">
                <div className="w-16 h-16 bg-[#FACC15]/10 rounded-3xl flex items-center justify-center text-[#FACC15] mx-auto mb-6 shadow-2xl">
                   <IdCard size={32} />
                </div>
                <h2 className="text-2xl font-black text-center mb-2 italic">Fazaa Digital Link</h2>
                <p className="text-[10px] text-center text-white/40 uppercase tracking-widest mb-8 leading-relaxed px-4">Enter your Fazaa membership number to activate neighbourhood benefits.</p>
                
                <input 
                  className="input-modern !py-4 mb-6 text-center font-mono tracking-widest"
                  placeholder="0000 0000 0000"
                  value={fazaaInput}
                  onChange={e => setFazaaInput(e.target.value)}
                  autoFocus
                />

                <div className="flex gap-2">
                   <button onClick={() => setIsLinkingFazaa(false)} className="flex-1 py-4 bg-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                   <button onClick={handleLinkFazaa} className="flex-2 py-4 bg-[#FACC15] text-black rounded-xl font-black uppercase text-[10px] tracking-widest">Link Card</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
