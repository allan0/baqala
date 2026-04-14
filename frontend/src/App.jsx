import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Wallet as WalletIcon, Users, User, 
  ShoppingCart as CartIcon, Store as StoreIcon,
  X, Smartphone, Globe, ShieldCheck, LogOut,
  ChevronRight, ChevronLeft, Languages, Home, Settings
} from 'lucide-react';
import { ethers } from 'ethers';

// Dashboard Components (We will finalize these next)
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- COMPREHENSIVE LOCALIZATION ---
const translations = {
  en: {
    role_customer: "Customer Profile",
    role_merchant: "Merchant Mode",
    nav_home: "Discover",
    nav_hisaab: "My Hisaab",
    nav_profile: "Me",
    connect_wallet: "Connect Wallet",
    switch_merchant: "Merchant Portal",
    switch_customer: "Customer View",
    disconnect: "Disconnect Wallet",
    account_status: "Network Status",
    network_role: "Global Role",
    active: "VERIFIED",
    buyer: "RESIDENT",
    security: "Identity & Security",
    intro_sub: "THE UAE DIGITAL HISAB NETWORK",
    confirm_delete: "⚠️ FINAL WARNING: This action will permanently wipe your store, inventory, and all customer debt records from the blockchain and database. This cannot be reversed. Proceed?",
    store_deleted: "Your store has been dissolved.",
    wallet_evm: "EVM (MetaMask/Browser)",
    wallet_ton: "TON (Telegram Native)",
    wallet_subtitle: "Choose your settlement protocol",
    wallet_connected: "Wallet Active",
    lang_btn: "English"
  },
  ar: {
    role_customer: "ملف العميل",
    role_merchant: "وضع التاجر",
    nav_home: "استكشف",
    nav_hisaab: "حسابي",
    nav_profile: "ملفي",
    connect_wallet: "ربط المحفظة",
    switch_merchant: "بوابة التاجر",
    switch_customer: "واجهة العميل",
    disconnect: "قطع الاتصال",
    account_status: "حالة الشبكة",
    network_role: "الدور الحالي",
    active: "موثق",
    buyer: "سكان الحي",
    security: "الهوية والأمان",
    intro_sub: "شبكة الحساب الرقمي في الإمارات",
    confirm_delete: "⚠️ تحذير نهائي: سيتم حذف متجرك وبضاعتك وجميع سجلات ديون الزبائن نهائياً. لا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟",
    store_deleted: "تم إغلاق الدكان وحذف بياناته.",
    wallet_evm: "محفظة EVM (ميتاماسك)",
    wallet_ton: "محفظة TON (تليجرام)",
    wallet_subtitle: "اختر بروتوكول التسوية الخاص بك",
    wallet_connected: "المحفظة متصلة",
    lang_btn: "العربية"
  }
};

