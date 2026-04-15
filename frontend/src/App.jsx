// ================================================
// frontend/src/App.jsx - VERSION 16 (FINAL AUTH)
// ================================================
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store,
  Chrome, Sparkles, UserCircle
} from 'lucide-react';
import axios from 'axios';
import { supabase } from './supabaseClient';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');

  // 1. UNIFIED AUTHENTICATION SYSTEM
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);

      // A. Check if user is inside Telegram
      if (WebApp?.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        WebApp.expand();
        WebApp.setHeaderColor('#0a0a0f');

        try {
          const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
            headers: { 
              telegram_id: tgUser.id,
              display_name: tgUser.username || tgUser.first_name 
            }
          });
          setProfile(res.data.user);
        } catch (e) {
          console.error("Telegram Sync Error:", e);
        }
        setLoading(false);
      } 
      // B. Check standard Web/Gmail session
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchOrCreateProfile(session.user);
        } else {
          setProfile(null);
        }

        // Listen for Gmail login/logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            await fetchOrCreateProfile(session.user);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }
    };

    initApp();
  }, []);

  const fetchOrCreateProfile = async (authUser) => {
    // Attempt to get existing profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (existing) {
      setProfile(existing);
    } else {
      // Create profile for first-time Gmail user
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          display_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          avatar_url: authUser.user_metadata?.avatar_url,
          role: 'resident'
        }])
        .select()
        .single();
      setProfile(newProfile);
    }
  };

  const handleGmailLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // 2. GUEST / LOGIN SCREEN
  if (!profile && !loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <img src="/baqalaslogo.png" className="w-24 mx-auto mb-8 shadow-2xl" alt="Baqala" />
          <h1 className="text-4xl font-black italic mb-2 tracking-tighter text-white">BAQALA</h1>
          <p className="text-white/40 text-sm mb-12 font-medium tracking-wide uppercase">The Digital Hisaab Network</p>
          
          <div className="w-full max-w-sm space-y-4">
            <button onClick={handleGmailLogin} className="w-full flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl font-black italic transition-transform active:scale-95 shadow-xl shadow-white/5">
              <Chrome size={22} /> CONTINUE WITH GOOGLE
            </button>
            <div className="flex items-center gap-4 py-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-[3px]">Neighborhood Access</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>
            <button onClick={() => alert("Email registration available in next build. Use Google for now.")} className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-bold transition-transform active:scale-95">
              <Mail size={22} /> CREATE ACCOUNT
            </button>
          </div>
          
          <p className="mt-12 text-[10px] text-white/20 font-bold uppercase tracking-widest leading-relaxed">
            By continuing, you join the community-led<br/>grocery credit network.
          </p>
        </motion.div>
      </div>
    );
  }

  // 3. LOADING STATE
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-teal-400 mb-6" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30 animate-pulse">Establishing Connection</p>
    </div>
  );

  // 4. MAIN APPLICATION UI
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans select-none">
      
      {/* Top Header */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg" alt="Avatar" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-600 rounded-xl flex items-center justify-center font-black italic text-black shadow-lg">
              {profile?.display_name?.[0] || 'B'}
            </div>
          )}
          <div>
            <h2 className="text-sm font-black italic leading-tight uppercase tracking-tight">{profile?.display_name}</h2>
            <p className="text-[9px] font-black text-teal-400 uppercase tracking-tighter flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                {profile?.role === 'merchant' ? 'Baqala Manager' : 'Verified Resident'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-white/40"><Bell size={20} /></button>
          <button onClick={handleLogout} className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/10 text-red-500/60"><LogOut size={20}/></button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          {profile?.role === 'merchant' ? (
             <VendorDashboard key="vendor" user={profile} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={profile} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={profile} lang={lang} />}
              {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
                  {/* Account Card */}
                  <div className="glass-card">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">Identity Profile</h4>
                    <div className="flex items-center gap-5">
                       <div className="w-20 h-20 bg-white/5 rounded-[28px] flex items-center justify-center border border-white/5 shadow-inner">
                          <UserCircle size={48} className="text-white/20" />
                       </div>
                       <div>
                          <h3 className="font-black italic text-2xl tracking-tight">{profile?.display_name}</h3>
                          <p className="text-xs text-white/40 font-medium">{profile?.email || `Telegram ID: ${profile?.telegram_id}`}</p>
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-teal-400/10 rounded-full">
                             <Shield size={10} className="text-teal-400" />
                             <span className="text-[8px] font-black text-teal-400 uppercase">KYC Verified</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Settings / Actions */}
                  <div className="space-y-3">
                     <button className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/5 group active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Chrome size={20}/></div>
                           <span className="text-sm font-bold text-white/80">Account Linked</span>
                        </div>
                        <div className="text-[9px] font-black uppercase text-emerald-400">Google</div>
                     </button>
                     
                     <button className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/5 group active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Wallet size={20}/></div>
                           <span className="text-sm font-bold text-white/80">Link TON Wallet</span>
                        </div>
                        <ChevronRight size={18} className="text-white/10 group-hover:translate-x-1 transition-transform" />
                     </button>
                  </div>

                  <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pt-8">
                     Baqala Protocol v1.2.0-PROD
                  </p>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {profile?.role !== 'merchant' && (
        <nav className="fixed bottom-0 left-0 right-0 h-28 bg-[#0a0a0f]/90 backdrop-blur-3xl border-t border-white/5 px-10 flex justify-between items-center z-50">
          {[
            { id: 'home', icon: Home, label: 'Farij' },
            { id: 'hisaab', icon: Wallet, label: 'Ledger' },
            { id: 'profile', icon: User, label: 'Account' }
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setActiveTab(btn.id)}
              className={`flex flex-col items-center gap-2 transition-all ${activeTab === btn.id ? 'text-teal-400 scale-110' : 'text-white/20'}`}
            >
              <btn.icon size={26} strokeWidth={activeTab === btn.id ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">{btn.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
