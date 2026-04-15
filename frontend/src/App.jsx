// ================================================
// frontend/src/App.jsx - VERSION 23 (TOTAL RESTORATION)
// ================================================
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, LogOut, Mail, User, Shield, 
  ChevronRight, Bell, Wallet, Home, Store,
  Chrome, Sparkles, UserCircle, CheckCircle2,
  AlertCircle, Languages, ShieldCheck, Zap,
  ShoppingBag, Settings, LayoutDashboard
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
    role_merchant: "Baqala Owner",
    nav_home: "Home",
    nav_ledger: "Ledger",
    nav_me: "Me",
    profile_title: "Identity Hub",
    kyc_status: "Verified Neighbor",
    link_google: "Link Google Account",
    link_cta: "Link Gmail to secure your tab and shop across the network.",
    linked: "Linked",
    logout: "Log Out / Exit",
    guest_mode: "Guest Resident",
    manage_store: "Manage My Store",
    become_merchant: "Register as Merchant",
    fazaa_label: "Fazaa Member ID",
    fazaa_link: "Update Card",
    fazaa_success: "Fazaa Linked Successfully!",
    lang_btn: "العربية"
  },
  ar: {
    tagline: "شبكة الحساب الرقمي",
    role_resident: "ساكن في الفريج",
    role_merchant: "راعي الدكان",
    nav_home: "الرئيسية",
    nav_ledger: "الحساب",
    nav_me: "ملفي",
    profile_title: "مركز الهوية",
    kyc_status: "جار موثق",
    link_google: "ربط حساب جوجل",
    link_cta: "اربط حسابك لتأمين حسابك والتسوق في الشبكة.",
    linked: "مرتبط",
    logout: "تسجيل الخروج",
    guest_mode: "زائر",
    manage_store: "إدارة دكاني",
    become_merchant: "التسجيل كتاجر",
    fazaa_label: "رقم بطاقة فزعة",
    fazaa_link: "تحديث البطاقة",
    fazaa_success: "تم ربط فزعة بنجاح!",
    lang_btn: "English"
  }
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState('customer'); // customer or vendor
  const [lang, setLang] = useState(localStorage.getItem('baqala_lang') || 'en');
  const [fazaaInput, setFazaaInput] = useState('');

  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === 'ar';

  // ==========================================
  // 1. IDENTITY & SYNC ENGINE
  // ==========================================

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);

      // A. TELEGRAM AUTO-SYNC
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
          if (res.data.user) setProfile(res.data.user);
        } catch (e) { console.error("Sync Error", e); }
        setLoading(false);
      } 
      // B. WEB SESSION SYNC
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await fetchProfile(session.user.id);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) await fetchProfile(session.user.id);
          else setProfile(null);
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin }
    });
  };

  const handleUpdateFazaa = async () => {
    if (!profile || !fazaaInput) return;
    try {
      const { data, error } = await supabase.from('profiles').update({ fazaa_card: fazaaInput }).eq('id', profile.id).select().single();
      if (error) throw error;
      setProfile(data);
      setFazaaInput('');
      alert(t.fazaa_success);
    } catch (e) { alert("Fazaa update failed."); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/"; // Force hard redirect to clear state
  };

  const toggleLanguage = () => {
    const nLang = lang === 'en' ? 'ar' : 'en';
    setLang(nLang);
    localStorage.setItem('baqala_lang', nLang);
  };

  // ==========================================
  // 3. MAIN UI
  // ==========================================

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-teal-400 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30 animate-pulse">Initializing Protocol</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans select-none ${isRTL ? 'font-arabic text-right' : ''}`}>
      
      {/* --- TOP HEADER (Rounded Logo + Shimmering Text) --- */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#0a0a0f]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-10 h-10 rounded-full border-2 border-teal-400/20 shadow-lg" alt="Profile" />
            ) : (
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                <User size={20} className="text-white/20" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
          </div>
          <div>
            <motion.h1 
              animate={{ backgroundPosition: ["0%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="text-lg font-black italic uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-orange-500 to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent"
            >
              BAQALAS
            </motion.h1>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">
               {profile ? (profile.role === 'merchant' ? t.role_merchant : t.role_resident) : t.guest_mode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleLanguage} className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase text-teal-400 transition-colors active:bg-teal-400 active:text-black">
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
              
              {/* --- TAB: ME (Identity Hub) --- */}
              {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
                  
                  {/* Account Card */}
                  <div className="glass-card !p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 text-teal-400"><UserCircle size={150}/></div>
                    <div className="flex items-center gap-6 relative z-10">
                       <div className="w-20 h-20 rounded-full border-4 border-white/5 shadow-2xl overflow-hidden bg-black/40 flex items-center justify-center">
                          {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <UserCircle size={48} className="text-white/10" />}
                       </div>
                       <div>
                          <h3 className="font-black italic text-2xl tracking-tight leading-tight">{profile?.display_name || "Guest Resident"}</h3>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                             {profile?.email || (profile?.telegram_id ? `TELEGRAM ID: ${profile.telegram_id}` : "NO IDENTITY LINKED")}
                          </p>
                       </div>
                    </div>
                  </div>

                  {/* MERCHANT TOGGLE / ACCESS */}
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 ml-2">Business Management</h4>
                     {profile?.role === 'merchant' ? (
                        <button onClick={() => setViewMode('vendor')} className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-teal-400/20 to-transparent rounded-[28px] border border-teal-400/20 group active:scale-95 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-teal-400/20 rounded-full text-teal-400 shadow-lg"><Store size={22}/></div>
                              <span className="text-sm font-black italic uppercase text-teal-400">{t.manage_store}</span>
                           </div>
                           <ChevronRight size={20} className="text-teal-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                     ) : (
                        <button onClick={() => setViewMode('vendor')} className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[28px] border border-white/10 group active:scale-95 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/5 rounded-full text-white/40"><ShoppingBag size={22}/></div>
                              <span className="text-sm font-black italic uppercase text-white/60">{t.become_merchant}</span>
                           </div>
                           <ChevronRight size={20} className="text-white/20" />
                        </button>
                     )}
                  </div>

                  {/* GMAIL LINKING */}
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 ml-2">Grid Security</h4>
                     {!profile?.email ? (
                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[28px]">
                           <div className="flex items-center gap-3 mb-4">
                              <Chrome size={20} className="text-blue-400"/>
                              <p className="text-[11px] font-black uppercase text-blue-400">{t.link_google}</p>
                           </div>
                           <p className="text-xs text-white/40 mb-6 leading-relaxed">{t.link_cta}</p>
                           <button onClick={handleGmailLink} className="w-full bg-white text-black py-4 rounded-2xl font-black italic uppercase text-xs active:scale-95 transition-all shadow-xl shadow-white/5">
                              CONTINUE WITH GMAIL
                           </button>
                        </div>
                     ) : (
                        <div className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[28px] border border-white/5">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-500/10 rounded-full text-blue-400"><Chrome size={20}/></div>
                              <span className="text-sm font-bold text-white/80">{t.linked}</span>
                           </div>
                           <div className="text-[10px] font-black text-emerald-400 uppercase font-mono tracking-tighter">Verified Access</div>
                        </div>
                     )}
                  </div>

                  {/* FAZAA CARD Hub */}
                  <div className="glass-card border-orange-500/20">
                     <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                           <Zap size={14} fill="currentColor" /> Benefits Hub
                        </h4>
                        {profile?.fazaa_card && <div className="p-1 bg-emerald-500/20 rounded-lg text-[8px] font-black uppercase text-emerald-400 px-2 tracking-widest">Active</div>}
                     </div>
                     <div className="space-y-4">
                        <p className="text-[9px] font-black text-white/30 uppercase ml-1">{t.fazaa_label}</p>
                        <div className="flex gap-2">
                           <input 
                              className="input-modern flex-1 !py-3 !text-sm !rounded-2xl" 
                              placeholder="e.g. 1234567"
                              value={profile?.fazaa_card || fazaaInput}
                              onChange={e => setFazaaInput(e.target.value)}
                              disabled={!!profile?.fazaa_card}
                           />
                           {!profile?.fazaa_card && (
                             <button onClick={handleUpdateFazaa} className="bg-teal-400 text-black px-6 rounded-2xl font-black uppercase text-[10px] active:scale-95 shadow-lg shadow-teal-400/20">
                                {t.fazaa_link}
                             </button>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Logout Button */}
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-6 text-[11px] font-black uppercase tracking-[4px] text-red-500/60 hover:text-red-500 transition-colors">
                     <LogOut size={20} /> {t.logout}
                  </button>

                  <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pt-4">
                     Baqala Protocol v1.3.0-PROD
                  </p>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* --- BOTTOM NAVIGATION (Residents Only) --- */}
      {viewMode === 'customer' && (
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

      {/* BACK BUTTON FOR MERCHANT Hub */}
      {viewMode === 'vendor' && (
        <button 
          onClick={() => setViewMode('customer')}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-2xl z-[100] active:scale-95 transition-all"
        >
          Back to Neighborhood
        </button>
      )}
    </div>
  );
}
