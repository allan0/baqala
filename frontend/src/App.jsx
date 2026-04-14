import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Wallet as WalletIcon, 
  Users, 
  User, 
  ShoppingCart as CartIcon,
  Store as StoreIcon,
  Zap
} from 'lucide-react';
import { ethers } from 'ethers';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

// Telegram WebApp Object
const WebApp = window.Telegram?.WebApp;

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // --- WALLET LOGIC ---
  const connectWallet = async () => {
    if (!window.ethereum) {
      WebApp?.showAlert("MetaMask or Web3 wallet not found. Please open in a compatible browser.");
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      localStorage.setItem('baqala_wallet', address);
      WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch (err) {
      console.error("Wallet Error:", err);
      WebApp?.showAlert("Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    localStorage.removeItem('baqala_wallet');
    WebApp?.HapticFeedback?.impactOccurred('medium');
  };

  // --- ROLE LOGIC ---
  const toggleRole = () => {
    const newRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(newRole);
    localStorage.setItem('baqala_role', newRole);
    setActiveTab('home');
    WebApp?.HapticFeedback?.impactOccurred('heavy');
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedWallet = localStorage.getItem('baqala_wallet');
    if (savedWallet) setWalletAddress(savedWallet);

    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor('#0a0a0f');
      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
    }

    // Dismiss intro screen
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const shortenAddress = (addr) => `${addr.slice(0, 5)}...${addr.slice(-4)}`;

  // --- INTRO SCREEN ---
  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center z-[9999]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="text-center"
        >
          <div className="text-7xl mb-6 shadow-2xl">🏪</div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-[#00f5d4] via-[#ff5e00] to-[#00f5d4] bg-clip-text text-transparent bg-[length:200%_auto] animate-pulse">
            Baqalas
          </h1>
          <p className="text-[#94a3b8] tracking-[5px] text-[10px] mt-4 uppercase font-bold opacity-60">
            Digital Hisaab Network
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col font-sans overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[500px] mx-auto flex items-center justify-between px-5 py-4">
          
          {/* Logo & Role Toggle */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={toggleRole}>
            <motion.div 
              whileTap={{ scale: 0.9, rotate: -10 }}
              className="w-10 h-10 bg-gradient-to-br from-[#00f5d4] to-[#ff5e00] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,245,212,0.3)]"
            >
              {role === 'customer' ? <CartIcon size={20} color="black" /> : <StoreIcon size={20} color="black" />}
            </motion.div>
            <div>
              <div className="text-[10px] font-black text-[#ff5e00] tracking-tight uppercase leading-none">
                {role === 'customer' ? 'Customer Profile' : 'Merchant Mode'}
              </div>
              <div className="font-bold text-lg leading-none mt-1">
                {user?.first_name || 'Guest'}
              </div>
            </div>
          </div>

          {/* Wallet Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={walletAddress ? disconnectWallet : connectWallet}
              className={`text-[11px] font-bold px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                walletAddress 
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' 
                : 'border-white/10 text-white/70 bg-white/5 hover:bg-white/10'
              }`}
            >
              <WalletIcon size={14} />
              {walletAddress ? shortenAddress(walletAddress) : isConnecting ? 'Connecting...' : 'Connect'}
            </motion.button>
            <Bell size={20} className="text-[#94a3b8] opacity-50" />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 w-full max-w-[500px] mx-auto px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={role + activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {role === 'customer' ? (
              activeTab === 'hisaab' ? (
                <HisaabTab user={user} walletAddress={walletAddress} />
              ) : (
                <CustomerDashboard 
                  user={user} 
                  walletAddress={walletAddress}
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
              )
            ) : (
              <VendorDashboard user={user} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* --- BOTTOM NAVIGATION (Customer Only) --- */}
      {role === 'customer' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-2xl border-t border-white/5 z-50">
          <div className="max-w-[500px] mx-auto flex justify-around items-center py-4 px-2">
            {[
              { id: 'home', label: 'Discover', icon: <Users size={22} /> },
              { id: 'hisaab', label: 'My Hisaab', icon: <Zap size={22} /> },
              { id: 'stores', label: 'Stores', icon: <span className="text-2xl">🛍️</span> },
              { id: 'profile', label: 'Profile', icon: <User size={22} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  WebApp?.HapticFeedback?.impactOccurred('light');
                }}
                className={`flex flex-col items-center gap-1.5 px-4 py-1 rounded-2xl transition-all ${
                  activeTab === tab.id 
                  ? 'text-[#00f5d4] bg-[#00f5d4]/10' 
                  : 'text-white/30 hover:text-white/50'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
