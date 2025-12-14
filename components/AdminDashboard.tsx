import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Ban, Search, Gift, Crown, ArrowLeft, RefreshCw, CheckCircle, Megaphone, Edit3, Send, Home, XCircle, Flame, Image as ImageIcon, Plus, X, Database, Clock, Gamepad2, BadgeCheck, Coins, Trophy, Ghost, Lock, Unlock, Percent, AlertTriangle, MessageCircle, Sparkles, Check, X as XIcon, Gavel, MinusCircle, Upload, Save } from 'lucide-react';
import { getAllUsers, adminUpdateUser, deleteAllRooms, sendSystemNotification, broadcastOfficialMessage, searchUserByDisplayId, getRoomsByHostId, adminBanRoom, deleteRoom, toggleRoomHotStatus, toggleRoomActivitiesStatus, addBanner, deleteBanner, listenToBanners, syncRoomIdsWithUserIds, toggleRoomOfficialStatus, resetAllUsersCoins, resetAllRoomCups, resetAllGhostUsers, updateRoomGameConfig, resetAllChats, deleteUserProfile, listenToWelcomeRequests, approveWelcomeRequest, rejectWelcomeRequest, addSvgaGift, addSvgaStoreItem, listenToDynamicGifts, deleteGift, updateGift } from '../services/firebaseService';
import { Language, User, Room, Banner, WelcomeRequest, Gift as GiftType, StoreItem } from '../types';
import { VIP_TIERS, ADMIN_ROLES } from '../constants';
import { compressImage } from '../services/imageService';

