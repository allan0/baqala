// ================================================
// frontend/src/App.jsx - GLOBAL FRAMEWORK
// ================================================

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ScanLine, LayoutDashboard, ShoppingBag, User as UserIcon, Wallet } from 'lucide-react';

// Styles
import './App.css';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';

const WebApp = window.Telegram?.WebApp;

const App = () => {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [location, setLocation] = useState(null);

  // --- HAPTICS ---
  const triggerHaptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) {
      if (style === 'heavy') WebApp.HapticFeedback.impactOccurred('heavy');
      else if (style === 'light') WebApp.HapticFeedback.impactOccurred('light');
      else WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  // Switch between Customer and Store Owner
  const toggleRole = () => {
    triggerHaptic('heavy');
    const newRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(newRole);
    localStorage.setItem('baqala_role', newRole);
    // Reset tab to home when switching roles
    setActiveTab('home');
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor('#070B14');
      WebApp.setBackgroundColor('#070B14');

      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
    }

    // Auto-request location for store discovery
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location access denied")
      );
    }

    // Luxury Intro Timer
    const timer = setTimeout(() => setShowIntro(false), 2800);
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
          style={{ width: '40px', height: '40px', borderRadius: '10px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="mode-label" style={{ fontSize: '10px', color: 'var(--logo-orange)', fontWeight: 800, letterSpacing: '0.5px' }}>
            {role === 'customer' ? 'CUSTOMER' : 'STORE OWNER'}
          </span>
          <span className="user-name" style={{ fontSize: '15px', fontWeight: 800 }}>
            {user?.first_name || 'Baqala Guest'}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {role === 'customer' && (
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('profile')}>
            <Wallet size={20} color="var(--logo-teal)" />
          </motion.div>
        )}
        <Bell size={20} color="var(--lux-hint)" />
      </div>
    </div>
  );

  const renderBottomNav = () => (
    <div className="bottom-nav">
      {[
        { id: 'home', icon: <LayoutDashboard size={22} />, label: 'Home' },
        { id: 'hisaab', icon: <ScanLine size={22} />, label: 'Hisaab' },
        { id: 'stores', icon: <ShoppingBag size={22} />, label: 'Stores' },
        { id: 'profile', icon: <UserIcon size={22} />, label: 'Profile' },
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

  // --- MAIN APP COMPONENT ---
  return (
    <div className="app-root">
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            key="intro"
            className="welcome-screen"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(15px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <motion.img 
              src="/baqalaslogo.png" 
              className="logo-intro"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ width: '120px', marginBottom: '20px' }}
            />
            <motion.h1 
              className="welcome-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: '42px', fontWeight: 900 }}
            >
              Baqalas
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1 }}
              style={{ color: 'var(--lux-hint)', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px' }}
            >
              Digital Hisaab Network
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.div 
          key="content"
          className="app-frame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {renderTopBar()}

          <main className="content-area">
            {role === 'customer' ? (
              <CustomerDashboard 
                user={user} 
                location={location} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />
            ) : (
              <VendorDashboard user={user} location={location} />
            )}
          </main>

          {role === 'customer' && renderBottomNav()}
        </motion.div>
      )}
    </div>
  );
};

export default App;
