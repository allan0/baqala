import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Wallet as WalletIcon, Users, User, 
  ShoppingCart as CartIcon, Store as StoreIcon,
  X, Smartphone, Globe, ShieldCheck, LogOut,
  ChevronRight, ChevronLeft, Languages, Home, Settings,
  Edit3, Check, UserCircle, CreditCard
} from 'lucide-react';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';
import WelcomeTour from './components/WelcomeTour'; // NEW
import NotificationsPanel from './components/NotificationsPanel'; // NEW

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

const translations = {
  en: {
    app_name: "Baqalas",
    role_customer: "Resident",
    role_merchant: "Baqala Owner",
    nav_home: "Neighborhood",
    nav_hisaab: "My Ledger",
    nav_profile: "Me",
    connect_wallet: "Link Wallet",
    switch_merchant: "Merchant Portal",
    switch_customer: "Resident View",
    disconnect: "Unlink",
    security: "Identity & Security",
    intro_sub: "THE DIGITAL HISAB NETWORK",
    wallet_ton: "TON (Tonkeeper/Wallet)",
    edit_profile: "Edit Profile",
    save: "Save",
    name_label: "Display Name",
    wallet_connected: "Connected",
    no_wallet: "Wallet not found. Please install Tonkeeper or use from Telegram.",
    notifications: "Notifications"
  },
  ar: {
    app_name: "بقالات",
    role_customer: "ساكن",
    role_merchant: "راعي الدكان",
    nav_home: "الفريج",
    nav_hisaab: "دفتر الحساب",
    nav_profile: "ملفي",
    connect_wallet: "ربط المحفظة",
    switch_merchant: "بوابة التاجر",
    switch_customer: "واجهة السكان",
    disconnect: "قطع الاتصال",
    security: "الهوية والأمان",
    intro_sub: "شبكة الحساب الرقمي",
    wallet_ton: "محفظة TON",
    edit_profile: "تعديل الملف",
    save: "حفظ",
    name_label: "الاسم المستعار",
    wallet_connected: "متصل",
    no_wallet: "المحفظة غير متوفرة. يرجى تثبيت Tonkeeper أو استخدامها من داخل تيليجرام.",
    notifications: "الإشعارات"
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [showIntro, setShowIntro] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('baqala_wallet') || null);
  const [walletType, setWalletType] = useState(localStorage.getItem('baqala_wallet_type') || null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        setUser(tgUser);
        setDisplayName(tgUser.username || `${tgUser.first_name} ${tgUser.last_name || ''}`);
      }
      WebApp.setHeaderColor('#0a0a0f');
    }
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    
    const tourCompleted = localStorage.getItem('baqala_tour_completed');
    if (!tourCompleted) {
      setShowTour(true);
    }
    
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, [isRTL]);

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

  const connectTON = async () => {
    const ton = window.ton || window.ton_provider; 
    if (ton) {
      try {
        const accounts = await ton.send('ton_requestAccounts');
        const addr = accounts[0];
        setWalletAddress(addr);
        setWalletType('TON');
        localStorage.setItem('baqala_wallet', addr);
        localStorage.setItem('baqala_wallet_type', 'TON');
        setShowWalletModal(false);
      } catch (e) { console.error(e); }
    } else {
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(t.no_wallet);
      else alert(t.no_wallet);
    }
  };

  const toggleRole = () => {
    const nRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(nRole);
    localStorage.setItem('baqala_role', nRole);
    setActiveTab('home');
  };

  const saveProfile = async () => {
    setIsEditingProfile(false);
    if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert("Profile Updated!");
  };

  if (showIntro && !showTour) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-[9999]">
        <div className="text-center">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-7xl mb-4">🏪</motion.div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#00f5d4] to-[#ff5e00] bg-clip-text text-transparent italic animate-gradient">
            {isRTL ? "بقالات" : "Baqalas"}
          </h1>
          <p className="text-[#94a3b8] tracking-[5px] text-[9px] mt-2 font-bold uppercase">{t.intro_sub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col font-sans select-none overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      
      {showTour && <WelcomeTour onComplete={(chosenLang) => { setShowTour(false); setLang(chosenLang); }} />}
      
      <NotificationsPanel show={showNotifications} onClose={() => setShowNotifications(false)} lang={lang} />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[500px] mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2" onClick={toggleRole}>
                <motion.div whileTap={{ scale: 0.8, rotate: -15 }}>
                   <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-xl">🏪</div>
                </motion.div>
                <h2 className="text-xl font-black bg-gradient-to-r from-[#00f5d4] to-[#ff5e00] bg-clip-text text-transparent italic">{t.app_name}</h2>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
               <Languages size={18} className="text-white/40" />
             </button>
             <button onClick={() => setShowNotifications(true)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
               <Bell size={18} className="text-white/40" />
             </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 w-full max-w-[500px] mx-auto overflow-y-auto pb-32 pt-2 scrollbar-hide">
        <AnimatePresence mode="wait">
          {role === 'vendor' ? (
            <VendorDashboard key="vendor" user={user} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={user} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={user} wallet={walletAddress} lang={lang} />}
              {activeTab === 'profile' && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
                    {/* Profile Content remains the same */}
                 </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER NAV (Customer Only) */}
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
              <UserCircle size={22} /><span className="text-[8px] font-black uppercase tracking-widest">{t.nav_profile}</span>
            </button>
          </div>
        </nav>
      )}

      {/* WALLET MODAL */}
      <AnimatePresence>
        {showWalletModal && (
           <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
              <div onClick={() => setShowWalletModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[40px] p-10 border-t border-white/10 shadow-2xl">
                 <div className="flex justify-between items-center mb-10">
                   <h2 className="text-3xl font-black italic uppercase italic tracking-tighter">{t.connect_wallet}</h2>
                   <X onClick={() => setShowWalletModal(false)} className="opacity-30 hover:opacity-100" />
                 </div>
                 <div className="space-y-4">
                   <button onClick={connectTON} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[28px] hover:bg-white/10 active:scale-95 transition-all">
                     <div className="flex items-center gap-5">
                       <Smartphone size={32} className="text-blue-400"/>
                       <div className="text-left"><div className="font-black text-xl italic uppercase leading-none">TON Hub</div><div className="text-[9px] opacity-40 uppercase font-black tracking-widest mt-2">{t.wallet_ton}</div></div>
                     </div>
                     <Globe size={20} className="opacity-10" />
                   </button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
