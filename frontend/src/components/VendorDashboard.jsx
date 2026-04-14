import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, AlertTriangle, ChevronRight, 
  TrendingUp, Image as ImageIcon, Check, X, Percent, UserCheck,
  Camera, LayoutDashboard, UserPlus, CreditCard, ExternalLink
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    tab_overview: "Stats",
    tab_inventory: "Shelves",
    tab_clients: "Residents",
    tab_settings: "Shop Settings",
    revenue: "Daily Sales",
    total_hisaab: "Total Debt",
    active_residents: "Trusted Neighbors",
    add_item: "List Product",
    item_name: "Item Name",
    price: "Price (AED)",
    approve: "Approve for Hisaab",
    chat: "Chat Resident",
    crypto_discount: "Crypto Settle Discount (%)",
    danger_zone: "Termination",
    delete_store: "Dissolve Storefront",
    no_clients: "No applications found.",
    media_manager: "Store Visuals",
    add_photo_url: "Paste Photo URL",
    store_name: "Baqala Name",
    wallet: "TON Payout Wallet",
    save_changes: "Synchronize Identity",
    hisaab_limit: "Credit Limit (AED)",
    pending_label: "Reviewing",
    approved_label: "Active Tab"
  },
  ar: {
    tab_overview: "الإحصائيات",
    tab_inventory: "الأرفف",
    tab_clients: "أهل الفريج",
    tab_settings: "إعدادات الدكان",
    revenue: "دخل اليوم",
    total_hisaab: "ديون الحساب",
    active_residents: "الجيران الموثوقين",
    add_item: "إضافة منتج",
    item_name: "اسم الغرض",
    price: "السعر (درهم)",
    approve: "تفعيل الحساب",
    chat: "محادثة",
    crypto_discount: "خصم تسوية الكريبتو (%)",
    danger_zone: "إغلاق الدكان",
    delete_store: "مسح السجلات نهائياً",
    no_clients: "لا يوجد طلبات حساب.",
    media_manager: "هوية الدكان البصرية",
    add_photo_url: "رابط الصورة",
    store_name: "اسم الدكان",
    wallet: "محفظة TON للاستلام",
    save_changes: "تحديث هوية الدكان",
    hisaab_limit: "حد الحساب (درهم)",
    pending_label: "قيد المراجعة",
    approved_label: "حساب نشط"
  }
};

