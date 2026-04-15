// ================================================
// frontend/src/components/HisaabTab.jsx
// VERSION 15 (PRODUCTION LEDGER & SETTLEMENT)
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
    ledger_title: "Hisaab & Benefits",
    total_owed: "Total Outstanding",
    settle_ton: "Settle via TON",
    savings_alert: "TON Crypto Discount",
    empty_ledger: "All tabs are clear! Shukran.",
    tab_active: "Active Tabs",
    merchant_label: "Store",
    fazaa_hub: "Fazaa Benefit Hub",
    fazaa_desc: "Link your Fazaa card for 5% extra discount at participating baqalas.",
    fazaa_link: "Link Fazaa Card",
    fazaa_active: "Fazaa Linked",
    wallet_needed: "Please link a wallet in profile first.",
    confirmed: "Ledger Entry Synchronized!",
    items_view: "Item Details"
  },
  ar: {
    ledger_title: "الحساب والمزايا",
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
    wallet_needed: "يرجى ربط المحفظة من الإعدادات أولاً.",
    confirmed: "تم تحديث السجل بنجاح!",
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
  const TON_EXCHANGE_RATE = 20.50; // Mock rate: 1 TON = 20.50 AED

  // 1. Fetch real ledger data from Supabase
  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      // We'll create this endpoint in the next backend update
      const res = await axios.get(`${API_URL}/api/hisaab/ledger`, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      setDebts(res.data || []);
    } catch (e) {
      console.error("Ledger fetch error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, [user.id]);

  // 2. Real Fazaa Linking
  const handleLinkFazaa = async () => {
    if (!fazaaInput) return;
    setIsLinking(true);
    try {
      await axios.post(`${API_URL}/api/user/update`, {
        id: user.id,
        fazaa_card: fazaaInput
      });
      setActiveFazaa(fazaaInput);
      setIsLinking(false);
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.fazaa_active);
    } catch (e) {
      alert("Failed to link Fazaa");
      setIsLinking(false);
    }
  };

  // 3. Real TON Payment Bridge
  const handleSettle = (debt) => {
    const discount = (debt.baqala?.crypto_discount || 10) + (activeFazaa ? 5 : 0);
    const finalAed = debt.total_aed * (1 - discount / 100);
    const tonAmount = (finalAed / TON_EXCHANGE_RATE).toFixed(4);
    
    // Format: https://t.me/wallet/transfer?address=...&amount=...&text=...
    const merchantWallet = debt.baqala?.wallet_address || "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
    const memo = `Baqala_Pay_${debt.id.slice(0,8)}`;
    const tonUrl = `https://t.me/wallet/transfer?address=${merchantWallet}&amount=${tonAmount}&text=${encodeURIComponent(memo)}`;

    if (WebApp?.openTelegramLink) {
        WebApp.openTelegramLink(tonUrl);
    } else {
        window.open(tonUrl, '_blank');
    }
  };

  const totalBalance = debts.reduce((sum, d) => sum + parseFloat(d.total_aed), 0);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Ledger...</p>
    </div>
  );

  return (
    <div className="px-5 pt-4 pb-32">
      {/* LEDGER OVERVIEW */}
      <div className="glass-card !bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20 mb-8 overflow-hidden relative">
        <Sparkles className="absolute -right-4 -top-4 text-teal-400/10" size={120} />
        <p className="text-[10px] font-black uppercase text-teal-400 mb-2 tracking-[2px]">{t.ledger_title}</p>
        <h2 className="text-4xl font-black italic tracking-tighter mb-6">AED {totalBalance.toFixed(2)}</h2>
        
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
           <div className="w-10 h-10 bg-teal-400 rounded-xl flex items-center justify-center text-black shadow-lg shadow-teal-400/20">
              <Percent size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase leading-none mb-1">{t.savings_alert}</p>
              <p className="text-xs text-white/40">~AED {(totalBalance * 0.1).toFixed(2)} savings available</p>
           </div>
        </div>
      </div>

      {/* FAZAA CARD SECTION */}
      <div className="glass-card mb-8">
         <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
               <IdCard size={24} />
            </div>
            <div>
               <h3 className="font-black italic uppercase text-sm leading-tight">{t.fazaa_hub}</h3>
               <p className="text-[10px] text-white/30 font-bold uppercase mt-1">UAE Resident Benefits</p>
            </div>
         </div>

         {activeFazaa ? (
           <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <ShieldCheck className="text-emerald-400" size={18} />
                 <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">ID: {activeFazaa}</span>
              </div>
              <CheckCircle2 size={18} className="text-emerald-400" />
           </div>
         ) : (
           <div className="space-y-3">
              <p className="text-[11px] text-white/40 leading-relaxed px-1">{t.fazaa_desc}</p>
              <div className="flex gap-2">
                 <input 
                   className="input-modern flex-1 !py-3 !text-sm" 
                   placeholder="Card Number" 
                   value={fazaaInput}
                   onChange={e => setFazaaInput(e.target.value)}
                 />
                 <button onClick={handleLinkFazaa} disabled={isLinking} className="bg-white text-black px-6 rounded-2xl font-black uppercase text-[10px]">
                    {isLinking ? '...' : t.fazaa_link}
                 </button>
              </div>
           </div>
         )}
      </div>

      {/* ACTIVE DEBTS LIST */}
      <h3 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[3px] mb-4 px-1">{t.tab_active}</h3>
      
      <div className="space-y-4">
        {debts.length === 0 ? (
          <div className="glass-card py-12 text-center border-dashed border-white/10 bg-transparent">
             <Clock className="mx-auto mb-4 text-white/10" size={32} />
             <p className="text-xs font-bold text-white/20 uppercase tracking-widest">{t.empty_ledger}</p>
          </div>
        ) : (
          debts.map(debt => (
            <motion.div key={debt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card !p-0 overflow-hidden">
               <div className="p-6 border-b border-white/5 flex justify-between items-start">
                  <div>
                     <p className="text-[9px] font-black text-white/20 uppercase mb-1">{t.merchant_label}</p>
                     <h4 className="text-lg font-black italic">{debt.baqala?.name || 'Local Store'}</h4>
                     <p className="text-[10px] text-white/40 mt-1">{new Date(debt.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-2xl font-black tracking-tighter">AED {debt.total_aed.toFixed(2)}</p>
                     <div className="flex items-center gap-1 justify-end text-teal-400 mt-1">
                        <Wallet2 size={10} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">~{ (debt.total_aed / TON_EXCHANGE_RATE).toFixed(3) } TON</span>
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-white/[0.02] flex gap-3">
                  <button onClick={() => handleSettle(debt)} className="flex-1 btn-primary !py-3 !text-[10px] uppercase">
                     <Zap size={14} /> {t.settle_ton}
                  </button>
                  <button className="px-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40">
                     <Receipt size={18} />
                  </button>
               </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
