// ================================================
// frontend/src/App.jsx - VERSION 22 (TOTAL RESTORATION)
// ================================================
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store,
  Chrome, Sparkles, UserCircle, Languages,
  AlertCircle, ShieldCheck, Zap
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
  en: {
    tagline: "The Digital Hisaab Network",
    login_google: "Link Google Account",
    role_resident: "Verified Resident",
    role_merchant: "Baqala Manager",
    nav_home: "Neighborhood",
    nav_ledger: "Ledger",
    nav_me: "Me",
    profile_title: "Identity Profile",
    kyc_status: "Identity Verified",
    logout: "Exit Grid",
    guest_mode: "Guest Resident",
    link_cta: "Link Gmail to enable ordering",
    fazaa_label: "Fazaa Member ID",
    fazaa_link: "Link Card",
    lang_btn: "العربية"
  },
  ar: {
    tagline: "شبكة الحساب الرقمي",
    login_google: "ربط حساب جوجل",
    role_resident: "جار موثوق",
    role_merchant: "مدير الدكان",
    nav_home: "الفريج",
    nav_ledger: "الحساب",
    nav_me: "ملفي",
    profile_title: "هوية المستخدم",
    kyc_status: "هوية موثقة",
    logout: "خروج",
    guest_mode: "زائر",
    link_cta: "اربط حسابك لتفعيل الطلبات",
    fazaa_label: "بطاقة فزعة",
    fazaa_link: "ربط البطاقة",
    lang_btn: "English"
  }
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [fazaaInput, setFazaaInput] = useState('');

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  // ==========================================
  // 1. COMPREHENSIVE IDENTITY ENGINE
  // ==========================================

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);

      // A. AUTO-SYNC TELEGRAM USER
      if (WebApp?.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        WebApp.expand();
        WebApp.setHeaderColor('#0a0a0f');

        try {
          const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
            headers: { 
              telegram_id: tgUser.id.toString(),
              display_name: tgUser.username || tgUser.first_name,
              avatar_url: tgUser.photo_url || null
            }
          });
          setProfile(res.data.user);
          setIsGuest(false);
        } catch (e) {
          console.error("Identity Sync Failure:", e);
        }
        setLoading(false);
      } 
      // B. WEB / GMAIL FLOW
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setIsGuest(true);
          setProfile(null);
        }

        // Listen for Login/Logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            await fetchProfile(session.user.id);
            setIsGuest(false);
          } else {
            setProfile(null);
            setIsGuest(true);
          }
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }
    };

    initApp();
  }, []);

  const fetchProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) setProfile(data);
  };

  // ==========================================
  // 2. CORE ACTIONS
  // ==========================================

  const handleGmailLink = async () => {
    const origin = window.location.origin.replace(/\/$/, "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin }
    });
    if (error) alert(error.message);
  };

  const handleUpdateFazaa = async () => {
    if (!profile || !fazaaInput) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ fazaa_card: fazaaInput })
        .eq('id', profile.id)
        .select().single();
      if (error) throw error;
      setProfile(data);
      setFazaaInput('');
      alert("Fazaa linked!");
    } catch (e) { alert("Failed to link Fazaa"); }
  };

  const toggleLanguage = () => {
    const nLang = lang === 'en' ? 'ar' : 'en';
    setLang(nLang);
    localStorage.setItem('baqala_lang', nLang);
  };

  // ==========================================
  // 3. UI RENDERING
  // ==========================================

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-teal-400 mb-6" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30 animate-pulse">Syncing Grid</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans select-none ${isRTL ? 'font-arabic text-right' : ''}`}>
      
      {/* --- TOP HEADER --- */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-10 h-10 rounded-full border-2 border-teal-400/30 shadow-lg" alt="P" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-orange-500 rounded-full flex items-center justify-center font-black italic text-black shadow-lg">
                {profile?.display_name?.[0] || 'B'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
          </div>
          <div>
            <motion.h1 
              animate={{ backgroundPosition: ["0%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="text-lg font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent"
            >
              BAQALAS
            </motion.h1>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mt-1">
               {profile ? (profile.role === 'merchant' ? t.role_merchant : t.role_resident) : t.guest_mode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleLanguage} className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase text-teal-400">
            {t.lang_btn}
          </button>
          {profile && (
            <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="p-2.5 bg-red-500/10 rounded-xl text-red-500/60">
              <LogOut size={18}/>
            </button>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          {profile?.role === 'merchant' ? (
             <VendorDashboard key="vendor" user={profile} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={profile || {id: 'guest'}} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={profile} lang={lang} />}
              
              {/* --- PROFILE HUB --- */}
              {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
                  
                  {/* Account Identity Card */}
                  <div className="glass-card">
                    <div className="flex items-center gap-5">
                       <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center border border-white/5 shadow-inner overflow-hidden">
                          {profile?.avatar_url ? (
                             <img src={profile.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                             <UserCircle size={48} className="text-white/10" />
                          )}
                       </div>
                       <div>
                          <h3 className="font-black italic text-2xl tracking-tight leading-tight">{profile?.display_name || "Guest Resident"}</h3>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                             {profile?.email || (profile?.telegram_id ? `TG: ${profile.telegram_id}` : "Anonymous Grid")}
                          </p>
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-teal-400/10 rounded-full border border-teal-400/20">
                             <ShieldCheck size={10} className="text-teal-400" />
                             <span className="text-[8px] font-black text-teal-400 uppercase tracking-tighter">{t.kyc_status}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Gmail Integration Link */}
                  {!profile?.email && (
                     <div className="p-6 bg-gradient-to-tr from-blue-500/20 to-transparent border border-blue-500/20 rounded-[28px]">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Chrome size={20}/></div>
                           <p className="text-[11px] font-black uppercase text-blue-400">{t.login_google}</p>
                        </div>
                        <p className="text-xs text-white/40 mb-5 leading-relaxed">{t.link_cta}</p>
                        <button onClick={handleGmailLink} className="w-full bg-white text-black py-4 rounded-2xl font-black italic uppercase text-xs active:scale-95 transition-all">
                           Link Google Account
                        </button>
                     </div>
                  )}

                  {/* FAZAA CARD LINKING */}
                  <div className="glass-card">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                        <Zap size={14} className="text-orange-500" /> Neighborhood Benefits
                     </h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                           <span className="text-sm font-bold">{t.fazaa_label}</span>
                           {profile?.fazaa_card && <span className="text-[9px] font-black text-emerald-400 uppercase">Verified</span>}
                        </div>
                        <div className="flex gap-2">
                           <input 
                              className="input-modern flex-1 !py-3 !text-sm" 
                              placeholder="ID Number"
                              value={fazaaInput}
                              onChange={e => setFazaaInput(e.target.value)}
                           />
                           <button onClick={handleUpdateFazaa} className="bg-white/5 border border-white/10 px-6 rounded-2xl font-black uppercase text-[10px] active:bg-teal-400 active:text-black">
                              {t.fazaa_link}
                           </button>
                        </div>
                     </div>
                  </div>

                  <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pt-8 italic">
                     Protocol: Baqala Network v1.2.5
                  </p>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* --- BOTTOM NAVIGATION --- */}
      {profile?.role !== 'merchant' && (
        <nav className="fixed bottom-0 left-0 right-0 h-28 bg-[#0a0a0f]/90 backdrop-blur-3xl border-t border-white/5 px-10 flex justify-between items-center z-50">
          {[
            { id: 'home', icon: Home, label: t.nav_home },
            { id: 'hisaab', icon: Wallet, label: t.nav_ledger },
            { id: 'profile', icon: User, label: t.nav_me }
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
