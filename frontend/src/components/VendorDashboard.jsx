import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Edit2, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, AlertTriangle, ChevronRight, 
  TrendingUp, Image as ImageIcon, Check, X, Percent, UserCheck,
  CreditCard, ExternalLink, Camera, LayoutDashboard, UserPlus
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    tab_overview: "Stats",
    tab_inventory: "Stock",
    tab_clients: "Residents",
    tab_settings: "Shop",
    revenue: "Daily Sales",
    total_hisaab: "Credit Given",
    active_residents: "Approved Tabs",
    add_item: "Add New Product",
    item_name: "Item Name",
    price: "Price (AED)",
    approve: "Approve for Hisaab",
    chat: "Open Chat",
    crypto_discount: "Settlement Discount (%)",
    danger_zone: "Termination",
    delete_store: "Dissolve Storefront",
    no_clients: "No applications yet.",
    media_manager: "Digital Identity",
    add_photo_url: "Photo Link (URL)",
    store_name: "Baqala Name",
    wallet: "TON Payout Address",
    save_changes: "Save Settings",
    hisaab_limit: "Credit Limit (AED)",
    pending_label: "Requested Access",
    approved_label: "Trusted Resident"
  },
  ar: {
    tab_overview: "الرئيسية",
    tab_inventory: "البضاعة",
    tab_clients: "أهل الفريج",
    tab_settings: "الدكان",
    revenue: "مبيعات اليوم",
    total_hisaab: "ديون الحساب",
    active_residents: "الحسابات المفعلة",
    add_item: "إضافة منتج",
    item_name: "اسم الغرض",
    price: "السعر (درهم)",
    approve: "تفعيل الحساب",
    chat: "محادثة",
    crypto_discount: "خصم التسوية (%)",
    danger_zone: "إغلاق الدكان",
    delete_store: "مسح جميع البيانات",
    no_clients: "لا يوجد طلبات حالياً.",
    media_manager: "هوية الدكان",
    add_photo_url: "رابط الصورة",
    store_name: "اسم الدكان",
    wallet: "محفظة TON للاستلام",
    save_changes: "حفظ الإعدادات",
    hisaab_limit: "حد الحساب (درهم)",
    pending_label: "طلب اشتراك",
    approved_label: "زبون موثوق"
  }
};

