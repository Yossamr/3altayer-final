import toast, { Toaster } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './services/AppContext';
import { LanguageProvider, useLanguage } from './services/LanguageContext';
import { Role, OrderStatus } from './types';
import { firebaseAuth, googleProvider } from './services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { CustomerView } from './components/CustomerView';
import { DriverView } from './components/DriverView';
import { AdminView } from './components/AdminView';
import { ProfileView } from './components/ProfileView';
import { OrdersView } from './components/OrdersView';
import { SettingsView } from './components/SettingsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { ChatsListView } from './components/ChatsListView';
import { NotificationsView } from './components/NotificationsView';
import { QRScannerView } from './components/QRScannerView';
import { Button } from './components/ui/Button';
import { Truck, Lock, Phone as PhoneIcon, Home, Receipt, User, HelpCircle, Loader2, MapPin, UserPlus, ArrowRight, Wallet, Activity, Bird, PhoneCall, MessageCircle, X, LogOut, LayoutDashboard, Headphones, CheckSquare, Square, WifiOff, Bell, Globe, ClipboardList, Settings, TrendingUp, Flame, Shield, Users } from 'lucide-react';
import { CURRENCY, SUPPORT_PHONES, HQ_ADDRESS } from './constants';

// --- HELPER: Sanitize Phone Input ---
const sanitizePhoneInput = (val: string) => {
  // 1. Convert Arabic digits to English
  let cleanVal = val.replace(/[٠-٩]/g, d => '0123456789'["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
  // 2. Remove any non-digit characters
  return cleanVal.replace(/\D/g, '');
};

// --- SHARED: CONTACT ACTION MODAL ---
const ContactActionModal: React.FC<{
  phone: string | null;
  onClose: () => void;
}> = ({
  phone,
  onClose
}) => {
  const {
    t
  } = useLanguage();
  if (!phone) return null;
  const handleCall = () => {
    window.open(`tel:${phone}`, '_self');
    onClose();
  };
  const handleWhatsApp = () => {
    // Remove leading 0 and add 2
    const waNumber = `2${phone.replace(/^0+/, '')}`;
    window.open(`https://wa.me/${waNumber}`, '_blank');
    onClose();
  };
  return <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200">
                    <X size={20} className="text-gray-500" />
                </button>
                <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-1">{t('selectChannel')}</h3>
                    <p className="text-lg font-bold text-primary">{phone}</p>
                </div>
                <div className="space-y-3">
                    <button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg">
                        <MessageCircle size={24} />
                        {t('contactWA')}
                    </button>
                    <button onClick={handleCall} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg">
                        <PhoneCall size={24} />
                        {t('contactCall')}
                    </button>
                </div>
            </div>
        </div>;
};

// --- SUPPORT LIST MODAL ---
const SupportListModal: React.FC<{
  onClose: () => void;
}> = ({
  onClose
}) => {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const {
    t
  } = useLanguage();
  if (selectedPhone) {
    return <ContactActionModal phone={selectedPhone} onClose={() => {
      setSelectedPhone(null);
      onClose();
    }} />;
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200">
                    <X size={20} className="text-gray-500" />
                </button>
                <div className="text-center mb-6">
                     <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                         <Headphones size={32} />
                     </div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">{t('technicalSupport')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">{t('support24')}</p>
                </div>
                <div className="space-y-3">
                    {SUPPORT_PHONES.map(phone => <button key={phone} onClick={() => setSelectedPhone(phone)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-2 border-transparent hover:border-primary p-4 rounded-2xl font-bold flex items-center justify-between transition-all group">
                            <span className="text-gray-700 dark:text-gray-200 text-lg">{phone}</span>
                            <div className="bg-white dark:bg-gray-700 p-2 rounded-full text-gray-400 group-hover:text-primary shadow-sm">
                                <PhoneIcon size={18} />
                            </div>
                        </button>)}
                </div>
            </div>
        </div>;
};

// --- SPLASH SCREEN ---
const SplashScreen: React.FC = () => {
  const {
    t
  } = useLanguage();
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0,
    transition: {
      duration: 0.5
    }
  }} className="fixed inset-0 z-[200] bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
            <motion.img initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.8,
      ease: "easeOut"
    }} src="https://lh3.googleusercontent.com/d/1xWGm1mzXPy9y33jFux2Lqz3lJhVRgXUx" alt="Al-Tayyar Logo" className="w-48 h-48 object-contain" referrerPolicy="no-referrer" />
            <motion.p initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      delay: 0.4,
      duration: 0.8
    }} className="text-gray-400 dark:text-gray-600 font-bold text-xs mt-6 tracking-widest uppercase">
                {t('loading')}
            </motion.p>
        </motion.div>;
};

