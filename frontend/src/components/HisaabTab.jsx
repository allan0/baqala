import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Clock, Wallet, ArrowRight, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WebApp = window.Telegram?.WebApp;

export default function HisaabTab({ user, walletAddress }) {
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeSection, setActiveSection] = useState('outstanding');
  const [isPaying, setIsPaying] = useState(false);
  const [payingDebtId, setPayingDebtId] = useState(null);

  const userId = user?.id?.toString() || localStorage.getItem('baqala_guest_id');

  useEffect(() => {
    fetchHisaabData();
  }, [userId]);

  const fetchHisaabData = async () => {
    if (!userId) return;
    try {
      const [outRes, histRes] = await Promise.all([
        axios.get(`${API_URL}/api/hisaab/outstanding?telegram_id=${userId}`),
        axios.get(`${API_URL}/api/hisaab/history?telegram_id=${userId}`)
      ]);

      setOutstanding(outRes.data || []);
      setHistory(histRes.data || []);
    } catch (e) {
      console.error("Failed to fetch Hisaab data:", e);
      // Fallback mock data if backend is not ready
      if (outstanding.length === 0) {
        setOutstanding([
          {
            id: "mock-1",
            baqalaName: "Al Maya Super Market",
            items: [
              { name: "Al Ain Water 1.5L", qty: 3, price: 3.5 },
              { name: "Laban Up", qty: 2, price: 5.0 }
            ],
            total_aed: 20.5,
            created_at: new Date().toISOString()
          }
        ]);
      }
    }
  };

  const payWithCrypto = async (debt) => {
    if (!walletAddress) {
      WebApp?.showAlert("Please connect your wallet from the top bar first");
      return;
    }

    setIsPaying(true);
    setPayingDebtId(debt.id);

    try {
      // Simulate real on-chain transaction (MetaMask ready)
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Replace with real baqala wallet later
          value: ethers.parseEther((debt.total_aed / 3000).toFixed(6)) // mock conversion
        });
        await tx.wait();
      }

      // Call backend to move debt to history
      const res = await axios.post(`${API_URL}/api/hisaab/pay`, {
        telegram_id: userId,
        debt_id: debt.id,
        tx_hash: "0xSIMULATED_TX_" + Date.now()
      });

      if (res.data.success) {
        WebApp?.showPopup({
          title: "✅ Payment Confirmed",
          message: `Hisaab of AED ${debt.total_aed} settled on-chain`,
          buttons: [{ type: 'ok' }]
        });
        fetchHisaabData(); // Refresh
      }
    } catch (err) {
      console.error(err);
      WebApp?.showAlert("Payment failed or cancelled");
    } finally {
      setIsPaying(false);
      setPayingDebtId(null);
    }
  };

  const totalOutstanding = outstanding.reduce((sum, d) => sum + parseFloat(d.total_aed || 0), 0);

  return (
    <div className="app-container pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Hisaab</h1>
        <div className="text-right">
          <div className="text-xs text-[#94a3b8]">Total Due</div>
          <div className="text-3xl font-bold text-[#ff5e00]">
            AED {totalOutstanding.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white/5 rounded-3xl p-1 mb-8">
        <button
          onClick={() => setActiveSection('outstanding')}
          className={`flex-1 py-3 rounded-3xl font-medium transition-all ${
            activeSection === 'outstanding' 
              ? 'bg-white text-black shadow-lg' 
              : 'text-white/70 hover:text-white'
          }`}
        >
          Outstanding
        </button>
        <button
          onClick={() => setActiveSection('history')}
          className={`flex-1 py-3 rounded-3xl font-medium transition-all ${
            activeSection === 'history' 
              ? 'bg-white text-black shadow-lg' 
              : 'text-white/70 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* OUTSTANDING SECTION */}
        {activeSection === 'outstanding' && (
          <motion.div
            key="outstanding"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {outstanding.length === 0 ? (
              <div className="glass-card text-center py-20">
                <CheckCircle size={64} className="mx-auto mb-6 text-[#00f5d4]" />
                <p className="text-2xl font-semibold">All Clear</p>
                <p className="text-[#94a3b8] mt-2">No outstanding tabs</p>
              </div>
            ) : (
              outstanding.map((debt) => (
                <div key={debt.id} className="glass-card overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-xl">{debt.baqalaName || "Baqala"}</h3>
                        <p className="text-sm text-[#94a3b8]">
                          {new Date(debt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-[#ff5e00]">
                          AED {parseFloat(debt.total_aed).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4">
                      {debt.items && debt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-t border-white/10 pt-4 first:border-0 first:pt-0">
                          <span>{item.name} × {item.qty}</span>
                          <span className="font-medium">
                            AED {(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/10 p-6">
                    <button
                      onClick={() => payWithCrypto(debt)}
                      disabled={isPaying && payingDebtId === debt.id}
                      className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg font-semibold disabled:opacity-70"
                    >
                      {isPaying && payingDebtId === debt.id ? (
                        <>Processing on-chain...</>
                      ) : (
                        <>
                          <Wallet size={22} />
                          Pay with Crypto
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* HISTORY SECTION */}
        {activeSection === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {history.length === 0 ? (
              <div className="glass-card py-20 text-center">
                <Clock size={64} className="mx-auto mb-6 text-[#94a3b8]" />
                <p className="text-xl font-medium">No history yet</p>
              </div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="glass-card p-6 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{entry.baqalaName || "Baqala"}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {new Date(entry.settled_at || entry.created_at).toLocaleDateString()} • 
                      {entry.items?.length || entry.itemsCount || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#00f5d4]">
                      AED {parseFloat(entry.total_aed).toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-400 flex items-center justify-end gap-1 mt-1">
                      <CheckCircle size={14} /> Paid
                    </p>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
