// ================================================
// frontend/src/App.jsx - VERSION 21 (STABLE PRODUCTION)
// ================================================
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store,
  Chrome, Sparkles, UserCircle, CheckCircle2,
  AlertCircle, Languages
} from 'lucide-react';
import axios from 'axios';
import { supabase } from './supabaseClient';

// Components
import CustomerDashboard from './components/CustomerDashboard';
import VendorDashboard from './components/VendorDashboard';
import HisaabTab from './components/HisaabTab';

const WebApp = window.Telegram?.WebApp;
const API_URL = import.meta.env.VITE_API_URL || "https://baqala-i2oi.onrender.com";

const translations = {
  en: { tagline: "Digital Hisaab Protocol", login_google: "CONTINUE WITH GOOGLE", role_resident: "Resident", role_merchant: "Merchant", loading: "Connecting...", guest: "ENTER AS GUEST" },
  ar: { tagline: "بروتوكول الحساب الرقمي", login_google: "الدخول عبر جوجل", role_resident: "جار موثق", role_merchant: "تاجر", loading: "جاري الاتصال...", guest: "دخول كضيف" }
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');

  const t = useMemo(() => translations[lang], [lang]);

  useEffect(() => {
    const initSession = async () => {
      setLoading(true);

      // A. Telegram Environment
      if (WebApp?.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        try {
          const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
            headers: { telegram_id: tgUser.id.toString(), display_name: tgUser.first_name }
          });
          setProfile(res.data.user);
        } catch (e) { console.error("TG Sync Error", e); }
        setLoading(false);
      } 
      // B. Web Environment
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await syncProfile(session.user);
        else setLoading(false);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) await syncProfile(session.user);
          else { setProfile(null); setLoading(false); }
        });
        return () => subscription.unsubscribe();
      }
    };
    initSession();
  }, []);

  const syncProfile = async (authUser) => {
    try {
      // FIX 406 Error: Use maybeSingle() instead of single()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle(); 

      if (data) {
        setProfile(data);
      } else {
        // First time initialization via RLS-safe insertion
        const displayName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: authUser.id,
            email: authUser.email,
            display_name: displayName,
            avatar_url: authUser.user_metadata?.avatar_url,
            role: 'resident'
          }])
          .select()
          .maybeSingle();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (err) {
      console.error("Identity Bridge Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const origin = window.location.origin.replace(/\/$/, "");
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin }
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30">{t.loading}</p>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center">
      <img src="/baqalaslogo.png" className="w-24 mb-6" alt="Logo" />
      <h1 className="text-4xl font-black italic mb-2">BAQALA</h1>
      <p className="text-white/40 text-[10px] mb-12 font-bold tracking-[3px] uppercase">{t.tagline}</p>
      <button onClick={handleLogin} className="w-full max-w-sm bg-white text-black py-5 rounded-2xl font-black italic flex items-center justify-center gap-3 active:scale-95 shadow-xl transition-all">
        <Chrome size={22} /> {t.login_google}
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <header className="px-6 py-5 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-orange-500 rounded-xl flex items-center justify-center font-black italic text-black shadow-lg">B</div>
          <div>
            <h2 className="text-sm font-black italic uppercase tracking-tight">{profile.display_name}</h2>
            <p className="text-[9px] font-black text-teal-400 uppercase tracking-tighter">{profile.role === 'merchant' ? t.role_merchant : t.role_resident}</p>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-white/40"><LogOut size={18}/></button>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          {profile.role === 'merchant' ? (
            <VendorDashboard key="vendor" user={profile} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={profile} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={profile} lang={lang} />}
              {activeTab === 'profile' && <div className="p-20 text-center opacity-20 italic">Settings Hub</div>}
            </>
          )}
        </AnimatePresence>
      </main>

      {profile.role !== 'merchant' && (
        <nav className="fixed bottom-0 left-0 right-0 h-28 bg-[#0a0a0f]/90 backdrop-blur-3xl border-t border-white/5 px-10 flex justify-between items-center z-50">
          {[{ id: 'home', icon: Home, label: 'Farij' }, { id: 'hisaab', icon: Wallet, label: 'Ledger' }, { id: 'profile', icon: User, label: 'Me' }].map(btn => (
            <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center gap-2 transition-all ${activeTab === btn.id ? 'text-teal-400 scale-110' : 'text-white/20'}`}>
              <btn.icon size={26} />
              <span className="text-[9px] font-black uppercase tracking-widest">{btn.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
