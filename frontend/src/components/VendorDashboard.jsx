import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Trash2, RefreshCw, Package, 
  Users, Settings, MessageCircle, AlertTriangle, ChevronRight, 
  TrendingUp, Image as ImageIcon, Check, X, Percent, UserCheck,
  Camera, LayoutDashboard, UserPlus, CreditCard, ExternalLink, Save
} from 'lucide-react';
import axios from 'axios';

const WebApp = window.Telegram?.WebApp;
const API_URL = "https://baqala-i2oi.onrender.com";

// --- KHALEEJI ARABIC LOCALIZATION ---
const loc = {
  en: {
    tab_stats: "Stats",
    tab_catalog: "Shelves",
    tab_residents: "Residents",
    tab_shop: "Edit Shop",
    daily_sales: "Daily Sales",
    neighborhood_debt: "Neighborhood Debt",
    trusted_neighbors: "Approved Tabs",
    add_product: "List New Item",
    item_placeholder: "e.g. Al Ain Water 1.5L",
    price_label: "Price (AED)",
    approve_btn: "Approve Hisaab",
    chat_btn: "Open Chat",
    discount_label: "Crypto Payout Discount (%)",
    danger_zone: "Close Storefront",
    delete_confirm: "Permanently Wipe Data",
    no_residents: "No neighborhood requests yet.",
    visual_identity: "Digital Storefront Photos",
    url_placeholder: "Paste image URL here...",
    shop_name: "Baqala Display Name",
    payout_wallet: "TON Payout Address",
    sync_btn: "Sync Shop Profile",
    pending: "Access Request",
    approved: "Trusted Resident"
  },
  ar: {
    tab_stats: "الإحصائيات",
    tab_catalog: "الأرفف",
    tab_residents: "الجيران",
    tab_shop: "تعديل الدكان",
    daily_sales: "دخل اليوم",
    neighborhood_debt: "ديون الفريج",
    trusted_neighbors: "الحسابات المفعلة",
    add_product: "إضافة منتج",
    item_placeholder: "مثلاً: ماي العين ١.٥ لتر",
    price_label: "السعر (درهم)",
    approve_btn: "تفعيل الحساب",
    chat_btn: "محادثة",
    discount_label: "خصم تسوية الكريبتو (%)",
    danger_zone: "إغلاق الدكان",
    delete_confirm: "مسح جميع السجلات",
    no_residents: "لا يوجد طلبات حالياً.",
    visual_identity: "صور واجهة الدكان",
    url_placeholder: "ضع رابط الصورة هنا...",
    shop_name: "اسم الدكان",
    payout_wallet: "محفظة TON للاستلام",
    sync_btn: "تحديث هوية الدكان",
    pending: "طلب اشتراك",
    approved: "جار موثوق"
  }
};

