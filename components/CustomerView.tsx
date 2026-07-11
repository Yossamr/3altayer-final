import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../services/AppContext';
import { useLanguage } from '../services/LanguageContext';
import { OrderType, Address, Order, OrderStatus, Role } from '../types';
import { Button } from './ui/Button';
import { StatusBadge } from './StatusBadge';
import { OrderDetailsModal } from './OrderDetailsModal';
import { OnboardingWizard } from './OnboardingWizard';
import { ChatModal } from './ChatModal';
import { AudioPlayer } from "./AudioPlayer";
import { LocationPicker } from './LocationPicker'; // Import
import { MapPin, Clock, Plus, Trash2, Phone, Package, ShoppingBag, ArrowRight, Wallet, Navigation, User, ChevronRight, CheckSquare, Square, X, Banknote, DollarSign, QrCode, MessageCircle, Users, LocateFixed, RefreshCw, Loader2, CheckCircle, Sparkles, AlertCircle, Globe, Shield, Camera, Mic, Image, Play, Upload, Download, ClipboardList, Coins } from 'lucide-react';
import { CURRENCY, ORDER_TYPE_LABELS, FLAT_RATES } from '../constants';
interface CustomerViewProps {
  initialView?: 'list' | 'create' | 'addresses';
  adminCreateMode?: boolean;
}

