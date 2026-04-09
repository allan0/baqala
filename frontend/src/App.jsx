import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './App.css';

import TelegramLogin from './components/TelegramLogin';
import Roadmap from './components/Roadmap';
import VendorDashboard from './components/VendorDashboard';
import CustomerDashboard from './components/CustomerDashboard';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WebApp = window.Telegram?.WebApp;

// --- 🛡️ GLOBAL API SECURITY INTERCEPTOR ---
// Automatically attach the Telegram secure hash to EVERY axios request
axios.interceptors.request.use((config) => {
  if (WebApp && WebApp.initData) {
    config.headers['x-telegram-init-data'] = WebApp.initData;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [role, setRole] = useState(null); // 'customer' | 'vendor'
  const [currentScreen, setCurrentScreen] = useState('home'); // for customer bottom nav flow
  const [location, setLocation] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  // Dynamic greeting based on UAE Time (Local browser time)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Trigger Phone Vibrations
  const triggerHaptic = (style = 'light') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const fetchUserData = async (telegramUser) => {
    setUser(telegramUser);
    setIsGuest(false);
  };

  const connectWallet = async () => {
    triggerHaptic('medium');
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());
      } catch (error) {
        console.error("Wallet connection failed:", error);
      }
    } else {
      alert("No Web3 wallet detected. Please install MetaMask.");
    }
  };

  // 1. App Initialization & Geolocation
  useEffect(() => {
    if (WebApp?.initDataUnsafe?.user) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.isVersionAtLeast && WebApp.isVersionAtLeast('6.1')) {
        WebApp.setHeaderColor('#0F172A'); // Luxury dark header
      }
      fetchUserData(WebApp.initDataUnsafe.user);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location access denied")
      );
    }
  },[]);

  // 2. Telegram Native Back Button Management
  useEffect(() => {
    if (!WebApp?.BackButton) return;

    const handleBack = () => {
      triggerHaptic('light');
      if (role === 'customer' && currentScreen !== 'home') {
        setCurrentScreen('home');
      } else if (role) {
        setRole(null); // Go back to role selection
      } else {
        WebApp.close(); // Close the Mini App entirely
      }
    };

    // Show button only if we are deep in a menu
    if (role || (role === 'customer' && currentScreen !== 'home')) {
      WebApp.BackButton.show();
    } else {
      WebApp.BackButton.hide();
    }

    WebApp.BackButton.onClick(handleBack);
    
    // Cleanup listener on unmount/re-render to prevent memory leaks
    return () => {
      WebApp.BackButton.offClick(handleBack);
    };
  }, [role, currentScreen]);

  // --- UI RENDERERS ---

  const renderHeader = () => {
    const name = user ? user.first_name : 'Guest';
    return (
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', marginBottom: '20px' }}>
        {/* Logo */}
        <img src="/baqalaslogo.png" alt="Baqala" style={{ height: '42px', width: 'auto', borderRadius: '8px' }} onError={(e) => e.target.style.display = 'none'} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--lux-text)' }}>
            {getGreeting()}, {name}!
          </h2>
        </div>

        {/* Alerts Bell */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            WebApp?.showAlert ? WebApp.showAlert('🎉 No new notifications yet!\n\nCheck back later for special offers.') : alert('No new notifications yet!');
          }}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px' }}
        >
          🛎️
        </button>
      </div>
    );
  };

  const renderBottomNav = () => {
    if (role !== 'customer') return null;

    const navItems =[
      { id: 'home', icon: '🏠', label: 'Home' },
      { id: 'hisaab', icon: '📒', label: 'Hisaab' },
      { id: 'stores', icon: '🛒', label: 'Stores' },
      { id: 'profile', icon: '👤', label: 'Profile' },
    ];

    return (
      <div className="bottom-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setCurrentScreen(item.id);
            }}
          >
            <span>{item.icon}</span>
            <div style={{ marginTop: '4px' }}>{item.label}</div>
          </div>
        ))}
      </div>
    );
  };

  // --- MAIN VIEWS ---

  // View 1: Login / Guest screen
  if (!user && !isGuest) {
    return (
      <div className="app-container login-container" style={{ paddingBottom: '20px' }}>
        {renderHeader()}
        <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>🏪 Baqala Network</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--lux-hint)' }}>
          Explore the app or connect your Telegram account to unlock Hisaab features.
        </p>

        <button className="btn-primary" onClick={() => { triggerHaptic('medium'); setIsGuest(true); }} style={{ marginBottom: '20px' }}>
          👀 Explore as Guest
        </button>

        <div className="card" style={{ width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', marginBottom: '15px', color: 'var(--lux-text)' }}>Or connect with Telegram:</p>
          <TelegramLogin botName="BaqalaTestBot" onAuth={fetchUserData} />
        </div>
      </div>
    );
  }

  // View 2: Role selection
  if (!role) {
    return (
      <div className="app-container login-container" style={{ paddingBottom: '20px' }}>
        {renderHeader()}
        <h2 style={{ textAlign: 'center', marginTop: '10px', marginBottom: '30px', fontSize: '20px' }}>
          How are you using Baqala Network today?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto', width: '100%' }}>
          <button className="btn-primary" onClick={() => { triggerHaptic('medium'); setRole('customer'); }}>
            🛍️ I am a Customer
          </button>
          <button className="btn-secondary" onClick={() => { triggerHaptic('medium'); setRole('vendor'); }}>
            🏪 I own a Baqala
          </button>
        </div>
      </div>
    );
  }

  // View 3: Guest Vendor Guard
  if (role === 'vendor' && !user) {
    return (
      <div className="app-container login-container">
        {renderHeader()}
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Authentication Required</h2>
          <p style={{ marginBottom: '20px', color: 'var(--lux-hint)' }}>You must connect your Telegram account to register and manage a Baqala.</p>
          <TelegramLogin botName="BaqalaTestBot" onAuth={fetchUserData} /> 
          <button className="btn-text mt-15" onClick={() => setRole('customer')}>⬅ Go back to Customer View</button>
        </div>
      </div>
    );
  }

  // View 4: Main App Dashboards
  return (
    <div className="app-container" style={{ paddingBottom: role === 'customer' ? '100px' : '40px' }}>
      {renderHeader()}

      {role === 'vendor' && (
        <VendorDashboard user={user} location={location} />
      )}

      {role === 'customer' && (
        <CustomerDashboard
          user={user}
          location={location}
          walletAddress={walletAddress}
          connectWallet={connectWallet}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      )}

      {renderBottomNav()}
    </div>
  );
}

export default App;
