import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './App.css';

import TelegramLogin from './components/TelegramLogin';
import VendorDashboard from './components/VendorDashboard';
import CustomerDashboard from './components/CustomerDashboard';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WebApp = window.Telegram?.WebApp;

function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [role, setRole] = useState(null); // 'customer' | 'vendor'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [location, setLocation] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  // Default profiles state (this was the main cause of the crash)
  const [profiles, setProfiles] = useState({
    main: { name: 'Main', debt: 0, unpaidItems: [] }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchUserData = (telegramUser) => {
    setUser(telegramUser);
    setIsGuest(false);
  };

  const connectWallet = async () => {
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

  // Initialize Telegram WebApp + Geolocation
  useEffect(() => {
    if (WebApp?.initDataUnsafe?.user) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.isVersionAtLeast && WebApp.isVersionAtLeast('6.1')) {
        WebApp.setHeaderColor('#0F172A');
      }
      fetchUserData(WebApp.initDataUnsafe.user);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location access denied")
      );
    }
  }, []);

  // Telegram Back Button
  useEffect(() => {
    if (!WebApp?.BackButton) return;

    const handleBack = () => {
      if (role === 'customer' && currentScreen !== 'home') {
        setCurrentScreen('home');
      } else if (role) {
        setRole(null);
      } else {
        WebApp.close();
      }
    };

    WebApp.BackButton.show();
    WebApp.BackButton.onClick(handleBack);

    return () => WebApp.BackButton.offClick(handleBack);
  }, [role, currentScreen]);

  const renderHeader = () => {
    const name = user ? user.first_name : 'Guest';
    return (
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          <img 
            src="/baqalaslogo.png" 
            alt="Baqalas" 
            style={{ height: '42px', width: 'auto' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: 0 }}>
              {getGreeting()}, {name}!
            </h2>
          </div>
          <button
            onClick={() => WebApp?.showAlert ? WebApp.showAlert('No new notifications yet!') : alert('No new notifications')}
            style={{ background: 'none', border: 'none', fontSize: '26px', padding: '8px' }}
          >
            🛎️
          </button>
        </div>
      </div>
    );
  };

  // Login / Guest Screen
  if (!user && !isGuest) {
    return (
      <div className="app-container login-container">
        {renderHeader()}
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>🏪 Baqala Network</h1>
        <button className="btn-primary" onClick={() => setIsGuest(true)} style={{ marginBottom: '20px', width: '100%' }}>
          👀 Explore as Guest
        </button>
        <div className="card">
          <TelegramLogin botName="BaqalaTestBot" onAuth={fetchUserData} />
        </div>
      </div>
    );
  }

  // Role Selection Screen
  if (!role) {
    return (
      <div className="app-container login-container">
        {renderHeader()}
        <h2 style={{ textAlign: 'center', margin: '20px 0 30px' }}>How are you using Baqala Network today?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
          <button className="btn-primary" onClick={() => setRole('customer')}>
            🛍️ I am a Customer
          </button>
          <button className="btn-secondary" onClick={() => setRole('vendor')}>
            🏪 I own a Baqala
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingBottom: role === 'customer' ? '100px' : '30px' }}>
      {renderHeader()}

      {role === 'vendor' && <VendorDashboard user={user} location={location} />}

      {role === 'customer' && (
        <CustomerDashboard
          user={user}
          location={location}
          walletAddress={walletAddress}
          connectWallet={connectWallet}
          profiles={profiles}
          setProfiles={setProfiles}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      )}

      {/* Bottom Navigation - only for customers */}
      {role === 'customer' && (
        <div className="bottom-nav">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'hisaab', icon: '📒', label: 'Hisaab' },
            { id: 'stores', icon: '🛒', label: 'Stores' },
            { id: 'profile', icon: '👤', label: 'Profile' },
          ].map((item) => (
            <div
              key={item.id}
              className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => setCurrentScreen(item.id)}
            >
              <span>{item.icon}</span>
              <div>{item.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
