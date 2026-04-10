import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ScanLine, LayoutDashboard, ShoppingBag, User as UserIcon, Wallet } from 'lucide-react';

// Styles
import './App.css';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WebApp = window.Telegram?.WebApp;

const App = () => {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [location, setLocation] = useState(null);   // Location is now optional / on-demand

  // --- HAPTICS ---
  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) {
      if (style === 'heavy') WebApp.HapticFeedback.impactOccurred('heavy');
      else if (style === 'light') WebApp.HapticFeedback.impactOccurred('light');
      else WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const toggleRole = () => {
    triggerHaptic('heavy');
    const newRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(newRole);
    localStorage.setItem('baqala_role', newRole);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor('#070B14');

      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
    }

    // Cinematic Intro Timeout
    const timer = setTimeout(() => setShowIntro(false), 2600);
    return () => clearTimeout(timer);
  }, []);

  // --- RENDER HELPERS ---
  const renderTopBar = () => (
    <div className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.img 
          src="/baqalaslogo.png" 
          alt="Baqala Logo" 
          className="mini-logo"
          whileTap={{ scale: 0.85, rotate: -10 }}
          onClick={toggleRole}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="mode-label" style={{ fontSize: '11px', color: 'var(--logo-orange)', fontWeight: 700 }}>
            {role === 'customer' ? 'CUSTOMER' : 'OWNER MODE'}
          </span>
          <span className="user-name" style={{ fontSize: '16px', fontWeight: 800 }}>
            {user?.first_name || 'Guest'}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {role === 'customer' && (
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('profile')}>
            <Wallet size={22} color="var(--logo-teal)" />
          </motion.div>
        )}
        <Bell size={22} color="var(--lux-hint)" />
      </div>
    </div>
  );

  const renderBottomNav = () => (
    <div className="bottom-nav">
      {[
        { id: 'home', icon: <LayoutDashboard size={24} />, label: 'Home' },
        { id: 'hisaab', icon: <ScanLine size={24} />, label: 'Hisaab' },
        { id: 'stores', icon: <ShoppingBag size={24} />, label: 'Stores' },
        { id: 'profile', icon: <UserIcon size={24} />, label: 'Profile' },
      ].map((tab) => (
        <div 
          key={tab.id} 
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => { triggerHaptic('light'); setActiveTab(tab.id); }}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </div>
      ))}
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="app-root">
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            className="welcome-screen"
            exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
            transition={{ duration: 0.8 }}
          >
            <motion.img 
              src="/baqalaslogo.png" 
              className="logo-intro"
              initial={{ scale: 5, opacity: 0, filter: "blur(20px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.h1 
              className="welcome-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              Baqalas
            </motion.h1>
            <p style={{ color: 'var(--lux-hint)', marginTop: '12px', fontSize: '14px' }}>
              The Digital Hisaab Network
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.div 
          className="app-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {renderTopBar()}

          <div className="content-area">
            {role === 'customer' ? (
              <CustomerDashboard 
                user={user} 
                location={location} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                setLocation={setLocation}   // Pass setter so location can be requested on demand
              />
            ) : (
              <VendorDashboard user={user} />
            )}
          </div>

          {role === 'customer' && renderBottomNav()}
        </motion.div>
      )}
    </div>
  );
};

export default App;
