// ================================================
// frontend/src/components/HisaabTab.jsx
// VERSION 4.0 (Token Vault + Ledger + Web3 Ready)
// ================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, RefreshCw, CheckCircle2, 
  Sparkles, Lock, Unlock, ArrowUpRight,
  TrendingDown, Info
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const WebApp = window.Telegram?.WebApp;

const loc = {
  en: {
    title: "Digital Hisaab",
    subtitle: "Your Neighborhood Ledger",
    vault_title: "BQT Token Vault",
    spendable: "Available to Spend",
    locked: "Locked (Maturing)",
    unlock_note: "10% unlocks monthly based on your activity.",
    total_debt: "Total Outstanding Hisaab",
    settle_btn: "Settle with TON (10% Off)",
    no_debts: "Your ledger is clear! No active debts found.",
    store_label: "Baqala",
    status_open: "Open Tab",
    refreshing: "Syncing Ledger..."
  },
  ar: {
    title: "الحساب الرقمي",
    subtitle: "دفتر ديون الفريج",
    vault_title: "خزنة توكنات BQT",
    spendable: "رصيد قابل للصرف",
    locked: "رصيد مقيد (قيد المعالجة)",
    unlock_note: "يتم فتح 10% من الرصيد شهرياً بناءً على نشاطك.",
    total_debt: "إجمالي ديون الحساب",
    settle_btn: "تسوية عبر TON (خصم 10%)",
    no_debts: "حسابك صافي! لا توجد ديون حالياً.",
    store_label: "الدكان",
    status_open: "حساب مفتوح",
    refreshing: "جاري المزامنة..."
  }
};

export default function HisaabTab({ user, lang, refreshBalances }) {
  const [debts, setDebts] = useState([]);
  const [balances, setBalances] = useState({ locked: 0, available: 0 });
  const [loading, setLoading] = useState(true);

  const t = useMemo(() => loc[lang] || loc.en, [lang]);
  const isRTL = lang === 'ar';

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Debts
      const ledgerRes = await axios.get(`${API_URL}/api/hisaab/ledger`, {
        headers: { telegram_id: user.telegram_id }
      });
      setDebts(ledgerRes.data || []);

      // 2. Fetch Token Balance
      const tokenRes = await axios.get(`${API_URL}/api/token/balance`, {
        headers: { telegram_id: user.telegram_id }
      });
      setBalances({
        locked: tokenRes.data.locked,
        available: tokenRes.data.available
      });
    } catch (e) {
      console.error("Hisaab Fetch Failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const totalDebt = useMemo(() => 
    debts.reduce((sum, d) => sum + parseFloat(d.debt_amount || 0), 0)
  , [debts]);

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  return (
    <div className={`px-5 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white">{t.title}</h1>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">{t.subtitle}</p>
          </div>
          <button 
            onClick={() => { haptic('light'); fetchData(); if(refreshBalances) refreshBalances(); }}
            className={`p-4 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={20} className="text-teal-400" />
          </button>
        </div>

        {/* TOKEN VAULT CARD */}
        <div className="glass-card !bg-gradient-to-br from-teal-400/10 to-orange-500/5 border-teal-400/20 p-8 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-teal-400/5 rotate-12">
            <Sparkles size={160} />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-400 rounded-xl flex items-center justify-center text-black">
              <Unlock size={20} strokeWidth={3} />
            </div>
            <h3 className="font-black italic text-lg uppercase tracking-tight text-white">{t.vault_title}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{t.spendable}</p>
              <p className="text-3xl font-black tracking-tighter">{balances.available.toFixed(0)} <span className="text-sm">BQT</span></p>
            </div>
            <div className="space-y-1 opacity-60">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1">
                <Lock size={10} /> {t.locked}
              </p>
              <p className="text-3xl font-black tracking-tighter">{balances.locked.toFixed(0)} <span className="text-sm">BQT</span></p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2">
            <Info size={14} className="text-teal-400/50" />
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{t.unlock_note}</p>
          </div>
        </div>

        {/* TOTAL DEBT CARD */}
        <div className="glass-card p-8 border-white/5 bg-white/[0.02]">
          <p className="text-[11px] font-black text-white/30 uppercase tracking-[4px] mb-2">{t.total_debt}</p>
          <div className="flex justify-between items-center">
            <h2 className="text-5xl font-black tracking-tighter text-white">
              <span className="text-lg font-bold text-white/40 mr-2">AED</span>
              {totalDebt.toFixed(2)}
            </h2>
            <div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20">
              <TrendingDown size={28} />
            </div>
          </div>
          
          {totalDebt > 0 && (
            <button 
              onClick={() => haptic('heavy')}
              className="btn-primary w-full mt-8 !py-5 flex items-center justify-center gap-3 !rounded-2xl shadow-xl shadow-teal-400/20"
            >
              <span className="uppercase font-black italic tracking-tight text-lg">{t.settle_btn}</span>
              <ArrowUpRight size={22} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* LEDGER LIST */}
        <div className="space-y-4 pb-10">
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[5px] px-2 italic">Active Ledger Entries</h4>
          
          {debts.length === 0 ? (
            <div className="py-20 text-center glass-card border-dashed border-white/10 bg-transparent">
              <CreditCard size={48} className="mx-auto text-white/5 mb-4" />
              <p className="text-sm font-medium text-white/20 italic">{t.no_debts}</p>
            </div>
          ) : (
            debts.map((debt) => (
              <motion.div 
                key={debt.id}
                whileTap={{ scale: 0.98 }}
                className="glass-card !p-6 flex justify-between items-center border-white/5 hover:border-teal-400/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black/40 rounded-2xl flex items-center justify-center text-2xl border border-white/5">🏪</div>
                  <div>
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-0.5">{t.store_label}</p>
                    <p className="font-black italic text-lg text-white leading-none">{debt.baqala?.name || "Neighbor Baqala"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-orange-400 tracking-tighter">AED {parseFloat(debt.debt_amount).toFixed(2)}</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                    <CheckCircle2 size={12} /> {t.status_open}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
