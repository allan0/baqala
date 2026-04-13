// ================================================
// frontend/src/components/AIAssistant.jsx
// ACTIONABLE AI GENIE - VOICE TO HISAAB
// ================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Loader2, Wand2, ShoppingCart } from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AIAssistant({ user, location, currentBaqalaId, onPowerUp }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleAIProcess = async () => {
    if (!input.trim() || isProcessing) return;
    haptic('heavy');
    setIsProcessing(true);

    try {
      // 1. Ask AI to parse the intent
      const parseRes = await axios.post(`${API_URL}/api/ai/parse`, { text: input });
      
      if (parseRes.data.success) {
        const { orderData } = parseRes.data;

        // 2. Identify target Baqala
        let targetId = currentBaqalaId;
        
        // If not in a store, find the nearest one via the API
        if (!targetId) {
          const storesRes = await axios.get(`${API_URL}/api/baqalas/nearby?lat=${location?.lat}&lng=${location?.lng}`);
          if (storesRes.data && storesRes.data.length > 0) {
            targetId = storesRes.data[0].id; // Pick the closest one
          }
        }

        if (!targetId) {
          WebApp.showAlert("I couldn't find a Baqala nearby to add this to. Try opening a store first!");
          setIsProcessing(false);
          return;
        }

        // 3. Commit the parsed items to the Hisaab database
        const checkoutRes = await axios.post(`${API_URL}/api/hisaab/checkout`, {
          telegram_id: user.id,
          baqala_id: targetId,
          items: orderData.items,
          profile_name: orderData.profile || 'Main'
        });

        if (checkoutRes.data.success) {
          WebApp.showPopup({
            title: '✨ Order Magic Successful',
            message: `Added ${orderData.items.length} items to your ${orderData.profile || 'Main'} profile tab.`,
            buttons: [{ type: 'ok' }]
          });
          
          setIsOpen(false);
          setInput('');
          if (onPowerUp) onPowerUp(); // Callback to refresh dashboards
        }
      }
    } catch (e) {
      console.error("AI Error:", e);
      WebApp.showAlert("The Genie is sleepy. Please try again or be more specific!");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Sparkle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            className="btn-primary" 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              position: 'fixed', bottom: '100px', right: '20px', 
              padding: 0, zIndex: 1001, display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0, 212, 200, 0.4)'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { haptic('light'); setIsOpen(true); }}
          >
            <Sparkles size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            style={{ 
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(7, 11, 20, 0.85)', zIndex: 1002, 
              display: 'flex', flexDirection: 'column', padding: '20px',
              paddingTop: '80px'
            }}
          >
            <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px' }}>
                  <Wand2 color="var(--logo-teal)" /> AI Genie
                </h2>
                <motion.div whileTap={{ scale: 0.8 }} onClick={() => setIsOpen(false)}>
                  <X size={24} style={{ opacity: 0.5 }} />
                </motion.div>
              </div>

              <p style={{ color: 'var(--lux-hint)', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
                "Order two Laban Ups, one large water, and Oman chips for the Kids Profile."
              </p>

              <div className="card" style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--lux-border)' }}>
                <textarea 
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell the Genie what you need..."
                  style={{ 
                    width: '100%', background: 'transparent', border: 'none', 
                    color: 'white', outline: 'none', height: '120px', fontSize: '17px',
                    resize: 'none', padding: '10px', lineHeight: '1.5'
                  }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--logo-teal)', fontSize: '12px', fontWeight: 600 }}>
                      <ShoppingCart size={14} />
                      {currentBaqalaId ? "Ordering from Current Store" : "Genie will pick Nearest Store"}
                   </div>
                   
                   <button 
                    className="btn-primary" 
                    style={{ width: 'auto', padding: '12px 24px', height: '50px' }}
                    onClick={handleAIProcess}
                    disabled={isProcessing || !input.trim()}
                  >
                    {isProcessing ? (
                      <Loader2 className="spin-anim" size={20} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Send Intent</span>
                        <Send size={18} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.5 }}
                style={{ textAlign: 'center', marginTop: '40px' }}
              >
                <img 
                  src="/baqalaslogo.png" 
                  style={{ width: '50px', filter: 'grayscale(1) opacity(0.2)' }} 
                  alt="Logo"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
