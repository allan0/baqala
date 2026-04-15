// ================================================
// frontend/src/App.jsx - VERSION 26 (TOTAL RESTORATION)
// ================================================
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store,
  Chrome, Sparkles, UserCircle, CheckCircle2,
  AlertCircle, Languages, ShieldCheck, Zap,
  ShoppingBag, Settings, LayoutDashboard,
  UserPlus
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
    role_resident: "Neighborhood Resident",
    role_merchant: "Baqala Manager",
    nav_home: "Home",
    nav_ledger: "Ledger",
    nav_me: "Me",
    profile_title: "Identity Hub",
    kyc_status: "Identity Verified",
    link_google: "Link Google Account",
    link_cta: "Link your identity to enable digital credit tabs and secure your balance.",
    linked: "Identity Verified",
    logout: "Exit Grid / Sign Out",
    guest_mode: "Guest Resident",
    manage_store: "Manage My Store",
    become_merchant: "Open a Storefront",
    fazaa_label: "Fazaa Member ID",
    fazaa_link: "Update Card",
    lang_btn: "العربية"
  },
  ar: {
    tagline: "شبكة الحساب الرقمي",
    role_resident: "ساكن في الفريج",
    role_merchant: "مدير الدكان",
    nav_home: "الرئيسية",
    nav_ledger: "الحساب",
    nav_me: "ملفي",
    profile_title: "مركز الهوية",
    kyc_status: "هوية موثقة",
    link_google: "ربط حساب جوجل",
    link_cta: "اربط هويتك الرقمية لتتمكن من استخدام حساب الدين وتأمين رصيدك.",
    linked: "هوية موثقة",
    logout: "خروج",
    guest_mode: "زائر",
    manage_store: "إدارة دكاني",
    become_merchant: "تسجيل دكان جديد",
    fazaa_label: "رقم بطاقة فزعة",
    fazaa_link: "تحديث الرقم",
    lang_btn: "English"
  }
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState('customer'); // Switches layout between Resident/Merchant
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [fazaaInput, setFazaaInput] = useState('');

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  // ==========================================
  // 1. IDENTITY & TELEGRAM ENGINE
  // ==========================================

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);

      // A. IF INSIDE TELEGRAM: Automatically Sync
      if (WebApp?.initDataUnsafe?.user) {
        const tgUser = WebApp.initDataUnsafe.user;
        WebApp.expand();
        WebApp.setHeaderColor('#0a0a0f');

        try {
          const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
            headers: { 
              telegram_id: tgUser.id.toString(),
              display_name: tgUser.username || tgUser.first_name,
              avatar_url: tgUser.photo_url || null // Pick up real TG photo
            }
          });
          if (res.data.user) setProfile(res.data.user);
        } catch (e) {
          console.error("Sync Failure:", e);
        }
        setLoading(false);
      } 
      // B. IF ON WEB: Check existing session, else load as Guest
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await fetchProfile(session.user.id);
        
        // Listen for Gmail Login/Logout
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) await fetchProfile(session.user.id);
          else setProfile(null);
          setLoading(false);
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }
    };

    initApp();
  }, []);

  const fetchProfile = async (uid) => {
    try {
      const res = await axios.post(`${API_URL}/api/user/sync`, {}, {
        headers: { auth_id: uid }
      });
      if (res.data.user) setProfile(res.data.user);
    } catch (e) { console.error("Identity Fetch Error", e); }
  };

  // ==========================================
  // 2. CORE ACTIONS
  // ==========================================

  const handleGmailLogin = async () => {
    const redirectUrl = window.location.origin.replace(/\/$/, "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
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
      alert("Ledger identity updated with Fazaa card.");
    } catch (e) { alert("Fazaa update failed."); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setProfile(null);
    window.location.href = "/"; // Force reset to guest
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
      <RefreshCw className="animate-spin text-teal-400 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30 animate-pulse">Syncing Grid</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans select-none ${isRTL ? 'font-arabic text-right' : ''}`}>
      
      {/* --- TOP HEADER: RESTORED BRANDING --- */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-11 h-11 rounded-full border-2 border-teal-400/20 shadow-xl" alt="P" />
            ) : (
              <div className="w-11 h-11 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                <UserCircle size={24} className="text-white/20" />
              </div>
            )}
            {profile && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />}
          </div>
          <div>
            <motion.h1 
              animate={{ backgroundPosition: ["0%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="text-xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent leading-none"
            >
              BAQALAS
            </motion.h1>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[2px] mt-1.5 leading-none">
               {profile ? (profile.role === 'merchant' ? t.role_merchant : t.role_resident) : t.guest_mode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleLanguage} className="px-3.5 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase text-teal-400 active:bg-teal-400 active:text-black">
            {t.lang_btn}
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT SWITCHER --- */}
      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          {viewMode === 'vendor' ? (
             <VendorDashboard key="vendor" user={profile} lang={lang} />
          ) : (
            <>
              {activeTab === 'home' && <CustomerDashboard user={profile || {id: 'guest'}} lang={lang} setActiveTab={setActiveTab} />}
              {activeTab === 'hisaab' && <HisaabTab user={profile} lang={lang} setActiveTab={setActiveTab} />}
              
              {/* --- TAB: ME (IDENTITY HUB) --- */}
              {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
                  
                  {/* Account Card Restoration */}
                  <div className="glass-card !p-8 relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent rounded-[32px]">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 text-teal-400"><LayoutDashboard size={160}/></div>
                    <div className="flex items-center gap-6 relative z-10">
                       <div className="w-20 h-20 rounded-full border-4 border-[#0a0a0f] shadow-2xl overflow-hidden bg-black/40 flex items-center justify-center">
                          {profile?.avatar_url ? (
                             <img src={profile.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                             <UserCircle size={48} className="text-white/10" />
                          )}
                       </div>
                       <div>
                          <h3 className="font-black italic text-2xl tracking-tight leading-tight text-white">{profile?.display_name || "Guest Resident"}</h3>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                             {profile?.email || (profile?.telegram_id ? `TG ID: ${profile.telegram_id}` : "GUEST ACCOUNT")}
                          </p>
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-teal-400/10 rounded-full border border-teal-400/20">
                             <ShieldCheck size={10} className="text-teal-400" />
                             <span className="text-[8px] font-black text-teal-400 uppercase tracking-tighter">{t.kyc_status}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* MERCHANT Hub BUTTONS (RESTORED) */}
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black uppercase tracking-[3px] text-white/20 mb-4 ml-2">Business Operations</h4>
                     <button 
                        onClick={() => setViewMode('vendor')}
                        className={`w-full flex items-center justify-between p-5 rounded-[28px] border group active:scale-95 transition-all shadow-xl ${
                          profile?.role === 'merchant' 
                            ? 'bg-gradient-to-r from-teal-400/20 to-transparent border-teal-400/20' 
                            : 'bg-white/5 border-white/10'
                        }`}
                     >
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${profile?.role === 'merchant' ? 'bg-teal-400 text-black' : 'bg-white/5 text-white/40'}`}>
                              <Store size={22}/>
                           </div>
                           <span className={`text-sm font-black italic uppercase tracking-tight ${profile?.role === 'merchant' ? 'text-teal-400' : 'text-white/60'}`}>
                              {profile?.role === 'merchant' ? t.manage_store : t.become_merchant}
                           </span>
                        </div>
                        <ChevronRight size={20} className={profile?.role === 'merchant' ? 'text-teal-400' : 'text-white/20'} />
                     </button>
                  </div>

                  {/* GMAIL UPGRADE Restoration */}
                  {!profile?.email && (
                     <div className="p-8 bg-[#1a1f2e] border border-blue-500/20 rounded-[32px] shadow-2xl relative overflow-hidden">
                        <Chrome size={80} className="absolute -right-4 -top-4 text-blue-500/5 rotate-12" />
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                           <div className="p-3 bg-blue-500/20 rounded-full text-blue-400"><Chrome size={20}/></div>
                           <p className="text-[11px] font-black uppercase text-blue-400 tracking-widest">{t.link_google}</p>
                        </div>
                        <p className="text-[11px] text-white/40 mb-8 leading-relaxed font-medium relative z-10">{t.link_cta}</p>
                        <button onClick={handleGmailLogin} className="w-full bg-white text-black py-5 rounded-[22px] font-black italic uppercase text-xs active:scale-95 transition-all shadow-2xl shadow-blue-500/20">
                           SYNC WITH GOOGLE
                        </button>
                     </div>
                  )}

                  {/* FAZAA CARD Hub RESTORATION */}
                  <div className="glass-card border-orange-500/20 shadow-xl rounded-[32px]">
                     <div className="flex justify-between items-center mb-8">
                        <h4 className="text-[11px] font-black uppercase tracking-[4px] text-orange-500 flex items-center gap-3">
                           <Zap size={16} fill="currentColor" /> Benefits Hub
                        </h4>
                        {profile?.fazaa_card && <div className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-emerald-500/20">Linked</div>}
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-white/30 ml-2 tracking-widest">{t.fazaa_label}</p>
                        <div className="flex gap-3">
                           <input 
                              className="input-modern flex-1 !py-4 !text-sm !rounded-[20px] !bg-white/[0.02] border-white/5" 
                              placeholder="Fazaa Card Number"
                              value={profile?.fazaa_card || fazaaInput}
                              onChange={e => setFazaaInput(e.target.value)}
                           />
                           <button onClick={handleUpdateFazaa} className="bg-white/10 border border-white/10 text-white px-8 rounded-[20px] font-black uppercase text-[11px] active:bg-teal-400 active:text-black transition-colors">
                              {t.fazaa_link}
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* RESTORED LOGOUT logic */}
                  {profile && (
                     <button onClick={handleLogout} className="w-full flex items-center justify-center gap-4 py-8 text-[11px] font-black uppercase tracking-[5px] text-red-500/40 hover:text-red-500 transition-all active:scale-95 group">
                        <LogOut size={22} className="group-hover:rotate-12 transition-transform" /> {t.logout}
                     </button>
                  )}

                  <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-[8px] pt-10 italic">
                     Baqala Protocol v1.4.2-PROD
                  </p>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* --- BOTTOM NAVIGATION (Restored Hub) --- */}
      {viewMode === 'customer' && (
        <nav className="fixed bottom-0 left-0 right-0 h-28 bg-[#0a0a0f]/95 backdrop-blur-3xl border-t border-white/5 px-12 flex justify-between items-center z-50">
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
              <span className="text-[9px] font-black uppercase tracking-[3px]">{btn.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* BACK BUTTON FOR MERCHANT MODE */}
      {viewMode === 'vendor' && (
        <button 
          onClick={() => setViewMode('customer')}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white text-black px-10 py-4 rounded-full font-black uppercase text-[11px] shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-[100] active:scale-95 transition-all"
        >
          ← Return to Neighborhood
        </button>
      )}
    </div>
  );
}
