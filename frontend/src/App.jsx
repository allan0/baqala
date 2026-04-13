import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ScanLine, LayoutDashboard, ShoppingBag, User as UserIcon, Wallet } from 'lucide-react';
import './App.css';
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';

const WebApp = window.Telegram?.WebApp;

const App = () => {
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [location, setLocation] = useState(null);

  // --- VERSION 6.0 SILENT HAPTIC GUARD ---
  const triggerHaptic = (style = 'medium') => {
    try {
      if (WebApp && WebApp.HapticFeedback && typeof WebApp.HapticFeedback.impactOccurred === 'function') {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    } catch (e) { /* Silently fail on old Telegram */ }
  };

  const toggleRole = () => {
    triggerHaptic('heavy');
    const newRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(newRole);
    localStorage.setItem('baqala_role', newRole);
    setActiveTab('home');
  };

  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      try { WebApp.expand(); } catch(e){}
      if (WebApp.initDataUnsafe?.user) setUser(WebApp.initDataUnsafe.user);
    }
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showIntro) return (
    <div className="welcome-screen">
      <h1 className="welcome-title">Baqalas</h1>
      <p style={{color: 'var(--logo-teal)', fontSize: '12px'}}>LOADING NETWORK...</p>
    </div>
  );

  return (
    <div className="app-root">
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={toggleRole}>
          <div style={{background: 'var(--logo-teal)', width: '32px', height: '32px', borderRadius: '8px'}} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: 'var(--logo-orange)', fontWeight: 800 }}>{role === 'customer' ? 'CUSTOMER' : 'OWNER'}</span>
            <span style={{ fontSize: '14px', fontWeight: 800 }}>{user?.first_name || 'Guest'}</span>
          </div>
        </div>
        <Bell size={20} color="var(--lux-hint)" />
      </div>

      <main className="content-area">
        {role === 'customer' ? (
          <CustomerDashboard user={user} location={location} activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <VendorDashboard user={user} location={location} />
        )}
      </main>

      {role === 'customer' && (
        <div className="bottom-nav">
          {[
            { id: 'home', icon: <LayoutDashboard size={20} />, label: 'Home' },
            { id: 'hisaab', icon: <ScanLine size={20} />, label: 'Hisaab' },
            { id: 'stores', icon: <ShoppingBag size={20} />, label: 'Stores' },
            { id: 'profile', icon: <UserIcon size={20} />, label: 'Profile' },
          ].map((tab) => (
            <div key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} 
                 onClick={() => { triggerHaptic('light'); setActiveTab(tab.id); }}>
              {tab.icon}
              <span>{tab.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
