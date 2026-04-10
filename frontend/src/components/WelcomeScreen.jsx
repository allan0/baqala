import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeScreen({ onComplete }) {
  useEffect(() => {
    // Auto-dismiss after 2.8 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="welcome-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      <div className="logo-container">
        <motion.img 
          src="/baqalaslogo.png" 
          alt="Baqala Logo" 
          className="logo-intro"
          initial={{ scale: 5, filter: "blur(20px)", opacity: 0 }}
          animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h1 className="welcome-title">Baqalas</h1>
          <p style={{ color: 'var(--lux-hint)', letterSpacing: '2px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginTop: '10px' }}>
            The Digital Hisaab Network
          </p>
        </motion.div>
      </div>

      {/* Luxury Loading Bar */}
      <motion.div 
        style={{ 
          position: 'absolute', bottom: '150px', width: '200px', height: '2px', 
          background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' 
        }}
      >
        <motion.div 
          style={{ height: '100%', background: 'var(--shining-gradient)', width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