export default function VendorDashboard({ user, lang }) {
  const [myBaqala, setMyBaqala] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [residents, setResidents] = useState([]); 
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Shop Settings State
  const [settings, setSettings] = useState({ name: '', wallet: '', discount: 10, images: [] });
  const [tempImageUrl, setTempImageUrl] = useState('');
  
  // Item Form State
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'snacks' });

  const t = useMemo(() => loc[lang], [lang]);
  const isRTL = lang === 'ar';
  const merchantId = user?.id?.toString() || 'merchant_live';

  useEffect(() => {
    fetchMerchantHub();
  }, [merchantId]);

  const fetchMerchantHub = async () => {
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
        setResidents(res.data.clients || []);
      }
    } catch (e) {
      console.error("Merchant Hub Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncIdentity = async () => {
    setIsSyncing(true);
    try {
      await axios.post(`${API_URL}/api/baqala/${myBaqala.id}/settings`, {
        name: settings.name,
        crypto_discount: settings.discount,
        images: settings.images,
        wallet_address: settings.wallet
      });
      if (WebApp?.isVersionAtLeast('6.2')) WebApp.showAlert("Neighborhood Identity Synced!");
    } catch (e) { alert("Sync Failed"); }
    finally { setIsSyncing(false); }
  };

  const handleApproveResident = async (appId) => {
    try {
      await axios.post(`${API_URL}/api/hisaab/approve`, { application_id: appId, status: 'approved' });
      setResidents(residents.map(r => r.id === appId ? { ...r, status: 'approved' } : r));
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) { alert("Approval Error"); }
  };

  const addItem = async (e) => {
    e.preventDefault();
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
    } catch (e) { alert("Add Failed"); }
  };

  const openResidentChat = (tgId) => {
    const url = `tg://user?id=${tgId}`;
    if (WebApp?.openTelegramLink) WebApp.openTelegramLink(url);
    else window.location.href = url;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-80 opacity-30">
      <RefreshCw className="animate-spin text-teal-400 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[3px]">Loading Merchant Ledger...</p>
    </div>
  );

  if (!myBaqala) return (
    <div className="px-8 pt-20 text-center">
      <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl">
        <Store size={48} className="text-teal-400 opacity-20" />
      </div>
      <h2 className="text-2xl font-black italic uppercase mb-4">{isRTL ? "دكان غير مسجل" : "No Registered Store"}</h2>
      <p className="text-xs text-[#94a3b8] mb-10 leading-relaxed font-medium">Your account is not yet linked to a physical Baqala. Please register your store on the Neighborhood screen.</p>
    </div>
  );

  return (
    <div className="px-5 pt-4">
      {/* MERCHANT SUB-NAVIGATION */}
      <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 mb-8 border border-white/5 overflow-x-auto scrollbar-hide">
        {['stats', 'catalog', 'residents', 'shop'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light'); }}
            className={`flex-1 py-3 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-black shadow-2xl scale-[1.02]' : 'text-white/30'
            }`}
          >
            {t[`tab_${tab}`]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW: STATS */}
        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="stats" className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
               <div className="glass-card !p-6">
                  <TrendingUp size={16} className="text-teal-400 mb-3" />
                  <p className="text-[10px] font-black opacity-30 uppercase">{t.daily_sales}</p>
                  <p className="text-2xl font-black tracking-tighter italic">AED 0.00</p>
               </div>
               <div className="glass-card !p-6 border-orange-500/20">
                  <CreditCard size={16} className="text-orange-500 mb-3" />
                  <p className="text-[10px] font-black opacity-30 uppercase">{t.neighborhood_debt}</p>
                  <p className="text-2xl font-black tracking-tighter text-orange-500">
                    AED {residents.filter(r=>r.status==='approved').reduce((s,r)=>s+45.50, 0).toFixed(2)}
                  </p>
               </div>
            </div>

            <div className="glass-card !p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[3px]">{t.trusted_neighbors}</h3>
                  <Users size={16} className="opacity-20" />
               </div>
               <div className="flex -space-x-3 overflow-hidden">
                  {residents.length === 0 ? (
                    <p className="text-[10px] opacity-20 italic">No trusted neighbors found.</p>
                  ) : (
                    residents.filter(r=>r.status==='approved').map((r, i) => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-[#0a0a0f] bg-gradient-to-tr from-white/10 to-white/20 flex items-center justify-center font-black text-xs shadow-xl">
                         {r.users?.name?.[0] || 'U'}
                      </div>
                    ))
                  )}
               </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: CATALOG */}
        {activeTab === 'catalog' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="catalog" className="space-y-6">
             <div className="glass-card">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2">
                   <Plus size={14} className="text-teal-400" /> {t.add_product}
                </h3>
                <form onSubmit={addItem} className="space-y-4">
                   <input className="input-modern" placeholder={t.item_placeholder} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} required />
                   <div className="flex gap-2">
                      <input className="input-modern flex-1" type="number" step="0.01" placeholder={t.price_label} value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} required />
                      <button type="submit" className="bg-teal-400 text-black px-8 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-teal-400/20 active:scale-95 transition-all">List</button>
                   </div>
                </form>
             </div>

             <div className="grid grid-cols-2 gap-4 pb-20">
                {inventory.map(item => (
                  <div key={item.id} className="glass-card !p-4 relative group hover:border-white/20 transition-all">
                     <div className="w-full aspect-square bg-black/40 rounded-xl mb-4 flex items-center justify-center text-3xl">🛍️</div>
                     <h5 className="font-black text-[11px] leading-tight mb-2 truncate px-1 italic">{item.name}</h5>
                     <p className="text-teal-400 font-black text-sm px-1 tracking-tighter">AED {item.price.toFixed(2)}</p>
                     <button onClick={()=>deleteItem(item.id)} className="absolute top-2 right-2 p-2 bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* VIEW: RESIDENTS (CRM) */}
        {activeTab === 'residents' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="residents" className="space-y-4 pb-20">
             {residents.length === 0 ? (
               <div className="p-20 text-center opacity-20 italic text-xs font-bold uppercase tracking-widest">{t.no_residents}</div>
             ) : (
               residents.map(r => (
                 <div key={r.id} className={`glass-card !p-6 border-white/5 ${r.status === 'pending' ? 'border-orange-500/30 bg-orange-500/[0.02]' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/5 rounded-[18px] flex items-center justify-center font-black uppercase shadow-inner border border-white/5 text-teal-400">
                             {r.users?.name?.[0] || 'U'}
                          </div>
                          <div>
                             <p className="font-black text-lg italic">{r.users?.name || "Resident"}</p>
                             <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter mt-0.5">ID: {r.telegram_id}</p>
                          </div>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                          {r.status === 'approved' ? t.approved : t.pending}
                       </span>
                    </div>

                    <div className="flex gap-2">
                       {r.status === 'pending' && (
                         <button onClick={() => handleApproveResident(r.id)} className="flex-1 bg-teal-400 text-black py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <UserCheck size={14} /> {t.approve_btn}
                         </button>
                       )}
                       <button onClick={() => openResidentChat(r.telegram_id)} className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all group">
                          <MessageCircle size={14} className="text-blue-400 group-hover:scale-110 transition-transform" /> {t.chat_btn}
                       </button>
                    </div>
                 </div>
               ))
             )}
          </motion.div>
        )}

        {/* VIEW: SHOP SETTINGS & PHOTO CAROUSEL */}
        {activeTab === 'shop' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="shop" className="space-y-6 pb-24">
             {/* 1. MEDIA MANAGER (THE CAROUSEL) */}
             <div className="glass-card">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2">
                   <Camera size={14} className="text-teal-400" /> {t.visual_identity}
                </h3>
                
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                   {settings.images.length === 0 ? (
                     <div className="w-full p-10 border-2 border-dashed border-white/5 rounded-[32px] text-center opacity-20 text-[9px] uppercase font-bold italic leading-relaxed">No photos uploaded. Customers will see your digital logo fallback.</div>
                   ) : (
                     settings.images.map((url, i) => (
                       <div key={i} className="relative min-w-[200px] h-32 rounded-[24px] overflow-hidden shadow-2xl border border-white/10 group">
                          <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <button onClick={() => setSettings({...settings, images: settings.images.filter((_, idx)=>idx!==i)})} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 shadow-xl"><X size={14}/></button>
                       </div>
                     ))
                   )}
                </div>

                <div className="flex gap-2">
                   <input className="input-modern !py-3 !text-xs flex-1" placeholder={t.url_placeholder} value={tempImageUrl} onChange={e=>setTempImageUrl(e.target.value)} />
                   <button onClick={()=>{ if(tempImageUrl) { setSettings({...settings, images: [...settings.images, tempImageUrl]}); setTempImageUrl(''); if(WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light'); }}} className="bg-white/10 px-6 rounded-2xl font-black text-teal-400 hover:bg-white/20 transition-all">+</button>
                </div>
             </div>

             {/* 2. SHOP PROFILE DATA */}
             <div className="glass-card space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-[3px] mb-2 flex items-center gap-2">
                   <Settings size={14} className="text-teal-400" /> Merchant Identity
                </h3>
                <div>
                   <p className="text-[9px] font-black uppercase text-white/30 mb-2 px-1">{t.shop_name}</p>
                   <input className="input-modern" placeholder="Baqala Name" value={settings.name} onChange={e=>setSettings({...settings, name: e.target.value})} />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-white/30 mb-2 px-1">{t.payout_wallet}</p>
                   <input className="input-modern" placeholder="TON Address (EQ...)" value={settings.wallet} onChange={e=>setSettings({...settings, wallet: e.target.value})} />
                </div>
                
                <div className="pt-4">
                   <div className="flex justify-between items-center mb-4 px-1">
                      <p className="text-[9px] font-black uppercase text-white/30 flex items-center gap-2"><Percent size={12} className="text-teal-400"/> {t.discount_label}</p>
                      <span className="font-black text-teal-400 text-sm italic">{settings.discount}% OFF</span>
                   </div>
                   <div className="bg-black/20 p-5 rounded-[24px] border border-white/5 shadow-inner">
                      <input type="range" min="0" max="50" step="5" className="w-full accent-teal-400" value={settings.discount} onChange={e => setSettings({...settings, discount: e.target.value})} />
                   </div>
                </div>
             </div>

             <button onClick={handleSyncIdentity} disabled={isSyncing} className="btn-primary w-full !py-6 uppercase italic text-[11px] tracking-[4px] !rounded-[24px]">
                {isSyncing ? <RefreshCw className="animate-spin mx-auto" size={24}/> : <div className="flex items-center gap-2 justify-center"><Save size={18}/> {t.sync_btn}</div>}
             </button>

             {/* 3. DANGER ZONE */}
             <div className="glass-card !border-red-500/20 !bg-red-500/[0.01] mt-10">
                <h3 className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                   <AlertTriangle size={14} /> {t.danger_zone}
                </h3>
                <button onClick={() => alert("Deletion Logic coming in backend overhaul")} className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[3px] transition-all active:scale-95 shadow-2xl">
                   {t.delete_confirm}
                </button>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
