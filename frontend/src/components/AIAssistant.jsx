import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Loader2, Wand2 } from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AIAssistant({ onOrderExtracted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const haptic = (style = 'medium') => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleAIProcess = async () => {
    if (!input.trim()) return;
    haptic('heavy');
    setIsProcessing(true);

    try {
      // Direct call to existing AI endpoint
      // backend/bot.js logic adapted for API
      const res = await axios.post(`${API_URL}/api/ai/parse`, { text: input });
      
      if (res.data.success) {
        onOrderExtracted(res.data.orderData); // Passes parsed JSON to cart
        WebApp.showPopup({
          title: 'AI Order Parsed',
          message: `Extracted ${res.data.orderData.items.length} items. Added to your checkout.`,
          buttons: [{ type: 'ok' }]
        });
        setIsOpen(false);
        setInput('');
      }
    } catch (e) {
      WebApp.showAlert("AI couldn't understand that. Try being more specific!");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <motion.button 
          className="btn-primary" 
          style={{ width: '60px', height: '60px', borderRadius: '50%', position: 'fixed', bottom: '110px', right: '20px', padding: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { haptic('light'); setIsOpen(true); }}
        >
          <Sparkles />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="welcome-screen" // Reusing full-screen luxury overlay
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            style={{ zIndex: 1002, justifyContent: 'flex-start', paddingTop: '60px' }}
          >
            <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wand2 color="var(--logo-teal)" /> AI Genie
                </h2>
                <X onClick={() => setIsOpen(false)} />
              </div>

              <p style={{ color: 'var(--lux-hint)', marginBottom: '20px', fontSize: '14px' }}>
                "One Laban Up, two Oman Chips, and bread for the Main Profile."
              </p>

              <div className="card" style={{ padding: '10px' }}>
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell me what you need..."
                  style={{ 
                    width: '100%', background: 'transparent', border: 'none', 
                    color: 'white', outline: 'none', height: '100px', fontSize: '16px',
                    resize: 'none', padding: '10px'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ width: 'auto', padding: '10px 20px' }}
                    onClick={handleAIProcess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="spin-anim" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