export default function VendorDashboard({ user, onDelete, lang }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]); 
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settings Logic
  const [settings, setSettings] = useState({ name: '', wallet: '', discount: 10, images: [] });
  const [newImgUrl, setNewImgUrl] = useState('');
  
  // Forms
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'snacks' });

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const merchantId = user?.id?.toString() || 'merchant_alpha';

  useEffect(() => {
    fetchMerchantData();
  }, [merchantId]);

  const fetchMerchantData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/baqala/owner/${merchantId}`);
      if (res.data?.baqala) {
        const b = res.data.baqala;
        setMyBaqala(b);
        setInventory(b.inventory || []);
        setSettings({
          name: b.name,
          wallet: b.wallet_address || '',
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
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred(style);
  };

  const handleUpdateIdentity = async () => {
    setIsSaving(true);
    haptic('medium');
    try {
      await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/settings`, {
        name: settings.name,
        crypto_discount: settings.discount,
        images: settings.images,
        wallet_address: settings.wallet
      });
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert("Storefront Synced!");
    } catch (e) { alert("Sync Error"); }
    finally { setIsSaving(false); }
  };

  const handleApprove = async (appId) => {
    haptic('success');
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { application_id: appId, status: 'approved' });
      setClients(clients.map(c => c.id === appId ? { ...c, status: 'approved' } : c));
    } catch (e) { alert("Approval error."); }
  };

  const addItem = async (e) => {
    e.preventDefault();
    haptic('medium');
    try {
      const res = await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/item`, {
        name: itemForm.name,
        price: parseFloat(itemForm.price),
        category: itemForm.category
      });
      if (res.data.success) {
        setInventory([res.data.inventory, ...inventory]);
        setItemForm({ name: '', price: '', category: 'snacks' });
      }
    } catch (e) { alert("Add failed."); }
  };

  const deleteItem = async (id) => {
    haptic('heavy');
    setInventory(inventory.filter(i => i.id !== id));
    // Implementation for DELETE /api/baqala/item/:id
  };

  const openClientChat = (tgId) => {
    const url = `tg://user?id=${tgId}`;
    if (WebApp?.openTelegramLink) WebApp.openTelegramLink(url);
    else window.location.href = url;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px] opacity-40">Syncing Merchant Ledger...</p>
    </div>
  );

  if (!myBaqala) return (
    <div className="p-8 text-center mt-20">
      <Store size={64} className="mx-auto mb-6 text-teal-400 opacity-10" />
      <h2 className="text-2xl font-black mb-4 italic uppercase">{isRTL ? "دكان غير مسجل" : "No Registered Store"}</h2>
      <p className="text-xs text-[#94a3b8] mb-10 leading-relaxed">Switch to Resident mode to explore the network, or register a new Baqala from the Home screen.</p>
    </div>
  );

  return (
    <div className={`px-5 pt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* 1. MERCHANT STATS SUMMARY */}
      <div className="glass-card !p-6 mb-8 bg-gradient-to-br from-teal-400/[0.03] to-transparent border-white/5">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
             <Store size={28} color="black" />
           </div>
           <div>
             <h2 className="text-2xl font-black italic">{myBaqala.name}</h2>
             <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mt-1">Verified Merchant Portal</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <TrendingUp size={14} className="text-teal-400 mb-2" />
              <p className="text-[9px] font-black opacity-30 uppercase">{t.revenue}</p>
              <p className="text-xl font-black tracking-tighter">AED 0.00</p>
           </div>
           <div className="bg-white/5 p-4 rounded-2xl border border-orange-500/10">
              <CreditCard size={14} className="text-orange-500 mb-2" />
              <p className="text-[9px] font-black opacity-30 uppercase">{t.total_hisaab}</p>
              <p className="text-xl font-black tracking-tighter text-orange-500">
                AED {clients.filter(c=>c.status==='approved').reduce((s,c)=>s+10.50, 0).toFixed(2)}
              </p>
           </div>
        </div>
      </div>

      {/* 2. SUB-TAB NAVIGATION */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 mb-8 border border-white/5">
        {['overview', 'inventory', 'clients', 'settings'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveSubTab(tab); haptic('light'); }}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeSubTab === tab ? 'bg-white text-black shadow-2xl scale-[1.02]' : 'text-white/30'
            }`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW: OVERVIEW */}
        {activeSubTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="ov" className="space-y-6">
             <div className="glass-card">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xs font-black uppercase tracking-widest">{t.active_residents}</h3>
                   <Users size={16} className="opacity-20" />
                </div>
                <div className="flex -space-x-3 overflow-hidden">
                   {clients.length === 0 ? (
                     <p className="text-[10px] opacity-20 italic">No trusted neighbors yet.</p>
                   ) : (
                     clients.filter(c=>c.status==='approved').map((c, i) => (
                       <div key={i} className="w-12 h-12 rounded-full border-4 border-[#0a0a0f] bg-gradient-to-tr from-white/10 to-white/20 flex items-center justify-center font-black text-xs uppercase shadow-xl">
                          {c.users?.name?.[0] || 'U'}
                       </div>
                     ))
                   )}
                </div>
             </div>
          </motion.div>
        )}

        {/* VIEW: CATALOG/INVENTORY */}
        {activeSubTab === 'inventory' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="inv" className="space-y-6">
             <div className="glass-card">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2">
                   <Plus size={14} className="text-teal-400" /> {t.add_item}
                </h3>
                <form onSubmit={addItem} className="space-y-4">
                   <input className="input-modern" placeholder={t.item_name} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} required />
                   <div className="flex gap-2">
                      <input className="input-modern flex-1" type="number" step="0.01" placeholder={t.price} value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} required />
                      <button type="submit" className="bg-teal-400 text-black px-8 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-teal-400/20 active:scale-95 transition-all">List</button>
                   </div>
                </form>
             </div>

             <div className="grid grid-cols-2 gap-4 pb-20">
                {inventory.map(item => (
                  <div key={item.id} className="glass-card !p-4 relative group hover:border-white/20 transition-all">
                     <div className="w-full aspect-square bg-black/40 rounded-xl mb-4 flex items-center justify-center text-3xl">🛒</div>
                     <h5 className="font-black text-xs leading-tight mb-2 truncate px-1">{item.name}</h5>
                     <p className="text-teal-400 font-black text-sm italic px-1">AED {item.price.toFixed(2)}</p>
                     <button onClick={()=>deleteItem(item.id)} className="absolute top-2 right-2 p-2 bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* VIEW: CRM / CLIENTS */}
        {activeSubTab === 'clients' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="cli" className="space-y-4 pb-20">
             {clients.length === 0 ? (
               <div className="p-20 text-center opacity-20 italic text-xs">{t.no_clients}</div>
             ) : (
               clients.map(client => (
                 <div key={client.id} className={`glass-card !p-6 border-white/5 ${client.status === 'pending' ? 'border-orange-500/30 bg-orange-500/[0.02]' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/5 rounded-[18px] flex items-center justify-center font-black uppercase shadow-inner border border-white/5">
                             {client.users?.name?.[0] || 'U'}
                          </div>
                          <div>
                             <p className="font-black text-lg italic">{client.users?.name || "Neighbor"}</p>
                             <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">Telegram ID: {client.telegram_id}</p>
                          </div>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${client.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                          {client.status === 'approved' ? t.approved_label : t.pending_label}
                       </span>
                    </div>

                    <div className="flex gap-2">
                       {client.status === 'pending' && (
                         <button onClick={() => handleApprove(client.id)} className="flex-1 bg-teal-400 text-black py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <UserCheck size={14} /> {t.approve}
                         </button>
                       )}
                       <button onClick={() => openClientChat(client.telegram_id)} className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                          <MessageCircle size={14} className="text-blue-400" /> {t.chat}
                       </button>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}

        {/* VIEW: SETTINGS & MEDIA */}
        {activeSubTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="set" className="space-y-6 pb-20">
             {/* 1. MEDIA MANAGER */}
             <div className="glass-card">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2">
                   <Camera size={14} className="text-teal-400" /> {t.media_manager}
                </h3>
                
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                   {settings.images.length === 0 && (
                     <div className="w-full p-8 border-2 border-dashed border-white/5 rounded-[24px] text-center opacity-20 text-[10px] uppercase font-bold italic">{t.placeholder_store}</div>
                   )}
                   {settings.images.map((url, i) => (
                     <div key={i} className="relative min-w-[160px] h-28 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                        <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <button onClick={() => setSettings({...settings, images: settings.images.filter((_, idx)=>idx!==i)})} className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5 shadow-xl"><X size={12}/></button>
                     </div>
                   ))}
                </div>

                <div className="flex gap-2 mt-4">
                   <input className="input-modern !py-3 !text-xs flex-1" placeholder={t.add_photo_url} value={newImgUrl} onChange={e=>setNewImgUrl(e.target.value)} />
                   <button onClick={()=>{ if(newImgUrl) { setSettings({...settings, images: [...settings.images, newImgUrl]}); setNewImgUrl(''); haptic(); }}} className="bg-white/10 px-5 rounded-2xl font-black text-teal-400">+</button>
                </div>
             </div>

             {/* 2. CORE IDENTITY */}
             <div className="glass-card space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-2 flex items-center gap-2">
                   <Settings size={14} className="text-teal-400" /> Shop Profile
                </h3>
                <input className="input-modern" placeholder={t.store_name} value={settings.name} onChange={e=>setSettings({...settings, name: e.target.value})} />
                <input className="input-modern" placeholder={t.wallet} value={settings.wallet} onChange={e=>setSettings({...settings, wallet: e.target.value})} />
                
                <div className="pt-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-4 flex items-center gap-2"><Percent size={12} className="text-teal-400"/> {t.crypto_discount}</p>
                   <div className="flex items-center gap-6 bg-black/20 p-4 rounded-2xl">
                      <input type="range" min="0" max="50" step="5" className="flex-1 accent-teal-400" value={settings.discount} onChange={e => setSettings({...settings, discount: e.target.value})} />
                      <span className="font-black text-teal-400 text-xl">{settings.discount}%</span>
                   </div>
                </div>
             </div>

             <button onClick={handleUpdateIdentity} disabled={isSaving} className="btn-primary w-full !py-6 uppercase italic text-xs tracking-[4px] !rounded-[24px]">
                {isSaving ? <RefreshCw className="animate-spin mx-auto" size={24}/> : t.save_changes}
             </button>

             {/* 3. DANGER ZONE */}
             <div className="glass-card !border-red-500/30 !bg-red-500/[0.02] mt-10">
                <h3 className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                   <AlertTriangle size={14} /> {t.danger_zone}
                </h3>
                <button onClick={() => onDelete(myBaqala.id)} className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[3px] transition-all active:scale-95 shadow-2xl">
                   {t.delete_store}
                </button>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