export default function App() {
  // --- GLOBAL APP STATE ---
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [showIntro, setShowIntro] = useState(true);
  
  // Deep link state (if user comes from bot)
  const [initialStoreId, setInitialStoreId] = useState(null);

  // --- WALLET STATE ---
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('baqala_wallet') || null);
  const [walletType, setWalletType] = useState(localStorage.getItem('baqala_wallet_type') || null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  // --- NATIVE APP INITIALIZATION ---
  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand(); // Full page snap
      
      // Fullscreen support (Telegram 8.0+)
      if (WebApp.isVersionAtLeast('8.0')) {
        try { WebApp.requestFullscreen(); } catch (e) {}
      }

      // Identify User
      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }

      // PARSE START PARAMETERS (From Bot Menu/AI)
      // Format expected: st_STOREID_ln_LANG
      const startParam = WebApp.initDataUnsafe?.start_param;
      if (startParam) {
        const parts = startParam.split('_');
        const stIdx = parts.indexOf('st');
        const lnIdx = parts.indexOf('ln');

        if (stIdx !== -1 && parts[stIdx + 1]) {
          setInitialStoreId(parts[stIdx + 1]);
        }
        if (lnIdx !== -1 && parts[lnIdx + 1]) {
          setLang(parts[lnIdx + 1]);
        }
      }

      WebApp.setHeaderColor('#0a0a0f');
    }

    // Sync RTL/LTR to HTML tag
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem('baqala_lang', lang);

    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, [lang, isRTL]);

  // --- TELEGRAM BACK BUTTON SYNC ---
  useEffect(() => {
    if (!WebApp) return;
    if (activeTab !== 'home') {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => setActiveTab('home'));
    } else {
      WebApp.BackButton.hide();
    }
  }, [activeTab]);

  // --- WALLET CONNECTORS ---
  const connectEVM = async () => {
    if (!window.ethereum) {
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert("Please use MetaMask or a Web3 browser.");
      else alert("Web3 Provider not found.");
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);
      setWalletType('evm');
      localStorage.setItem('baqala_wallet', accounts[0]);
      localStorage.setItem('baqala_wallet_type', 'evm');
      setShowWalletModal(false);
    } catch (err) {
      console.error(err);
    } finally { setIsConnecting(false); }
  };

  const connectTON = () => {
    setIsConnecting(true);
    // Native TON logic would go here, using mock for demo
    setTimeout(() => {
      const mockTon = `UQ${user?.id || 'ALPHA'}...TON_SAFE`;
      setWalletAddress(mockTon);
      setWalletType('ton');
      localStorage.setItem('baqala_wallet', mockTon);
      localStorage.setItem('baqala_wallet_type', 'ton');
      setShowWalletModal(false);
      setIsConnecting(false);
    }, 800);
  };

  const logout = () => {
    setWalletAddress(null);
    setWalletType(null);
    localStorage.removeItem('baqala_wallet');
    localStorage.removeItem('baqala_wallet_type');
  };

  // --- GLOBAL HANDLERS ---
  const handleDeleteStore = (id) => {
    const performDelete = async () => {
      // await fetch(`${API_URL}/api/baqala/${id}`, { method: 'DELETE' });
      setRole('customer');
      localStorage.setItem('baqala_role', 'customer');
      window.location.reload();
    };

    if (WebApp?.isVersionAtLeast('6.2')) {
      WebApp.showConfirm(t.confirm_delete, (ok) => { if (ok) performDelete(); });
    } else {
      if (window.confirm(t.confirm_delete)) performDelete();
    }
  };

  // --- CONDITIONAL VIEW RENDERER ---
  const renderView = () => {
    if (role === 'vendor') {
      return <VendorDashboard user={user} onDelete={handleDeleteStore} lang={lang} />;
    }

    switch (activeTab) {
      case 'hisaab':
        return <HisaabTab user={user} wallet={walletAddress} lang={lang} />;
      case 'profile':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4">
            <div className="glass-card mb-6">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center text-3xl font-black shadow-xl">
                  {user?.first_name?.[0] || 'G'}
                </div>
                <div>
                  <h2 className="text-2xl font-black leading-none mb-2">{user?.first_name} {user?.last_name || 'Resident'}</h2>
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest">{t.active}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 border-t border-white/5 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">{t.account_status}</span>
                  <span className="text-sm font-bold text-emerald-400 italic">TON_VERIFIED_IDENTITY</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">{t.network_role}</span>
                  <span className="text-sm font-bold text-orange-500 italic">{t.buyer}</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
               <h3 className="text-[10px] font-black uppercase tracking-[3px] text-white/20 mb-5">{t.security}</h3>
               <button 
                onClick={() => {
                  const nRole = role === 'customer' ? 'vendor' : 'customer';
                  setRole(nRole);
                  localStorage.setItem('baqala_role', nRole);
                  setActiveTab('home');
                }}
                className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 mb-3 group"
               >
                 <div className="flex items-center gap-4">
                   <ShieldCheck size={24} className="text-teal-400 group-hover:scale-110 transition-transform" />
                   <span className="font-black text-sm uppercase">{role === 'customer' ? t.switch_merchant : t.switch_customer}</span>
                 </div>
                 {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
               </button>

               {walletAddress && (
                 <button onClick={logout} className="w-full flex items-center gap-4 p-5 bg-red-500/5 rounded-2xl border border-red-500/10 text-red-400 active:scale-95 transition-all">
                    <LogOut size={20} />
                    <span className="font-black text-sm uppercase">{t.disconnect}</span>
                 </button>
               )}
            </div>
          </motion.div>
        );
      default:
        return <CustomerDashboard user={user} wallet={walletAddress} setActiveTab={setActiveTab} lang={lang} initialStore={initialStoreId} />;
    }
  };

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center z-[9999]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="text-center">
          <div className="text-8xl mb-4 drop-shadow-[0_0_30px_rgba(0,245,212,0.4)]">🏪</div>
          <h1 className="text-5xl font-black italic bg-gradient-to-r from-[#00f5d4] via-[#ff5e00] to-[#00f5d4] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Baqalas</h1>
          <p className="text-[#94a3b8] tracking-[6px] text-[9px] mt-4 font-black uppercase opacity-50">{t.intro_sub}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col font-sans select-none overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      
      {/* --- PERSISTENT HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[500px] mx-auto flex items-center justify-between px-5 py-4">
          
          <div className="flex items-center gap-3">
             <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
               <Languages size={18} className="text-teal-400" />
             </button>
             <div>
               <div className="text-[8px] font-black text-[#ff5e00] tracking-widest uppercase leading-none mb-1">{role === 'customer' ? t.role_customer : t.role_merchant}</div>
               <div className="font-black text-base leading-none truncate max-w-[100px]">{user?.first_name || 'Guest'}</div>
             </div>
          </div>

          <button
            onClick={() => setShowWalletModal(true)}
            className={`text-[10px] font-black uppercase tracking-tighter px-4 py-2.5 rounded-xl border transition-all active:scale-95 ${
              walletAddress ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/70 bg-white/5 shadow-2xl'
            }`}
          >
            {walletAddress ? (isRTL ? 'متصل' : 'Connected') : t.connect_wallet}
          </button>
        </div>
      </header>

      {/* --- SCROLLABLE CONTENT --- */}
      <main className="flex-1 w-full max-w-[500px] mx-auto overflow-y-auto pb-32 pt-2 scrollbar-hide">
        <AnimatePresence mode="wait">
          {renderView()}
        </AnimatePresence>
      </main>

      {/* --- NATIVE NAVIGATION BAR --- */}
      {role === 'customer' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-3xl border-t border-white/5 z-50">
          <div className="max-w-[500px] mx-auto flex justify-around items-center py-5 px-4">
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'home' ? 'text-teal-400 scale-110' : 'text-white/20'}`}>
              <Home size={22} /><span className="text-[8px] font-black uppercase tracking-widest">{t.nav_home}</span>
            </button>
            <button onClick={() => setActiveTab('hisaab')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'hisaab' ? 'text-teal-400 scale-110' : 'text-white/20'}`}>
              <CartIcon size={22} /><span className="text-[8px] font-black uppercase tracking-widest">{t.nav_hisaab}</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-teal-400 scale-110' : 'text-white/20'}`}>
              <User size={22} /><span className="text-[8px] font-black uppercase tracking-widest">{t.nav_profile}</span>
            </button>
          </div>
        </nav>
      )}

      {/* --- WALLET SELECTOR MODAL --- */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWalletModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-10 border-t border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black italic uppercase">{t.connect_wallet}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mt-2">{t.wallet_subtitle}</p>
                </div>
                <X onClick={() => setShowWalletModal(false)} className="opacity-30 hover:opacity-100 transition-opacity" />
              </div>

              {walletAddress ? (
                <div className="space-y-6">
                   <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] text-center">
                      <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-3">{t.wallet_connected} • {walletType?.toUpperCase()}</p>
                      <p className="font-mono text-xs break-all opacity-70 selection:bg-emerald-400 selection:text-black">{walletAddress}</p>
                   </div>
                   <button onClick={logout} className="w-full btn-primary !bg-red-500 !text-white !font-black uppercase text-xs tracking-[2px] !py-5">Dissolve Connection</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={connectTON} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[24px] hover:bg-white/10 active:scale-95 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all"><Smartphone size={32}/></div>
                      <div className="text-left"><div className="font-black text-xl italic uppercase leading-none">TON Hub</div><div className="text-[9px] opacity-40 uppercase font-black tracking-widest mt-2">The Open Network</div></div>
                    </div>
                    <Globe size={20} className="opacity-10" />
                  </button>
                  <button onClick={connectEVM} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[24px] hover:bg-white/10 active:scale-95 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all"><WalletIcon size={32}/></div>
                      <div className="text-left"><div className="font-black text-xl italic uppercase leading-none">EVM Bridge</div><div className="text-[9px] opacity-40 uppercase font-black tracking-widest mt-2">MetaMask & Ethereum</div></div>
                    </div>
                    <Globe size={20} className="opacity-10" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
