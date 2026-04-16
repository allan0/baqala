// ================================================
// frontend/src/components/WelcomeScreen.jsx
// VERSION 2 (Telegram MVP - Smooth Splash)
// ================================================
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2600); // Slightly shorter for better UX
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div 
        className="welcome-screen fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-[#0a0a0f]"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      >
        <div className="flex flex-col items-center">
          {/* Logo with Shine */}
          <motion.img 
            src="/baqalaslogo.png" 
            alt="Baqala Logo" 
            className="w-32 h-auto mb-8"
            initial={{ scale: 0.6, filter: "blur(12px)", opacity: 0 }}
            animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
          />

          {/* Title with Gradient Animation */}
          <motion.h1 
            className="text-5xl font-black italic tracking-[-2px] bg-gradient-to-r from-[#00f5d4] via-[#ff5e00] to-[#00f5d4] bg-clip-text text-transparent bg-[length:200%_auto]"
            animate={{ backgroundPosition: ["0% 50%", "200% 50%", "0% 50%"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          >
            Baqalas
          </motion.h1>

          <p className="mt-3 text-white/40 text-sm font-medium tracking-[3px] uppercase">
            The Digital Hisaab Network
          </p>
        </div>

        {/* Premium Loading Bar */}
        <div className="mt-16 w-52 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#00f5d4] to-[#ff5e00]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
        </div>

        <p className="mt-6 text-[10px] font-black uppercase tracking-[4px] text-white/20">Connecting to the Fridge...</p>
      </motion.div>
    </AnimatePresence>
  );
}
