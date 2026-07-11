import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { OrderStatus, OrderType, Order } from '../types';
import { WORKFLOW_CONFIG, CURRENCY, ORDER_TYPE_LABELS } from '../constants';
import { Button } from './ui/Button';
import { StatusBadge } from './StatusBadge';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ChatModal } from './ChatModal';
import { Camera, AlertTriangle, XCircle, MapPin, Phone, MessageCircle, Keyboard, X, CheckCircle, Loader2, RefreshCw, Power, Eye, Wallet, Clock, Calendar, LocateFixed, Store, Image, Mic, Package, Truck, Star } from 'lucide-react';
import { useLanguage } from '../services/LanguageContext';
export const DriverView: React.FC = () => {
  const {
    t,
    isAr,
    dir
  } = useLanguage();
  const {
    currentUser,
    orders,
    users,
    acceptOrder,
    updateOrderStatus,
    verifyDeliveryCode,
    checkGeofence,
    manualRefresh,
    toggleOnlineStatus,
    autoOpenChatId,
    clearAutoOpenChat,
    isTrackingActive,
    calculateDistance,
    startLocationTracking,
    stopLocationTracking
  } = useApp();
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');

  // Modals State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [mapTargetOrderId, setMapTargetOrderId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showCodeInputOrder, setShowCodeInputOrder] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [confirmDeliveryOrderId, setConfirmDeliveryOrderId] = useState<string | null>(null);
  const [checkedDetailsValid, setCheckedDetailsValid] = useState(false);
  const [checkedRecipientValid, setCheckedRecipientValid] = useState(false);
  const [isFinishingDelivery, setIsFinishingDelivery] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update clock every 5s to refresh radius dispatch eligibility
  useEffect(() => {
    const itv = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(itv);
  }, []);
  const isOnline = currentUser?.isOnline || false;

  // Calculate Idle Time Locally for Notification (Threshold: 10 minutes warning)
  const isIdle = isOnline && currentUser?.lastMovedAt && currentTime - currentUser.lastMovedAt >= 10 * 60 * 1000;
  const idleMinutes = isIdle ? Math.floor((currentTime - (currentUser?.lastMovedAt || currentTime)) / 60000) : 0;

  // Enforce tracking if online
  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnline, startLocationTracking, stopLocationTracking]);
  useEffect(() => {
    // Fire browser notification if idle for 10 or 15+ minutes.
    if (isIdle && idleMinutes >= 10) {
      const flagKey = `idle_notified_${idleMinutes}_${currentUser?.id}`;
      if (!sessionStorage.getItem(flagKey)) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(idleMinutes >= 15 ? t("ar_297") : t("ar_298"), {
            body: idleMinutes >= 15 ? `You have been idle for ${idleMinutes} minutes. An idle report has been sent to admin automatically.` : t("ar_299"),
            icon: "/favicon.ico"
          });
        }
        // Try to vibrate
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        sessionStorage.setItem(flagKey, 'true');
      }
    }
  }, [isIdle, idleMinutes, currentUser?.id]);

  // --- RATINGS CALCULATION ---
  const ratedOrders = orders.filter(o => o.driverId === currentUser?.id && o.rating !== undefined && o.rating !== null);
  const avgRating = ratedOrders.length > 0 ? (ratedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / ratedOrders.length).toFixed(1) : '5.0';

  // --- REVENUE CALCULATION (Today's Delivery Fees) ---
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayDeliveredOrders = orders.filter(o => o.driverId === currentUser?.id && o.status === OrderStatus.DELIVERED && o.createdAt >= startOfDay.getTime()).sort((a, b) => b.createdAt - a.createdAt);
  const todayRevenue = todayDeliveredOrders.reduce((sum, o) => sum + o.price, 0);
  const completedOrdersCount = orders.filter(o => o.driverId === currentUser?.id && o.status === OrderStatus.DELIVERED).length;
  const myActiveOrders = orders.filter(o => {
    if (o.driverId !== currentUser?.id) return false;
    const isTerminal = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED || o.status === OrderStatus.RETURNED;
    if (!isTerminal) return true;
    const lastEvent = o.timeline[o.timeline.length - 1]?.timestamp || o.createdAt;
    const isVeryRecent = currentTime - lastEvent < 10 * 60 * 1000;
    return isVeryRecent;
  });
  const isLimitReached = myActiveOrders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.RETURNED).length >= 4;
  const availableOrders = orders.filter(o => {
    if (o.status !== OrderStatus.PENDING) return false;
    const elapsedSecs = (currentTime - o.createdAt) / 1000;

    // If targeted to this driver, they can always see it immediately
    if (o.assignedDriverIds?.includes(currentUser!.id)) {
      return true;
    }

    // If targeted to someone else, hide it from this driver for the first 60 seconds
    if (o.assignedDriverIds && o.assignedDriverIds.length > 0 && !o.assignedDriverIds.includes(currentUser!.id) && elapsedSecs < 60) {
      return false;
    }

    // Dispatch Radius Algorithm (Updated: 20s intervals)
    let allowedRadiusMeters = Infinity;
    if (elapsedSecs < 20) allowedRadiusMeters = 500;else if (elapsedSecs < 40) allowedRadiusMeters = 800;else if (elapsedSecs < 60) allowedRadiusMeters = 1300;else if (elapsedSecs < 80) allowedRadiusMeters = 2000;else allowedRadiusMeters = Infinity; // Global after 80s

    // If driver location is unknown, only show orders after 80s (global phase) 
    // OR if we can't calculate distance
    if (!currentUser?.currentLat || !currentUser?.currentLng) {
      return elapsedSecs > 80;
    }
    const pLat = o.pickupLat || o.deliveryAddress.lat;
    const pLng = o.pickupLng || o.deliveryAddress.lng;
    if (!pLat || !pLng) return true; // Show if no coords to compare

    const distKm = calculateDistance(currentUser.currentLat, currentUser.currentLng, pLat, pLng);
    const distMeters = distKm * 1000;
    return distMeters <= allowedRadiusMeters;
  });

  // --- AUTO OPEN CHAT EFFECT ---
  useEffect(() => {
    if (autoOpenChatId) {
      const targetOrder = orders.find(o => o.id === autoOpenChatId);
      if (targetOrder) {
        setChatOrder(targetOrder);
        clearAutoOpenChat();
      }
    }
  }, [autoOpenChatId, orders]);
  const handleRefresh = () => {
    setIsRefreshing(true);
    manualRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  const handleToggleStatus = async () => {
    setIsToggling(true);
    await toggleOnlineStatus(!isOnline);
    setIsToggling(false);
  };
  const handleProofAction = (orderId: string, nextStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (nextStatus === OrderStatus.DELIVERED) {
      // Apply Unified Geofence Check
      const geo = checkGeofence(order);
      if (!geo.success) {
        toast.error(geo.message || t("ar_300"));
        return;
      }
      toast.error(t("ar_301"));
    } else {
      const mockImageUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
      updateOrderStatus(orderId, nextStatus, {
        imageUrl: mockImageUrl
      });
    }
  };
  const handleDeliverySuccess = async (orderId: string): Promise<boolean> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    // Double check geofence
    const geo = checkGeofence(order);
    if (!geo.success) {
      toast.error(geo.message || t("ar_300"));
      return false;
    }
    try {
      await updateOrderStatus(orderId, OrderStatus.DELIVERED, {
        isQrScan: false
      });
      return true;
    } catch (err) {
      console.error(err);
      toast.error(t("ar_302"));
      return false;
    }
  };
  const verifyAndSubmitCode = async () => {
    if (!showCodeInputOrder) return;
    setVerifyError('');
    const cleanCode = manualCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setVerifyError(t("ar_303"));
      return;
    }
    
    const result = verifyDeliveryCode(cleanCode, currentUser!.id);
    if (result.success) {
      if (result.orderId === showCodeInputOrder) {
        // Open the custom confirmation check modal to verify package & recipient
        setConfirmDeliveryOrderId(showCodeInputOrder);
        setShowCodeInputOrder(null);
      } else {
        setVerifyError(t("ar_304"));
      }
    } else {
      setVerifyError(t("ar_305"));
    }
  };
  const cancelConfirmDelivery = () => {
    // Return back to code entry, keeping the typed code intact
    setShowCodeInputOrder(confirmDeliveryOrderId);
    setConfirmDeliveryOrderId(null);
    setCheckedDetailsValid(false);
    setCheckedRecipientValid(false);
  };
  const handleNoProofAction = (orderId: string, nextStatus: OrderStatus) => {
    updateOrderStatus(orderId, nextStatus);
  };
  const handleAccept = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    acceptOrder(orderId, currentUser!.id, true);
    setActiveTab('active');
  };
  const openWhatsApp = (phone: string | undefined, orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) {
      toast.error(t("ar_306"));
      return;
    }
    const message = `Hello, I am the Al-Tayyar Captain with your order #${orderId.slice(-4)}. I am on my way!`;
    // FIX: Prepend '2' only
    const url = `https://wa.me/2${phone.replace(/^0+/, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };
  const openMapLocation = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setMapTargetOrderId(order.id);
    setShowMap(true);
  };
  return <>
      <div className="space-y-6 pb-32">
          
      {/* IDLE NOTIFICATION BAR */}
      {isOnline && isIdle && (idleMinutes >= 15 ? <div className="bg-red-50 border-2 border-red-300 p-4 rounded-3xl flex flex-col sm:flex-row items-center gap-3 text-red-800 animate-in slide-in-from-top fade-in shadow-xl shadow-red-500/10">
                  <div className="bg-red-500 text-white p-3 rounded-full flex-shrink-0 animate-pulse">
                      <AlertTriangle size={24} />
                  </div>
                  <div className="text-center sm:text-right flex-1">
                      <h4 className="font-black text-lg">{t("ar_307")}</h4>
                      <p className="text-xs font-bold opacity-90 mt-1">{t("ar_308")}{idleMinutes}{t("ar_309")}</p>
                  </div>
              </div> : <div className="bg-amber-100 border-2 border-amber-300 p-4 rounded-3xl flex flex-col sm:flex-row items-center gap-3 text-amber-800 animate-in slide-in-from-top fade-in shadow-xl shadow-amber-500/10">
                  <div className="bg-amber-500 text-white p-3 rounded-full flex-shrink-0 animate-bounce">
                      <AlertTriangle size={24} />
                  </div>
                  <div className="text-center sm:text-right flex-1">
                      <h4 className="font-black text-lg">{t("ar_310")}</h4>
                      <p className="text-xs font-bold opacity-80 mt-1">{t("ar_311")}{idleMinutes}{t("ar_312")}</p>
                  </div>
              </div>)}

          {/* Detail Modal */}
      {selectedOrder && <OrderDetailsModal order={orders.find(o => o.id === selectedOrder.id) || selectedOrder} onClose={() => setSelectedOrder(null)} userRole={currentUser!.role} onOpenMap={(targetLat?: number, targetLng?: number, address?: string) => {
        let url = "https://www.google.com/maps/search/?api=1&query=";
        if (targetLat && targetLng) {
          url += `${targetLat},${targetLng}`;
        } else if (address) {
          url += encodeURIComponent(address);
        } else {
          return;
        }
        window.open(url, "_blank");
      }} />}

      {/* Chat Modal */}
      {chatOrder && <ChatModal order={orders.find(o => o.id === chatOrder.id) || chatOrder} onClose={() => setChatOrder(null)} />}

      {/* Ratings Details Modal */}
      {showRatingDetails && <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="bg-secondary p-6 text-white">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="text-2xl font-black">{t("ar_313")}</h3>
                              <p className="opacity-95 text-sm font-bold flex items-center gap-2 mt-1">
                                  <Star size={14} className="text-yellow-300 fill-yellow-300" />{t("ar_314")}{avgRating} / 5 ({ratedOrders.length}{t("ar_143")}</p>
                          </div>
                          <button onClick={() => setShowRatingDetails(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                  </div>
                  

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-black/20">
                      {ratedOrders.length === 0 ? <div className="text-center py-10 text-gray-400">
                              <Star size={48} className="mx-auto mb-2 opacity-30 text-yellow-500" />
                              <p className="font-bold text-sm">{t("ar_315")}</p>
                          </div> : ratedOrders.map(order => <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-2">
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded">#{order.id.slice(-4)}</span>
                                          <div className="flex text-yellow-400">
                                              {Array.from({
                      length: order.rating || 0
                    }).map((_, i) => <Star key={i} size={12} className="fill-current" />)}
                                          </div>
                                      </div>
                                      <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                          <Clock size={10} />{t("ar_131")}{order.timeTakenMinutes ? `${Math.round(order.timeTakenMinutes)} min` : t("ar_316")}
                                      </span>
                                  </div>
                                  {order.ratingComment && <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-100/50 dark:border-gray-800/50">
                                          " {order.ratingComment} "
                                      </div>}
                              </div>)}
                  </div>
              </div>
          </div>}

      {/* --- SIMPLIFIED ONLINE TOGGLE --- */}
      <div onClick={handleToggleStatus} className={`relative overflow-hidden p-4 sm:p-5 rounded-[2.5rem] shadow-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer flex items-center justify-between border-[3px] select-none group focus:outline-none hover:scale-[1.02] active:scale-95 ${isOnline ? 'bg-gradient-to-r from-[#16a34a] to-[#22c55e] border-[#4ade80]/50 text-white shadow-green-500/30' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 shadow-gray-200/50 dark:shadow-none hover:border-gray-300 dark:hover:border-gray-600'}`}>
          {isOnline && <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse duration-1000 z-0 pointer-events-none"></div>}
          
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner overflow-hidden relative shrink-0 ${isOnline ? 'bg-white text-[#16a34a] shadow-black/10 scale-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 scale-95 border border-gray-200 dark:border-gray-600'}`}>
                  {isOnline && <div className="absolute inset-0 bg-[#22c55e]/10 blur-sm pointer-events-none"></div>}
                  {isToggling ? <Loader2 className="animate-spin" size={28} /> : <Power size={28} className={`transition-all duration-700 relative z-10 ${isOnline ? 'scale-110 drop-shadow-md' : 'scale-100 opacity-80'}`} strokeWidth={isOnline ? 3 : 2} />}
              </div>
              <div className="transition-all duration-300">
                  <div className={`text-xl sm:text-2xl font-black tracking-tight transition-colors duration-500 ${isOnline ? 'drop-shadow-sm text-white' : 'text-gray-800 dark:text-gray-300'}`}>{isOnline ? t('youAreOnline') : t('youAreOffline')}</div>
                  <p className={`text-xs sm:text-sm font-bold mt-0.5 transition-colors duration-500 ${isOnline ? 'text-green-50' : 'text-gray-400 dark:text-gray-500'}`}>
                      {isOnline ? t('ordersWillReachYou') : t('clickToStart')}
                  </p>
              </div>
          </div>
          
          <div className={`w-[60px] sm:w-[72px] h-8 sm:h-10 rounded-full p-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative z-10 flex items-center shrink-0 shadow-inner ml-1 ${isOnline ? 'bg-[#14532d]' : 'bg-gray-300 dark:bg-gray-700'}`}>
              {/* Responsive translation thumb */}
              <div className={`bg-white w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${isOnline ? isAr ? '-translate-x-[28px] sm:-translate-x-8' : 'translate-x-[28px] sm:translate-x-8' : 'translate-x-0'}`}>
                {isOnline && <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#22c55e] animate-pulse`}></div>}
              </div>
          </div>
      </div>

      {/* Manual Code Input Modal */}
      {showCodeInputOrder && <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <button onClick={() => {
            setShowCodeInputOrder(null);
            setManualCode('');
            setVerifyError('');
          }} className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <X size={20} className="text-gray-500" />
                  </button>
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                          <Keyboard size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-white">{t('acceptOrderCode')}</h3>
                      <p className="text-sm text-gray-500">{t('askCustomerForCode')}</p>
                  </div>
                  
                  <div className="space-y-4">
                      <input autoFocus value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())} className="w-full text-center text-3xl font-mono font-black tracking-widest p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary outline-none uppercase" placeholder="CODE" maxLength={6} />
                      
                      {verifyError && <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl text-center flex items-center justify-center gap-2">
                              <AlertTriangle size={16} />
                              {verifyError}
                          </div>}

                      <Button fullWidth onClick={verifyAndSubmitCode} size="lg">{t("ar_317")}</Button>
                  </div>
              </div>
          </div>}

      {/* Delivery Confirmation Dialog (Double-checking details and recipient) */}
      {(() => {
        const confirmOrder = confirmDeliveryOrderId ? orders.find(o => o.id === confirmDeliveryOrderId) : null;
        if (!confirmDeliveryOrderId || !confirmOrder) return null;
        return <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
                  <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                      {/* Header */}
                      <div className="bg-primary/15 p-6 text-center border-b border-gray-100 dark:border-gray-800">
                          <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                              <CheckCircle size={28} />
                          </div>
                          <h3 className="text-xl font-black text-gray-800 dark:text-white">{t("ar_318")}</h3>
                          <p className="text-xs text-gray-500 font-bold mt-1">{t("ar_319")}</p>
                      </div>

                      {/* Body Content */}
                      <div className="p-6 overflow-y-auto space-y-6">
                          
                          {/* Package Details Section */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-2 mb-3 text-primary">
                                  <Package size={18} />
                                  <span className="font-extrabold text-sm text-gray-700 dark:text-gray-300">{t("ar_320")}</span>
                              </div>
                              
                              <div className="space-y-2 text-right">
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400 font-bold">{t("ar_321")}</span>
                                      <span className="text-gray-800 dark:text-white font-black">{confirmOrder.items}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400 font-bold">{t("ar_322")}</span>
                                      <span className="text-primary font-black text-sm">{(confirmOrder.price || 0) + (confirmOrder.itemCost || 0)} {CURRENCY}</span>
                                  </div>
                                  {confirmOrder.itemCost !== undefined && confirmOrder.itemCost > 0 && <div className="bg-primary/5 p-2 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-400 space-y-1">
                                          <div className="flex justify-between">
                                              <span>{t("ar_258")}</span>
                                              <span>{confirmOrder.price} {CURRENCY}</span>
                                          </div>
                                          <div className="flex justify-between text-primary">
                                              <span>{t("ar_323")}</span>
                                              <span>{confirmOrder.itemCost} {CURRENCY}</span>
                                          </div>
                                      </div>}
                                  {confirmOrder.payer && <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                                          <span className="text-gray-400 font-bold">{t("ar_324")}</span>
                                          <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-[10px]">
                                              {confirmOrder.payer === 'RECIPIENT' ? t("ar_177") : t("ar_176")}
                                          </span>
                                      </div>}
                              </div>
                          </div>

                          {/* Recipient Details Section */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-2 mb-3 text-secondary">
                                  <MapPin size={18} />
                                  <span className="font-extrabold text-sm text-gray-700 dark:text-gray-300">{t("ar_325")}</span>
                              </div>
                              
                              <div className="space-y-2 text-right">
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400 font-bold">{t("ar_326")}</span>
                                      <span className="text-gray-800 dark:text-white font-mono font-bold">{confirmOrder.recipientPhone || t("ar_316")}</span>
                                  </div>
                                  <div className="flex justify-between items-start text-xs">
                                      <span className="text-gray-400 font-bold flex-shrink-0">{t("ar_327")}</span>
                                      <span className="text-gray-800 dark:text-white font-bold text-left rtl:text-right">{confirmOrder.deliveryAddress.title} - {confirmOrder.deliveryAddress.details}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Required Verification Checkboxes */}
                          <div className="space-y-3 pt-2">
                              <label className="flex items-start gap-3 p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl cursor-pointer select-none">
                                  <input type="checkbox" checked={checkedDetailsValid} onChange={e => setCheckedDetailsValid(e.target.checked)} className="mt-1 accent-primary w-4 h-4 rounded" />
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed text-right">{t("ar_328")}</span>
                              </label>

                              <label className="flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl cursor-pointer select-none">
                                  <input type="checkbox" checked={checkedRecipientValid} onChange={e => setCheckedRecipientValid(e.target.checked)} className="mt-1 accent-secondary w-4 h-4 rounded" />
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed text-right">{t("ar_329")}</span>
                              </label>
                          </div>

                      </div>

                      {/* Actions */}
                      <div className="p-6 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                          <Button fullWidth disabled={!checkedDetailsValid || !checkedRecipientValid || isFinishingDelivery} onClick={async () => {
                setIsFinishingDelivery(true);
                const success = await handleDeliverySuccess(confirmDeliveryOrderId);
                setIsFinishingDelivery(false);
                if (success) {
                  setConfirmDeliveryOrderId(null);
                  setManualCode('');
                  setCheckedDetailsValid(false);
                  setCheckedRecipientValid(false);
                  toast.success(t("ar_330"));
                }
              }} size="lg">
                              {isFinishingDelivery ? <Loader2 className="animate-spin" /> : t("ar_331")}
                          </Button>
                          
                          <button onClick={cancelConfirmDelivery} disabled={isFinishingDelivery} className="w-full text-center text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-2.5 transition-colors">{t("ar_332")}</button>
                      </div>
                  </div>
              </div>;
      })()}


      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Rating Card */}
        <div onClick={() => setShowRatingDetails(true)} className="bg-secondary dark:bg-blue-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white relative overflow-hidden chunk-shadow group cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="bg-white/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                        <Star size={16} className="sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300" />
                    </span>
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold">{t('details')}</span>
                </div>
                <div className="text-xl sm:text-3xl font-black mb-0.5 sm:mb-1">{avgRating} / 5</div>
                <div className="text-blue-100 text-[10px] sm:text-sm font-bold">{t('overallPerformance')}</div>
            </div>
            {/* Background Decoration */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Completed Orders Card */}
        <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-gray-100 dark:border-gray-700 chunk-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                    <CheckCircle size={16} className="sm:w-5 sm:h-5" />
                </span>
                <span className="text-gray-400 text-[9px] sm:text-xs font-bold">{t("ar_333")}</span>
            </div>
            <div>
                <div className="text-xl sm:text-3xl font-black text-gray-800 dark:text-white mb-0.5 sm:mb-1">{completedOrdersCount}</div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-sm font-bold">{t('totalOrders')}</div>
            </div>
        </div>
      </div>


      {isLimitReached && <div className="bg-orange-50 border-2 border-orange-100 p-3 rounded-2xl flex items-center gap-3 text-orange-700 text-sm font-bold">
              <div className="bg-orange-100 p-2 rounded-full"><AlertTriangle size={20} /></div>
              <div>{t("ar_334")}</div>
          </div>}

      {/* Toggle Tabs & Actions */}
      <div className="flex gap-2 items-center">
          <div className="flex flex-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl overflow-x-auto gap-1">
            <button className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === 'available' ? 'bg-white dark:bg-gray-700 shadow-lg text-primary scale-102' : 'text-gray-500'}`} onClick={() => setActiveTab('available')}>
                <Package size={14} />{t("ar_335")}{isOnline ? availableOrders.length : '-'})
            </button>
            <button className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === 'active' ? 'bg-white dark:bg-gray-700 shadow-lg text-primary scale-102' : 'text-gray-500'}`} onClick={() => setActiveTab('active')}>
                <Truck size={14} />{t("ar_336")}{myActiveOrders.length})
            </button>
          </div>
          
          <button onClick={handleRefresh} className={`bg-gray-100 dark:bg-gray-800 p-3.5 rounded-2xl text-gray-600 dark:text-gray-300 hover:text-primary transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`} title={t("ar_337")}>
              <RefreshCw size={20} />
          </button>
      </div>

      {/* Orders List */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
        {activeTab === 'available' && !isOnline ? <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                 <Power size={48} className="mx-auto text-gray-300 mb-2" />
                 <p className="text-gray-500 font-bold mb-1">{t('youAreOfflineStatus')}</p>
                 <p className="text-xs text-gray-400">{t('changeStatusToReceive')}</p>
                 <button onClick={handleToggleStatus} className="mt-4 text-primary font-bold text-sm hover:underline">{t("ar_338")}</button>
             </div> : (activeTab === 'available' ? availableOrders : myActiveOrders).map(order => {
          const typeConfig = WORKFLOW_CONFIG[order.type as keyof typeof WORKFLOW_CONFIG];
          const nextStep = typeConfig ? typeConfig[order.status as keyof typeof typeConfig] as any : null;
          const isActionable = activeTab === 'active';
          const customer = users.find(u => String(u.id) === String(order.customerId));
          return <div key={order.id} onClick={() => setSelectedOrder(order)} // CLICK TO OPEN FULL DETAILS
          className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 shadow-md border border-gray-100 dark:border-gray-800 relative overflow-hidden flex flex-col justify-between h-full cursor-pointer hover:border-primary transition-colors">
                    {/* LIVE TRACKING INDICATOR - ONLY FOR ACTIVE TAB & ACTIVE TRACKING */}
                    {isActionable && isTrackingActive && <>
                            <div className={`absolute top-0 left-0 w-full h-1.5 ${order.isCustomerMonitoring ? 'bg-orange-500 animate-pulse' : 'bg-green-500 animate-pulse'} z-30`}></div>
                            <div className={`absolute top-2 left-2 ${order.isCustomerMonitoring ? 'bg-orange-600' : 'bg-green-600'} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-30 flex items-center gap-1 ${order.isCustomerMonitoring ? 'animate-pulse' : 'animate-bounce'}`}>
                                {order.isCustomerMonitoring ? <Eye size={12} className="animate-spin-slow" /> : <div className="w-2 h-2 bg-white rounded-full"></div>}
                                {order.isCustomerMonitoring ? t("ar_339") : t("ar_340")}
                            </div>
                        </>}

                    <div>
                        {/* Status and Type Banner */}
                        <div className="absolute top-0 right-0 flex shadow-sm z-20">
                            <div className="bg-accent text-black text-[10px] font-bold px-3 py-1 rounded-br-3xl">
                                {order.status.replace(/_/g, ' ')}
                            </div>
                            <div className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-3xl">
                                {ORDER_TYPE_LABELS[order.type] || order.type}
                            </div>
                        </div>

                        {/* Double order / Solo order permit badge */}
                        <div className="absolute top-8 right-2 flex gap-1 z-20">
                            {/* Tags placeholder */}
                        </div>

                        {/* Cancellation Request Banner - URGENT & RED */}
                        {order.cancellationRequest && <div className="bg-red-600 text-white text-xs font-black p-3 rounded-xl mb-4 mt-6 flex flex-col gap-1 text-center shadow-lg animate-pulse">
                                 <div className="flex items-center justify-center gap-2 mb-1">
                                     <AlertTriangle size={20} className="fill-current text-yellow-300" />
                                     <span className="text-sm">{t("ar_341")}</span>
                                 </div>
                                 <p>{t("ar_342")}</p>
                             </div>}

                        <div className="flex gap-3 mt-6">
                            {/* MAP BUTTON */}
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0 overflow-hidden relative border border-gray-300 dark:border-gray-600 active:scale-95 transition-transform" onClick={e => openMapLocation(order, e)}>
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-primary">
                                    <MapPin size={24} />
                                </div>
                                {order.deliveryAddress.lat && order.deliveryAddress.lng && <div className="absolute bottom-0 inset-x-0 bg-green-500 text-white text-[7px] font-bold text-center py-0.5">
                                        GPS
                                    </div>}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base mb-0.5 truncate text-gray-800 dark:text-white">{order.items}</h3>
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-0.5 truncate">
                                    <Store size={12} />
                                    {order.pickupAddress}
                                </div>
                                {/* FULL ADDRESS DISPLAY FIX */}
                                <div className="text-gray-500 dark:text-gray-400 text-xs">
                                    <div className="flex items-center gap-1 font-bold text-primary">
                                        <MapPin size={12} />
                                        {order.deliveryAddress.title}
                                    </div>
                                    <div className="text-[10px] mr-4 opacity-70 line-clamp-1">
                                        {order.deliveryAddress.details}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Tag & Attachments */}
                        <div className="mt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="text-primary font-black text-lg">{order.price} <span className="text-[10px] font-medium text-gray-500">{CURRENCY}</span></div>
                                
                                {/* ATTACHMENTS INDICATORS */}
                                <div className="flex gap-1">
                                    {order.orderImageUrl && <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-1 rounded-md" title={t("ar_343")}>
                                            <Image size={12} />
                                        </div>}
                                    {(order.voiceNote || order.voiceNotes && order.voiceNotes.length > 0) && <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1 rounded-md" title={t("ar_344")}>
                                            <Mic size={12} />
                                        </div>}
                                </div>
                            </div>
                            <div className="text-[9px] text-gray-400 font-mono">#{order.id.slice(-4)}</div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4" onClick={e => e.stopPropagation()}>
                        {isActionable ? <div className="flex flex-col gap-2">
                                {/* ROW 1: MAIN ACTION (Full Width) */}
                                {nextStep ? <>
                                        {/* Special Case: Delivery Confirmation */}
                                        {nextStep.next === OrderStatus.DELIVERED ? <div className="grid grid-cols-1 gap-2">
                                                <button onClick={() => setShowCodeInputOrder(order.id)} className="bg-primary text-white font-bold py-4 px-2 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-orange-600 text-base">
                                                    <Keyboard size={22} />{t("ar_345")}</button>
                                            </div> : <button onClick={() => nextStep.requireProof ? handleProofAction(order.id, nextStep.next) : handleNoProofAction(order.id, nextStep.next)} className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 chunk-shadow transition-colors text-sm">
                                                <Camera size={20} />
                                                {nextStep.label}
                                            </button>}
                                    </> : <div className="w-full bg-green-100 text-green-700 text-center py-2 rounded-xl font-bold flex items-center justify-center gap-2">
                                        <CheckCircle size={18} />{t("ar_346")}</div>}

                                {/* ROW 2: CHAT BUTTON (Full Width) */}
                                <button onClick={e => {
                  e.stopPropagation();
                  setChatOrder(order);
                }} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 chunk-shadow transition-colors text-sm">
                                    <MessageCircle size={18} />{t("ar_347")}</button>

                                {/* ROW 3: WHATSAPP + CALL (Side by Side) */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={e => openWhatsApp(order.recipientPhone, order.id, e)} className="bg-green-500 text-white font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-2 chunk-shadow text-sm">
                                        <MessageCircle size={18} />{t("ar_348")}</button>
                                    <a href={`tel:${order.recipientPhone || '000'}`} onClick={e => e.stopPropagation()} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-gray-200">
                                        <Phone size={18} />{t("ar_349")}</a>
                                </div>
                            </div> : <div className="flex flex-col gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* DETAILS BUTTON */}
                                    <button onClick={() => setSelectedOrder(order)} className="col-span-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors">
                                        <Eye size={18} />{t("ar_350")}</button>
                                    {/* ACCEPT BUTTON */}
                                    <button onClick={e => handleAccept(order.id, e)} disabled={isLimitReached} className={`col-span-2 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 chunk-shadow transition-colors ${isLimitReached ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-blue-600 text-white disabled:opacity-50'}`}>
                                        {isLimitReached ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                                        {isLimitReached ? t("ar_351") : `Accept for ${order.price} EGP`}
                                    </button>
                                </div>

                                {/* BID/COUNTER OFFER SLIDE-IN */}
                            </div>}
                    </div>
                </div>;
        })}

        {activeTab === 'available' && isOnline && availableOrders.length === 0 && <div className="col-span-full text-center py-12 opacity-50">
                 <div className="material-icons-round text-6xl text-gray-300 mb-2">inbox</div>
                 <p>{t('noOrdersNow')}</p>
             </div>}
      </section>
    </div>
    </>;
};