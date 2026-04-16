// ================================================
// frontend/src/App.jsx - VERSION 3.0 (The Web3 Hub)
// ================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import TopBar from './components/layout/TopBar';
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';
import AIAssistant from './components/AIAssistant';
import WelcomeScreen from './components/WelcomeScreen';
import { Home, CreditCard, User, Store, ShoppingBag } from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const { 
    user, setUser, 
    viewMode, setViewMode, 
    lang, 
    cart, 
    activeTab, setActiveTab,
    setGlobalBqtBalance 
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState({ locked: 0, available: 0 });

  // 1. TELEGRAM & USER INITIALIZATION
  const initApp = useCallback(async () => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor('#0a0a0f');
    }

    try {
      // Sync identity with backend (Resolves TG ID to Supabase UUID)
      const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
        headers: {
          telegram_id: WebApp?.initDataUnsafe?.user?.id || "DEBUG_USER",
          display_name: WebApp?.initDataUnsafe?.user?.first_name || "Neighbor",
          avatar_url: WebApp?.initDataUnsafe?.user?.photo_url || ""
        }
      });

      if (res.data.success) {
        setUser(res.data.user);
        fetchBalances(res.data.user.telegram_id);
      }
    } catch (e) {
      console.error("Identity Sync Failed", e);
    } finally {
      // Short delay for the splash screen experience
      setTimeout(() => setLoading(false), 2000);
    }
  }, [setUser]);

  // 2. TOKENOMICS SYNC
  const fetchBalances = async (tgId) => {
    try {
      const res = await axios.get(`${API_URL}/api/token/balance`, {
        headers: { telegram_id: tgId }
      });
      setTokens({
        locked: res.data.locked,
        available: res.data.available
      });
      setGlobalBqtBalance(res.data.available); // Set spendable balance globally
    } catch (e) {
      console.error("Balance fetch error", e);
    }
  };

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Tab Navigation Handler with Haptics
  const handleTabChange = (tab) => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
    setActiveTab(tab);
  };

  if (loading) return <WelcomeScreen onComplete={() => setLoading(false)} />;

  const isCustomer = viewMode === 'customer';

  return (
    <div className="app-root min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* PERSISTENT TOP BAR (Shows spendable BQT) */}
      <TopBar availableBqt={tokens.available} />

      <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <AnimatePresence mode="wait">
          {isCustomer ? (
            /* --- RESIDENT VIEW --- */
            <motion.div
              key="resident-dash"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {activeTab === 'home' && (
                <CustomerDashboard 
                  user={user} 
                  lang={lang} 
                  setActiveTab={handleTabChange} 
                />
              )}
              {activeTab === 'hisaab' && (
                <HisaabTab 
                  user={user} 
                  lang={lang} 
                  lockedBqt={tokens.locked}
                  refreshBalances={() => fetchBalances(user.telegram_id)}
                />
              )}
              {activeTab === 'profile' && (
                <div className="px-6 py-10 text-center">
                  <div className="w-24 h-24 bg-white/5 rounded-full mx-auto mb-6 flex items-center justify-center border border-white/10">
                    <User size={48} className="text-white/20" />
                  </div>
                  <h2 className="text-2xl font-black italic tracking-tight">{user?.display_name}</h2>
                  <p className="text-white/40 text-sm mt-2 uppercase tracking-widest">Resident ID: {user?.id?.slice(0,8)}</p>
                  
                  <div className="mt-10 space-y-4">
                     <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold opacity-50 cursor-not-allowed">
                       Link TON Wallet (Coming Soon)
                     </button>
                     <button 
                        onClick={() => setViewMode('merchant')}
                        className="w-full py-4 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl text-sm font-black uppercase tracking-widest"
                     >
                       Switch to Merchant Mode
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* --- MERCHANT VIEW --- */
            <motion.div
              key="merchant-dash"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <VendorDashboard user={user} lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING AI GENIE (Accessible to Residents) */}
      {isCustomer && (
        <AIAssistant 
          user={user} 
          lang={lang} 
          setActiveTab={handleTabChange}
          onOrderSuccess={() => fetchBalances(user.telegram_id)}
        />
      )}

      {/* BOTTOM NAVIGATION */}
      <nav className="bottom-nav">
        <div className="max-w-[500px] mx-auto flex justify-around items-center py-4 px-2">
          <NavBtn 
            active={activeTab === 'home'} 
            onClick={() => handleTabChange('home')} 
            icon={<ShoppingBag size={24} />} 
            label="Shop" 
          />
          <NavBtn 
            active={activeTab === 'hisaab'} 
            onClick={() => handleTabChange('hisaab')} 
            icon={<CreditCard size={24} />} 
            label="Hisaab" 
          />
          <NavBtn 
            active={activeTab === 'profile'} 
            onClick={() => handleTabChange('profile')} 
            icon={<User size={24} />} 
            label="Me" 
          />
          {!isCustomer && (
            <NavBtn 
              active={false} 
              onClick={() => setViewMode('customer')} 
              icon={<Store size={24} />} 
              label="Exit Shop" 
            />
          )}
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-teal-400 scale-110' : 'text-white/30'}`}
    >
      {icon}
      <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-0'}`}>
        {label}
      </span>
    </button>
  );
}
