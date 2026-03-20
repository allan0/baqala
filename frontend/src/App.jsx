import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './App.css';

import TelegramLogin from './components/TelegramLogin';
import Roadmap from './components/Roadmap';
import VendorDashboard from './components/VendorDashboard';
import CustomerDashboard from './components/CustomerDashboard';
const API_URL = import.meta.env.VITE_API_URL || "${API_URL}";
const WebApp = window.Telegram?.WebApp;

// Automatically attach the Telegram secure hash to EVERY axios request!
axios.interceptors.request.use((config) => {
  if (WebApp && WebApp.initData) {
    config.headers['x-telegram-init-data'] = WebApp.initData;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false); // New Guest State
  const[role, setRole] = useState(null); // 'customer' | 'vendor'
  const[currentView, setCurrentView] = useState('dashboard'); 
  const [location, setLocation] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  
  const fetchUserData = async (telegramUser) => {
    setUser(telegramUser);
    setIsGuest(false);
  };

  useEffect(() => {
    if (WebApp && WebApp.initDataUnsafe?.user) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.isVersionAtLeast && WebApp.isVersionAtLeast('6.1')) WebApp.setHeaderColor('#10b981');
      fetchUserData(WebApp.initDataUnsafe.user);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn("Location denied")
      );
    }
  },[]);

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

  // --- RENDER LOGIC ---

  // 1. Initial Login or Guest Selection
  if (!user && !isGuest) {
    return (
      <div className="app-container login-container">
        <h1>🏪 Baqala Network</h1>
        <p style={{marginBottom: "20px"}}>Explore the app or connect your Telegram account to unlock Hisaab features.</p>
        
        <button className="btn-primary" onClick={() => setIsGuest(true)} style={{marginBottom: '20px'}}>
          👀 Explore as Guest
        </button>
        
        <div className="card" style={{width: '100%'}}>
          <p style={{fontSize: '14px', marginBottom: '10px'}}>Or connect with Telegram:</p>
          {/* We use BaqalaTestBot as a generic valid fallback so the script doesn't throw a 400 error */}
          <TelegramLogin botName="BaqalaTestBot" onAuth={fetchUserData} /> 
        </div>
      </div>
    );
  }

  // 2. Role Selection
  if (!role) {
    return (
      <div className="app-container login-container">
        <h1>Welcome, {user ? user.first_name : 'Guest'}!</h1>
        <h2 style={{marginTop: "10px", marginBottom: "20px"}}>How are you using Baqala Network today?</h2>
        <div style={{display: 'flex', flexDirection: 'column', gap:'15px', width: '100%', maxWidth: '300px'}}>
          <button className="btn-primary" onClick={() => setRole('customer')}>🛍️ I am a Customer</button>
          <button className="btn-secondary" onClick={() => setRole('vendor')}>🏪 I own a Baqala</button>
        </div>
      </div>
    );
  }

  // 3. Prevent Guests from being Vendors
  if (role === 'vendor' && !user) {
    return (
      <div className="app-container login-container">
        <h2>Authentication Required</h2>
        <p style={{marginBottom: '20px'}}>You must connect your Telegram account to register and manage a Baqala.</p>
        <TelegramLogin botName="BaqalaTestBot" onAuth={fetchUserData} /> 
        <button className="btn-text mt-15" onClick={() => setRole('customer')}>⬅ Go back to Customer View</button>
      </div>
    );
  }

  if (currentView === 'roadmap') return <Roadmap setCurrentView={setCurrentView} />;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 onClick={() => setRole(null)} style={{cursor:'pointer'}}>🏪 Baqala Network</h1>
        {walletAddress && <p className="wallet-badge">🔗 {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}</p>}
        
        {/* Allow guests to login from the header at any time */}
        {!user && (
           <div style={{marginTop: '10px'}}>
             <TelegramLogin botName="BaqalaTestBot" onAuth={fetchUserData} />
           </div>
        )}
        
        <button className="btn-text mt-15" onClick={() => setCurrentView('roadmap')}>🗺️ View Roadmap</button>
      </header>

      {role === 'vendor' && <VendorDashboard user={user} location={location} />}
      
      {role === 'customer' && (
        <CustomerDashboard 
          user={user} 
          location={location}
          walletAddress={walletAddress} 
          connectWallet={connectWallet} 
        />
      )}
    </div>
  );
}

export default App;