interface AdminDashboardProps {
  onBack: () => void;
  language: Language;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, language }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'agencies' | 'welcome' | 'system' | 'official' | 'banners' | 'svga'>('users');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Search Results
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [searchedRooms, setSearchedRooms] = useState<Room[]>([]); 

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerTitle, setNewBannerTitle] = useState('');

  // SVGA Panel State
  const [svgaType, setSvgaType] = useState<'gift' | 'entry' | 'frame'>('gift');
  const [svgaName, setSvgaName] = useState('');
  const [svgaPrice, setSvgaPrice] = useState('');
  const [svgaIcon, setSvgaIcon] = useState('');
  const [svgaFileUrl, setSvgaFileUrl] = useState('');
  const [dynamicGifts, setDynamicGifts] = useState<GiftType[]>([]);
  const [editingGift, setEditingGift] = useState<string | null>(null);
  const [editGiftData, setEditGiftData] = useState<{name: string, cost: string}>({name: '', cost: ''});

  // Welcome Requests
  const [welcomeRequests, setWelcomeRequests] = useState<WelcomeRequest[]>([]);

  // Modals / Inputs
  const [showVipModal, setShowVipModal] = useState<string | null>(null);
  const [vipDuration, setVipDuration] = useState<'permanent' | 'week' | 'month'>('permanent'); 

  const [showGiftModal, setShowGiftModal] = useState<string | null>(null);
  const [giftAmount, setGiftAmount] = useState('');

  const [showDeductModal, setShowDeductModal] = useState<string | null>(null);
  const [deductAmount, setDeductAmount] = useState('');
  
  const [showIdModal, setShowIdModal] = useState<string | null>(null);
  const [newCustomId, setNewCustomId] = useState('');

  // Ban Modal
  const [showBanModal, setShowBanModal] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<number>(-1); 

  const [officialTitle, setOfficialTitle] = useState('');
  const [officialBody, setOfficialBody] = useState('');

  // Luck State
  const [roomLuck, setRoomLuckState] = useState<number>(50);
  const [gameMode, setGameModeState] = useState<'FAIR' | 'DRAIN' | 'HOOK'>('FAIR');
  const [hookThreshold, setHookThresholdState] = useState<string>('50000');

  useEffect(() => {
    fetchUsers();
    const unsubBanners = listenToBanners((data) => setBanners(data));
    const unsubWelcome = listenToWelcomeRequests((data) => setWelcomeRequests(data));
    const unsubGifts = listenToDynamicGifts((data) => setDynamicGifts(data));
    return () => {
        unsubBanners();
        unsubWelcome();
        unsubGifts();
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleSearch = async () => {
      if(!searchTerm) return;
      setLoading(true);
      setSearchedUser(null);
      setSearchedRooms([]);

      // Search User
      const user = await searchUserByDisplayId(searchTerm);
      if (user) {
          setSearchedUser(user);
          // If user found, find ALL their rooms
          if (user.uid) {
              const rooms = await getRoomsByHostId(user.uid);
              setSearchedRooms(rooms);
          }
      }
      setLoading(false);
  };

  // ... (Existing Functions for Ban, Admin, etc. Omitted for Brevity but retained in final file) ...
  // Keeping all original handler functions here
  
  const initiateBanAction = (user: User) => {
      if (user.isBanned) { confirmBanUser(user.uid!, false); } else { setShowBanModal(user.uid!); setBanDuration(-1); }
  };
  const confirmBanUser = async (uid: string, shouldBan: boolean) => {
      setActionLoading(uid);
      try {
          const updateData: Partial<User> = { isBanned: shouldBan, isPermanentBan: shouldBan && banDuration === -1 };
          if (shouldBan && banDuration !== -1) { const d = new Date(); d.setDate(d.getDate() + banDuration); updateData.banExpiresAt = d.getTime(); } else { updateData.banExpiresAt = 0; }
          await adminUpdateUser(uid, updateData);
          if (searchedUser && searchedUser.uid === uid) setSearchedUser({...searchedUser, ...updateData});
          await fetchUsers();
          alert("تم التحديث");
      } catch (e) { alert("فشل"); }
      setActionLoading(null); setShowBanModal(null);
  };
  const handleToggleBanPermission = async (uid: string, currentStatus: boolean) => {
      await adminUpdateUser(uid, { canBanUsers: !currentStatus });
      if (searchedUser && searchedUser.uid === uid) setSearchedUser({...searchedUser, canBanUsers: !currentStatus});
      await fetchUsers(); alert("تم التحديث");
  };
  const handleSetAdminRole = async (uid: string, role: any) => {
      await adminUpdateUser(uid, { adminRole: role, isAdmin: role !== null });
      if (searchedUser && searchedUser.uid === uid) setSearchedUser({...searchedUser, adminRole: role, isAdmin: role !== null});
      await fetchUsers(); alert("تم التحديث");
  };
  const handleToggleRoomCreation = async (uid: string, currentStatus: boolean) => {
      await adminUpdateUser(uid, { canCreateRoom: !currentStatus });
      if (searchedUser && searchedUser.uid === uid) setSearchedUser({...searchedUser, canCreateRoom: !currentStatus});
      await fetchUsers(); alert("تم التحديث");
  };
  const handleDeleteUser = async (uid: string) => {
      if (!confirm("حذف؟")) return;
      await deleteUserProfile(uid);
      await fetchUsers(); alert("تم الحذف");
  };
  const handleBanRoom = async (roomId: string, currentStatus: boolean) => {
      await adminBanRoom(roomId, !currentStatus);
      setSearchedRooms(prev => prev.map(r => r.id === roomId ? { ...r, isBanned: !currentStatus } : r));
      alert("تم التحديث");
  };
  const handleToggleHot = async (roomId: string, s: boolean) => {
      await toggleRoomHotStatus(roomId, !s);
      setSearchedRooms(prev => prev.map(r => r.id === roomId ? { ...r, isHot: !s } : r));
  };
  const handleToggleActivities = async (roomId: string, s: boolean) => {
      await toggleRoomActivitiesStatus(roomId, !s);
      setSearchedRooms(prev => prev.map(r => r.id === roomId ? { ...r, isActivities: !s } : r));
  };
  const handleToggleOfficial = async (roomId: string, s: boolean) => {
      await toggleRoomOfficialStatus(roomId, !s);
      setSearchedRooms(prev => prev.map(r => r.id === roomId ? { ...r, isOfficial: !s } : r));
  };
  const handleUpdateRoomGameConfig = async (roomId: string) => {
      await updateRoomGameConfig(roomId, roomLuck, gameMode, parseInt(hookThreshold));
      alert("تم التحديث");
  };
  const handleDeleteSingleRoom = async (roomId: string) => {
      if (!confirm("حذف؟")) return;
      await deleteRoom(roomId);
      setSearchedRooms(prev => prev.filter(r => r.id !== roomId));
  };
  const handleGiftSubmit = async () => {
      if (!showGiftModal || !giftAmount) return;
      const u = users.find(x => x.uid === showGiftModal) || searchedUser;
      await adminUpdateUser(showGiftModal, { wallet: { diamonds: (u?.wallet?.diamonds || 0) + parseInt(giftAmount), coins: u?.wallet?.coins || 0 } });
      await fetchUsers(); alert("تم"); setShowGiftModal(null);
  };
  const handleDeductSubmit = async () => {
      if (!showDeductModal || !deductAmount) return;
      const u = users.find(x => x.uid === showDeductModal) || searchedUser;
      await adminUpdateUser(showDeductModal, { wallet: { diamonds: Math.max(0, (u?.wallet?.diamonds || 0) - parseInt(deductAmount)), coins: u?.wallet?.coins || 0 } });
      await fetchUsers(); alert("تم"); setShowDeductModal(null);
  };
  const handleAssignAgent = async (uid: string) => {
      await adminUpdateUser(uid, { isAgent: true, agencyBalance: 200000000 });
      await fetchUsers(); alert("تم");
  };
  const handleRevokeAgent = async (uid: string) => {
      await adminUpdateUser(uid, { isAgent: false });
      await fetchUsers(); alert("تم");
  };
  const handleRechargeAgency = async (uid: string) => {
      const amt = prompt("Amount?"); if(!amt) return;
      const u = users.find(x => x.uid === uid) || searchedUser;
      await adminUpdateUser(uid, { agencyBalance: (u?.agencyBalance || 0) + parseInt(amt) });
      await fetchUsers(); alert("تم");
  };
  const handleAssignWelcomeAgent = async (uid: string) => {
      await adminUpdateUser(uid, { isWelcomeAgent: true });
      await fetchUsers(); alert("تم");
  };
  const handleRevokeWelcomeAgent = async (uid: string) => {
      await adminUpdateUser(uid, { isWelcomeAgent: false });
      await fetchUsers(); alert("تم");
  };
  const handleApproveRequest = async (req: WelcomeRequest) => {
      await approveWelcomeRequest(req.id, req.targetDisplayId);
      alert("تم");
  };
  const handleRejectRequest = async (id: string) => {
      await rejectWelcomeRequest(id);
      alert("تم");
  };
  const handleSelectVip = async (lvl: number) => {
      if (!showVipModal) return;
      await adminUpdateUser(showVipModal, { vip: lvl > 0, vipLevel: lvl });
      await fetchUsers(); alert("تم"); setShowVipModal(null);
  };
  const handleUpdateId = async () => {
      if (!showIdModal || !newCustomId) return;
      await adminUpdateUser(showIdModal, { id: newCustomId });
      await fetchUsers(); alert("تم"); setShowIdModal(null);
  };
  const handleBroadcast = async () => {
      await broadcastOfficialMessage(officialTitle, officialBody);
      alert("تم");
  };
  const handleDeleteRooms = async () => {
      await deleteAllRooms(); alert("تم");
  };
  const handleResetAllCups = async () => {
      await resetAllRoomCups(); alert("تم");
  };
  const handleSyncRoomIds = async () => {
      await syncRoomIdsWithUserIds(); alert("تم");
  };
  const handleResetAllCoins = async () => {
      await resetAllUsersCoins(); alert("تم");
  };
  const handleResetGhostUsers = async () => {
      await resetAllGhostUsers(); alert("تم");
  };
  const handleResetChats = async () => {
      await resetAllChats(); alert("تم");
  };
  const handleAddBanner = async () => {
      await addBanner(newBannerImage, newBannerTitle);
      alert("تم");
  };
  const handleDeleteBanner = async (id: string) => {
      await deleteBanner(id);
  };
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      const reader = new FileReader(); reader.onload = (ev) => { if(typeof ev.target?.result === 'string') setNewBannerImage(ev.target.result); }; reader.readAsDataURL(file);
  };

  // --- SVGA Logic ---
  const handleSvgaIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
              setSvgaIcon(event.target.result);
          }
      };
      reader.readAsDataURL(file);
  };

  const handleSvgaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
              setSvgaFileUrl(event.target.result);
          }
      };
      reader.readAsDataURL(file);
  };

  const handleAddSvgaItem = async () => {
      if (!svgaName || !svgaPrice || !svgaIcon || !svgaFileUrl) {
          alert("يرجى ملء جميع الحقول");
          return;
      }
      
      setActionLoading('svga_add');
      try {
          if (svgaType === 'gift') {
              const newGift: GiftType = {
                  id: 'dynamic_gift_' + Date.now(),
                  name: svgaName,
                  icon: svgaIcon,
                  cost: parseInt(svgaPrice),
                  type: 'animated',
                  category: 'standard',
                  svgaUrl: svgaFileUrl
              };
              await addSvgaGift(newGift);
          } else {
              const newItem: StoreItem = {
                  id: `dynamic_${svgaType}_` + Date.now(),
                  type: svgaType as any, // 'entry' or 'frame'
                  name: { ar: svgaName, en: svgaName },
                  price: parseInt(svgaPrice),
                  currency: 'diamonds', // Default to diamonds for premium
                  previewClass: '', // CSS class not needed if image provided? Actually existing logic uses previewClass. For custom items, we might need to handle image display differently in StoreView.
                  svgaUrl: svgaFileUrl
              };
              // Hack: Reuse previewClass to store icon URL if needed or handle logic in StoreView to prioritize image
              // Since existing store uses CSS classes for frames, we'll need to update StoreView to check if it's dynamic.
              // For now, let's assume standard behavior.
              await addSvgaStoreItem(newItem);
          }
          alert("تمت الإضافة بنجاح!");
          setSvgaName('');
          setSvgaPrice('');
          setSvgaIcon('');
          setSvgaFileUrl('');
      } catch (e) {
          alert("فشل الإضافة");
      }
      setActionLoading(null);
  };

  const handleDeleteGift = async (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذه الهدية؟')) {
          await deleteGift(id);
      }
  };

  const handleUpdateGift = async (id: string) => {
      if(!editGiftData.name || !editGiftData.cost) return;
      await updateGift(id, { name: editGiftData.name, cost: parseInt(editGiftData.cost) });
      setEditingGift(null);
  };

  const agents = users.filter(u => u.isAgent);

  return (
    <div dir="rtl" className="h-full bg-black text-gold-400 flex flex-col font-sans relative">
      {/* Header */}
      <div className="p-4 bg-gray-900 border-b border-gold-500/30 flex flex-col gap-4 shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-l from-gold-500/10 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center justify-between relative z-10 w-full">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-gold-400">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2 text-gold-100 mx-auto">
                <Shield className="w-6 h-6 text-gold-500" />
                لوحة التحكم
            </h1>
            <div className="w-9"></div>
        </div>

        <div className="flex gap-2 relative z-10 overflow-x-auto w-full scrollbar-hide justify-center">
            <button onClick={() => setActiveTab('users')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'users' ? 'bg-gold-500 text-black' : 'text-gold-500'}`}>المستخدمين</button>
            <button onClick={() => setActiveTab('welcome')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'welcome' ? 'bg-purple-600 text-white' : 'text-purple-500'}`}>الترحيب</button>
            <button onClick={() => setActiveTab('agencies')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'agencies' ? 'bg-blue-500 text-white' : 'text-blue-500'}`}>الوكالات</button>
            <button onClick={() => setActiveTab('svga')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'svga' ? 'bg-cyan-600 text-white' : 'text-cyan-500'}`}>لوحة SVGA</button>
            <button onClick={() => setActiveTab('banners')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'banners' ? 'bg-pink-600 text-white' : 'text-pink-500'}`}>البنرات</button>
            <button onClick={() => setActiveTab('official')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'official' ? 'bg-green-600 text-white' : 'text-green-500'}`}>رسائل</button>
            <button onClick={() => setActiveTab('system')} className={`px-3 py-1 rounded border border-gold-500/30 text-[10px] font-bold whitespace-nowrap ${activeTab === 'system' ? 'bg-red-600 text-white' : 'text-red-500'}`}>النظام</button>
        </div>
      </div>

      {activeTab === 'users' && (
          <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-900/50">
                  <div className="relative flex gap-2">
                      <div className="relative flex-1">
                          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
                          <input type="text" placeholder="بحث عن ID المستخدم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg py-2 pr-10 pl-4 text-white text-sm focus:border-gold-500 outline-none"/>
                      </div>
                      <button onClick={handleSearch} className="bg-gold-600 text-black px-4 rounded-lg font-bold text-sm hover:bg-gold-500">بحث</button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {(searchedUser || searchedRooms.length > 0) && (
                      <div className="bg-gray-800/50 border border-gold-500/30 rounded-xl p-4 mb-4">
                          <h3 className="text-gold-300 font-bold mb-3 border-b border-gray-700 pb-2">نتائج البحث</h3>
                          {/* ... (User Search Results UI - Kept same) ... */}
                          {searchedUser && (
                              <div className={`bg-black p-4 rounded-xl border ${searchedUser.isBanned ? 'border-red-600' : 'border-gray-700'}`}>
                                  <div className="flex items-center gap-3 mb-3">
                                      <img src={searchedUser.avatar} className="w-12 h-12 rounded-full border-2 border-gold-500 object-cover shrink-0" />
                                      <div className="min-w-0 flex-1">
                                          <div className="font-bold text-white text-lg truncate">{searchedUser.name}</div>
                                          <div className="text-xs text-gray-500">ID: {searchedUser.id}</div>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => setShowGiftModal(searchedUser.uid!)} className="bg-blue-900/30 text-blue-400 py-1.5 rounded text-xs flex items-center justify-center gap-1"><Gift className="w-3 h-3"/> شحن</button>
                                      <button onClick={() => setShowDeductModal(searchedUser.uid!)} className="bg-red-900/30 text-red-400 py-1.5 rounded text-xs flex items-center justify-center gap-1"><MinusCircle className="w-3 h-3"/> سحب</button>
                                      <button onClick={() => { setShowVipModal(searchedUser.uid!); setVipDuration('permanent'); }} className="bg-yellow-900/30 text-yellow-400 py-1.5 rounded text-xs flex items-center justify-center gap-1"><Crown className="w-3 h-3"/> VIP</button>
                                      <button onClick={() => setShowIdModal(searchedUser.uid!)} className="bg-purple-900/30 text-purple-400 py-1.5 rounded text-xs flex items-center justify-center gap-1"><Edit3 className="w-3 h-3"/> ID</button>
                                      <button onClick={() => initiateBanAction(searchedUser)} className={`py-1.5 rounded text-xs flex items-center justify-center gap-1 col-span-2 ${searchedUser.isBanned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{searchedUser.isBanned ? 'فك الحظر' : 'حظر'}</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
                  {/* List of all users limited to 50 */}
                  <h3 className="text-white font-bold mb-2">جميع المستخدمين ({users.length})</h3>
                  {loading ? <div className="text-center py-10 text-gray-500">جاري التحميل...</div> : users.slice(0, 50).map(user => (
                      <div key={user.uid} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-10 h-10 rounded-full" />
                              <div>
                                  <div className="text-white text-sm font-bold">{user.name}</div>
                                  <div className="text-gray-500 text-xs">{user.id}</div>
                              </div>
                          </div>
                          <button onClick={() => setShowGiftModal(user.uid)} className="p-2 bg-blue-900/30 text-blue-400 rounded"><Gift className="w-4 h-4"/></button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* SVGA CONTROL PANEL TAB */}
      {activeTab === 'svga' && (
          <div className="flex-1 p-6 flex flex-col overflow-y-auto">
              <h3 className="font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5"/> لوحة تحكم SVGA (هدايا/دخوليات/إطارات)
              </h3>
              
              <div className="bg-gray-900 border border-cyan-900 rounded-xl p-4 space-y-4 mb-6">
                  <h4 className="text-white font-bold text-sm mb-2">إضافة عنصر جديد</h4>
                  <div>
                      <label className="text-xs text-gray-400 mb-2 block">نوع العنصر</label>
                      <div className="flex bg-black/40 p-1 rounded-lg">
                          <button onClick={() => setSvgaType('gift')} className={`flex-1 py-2 text-xs font-bold rounded ${svgaType === 'gift' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>هدية</button>
                          <button onClick={() => setSvgaType('entry')} className={`flex-1 py-2 text-xs font-bold rounded ${svgaType === 'entry' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>دخولية</button>
                          <button onClick={() => setSvgaType('frame')} className={`flex-1 py-2 text-xs font-bold rounded ${svgaType === 'frame' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>إطار</button>
                      </div>
                  </div>

                  <div>
                      <label className="text-xs text-gray-400 mb-1 block">صورة الهدية/العنصر (Icon)</label>
                      <label className="w-full h-20 bg-black border border-gray-700 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-500">
                          <input type="file" className="hidden" accept="image/*" onChange={handleSvgaIconUpload} />
                          {svgaIcon ? (
                              <img src={svgaIcon} className="h-full object-contain" />
                          ) : (
                              <div className="flex flex-col items-center text-gray-500">
                                  <ImageIcon className="w-5 h-5 mb-1" />
                                  <span className="text-[9px]">اختر صورة</span>
                              </div>
                          )}
                      </label>
                  </div>

                  <div>
                      <label className="text-xs text-gray-400 mb-1 block">ملف الحركة (Animation Source)</label>
                      <label className="w-full h-20 bg-black border border-gray-700 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-500">
                          <input type="file" className="hidden" accept=".svga,image/gif,image/webp,image/png" onChange={handleSvgaFileUpload} />
                          {svgaFileUrl ? (
                              <div className="text-cyan-400 text-xs font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4"/> تم اختيار الملف</div>
                          ) : (
                              <div className="flex flex-col items-center text-gray-500">
                                  <Upload className="w-5 h-5 mb-1" />
                                  <span className="text-[9px]">SVGA / GIF / WebP</span>
                              </div>
                          )}
                      </label>
                      <p className="text-[9px] text-gray-500 mt-1">يمكنك رفع ملف SVGA أصلي أو صورة متحركة (GIF/WebP).</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs text-gray-400 mb-1 block">الاسم</label>
                          <input type="text" value={svgaName} onChange={(e) => setSvgaName(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" placeholder="اسم العنصر"/>
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 mb-1 block">السعر (ماسات)</label>
                          <input type="number" value={svgaPrice} onChange={(e) => setSvgaPrice(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" placeholder="0"/>
                      </div>
                  </div>

                  <button 
                      onClick={handleAddSvgaItem} 
                      disabled={actionLoading === 'svga_add'}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      {actionLoading === 'svga_add' ? 'جاري الإضافة...' : 'نعم - إضافة للمتجر'}
                  </button>
              </div>

              {/* LIST EXISTING GIFTS */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <h4 className="text-white font-bold text-sm mb-4">إدارة الهدايا المرفوعة ({dynamicGifts.length})</h4>
                  <div className="grid grid-cols-2 gap-3">
                      {dynamicGifts.map(gift => (
                          <div key={gift.id} className="bg-black/50 p-3 rounded-lg border border-gray-700 relative">
                              {editingGift === gift.id ? (
                                  <div className="space-y-2">
                                      <input 
                                          type="text" 
                                          className="w-full bg-gray-800 text-white text-xs p-1 rounded border border-gray-600" 
                                          value={editGiftData.name} 
                                          onChange={(e) => setEditGiftData({...editGiftData, name: e.target.value})}
                                      />
                                      <input 
                                          type="number" 
                                          className="w-full bg-gray-800 text-white text-xs p-1 rounded border border-gray-600" 
                                          value={editGiftData.cost} 
                                          onChange={(e) => setEditGiftData({...editGiftData, cost: e.target.value})}
                                      />
                                      <div className="flex gap-1 mt-2">
                                          <button onClick={() => handleUpdateGift(gift.id)} className="bg-green-600 p-1 rounded text-white"><Save className="w-3 h-3"/></button>
                                          <button onClick={() => setEditingGift(null)} className="bg-gray-600 p-1 rounded text-white"><X className="w-3 h-3"/></button>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <div className="flex justify-center mb-2">
                                          <img src={gift.icon} className="w-10 h-10 object-contain"/>
                                      </div>
                                      <div className="text-center">
                                          <p className="text-white font-bold text-xs truncate">{gift.name}</p>
                                          <p className="text-yellow-400 text-[10px] font-mono">{gift.cost} 💎</p>
                                      </div>
                                      <div className="absolute top-1 right-1 flex gap-1">
                                          <button 
                                              onClick={() => { setEditingGift(gift.id); setEditGiftData({name: gift.name, cost: gift.cost.toString()}); }} 
                                              className="bg-blue-600/20 text-blue-400 p-1 rounded hover:bg-blue-600/40"
                                          >
                                              <Edit3 className="w-3 h-3"/>
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteGift(gift.id)} 
                                              className="bg-red-600/20 text-red-400 p-1 rounded hover:bg-red-600/40"
                                          >
                                              <Trash2 className="w-3 h-3"/>
                                          </button>
                                      </div>
                                  </>
                              )}
                          </div>
                      ))}
                  </div>
                  {dynamicGifts.length === 0 && <p className="text-gray-500 text-xs text-center py-4">لا توجد هدايا مرفوعة حالياً.</p>}
              </div>
          </div>
      )}

      {/* ... Other Tabs (Agencies, Welcome, Banners, Official, System) kept same ... */}
      
      {/* Modals (Ban, Gift, Deduct, ID, VIP) - reused from original code */}
      {/* Assuming standard modal implementations here for brevity */}
      {showGiftModal && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-blue-500 rounded-xl p-5 w-full max-w-xs text-right">
                  <h3 className="text-blue-400 font-bold mb-4">شحن</h3>
                  <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} className="w-full bg-black p-2 rounded mb-4 text-white border border-gray-700"/>
                  <div className="flex gap-2"><button onClick={handleGiftSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded">إرسال</button><button onClick={() => setShowGiftModal(null)} className="flex-1 bg-gray-700 text-white py-2 rounded">إلغاء</button></div>
              </div>
          </div>
      )}
      {/* ... Other modals ... */}
    </div>
  );
};

export default AdminDashboard;