export default function VendorDashboard({ user, onDelete, lang }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]); // Applications from Supabase
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Registration & Settings State
  const [regForm, setRegForm] = useState({ name: '', wallet: '' });
  const [settings, setSettings] = useState({ name: '', wallet: '', discount: 10, images: [] });
  const [newImgUrl, setNewImgUrl] = useState('');
  
  // Item Form
  const [itemForm, setItemForm] = useState({ name: '', price: '' });

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const merchantId = user?.id?.toString() || 'merchant_alpha';

  useEffect(() => {
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${merchantId}`);
      if (res.data?.baqala) {
        const b = res.data.baqala;
        setMyBaqala(b);
        setInventory(b.inventory || []);
        setSettings({
          name: b.name,
          wallet: b.wallet_address,
          discount: b.crypto_discount || 10,
          images: b.images || []
        });
        setClients(res.data.clients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const haptic = (style = 'medium') => {
    try { WebApp?.HapticFeedback?.impactOccurred(style); } catch (e) {}
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    haptic('heavy');
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/baqala/register`, {
        name: regForm.name,
        owner_id: merchantId,
        wallet_address: regForm.wallet
      });
      if (res.data.success) {
        setMyBaqala(res.data.baqala);
        WebApp?.showAlert("Store Online!");
      }
    } catch (e) { alert("Error launching."); }
    finally { setIsLoading(false); }
  };

  const handleUpdateSettings = async () => {
    setIsSaving(true);
    try {
      await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/settings`, {
        crypto_discount: settings.discount,
        images: settings.images,
        wallet_address: settings.wallet
      });
      haptic('success');
      WebApp?.showAlert("Settings Synchronized.");
    } catch (e) { alert("Save failed."); }
    finally { setIsSaving(false); }
  };

  const handleApprove = async (appId) => {
    haptic('medium');
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { application_id: appId, status: 'approved' });
      setClients(clients.map(c => c.id === appId ? { ...c, status: 'approved' } : c));
    } catch (e) { alert("Approval failed."); }
  };

  const openClientChat = (tgId) => {
    const url = `tg://user?id=${tgId}`;
    if (WebApp?.openTelegramLink) WebApp.openTelegramLink(url);
    else window.location.href = url;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 opacity-40">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Loading Merchant Ledger...</p>
    </div>
  );

  // --- RENDER REGISTRATION IF NEW MERCHANT ---
  if (!myBaqala) return (
    <div className="px-6 pt-10">
       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card !p-10 text-center">
          <div className="w-20 h-20 bg-teal-400/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl">
             <Store size={40} className="text-teal-400" />
          </div>
          <h2 className="text-3xl font-black italic mb-4">{isRTL ? "افتح دكانك الرقمي" : "Go Digital"}</h2>
          <p className="text-xs text-[#94a3b8] mb-10 leading-relaxed font-medium">Join the network to offer Hisaab and accept TON payments from neighbors.</p>
          
          <form onSubmit={handleRegister} className="space-y-4">
             <input className="input-modern" placeholder={t.store_name} value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required />
             <input className="input-modern" placeholder={t.wallet} value={regForm.wallet} onChange={e => setRegForm({...regForm, wallet: e.target.value})} required />
             <button type="submit" className="btn-primary w-full italic uppercase !py-5">Launch Storefront</button>
          </form>
       </motion.div>
    </div>
  );

  return (
    <div className="px-5 pt-4">
      {/* MERCHANT SUB-NAV */}
      <div className="flex bg-white/5 backdrop-blur-md rounded-2xl p-1 mb-8 border border-white/5">
        {['overview', 'inventory', 'clients', 'settings'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveSubTab(tab); haptic('light'); }}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeSubTab === tab ? 'bg-white text-black shadow-2xl' : 'text-white/40'
            }`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: OVERVIEW */}
        {activeSubTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="ov" className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
               <div className="glass-card !p-6">
                  <TrendingUp size={16} className="text-teal-400 mb-3" />
                  <p className="text-[10px] font-black opacity-30 uppercase">{t.revenue}</p>
                  <p className="text-2xl font-black">AED 0.00</p>
               </div>
               <div className="glass-card !p-6 border-orange-500/20">
                  <CreditCard size={16} className="text-orange-500 mb-3" />
                  <p className="text-[10px] font-black opacity-30 uppercase">{t.total_hisaab}</p>
                  <p className="text-2xl font-black text-orange-500">
                    AED {clients.filter(c=>c.status==='approved').reduce((s,c)=>s+20, 0).toFixed(2)}
                  </p>
               </div>
            </div>

            <div className="glass-card !p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest">{t.active_residents}</h3>
                  <Users size={16} className="opacity-20" />
               </div>
               <div className="flex -space-x-3 overflow-hidden">
                  {clients.filter(c=>c.status==='approved').map((c, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0a0f] bg-teal-400 flex items-center justify-center text-black font-black text-xs uppercase">
                       {c.users?.name?.[0] || 'U'}
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: INVENTORY */}
        {activeSubTab === 'inventory' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="inv" className="space-y-6">
            <div className="glass-card !p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2">
                 <UserPlus size={14} className="text-teal-400" /> {t.add_item}
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); haptic('medium'); /* API Add */ }} className="space-y-4">
                 <input className="input-modern" placeholder={t.item_name} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} required />
                 <div className="flex gap-2">
                    <input className="input-modern flex-1" type="number" placeholder={t.price} value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} required />
                    <button className="bg-teal-400 text-black px-8 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-teal-400/20 active:scale-95 transition-all">List</button>
                 </div>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-10">
               {inventory.map(item => (
                 <div key={item.id} className="glass-card !p-4 relative group">
                    <div className="w-full aspect-square bg-white/5 rounded-xl mb-4 flex items-center justify-center text-2xl">📦</div>
                    <h5 className="font-black text-xs leading-tight mb-2 truncate">{item.name}</h5>
                    <p className="text-teal-400 font-black text-sm">AED {item.price}</p>
                    <button className="absolute top-2 right-2 p-2 bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {/* TAB 3: CLIENTS (CRM) */}
        {activeSubTab === 'clients' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="cli" className="space-y-4 pb-10">
             {clients.length === 0 ? (
               <div className="p-20 text-center opacity-20 italic text-xs">{t.no_clients}</div>
             ) : (
               clients.map(client => (
                 <div key={client.id} className={`glass-card !p-6 border-white/5 ${client.status === 'pending' ? 'border-orange-500/20' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center font-black uppercase shadow-inner">
                             {client.users?.name?.[0] || 'U'}
                          </div>
                          <div>
                             <p className="font-black text-lg truncate max-w-[120px]">{client.users?.name || "Neighbor"}</p>
                             <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter italic">ID: {client.telegram_id}</p>
                          </div>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${client.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {client.status === 'approved' ? t.approved_label : t.pending_label}
                       </span>
                    </div>

                    <div className="flex gap-2">
                       {client.status === 'pending' && (
                         <button onClick={() => handleApprove(client.id)} className="flex-1 bg-teal-400 text-black py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <UserCheck size={14} /> {t.approve}
                         </button>
                       )}
                       <button onClick={() => openClientChat(client.telegram_id)} className="flex-1 bg-white/5 border border-white/10 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                          <MessageCircle size={14} className="text-blue-400" /> {t.chat}
                       </button>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeSubTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="set" className="space-y-6 pb-20">
             {/* MEDIA MANAGER */}
             <div className="glass-card !p-6">
                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                   <ImageIcon size={14} className="text-teal-400" /> {t.media_manager}
                </h3>
                
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                   {settings.images.length === 0 && (
                     <div className="w-full p-8 border border-dashed border-white/10 rounded-2xl text-center opacity-30 text-[10px] uppercase font-bold">{t.placeholder_store}</div>
                   )}
                   {settings.images.map((url, i) => (
                     <div key={i} className="relative min-w-[140px] h-24 rounded-2xl overflow-hidden shadow-xl border border-white/5">
                        <img src={url} className="w-full h-full object-cover" />
                        <button onClick={() => setSettings({...settings, images: settings.images.filter((_, idx)=>idx!==i)})} className="absolute top-2 right-2 bg-red-500 rounded-full p-1"><X size={10}/></button>
                     </div>
                   ))}
                </div>

                <div className="flex gap-2 mt-4">
                   <input className="input-modern !py-2 !text-xs flex-1" placeholder={t.add_photo_url} value={newImgUrl} onChange={e=>setNewImgUrl(e.target.value)} />
                   <button onClick={()=>{ if(newImgUrl) { setSettings({...settings, images: [...settings.images, newImgUrl]}); setNewImgUrl(''); haptic(); }}} className="bg-white/10 px-5 rounded-xl font-black">+</button>
                </div>
             </div>

             {/* DISCOUNTS */}
             <div className="glass-card !p-6">
                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Percent size={14} className="text-teal-400" /> {t.crypto_discount}
                </h3>
                <input type="range" min="0" max="50" step="5" className="w-full accent-teal-400" value={settings.discount} onChange={e=>setSettings({...settings, discount: e.target.value})} />
                <div className="flex justify-between mt-2 font-black text-teal-400 text-lg italic"><span>{settings.discount}%</span><span>MAX SAVINGS</span></div>
             </div>

             <button onClick={handleUpdateSettings} disabled={isSaving} className="btn-primary w-full !py-5 uppercase italic text-xs tracking-[3px]">
                {isSaving ? <RefreshCw className="animate-spin mx-auto" size={20}/> : t.save_changes}
             </button>

             {/* DANGER ZONE */}
             <div className="glass-card !border-red-500/30 !bg-red-500/5 mt-10">
                <h3 className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                   <AlertTriangle size={14} /> {t.danger_zone}
                </h3>
                <button onClick={() => onDelete(myBaqala.id)} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[2px] shadow-2xl">
                   {t.delete_store}
                </button>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
