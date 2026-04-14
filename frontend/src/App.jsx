import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Wallet as WalletIcon, Users, User, 
  ShoppingCart as CartIcon, Store as StoreIcon,
  X, Smartphone, Globe, ShieldCheck, LogOut,
  ChevronRight, ChevronLeft, Languages, Home, Settings, ArrowLeft
} from 'lucide-react';
import { ethers } from 'ethers';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI LOCALIZATION ---
const translations = {
  en: {
    role_customer: "Resident",
    role_merchant: "Merchant",
    nav_home: "Neighborhood",
    nav_hisaab: "My Ledger",
    nav_profile: "Identity",
    connect_wallet: "Link Wallet",
    switch_merchant: "Merchant Portal",
    switch_customer: "Back to Resident",
    disconnect: "Unlink Wallet",
    account_status: "Network Status",
    active: "VERIFIED",
    security: "Identity & Security",
    intro_sub: "THE DIGITAL HISAB NETWORK",
    confirm_delete: "⚠️ This action is final. All store records will be wiped. Proceed?",
    wallet_evm: "EVM (MetaMask)",
    wallet_ton: "TON (Telegram)",
    wallet_subtitle: "Choose your payout protocol",
    exit_merchant: "Exit Merchant Mode"
  },
  ar: {
    role_customer: "ساكن",
    role_merchant: "تاجر",
    nav_home: "الفريج",
    nav_hisaab: "دفتر الحساب",
    nav_profile: "الهوية",
    connect_wallet: "ربط المحفظة",
    switch_merchant: "بوابة التاجر",
    switch_customer: "العودة كساكن",
    disconnect: "قطع الاتصال",
    account_status: "حالة الشبكة",
    active: "موثق",
    security: "الأمان والهوية",
    intro_sub: "شبكة الحساب الرقمي",
    confirm_delete: "⚠️ هذا الإجراء نهائي. سيتم حذف جميع بيانات الدكان. هل أنت متأكد؟",
    wallet_evm: "محفظة EVM",
    wallet_ton: "محفظة TON",
    wallet_subtitle: "اختر بروتوكول التسوية",
    exit_merchant: "خروج من وضع التاجر"
  }
};

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [showIntro, setShowIntro] = useState(true);
  const [initialStoreId, setInitialStoreId] = useState(null);

  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('baqala_wallet') || null);
  const [walletType, setWalletType] = useState(localStorage.getItem('baqala_wallet_type') || null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  // --- VERSION 6.0 SAFETY HELPERS ---
  const safeHaptic = (style = 'medium') => {
    if (WebApp?.isVersionAtLeast('6.1')) {
      try { WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
    }
  };

  const safeAlert = (msg) => {
    if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(msg);
    else alert(msg);
  };

  const safeConfirm = (msg, cb) => {
    if (WebApp?.isVersionAtLeast('6.2')) WebApp.showConfirm(msg, (ok) => { if(ok) cb(); });
    else { if(window.confirm(msg)) cb(); }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
      
      // Handle Start Parameters
      const startParam = WebApp.initDataUnsafe?.start_param;
      if (startParam) {
        const parts = startParam.split('_');
        const stIdx = parts.indexOf('st');
        if (stIdx !== -1 && parts[stIdx + 1]) setInitialStoreId(parts[stIdx + 1]);
        if (parts.includes('ar')) setLang('ar');
      }

      // v6.0 Safeguard for styles
      if (WebApp.isVersionAtLeast('6.1')) {
        try { WebApp.setHeaderColor('#0a0a0f'); } catch(e) {}
      }
    }
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    const timer = setTimeout(() => setShowIntro(false), 1800);
    return () => clearTimeout(timer);
  }, [isRTL]);

  // --- NAVIGATION ---
  useEffect(() => {
    if (WebApp?.isVersionAtLeast('6.1')) {
      if (activeTab !== 'home' || role === 'vendor') {
        WebApp.BackButton.show();
        WebApp.BackButton.onClick(() => {
          if (role === 'vendor') setRole('customer');
          else setActiveTab('home');
        });
      } else {
        WebApp.BackButton.hide();
      }
    }
  }, [activeTab, role]);

  const toggleRole = () => {
    safeHaptic('heavy');
    const nRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(nRole);
    localStorage.setItem('baqala_role', nRole);
    setActiveTab('home');
  };

  const handleWalletConnect = (type, addr) => {
    setWalletAddress(addr);
    setWalletType(type);
    localStorage.setItem('baqala_wallet', addr);
    localStorage.setItem('baqala_wallet_type', type);
    setShowWalletModal(false);
    safeAlert(t.wallet_connected);
  };

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-[9999]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="text-7xl mb-4">🏪</div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#00f5d4] to-[#ff5e00] bg-clip-text text-transparent italic">Baqalas</h1>
          <p className="text-[#94a3b8] tracking-[4px] text-[9px] mt-2 font-black uppercase">{t.intro_sub}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col font-sans overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      
      {/* --- UNIFIED HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[500px] mx-auto flex items-center justify-between px-5 py-4">
          
          <div className="flex items-center gap-3">
             <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
               <Languages size={18} className="text-teal-400" />
             </button>
             <div onClick={toggleRole} className="cursor-pointer">
               <div className="text-[8px] font-black text-[#ff5e00] tracking-widest uppercase leading-none mb-1">{role === 'customer' ? t.role_customer : t.role_merchant}</div>
               <div className="font-black text-sm leading-none flex items-center gap-1">
                 {role === 'vendor' && <StoreIcon size={12} className="text-teal-400" />}
                 {user?.first_name || 'Guest'}
               </div>
             </div>
          </div>

          <button
            onClick={() => setShowWalletModal(true)}
            className={`text-[9px] font-black uppercase tracking-tight px-3 py-2 rounded-lg border transition-all ${
              walletAddress ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/50 bg-white/5'
            }`}
          >
            {walletAddress ? (isRTL ? 'محفظة نشطة' : 'Active Wallet') : t.connect_wallet}
          </button>
        </div>
      </header>

      {/* --- CONTENT AREA --- */}
      <main className="flex-1 w-full max-w-[500px] mx-auto overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          {role === 'vendor' ? (
            <VendorDashboard key="vendor" user={user} lang={lang} onDelete={(id) => safeConfirm(t.confirm_delete, () => /* delete */ null)} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={user} lang={lang} initialStore={initialStoreId} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={user} wallet={walletAddress} lang={lang} />}
              {activeTab === 'profile' && (
                <div className="p-6 space-y-6">
                  <div className="glass-card">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl font-black">{user?.first_name?.[0] || 'U'}</div>
                      <div>
                        <h2 className="text-xl font-black">{user?.first_name}</h2>
                        <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">{t.active}</p>
                      </div>
                    </div>
                    <button onClick={toggleRole} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group">
                      <span className="font-bold text-sm uppercase">{t.switch_merchant}</span>
                      <ChevronRight size={16} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  {walletAddress && (
                    <button onClick={() => { setWalletAddress(null); safeHaptic('medium'); }} className="w-full p-4 rounded-xl bg-red-500/10 text-red-500 font-black uppercase text-[10px] border border-red-500/20">{t.disconnect}</button>
                  )}
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* --- NAV (Only for Customer) --- */}
      {role === 'customer' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-2xl border-t border-white/5 z-50">
          <div className="max-w-[500px] mx-auto flex justify-around items-center py-5 px-4">
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'home' ? 'text-teal-400' : 'text-white/20'}`}>
              <Home size={22} /><span className="text-[8px] font-black uppercase">{t.nav_home}</span>
            </button>
            <button onClick={() => setActiveTab('hisaab')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'hisaab' ? 'text-teal-400' : 'text-white/20'}`}>
              <CartIcon size={22} /><span className="text-[8px] font-black uppercase">{t.nav_hisaab}</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'profile' ? 'text-teal-400' : 'text-white/20'}`}>
              <User size={22} /><span className="text-[8px] font-black uppercase">{t.nav_profile}</span>
            </button>
          </div>
        </nav>
      )}

      {/* WALLET MODAL */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
            <div onClick={() => setShowWalletModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-10 border-t border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic">{t.connect_wallet}</h2>
                <X onClick={() => setShowWalletModal(false)} className="opacity-30" />
              </div>
              <div className="space-y-4">
                <button onClick={() => handleWalletConnect('TON', 'UQ-Mock-TON-Addr')} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 active:scale-95 transition-all">
                  <div className="flex items-center gap-5">
                    <Smartphone size={32} className="text-blue-400"/>
                    <div className="text-left font-black text-lg">{t.wallet_ton}</div>
                  </div>
                  <Globe size={18} className="opacity-20" />
                </button>
                <button onClick={() => handleWalletConnect('EVM', '0x-Mock-EVM-Addr')} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 active:scale-95 transition-all">
                  <div className="flex items-center gap-5">
                    <WalletIcon size={32} className="text-orange-400"/>
                    <div className="text-left font-black text-lg">{t.wallet_evm}</div>
                  </div>
                  <Globe size={18} className="opacity-20" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
