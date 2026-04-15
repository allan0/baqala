// ================================================
// frontend/src/App.jsx - VERSION 15 (PROD AUTH)
// ================================================
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, Chrome, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';
import WelcomeTour from './components/WelcomeTour';

// Configuration
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";
const WebApp = window.Telegram?.WebApp;

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');

  // 1. Unified Auth Handler
  useEffect(() => {
    const initAuth = async () => {
      // A. Check if inside Telegram
      if (WebApp?.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        WebApp.expand();
        WebApp.setHeaderColor('#0a0a0f');
        
        // Sync Telegram user with Backend Profiles
        try {
          const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
            headers: { 
                telegram_id: tgUser.id,
                display_name: tgUser.username || tgUser.first_name 
            }
          });
          setProfile(res.data.user);
          setLoading(false);
        } catch (e) {
          console.error("TG Sync Failed", e);
        }
      } else {
        // B. Standard Web Environment
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) await fetchProfile(session.user.id);
        
        supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          if (session) fetchProfile(session.user.id);
          else setProfile(null);
          setLoading(false);
        });
        
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const fetchProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
  };

  const handleGmailLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // UI state for unauthenticated web users
  if (!profile && !WebApp?.initDataUnsafe?.user && !loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center">
        <img src="/baqalaslogo.png" className="w-24 mb-8" alt="Logo" />
        <h1 className="text-3xl font-black italic mb-2 tracking-tighter">BAQALA NETWORK</h1>
        <p className="text-white/40 text-sm mb-10">Join the neighborhood digital hisaab.</p>
        
        <div className="w-full max-w-sm space-y-4">
          <button onClick={handleGmailLogin} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-bold">
            <Chrome size={20} /> Continue with Google
          </button>
          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">or</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>
          <button onClick={() => {/* Email Modal */}} className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold">
            <Mail size={20} /> Sign in with Email
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[4px] text-white/30">Connecting to Grid</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans">
      {/* Top Navigation */}
      <header className="px-6 py-4 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-orange-500 rounded-xl flex items-center justify-center font-black italic text-black">
            B
          </div>
          <div>
            <h2 className="text-sm font-black italic leading-tight uppercase">{profile?.display_name || 'Guest'}</h2>
            <p className="text-[9px] font-bold text-teal-400 uppercase tracking-tighter">
                {profile?.role === 'merchant' ? 'Baqala Manager' : 'Verified Resident'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Bell size={20} className="text-white/20" />
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-white/40"><LogOut size={18}/></button>
        </div>
      </header>

      {/* Dynamic Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          {profile?.role === 'merchant' ? (
             <VendorDashboard key="vendor" user={profile} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={profile} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={profile} lang={lang} />}
              {activeTab === 'profile' && (
                <div className="p-6 space-y-6">
                  <div className="glass-card flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center"><User size={32}/></div>
                        <div>
                            <h3 className="font-black italic text-xl">{profile?.display_name}</h3>
                            <p className="text-xs text-white/30">{profile?.email || 'Telegram Linked'}</p>
                        </div>
                    </div>
                  </div>
                  
                  <div className="glass-card">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-6">Linked Benefits</h4>
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-sm font-bold">Fazaa Member ID</span>
                        <ChevronRight size={18} className="text-white/20" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav (Residents Only) */}
      {profile?.role !== 'merchant' && (
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-[#0a0a0f]/90 backdrop-blur-3xl border-t border-white/5 px-8 flex justify-between items-center z-50">
          {[
            { id: 'home', icon: Home, label: 'Farij' },
            { id: 'hisaab', icon: Wallet, label: 'Ledger' },
            { id: 'profile', icon: User, label: 'Me' }
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setActiveTab(btn.id)}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === btn.id ? 'text-teal-400 scale-110' : 'text-white/20'}`}
            >
              <btn.icon size={24} />
              <span className="text-[8px] font-black uppercase tracking-widest">{btn.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