// --- HELPER: Sanitize Phone ---
const sanitizePhoneInput = (val: string) => {
  let cleanVal = val.replace(/[٠-٩]/g, d => '0123456789'["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
  return cleanVal.replace(/\D/g, '');
};

// --- EXPANDED QR MODAL ---
const ExpandedQRModal: React.FC<{
  code: string;
  driverPhone?: string;
  onClose: () => void;
}> = ({
  code,
  driverPhone,
  onClose
}) => {
  const {
    language,
    t
  } = useLanguage();
  const handleSendWhatsapp = () => {
    const message = language === 'ar' ? `كود الاستلام الخاص بطلبي هو: *${code}*` : `My order delivery verification code is: *${code}*`;
    let url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (driverPhone) {
      url = `https://wa.me/2${driverPhone}?text=${encodeURIComponent(message)}`;
    }
    window.open(url, '_blank');
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col items-center">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200">
                    <X size={24} className="text-gray-500" />
                </button>
                
                <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">{t('deliveryCode')}</h3>
                <p className="text-gray-500 text-sm font-bold mb-6">{language === 'ar' ? t("ar_169") : 'Let the driver scan the code or share it with him'}</p>
                
                <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-gray-100 dark:border-gray-700 mb-6">
                    <img referrerPolicy="no-referrer" src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${code}`} alt="QR Code" className="w-64 h-64 object-contain" />
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-2xl mb-6">
                    <span className="font-mono text-3xl font-black tracking-[0.5em] text-primary">{code}</span>
                </div>

                <button onClick={handleSendWhatsapp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
                    <MessageCircle size={24} />
                    {language === 'ar' ? t("ar_170") : 'Send to Driver via WhatsApp'}
                </button>
            </div>
        </div>;
};
export const CustomerView: React.FC<CustomerViewProps> = ({
  initialView = 'list',
  adminCreateMode = false
}) => {
  const {
    currentUser,
    orders,
    zones,
    createOrder,
    addAddress,
    deleteAddress,
    users,
    manualRefresh,
    cancelOrder,
    autoOpenChatId,
    clearAutoOpenChat
  } = useApp();
  const {
    language,
    t,
    dir
  } = useLanguage();
  const isAr = language === 'ar';
  const [view, setView] = useState<'list' | 'create' | 'addresses'>(initialView);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Interactive Onboarding Guide State (saves to localStorage per user to support new login visibility)
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    if (currentUser?.id && currentUser?.role === Role.CUSTOMER) {
      try {
        const hasHidden = localStorage.getItem(`hide_how_it_works_${currentUser.id}`) === 'true';
        setShowGuide(!hasHidden);
      } catch {
        setShowGuide(true);
      }
    } else {
      setShowGuide(false);
    }
  }, [currentUser]);
  const handleDismissGuide = () => {
    setShowGuide(false);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`hide_how_it_works_${currentUser.id}`, 'true');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // New Address UI State
  const [newAddrTitle, setNewAddrTitle] = useState('');
  const [newAddrDetails, setNewAddrDetails] = useState('');
  const [newAddrZone, setNewAddrZone] = useState(zones[0]?.id || '');
  const [tempCoords, setTempCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);
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
  const handleQuickCancel = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = language === 'ar' ? t("ar_171") : "Are you sure you want to cancel this order permanently?";
    if (confirm(confirmMsg)) {
      cancelOrder(orderId);
      setActiveSegment('past');
    }
  };

  // --- Create Order State ---
  const [orderType, setOrderType] = useState<OrderType>(OrderType.SHOPPING);
  const [items, setItems] = useState('');
  const [restaurantName, setRestaurantName] = useState(''); // Store name
  const [selectedAddrId, setSelectedAddrId] = useState(currentUser?.savedAddresses?.[0]?.id || '');
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupPhone, setPickupPhone] = useState(currentUser?.phone || '');
  const [recipientDetails, setRecipientDetails] = useState('');
  const [recipientZoneId, setRecipientZoneId] = useState('');
  const [packageDirection, setPackageDirection] = useState<'SEND' | 'RECEIVE' | null>(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  useEffect(() => {
    if (orderType === OrderType.PICK_DROP) {
      const addrObj = currentUser?.savedAddresses?.find(a => a.id === selectedAddrId);
      if (packageDirection === 'SEND') {
        // "توصيل طرد": I am sending it. So "منين" (pickupLocation) is my address.
        if (addrObj) {
          setPickupLocation(addrObj.details);
          setPickupPhone(currentUser?.phone || '');
        } else {
          setPickupLocation('');
          setPickupPhone('');
        }
        // Clear recipient details so they can type
        setRecipientDetails('');
        setRecipientPhone('');
        setRecipientZoneId('');
      } else if (packageDirection === 'RECEIVE') {
        // "استلام طرد": I am receiving it. So "على فين" (recipientDetails) is my address.
        if (addrObj) {
          setRecipientDetails(addrObj.details);
          setRecipientPhone(currentUser?.phone || '');
          setRecipientZoneId(addrObj.zoneId);
        } else {
          setRecipientDetails('');
          setRecipientPhone('');
          setRecipientZoneId('');
        }
        // Clear pickup so they can type where to fetch it from
        setPickupLocation('');
        setPickupPhone('');
      }
    }
  }, [packageDirection, selectedAddrId, orderType, currentUser]);
  const [hasCollection, setHasCollection] = useState(false);
  const [collectionAmount, setCollectionAmount] = useState<number | ''>('');
  const [payer, setPayer] = useState<'SENDER' | 'RECIPIENT'>('RECIPIENT');

  // --- Attachments State ---
  const [imageAsset, setImageAsset] = useState<string | null>(null);
  const [audioAssets, setAudioAssets] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingIntentRef = useRef(false);
  const isCancelledRef = useRef(false);
  const recordStartTimestampRef = useRef<number>(0);
  const [isTapMode, setIsTapMode] = useState(false);
  const handleVoiceStart = (e?: React.SyntheticEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (isRecording) {
      if (isTapMode) {
        // Clicked again in Tap-to-Record mode: standard save
        stopRecording(false);
        setIsTapMode(false);
      }
      return;
    }
    recordStartTimestampRef.current = Date.now();
    startRecording();
  };
  const handleVoiceEnd = (e?: React.SyntheticEvent) => {
    if (e && e.cancelable) e.preventDefault();
    const holdTime = Date.now() - recordStartTimestampRef.current;
    if (holdTime < 350) {
      // If the hold was shorter than 350ms, the client tapped. Activate tap mode.
      setIsTapMode(true);
    } else {
      // If they held the button down, stop the recording on release.
      stopRecording(false);
      setIsTapMode(false);
    }
  };
  const startRecording = async (e?: React.SyntheticEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(t("ar_172"));
      return;
    }
    isRecordingIntentRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      if (!isRecordingIntentRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const mimeTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/wav'];
      let selectedType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }
      const options = selectedType ? {
        mimeType: selectedType
      } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: selectedType || 'audio/webm'
        });
        if (!isCancelledRef.current) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            setAudioAssets(prev => [...prev, reader.result as string]);
          };
        }
        stream.getTracks().forEach(track => track.stop());
      };
      setIsRecording(true);
      isCancelledRef.current = false;
      setRecordingTime(0);
      recorder.start();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      isRecordingIntentRef.current = false;
      toast.error(t("ar_173"));
    }
  };
  const stopRecording = (cancel = false, e?: React.SyntheticEvent) => {
    if (e && e.cancelable) e.preventDefault();
    isRecordingIntentRef.current = false;
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    isCancelledRef.current = cancel;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const handleTouchMoveOut = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isRecordingIntentRef.current) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target !== e.currentTarget && !e.currentTarget.contains(target as Node)) {
      stopRecording(true);
    }
  };
  const removeAudio = (index: number) => {
    setAudioAssets(prev => prev.filter((_, i) => i !== index));
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error(t("ar_174"));
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => setImageAsset(reader.result as string);
    }
  };
  const myOrders = (orders || []).filter(o => o.customerId === currentUser?.id || o.recipientPhone && o.recipientPhone === currentUser?.phone).sort((a, b) => b.createdAt - a.createdAt);
  const activeOrders = myOrders.filter(o => {
    const isTerminal = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED || o.status === OrderStatus.RETURNED;
    if (!isTerminal) return true;

    // If terminal but VERY RECENT (last 10 mins), keep in active so user sees final state
    const lastEvent = o.timeline[o.timeline.length - 1]?.timestamp || o.createdAt;
    const isVeryRecent = Date.now() - lastEvent < 10 * 60 * 1000;
    return isVeryRecent;
  });
  const pastOrders = myOrders.filter(o => {
    const isTerminal = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED || o.status === OrderStatus.RETURNED;
    if (!isTerminal) return false;
    const lastEvent = o.timeline[o.timeline.length - 1]?.timestamp || o.createdAt;
    const isVeryRecent = Date.now() - lastEvent < 10 * 60 * 1000;
    return !isVeryRecent; // If very recent, it's in 'active' tab
  });
  const [activeSegment, setActiveSegment] = useState<'active' | 'past'>('active');
  const getSelectedSavedAddr = () => currentUser?.savedAddresses?.find(a => a.id === selectedAddrId);
  const calculateDeliveryPrice = () => {
    let zoneIdToUse = '';
    if (orderType === OrderType.SHOPPING || orderType === OrderType.EMERGENCY) {
      zoneIdToUse = getSelectedSavedAddr()?.zoneId || '';
    } else {
      zoneIdToUse = recipientZoneId;
    }
    const z = zones.find(z => z.id === zoneIdToUse);
    if (!z) return FLAT_RATES[orderType] || 0;
    return z.prices?.[orderType] ?? z.price;
  };
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    let finalPickupAddress = '';
    let finalDeliveryAddress: Address;
    let finalRecipientPhone = '';
    let finalNotes = '';
    const deliveryPrice = calculateDeliveryPrice();
    const finalHasCollection = hasCollection;
    const itemCost = finalHasCollection && collectionAmount ? Number(collectionAmount) : 0;
    const totalDue = deliveryPrice + itemCost;
    if (!items.trim()) return toast.error(t("ar_175"));
    let paymentNote = finalHasCollection ? `\n--- Payment Details ---\nAmount to collect/pay: ${totalDue} ${CURRENCY}\nPayer: ${payer === 'SENDER' ? t("ar_176") : t("ar_177")}` : `\n--- Payment Details ---\nDelivery fee only: ${deliveryPrice} ${CURRENCY}`;
    if (orderType === OrderType.SHOPPING) {
      if (!getSelectedSavedAddr()) return toast.error(t("ar_178"));
      if (!restaurantName) return toast.error(t("ar_179"));
      finalPickupAddress = restaurantName;
      finalDeliveryAddress = getSelectedSavedAddr()!;
      finalRecipientPhone = currentUser?.phone || '';
      finalNotes = paymentNote;
    } else if (orderType === OrderType.EMERGENCY) {
      if (!getSelectedSavedAddr()) return toast.error(t("ar_180"));
      if (!restaurantName) return toast.error(t("ar_181"));
      finalPickupAddress = `Destination (Go and Return): ${restaurantName}`;
      finalDeliveryAddress = getSelectedSavedAddr()!;
      finalRecipientPhone = currentUser?.phone || '';
      finalNotes = paymentNote;
    } else if (orderType === OrderType.PICK_DROP || orderType === OrderType.GOVERNORATE) {
      if (!pickupLocation) return toast.error(t("ar_182"));
      if (!recipientDetails) return toast.error(t("ar_183"));
      if (!recipientZoneId) return toast.error(t("ar_184"));
      if (!recipientPhone) return toast.error(t("ar_185"));
      finalPickupAddress = pickupLocation;
      finalNotes = `--- Sender Details --- \nPhone: ${pickupPhone}\n--- Recipient Details ---\nPhone: ${recipientPhone}\n${paymentNote}\n\nService Type: ${orderType === OrderType.PICK_DROP ? packageDirection === 'SEND' ? t("ar_186") : t("ar_187") : t("ar_188")}`;
      // Use details as title so it's prominent for the driver
      finalDeliveryAddress = {
        id: `temp-${Date.now()}`,
        title: recipientDetails,
        details: t("ar_189"),
        zoneId: recipientZoneId
      };
      finalRecipientPhone = recipientPhone;
    }
    setIsRefreshing(true);
    const createData: Partial<Order> = {
      type: orderType,
      items,
      pickupAddress: finalPickupAddress,
      deliveryAddress: finalDeliveryAddress!,
      price: deliveryPrice,
      itemCost,
      payer: payer,
      recipientPhone: finalRecipientPhone,
      notes: finalNotes,
      orderImageUrl: imageAsset || undefined,
      voiceNotes: audioAssets.length > 0 ? audioAssets : undefined
    };
    if (orderType === OrderType.SHOPPING || orderType === OrderType.EMERGENCY) {
      const addr = getSelectedSavedAddr();
      if (addr?.lat && addr?.lng) {
        createData.pickupLat = addr.lat;
        createData.pickupLng = addr.lng;
      }
    } else {
      if (finalDeliveryAddress!.lat && finalDeliveryAddress!.lng) {
        createData.pickupLat = finalDeliveryAddress!.lat;
        createData.pickupLng = finalDeliveryAddress!.lng;
      }
    }
    createOrder(createData).then(success => {
      setIsRefreshing(false);
      if (success) {
        setView('list');
        setImageAsset(null);
        setAudioAssets([]);
      }
    });
  };
  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrTitle || !newAddrDetails) return toast.error(t("ar_190"));
    addAddress(currentUser!.id, {
      id: `addr-${Date.now()}`,
      title: newAddrTitle,
      details: newAddrDetails,
      zoneId: newAddrZone,
      lat: tempCoords?.lat,
      lng: tempCoords?.lng
    });
    setNewAddrTitle('');
    setNewAddrDetails('');
    setView('list');
    setTempCoords(null);
  };

  // --- SMART GEOLOCATION WITH REVERSE GEOCODING ---
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("ar_191"));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const {
        latitude,
        longitude
      } = pos.coords;
      setTempCoords({
        lat: latitude,
        lng: longitude
      });

      // TRY REVERSE GEOCODING (NOMINATIM - FREE)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
        const data = await response.json();
        if (data && data.display_name) {
          // Remove redundant country/postal code part to keep it clean
          const cleanAddress = data.display_name.split(',').slice(0, 4).join(',').trim();
          setNewAddrDetails(cleanAddress);
          if (!newAddrTitle) setNewAddrTitle(t("ar_192"));
        }
      } catch (e) {
        console.error("Geocoding failed", e);
      }
      setIsLocating(false);
    }, err => {
      setIsLocating(false);
      toast.error(t("ar_193"));
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  };
  const activeQrOrder = expandedQR ? orders.find(o => o.deliveryCode === expandedQR) : null;
  const activeQrDriver = activeQrOrder?.driverId ? users.find(u => String(u.id) === String(activeQrOrder.driverId)) : null;
  if (view === 'addresses') {
    return <div className="space-y-6">
               <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                       <ArrowRight size={20} className="rtl:rotate-180" />
                    </button>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">{t("ar_194")}</h2>
               </div>
               
               <div className="space-y-3">
                   {currentUser?.savedAddresses?.map(addr => <div key={addr.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                               <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-xl text-primary">
                                   <MapPin size={20} />
                               </div>
                               <div>
                                   <div className="font-bold text-gray-800 dark:text-white">{addr.title}</div>
                                   <div className="text-xs text-gray-500 line-clamp-1">{addr.details}</div>
                                   <div className="text-[10px] text-primary mt-1 flex items-center gap-1">
                                       {zones.find(z => z.id === addr.zoneId)?.name}
                                       {addr.lat && addr.lng && <span className="text-green-600 bg-green-100 dark:bg-green-900/30 px-1 rounded flex items-center">{t("ar_195")}</span>}
                                   </div>
                               </div>
                           </div>
                           <button onClick={() => deleteAddress(currentUser.id, addr.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                       </div>)}
               </div>

               <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl shadow-bold border-2 border-gray-100 dark:border-gray-700">
                   <h3 className="font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                       <Plus size={20} className="text-primary" />{t("ar_196")}</h3>
                   <form onSubmit={handleAddAddress} className="space-y-4">
                       
                       {/* AUTO LOCATION ACTION BUTTON - REDESIGNED TO BE PROMINENT */}
                       <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800">
                            <button type="button" onClick={handleGetCurrentLocation} disabled={isLocating} className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95 text-blue-600 border border-blue-100">
                                {isLocating ? <Loader2 className="animate-spin" /> : tempCoords ? <CheckCircle className="text-green-500" /> : <LocateFixed size={24} />}
                                <div className="text-right">
                                    <span className="block text-sm">{t("ar_197")}</span>
                                    <span className="block text-[10px] text-gray-400 font-normal">{t("ar_198")}</span>
                                </div>
                            </button>
                            {tempCoords && <div className="mt-2 text-[10px] text-green-600 dark:text-green-400 flex items-center justify-center gap-1 font-bold">
                                    <Sparkles size={12} />{t("ar_199")}</div>}
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_200")}</label>
                           <input required value={newAddrTitle} onChange={e => setNewAddrTitle(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:border-primary outline-none" placeholder={t("ar_201")} />
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_202")}</label>
                           <select value={newAddrZone} onChange={e => setNewAddrZone(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:border-primary outline-none">
                               {[...zones].filter(z => z.status === 'active' && !z.id.startsWith('gov-')).sort((a,b)=>a.name.localeCompare(b.name, isAr ? 'ar' : 'en')).map(z => <option key={z.id} value={z.id}>{z.name} - {z.price} {CURRENCY}</option>)}
                           </select>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_203")}</label>
                           <textarea required value={newAddrDetails} onChange={e => setNewAddrDetails(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:border-primary outline-none resize-none" rows={2} placeholder={t("ar_204")} />
                       </div>
                       
                       <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <label className="block text-xs font-bold text-gray-400 mb-2">{t("ar_205")}</label>
                            <LocationPicker key={tempCoords ? `${tempCoords.lat}-${tempCoords.lng}` : 'initial'} initialLat={tempCoords?.lat} initialLng={tempCoords?.lng} onLocationSelect={(lat, lng) => setTempCoords({
              lat,
              lng
            })} />
                       </div>

                       <Button fullWidth size="lg">{t("ar_206")}</Button>
                   </form>
               </div>
          </div>;
  }
  if (view === 'create') {
    return <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setView('list')} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <ArrowRight size={20} className="rtl:rotate-180" />
                </button>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">
                    {orderType === OrderType.SHOPPING && t("ar_121")}
                    {orderType === OrderType.EMERGENCY && t("ar_122")}
                    {orderType === OrderType.PICK_DROP && t("ar_186")}
                    {orderType === OrderType.GOVERNORATE && t("ar_188")}
                </h2>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-bold border-2 border-gray-100 dark:border-gray-700">
                    {orderType === OrderType.SHOPPING && <div className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_207")}</label>
                                <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary" placeholder={t("ar_208")} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_209")}</label>
                                <textarea required value={items} onChange={e => setItems(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary resize-none" rows={3} placeholder={t("ar_210")} />
                            </div>
                        </div>}

                    {orderType === OrderType.EMERGENCY && <div className="space-y-4 animate-in fade-in">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 flex items-start gap-3">
                                <AlertCircle size={18} className="text-purple-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-purple-700 font-bold leading-relaxed">{t("ar_211")}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_212")}</label>
                                <textarea required value={restaurantName} onChange={e => setRestaurantName(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-purple-500 resize-none" rows={2} placeholder={t("ar_213")} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_214")}</label>
                                <textarea required value={items} onChange={e => setItems(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-purple-500 resize-none" rows={3} placeholder={t("ar_215")} />
                            </div>
                        </div>}

                    {(orderType === OrderType.PICK_DROP || orderType === OrderType.GOVERNORATE) && <div className="space-y-4 animate-in fade-in">
                            {orderType === OrderType.PICK_DROP && packageDirection === null ? <div className="space-y-5 py-4 animate-in zoom-in-95 duration-300">
                                    <div className="text-center">
                                        <h3 className="font-black text-gray-800 dark:text-white text-lg">{t("ar_216")}</h3>
                                        <p className="text-gray-400 text-xs font-bold mt-1">{t("ar_217")}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Option 1: SEND */}
                                        <button type="button" onClick={() => setPackageDirection('SEND')} className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-gray-900/30 p-5 rounded-2xl border-2 border-blue-100 dark:border-blue-900/20 text-right flex items-center gap-4 hover:scale-[1.01] active:scale-99 transition-all shadow-sm w-full">
                                            <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                                                <Upload size={22} className="text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-extrabold text-sm text-blue-600 dark:text-blue-400">{t("ar_218")}</h4>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] mt-1 leading-normal">{t("ar_219")}</p>
                                            </div>
                                        </button>
                                        
                                        {/* Option 2: RECEIVE */}
                                        <button type="button" onClick={() => setPackageDirection('RECEIVE')} className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-gray-900/30 p-5 rounded-2xl border-2 border-orange-100 dark:border-orange-900/20 text-right flex items-center gap-4 hover:scale-[1.01] active:scale-99 transition-all shadow-sm w-full">
                                            <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                                                <Download size={22} className="text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-extrabold text-sm text-orange-600 dark:text-orange-400">{t("ar_220")}</h4>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] mt-1 leading-normal">{t("ar_221")}</p>
                                            </div>
                                        </button>
                                    </div>
                                </div> : <>
                                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-3">
                                        <span className="text-xl">🚚</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-emerald-800 dark:text-emerald-400 font-black leading-snug">{t("ar_222")}</p>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold mt-1">{t("ar_223")}</p>
                                        </div>
                                    </div>
                                    {orderType === OrderType.PICK_DROP && <div className="flex bg-gray-100/40 dark:bg-gray-800/40 backdrop-blur-md p-1 rounded-2xl border border-gray-100 dark:border-gray-800 mb-4 mt-2">
                                            <button type="button" onClick={() => setPackageDirection('SEND')} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 ${packageDirection === 'SEND' ? 'bg-white dark:bg-gray-700 shadow-md text-primary scale-102' : 'text-gray-400'}`}>{t("ar_224")}</button>
                                            <button type="button" onClick={() => setPackageDirection('RECEIVE')} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 ${packageDirection === 'RECEIVE' ? 'bg-white dark:bg-gray-700 shadow-md text-primary scale-102' : 'text-gray-400'}`}>{t("ar_225")}</button>
                                        </div>}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">{t("ar_226")}</label>
                                        <textarea required value={items} onChange={e => setItems(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary resize-none" rows={2} placeholder={t("ar_227")} />
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-800 mb-2">{orderType === OrderType.PICK_DROP ? packageDirection === 'SEND' ? t("ar_228") : t("ar_229") : t("ar_230")}</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-1">{t("ar_231")}</label>
                                                <textarea required rows={2} value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary text-sm resize-none" placeholder={t("ar_232")} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-1">{t("ar_233")}</label>
                                                <input required type="tel" maxLength={11} value={pickupPhone} onChange={e => setPickupPhone(sanitizePhoneInput(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary text-sm" placeholder="01xxxxxxxxx" dir="ltr" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-800 mb-2">{orderType === OrderType.PICK_DROP ? packageDirection === 'SEND' ? t("ar_234") : t("ar_235") : t("ar_236")}</h4>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 mb-1">{t("ar_237")}</label>
                                                    <input required type="tel" maxLength={11} value={recipientPhone} onChange={e => setRecipientPhone(sanitizePhoneInput(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary text-sm" placeholder="01xxxxxxxxx" dir="ltr" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 mb-1">{orderType === OrderType.GOVERNORATE ? t("ar_238") : t("ar_239")}{t("ar_240")}</label>
                                                    <select required value={recipientZoneId} onChange={e => setRecipientZoneId(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary text-xs">
                                                        <option value="">{t("ar_241")}</option>
                                                        {zones.filter(z => z.status === 'active' && (orderType === OrderType.GOVERNORATE ? z.id.startsWith('gov-') : !z.id.startsWith('gov-'))).sort((a,b)=>a.name.localeCompare(b.name, isAr ? 'ar' : 'en')).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-1">{t("ar_242")}</label>
                                                <textarea required rows={2} value={recipientDetails} onChange={e => setRecipientDetails(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-primary text-sm resize-none" placeholder={t("ar_243")} />
                                            </div>
                                        </div>
                                    </div>
                                </>}
                        </div>}

                    {(orderType !== OrderType.PICK_DROP || packageDirection !== null) && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-secondary" />
                                <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">{t("ar_244")}</span>
                            </div>
                            
                            <div className="flex gap-2">
                                {/* Image Picker */}
                                <div className="flex-1">
                                    <input type="file" id="order-image" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    <label htmlFor="order-image" className={`w-full flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${imageAsset ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary'}`}>
                                        {imageAsset ? <div className="relative w-full h-32 mt-2">
                                                <img referrerPolicy="no-referrer" src={imageAsset} className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800 rounded-lg" />
                                                <button type="button" onClick={e => {
                      e.preventDefault();
                      setImageAsset(null);
                    }} className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg">
                                                    <X size={14} />
                                                </button>
                                            </div> : <>
                                                <Camera size={24} className="text-gray-400 mb-1" />
                                                <span className="text-[10px] font-bold text-gray-500">{t("ar_245")}</span>
                                            </>}
                                    </label>
                                </div>

                                {/* Voice Note Recorder (Push to Talk) */}
                                <div className="flex-[2.5] flex flex-col gap-2">
                                    <button type="button" onMouseDown={handleVoiceStart} onMouseUp={handleVoiceEnd} onTouchStart={handleVoiceStart} onTouchEnd={handleVoiceEnd} onTouchMove={handleTouchMoveOut} onMouseLeave={() => isRecording && stopRecording(true)} className={`w-full h-[50px] flex items-center justify-center gap-2 rounded-2xl border-2 transition-all relative overflow-hidden select-none ${isRecording ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {isRecording ? <div className="flex items-center gap-2 px-1">
                                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                                                <div className="flex flex-col text-center">
                                                    <span className="text-[11px] font-black text-red-600 leading-none">
                                                        {isTapMode ? t("ar_246") : `Recording... ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, "0")}`}
                                                    </span>
                                                    {!isTapMode && <span className="text-[8px] text-red-400 font-extrabold whitespace-nowrap mt-0.5">{t("ar_247")}</span>}
                                                </div>
                                            </div> : <div className="flex items-center gap-1.5 justify-center">
                                                <Mic size={16} className="text-primary" />
                                                <div className="flex flex-col text-right">
                                                    <span className="text-xs font-black text-gray-700 dark:text-gray-200">{t("ar_248")}</span>
                                                    <span className="text-[8px] text-gray-400 font-extrabold leading-tight">{t("ar_249")}</span>
                                                </div>
                                            </div>}
                                    </button>

                                    {audioAssets.length > 0 && <div className="flex flex-col gap-2 w-full">
                                            {audioAssets.map((audio, idx) => <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl border border-secondary bg-blue-50 dark:bg-blue-900/20 w-full shrink-0 shadow-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-secondary p-1.5 rounded-full text-white shrink-0 shadow-sm">
                                                                <Mic size={14} />
                                                            </div>
                                                            <span className="text-xs font-black text-secondary">{t("ar_250")}{idx + 1}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeAudio(idx)} className="text-red-500 bg-red-100 hover:bg-red-200 p-1.5 rounded-full shrink-0 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <AudioPlayer src={audio} />
                                                </div>)}
                                        </div>}
                                </div>
                            </div>
                        </div>}

                    {(orderType === OrderType.SHOPPING || orderType === OrderType.EMERGENCY) && <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin size={18} className="text-primary" />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{t("ar_251")}</span>
                                </div>
                                <button type="button" onClick={() => setView('addresses')} className="text-xs text-primary font-bold flex items-center gap-1"><Plus size={14} />{t("ar_252")}</button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {currentUser?.savedAddresses?.map(addr => <button key={addr.id} type="button" onClick={() => setSelectedAddrId(addr.id)} className={`relative p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between text-right overflow-hidden ${selectedAddrId === addr.id ? 'border-primary bg-orange-50/50 dark:bg-orange-900/10' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200'}`}>
                                        {selectedAddrId === addr.id && <div className="absolute top-0 right-0 w-1 h-full bg-primary" />}
                                        <div className="flex-1 min-w-0 pr-1">
                                            <div className={`font-black text-sm mb-0.5 ${selectedAddrId === addr.id ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>{addr.title}</div>
                                            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate">{addr.details}</div>
                                            <div className="text-[10px] text-primary/60 font-bold mt-1">{t("ar_131")}{zones.find(z => z.id === addr.zoneId)?.prices?.[orderType]} {CURRENCY}</div>
                                        </div>
                                        <div className={`shrink-0 ml-2 ${selectedAddrId === addr.id ? 'text-primary' : 'text-gray-300'}`}>
                                            {selectedAddrId === addr.id ? <CheckCircle size={20} className="animate-in zoom-in" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                                        </div>
                                    </button>)}
                                {(!currentUser?.savedAddresses || currentUser.savedAddresses.length === 0) && <button type="button" onClick={() => setView('addresses')} className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 font-bold text-sm flex flex-col items-center gap-2">
                                        <MapPin size={24} />
                                        <span>{t("ar_253")}</span>
                                    </button>}
                            </div>
                        </div>}
                </div>

                {/* COLLECTION SECTION */}
                {orderType !== OrderType.EMERGENCY && (orderType !== OrderType.PICK_DROP || packageDirection !== null) && <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-bold border-2 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Banknote size={20} className="text-green-500" />
                                <span className="font-bold text-gray-800 dark:text-white">{t("ar_254")}</span>
                            </div>
                            <button type="button" onClick={() => setHasCollection(!hasCollection)} className={`w-12 h-6 rounded-full transition-colors relative ${hasCollection ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasCollection ? 'right-7' : 'right-1'}`} />
                            </button>
                        </div>

                        {hasCollection && <div className="space-y-4 animate-in fade-in">
                                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{t("ar_255")}</p>
                                <div className="relative">
                                    <input type="number" value={collectionAmount} onChange={e => setCollectionAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 pl-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:border-green-500 font-bold text-lg" placeholder={t("ar_256")} />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{CURRENCY}</span>
                                </div>


                            </div>}
                    </div>}
                
                <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-400">{t("ar_257")}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setPayer('RECIPIENT')} className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 ${payer === 'RECIPIENT' ? 'border-primary bg-orange-50 dark:bg-orange-900/10 text-primary' : 'border-gray-100 dark:border-gray-800 text-gray-500'}`}>
                                <Users size={16} />{t("ar_177")}</button>
                            <button type="button" onClick={() => setPayer('SENDER')} className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 ${payer === 'SENDER' ? 'border-primary bg-orange-50 dark:bg-orange-900/10 text-primary' : 'border-gray-100 dark:border-gray-800 text-gray-500'}`}>
                                <User size={16} />{t("ar_176")}</button>
                        </div>
                    </div>
                </div>

                {/* PRICE SUMMARY */}
                {(orderType !== OrderType.PICK_DROP || packageDirection !== null) && <>
                        <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-bold border-2 border-primary/20">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-sm font-bold">{t("ar_258")}</span>
                                <span className="font-bold">
                                    {calculateDeliveryPrice()} {CURRENCY}
                                </span>
                            </div>
                            {hasCollection && collectionAmount !== '' && <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-500 text-sm font-bold">{t("ar_259")}</span>
                                    <span className="font-bold">{collectionAmount} {CURRENCY}</span>
                                </div>}
                            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <span className="text-xl font-black text-gray-800 dark:text-white">{t("ar_260")}</span>
                                <span className="text-2xl font-black text-primary">
                                    {calculateDeliveryPrice() + (hasCollection && typeof collectionAmount === 'number' ? collectionAmount : 0)} {CURRENCY}
                                </span>
                            </div>
                            {payer && <div className="mt-2 text-center text-xs font-bold text-gray-500">{t("ar_261")}<span className="text-orange-600">{payer === 'RECIPIENT' ? t("ar_177") : t("ar_176")}</span>)
                                </div>}
                        </div>

                                                <div className="grid grid-cols-5 gap-3">
                           <Button onClick={() => setView('list')} type="button" variant="outline" className="col-span-1 h-12 rounded-2xl"><X size={20} /></Button>
                           <Button type="submit" className="col-span-4 h-12 text-base font-black shadow-xl shadow-orange-200 bg-gradient-to-r from-primary to-orange-500 rounded-2xl">{t("ar_262")}</Button>
                        </div>
                    </>}
            </form>
        </div>;
  }
  return <div className="space-y-6 pb-24">
      {expandedQR && <ExpandedQRModal code={expandedQR} driverPhone={activeQrDriver?.phone} onClose={() => setExpandedQR(null)} />}
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
      {chatOrder && <ChatModal order={orders.find(o => o.id === chatOrder.id) || chatOrder} onClose={() => setChatOrder(null)} />}

      {/* --- PREMIUM ONBOARDING GUIDE OVERLAY --- */}
      <AnimatePresence>
        {showGuide && (
          <OnboardingWizard onClose={handleDismissGuide} />
        )}
      </AnimatePresence>

      {/* --- HERO: Simple Grid --- */}
      <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex flex-col text-right">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">{t("ar_278")}</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">{t("ar_279")}</p>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
                  {/* مشتريات */}
                  <motion.button whileHover={{
          scale: 1.01
        }} whileTap={{
          scale: 0.98
        }} onClick={() => {
          setOrderType(OrderType.SHOPPING);
          setView('create');
        }} className="bg-white dark:bg-gray-800 p-3 rounded-2xl flex items-center justify-between shadow-sm border border-orange-100 dark:border-gray-700 relative overflow-hidden text-right">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-50 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                              <ShoppingBag size={20} className="text-[#FF7F27]" />
                          </div>
                          <div>
                              <h3 className="font-black text-sm text-gray-800 dark:text-gray-100 flex items-center gap-1.5">{t("ar_280")}<span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[8px] animate-pulse">{t("ar_281")}</span>
                              </h3>
                              <p className="text-gray-400 font-bold text-[10px] mt-0.5">{t("ar_282")}</p>
                          </div>
                      </div>
                  </motion.button>

                  {/* توصيل طرد */}
                  <div className="grid grid-cols-2 gap-2.5">
                      <motion.button whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} onClick={() => {
            setOrderType(OrderType.PICK_DROP);
            setPackageDirection(null);
            setView('create');
          }} className="bg-white dark:bg-gray-800 p-3 rounded-2xl flex flex-col items-center text-center shadow-sm border border-blue-100 dark:border-gray-700 gap-2">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                              <Package size={20} className="text-blue-500" />
                          </div>
                          <div>
                              <h3 className="font-black text-xs text-gray-800 dark:text-gray-100">{t("ar_186")}</h3>
                              <p className="text-gray-400 font-bold text-[9px] mt-0.5">{t("ar_283")}</p>
                          </div>
                      </motion.button>

                      <motion.button whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} onClick={() => {
            setOrderType(OrderType.EMERGENCY);
            setView('create');
          }} className="bg-white dark:bg-gray-800 p-3 rounded-2xl flex flex-col items-center text-center shadow-sm border border-red-100 dark:border-gray-700 gap-2">
                          <div className="w-10 h-10 bg-red-50 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                              <RefreshCw size={20} className="text-red-500" />
                          </div>
                          <div>
                              <h3 className="font-black text-xs text-gray-800 dark:text-gray-100">{t("ar_284")}</h3>
                              <p className="text-gray-400 font-bold text-[9px] mt-0.5">{t("ar_285")}</p>
                          </div>
                      </motion.button>
                  </div>

                  {/* شحن محافظات */}
                  <motion.button whileHover={{
          scale: 1.01
        }} whileTap={{
          scale: 0.98
        }} onClick={() => {
          setOrderType(OrderType.GOVERNORATE);
          setView('create');
        }} className="bg-gradient-to-l from-green-50 to-white dark:from-gray-800 dark:to-gray-800 p-3 rounded-2xl flex items-center justify-between shadow-sm border border-green-100 dark:border-gray-700 relative overflow-hidden text-right">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                              <Globe size={20} className="text-[#2ec4b6]" />
                          </div>
                          <div>
                              <h3 className="font-black text-sm text-gray-800 dark:text-gray-100">{t("ar_286")}</h3>
                              <p className="text-gray-400 font-bold text-[10px] mt-0.5">{t("ar_287")}</p>
                          </div>
                      </div>
                  </motion.button>
              </div>
      </div>
      {!adminCreateMode && <>
      <div className="flex justify-between items-center px-2 pt-6">
          <div className="flex flex-col">
              <h2 className="text-xl font-black text-gray-800 dark:text-white leading-none">{t("ar_288")}</h2>
              <span className="text-gray-400 text-[10px] font-bold mt-1">{t("ar_289")}</span>
          </div>
          <div className="flex gap-2">
             <button onClick={handleRefresh} className={`w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all active:scale-90 border border-gray-100 dark:border-gray-700 shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} />
             </button>
             <button onClick={() => setView('addresses')} className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all active:scale-90 border border-gray-100 dark:border-gray-700 shadow-sm">
                <MapPin size={18} />
             </button>
          </div>
      </div>

      <div className="space-y-4">
          <div className="flex bg-gray-100/40 dark:bg-gray-800/40 backdrop-blur-md p-1 rounded-2xl border border-gray-100 dark:border-gray-800">
              <button onClick={() => setActiveSegment('active')} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 ${activeSegment === 'active' ? 'bg-white dark:bg-gray-700 shadow-md text-primary scale-102' : 'text-gray-400'}`}>{t("ar_290")}{activeOrders.length})
              </button>
              <button onClick={() => setActiveSegment('past')} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 ${activeSegment === 'past' ? 'bg-white dark:bg-gray-700 shadow-md text-primary scale-102' : 'text-gray-400'}`}>{t("ar_291")}{pastOrders.length})
              </button>
          </div>
          
          {(activeSegment === 'active' ? activeOrders : pastOrders).length === 0 ? <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700 animate-in zoom-in">
                  <Package size={48} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm font-black">{t("ar_292")}</p>
                  {activeSegment === 'active' && <button onClick={() => setView('create')} className="mt-2 text-primary font-black text-xs underline">{t("ar_293")}</button>}
              </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeSegment === 'active' ? activeOrders : pastOrders).map((order, idx) => <motion.div key={order.id} initial={{
            opacity: 0,
            scale: 0.95
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            delay: idx * 0.05
          }} onClick={() => setSelectedOrder(order)} className="group bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-md hover:shadow-lg border border-gray-100 dark:border-gray-800 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                        {/* Type Banner - Smaller */}
                        <div className="absolute top-0 right-0 bg-gray-800 dark:bg-black text-white text-[9px] font-black px-3 py-1 rounded-bl-xl z-10">
                            {ORDER_TYPE_LABELS[order.type] || order.type}
                        </div>

                        {/* Status & Price Row - Compact */}
                        <div className="flex justify-between items-start mb-3 mt-1">
                            <StatusBadge status={order.status} />
                            <div className="flex flex-col items-end">
                                <span className="text-xl font-black text-primary leading-none">{order.price + (order.itemCost || 0)} <span className="text-[10px]">{CURRENCY}</span></span>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{t("ar_294")}</span>
                            </div>
                        </div>

                        {/* Title - Smaller Font */}
                        <h4 className="text-sm font-black text-gray-800 dark:text-white mb-3 line-clamp-1 leading-tight">{order.items}</h4>
                        
                        {/* Address Pill - Smaller */}
                        <div className="flex items-center gap-2 text-gray-500 mb-4 bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-xl border border-gray-100/50 dark:border-gray-700/50">
                            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center text-primary shadow-sm shrink-0">
                                <MapPin size={14} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-[11px] text-gray-700 dark:text-gray-200 truncate">{order.deliveryAddress.title}</p>
                                <p className="text-[9px] text-gray-400 font-bold truncate opacity-60">{order.deliveryAddress.details}</p>
                            </div>
                        </div>

                        {/* Action Grid - Compact */}
                        <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                            {order.status === OrderStatus.PENDING && <button onClick={e => handleQuickCancel(order.id, e)} className="col-span-2 bg-red-50 dark:bg-red-900/10 text-red-500 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border border-red-100 dark:border-red-900/30 transition-all hover:bg-red-100">
                                    <Trash2 size={16} />{t("ar_102")}</button>}
                            
                            {order.driverId && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && <>
                                    <button onClick={e => {
                  e.stopPropagation();
                  setChatOrder(order);
                }} className="col-span-1 bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all">
                                        <MessageCircle size={16} />{t("ar_295")}</button>
                                    {order.deliveryCode && <button onClick={() => setExpandedQR(order.deliveryCode!)} className="col-span-1 bg-gray-900 dark:bg-black text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all">
                                            <QrCode size={16} />{t("ar_296")}</button>}
                                </>}
                        </div>
                    </motion.div>)}
              </div>}
      </div>
          </>}
    </div>;
};