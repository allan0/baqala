// ================================================
// frontend/src/components/HisaabTab.jsx
// VERSION 3 (Clean Ledger + Tokenomics - AI Genie Moved to Dashboard)
// ================================================
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const loc = {
  en: {
    title: "My Hisaab",
    subtitle: "Digital Credit Tabs",
    no_debts: "No active tabs yet. Start shopping at any baqala!",
    total_debt: "Total Outstanding",
    bqt_balance: "Your BQT Tokens",
    redeem: "Redeem BQT",
    refresh: "Refresh"
  },
  ar: {
    title: "حسابي",
    subtitle: "الحسابات الرقمية",
    no_debts: "لا توجد حسابات مفتوحة حالياً. ابدأ التسوق!",
    total_debt: "إجمالي الديون",
    bqt_balance: "توكنات BQT الخاصة بك",
    redeem: "استرداد BQT",
    refresh: "تحديث"
  }
};

export default function HisaabTab({ user, lang }) {
  const [debts, setDebts] = useState([]);
  const [bqtBalance, setBqtBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const t = loc[lang] || loc.en;
  const isRTL = lang === 'ar';

  const fetchData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Get open debts
      const ledgerRes = await axios.get(`${API_URL}/api/hisaab/ledger`, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      setDebts(ledgerRes.data || []);

      // Get BQT balance
      const tokenRes = await axios.get(`${API_URL}/api/token/balance`, {
        headers: { auth_id: user.id, telegram_id: user.telegram_id }
      });
      setBqtBalance(tokenRes.data.bqt || 0);
    } catch (e) {
      console.error("Hisaab fetch error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <RefreshCw className="animate-spin text-teal-400 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-white/30">{t.refresh}</p>
      </div>
    );
  }

  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.debt || 0), 0);

  return (
    <div className={`px-5 pt-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">{t.title}</h1>
            <p className="text-white/40 text-sm">{t.subtitle}</p>
          </div>
          <button onClick={fetchData} className="p-3 bg-white/10 rounded-2xl">
            <RefreshCw size={24} />
          </button>
        </div>

        {/* BQT Balance Card */}
        <div className="glass-card mb-8 border-teal-400/30 flex items-center gap-6 p-6">
          <Sparkles size={42} className="text-teal-400" />
          <div className="flex-1">
            <p className="uppercase text-xs font-black tracking-[2px] text-teal-400">{t.bqt_balance}</p>
            <p className="text-4xl font-black tracking-tighter text-teal-400">{bqtBalance.toFixed(0)} BQT</p>
          </div>
          <button className="px-8 py-4 bg-teal-400 text-black font-black rounded-3xl text-sm active:scale-95">
            {t.redeem}
          </button>
        </div>

        {/* Total Debt */}
        <div className="glass-card mb-6 p-6">
          <div className="flex justify-between items-center">
            <p className="text-white/50 font-medium">{t.total_debt}</p>
            <p className="text-3xl font-black text-orange-400">AED {totalDebt.toFixed(2)}</p>
          </div>
        </div>

        {/* Debts List */}
        {debts.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm font-medium italic">
            {t.no_debts}
          </div>
        ) : (
          debts.map((debt) => (
            <motion.div key={debt.id} className="glass-card mb-4 p-6 flex justify-between items-center">
              <div>
                <p className="font-bold">{debt.baqala?.name || 'Unknown Baqala'}</p>
                <p className="text-xs text-white/40">Updated recently</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-orange-400">AED {parseFloat(debt.debt).toFixed(2)}</p>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold mt-1">
                  <CheckCircle2 size={14} /> Open
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
