import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AudioPlayer } from "./AudioPlayer";
import { Order, OrderStatus, Role, OrderType } from '../types';
import { StatusBadge } from './StatusBadge';
import { CURRENCY, ORDER_TYPE_LABELS } from '../constants';
import { X, MapPin, Phone, User, Clock, DollarSign, Box, LocateFixed, AlertTriangle, XCircle, MessageCircle, CheckCircle, Trash2, Send, RefreshCcw, PhoneCall, ChevronDown, Copy, Image, Mic, Play, Camera, Star } from 'lucide-react';
import { useApp } from '../services/AppContext';
import { useLanguage } from '../services/LanguageContext';
import { ChatModal } from './ChatModal';
import { TrackingMapView } from './TrackingMapView';
interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  userRole: Role;
  onOpenMap?: (lat?: number, lng?: number, address?: string) => void;
}

// --- SHARED: CONTACT ACTION MODAL ---
const ContactActionModal: React.FC<{
  phone: string | null;
  title?: string;
  onClose: () => void;
}> = ({
  phone,
  title,
  onClose
}) => {
  const { t } = useLanguage();
  if (!phone) return null;
  const handleCall = () => {
    window.open(`tel:${phone}`, '_self');
    onClose();
  };
  const handleWhatsApp = () => {
    const waNumber = `2${phone.replace(/^0+/, '')}`;
    window.open(`https://wa.me/${waNumber}`, '_blank');
    onClose();
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(phone);
    toast.error(t("ar_all_1091"));
    onClose();
  };
  return createPortal(<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
                
                <div className="text-center mb-8">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-1">{title || t("ar_all_1092")}</h3>
                    <p className="text-2xl font-black text-primary font-mono tracking-wider">{phone}</p>
                </div>
                
                <div className="space-y-3">
                    <button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg shadow-green-100">
                        <MessageCircle size={24} />{t("ar_all_1093")}</button>
                    <div className="flex gap-3">
                        <button onClick={handleCall} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-100">
                            <PhoneCall size={24} />{t("ar_all_1094")}</button>
                        <button onClick={handleCopy} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-4 rounded-2xl font-bold flex items-center justify-center transition-colors">
                            <Copy size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>, document.body);
};
export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  userRole,
  onOpenMap
}) => {
  const {
    users,
    requestCancellation,
    cancelOrder,
    acceptOrder,
    currentUser,
    syncDriverLocation,
    updateOrderStatus,
    reportDelay,
    notifyDriverOfTracking,
    submitOrderRating
  } = useApp();
  const {
    language,
    t
  } = useLanguage();
  const driver = users.find(u => String(u.id) === String(order.driverId));
  const customer = users.find(u => String(u.id) === String(order.customerId));
  const [showTrackingMap, setShowTrackingMap] = useState(false);

  // Rating State
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [ratingCommentText, setRatingCommentText] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);

  // Photo Proof State
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [delayReasonText, setDelayReasonText] = useState('');

  // Contact Modal State
  const [contactModalData, setContactModalData] = useState<{
    phone: string;
    title: string;
  } | null>(null);

  // Cancellation State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showChat, setShowChat] = useState(false);
  const formatTime = (ts: number) => new Date(ts).toLocaleString('ar-EG', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  // Logic to show Cancel Button:
  const showCancelButton = order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.RETURNED && (!order.cancellationRequest || [Role.ADMIN, Role.EMPLOYEE].includes(userRole));

  // Logic to show Accept Button (Driver only, Pending order)
  const showAcceptButton = userRole === Role.DRIVER && order.status === OrderStatus.PENDING;

  // --- SMART DATA EXTRACTION ---
  // Try to find the "Other Party" phone.
  // For Send Package: Recipient is the other party.
  // For Receive Package: Pickup Source is the other party.
  let senderName = t("ar_all_1095");
  let senderPhone = "";
  let recipientName = t("ar_all_1096");
  let recipientPhone = "";
  if (order.type === OrderType.PICK_DROP || order.type === OrderType.GOVERNORATE) {
    // Sender is usually the Customer, but we allow them to set a custom pickupPhone
    senderName = t("ar_all_1097");
    // Try to extract pickup phone if present
    const senderMatch = order.notes?.match(/Sender Details.*\nPhone:\s*(\d+)/is);
    senderPhone = senderMatch ? senderMatch[1] : customer?.phone || "";

    // Recipient is the destination contact
    recipientName = t("ar_all_1096");
    recipientPhone = order.recipientPhone || "";
  }
  const handleCloseModal = async () => {
    if (userRole === Role.CUSTOMER && order.driverId) {
      notifyDriverOfTracking(order.id, false);
    }
    onClose();
  };
  const handleTrackDriverClick = () => {
    if (order.driverId) {
      notifyDriverOfTracking(order.id, true);
      setShowTrackingMap(true);
    }
  };
  const handleCancelAction = () => {
    if (order.status === OrderStatus.PENDING || [Role.ADMIN, Role.EMPLOYEE].includes(userRole)) {
      const cancelMsg = language === 'ar' ? t("ar_all_1098") : "Are you sure you want to cancel the order permanently?";
      if (confirm(cancelMsg)) {
        cancelOrder(order.id);
      }
      return;
    }
    if (!cancelReason.trim()) {
      toast.error(t("ar_all_1099"));
      return;
    }
    requestCancellation(order.id, cancelReason);
    setShowCancelConfirm(false);
    toast.success(t("ar_all_1100"));
    onClose();
  };
  const handleAcceptFromModal = async () => {
    if (!currentUser) return;
    const success = await acceptOrder(order.id, currentUser.id, true);
    if (success) {
      onClose();
    }
  };
  const handleStatusChangeWithProof = async (status: OrderStatus) => {
    if (status === OrderStatus.DELIVERED) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }
    updateOrderStatus(order.id, status);
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Fallback: Deliver without proof if cancelled file picker
      updateOrderStatus(order.id, OrderStatus.DELIVERED);
      return;
    }
    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateOrderStatus(order.id, OrderStatus.DELIVERED, {
        imageUrl: base64
      });
      setIsUploadingProof(false);
      onClose();
    };
    reader.readAsDataURL(file);
  };
  const handleReportDelayAction = () => {
    if (!delayReasonText.trim()) return;
    reportDelay(order.id, delayReasonText);
    setShowDelayForm(false);
    setDelayReasonText('');
  };
  return createPortal(<>
    <ContactActionModal phone={contactModalData?.phone || null} title={contactModalData?.title} onClose={() => setContactModalData(null)} />

    {showChat && <ChatModal order={order} onClose={() => setShowChat(false)} />}
    
    {!showChat && <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[3rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative">
        
        {/* Top Handle for mobile feel */}
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2 shrink-0"></div>

        {/* Header - Minimalist */}
        <div className="px-6 py-4 flex justify-between items-center shrink-0">
           <div>
               <h3 className="text-2xl font-black text-gray-800 dark:text-white">{t("ar_all_1016")}</h3>
               <div className="flex items-center gap-2 mt-1">
                   <StatusBadge status={order.status} />
                   <span className="text-xs font-bold text-gray-400">#{order.id.slice(-4)}</span>
               </div>
           </div>
           <button onClick={handleCloseModal} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full hover:bg-gray-200 transition-colors">
               <X size={24} className="text-gray-500" />
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-64 space-y-8">
            
            {/* 1. Main Info Card (Price & Type) */}
            <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-[2.5rem] flex items-center justify-between border-2 border-primary/10">
                <div>
                   <span className="text-xs font-black text-primary uppercase block mb-1">{t("ar_all_1101")}</span>
                   <span className="text-3xl font-black text-primary font-mono">{order.price + (order.itemCost || 0)} {CURRENCY}</span>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">{t("ar_all_1102")}</span>
                   <span className="text-sm font-black text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                      {ORDER_TYPE_LABELS[order.type] || order.type}
                   </span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold">{t("ar_all_1103")}</span>
                    <span className="font-black text-gray-800 dark:text-white">{order.price} {CURRENCY}</span>
                </div>
                {order.itemCost !== undefined && order.itemCost > 0 && <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-bold">{t("ar_all_1104")}</span>
                        <span className="font-black text-gray-800 dark:text-white">{order.itemCost} {CURRENCY}</span>
                    </div>}
                {order.payer && <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 font-bold">{t("ar_all_1105")}</span>
                        <span className="font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs">
                            {order.payer === 'RECIPIENT' ? t("ar_all_1096") : t("ar_all_1097")}
                        </span>
                    </div>}
            </div>



            {/* 2. Addresses - High Impact */}
            <div className="space-y-3 relative">
                {/* Vertical Line Connector */}
                <div className="absolute top-10 bottom-10 right-[27px] w-0.5 bg-dashed border-r-2 border-primary/20 border-dashed"></div>

                {/* Pickup */}
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 z-10">
                        <div className="w-4 h-4 bg-gray-400 rounded-full border-4 border-white dark:border-gray-900"></div>
                    </div>
                    <div className="pt-1 flex-1">
                        <span className="text-xs font-black text-gray-400 block mb-1">{t("ar_all_1106")}</span>
                        <h4 className="text-lg font-black text-gray-800 dark:text-white leading-tight">{order.pickupAddress}</h4>
                        <button className="text-xs font-black text-blue-500 mt-2 flex items-center gap-1 hover:underline" onClick={() => onOpenMap?.(order.pickupLat, order.pickupLng, order.pickupAddress)}>
                            <MapPin size={12} />{t("ar_all_1107")}</button>
                    </div>
                </div>

                {/* Delivery */}
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 z-10">
                        <MapPin size={24} className="text-primary fill-current" />
                    </div>
                    <div className="pt-1 flex-1">
                        <span className="text-xs font-black text-primary block mb-1">{t("ar_all_1108")}</span>
                        <h4 className="text-lg font-black text-gray-800 dark:text-white leading-tight">{order.deliveryAddress.title}</h4>
                        <p className="text-sm font-bold text-gray-500 mt-1">{order.deliveryAddress.details}</p>
                        <button className="text-xs font-black text-blue-500 mt-2 flex items-center gap-1 hover:underline" onClick={() => onOpenMap?.(order.deliveryAddress.lat, order.deliveryAddress.lng, order.deliveryAddress.title + " " + order.deliveryAddress.details)}>
                            <LocateFixed size={12} />{t("ar_all_1109")}</button>
                    </div>
                </div>
            </div>

            {/* 3. Quick Contacts Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => setContactModalData({
              phone: customer?.phone || "",
              title: customer?.name || t("ar_all_1110")
            })} className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] border-2 border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Phone size={24} />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black text-gray-400 block">{t("ar_all_1111")}</span>
                        <span className="text-sm font-black text-gray-800 dark:text-white truncate max-w-[120px]">{customer?.name || t("ar_all_1110")}</span>
                    </div>
                </button>

                <button onClick={() => setShowChat(true)} className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] border-2 border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                        <MessageCircle size={24} />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black text-gray-400 block">{t("ar_all_1112")}</span>
                        <span className="text-sm font-black text-gray-800 dark:text-white">{t("ar_all_1113")}</span>
                    </div>
                </button>
            </div>

            {/* 3.5 Share Order Status with Recipient (WhatsApp) */}
            {order.recipientPhone && <button onClick={() => {
            const phone = order.recipientPhone;
            if (!phone) return;
            let statusText = t("ar_all_1114");
            if (order.status === OrderStatus.ACCEPTED) statusText = t("ar_all_1115");else if (order.status === OrderStatus.PICKED_UP) statusText = t("ar_all_1116");else if (order.status === OrderStatus.ON_THE_WAY) statusText = t("ar_all_1117");else if (order.status === OrderStatus.DELIVERED) statusText = t("ar_all_1118");else if (order.status === OrderStatus.CANCELLED) statusText = t("ar_all_1119");else if (order.status === OrderStatus.RETURNED) statusText = t("ar_all_1120");
            const message = `Hello! 🌸 Your shipment with Al-Tayyar Delivery 🚀\n\n📌 Order Code: #${order.id.slice(-4)}\n📊 Status: ${statusText}\n📍 Delivery Address: ${order.deliveryAddress.title}\n💵 Total: ${order.price + (order.itemCost || 0)} ${CURRENCY}\n\n📲 Track your shipment minute by minute!`;
            const url = `https://wa.me/2${phone.replace(/^0+/, '')}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
          }} className="w-full bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/20 text-green-600 dark:text-green-400 p-4 rounded-3xl flex items-center justify-center gap-3 transition-colors active:scale-98 font-bold text-sm">
                    <MessageCircle size={20} className="fill-current" />{t("ar_all_1121")}</button>}

            {/* 4. Order Content Box */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Box size={20} className="text-primary" />
                    <span className="font-black text-gray-800 dark:text-white">{t("ar_all_1122")}</span>
                </div>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-300 leading-relaxed">
                    {order.items}
                </p>
                {order.notes && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 leading-relaxed font-bold">{t("ar_all_1123")}{order.notes}
                    </div>}
            </div>

            {/* Attached Media */}
            {(order.orderImageUrl || order.voiceNotes && order.voiceNotes.length > 0 || order.voiceNote) && <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-4">
                        <Camera size={20} className="text-blue-500" />
                        <span className="font-black text-blue-800 dark:text-blue-300">{t("ar_all_1124")}</span>
                    </div>
                    <div className="space-y-4">
                        {order.orderImageUrl && <img referrerPolicy="no-referrer" src={order.orderImageUrl} className="w-full h-auto max-h-64 object-contain rounded-2xl shadow-sm border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity" alt="Order Attachment" onClick={() => window.open(order.orderImageUrl, '_blank')} />}
                        {(order.voiceNotes || (order.voiceNote ? [order.voiceNote] : [])).map((audio, idx) => <div key={idx} className="flex flex-col gap-2 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-full text-blue-500 shrink-0">
                                        <Mic size={14} />
                                    </div>
                                    <span className="text-xs font-black text-blue-800 dark:text-blue-300">{t("ar_all_1125")}{idx + 1}</span>
                                </div>
                                <AudioPlayer src={audio} />
                            </div>)}
                    </div>
                </div>}

            {/* 5. Proof Image if exists */}
            {order.proofImageUrl && <div className="space-y-2">
                    <span className="text-xs font-black text-green-500 px-2">{t("ar_all_1126")}</span>
                    <img referrerPolicy="no-referrer" src={order.proofImageUrl} className="w-full h-48 object-cover rounded-[2rem] shadow-lg" alt="Proof" />
                </div>}

            {/* 6. Driver Rating and Time Taken Metrics (Visible on DELIVERED) */}
            {order.status === OrderStatus.DELIVERED && <div className="bg-gradient-to-br from-yellow-50/50 to-amber-50/30 dark:from-yellow-950/10 dark:to-amber-950/5 p-6 rounded-[2.5rem] border border-yellow-100 dark:border-yellow-900/30 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Star className="text-amber-500 fill-amber-500" size={20} />
                            <span className="font-black text-gray-800 dark:text-white">{t("ar_all_1127")}</span>
                        </div>
                        {order.timeTakenMinutes !== undefined && order.timeTakenMinutes > 0 && <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                                <Clock size={12} />{t("ar_all_1128")}{Math.round(order.timeTakenMinutes)}{t("ar_all_1129")}</span>}
                    </div>

                    {/* Show existing rating */}
                    {order.rating !== undefined && order.rating !== null ? <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">{t("ar_all_1130")}</span>
                                <div className="flex text-yellow-400">
                                    {Array.from({
                    length: 5
                  }).map((_, i) => <Star key={i} size={16} className={i < (order.rating || 0) ? 'fill-current' : 'text-gray-200 dark:text-gray-700'} />)}
                                </div>
                            </div>
                            {order.ratingComment && <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                    " {order.ratingComment} "
                                </div>}
                        </div> : (/* Only customers or store merchants can submit a rating */
            userRole === Role.CUSTOMER ? <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold text-gray-500">{t("ar_all_1131")}</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(starValue => <button key={starValue} type="button" onClick={() => setSelectedRating(starValue)} className="text-yellow-400 hover:scale-110 transition-transform">
                                                <Star size={24} className={starValue <= selectedRating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'} />
                                            </button>)}
                                    </div>
                                </div>

                                <textarea className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl text-xs outline-none font-bold text-gray-700 dark:text-gray-200 focus:border-amber-400" placeholder={t("ar_all_1132")} value={ratingCommentText} onChange={e => setRatingCommentText(e.target.value)} rows={2} />

                                <button onClick={async () => {
                setIsSubmittingRating(true);
                const success = await submitOrderRating(order.id, selectedRating, ratingCommentText);
                setIsSubmittingRating(false);
                if (success) {
                  toast.success(t("ar_all_1133"));
                } else {
                  toast.error(t("ar_all_1134"));
                }
              }} disabled={isSubmittingRating} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white p-3 rounded-2xl font-black text-xs shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 transition-all">
                                    {isSubmittingRating ? t("ar_all_1135") : t("ar_all_1136")}
                                </button>
                            </div> : <div className="text-xs font-bold text-gray-400 text-center py-2">{t("ar_all_1137")}</div>)}
                </div>}

            {/* Delay Section */}
            {userRole === Role.DRIVER && order.status !== OrderStatus.ON_THE_WAY && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.RETURNED && <button onClick={() => setShowDelayForm(!showDelayForm)} className="w-full py-4 text-xs font-black text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2">
                    <AlertTriangle size={14} />
                    {showDelayForm ? t("ar_all_1138") : t("ar_all_1139")}
                </button>}

            {showDelayForm && <div className="flex gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-2xl animate-in slide-in-from-top-2">
                    <input className="flex-1 bg-white dark:bg-gray-900 border border-red-100 p-4 rounded-xl text-sm outline-none font-bold" placeholder={t("ar_all_1140")} value={delayReasonText} onChange={e => setDelayReasonText(e.target.value)} />
                    <button onClick={handleReportDelayAction} className="bg-red-500 text-white px-6 rounded-xl font-black text-sm">{t("ar_all_1141")}</button>
                </div>}

            {/* Secondary Actions (Cancellation) */}
            {showCancelButton && !showAcceptButton && <button onClick={() => {
            if (order.status === OrderStatus.PENDING || [Role.ADMIN, Role.EMPLOYEE].includes(userRole)) {
              handleCancelAction();
            } else {
              setShowCancelConfirm(true);
            }
          }} className="w-full text-red-500 p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                    <XCircle size={18} />
                    {order.status === OrderStatus.PENDING || [Role.ADMIN, Role.EMPLOYEE].includes(userRole) ? t("ar_all_1142") : t("ar_all_1143")}
                </button>}

        </div>

        {/* BOTTOM ACTION BUTTONS - High Visibility / Big for thumb */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-50">
            
            {/* DRIVER FLOW ACTIONS */}
            {userRole === Role.DRIVER && order.driverId === currentUser?.id && order.status !== OrderStatus.DELIVERED && <div className="w-full space-y-3">
                    {order.status === OrderStatus.ACCEPTED && <button onClick={() => handleStatusChangeWithProof(OrderStatus.PICKED_UP)} className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-primary/30 active:scale-95 transition-all">{t("ar_all_1144")}</button>}
                    {order.status === OrderStatus.PICKED_UP && <button onClick={() => handleStatusChangeWithProof(OrderStatus.ON_THE_WAY)} className="w-full bg-yellow-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-yellow-500/30 active:scale-95 transition-all">{t("ar_all_1145")}</button>}
                    {order.status === OrderStatus.ON_THE_WAY && <button onClick={() => handleStatusChangeWithProof(OrderStatus.DELIVERED)} className="w-full bg-green-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-green-500/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                            <Camera size={28} />{t("ar_all_1146")}</button>}
                </div>}

            {/* ACCEPT BUTTON */}
            {showAcceptButton && <button onClick={handleAcceptFromModal} className="w-full bg-secondary text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-secondary/40 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <CheckCircle size={32} />{t("ar_all_1147")}</button>}

            {/* CUSTOMER TRACKING ACTION */}
            {userRole === Role.CUSTOMER && (order.status === OrderStatus.PICKED_UP || order.status === OrderStatus.ON_THE_WAY) && <button onClick={handleTrackDriverClick} className="w-full bg-[#1e40af] text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <MapPin size={24} />{t("ar_all_1148")}</button>}

            {/* CLOSE BUTTON (FOR CLOSED ORDERS) */}
            {(order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) && <button onClick={handleCloseModal} className="w-full bg-gray-100 dark:bg-gray-800 py-4 rounded-3xl font-black text-gray-500 active:scale-95">{t("ar_all_1149")}</button>}
        </div>

        {/* HIDDEN FILE INPUT */}
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

        {/* CANCEL OVERLAY (Simplified) */}
        {showCancelConfirm && <div className="absolute inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom-20">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={48} />
                </div>
                <h3 className="text-2xl font-black text-center mb-2">{t("ar_all_1143")}</h3>
                <p className="text-sm text-gray-500 text-center mb-8">{t("ar_all_1150")}</p>
                <textarea autoFocus className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl mb-6 text-base font-bold outline-none border-2 border-gray-100" placeholder={t("ar_all_1151")} rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                <div className="flex gap-4 w-full">
                    <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-4 font-black text-gray-400">{t("ar_all_1152")}</button>
                    <button onClick={handleCancelAction} className="flex-1 bg-red-500 py-4 rounded-3xl font-black text-white shadow-lg">{t("ar_all_1153")}</button>
                </div>
            </div>}
      </div>
    </div>}

    {showTrackingMap && driver && <TrackingMapView order={order} driver={driver} onClose={() => setShowTrackingMap(false)} />}
    </>, document.body);
};