// --- LOGIN SCREEN ---
import LoginScreen from "./components/LoginScreen";
const MainLayout: React.FC = () => {
  const {
    currentUser,
    isInitializing,
    dbError,
    logout,
    verifyDeliveryCode,
    checkGeofence,
    updateOrderStatus,
    isNetworkAvailable,
    unreadCount,
    resetUnreadCount,
    orders,
    calculateDistance,
    notificationsList
  } = useApp();
  const {
    t,
    language,
    isAr
  } = useLanguage();
  // Navigation State
  const [activeTab, setActiveTab] = useState<'HOME' | 'ORDERS' | 'MY_ORDERS' | 'PROFILE' | 'SETTINGS' | 'PRIVACY' | 'CREATE_ORDER' | 'ADDRESSES' | 'CHATS' | 'NOTIFICATIONS' | 'NEW_DRIVERS'>('HOME');
  const [adminSubTab, setAdminSubTab] = useState<'DASHBOARD' | 'ORDERS' | 'DRIVERS' | 'CUSTOMERS' | 'SETTINGS' | 'USERS_MGMT' | 'MAP' | 'ANALYTICS' | 'HEATMAP' | 'FINANCIALS' | 'NOTIFICATIONS' | 'NEW_DRIVERS'>('DASHBOARD');
  const [showScanner, setShowScanner] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Reset state when user logs out so they don't get stuck on the same tab on next login
  useEffect(() => {
    if (!currentUser) {
      setActiveTab('HOME');
      setAdminSubTab('DASHBOARD');
      setShowScanner(false);
      setShowSupportModal(false);
    }
  }, [currentUser]);

  // Detect keyboard on mobile to hide nav
  useEffect(() => {
    const initialHeight = window.innerHeight;
    const handleResize = () => {
      // If height shrinks by more than 20%, assume keyboard is open
      if (window.innerHeight < initialHeight * 0.8) setIsKeyboardOpen(true);else setIsKeyboardOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When switching to CHATS, reset badge
  useEffect(() => {
    if (activeTab === 'CHATS') {
      resetUnreadCount();
    }
  }, [activeTab]);

  const getAdminSidebarItems = () => {
    const sections = [
      {
        category: isAr ? "العام" : "General",
        items: [
          { id: 'DASHBOARD', label: isAr ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
        ]
      },
      {
        category: isAr ? "العمليات المباشرة" : "Live Operations",
        items: [
          { id: 'MAP', label: isAr ? 'الخريطة المباشرة' : 'Live Map', icon: MapPin },
          { id: 'ORDERS', label: isAr ? 'الطلبات والعمليات' : 'Orders & Ops', icon: ClipboardList },
          { id: 'CHATS', label: isAr ? 'مراقبة المحادثات' : 'Monitor Chats', icon: MessageCircle, badge: unreadCount },
        ]
      },
      {
        category: isAr ? "إدارة المستخدمين" : "User Management",
        items: [
          { id: 'DRIVERS', label: isAr ? 'الكباتن والمناديب' : 'Captains / Drivers', icon: Truck },
          { id: 'NEW_DRIVERS', label: isAr ? 'طلبات الانضمام' : 'Driver Requests', icon: UserPlus },
          { id: 'CUSTOMERS', label: isAr ? 'العملاء المسجلين' : 'Registered Customers', icon: Users },
          { id: 'USERS_MGMT', label: isAr ? 'إدارة الموظفين' : 'Staff Management', icon: Shield },
        ]
      },
      {
        category: isAr ? "المالية والتقارير" : "Financials & Reports",
        items: [
          { id: 'FINANCIALS', label: isAr ? 'الحسابات والمالية' : 'Financials', icon: Wallet },
          { id: 'ANALYTICS', label: isAr ? 'تحليلات الأداء' : 'Performance Analytics', icon: TrendingUp },
          { id: 'HEATMAP', label: isAr ? 'خريطة الطلب' : 'Demand Heatmap', icon: Flame },
        ]
      },
      {
        category: isAr ? "الإعدادات والنظام" : "System Settings",
        items: [
          { id: 'SETTINGS', label: isAr ? 'المناطق والأسعار' : 'Zones & Pricing', icon: Settings },
          { id: 'NOTIFICATIONS', label: isAr ? 'الإشعارات العامة' : 'Push Notifications', icon: Bell },
          { id: 'PROFILE', label: isAr ? 'الملف الشخصي' : 'Admin Profile', icon: User },
        ]
      }
    ];

    if (currentUser?.role === Role.EMPLOYEE) {
      const excluded = ['SETTINGS', 'USERS_MGMT', 'FINANCIALS', 'CUSTOMERS', 'NOTIFICATIONS', 'NEW_DRIVERS'];
      return sections.map(sec => ({
        ...sec,
        items: sec.items.filter(item => !excluded.includes(item.id))
      })).filter(sec => sec.items.length > 0);
    }
    return sections;
  };

  const isAdminSidebarActive = (itemId: string) => {
    if (itemId === 'PROFILE') return activeTab === 'PROFILE';
    if (itemId === 'CHATS') return activeTab === 'CHATS';
    return activeTab === 'HOME' && adminSubTab === itemId;
  };

  const renderContent = () => {
    if (!currentUser) return <LoginScreen />;
    switch (activeTab) {
      case 'HOME':
        if (currentUser.role === Role.ADMIN || currentUser.role === Role.EMPLOYEE) {
          return <AdminView activeTab={adminSubTab} setActiveTab={setAdminSubTab} onNavigateMain={setActiveTab as any} />;
        }
        if (currentUser.role === Role.DRIVER) return <DriverView />;
        return <CustomerView />;
      case 'ORDERS':
      case 'MY_ORDERS':
        return <OrdersView />;
      case 'PROFILE':
        return <ProfileView onNavigate={view => setActiveTab(view as any)} />;
      case 'SETTINGS':
        return <SettingsView onBack={() => setActiveTab('PROFILE')} />;
      case 'PRIVACY':
        return <PrivacyPolicyView onBack={() => setActiveTab('PROFILE')} />;
      case 'CREATE_ORDER':
        return <CustomerView initialView="list" adminCreateMode={true} />;
      case 'ADDRESSES':
        return <CustomerView initialView="addresses" />;
      case 'CHATS':
        return <ChatsListView />;
      case 'NOTIFICATIONS':
      case 'NEW_DRIVERS':
        return <NotificationsView />;
      default:
        return <CustomerView />;
    }
  };
  const getNavItems = () => {
    if (!currentUser) return [];
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.EMPLOYEE) {
      return [{
        id: 'HOME_DASHBOARD',
        icon: LayoutDashboard,
        label: isAr ? 'لوحة التحكم' : 'Dashboard'
      }, {
        id: 'MY_ORDERS',
        icon: ClipboardList,
        label: isAr ? 'طلباتي' : 'My Orders'
      }, {
        id: 'HOME_MAP',
        icon: MapPin,
        label: isAr ? 'الخريطة المباشرة' : 'Live Map'
      }, {
        id: 'CHATS',
        icon: MessageCircle,
        label: isAr ? 'المحادثات' : 'Chats',
        badge: unreadCount
      }, {
        id: 'PROFILE',
        icon: User,
        label: isAr ? 'حسابي' : 'Profile'
      }];
    }
    const items = [{
      id: 'HOME',
      icon: LayoutDashboard,
      label: t('home')
    }, {
      id: 'ORDERS',
      icon: Receipt,
      label: t('orders')
    }, {
      id: 'CHATS',
      icon: MessageCircle,
      label: t('chats'),
      badge: unreadCount
    }, {
      id: 'PROFILE',
      icon: User,
      label: t('profile')
    }];
    return items;
  };
  const isNavActive = (itemId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.EMPLOYEE) {
      if (itemId === 'HOME_DASHBOARD') return activeTab === 'HOME' && adminSubTab === 'DASHBOARD';
      if (itemId === 'MY_ORDERS') return activeTab === 'MY_ORDERS';
      if (itemId === 'HOME_MAP') return activeTab === 'HOME' && adminSubTab === 'MAP';
      if (itemId === 'PROFILE') return activeTab === 'PROFILE' || activeTab === 'SETTINGS' || activeTab === 'PRIVACY';
      return activeTab === itemId;
    } else {
      if (itemId === 'PROFILE') return activeTab === 'PROFILE' || activeTab === 'SETTINGS' || activeTab === 'PRIVACY' || activeTab === 'ADDRESSES';
      return activeTab === itemId;
    }
  };
  const handleScanComplete = (code: string) => {
    if (currentUser?.role === Role.DRIVER) {
      const result = verifyDeliveryCode(code, currentUser.id);
      if (result.success && result.orderId) {
        const order = orders.find(o => o.id === result.orderId);
        if (order) {
          const geo = checkGeofence(order);
          if (!geo.success) {
            toast.error(geo.message || t('geoError'));
            return;
          }
        }
        updateOrderStatus(result.orderId, OrderStatus.DELIVERED, {
          isQrScan: true
        });
        toast.success(t('successCode'));
        setShowScanner(false);
      } else {
        toast.error(t('errorCode'));
      }
    } else {
      toast(`Code: ${code}`);
      setShowScanner(false);
    }
  };
  return <div className={`min-h-[100dvh] ${currentUser ? 'h-[100dvh] overflow-hidden' : ''} bg-background-light dark:bg-background-dark font-body pb-safe flex flex-row relative`}>
      <AnimatePresence>
        {isInitializing && <SplashScreen key="splash" />}
      </AnimatePresence>
      
      {!isInitializing && <AnimatePresence mode="wait">
          {!currentUser ? <motion.div key="login" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="w-full">
                <LoginScreen />
            </motion.div> : <motion.div key="main" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} className="flex-1 flex flex-row relative h-full w-full overflow-hidden">
                {/* OFFLINE BANNER */}
                {!isNetworkAvailable && <div className="fixed top-0 left-0 right-0 z-[300] bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md animate-in slide-in-from-top flex items-center justify-center gap-2">
                        <WifiOff size={16} />
                        {t('offlineAlert')}
                    </div>}

                {/* DB ERROR OVERLAY */}
                {dbError && <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md animate-in fade-in">
                        <div className="text-center max-w-md w-full">
                            <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                                <WifiOff size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">{t('connectionIssue')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-bold mb-8 text-sm px-4 leading-relaxed">
                                {dbError.includes("Failed to fetch") ? t('connectionErrorFull') : dbError}
                            </p>
                            <button onClick={() => window.location.reload()} className="w-full bg-primary text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all mb-4">
                                {t('refreshPage')}
                            </button>
                            <button onClick={() => setShowSupportModal(true)} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-4 rounded-2xl font-black text-sm">
                                {t('contactSupport')}
                            </button>
                        </div>
                    </div>}

                {/* Scanner Overlay */}
                {showScanner && <QRScannerView onClose={() => setShowScanner(false)} onScan={(code: string) => {
          // Verify QR for driver
          if (currentUser?.role === Role.DRIVER) {
            const result = verifyDeliveryCode(code, currentUser.id);
            if (result.success && result.orderId) {
              const order = orders.find(o => o.id === result.orderId);
              if (order) {
                const geo = checkGeofence(order);
                if (!geo.success) {
                  toast.error(geo.message || t('geoError'));
                  return;
                }
              }
              updateOrderStatus(result.orderId, OrderStatus.DELIVERED, {
                isQrScan: true
              });
              toast.success(t('successCode'));
              setShowScanner(false);
            } else {
              toast.error(t('errorCode'));
            }
          } else {
            toast(t('deliveryCode') + `: ${code}`);
            setShowScanner(false);
          }
        }} />}
                
                {/* Logout Confirmation Modal */}
                {showLogoutConfirm && <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-in zoom-in-95">
                            <div className="bg-red-100 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <LogOut size={32} />
                            </div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white text-center mb-2">{t('logoutConfirmTitle')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold text-center mb-8">{t('logoutConfirmDesc')}</p>
                            
                            <div className="flex gap-3">
                                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-4 rounded-xl font-black text-sm transition-colors">
                                    {t('cancel')}
                                </button>
                                <button onClick={() => {
                logout();
                setShowLogoutConfirm(false);
              }} className="flex-1 bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl font-black text-sm transition-colors shadow-lg shadow-red-200 dark:shadow-none">
                                    {t('exit')}
                                </button>
                            </div>
                        </div>
                    </div>}
                
                {/* Support Modal Overlay */}
                {showSupportModal && <SupportListModal onClose={() => setShowSupportModal(false)} />}
                
                {/* --- DESKTOP SIDEBAR --- */}
                <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 h-full z-30 shadow-lg shrink-0">
                    <div className="p-5 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 min-h-[160px] justify-center">
                        {!logoError ? <img src="https://lh3.googleusercontent.com/d/1xWGm1mzXPy9y33jFux2Lqz3lJhVRgXUx" alt="Aa-Tayar Logo" referrerPolicy="no-referrer" className="h-24 w-auto object-contain mb-1 drop-shadow-md hover:scale-105 transition-transform" onError={() => setLogoError(true)} /> : <div className="flex flex-col items-center animate-in fade-in">
                                <Bird size={48} className="text-primary mb-2" />
                                <h1 className="text-2xl font-black text-primary">{t('appName', "Aa-Tayar")}</h1>
                            </div>}
                        <p className="text-xs text-gray-400 font-bold bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full mt-2">
                          {(currentUser.role === Role.ADMIN || currentUser.role === Role.EMPLOYEE) ? (isAr ? "لوحة الإدارة" : "Admin Panel") : t('dashboard')}
                        </p>
                    </div>
                    
                    <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
                        {(currentUser.role === Role.ADMIN || currentUser.role === Role.EMPLOYEE) ? (
                          // --- ADMIN CATEGORIZED SIDEBAR ---
                          getAdminSidebarItems().map((section, sIdx) => (
                            <div key={sIdx} className="space-y-1.5">
                              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1 block">
                                {section.category}
                              </h3>
                              <div className="space-y-1">
                                {section.items.map((item) => {
                                  const isActive = isAdminSidebarActive(item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        if (item.id === 'PROFILE') {
                                          setActiveTab('PROFILE');
                                        } else if (item.id === 'CHATS') {
                                          setActiveTab('CHATS');
                                        } else {
                                          setActiveTab('HOME');
                                          setAdminSubTab(item.id as any);
                                        }
                                      }}
                                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all relative z-10 group ${isActive ? 'text-white shadow-md shadow-orange-200/50 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}
                                    >
                                      {isActive && (
                                        <motion.div
                                          layoutId="desktop-nav-bubble"
                                          className="absolute inset-0 bg-primary rounded-xl -z-10"
                                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                      )}
                                      {!isActive && (
                                        <div className="absolute inset-0 rounded-xl bg-gray-50 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                      )}
                                      <item.icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary transition-colors'} />
                                      <span className="font-bold text-xs">{item.label}</span>
                                      {item.badge ? (
                                        <span className="absolute left-3 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                          {item.badge}
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          // --- CUSTOMER & DRIVER SIDEBAR ---
                          getNavItems().filter(i => i.id !== 'SCAN').map((item, idx) => (
                            <React.Fragment key={item.id}>
                              {item.id === 'CREATE_ORDER' && <div className="h-px bg-gray-100 dark:bg-gray-800 my-3 mx-2" />}
                              <button onClick={() => {
                                if (item.id === 'HOME_DASHBOARD') {
                                  setActiveTab('HOME');
                                  setAdminSubTab('DASHBOARD');
                                } else if (item.id === 'HOME_ORDERS') {
                                  setActiveTab('HOME');
                                  setAdminSubTab('ORDERS');
                                } else if (item.id === 'HOME_MAP') {
                                  setActiveTab('HOME');
                                  setAdminSubTab('MAP');
                                } else {
                                  setActiveTab(item.id as any);
                                }
                              }} className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all relative z-10 group ${item.id === 'CREATE_ORDER' ? 'shadow-sm border border-primary/10 bg-orange-50/20 dark:bg-orange-900/10' : ''} ${isNavActive(item.id) ? 'text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary'}`}>
                                {isNavActive(item.id) && (
                                  <motion.div
                                    layoutId="desktop-nav-bubble"
                                    className="absolute inset-0 bg-primary rounded-xl -z-10"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                  />
                                )}
                                {!isNavActive(item.id) && (
                                  <div className="absolute inset-0 rounded-xl bg-gray-50 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                )}
                                <item.icon size={22} className="relative z-10" />
                                <span className="font-bold text-sm relative z-10">{item.label}</span>
                                {item.badge ? <span className="absolute left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                        {item.badge}
                                    </span> : null}
                              </button>
                            </React.Fragment>
                          ))
                        )}
                    </nav>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-2 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold text-sm">
                            <LogOut size={18} />
                            {t('logOut')}
                        </button>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                    {!showScanner && <header className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none border-b border-gray-100 dark:border-gray-800 md:border-none pb-3 px-4 sticky top-0 z-40 transition-all duration-300 ${!isNetworkAvailable ? 'mt-8' : ''}`} style={{ paddingTop: "max(3.5rem, env(safe-area-inset-top))" }}>
                          <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
                              <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-orange-500/10 border-2 border-white dark:border-gray-700 shadow-sm flex items-center justify-center text-primary group transition-transform">
                                      <User size={20} className="group-hover:scale-110 transition-transform" />
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-1">
                                          <p className="text-gray-400 text-[8px] font-black uppercase tracking-wider">
                                            {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.EMPLOYEE)
                                              ? (isAr ? "لوحة الإدارة 👑" : "Admin Panel 👑")
                                              : t('goodMorning')}
                                          </p>
                                          <div className="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.6)]"></div>
                                      </div>
                                      <h1 className="text-gray-800 dark:text-white text-base font-black tracking-tight leading-none">
                                        {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.EMPLOYEE)
                                          ? (isAr ? "مدير النظام" : "System Admin")
                                          : currentUser.name.split(' ')[0]}
                                      </h1>
                                  </div>
                              </div>

                              <div className="flex gap-1.5">
                                  <button onClick={() => setShowSupportModal(true)} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative group hidden sm:flex items-center gap-1.5">
                                       <Headphones size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                                       <span className="text-[9px] font-black text-gray-500">{t('technicalSupport')}</span>
                                  </button>
                                  <button onClick={() => setActiveTab('CHATS')} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                                      <MessageCircle size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                                      {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm"></span>}
                                  </button>
                                  <button onClick={() => setActiveTab('NOTIFICATIONS')} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                                      <Bell size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                                      {notificationsList.filter(n => !n.isRead).length > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm"></span>}
                                  </button>
                              </div>
                          </div>
                        </header>}

                    {!showScanner && <main className="px-5 pt-8 w-full max-w-7xl mx-auto pb-32 md:pb-8 flex-1 overflow-y-auto overscroll-contain relative">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={`${activeTab}-${adminSubTab}`}
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.98 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="w-full min-h-full"
                            >
                              {renderContent()}
                            </motion.div>
                          </AnimatePresence>
                        </main>}
                </div>

                {!showScanner && !isKeyboardOpen && <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-gray-900/95 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 pt-2 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-40 rounded-t-[2.5rem] transition-transform duration-300 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
                        <div className="flex justify-between items-center max-w-lg mx-auto relative h-16 px-2" dir={isAr ? "rtl" : "ltr"}>
                            {/* Sliding Active Bubble */}
                            <div className="absolute inset-0 flex items-center pointer-events-none px-2" dir={isAr ? "rtl" : "ltr"}>
                                {getNavItems().map((item, idx) => {
                const isActive = isNavActive(item.id);
                if (!isActive) return null;
                const itemWidth = 100 / getNavItems().length;
                return <motion.div key="nav-bubble" layoutId="nav-bubble" className="absolute h-12 bg-orange-100/60 dark:bg-orange-900/30 rounded-2xl shadow-inner border border-orange-100/50 dark:border-orange-800/20" transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }} style={{
                  width: `calc(${itemWidth}% - 12px)`,
                  ...(isAr ? {
                    right: `calc(${idx * itemWidth}% + 6px)`
                  } : {
                    left: `calc(${idx * itemWidth}% + 6px)`
                  })
                }} />;
              })}
                            </div>
                            {getNavItems().map(item => {
              if (item.id === 'CENTER_ACTION') {
                return <div key={item.id} className="relative -top-6 px-1">
                                            <motion.button whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.9
                  }} onClick={() => {
                    if (currentUser?.role === Role.CUSTOMER) setActiveTab('CREATE_ORDER');else setShowScanner(true);
                  }} className="bg-gradient-to-tr from-primary via-orange-500 to-orange-400 text-white w-14 h-14 rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/20 flex flex-col items-center justify-center border-4 border-white dark:border-gray-900 transition-all">
                                                <item.icon size={22} strokeWidth={3} />
                                                <span className="text-[7px] font-black mt-0.5">{item.label}</span>
                                            </motion.button>
                                         </div>;
              }
              const isActive = isNavActive(item.id);
              return <button key={item.id} onClick={() => {
                if (item.id === 'HOME_DASHBOARD') {
                  setActiveTab('HOME');
                  setAdminSubTab('DASHBOARD');
                } else if (item.id === 'HOME_ORDERS') {
                  setActiveTab('HOME');
                  setAdminSubTab('ORDERS');
                } else if (item.id === 'HOME_MAP') {
                  setActiveTab('HOME');
                  setAdminSubTab('MAP');
                } else {
                  setActiveTab(item.id as any);
                }
              }} className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 group transition-all duration-300 relative z-10 ${isActive ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <div className="relative">
                                            <motion.div animate={{
                    scale: isActive ? 1.2 : 1,
                    y: isActive ? -2 : 0
                  }} transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 15
                  }}>
                                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_12px_rgba(255,127,39,0.6)] text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                            </motion.div>
                                            
                                            {item.badge ? <motion.div initial={{
                    scale: 0
                  }} animate={{
                    scale: 1
                  }} className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm z-20">
                                                    {item.badge > 9 ? '9+' : item.badge}
                                                </motion.div> : null}
                                            {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(255,127,39,0.8)]" transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }} />}
                                        </div>
                                        <motion.span animate={{
                  opacity: isActive ? 1 : 0.6,
                  y: isActive ? 2 : 0,
                  scale: isActive ? 1 : 0.95
                }} className={`text-[10px] font-bold md:font-black transition-colors duration-300 ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                                            {item.label}
                                        </motion.span>
                                     </button>;
            })}
                        </div>
                    </nav>}
            </motion.div>}
        </AnimatePresence>}
    </div>;
};
const App: React.FC = () => {
  return <LanguageProvider>
      <AppProvider>
        <MainLayout />
        <Toaster position="top-center" toastOptions={{
        duration: 4000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '16px',
          fontWeight: 'bold'
        }
      }} />
      </AppProvider>
    </LanguageProvider>;
};
export default App;