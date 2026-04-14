import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Wallet as WalletIcon, Users, User, 
  ShoppingCart as CartIcon, Store as StoreIcon,
  X, ShieldAlert, Smartphone, Globe
} from 'lucide-react';
import { ethers } from 'ethers';

// Dashboard Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

const WebApp = window.Telegram?.WebApp;

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('baqala_role') || 'customer');
  const [activeTab, setActiveTab] = useState('home');
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletType, setWalletType] = useState(null); // 'telegram' or 'external'
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // --- SAFE TELEGRAM WRAPPERS ---
  const showAlert = (msg) => {
    if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert(msg);
    else alert(msg);
  };

  const showConfirm = (msg, callback) => {
    if (WebApp?.isVersionAtLeast('6.2')) {
      WebApp.showConfirm(msg, (ok) => { if (ok) callback(); });
    } else {
      if (window.confirm(msg)) callback();
    }
  };

  const haptic = (type = 'light') => {
    try { WebApp?.HapticFeedback?.impactOccurred(type); } catch (e) {}
  };

  // --- WALLET CONNECT LOGIC ---
  const connectExternalWallet = async () => {
    if (!window.ethereum) {
      showAlert("No external wallet found. Please use a Web3 browser or MetaMask.");
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);
      setWalletType('external');
      localStorage.setItem('baqala_wallet', accounts[0]);
      localStorage.setItem('baqala_wallet_type', 'external');
      setShowWalletModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectTelegramWallet = () => {
    // Note: In a real prod environment, use @tonconnect/ui-react
    // For this MVP, we simulate the attachment to the Telegram User ID
    setIsConnecting(true);
    setTimeout(() => {
      const mockTonAddr = `UQ${user?.id}wa...baqala`;
      setWalletAddress(mockTonAddr);
      setWalletType('telegram');
      localStorage.setItem('baqala_wallet', mockTonAddr);
      localStorage.setItem('baqala_wallet_type', 'telegram');
      setShowWalletModal(false);
      setIsConnecting(false);
      haptic('heavy');
    }, 1000);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletType(null);
    localStorage.removeItem('baqala_wallet');
    localStorage.removeItem('baqala_wallet_type');
  };

  // --- STORE ACTIONS ---
  const deleteStore = (baqalaId) => {
    showConfirm("⚠️ ARE YOU ABSOLUTELY SURE? This will permanently delete your store, inventory, and ledger. This cannot be undone.", async () => {
      try {
        // We'll implement the actual API route in the backend next
        // await axios.delete(`${API_URL}/api/baqala/${baqalaId}`);
        setRole('customer');
        localStorage.setItem('baqala_role', 'customer');
        showAlert("Store deleted successfully.");
        window.location.reload(); 
      } catch (e) {
        showAlert("Failed to delete store.");
      }
    });
  };

  const toggleRole = () => {
    const newRole = role === 'customer' ? 'vendor' : 'customer';
    setRole(newRole);
    localStorage.setItem('baqala_role', newRole);
    setActiveTab('home');
    haptic('medium');
  };

  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.initDataUnsafe?.user) setUser(WebApp.initDataUnsafe.user);
    }
    const savedAddr = localStorage.getItem('baqala_wallet');
    const savedType = localStorage.getItem('baqala_wallet_type');
    if (savedAddr) {
      setWalletAddress(savedAddr);
      setWalletType(savedType);
    }
    setTimeout(() => setShowIntro(false), 2000);
  }, []);

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-[9999]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="text-7xl mb-4">🏪</div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#00f5d4] to-[#ff5e00] bg-clip-text text-transparent">Baqalas</h1>
          <p className="text-[#94a3b8] tracking-[3px] text-[10px] mt-2 font-bold uppercase">Digital Hisaab</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[500px] mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={toggleRole}>
            <motion.div whileTap={{ scale: 0.9 }} className="w-10 h-10 bg-gradient-to-br from-[#00f5d4] to-[#ff5e00] rounded-xl flex items-center justify-center shadow-lg">
              {role === 'customer' ? <CartIcon size={20} color="black" /> : <StoreIcon size={20} color="black" />}
            </motion.div>
            <div>
              <div className="text-[9px] font-black text-[#ff5e00] tracking-tighter uppercase leading-none">{role}</div>
              <div className="font-bold text-base leading-none mt-1">{user?.first_name || 'Guest'}</div>
            </div>
          </div>

          <button
            onClick={() => walletAddress ? disconnectWallet() : setShowWalletModal(true)}
            className={`text-[10px] font-bold px-4 py-2 rounded-xl border transition-all ${
              walletAddress ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/70 bg-white/5'
            }`}
          >
            {walletAddress ? `${walletAddress.slice(0, 6)}...` : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-[500px] mx-auto pb-24">
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
          <VendorDashboard user={user} onDeleteStore={deleteStore} />
        )}
      </main>

      {/* --- BOTTOM NAVIGATION --- */}
      {role === 'customer' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/5 z-50">
          <div className="max-w-[500px] mx-auto flex justify-around py-4">
            {[
              { id: 'home', label: 'Discover', icon: <Users size={20} /> },
              { id: 'hisaab', label: 'Hisaab', icon: <Smartphone size={20} /> },
              { id: 'profile', label: 'Profile', icon: <User size={20} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); haptic(); }}
                className={`flex flex-col items-center gap-1 px-6 ${activeTab === tab.id ? 'text-[#00f5d4]' : 'text-white/30'}`}
              >
                {tab.icon}
                <span className="text-[10px] font-bold uppercase">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* --- WALLET SELECTION MODAL --- */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWalletModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-[500px] bg-[#161b22] rounded-t-[32px] p-8 border-t border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Connect Wallet</h2>
                <X onClick={() => setShowWalletModal(false)} className="opacity-50" />
              </div>
              
              <div className="space-y-3">
                <button onClick={connectTelegramWallet} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Smartphone size={24}/></div>
                    <div className="text-left">
                      <div className="font-bold">Telegram Wallet</div>
                      <div className="text-xs opacity-50">Native TON integration</div>
                    </div>
                  </div>
                  <Globe size={18} className="opacity-20" />
                </button>

                <button onClick={connectExternalWallet} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><WalletIcon size={24}/></div>
                    <div className="text-left">
                      <div className="font-bold">External Wallet</div>
                      <div className="text-xs opacity-50">MetaMask, Rainbow, etc.</div>
                    </div>
                  </div>
                  <Globe size={18} className="opacity-20" />
                </button>
              </div>
              <p className="mt-6 text-center text-[10px] text-[#94a3b8] px-10 leading-relaxed uppercase tracking-widest font-bold">Secure connection via Baqala Protocol</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
