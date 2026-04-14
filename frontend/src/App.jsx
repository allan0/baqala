import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Wallet as WalletIcon, Users, User } from 'lucide-react';
import { ethers } from 'ethers';
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

const WebApp = window.Telegram?.WebApp;

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Connect Wallet (MetaMask + Telegram Haptic)
  const connectWallet = async () => {
    if (!window.ethereum) {
      WebApp?.showAlert("Please install MetaMask or another Web3 wallet to continue");
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      
      // Save to localStorage
      localStorage.setItem('baqala_wallet', address);
      
      // Haptic feedback
      WebApp?.HapticFeedback?.notificationOccurred('success');
      
      // Optional: You can send wallet to backend here if needed
      console.log("Wallet connected:", address);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      WebApp?.showAlert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setWalletAddress(null);
    localStorage.removeItem('baqala_wallet');
    WebApp?.HapticFeedback?.impactOccurred('medium');
  };

  // Toggle between Customer and Vendor mode
  const toggleRole = () => {
    const newRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(newRole);
    localStorage.setItem('baqala_role', newRole);
    setActiveTab('home');
    WebApp?.HapticFeedback?.impactOccurred('heavy');
  };

  // Load saved wallet and Telegram user on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('baqala_wallet');
    if (savedWallet) setWalletAddress(savedWallet);

    if (WebApp) {
      WebApp.ready();
      try { WebApp.expand(); } catch(e) {}
      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
    }

    // Auto hide intro screen
    const timer = setTimeout(() => setShowIntro(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-[9999]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-7xl mb-6">🏪</div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-[#00f5d4] via-[#ff5e00] to-[#00f5d4] bg-clip-text text-transparent">
            Baqalas
          </h1>
          <p className="mt-4 text-[#94a3b8] tracking-[4px] text-sm font-medium">THE DIGITAL HISAB NETWORK</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-root min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Premium Top Bar */}
      <div className="top-bar flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={toggleRole}>
          <motion.div 
            whileTap={{ scale: 0.9, rotate: -15 }}
            className="w-11 h-11 bg-gradient-to-br from-[#00f5d4] to-[#ff5e00] rounded-2xl flex items-center justify-center"
          >
            <span className="text-2xl">🛒</span>
          </motion.div>
          
          <div>
            <div className="text-[10px] font-bold tracking-widest text-[#ff5e00] uppercase">
              {role === 'customer' ? 'CUSTOMER MODE' : 'VENDOR MODE'}
            </div>
            <div className="font-semibold text-lg leading-none mt-0.5">
              {user?.first_name || 'Guest'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Wallet Connect Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={walletAddress ? disconnectWallet : connectWallet}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all border ${
              walletAddress 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-white/10 hover:bg-white/20 border-white/20'
            }`}
          >
            <WalletIcon size={18} />
            {walletAddress ? shortenAddress(walletAddress) : isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </motion.button>

          <Bell size={22} className="text-[#94a3b8] cursor-pointer" />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="pt-2 pb-20">
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
      </main>

      {/* Bottom Navigation - Only for Customer */}
      {role === 'customer' && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-2xl border-t border-white/10 z-50">
          <div className="flex justify-around py-3 max-w-md mx-auto">
            {[
              { id: 'home', label: 'Discover', icon: <Users size={23} /> },
              { id: 'hisaab', label: 'Hisaab', icon: <span className="text-2xl">📒</span> },
              { id: 'stores', label: 'Stores', icon: <span className="text-2xl">🛍️</span> },
              { id: 'profile', label: 'Me', icon: <User size={23} /> },
            ].map((tab) => (
              <motion.div
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setActiveTab(tab.id);
                  WebApp?.HapticFeedback?.impactOccurred('light');
                }}
                className={`flex flex-col items-center py-2 px-6 transition-all rounded-xl ${
                  activeTab === tab.id 
                    ? 'text-[#00f5d4] bg-white/10' 
                    : 'text-[#64748b]'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] mt-1 font-medium tracking-wider">{tab.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
