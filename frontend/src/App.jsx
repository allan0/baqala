// ================================================
// frontend/src/App.jsx - VERSION 20 (FINAL PRODUCTION)
// ================================================
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store,
  Chrome, Sparkles, UserCircle, Languages,
  AlertCircle
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
    login_google: "CONTINUE WITH GOOGLE",
    login_guest: "ENTER AS GUEST",
    email_placeholder: "Enter neighborhood email...",
    loading_text: "Establishing Connection",
    role_resident: "Verified Resident",
    role_merchant: "Baqala Manager",
    nav_home: "Farij",
    nav_ledger: "Ledger",
    nav_me: "Me",
    profile_title: "Identity Profile",
    kyc_status: "Identity Verified",
    link_google: "Link Google Account",
    linked: "Linked",
    logout: "Exit Grid",
    guest_alert: "Neighborhood link sent to your email!"
  },
  ar: {
    tagline: "شبكة الحساب الرقمي",
    login_google: "الدخول عبر جوجل",
    login_guest: "الدخول كضيف",
    email_placeholder: "بريدك الإلكتروني...",
    loading_text: "جاري الاتصال بالشبكة",
    role_resident: "جار موثوق",
    role_merchant: "مدير الدكان",
    nav_home: "الفريج",
    nav_ledger: "الحساب",
    nav_me: "ملفي",
    profile_title: "هوية المستخدم",
    kyc_status: "هوية موثقة",
    link_google: "ربط حساب جوجل",
    linked: "مرتبط",
    logout: "خروج",
    guest_alert: "تم إرسال رابط الدخول لبريدك!"
  }
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [emailInput, setEmailInput] = useState('');

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  // ==========================================
  // 1. AUTHENTICATION CORE
  // ==========================================

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);

      // A. TELEGRAM MINI APP FLOW
      if (WebApp?.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        WebApp.expand();
        WebApp.setHeaderColor('#0a0a0f');

        try {
          const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
            headers: { 
              telegram_id: tgUser.id.toString(),
              display_name: tgUser.username || tgUser.first_name 
            }
          });
          setProfile(res.data.user);
        } catch (e) {
          console.error("Telegram Auth Sync Failure:", e);
        }
        setLoading(false);
      } 
      // B. WEB BROWSER FLOW (GMAIL / EMAIL)
      else {
        // Handle session from URL or LocalStorage
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        // Auth state listener (detects logins/logouts)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }
    };

    initAuth();
  }, []);

  // Fetch profile from the database (Trigger handles the creation)
  const fetchProfile = async (uid, retries = 2) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (data) {
        setProfile(data);
      } else if (retries > 0) {
        // If the DB trigger was slow, wait 1s and retry
        setTimeout(() => fetchProfile(uid, retries - 1), 1000);
      }
    } catch (err) {
      console.error("Fetch Profile Error:", err);
    }
  };

  // ==========================================
  // 2. AUTH ACTIONS
  // ==========================================

  const handleGmailLogin = async () => {
    // FIX: Clean origin (no trailing slash) matches Supabase settings
    const cleanOrigin = window.location.origin.replace(/\/$/, "");
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: cleanOrigin 
      }
    });
    if (error) alert(error.message);
  };

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    if (!emailInput) return;
    
    const cleanOrigin = window.location.origin.replace(/\/$/, "");
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: cleanOrigin }
    });

    if (error) alert(error.message);
    else alert(t.guest_alert);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); // Clear all tokens and session data
    setProfile(null);
    if (!WebApp?.initDataUnsafe?.user) {
        window.location.reload();
    }
  };

  // ==========================================
  // 3. UI RENDERING LOGIC
  // ==========================================

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-teal-400 mb-6" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30 animate-pulse">{t.loading_text}</p>
    </div>
  );

  // LOGIN SCREEN (For Non-Telegram/Logged-out users)
  if (!profile && !loading) {
    return (
      <div className={`min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
          <img src="/baqalaslogo.png" className="w-24 mx-auto mb-8 rounded-[32px] shadow-2xl" alt="Baqala" />
          <h1 className="text-4xl font-black italic mb-2 tracking-tighter text-white uppercase">Baqala</h1>
          <p className="text-white/40 text-[10px] mb-12 font-bold tracking-[3px] uppercase">{t.tagline}</p>
          
          <div className="space-y-4">
            <button onClick={handleGmailLogin} className="w-full flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl font-black italic transition-all active:scale-95 shadow-xl hover:bg-gray-100">
              <Chrome size={22} /> {t.login_google}
            </button>

            <div className="flex items-center gap-4 py-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[9px] font-black text-white/20 uppercase">OR</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <form onSubmit={handleGuestLogin} className="space-y-3">
               <input 
                 type="email" 
                 placeholder={t.email_placeholder}
                 value={emailInput}
                 onChange={(e) => setEmailInput(e.target.value)}
                 className="input-modern w-full !bg-white/[0.03] !border-white/10 text-center"
                 required
               />
               <button type="submit" className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-bold transition-all active:scale-95">
                 <Mail size={22} /> {t.login_guest}
               </button>
            </form>
          </div>
          
          <button 
            onClick={() => {
                const nLang = lang === 'en' ? 'ar' : 'en';
                setLang(nLang);
                localStorage.setItem('baqala_lang', nLang);
            }}
            className="mt-12 text-[10px] font-black text-teal-400 flex items-center gap-2 mx-auto uppercase tracking-widest"
          >
            <Languages size={14}/> {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </motion.div>
      </div>
    );
  }

  // MAIN APPLICATION
  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans select-none ${isRTL ? 'font-arabic text-right' : ''}`}>
      
      {/* Top Header */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-orange-500 rounded-xl flex items-center justify-center font-black italic text-black shadow-lg">
            {profile?.display_name?.[0] || 'B'}
          </div>
          <div>
            <h2 className="text-sm font-black italic uppercase tracking-tight line-clamp-1">{profile?.display_name}</h2>
            <p className="text-[9px] font-black text-teal-400 uppercase tracking-tighter flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                {profile?.role === 'merchant' ? t.role_merchant : t.role_resident}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
              const nLang = lang === 'en' ? 'ar' : 'en';
              setLang(nLang);
              localStorage.setItem('baqala_lang', nLang);
          }} className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-white/40"><Languages size={18}/></button>
          <button onClick={handleLogout} className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/10 text-red-500/60 transition-transform active:scale-90"><LogOut size={18}/></button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          {profile?.role === 'merchant' ? (
             <VendorDashboard key="vendor" user={profile} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={profile} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={profile} lang={lang} />}
              {activeTab === 'profile' && (
                <div className="p-6 space-y-6">
                  {/* Identity Card */}
                  <div className="glass-card">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">{t.profile_title}</h4>
                    <div className="flex items-center gap-5">
                       <div className="w-20 h-20 bg-white/5 rounded-[28px] flex items-center justify-center border border-white/5 shadow-inner">
                          {profile?.avatar_url ? (
                             <img src={profile.avatar_url} className="w-full h-full rounded-[28px] object-cover" />
                          ) : (
                             <UserCircle size={48} className="text-white/20" />
                          )}
                       </div>
                       <div>
                          <h3 className="font-black italic text-2xl tracking-tight">{profile?.display_name}</h3>
                          <p className="text-xs text-white/40 font-medium truncate max-w-[200px]">{profile?.email || `ID: ${profile?.telegram_id}`}</p>
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-teal-400/10 rounded-full border border-teal-400/20">
                             <Shield size={10} className="text-teal-400" />
                             <span className="text-[8px] font-black text-teal-400 uppercase">{t.kyc_status}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                     {!profile?.email && (
                        <button onClick={handleGmailLogin} className="w-full flex items-center justify-between p-5 bg-white text-black rounded-[24px] group active:scale-95 transition-all shadow-xl">
                           <div className="flex items-center gap-4">
                              <Chrome size={20}/>
                              <span className="text-sm font-black italic uppercase">{t.link_google}</span>
                           </div>
                           <ChevronRight size={18} />
                        </button>
                     )}
                     
                     <button className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/5 group active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Wallet size={20}/></div>
                           <span className="text-sm font-bold text-white/80">Link Settlement Wallet</span>
                        </div>
                        <ChevronRight size={18} className="text-white/10 group-hover:translate-x-1 transition-transform" />
                     </button>
                  </div>
                  <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pt-8">Baqala Protocol v1.2.0-PROD</p>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation (Residents Only) */}
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
