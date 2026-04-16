// ================================================
// frontend/src/App.jsx - MAIN CUSTOMER DASHBOARD (Telegram MVP Ready)
// ================================================
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import AIAssistant from './components/AIAssistant';
import HisaabTab from './components/HisaabTab';
import VendorDashboard from './components/VendorDashboard';
import TopBar from './components/layout/TopBar';
import { Home, CreditCard, User, Store } from 'lucide-react';

const WebApp = window.Telegram?.WebApp;

export default function App() {
  const { user, viewMode, setUser, lang, setLang } = useApp();
  const [activeTab, setActiveTab] = useState('home');

  // Telegram WebApp initialization
  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      // Set theme
      WebApp.setHeaderColor('#0a0a0f');
    }
  }, []);

  // Fetch user on load
  useEffect(() => {
    const syncUser = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            telegram_id: WebApp?.initDataUnsafe?.user?.id || null,
            display_name: WebApp?.initDataUnsafe?.user?.first_name || 'Neighbor',
          },
        });
        const data = await res.json();
        if (data.user) setUser(data.user);
      } catch (e) {
        console.log("Guest mode active");
      }
    };
    syncUser();
  }, []);

  const isCustomer = viewMode === 'customer';

  return (
    <div className="app-root min-h-screen bg-[#0a0a0f] text-white pb-20">
      {/* Top Bar */}
      <TopBar />

      <AnimatePresence mode="wait">
        {isCustomer ? (
          /* ====================== CUSTOMER DASHBOARD ====================== */
          <motion.div
            key="customer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 pt-4"
          >
            {/* Main Content Area */}
            {activeTab === 'home' && (
              <div className="py-6">
                <h1 className="text-4xl font-black italic tracking-tighter mb-2">Welcome back!</h1>
                <p className="text-white/40">What are we getting from the baqala today?</p>
                {/* Placeholder for home content - you can expand later */}
                <div className="h-64 flex items-center justify-center text-white/10 text-sm font-black tracking-widest">
                  NEIGHBORHOOD STORES GO HERE
                </div>
              </div>
            )}

            {activeTab === 'hisaab' && <HisaabTab user={user} lang={lang} />}

            {activeTab === 'profile' && (
              <div className="py-6 text-center">
                <p className="text-white/40">Profile &amp; Settings coming soon...</p>
              </div>
            )}

            {/* AI GENIE FLOATING BUTTON - NOW IN MAIN CUSTOMER DASHBOARD */}
            <AIAssistant
              user={user}
              lang={lang}
              currentBaqala={null} // Will be passed from context later if needed
              setActiveTab={setActiveTab}
              onOrderSuccess={() => {
                // Refresh hisaab tab if needed
                if (activeTab === 'hisaab') {
                  // You can add a refresh callback later
                }
              }}
            />
          </motion.div>
        ) : (
          /* ====================== VENDOR DASHBOARD ====================== */
          <motion.div
            key="vendor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <VendorDashboard user={user} lang={lang} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV - CUSTOMER ONLY */}
      {isCustomer && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-2xl border-t border-white/10 z-50">
          <div className="max-w-[500px] mx-auto flex justify-around items-center py-3 px-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center ${activeTab === 'home' ? 'text-teal-400' : 'text-white/40'}`}
            >
              <Home size={24} />
              <span className="text-[10px] font-bold mt-1">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('hisaab')}
              className={`flex flex-col items-center ${activeTab === 'hisaab' ? 'text-teal-400' : 'text-white/40'}`}
            >
              <CreditCard size={24} />
              <span className="text-[10px] font-bold mt-1">Hisaab</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-teal-400' : 'text-white/40'}`}
            >
              <User size={24} />
              <span className="text-[10px] font-bold mt-1">Me</span>
            </button>

            <button
              onClick={() => { /* Toggle to vendor if needed */ }}
              className="flex flex-col items-center text-white/40"
            >
              <Store size={24} />
              <span className="text-[10px] font-bold mt-1">Switch</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
