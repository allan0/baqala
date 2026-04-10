import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, ShieldCheck, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopBar() {
  const { user, mode, toggleRole } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="top-bar">
      {/* The Mode Switcher (The Logo) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.img 
          src="/baqalaslogo.png" 
          alt="Toggle Mode" 
          className="mini-logo"
          whileTap={{ scale: 0.8, rotate: -15 }}
          onClick={toggleRole}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', color: 'var(--lux-hint)', fontWeight: 600, textTransform: 'uppercase' }}>
            {mode === 'customer' ? 'Customer Profile' : 'Store Owner'}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--lux-text)' }}>
            {user ? user.first_name : 'Guest'}
          </span>
        </div>
      </div>

      {/* Dynamic Indicators */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {mode === 'vendor' ? (
          <ShieldCheck size={22} color="var(--logo-teal)" />
        ) : (
          <div className="wallet-badge" style={{ margin: 0 }}>
             AED Balance
          </div>
        )}
        <Bell size={22} color="var(--lux-hint)" />
      </div>
    </div>
  );
}
