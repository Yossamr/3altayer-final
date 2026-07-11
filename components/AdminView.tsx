import toast from 'react-hot-toast';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../services/AppContext';
import { useLanguage } from '../services/LanguageContext';
import { Button } from './ui/Button';
import { CURRENCY, ORDER_TYPE_LABELS } from '../constants';
import { Order, OrderStatus, Role, User } from '../types';
import { getPaginatedOrdersFromDB, getOrdersCountFromDB, getPaginatedUsersFromDB, getUsersCountFromDB, getPaginatedDriversFromDB, getDriversCountFromDB } from '../services/db';
import { StatusBadge } from './StatusBadge';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ChatModal } from './ChatModal';
import { LiveMap } from './LiveMap';
import { Search, MapPin, Navigation, UserPlus, AlertTriangle, Settings, ChevronDown, ChevronUp, Users, Phone, X, Package, Store, Clock, Wifi, WifiOff, Eye, Calendar, Wallet, History, Bike, CheckCircle, PieChart as PieIcon, BarChart as BarIcon, Shield, Truck, Lock, Trash2, Edit2, Plus, Save, UserX, UserCheck, RefreshCcw, User as UserIcon, TrendingUp, Flame, Globe, Briefcase, List, Bell, Star, ArrowRight, ChevronRight, PlusCircle, Mic } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MapContainer, TileLayer } from 'react-leaflet';
import { HeatmapLayer } from './HeatmapLayer';
import { AdminNotificationsTab } from './AdminNotificationsTab';
import { NewDriversTab } from './NewDriversTab';

// --- HELPER: Sanitize Phone ---
const sanitizePhoneInput = (val: string) => {
  let cleanVal = val.replace(/[٠-٩]/g, d => '0123456789'["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
  return cleanVal.replace(/\D/g, '');
};
export interface AdminViewProps {
  activeTab?: 'DASHBOARD' | 'ORDERS' | 'DRIVERS' | 'CUSTOMERS' | 'SETTINGS' | 'USERS_MGMT' | 'MAP' | 'ANALYTICS' | 'HEATMAP' | 'FINANCIALS' | 'NOTIFICATIONS' | 'NEW_DRIVERS';
  setActiveTab?: (tab: 'DASHBOARD' | 'ORDERS' | 'DRIVERS' | 'CUSTOMERS' | 'SETTINGS' | 'USERS_MGMT' | 'MAP' | 'ANALYTICS' | 'HEATMAP' | 'FINANCIALS' | 'NOTIFICATIONS' | 'NEW_DRIVERS') => void;
  onNavigateMain?: (tab: string) => void;
}
export const AdminView: React.FC<AdminViewProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  onNavigateMain
}) => {
  const { t, isAr } = useLanguage();

  const highlightMatch = (text: string | null | undefined, query: string) => {
    if (!text) return '';
    if (!query || !query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-100 text-yellow-900 rounded px-0.5 font-black dark:bg-yellow-900/40 dark:text-yellow-200 animate-pulse">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };
  const {
    orders,
    users,
    zones,
    adminCreateUser,
    currentUser,
    cancelOrder,
    rejectCancellation,
    addZone,
    editZone,
    removeZone,
    adminUpdateUser,
    autoOpenChatId,
    clearAutoOpenChat,
    requestLocationPulse
  } = useApp();
  const [localActiveTab, setLocalActiveTab] = useState<'DASHBOARD' | 'ORDERS' | 'DRIVERS' | 'CUSTOMERS' | 'SETTINGS' | 'USERS_MGMT' | 'MAP' | 'ANALYTICS' | 'HEATMAP' | 'FINANCIALS' | 'NOTIFICATIONS' | 'NEW_DRIVERS'>('DASHBOARD');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;
  const [chatOrder, setChatOrder] = useState<Order | null>(null);

  // Pulse logic: Trigger pulse when entering MAP tab
  React.useEffect(() => {
    if (activeTab === 'MAP') {
      requestLocationPulse();
      // Also set an interval to refresh pulse every 30 seconds if staying in map
      const pulseInterval = setInterval(() => {
        requestLocationPulse();
      }, 30000);
      return () => clearInterval(pulseInterval);
    }
  }, [activeTab]);

  // Auto open chat logic
  React.useEffect(() => {
    if (autoOpenChatId) {
      const targetOrder = orders.find(o => o.id === autoOpenChatId);
      if (targetOrder) {
        setChatOrder(targetOrder);
      }
      clearAutoOpenChat();
    }
  }, [autoOpenChatId, orders]);

  // Management State
  const [mgmtTab, setMgmtTab] = useState<'REGIONS_PRICES' | 'GOVERNORATES' | 'ADD_DRIVER' | 'ADD_ADMIN' | 'ADD_EMPLOYEE' | 'WAITLIST'>('ADD_DRIVER');
  const [waitlistData, setWaitlistData] = useState<any[]>([]);

  React.useEffect(() => {
    if (mgmtTab === 'WAITLIST') {
      const fetchWaitlist = async () => {
        try {
          const { getZoneWaitlistFromDB } = await import('../services/db');
          const data = await getZoneWaitlistFromDB();
          setWaitlistData(data || []);
        } catch (e) {
          console.error("Failed to fetch waitlist:", e);
        }
      };
      fetchWaitlist();
    }
  }, [mgmtTab]);

  // Zone Editing State
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrices, setEditPrices] = useState({
    SHOPPING: 0,
    EMERGENCY: 0,
    PICK_DROP: 0,
    GOVERNORATE: 0
  });
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'coming_soon'>('inactive');
  const [editCenterLat, setEditCenterLat] = useState('');
  const [editCenterLng, setEditCenterLng] = useState('');
  const [editRadiusKm, setEditRadiusKm] = useState('');

  // New Zone State
  const [newZoneName, setNewZoneName] = useState('');
  const [newZonePrices, setNewZonePrices] = useState({
    SHOPPING: 0,
    EMERGENCY: 0,
    PICK_DROP: 0,
    GOVERNORATE: 0
  });

  // User Creation State
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSettlementId, setLoadingSettlementId] = useState<string | null>(null);

  // Modals State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [debouncedOrderSearchTerm, setDebouncedOrderSearchTerm] = useState('');
  const [selectedDriverHistoryId, setSelectedDriverHistoryId] = useState<string | null>(null);

  // Heatmap State
  const [heatmapRangeDays, setHeatmapRangeDays] = useState<number>(7);
  const [heatmapViewMode, setHeatmapViewMode] = useState<'MAP' | 'LIST'>('MAP');

  // --- USERS MANAGEMENT STATE ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [paginatedDrivers, setPaginatedDrivers] = useState<User[]>([]);
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [driversPage, setDriversPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [ordersStartDate, setOrdersStartDate] = useState('');
  const [ordersEndDate, setOrdersEndDate] = useState('');
  const LIMIT = 20;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderSearchTerm(orderSearchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [orderSearchTerm]);

  React.useEffect(() => {
    setOrdersPage(1);
  }, [debouncedOrderSearchTerm]);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(isAr ? "متصفحك لا يدعم البحث الصوتي" : "Your browser does not support voice search");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = isAr ? 'ar-EG' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    toast.loading(isAr ? "جاري الاستماع..." : "Listening...", { id: 'voice-search' });

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setOrderSearchTerm(speechToText);
      toast.success(isAr ? `تم التعرف على: "${speechToText}"` : `Recognized: "${speechToText}"`, { id: 'voice-search' });
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      toast.error(isAr ? "فشل التعرف على الصوت" : "Voice recognition failed", { id: 'voice-search' });
    };

    recognition.start();
  };

  React.useEffect(() => {
    if (activeTab === 'ORDERS') {
      const startTs = ordersStartDate ? new Date(ordersStartDate).getTime() : undefined;
      let endTs = ordersEndDate ? new Date(ordersEndDate).getTime() : undefined;
      if (endTs) endTs += 24 * 60 * 60 * 1000 - 1; // End of day

      getOrdersCountFromDB(startTs, endTs, debouncedOrderSearchTerm).then(setTotalOrders);
      getPaginatedOrdersFromDB(ordersPage, LIMIT, startTs, endTs, debouncedOrderSearchTerm).then(newOrders => {
        setPaginatedOrders(prev => ordersPage === 1 ? newOrders : [...prev, ...newOrders]);
      });
    }
  }, [activeTab, ordersPage, ordersStartDate, ordersEndDate, debouncedOrderSearchTerm]);

  React.useEffect(() => {
    if (activeTab === 'DRIVERS') {
      getDriversCountFromDB().then(setTotalDrivers);
      getPaginatedDriversFromDB(driversPage, LIMIT).then(newDrivers => {
        setPaginatedDrivers(prev => driversPage === 1 ? newDrivers : [...prev, ...newDrivers]);
      });
    }
  }, [activeTab, driversPage]);

  React.useEffect(() => {
    if (activeTab === 'USERS_MGMT') {
      getUsersCountFromDB().then(setTotalUsers);
      getPaginatedUsersFromDB(usersPage, LIMIT).then(newUsers => {
        setPaginatedUsers(prev => usersPage === 1 ? newUsers : [...prev, ...newUsers]);
      });
    }
  }, [activeTab, usersPage]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<{
    name: string;
    phone: string;
    password?: string;
    cashLimit?: number;
  }>({
    name: '',
    phone: ''
  });

  // --- CUSTOM DIALOG CONFIRMATION STATE ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);
  const showConfirm = (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }) => {
    setConfirmModal({
      isOpen: true,
      ...options
    });
  };

  // Algorithmic Zone Analysis for Heatmap density
  const zoneAnalysis = useMemo(() => {
    const activeOrders = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.PICKED_UP || o.status === OrderStatus.ON_THE_WAY);
    const counts: Record<string, number> = {};
    activeOrders.forEach(o => {
      const zId = o.deliveryAddress?.zoneId;
      if (zId) counts[zId] = (counts[zId] || 0) + 1;
    });
    const maxOrders = Math.max(...Object.values(counts), 1);
    return zones.map(z => {
      const count = counts[z.id] || 0;
      const percentage = count / maxOrders * 100;
      let label = t("ar_2");
      let color = 'bg-blue-400';
      let textColor = 'text-blue-500';
      if (count >= 5) {
        label = t("ar_3");
        color = 'bg-primary';
        textColor = 'text-primary';
      } else if (count >= 2) {
        label = t("ar_4");
        color = 'bg-orange-400';
        textColor = 'text-orange-400';
      }
      return {
        id: z.id,
        name: z.name,
        count,
        percentage,
        label,
        color,
        textColor
      };
    }).sort((a, b) => b.count - a.count).slice(0, 5); // top 5 zones
  }, [orders, zones]);
  const allOrdersList = orders.sort((a, b) => b.createdAt - a.createdAt);
  const allDrivers = users.filter(u => (u.role as string) === 'DRIVER' || (u.role as string) === 'agent' || (u.role as string) === 'driver');
  const allCustomers = users.filter(u => (u.role as string) === 'CUSTOMER' || (u.role as string) === 'customer');

  // Pending Cancellations List
  const pendingCancellations = orders.filter(o => o.cancellationRequest && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DELIVERED);

  // Alert Filters
  const IDLE_LIMIT = 10 * 60 * 1000;
  const SIGNAL_LIMIT = 20 * 60 * 1000;
  const now = Date.now();
  const idleDrivers = users.filter(u => ((u.role as string) === 'DRIVER' || (u.role as string) === 'agent' || (u.role as string) === 'driver') && u.isOnline && u.lastMovedAt && now - u.lastMovedAt > IDLE_LIMIT).sort((a, b) => (b.lastMovedAt || 0) - (a.lastMovedAt || 0));
  const silentDrivers = users.filter(u => ((u.role as string) === 'DRIVER' || (u.role as string) === 'agent' || (u.role as string) === 'driver') && u.isOnline && (!u.lastSeenAt || now - u.lastSeenAt > SIGNAL_LIMIT));

  // --- ANALYTICS DATA PREP ---
  const driverPerformance = useMemo(() => {
    return allDrivers.map(driver => {
      const completed = orders.filter(o => o.driverId && String(o.driverId) === String(driver.id) && o.status === OrderStatus.DELIVERED);
      const totalRev = completed.reduce((sum, o) => sum + (o.price || 0), 0);
      const avgTime = driver.avgDeliveryTime || 0;

      // Profitability Score (Example formula: Orders * 10 + Revenue * 0.1 - AvgTime * 0.5)
      const profitScore = completed.length * 10 + totalRev / 10 - avgTime * 0.5;
      return {
        ...driver,
        completedCount: completed.length,
        totalRevenue: totalRev,
        profitScore
      };
    }).sort((a, b) => b.profitScore - a.profitScore);
  }, [allDrivers, orders]);
  const ordersByStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      [OrderStatus.DELIVERED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.PENDING]: 0,
      [OrderStatus.ON_THE_WAY]: 0
    };
    orders.forEach(o => {
      if (counts[o.status] !== undefined) counts[o.status]++;else counts[o.status] = 1;
    });
    return [{
      name: t("ar_5"),
      value: counts[OrderStatus.DELIVERED],
      color: '#22c55e'
    }, {
      name: t("ar_6"),
      value: counts[OrderStatus.ON_THE_WAY] + counts[OrderStatus.PENDING] + (counts[OrderStatus.PICKED_UP] || 0),
      color: '#FF6600'
    },
    // Primary Orange
    {
      name: t("ar_7"),
      value: counts[OrderStatus.CANCELLED] + (counts[OrderStatus.RETURNED] || 0),
      color: '#ef4444'
    }].filter(i => i.value > 0);
  }, [orders]);
  const revenueData = useMemo(() => {
    // Group by day (last 5 days)
    const days: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status === OrderStatus.DELIVERED) {
        const date = new Date(o.createdAt).toLocaleDateString('ar-EG', {
          weekday: 'short'
        });
        days[date] = (days[date] || 0) + o.price;
      }
    });
    return Object.keys(days).map(key => ({
      name: key,
      revenue: days[key]
    }));
  }, [orders]);

  // --- ORDER GROUPING LOGIC ---
  const groupedOrders = useMemo(() => {
    const groups: Record<string, {
      orders: Order[];
      total: number;
      count: number;
    }> = {};
    allOrdersList.forEach(order => {
      const date = new Date(order.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      let label = date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (date.toDateString() === today.toDateString()) label = t("ar_8");else if (date.toDateString() === yesterday.toDateString()) label = t("ar_9");
      if (!groups[label]) {
        groups[label] = {
          orders: [],
          total: 0,
          count: 0
        };
      }
      groups[label].orders.push(order);
      groups[label].total += order.price || 0;
      groups[label].count += 1;
    });
    return groups;
  }, [allOrdersList]);

  // --- ZONE HANDLERS ---
  const handleStartEditZone = (zone: any) => {
    setEditingZoneId(zone.id);
    setEditName(zone.name);
    setEditPrices(zone.prices || {
      SHOPPING: zone.price,
      EMERGENCY: zone.price,
      PICK_DROP: zone.price,
      GOVERNORATE: zone.price
    });
    setEditNameAr(zone.nameAr || zone.name || '');
    setEditNameEn(zone.nameEn || zone.id || '');
    setEditStatus(zone.status || 'inactive');
    setEditCenterLat(zone.centerLat ? String(zone.centerLat) : '');
    setEditCenterLng(zone.centerLng ? String(zone.centerLng) : '');
    setEditRadiusKm(zone.radiusKm ? String(zone.radiusKm) : '');
  };
  const handleSaveZoneEdit = async () => {
    if (!editingZoneId || !editName) return;

    const originalZone = zones.find(z => z.id === editingZoneId);
    const becameInactive = originalZone && originalZone.status !== 'inactive' && editStatus === 'inactive';

    if (becameInactive) {
      const activeOrders = orders.filter(o => o.zoneId === editingZoneId && !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(o.status));
      if (activeOrders.length > 0) {
        showConfirm({
          title: isAr ? "تحذير: منطقة نشطة وبها طلبات" : "Warning: Active Zone with Orders",
          message: isAr 
            ? `هناك ${activeOrders.length} طلبات قيد التنفيذ حالياً في هذه المنطقة. هل أنت متأكد من رغبتك في تعطيلها؟` 
            : `There are ${activeOrders.length} active orders currently in this zone. Are you sure you want to deactivate it?`,
          isDanger: true,
          confirmText: isAr ? "نعم، تعطيل المنطقة" : "Yes, deactivate",
          cancelText: isAr ? "تراجع" : "Cancel",
          onConfirm: async () => {
            await editZone(editingZoneId, editName, editPrices.SHOPPING, editPrices, {
              nameAr: editNameAr,
              nameEn: editNameEn,
              status: editStatus,
              centerLat: editCenterLat ? Number(editCenterLat) : undefined,
              centerLng: editCenterLng ? Number(editCenterLng) : undefined,
              radiusKm: editRadiusKm ? Number(editRadiusKm) : undefined
            });
            setEditingZoneId(null);
          }
        });
        return;
      }
    }

    await editZone(editingZoneId, editName, editPrices.SHOPPING, editPrices, {
      nameAr: editNameAr,
      nameEn: editNameEn,
      status: editStatus,
      centerLat: editCenterLat ? Number(editCenterLat) : undefined,
      centerLng: editCenterLng ? Number(editCenterLng) : undefined,
      radiusKm: editRadiusKm ? Number(editRadiusKm) : undefined
    });
    setEditingZoneId(null);
  };
  const handleAddZone = async () => {
    if (!newZoneName) {
      toast.error(t("ar_10"));
      return;
    }
    await addZone(newZoneName, newZonePrices.SHOPPING, newZonePrices);
    setNewZoneName('');
    setNewZonePrices({
      SHOPPING: 0,
      EMERGENCY: 0,
      PICK_DROP: 0,
      GOVERNORATE: 0
    });
  };
  const handleDeleteZone = (id: string) => {
    showConfirm({
      title: t("ar_11"),
      message: t("ar_12"),
      confirmText: t("ar_13"),
      cancelText: t("ar_14"),
      isDanger: true,
      onConfirm: async () => {
        await removeZone(id);
      }
    });
  };
  const handleCreateUser = async (role: Role) => {
    if (!newUserName || !newUserPhone || !newUserPass) {
      toast.error(t("ar_15"));
      return;
    }
    setIsLoading(true);
    const result = await adminCreateUser(newUserName, newUserPhone, newUserPass, role);
    setIsLoading(false);
    if (result.success) {
      toast.error(`Added ${role === Role.ADMIN ? t("ar_16") : role === Role.EMPLOYEE ? t("ar_17") : t("ar_18")} successfully!`);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserPass('');
    } else {
      toast.error(result.message || t("ar_19"));
    }
  };
  const handleApproveCancellation = (orderId: string) => {
    showConfirm({
      title: t("ar_20"),
      message: t("ar_21"),
      confirmText: t("ar_22"),
      cancelText: t("ar_14"),
      isDanger: true,
      onConfirm: async () => {
        await cancelOrder(orderId);
      }
    });
  };
  const handleRejectCancellation = (orderId: string) => {
    showConfirm({
      title: t("ar_23"),
      message: t("ar_24"),
      confirmText: t("ar_25"),
      cancelText: t("ar_14"),
      isDanger: false,
      onConfirm: async () => {
        await rejectCancellation(orderId);
      }
    });
  };

  // --- USER MANAGEMENT HANDLERS ---
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return users;
    const lower = userSearchTerm.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(lower) || u.phone.includes(lower));
  }, [users, userSearchTerm]);
  const startEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditUserForm({
      name: user.name,
      phone: user.phone
    });
  };
  const saveEditUser = async () => {
    if (!editingUserId) return;
    const updates: Partial<User> = {
      name: editUserForm.name,
      phone: editUserForm.phone
    };
    if (editUserForm.password && editUserForm.password.length >= 4) {
      updates.password = editUserForm.password;
    }
    const success = await adminUpdateUser(editingUserId, updates);
    if (success) {
      toast.success(t("ar_26"));
      setEditingUserId(null);
    } else {
      toast.error(t("ar_27"));
    }
  };
  const toggleBlockUser = (user: User) => {
    const isBlocked = user.isBlocked;
    showConfirm({
      title: isBlocked ? t("ar_28") : t("ar_29"),
      message: isBlocked ? `Do you want to unblock user ${user.name}?` : `Do you want to block user ${user.name} and prevent them from accessing the system?`,
      confirmText: isBlocked ? t("ar_30") : t("ar_31"),
      cancelText: t("ar_14"),
      isDanger: !isBlocked,
      onConfirm: async () => {
        await adminUpdateUser(user.id, {
          isBlocked: !isBlocked
        });
      }
    });
  };
  const getDriverName = (id?: string | number) => {
    if (!id) return t("ar_32");
    return users.find(u => String(u.id) === String(id))?.name || t("ar_33");
  };
  const getDriverActiveOrder = (driverId: string | number) => {
    return orders.find(o => o.driverId && String(o.driverId) === String(driverId) && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.RETURNED);
  };
  const getDriverHistory = (driverId: string | number) => {
    return orders.filter(o => o.driverId && String(o.driverId) === String(driverId) && o.status === OrderStatus.DELIVERED).sort((a, b) => b.createdAt - a.createdAt);
  };

  // --- FINANCIALS DATA PREP ---
  const financialStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
    const todayTotal = deliveredOrders.filter(o => o.createdAt >= startOfToday).reduce((sum, o) => sum + (o.price || 0), 0);
    const monthTotal = deliveredOrders.filter(o => o.createdAt >= startOfMonth).reduce((sum, o) => sum + (o.price || 0), 0);
    const allTimeTotal = deliveredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const driversStats = allDrivers.map(driver => {
      const driverOrders = deliveredOrders.filter(o => o.driverId && String(o.driverId) === String(driver.id));
      const today = driverOrders.filter(o => o.createdAt >= startOfToday).reduce((sum, o) => sum + (o.price || 0), 0);
      const month = driverOrders.filter(o => o.createdAt >= startOfMonth).reduce((sum, o) => sum + (o.price || 0), 0);
      const allTime = driverOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      return {
        id: driver.id,
        name: driver.name,
        today,
        month,
        allTime
      };
    });
    return {
      todayTotal,
      monthTotal,
      allTimeTotal,
      driversStats
    };
  }, [orders, allDrivers]);
  const heatmapPoints = useMemo(() => {
    const activeOrders = orders.filter(o => o.deliveryAddress?.lat && o.deliveryAddress?.lng && Date.now() - o.createdAt < heatmapRangeDays * 24 * 60 * 60 * 1000);
    return activeOrders.map(o => [o.deliveryAddress!.lat, o.deliveryAddress!.lng, 1] as [number, number, number]);
  }, [orders, heatmapRangeDays]);
  const filteredOrdersForDisplay = useMemo(() => {
    return orders.filter(o => {
      if (!orderSearchTerm.trim()) return true;
      const query = orderSearchTerm.toLowerCase().trim();
      const customer = users.find(u => u.id === o.customerId);
      const driver = users.find(u => u.id === o.driverId);
      return o.id && o.id.toLowerCase().includes(query) ||
             o.items && o.items.toLowerCase().includes(query) ||
             o.pickupAddress && o.pickupAddress.toLowerCase().includes(query) ||
             o.deliveryAddress?.title && o.deliveryAddress.title.toLowerCase().includes(query) ||
             customer?.name && customer.name.toLowerCase().includes(query) ||
             driver?.name && driver.name.toLowerCase().includes(query) ||
             o.storeId && o.storeId.toLowerCase().includes(query) ||
             ORDER_TYPE_LABELS[o.type] && ORDER_TYPE_LABELS[o.type].toLowerCase().includes(query);
    });
  }, [orders, orderSearchTerm, users]);

  return <div className="space-y-8 pb-32 relative px-2 md:px-6">
      {/* CHAT MODAL OVERLAY */}
      {chatOrder && <ChatModal order={chatOrder} onClose={() => setChatOrder(null)} />}

      {/* --- MODERN TABS --- */}
      <div className="hidden md:flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl mx-1 gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          {[{
        id: 'DASHBOARD',
        label: t("ar_34"),
        icon: BarIcon
      }, {
        id: 'MAP',
        label: t("ar_35"),
        icon: MapPin
      }, {
        id: 'ORDERS',
        label: t("ar_36"),
        icon: Package
      }, {
        id: 'DRIVERS',
        label: t("ar_37"),
        icon: Truck
      }, {
        id: 'CUSTOMERS',
        label: t("ar_38"),
        icon: Users
      }, {
        id: 'ANALYTICS',
        label: t("ar_39"),
        icon: TrendingUp
      }, {
        id: 'FINANCIALS',
        label: t("ar_40"),
        icon: Wallet
      }, {
        id: 'HEATMAP',
        label: t("ar_41"),
        icon: Flame
      }, {
        id: 'USERS_MGMT',
        label: t("ar_42"),
        icon: UserCheck
      }, {
        id: 'NOTIFICATIONS',
        label: t("ar_43"),
        icon: Bell
      }, {
        id: 'NEW_DRIVERS',
        label: isAr ? 'طلبات الطيارين' : 'New Drivers',
        icon: UserPlus
      }, {
        id: 'SETTINGS',
        label: t("ar_44"),
        icon: Settings
      }].filter(tab => {
        if (currentUser?.role === Role.EMPLOYEE) {
          return !['SETTINGS', 'USERS_MGMT', 'FINANCIALS', 'CUSTOMERS', 'NOTIFICATIONS', 'NEW_DRIVERS'].includes(tab.id);
        }
        return true;
      }).map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 shadow-lg text-primary scale-102' : 'text-gray-500'}`}>
                  <tab.icon size={18} />
                  <span className="text-sm">{tab.label}</span>
              </button>)}
      </div>

      {activeTab !== 'DASHBOARD' && <div className="md:hidden px-3 mb-2 flex items-center justify-start">
              <button onClick={() => setActiveTab('DASHBOARD')} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-200 px-3.5 py-2 rounded-xl text-xs font-black border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95">
                  <ArrowRight size={14} /> 
                  <span>{t("ar_45")}</span>
              </button>
          </div>}

      <div className="px-3 flex items-center justify-between mb-4">
         <h2 className="text-2xl font-black text-gray-800 dark:text-white">
             {activeTab === 'DASHBOARD' ? t("ar_46") : activeTab === 'MAP' ? t("ar_47") : activeTab === 'ORDERS' ? t("ar_48") : activeTab === 'DRIVERS' ? t("ar_49") : activeTab === 'USERS_MGMT' ? t("ar_50") : activeTab === 'CUSTOMERS' ? t("ar_51") : activeTab === 'FINANCIALS' ? t("ar_52") : activeTab === 'ANALYTICS' ? t("ar_53") : activeTab === 'NOTIFICATIONS' ? t("ar_54") : activeTab === 'NEW_DRIVERS' ? (isAr ? 'طلبات الانضمام' : 'Join Requests') : t("ar_55")}
         </h2>
         {activeTab === 'MAP' && <button onClick={() => requestLocationPulse()} className="bg-orange-50 hover:bg-orange-100 text-primary px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-sm border border-orange-200 shrink-0">
                  <RefreshCcw size={14} className="animate-spin-slow" />
                  <span className="hidden sm:inline">{t("ar_56")}</span> 📡
              </button>}
      </div>

      {/* --- FINANCIALS TAB --- */}
      {activeTab === 'FINANCIALS' && currentUser?.role === Role.ADMIN && <div className="space-y-6 animate-in fade-in pb-10">
              {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 md:p-6 rounded-[2rem] text-white shadow-xl shadow-green-100 dark:shadow-none">
                          <div className="text-green-100 text-[10px] md:text-xs font-bold mb-1">{t("ar_57")}</div>
                          <div className="text-2xl md:text-3xl font-black">{financialStats.todayTotal} <span className="text-sm opacity-80">{CURRENCY}</span></div>
                          <div className="text-green-200 text-[9px] md:text-[10px] mt-2 font-bold flex items-center gap-1">
                              <TrendingUp size={12} />{t("ar_58")}</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 md:p-6 rounded-[2rem] text-white shadow-xl shadow-blue-100 dark:shadow-none">
                          <div className="text-blue-100 text-[10px] md:text-xs font-bold mb-1">{t("ar_59")}</div>
                          <div className="text-2xl md:text-3xl font-black">{financialStats.monthTotal} <span className="text-sm opacity-80">{CURRENCY}</span></div>
                          <div className="text-blue-200 text-[9px] md:text-[10px] mt-2 font-bold flex items-center gap-1">
                              <Calendar size={12} />{t("ar_60")}</div>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800 to-black p-5 md:p-6 rounded-[2rem] text-white shadow-xl shadow-gray-200 dark:shadow-none">
                          <div className="text-gray-300 text-[10px] md:text-xs font-bold mb-1">{t("ar_61")}</div>
                          <div className="text-2xl md:text-3xl font-black">{financialStats.allTimeTotal} <span className="text-sm opacity-80">{CURRENCY}</span></div>
                          <div className="text-gray-400 text-[9px] md:text-[10px] mt-2 font-bold flex items-center gap-1">
                              <BarIcon size={12} />{t("ar_62")}</div>
                      </div>
                  </div>

              {/* Drivers Detailed List */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 mx-2">
                  <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                      <Users size={20} className="text-primary" />{t("ar_63")}</h3>
                  
                  <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                      <table className="w-full text-right border-collapse min-w-[500px] md:min-w-0">
                          <thead>
                              <tr className="text-gray-400 text-[10px] uppercase font-black border-b border-gray-100 dark:border-gray-700">
                                  <th className="pb-4 pr-2 text-right">{t("ar_64")}</th>
                                  <th className="pb-4 text-right">{t("ar_8")}</th>
                                  <th className="pb-4 text-right hidden sm:table-cell">{t("ar_65")}</th>
                                  <th className="pb-4 text-right hidden md:table-cell">{t("ar_66")}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                              {financialStats.driversStats.map(stat => <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors border-b last:border-0 border-gray-50 dark:border-gray-700">
                                      <td className="py-4 pr-2">
                                          <div className="font-black text-xs md:text-sm text-gray-800 dark:text-gray-200">{stat.name}</div>
                                      </td>
                                      <td className="py-4">
                                          <div className="font-bold text-xs md:text-sm text-green-600">{stat.today} <span className="text-[10px] opacity-70 font-medium">{CURRENCY}</span></div>
                                      </td>
                                      <td className="py-4 hidden sm:table-cell">
                                          <div className="font-bold text-xs md:text-sm text-blue-600">{stat.month} <span className="text-[10px] opacity-70 font-medium">{CURRENCY}</span></div>
                                      </td>
                                      <td className="py-4 hidden md:table-cell">
                                          <div className="font-bold text-xs md:text-sm text-gray-500">{stat.allTime} <span className="text-[10px] opacity-70 font-medium">{CURRENCY}</span></div>
                                      </td>
                                  </tr>)}
                          </tbody>
                      </table>
                  </div>
                  
                  {financialStats.driversStats.length === 0 && <div className="text-center py-10 text-gray-400 font-bold text-sm">{t("ar_67")}</div>}
              </div>

          </div>}

      {/* --- MAP TAB --- */}
      {activeTab === 'MAP' && <section className="h-[calc(100vh-200px)] px-2 animate-in fade-in relative">
              <LiveMap users={users} orders={orders} />
          </section>}

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'DASHBOARD' && <section className="space-y-4 px-2 animate-in fade-in">
              {/* EMERGENCY ALERT SECTION FOR CANCELLATIONS */}
              {pendingCancellations.length > 0 && <div className="bg-red-500 rounded-3xl p-5 text-white shadow-xl shadow-red-200 border-2 border-red-100">
                      <h3 className="text-lg font-black flex items-center gap-2 mb-3">
                          <AlertTriangle size={24} className="text-yellow-300" />{t("ar_68")}{pendingCancellations.length})
                      </h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
                          {pendingCancellations.map(order => <div key={order.id} className="bg-white text-gray-800 p-4 rounded-2xl shadow-md">
                                  <div className="flex justify-between items-center mb-3">
                                      <div className="text-lg font-black text-red-600 truncate">{t("ar_69")}{order.id.slice(-4)}</div>
                                      <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-black">{t("ar_70")}</div>
                                  </div>
                                  <div className="text-sm font-bold text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">{t("ar_71")}{order.cancellationRequest?.reason}</div>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => handleApproveCancellation(order.id)} className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm">
                                          <Trash2 size={16} />{t("ar_72")}</button>
                                      <button onClick={() => handleRejectCancellation(order.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm">{t("ar_73")}</button>
                                      <button onClick={() => setSelectedOrder(order)} className="col-span-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-black text-xs transition-all active:scale-95 mt-1 border border-blue-100">{t("ar_74")}</button>
                                  </div>
                              </div>)}
                      </div>
                  </div>}


                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {currentUser?.role === Role.ADMIN && <div className="col-span-2 bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-5 md:p-6 text-white shadow-xl shadow-orange-100 flex flex-col items-center justify-center">
                          <div className="text-orange-100 text-xs font-bold mb-1 uppercase tracking-wider">{t("ar_75")}</div>
                          <h3 className="text-3xl md:text-4xl font-black">{financialStats.todayTotal} <span className="text-sm opacity-80">{CURRENCY}</span></h3>
                      </div>}
                      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm ${currentUser?.role !== Role.ADMIN ? 'col-span-1 lg:col-span-2' : ''}`}>
                          <Package size={24} className="text-primary mb-1" />
                          <span className="text-xl font-black">{orders.length}</span>
                          <span className="text-[10px] font-bold text-gray-400">{t("ar_76")}</span>
                      </div>
                      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm ${currentUser?.role !== Role.ADMIN ? 'col-span-1 lg:col-span-2' : ''}`}>
                          <Truck size={24} className="text-secondary mb-1" />
                          <span className="text-xl font-black">{users.filter(u => (u.role as string) === 'DRIVER' || (u.role as string) === 'agent' || (u.role as string) === 'driver').length}</span>
                          <span className="text-[10px] font-bold text-gray-400">{t("ar_77")}</span>
                      </div>
                      {currentUser?.role === Role.ADMIN && <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm col-span-2 lg:col-span-1`}>
                          <Users size={24} className="text-purple-500 mb-1" />
                          <span className="text-xl font-black">{users.filter(u => (u.role as string) === 'CUSTOMER' || (u.role as string) === 'customer').length}</span>
                          <span className="text-[10px] font-bold text-gray-400">{t("ar_78")}</span>
                      </div>}
                  </div>

                  {/* ADMIN & EMPLOYEE TOOLS BENTO GRID */}
                  <div className="pt-6">
                      <h3 className="text-base font-black text-gray-800 dark:text-white mb-4 px-1 flex items-center gap-2">
                          <span>{t("ar_79")}</span>
                          <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{t("ar_80")}</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {[{
            id: 'ORDERS',
            label: t("ar_36"),
            desc: isAr ? 'استعراض وإدارة جميع طلبات التوصيل وحالتها في النظام' : 'View and manage all system delivery orders and their status',
            icon: Package,
            color: 'text-primary bg-orange-50 dark:bg-orange-950/20'
          }, {
            id: 'MAP',
            label: t("ar_81"),
            desc: t("ar_82"),
            icon: MapPin,
            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
          }, {
            id: 'CREATE_ORDER',
            label: t("ar_83"),
            desc: t("ar_84"),
            icon: PlusCircle,
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
          }, {
            id: 'DRIVERS',
            label: t("ar_85"),
            desc: t("ar_86"),
            icon: Truck,
            color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20'
          }, {
            id: 'ANALYTICS',
            label: t("ar_87"),
            desc: t("ar_88"),
            icon: TrendingUp,
            color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20'
          }, {
            id: 'HEATMAP',
            label: t("ar_41"),
            desc: t("ar_89"),
            icon: Flame,
            color: 'text-red-500 bg-red-50 dark:bg-red-950/20'
          }, {
            id: 'CUSTOMERS',
            label: t("ar_90"),
            desc: t("ar_91"),
            icon: Users,
            color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20',
            adminOnly: true
          }, {
            id: 'FINANCIALS',
            label: t("ar_92"),
            desc: t("ar_93"),
            icon: Wallet,
            color: 'text-green-500 bg-green-50 dark:bg-green-950/20',
            adminOnly: true
          }, {
            id: 'USERS_MGMT',
            label: t("ar_94"),
            desc: t("ar_95"),
            icon: UserCheck,
            color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20',
            adminOnly: true
          }, {
            id: 'NOTIFICATIONS',
            label: t("ar_96"),
            desc: t("ar_97"),
            icon: Bell,
            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
            adminOnly: true
          }, {
            id: 'NEW_DRIVERS',
            label: isAr ? 'طلبات الطيارين' : 'New Drivers',
            desc: isAr ? 'مراجعة طلبات الانضمام الجديدة للطيارين' : 'Review new driver join applications',
            icon: UserPlus,
            color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20',
            adminOnly: true
          }, {
            id: 'SETTINGS',
            label: t("ar_98"),
            desc: t("ar_99"),
            icon: Settings,
            color: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
            adminOnly: true
          }].filter(tool => {
            if (currentUser?.role === Role.EMPLOYEE && tool.adminOnly) return false;
            return true;
          }).map(tool => <motion.button whileTap={{
            scale: 0.97
          }} key={tool.id} onClick={() => {
            if (tool.id === 'CREATE_ORDER') {
              if (onNavigateMain) onNavigateMain('CREATE_ORDER');
            } else {
              setActiveTab(tool.id as any);
            }
          }} className="bg-white dark:bg-gray-800 p-4 rounded-[1.8rem] border border-gray-100 dark:border-gray-700 text-right shadow-sm flex flex-col justify-between h-36 hover:border-primary hover:shadow-md transition-all group cursor-pointer">
                                  <div className={`p-2.5 rounded-2xl w-fit ${tool.color} transition-colors group-hover:bg-primary group-hover:text-white`}>
                                      <tool.icon size={22} />
                                  </div>
                                  <div className="mt-3">
                                      <div className="font-black text-sm text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">{tool.label}</div>
                                      <div className="text-[10px] font-bold text-gray-400 mt-1 line-clamp-2 leading-relaxed">{tool.desc}</div>
                                  </div>
                              </motion.button>)}
                      </div>
                  </div>
          </section>}

      {/* --- USERS MANAGEMENT TAB --- */}
      {activeTab === 'USERS_MGMT' && currentUser?.role === Role.ADMIN && <section className="px-2 space-y-3 animate-in fade-in">
              <div className="relative mx-1">
                   <input className="w-full p-4 pl-12 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 font-bold text-sm" placeholder={t("ar_100")} value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} />
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1 max-h-[600px] overflow-y-auto py-2">
                  {(userSearchTerm ? filteredUsers : paginatedUsers).map(user => <div key={user.id} className={`p-4 rounded-2xl shadow-sm border transition-all ${user.isBlocked ? 'bg-red-50 border-red-100' : 'bg-white border-gray-50 dark:border-gray-700 shadow-gray-100'}`}>
                          {editingUserId === user.id ? <div className="space-y-2">
                                  <input className="w-full p-2.5 bg-gray-50 rounded-xl border text-sm font-bold" value={editUserForm.name} onChange={e => setEditUserForm(prev => ({
              ...prev,
              name: e.target.value
            }))} />
                                  <input className="w-full p-2.5 bg-gray-50 rounded-xl border text-sm font-bold" value={editUserForm.phone} onChange={e => setEditUserForm(prev => ({
              ...prev,
              phone: e.target.value
            }))} />
                                  <div className="flex gap-2">
                                      <button onClick={saveEditUser} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-black text-xs">{t("ar_101")}</button>
                                      <button onClick={() => setEditingUserId(null)} className="flex-1 bg-gray-200 text-gray-600 py-2.5 rounded-xl font-black text-xs">{t("ar_102")}</button>
                                  </div>
                              </div> : <div className="flex items-center justify-between">
                                  <div>
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                          <h4 className="font-black text-base text-gray-800 dark:text-gray-200">{user.name}</h4>
                                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${[Role.ADMIN, Role.EMPLOYEE].includes(user.role) ? 'bg-red-100 text-red-600' : ((user.role as string) === Role.DRIVER || (user.role as string) === 'agent' || (user.role as string) === 'driver') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                              {user.role}
                                          </span>
                                      </div>
                                      <div className="text-gray-400 font-bold text-[10px]">{user.phone}</div>
                                  </div>
                                  <div className="flex gap-1.5">
                                      <button onClick={() => startEditUser(user)} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-blue-500 border border-gray-100 dark:border-gray-700"><Edit2 size={18} /></button>
                                      <button onClick={() => toggleBlockUser(user)} className={`p-2.5 rounded-xl border ${user.isBlocked ? 'bg-green-500 text-white border-green-600' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                          {user.isBlocked ? <UserCheck size={18} /> : <UserX size={18} />}
                                      </button>
                                  </div>
                              </div>}
                      </div>)}
              </div>
              
              {!userSearchTerm && paginatedUsers.length < totalUsers && (
                <div className="flex justify-center pt-4 pb-8">
                  <Button variant="outline" onClick={() => setUsersPage(prev => prev + 1)}>
                    {isAr ? "عرض المزيد" : "Load More"}
                  </Button>
                </div>
              )}
          </section>}

      {/* --- NOTIFICATIONS TAB --- */}
      {activeTab === 'NOTIFICATIONS' && currentUser?.role === Role.ADMIN && <section className="space-y-4 px-2 animate-in fade-in slide-in-from-right-4">
              <AdminNotificationsTab />
          </section>}

      
      {/* --- NEW DRIVERS TAB --- */}
      {activeTab === 'NEW_DRIVERS' && currentUser?.role === Role.ADMIN && <section className="space-y-4 px-2 animate-in fade-in slide-in-from-right-4">
              <NewDriversTab />
          </section>}

      {/* --- SETTINGS TAB (Users & Zones) --- */}
      {activeTab === 'SETTINGS' && currentUser?.role === Role.ADMIN && <section className="space-y-4 px-2 animate-in fade-in slide-in-from-right-4">
              <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                      {/* Tabs */}
                      <div className="flex gap-2 mb-6 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto whitespace-nowrap">
                          <button onClick={() => setMgmtTab('ADD_DRIVER')} className={`flex-1 py-3 px-3 text-xs font-bold rounded-lg transition-colors ${mgmtTab === 'ADD_DRIVER' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_103")}</button>
                          <button onClick={() => setMgmtTab('ADD_ADMIN')} className={`flex-1 py-3 px-3 text-xs font-bold rounded-lg transition-colors ${mgmtTab === 'ADD_ADMIN' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_104")}</button>
                          <button onClick={() => setMgmtTab('ADD_EMPLOYEE')} className={`flex-1 py-3 px-3 text-xs font-bold rounded-lg transition-colors ${mgmtTab === 'ADD_EMPLOYEE' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_105")}</button>
                          <button onClick={() => setMgmtTab('REGIONS_PRICES')} className={`flex-1 py-3 px-3 text-xs font-bold rounded-lg transition-colors ${mgmtTab === 'REGIONS_PRICES' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_106")}</button>
                          <button onClick={() => setMgmtTab('GOVERNORATES')} className={`flex-1 py-3 px-3 text-xs font-bold rounded-lg transition-colors ${mgmtTab === 'GOVERNORATES' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_107")}</button>
                          <button onClick={() => setMgmtTab('WAITLIST')} className={`flex-1 py-3 px-3 text-xs font-bold rounded-lg transition-colors ${mgmtTab === 'WAITLIST' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>{isAr ? "قائمة الانتظار ⏳" : "Waitlist ⏳"}</button>
                      </div>

                      {/* Add Driver / Admin Content */}
                      {(mgmtTab === 'ADD_DRIVER' || mgmtTab === 'ADD_ADMIN' || mgmtTab === 'ADD_EMPLOYEE') && <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm space-y-4 animate-in fade-in max-w-lg mx-auto">
                              <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2 mb-2 text-lg">
                                  {mgmtTab === 'ADD_DRIVER' ? <Truck size={24} className="text-secondary" /> : mgmtTab === 'ADD_ADMIN' ? <Shield size={24} className="text-red-500" /> : <Briefcase size={24} className="text-teal-500" />}
                                  {mgmtTab === 'ADD_DRIVER' ? t("ar_108") : mgmtTab === 'ADD_ADMIN' ? t("ar_109") : t("ar_110")}
                              </h3>
                              
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">{t("ar_111")}</label>
                                      <div className="relative">
                                          <input className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-primary outline-none" placeholder={t("ar_112")} value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                                          <UserPlus size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      </div>
                                  </div>

                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">{t("ar_113")}</label>
                                      <div className="relative">
                                          <input className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-primary outline-none" placeholder="01xxxxxxxxx" type="tel" maxLength={11} value={newUserPhone} onChange={e => setNewUserPhone(sanitizePhoneInput(e.target.value))} dir="ltr" />
                                          <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      </div>
                                  </div>

                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">{t("ar_114")}</label>
                                      <div className="relative">
                                          <input className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-primary outline-none" placeholder="******" type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
                                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      </div>
                                  </div>
                              </div>

                              <Button fullWidth onClick={() => handleCreateUser(mgmtTab === 'ADD_DRIVER' ? Role.DRIVER : mgmtTab === 'ADD_ADMIN' ? Role.ADMIN : Role.EMPLOYEE)} disabled={isLoading}>
                                  {isLoading ? t("ar_115") : `Add ${mgmtTab === "ADD_DRIVER" ? t("ar_116") : mgmtTab === "ADD_ADMIN" ? t("ar_117") : t("ar_118")}`}
                              </Button>
                          </div>}

                      {/* Regions Content */}
                      {mgmtTab === 'REGIONS_PRICES' && <div className="space-y-6 max-w-xl mx-auto">
                            <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2 text-lg">
                                <MapPin size={24} className="text-primary" />{t("ar_106")}</h3>

                            {/* Add New Region */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_119")}</label>
                                    <input className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder={t("ar_120")} value={newZoneName} onChange={e => setNewZoneName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_121")}</label>
                                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-center" value={newZonePrices.SHOPPING} onChange={e => setNewZonePrices({
                    ...newZonePrices,
                    SHOPPING: Number(e.target.value)
                  })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_122")}</label>
                                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-center" value={newZonePrices.EMERGENCY} onChange={e => setNewZonePrices({
                    ...newZonePrices,
                    EMERGENCY: Number(e.target.value)
                  })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_123")}</label>
                                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-center" value={newZonePrices.PICK_DROP} onChange={e => setNewZonePrices({
                    ...newZonePrices,
                    PICK_DROP: Number(e.target.value)
                  })} />
                                    </div>
                                </div>
                                <button onClick={async () => {
                if (!newZoneName) {
                  toast.error(t("ar_10"));
                  return;
                }
                await addZone(newZoneName, newZonePrices.SHOPPING, {
                  ...newZonePrices,
                  GOVERNORATE: 0
                });
                setNewZoneName('');
                setNewZonePrices({
                  SHOPPING: 0,
                  EMERGENCY: 0,
                  PICK_DROP: 0,
                  GOVERNORATE: 0
                });
                toast.success(t("ar_124"));
              }} className="w-full bg-primary hover:bg-orange-600 text-white p-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm">
                                    <Plus size={16} />{t("ar_125")}</button>
                            </div>

                            {/* List Regions */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto p-1 scrollbar-hide">
                                {zones.filter(z => !z.id.startsWith('gov-')).map(zone => <div key={zone.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex justify-between items-center border border-gray-100 dark:border-gray-700 group hover:border-gray-300 transition-colors">
                                        {editingZoneId === zone.id ? <div className="flex-1 flex flex-col gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <input className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700" value={editName} autoFocus onChange={e => setEditName(e.target.value)} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">الاسم بالعربية</label>
                                                        <input className="w-full p-2 border border-gray-200 rounded-lg text-xs" value={editNameAr} onChange={e => setEditNameAr(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">الاسم بالإنجليزية</label>
                                                        <input className="w-full p-2 border border-gray-200 rounded-lg text-xs" value={editNameEn} onChange={e => setEditNameEn(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-gray-400 text-center block">{t("ar_121")}</label>
                                                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg font-bold text-center text-xs" value={editPrices.SHOPPING} onChange={e => setEditPrices({
                                                          ...editPrices,
                                                          SHOPPING: Number(e.target.value)
                                                        })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-gray-400 text-center block">{t("ar_122")}</label>
                                                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg font-bold text-center text-xs" value={editPrices.EMERGENCY} onChange={e => setEditPrices({
                                                          ...editPrices,
                                                          EMERGENCY: Number(e.target.value)
                                                        })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-gray-400 text-center block">{t("ar_123")}</label>
                                                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg font-bold text-center text-xs" value={editPrices.PICK_DROP} onChange={e => setEditPrices({
                                                          ...editPrices,
                                                          PICK_DROP: Number(e.target.value)
                                                        })} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">حالة التغطية</label>
                                                        <select className="w-full p-1.5 border border-gray-200 rounded-lg text-xs bg-white dark:bg-gray-800" value={editStatus} onChange={e => setEditStatus(e.target.value as any)}>
                                                            <option value="active">نشط</option>
                                                            <option value="inactive">غير نشط</option>
                                                            <option value="coming_soon">قريباً</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">المركز (Lat / Lng)</label>
                                                        <div className="flex gap-1">
                                                            <input type="number" placeholder="Lat" className="w-1/2 p-1.5 border border-gray-200 rounded-lg text-[10px] text-center" value={editCenterLat} onChange={e => setEditCenterLat(e.target.value)} />
                                                            <input type="number" placeholder="Lng" className="w-1/2 p-1.5 border border-gray-200 rounded-lg text-[10px] text-center" value={editCenterLng} onChange={e => setEditCenterLng(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">نصف القطر (كم)</label>
                                                        <input type="number" placeholder="Radius (km)" className="w-full p-1.5 border border-gray-200 rounded-lg text-xs text-center" value={editRadiusKm} onChange={e => setEditRadiusKm(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end mt-1">
                                                    <button onClick={handleSaveZoneEdit} className="bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 text-sm font-bold flex gap-1 items-center">
                                                        <Save size={14} />{t("ar_127")}</button>
                                                    <button onClick={() => setEditingZoneId(null)} className="bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-300 text-sm font-bold">{t("ar_102")}</button>
                                                </div>
                                            </div> : <>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{zone.nameAr || zone.name}</span>
                                                        <span className="text-[10px] text-gray-400">({zone.nameEn || zone.id})</span>
                                                        
                                                        {zone.status === 'active' && (
                                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">نشط</span>
                                                        )}
                                                        {zone.status === 'coming_soon' && (
                                                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">قريباً</span>
                                                        )}
                                                        {(zone.status === 'inactive' || !zone.status) && (
                                                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold">غير نشط</span>
                                                        )}
                                                    </div>

                                                    {zone.centerLat && zone.centerLng && (
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                            التغطية: دائرية ({Number(zone.centerLat).toFixed(3)}, {Number(zone.centerLng).toFixed(3)}) بمحيط {zone.radiusKm || 5} كم
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 text-[10px] text-gray-400 mt-1 font-bold">
                                                        <span>{t("ar_128")}{zone.prices?.SHOPPING}{t("ar_129")}</span> | 
                                                        <span>{t("ar_130")}{zone.prices?.EMERGENCY}{t("ar_129")}</span> | 
                                                        <span>{t("ar_131")}{zone.prices?.PICK_DROP}{t("ar_129")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleStartEditZone(zone)} className="bg-gray-100 p-2 rounded-lg text-blue-600 hover:bg-blue-50">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteZone(zone.id)} className="bg-gray-100 p-2 rounded-lg text-red-500 hover:bg-red-50">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>}
                                    </div>)}
                            </div>
                         </div>}

                      {/* Governorates Content */}
                      {mgmtTab === 'GOVERNORATES' && <div className="space-y-6 max-w-xl mx-auto">
                            <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2 text-lg">
                                <Globe size={24} className="text-primary" />{t("ar_107")}</h3>

                            {/* Add New Governorate */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_132")}</label>
                                    <input className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder={t("ar_133")} value={newZoneName} onChange={e => setNewZoneName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_134")}</label>
                                    <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-center" value={newZonePrices.GOVERNORATE} onChange={e => setNewZonePrices({
                  ...newZonePrices,
                  GOVERNORATE: Number(e.target.value)
                })} />
                                </div>
                                <button onClick={async () => {
                if (!newZoneName) {
                  toast.error(t("ar_135"));
                  return;
                }
                const customId = 'gov-' + Date.now();
                const priceVal = newZonePrices.GOVERNORATE || 0;
                await addZone(newZoneName, priceVal, {
                  SHOPPING: priceVal,
                  EMERGENCY: priceVal,
                  PICK_DROP: priceVal,
                  GOVERNORATE: priceVal
                }, customId);
                setNewZoneName('');
                setNewZonePrices({
                  SHOPPING: 0,
                  EMERGENCY: 0,
                  PICK_DROP: 0,
                  GOVERNORATE: 0
                });
                toast.success(t("ar_136"));
              }} className="w-full bg-primary hover:bg-orange-600 text-white p-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm">
                                    <Plus size={16} />{t("ar_137")}</button>
                            </div>

                            {/* List Governorates */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto p-1 scrollbar-hide">
                                {zones.filter(z => z.id.startsWith('gov-')).map(zone => <div key={zone.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex justify-between items-center border border-gray-100 dark:border-gray-700 group hover:border-gray-300 transition-colors">
                                        {editingZoneId === zone.id ? <div className="flex-1 flex flex-col gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <input className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700" value={editName} autoFocus onChange={e => setEditName(e.target.value)} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">الاسم بالعربية</label>
                                                        <input className="w-full p-2 border border-gray-200 rounded-lg text-xs" value={editNameAr} onChange={e => setEditNameAr(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">الاسم بالإنجليزية</label>
                                                        <input className="w-full p-2 border border-gray-200 rounded-lg text-xs" value={editNameEn} onChange={e => setEditNameEn(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">{t("ar_134")}</label>
                                                    <input type="number" className="w-full p-2 border border-gray-200 rounded-lg font-bold text-center text-sm" value={editPrices.GOVERNORATE} onChange={e => setEditPrices({
                                                      ...editPrices,
                                                      GOVERNORATE: Number(e.target.value),
                                                      SHOPPING: Number(e.target.value),
                                                      EMERGENCY: Number(e.target.value),
                                                      PICK_DROP: Number(e.target.value)
                                                    })} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">حالة التغطية</label>
                                                        <select className="w-full p-1.5 border border-gray-200 rounded-lg text-xs bg-white dark:bg-gray-800" value={editStatus} onChange={e => setEditStatus(e.target.value as any)}>
                                                            <option value="active">نشط</option>
                                                            <option value="inactive">غير نشط</option>
                                                            <option value="coming_soon">قريباً</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">المركز (Lat / Lng)</label>
                                                        <div className="flex gap-1">
                                                            <input type="number" placeholder="Lat" className="w-1/2 p-1.5 border border-gray-200 rounded-lg text-[10px] text-center" value={editCenterLat} onChange={e => setEditCenterLat(e.target.value)} />
                                                            <input type="number" placeholder="Lng" className="w-1/2 p-1.5 border border-gray-200 rounded-lg text-[10px] text-center" value={editCenterLng} onChange={e => setEditCenterLng(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">نصف القطر (كم)</label>
                                                        <input type="number" placeholder="Radius (km)" className="w-full p-1.5 border border-gray-200 rounded-lg text-xs text-center" value={editRadiusKm} onChange={e => setEditRadiusKm(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end mt-1">
                                                    <button onClick={handleSaveZoneEdit} className="bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 text-sm font-bold flex gap-1 items-center">
                                                        <Save size={14} />{t("ar_127")}</button>
                                                    <button onClick={() => setEditingZoneId(null)} className="bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-300 text-sm font-bold">{t("ar_102")}</button>
                                                </div>
                                            </div> : <>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{zone.nameAr || zone.name}</span>
                                                        <span className="text-[10px] text-gray-400">({zone.nameEn || zone.id})</span>
                                                        
                                                        {zone.status === 'active' && (
                                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">نشط</span>
                                                        )}
                                                        {zone.status === 'coming_soon' && (
                                                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">قريباً</span>
                                                        )}
                                                        {(zone.status === 'inactive' || !zone.status) && (
                                                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold">غير نشط</span>
                                                        )}
                                                    </div>

                                                    {zone.centerLat && zone.centerLng && (
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                            التغطية: دائرية ({Number(zone.centerLat).toFixed(3)}, {Number(zone.centerLng).toFixed(3)}) بمحيط {zone.radiusKm || 50} كم
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 text-[10px] text-gray-400 mt-1 font-bold">
                                                        <span>{t("ar_139")}{zone.prices?.GOVERNORATE ?? zone.price}{t("ar_129")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleStartEditZone(zone)} className="bg-gray-100 p-2 rounded-lg text-blue-600 hover:bg-blue-50">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteZone(zone.id)} className="bg-gray-100 p-2 rounded-lg text-red-500 hover:bg-red-50">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>}
                                    </div>)}
                            </div>
                         </div>}

                      {mgmtTab === 'WAITLIST' && (
                          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
                              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                                  <div className="flex justify-between items-center flex-wrap gap-4">
                                      <div className={isAr ? 'text-right' : 'text-left'}>
                                          <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                                              <span>⏳ {isAr ? "قائمة اهتمام المناطق (الانتظار)" : "Zone Interest (Waitlist)"}</span>
                                              <span className="bg-orange-100 dark:bg-orange-950/40 text-primary dark:text-orange-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                                  {waitlistData.length} {isAr ? "مسجلين" : "registrants"}
                                              </span>
                                          </h3>
                                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                              {isAr 
                                                  ? "قائمة المستخدمين الذين سجلوا اهتمامهم بالطلب من المناطق قيد الإطلاق (Coming Soon)" 
                                                  : "List of users who registered interest in areas currently launching soon."}
                                          </p>
                                      </div>
                                      <button 
                                          onClick={() => {
                                              if (waitlistData.length === 0) {
                                                  toast.error(isAr ? "لا توجد بيانات لتصديرها" : "No data to export");
                                                  return;
                                              }
                                              const headers = "Name,Phone,Email,Zone,Registered At\n";
                                              const rows = waitlistData.map(e => {
                                                  const zName = zones.find(z => z.id === e.zoneId)?.name || e.zoneId;
                                                  return `"${e.name || ''}","${e.phone || ''}","${e.email || ''}","${zName}","${e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}"`;
                                              }).join("\n");
                                              const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                                              const url = URL.createObjectURL(blob);
                                              const link = document.createElement("a");
                                              link.setAttribute("href", url);
                                              link.setAttribute("download", `waitlist_${new Date().toISOString().split('T')[0]}.csv`);
                                              link.style.visibility = 'hidden';
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              toast.success(isAr ? "تم تصدير ملف CSV بنجاح" : "CSV exported successfully");
                                          }}
                                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                                      >
                                          {isAr ? "تصدير CSV 📤" : "Export CSV 📤"}
                                      </button>
                                  </div>

                                  {waitlistData.length === 0 ? (
                                      <div className="py-12 text-center text-gray-400 dark:text-gray-500 font-bold space-y-2">
                                          <div className="text-3xl">⏳</div>
                                          <div>{isAr ? "لا يوجد مسجلين في قائمة الانتظار حتى الآن" : "No registered users in the waitlist yet"}</div>
                                      </div>
                                  ) : (
                                      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                                          <table className="w-full text-right" dir={isAr ? "rtl" : "ltr"}>
                                              <thead>
                                                  <tr className="bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 text-xs font-bold border-b border-gray-100 dark:border-gray-700">
                                                      <th className="px-4 py-3 text-right">{isAr ? "الاسم" : "Name"}</th>
                                                      <th className="px-4 py-3 text-right">{isAr ? "الهاتف" : "Phone"}</th>
                                                      <th className="px-4 py-3 text-right">{isAr ? "البريد الإلكتروني" : "Email"}</th>
                                                      <th className="px-4 py-3 text-right">{isAr ? "المنطقة" : "Zone"}</th>
                                                      <th className="px-4 py-3 text-right">{isAr ? "تاريخ التسجيل" : "Registered At"}</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                                  {waitlistData.map((entry) => {
                                                      const zoneName = zones.find(z => z.id === entry.zoneId)?.name || entry.zoneId;
                                                      return (
                                                          <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                                              <td className="px-4 py-3 font-bold text-right">{entry.name}</td>
                                                              <td className="px-4 py-3 font-mono text-right">{entry.phone}</td>
                                                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-right">{entry.email || '-'}</td>
                                                              <td className="px-4 py-3 text-right">
                                                                  <span className="bg-orange-50 dark:bg-orange-950/20 text-primary dark:text-orange-400 px-2 py-0.5 rounded-md font-bold">
                                                                      {zoneName}
                                                                  </span>
                                                              </td>
                                                              <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-right">
                                                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : '-'}
                                                              </td>
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </section>}

      {/* ... (Orders Feed & Drivers Tab remain largely unchanged) ... */}
      
      {/* --- ORDERS TAB --- */}
      {activeTab === 'ORDERS' && <section className="px-2 space-y-6 animate-in fade-in">
              {/* Order search and list (simplified) */}
              <div className="mx-2 space-y-2">
                  <div className="relative">
                       <input 
                         className="w-full p-6 pr-14 pl-24 bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-gray-50 dark:border-gray-700 font-bold" 
                         placeholder={t("ar_140")} 
                         value={orderSearchTerm} 
                         onChange={e => setOrderSearchTerm(e.target.value)} 
                       />
                       <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                       <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                           <button onClick={startVoiceSearch} className="text-gray-400 hover:text-primary transition-colors p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title={isAr ? "البحث الصوتي" : "Voice search"}>
                               <Mic size={22} className="text-gray-400" />
                           </button>
                           {orderSearchTerm && (
                               <button onClick={() => setOrderSearchTerm('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1">
                                   <X size={20} />
                               </button>
                           )}
                       </div>
                  </div>
                  <div className="flex gap-2">
                      <div className="flex-1">
                          <label className="text-xs text-gray-500 font-bold mb-1 block">{isAr ? "من تاريخ" : "From Date"}</label>
                          <input type="date" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200" value={ordersStartDate} onChange={e => { setOrdersStartDate(e.target.value); setOrdersPage(1); }} />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs text-gray-500 font-bold mb-1 block">{isAr ? "إلى تاريخ" : "To Date"}</label>
                          <input type="date" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200" value={ordersEndDate} onChange={e => { setOrdersEndDate(e.target.value); setOrdersPage(1); }} />
                      </div>
                  </div>
                  {debouncedOrderSearchTerm && (
                    <div className="p-3 bg-primary/10 text-primary text-xs font-bold rounded-2xl flex items-center justify-between animate-pulse">
                      <span>
                        {isAr 
                          ? `نتائج البحث عن: "${debouncedOrderSearchTerm}"` 
                          : `Search results for: "${debouncedOrderSearchTerm}"`}
                      </span>
                      <span className="bg-primary text-white px-3 py-1 rounded-xl text-[10px]">
                        {totalOrders} {isAr ? "طلبات" : "orders"}
                      </span>
                    </div>
                  )}
              </div>
              <div className="space-y-4 px-2 max-h-[70vh] overflow-y-auto pt-2 pb-10 scrollbar-hide">
                  {paginatedOrders.map(order => <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] shadow-xl border-2 border-gray-50 dark:border-gray-800 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden hover:border-primary/40">
                          <div className="absolute top-0 right-0 bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-3xl shadow-sm z-10">
                              {ORDER_TYPE_LABELS[order.type] || order.type}
                          </div>
                          <div className="flex justify-between items-center mb-3 mt-2">
                              <StatusBadge status={order.status} />
                              <span className="font-black text-xl text-primary">{order.price} {CURRENCY}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mb-1 font-mono">
                            #{highlightMatch(order.id, debouncedOrderSearchTerm)}
                          </div>
                          <h4 className="font-black text-lg text-gray-800 dark:text-white truncate">
                            {highlightMatch(order.items, debouncedOrderSearchTerm)}
                          </h4>
                          <div className="grid grid-cols-2 gap-2 mt-4">
                             <div className="flex flex-col gap-0.5 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl truncate">
                               <span className="text-[9px] text-gray-400 font-bold uppercase">{isAr ? "العميل" : "Customer"}</span>
                               <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-bold text-xs truncate">
                                 <UserIcon size={12} className="text-gray-400" /> 
                                 {highlightMatch(users.find(u => u.id === order.customerId)?.name, debouncedOrderSearchTerm)}
                               </span>
                               {users.find(u => u.id === order.customerId)?.phone && (
                                 <span className="text-[10px] text-gray-500 font-semibold font-mono pl-3.5">
                                   {highlightMatch(users.find(u => u.id === order.customerId)?.phone, debouncedOrderSearchTerm)}
                                 </span>
                               )}
                             </div>
                             <div className="flex flex-col gap-0.5 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl truncate">
                               <span className="text-[9px] text-gray-400 font-bold uppercase">{isAr ? "الطيار" : "Driver"}</span>
                               <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-bold text-xs truncate">
                                 <Truck size={12} className="text-gray-400" /> 
                                 {highlightMatch(getDriverName(order.driverId), debouncedOrderSearchTerm)}
                               </span>
                               {users.find(u => u.id === order.driverId)?.phone && (
                                 <span className="text-[10px] text-gray-500 font-semibold font-mono pl-3.5">
                                   {highlightMatch(users.find(u => u.id === order.driverId)?.phone, debouncedOrderSearchTerm)}
                                 </span>
                               )}
                             </div>
                           </div>
                           
                           {(order.recipientPhone || order.deliveryAddress?.title) && (
                             <div className="mt-3 text-xs text-gray-500 flex flex-col gap-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                               {order.deliveryAddress?.title && (
                                 <div className="truncate">
                                   <span className="font-bold">{isAr ? "العنوان: " : "Address: "}</span>
                                   {highlightMatch(order.deliveryAddress.title, debouncedOrderSearchTerm)}
                                 </div>
                               )}
                               {order.recipientPhone && (
                                 <div className="font-mono text-[11px]">
                                   <span className="font-bold font-sans text-xs">{isAr ? "هاتف المستلم: " : "Recipient Phone: "}</span>
                                   {highlightMatch(order.recipientPhone, debouncedOrderSearchTerm)}
                                 </div>
                               )}
                             </div>
                           )}
                       </div>)}
                      
                  {!orderSearchTerm && paginatedOrders.length < totalOrders && (
                    <div className="flex justify-center pt-4 pb-8">
                      <Button variant="outline" onClick={() => setOrdersPage(prev => prev + 1)}>
                        {isAr ? "عرض المزيد" : "Load More"}
                      </Button>
                    </div>
                  )}
              </div>
          </section>}

      {/* --- DRIVERS LIST TAB --- */}
      {activeTab === 'DRIVERS' && <section className="px-2 space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 max-h-[70vh] overflow-y-auto pt-2 pb-10 scrollbar-hide">
                  {paginatedDrivers.map(driver => {
          const activeOrder = getDriverActiveOrder(driver.id);
          const driverOrders = orders.filter(o => o.driverId && String(o.driverId) === String(driver.id));
          const completedOrders = driverOrders.filter(o => o.status === OrderStatus.DELIVERED);
          const ratedOrders = driverOrders.filter(o => o.rating !== undefined && o.rating !== null);
          const avgRating = ratedOrders.length > 0 ? (ratedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / ratedOrders.length).toFixed(1) : '5.0';
          const avgDeliveryTime = driver.avgDeliveryTime || 0;
          return <div key={driver.id} className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] shadow-xl border-2 border-gray-100 dark:border-gray-700">
                             <div className="flex items-center justify-between mb-4">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl ${driver.isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                         {driver.name[0]}
                                     </div>
                                     <div>
                                         <div className="font-black text-lg">{driver.name}</div>
                                         <div className="text-xs text-gray-400 font-bold">{driver.isOnline ? t("ar_141") : t("ar_142")}</div>
                                         
                                         {/* Driver Performance Metrics */}
                                         <div className="flex flex-wrap gap-2 mt-2">
                                             <span className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                                                 <Star size={10} className="fill-current" />
                                                 {avgRating} ({ratedOrders.length}{t("ar_143")}</span>
                                             {avgDeliveryTime > 0 && <span className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                                                      <Clock size={10} />
                                                      {Math.round(avgDeliveryTime)}{t("ar_144")}</span>}
                                             <span className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                                                 <CheckCircle size={10} />
                                                 {completedOrders.length}{t("ar_145")}</span>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                             {activeOrder ? <div onClick={() => setSelectedOrder(activeOrder)} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl border-2 border-blue-100 dark:border-blue-800 cursor-pointer">
                                     <div className="text-[10px] font-black text-blue-500 uppercase mb-1 flex items-center gap-2">
                                         <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>{t("ar_146")}</div>
                                     <div className="font-bold text-sm truncate">{activeOrder.items}</div>
                                 </div> : <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl text-center text-gray-400 font-bold text-sm">{t("ar_147")}</div>}
                             <button onClick={() => setSelectedDriverHistoryId(driver.id)} className="w-full mt-4 bg-gray-100 py-3 rounded-2xl font-bold text-gray-600 text-xs shadow-inner">{t("ar_148")}</button>
                          </div>;
        })}
              </div>
              
              {paginatedDrivers.length < totalDrivers && (
                <div className="flex justify-center pt-4 pb-8">
                  <Button variant="outline" onClick={() => setDriversPage(prev => prev + 1)}>
                    {isAr ? "عرض المزيد" : "Load More"}
                  </Button>
                </div>
              )}
          </section>}

      {/* --- ANALYTICS TAB --- */}
      {activeTab === 'ANALYTICS' && <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {driverPerformance.map((driver, index) => <div key={driver.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                          {/* Rank Badge */}
                          <div className={`absolute top-0 left-0 px-4 py-2 font-black text-xs text-white rounded-br-[1.5rem] shadow-sm z-10 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-primary'}`}>{t("ar_149")}{index + 1}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-4 mb-6">
                              <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center text-white text-2xl font-black">
                                  {driver.name.charAt(0)}
                              </div>
                              <div className="flex-1">
                                  <h3 className="font-black text-xl text-gray-800 dark:text-white truncate">{driver.name}</h3>
                              </div>
                              <div className="text-right">
                                  <div className="text-[10px] font-black text-gray-400 uppercase">{t("ar_150")}</div>
                                  <div className="text-xl font-black text-primary">{Math.max(0, Math.floor(driver.profitScore))}</div>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-3xl">
                                  <div className="text-[10px] uppercase font-black text-gray-400 mb-1">{t("ar_151")}</div>
                                  <div className="text-2xl font-black text-gray-800 dark:text-white">{driver.completedCount}</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-3xl">
                                  <div className="text-[10px] uppercase font-black text-gray-400 mb-1">{t("ar_152")}</div>
                                  <div className="text-xl font-black text-green-600 font-mono">{driver.totalRevenue}</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-3xl">
                                  <div className="text-[10px] uppercase font-black text-gray-400 mb-1">{t("ar_153")}</div>
                                  <div className="text-xl font-black text-blue-500">{driver.avgDeliveryTime?.toFixed(0) || '--'}{t("ar_154")}</div>
                              </div>
                          </div>
                          
                          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <TrendingUp size={16} className="text-primary" />
                                  <span className="text-xs font-black text-gray-600 dark:text-gray-300">{t("ar_155")}</span>
                              </div>
                              <span className="text-sm font-black text-primary">{t("ar_156")}</span>
                          </div>
                      </div>)}
              </div>
          </div>}

      {/* --- HEATMAP TAB --- */}
      {activeTab === 'HEATMAP' && <div className="bg-white dark:bg-gray-800 p-4 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[600px] border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Flame className="text-orange-500 animate-pulse" />{t("ar_157")}</h2>
                    <p className="text-xs font-bold text-gray-400 mt-1">{t("ar_158")}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                          <button onClick={() => setHeatmapViewMode('MAP')} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 ${heatmapViewMode === 'MAP' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                              <MapPin size={12} />{t("ar_35")}</button>
                          <button onClick={() => setHeatmapViewMode('LIST')} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 ${heatmapViewMode === 'LIST' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                              <List size={12} />{t("ar_159")}</button>
                      </div>
                      <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                  {[1, 7, 30].map(days => <button key={days} onClick={() => setHeatmapRangeDays(days)} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${heatmapRangeDays === days ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                  {days === 1 ? t("ar_8") : `Last ${days} days`}
                              </button>)}
                      </div>
                      <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                          <span className="text-[10px] font-black text-red-600 dark:text-red-400">{t("ar_160")}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 px-3 py-1.5 rounded-full border border-orange-100 dark:border-orange-900/30">
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                          <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">{t("ar_161")}</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 min-h-[600px] rounded-[2.5rem] overflow-hidden border-4 border-gray-50 dark:border-gray-900 relative shadow-inner">
                  {heatmapViewMode === 'MAP' ? <MapContainer center={[31.0360, 30.4600]} zoom={13} style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          zIndex: 1
        }} scrollWheelZoom={true} attributionControl={false}>
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" className="map-tiles no-invert" />
                          <HeatmapLayer points={heatmapPoints} options={{
            radius: 25,
            blur: 15,
            maxZoom: 15,
            max: 2,
            gradient: {
              0.4: 'blue',
              0.6: 'cyan',
              0.7: 'lime',
              0.8: 'yellow',
              1.0: 'red'
            }
          }} />
                      </MapContainer> : <div className="p-6 bg-gray-50 dark:bg-gray-900 h-full overflow-y-auto max-h-[600px]">
                          {orders.filter(o => Date.now() - o.createdAt < heatmapRangeDays * 24 * 60 * 60 * 1000).length === 0 ? <div className="text-center text-gray-500 py-12">{t("ar_162")}</div> : <div className="space-y-3">
                                  {orders.filter(o => Date.now() - o.createdAt < heatmapRangeDays * 24 * 60 * 60 * 1000).map(order => <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                          <div>
                                              <div className="font-bold text-gray-800 dark:text-gray-200">{t("ar_69")}{order.id.slice(0, 8)}</div>
                                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                  <MapPin size={12} /> {order.deliveryAddress?.title || order.deliveryAddress?.details || t("ar_163")}
                                              </div>
                                          </div>
                                          <StatusBadge status={order.status} />
                                      </div>)}
                              </div>}
                      </div>}
              </div>
          </div>}

      {/* --- CUSTOMERS LIST TAB --- */}
      {activeTab === 'CUSTOMERS' && currentUser?.role === Role.ADMIN && <section className="space-y-4">
              {allCustomers.length === 0 ? <div className="text-center py-12 text-gray-400">{t("ar_164")}</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pt-2 pb-10 scrollbar-hide">
                      {allCustomers.map(customer => <div key={customer.id} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-lg">
                                  {customer.name.charAt(0)}
                              </div>
                              <div className="flex-1">
                                  <h3 className="font-bold text-gray-800 dark:text-white">{customer.name}</h3>
                                  <div className="text-xs text-gray-500 font-bold">{customer.phone}</div>
                              </div>
                              {customer.savedAddresses && customer.savedAddresses.length > 0 && <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-xl text-center">
                                      <div className="text-xs font-bold text-gray-400">{t("ar_165")}</div>
                                      <div className="text-lg font-black text-gray-800 dark:text-white">{customer.savedAddresses.length}</div>
                                  </div>}
                          </div>)}
                  </div>}
          </section>}

      {/* COMPREHENSIVE ORDER DETAIL MODAL */}
      {selectedOrder && <OrderDetailsModal order={orders.find(o => o.id === selectedOrder.id) || selectedOrder} onClose={() => setSelectedOrder(null)} userRole={currentUser?.role || Role.ADMIN} onOpenMap={(targetLat?: number, targetLng?: number, address?: string) => {
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

      {/* DRIVER HISTORY MODAL (Simple List) */}
      {selectedDriverHistoryId && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in slide-in-from-bottom-10 duration-200">
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                  {/* Modal Header */}
                  <div className="bg-secondary p-6 text-white shrink-0">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="text-2xl font-black">{users.find(u => u.id === selectedDriverHistoryId)?.name}</h3>
                              <div className="flex items-center gap-2 opacity-90 font-bold text-sm">
                                  <Phone size={14} />
                                  {users.find(u => u.id === selectedDriverHistoryId)?.phone}
                              </div>
                          </div>
                          <button onClick={() => setSelectedDriverHistoryId(null)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                      
                      {/* Summary Stats in Modal */}
                      <div className="flex gap-3">
                          <div className="flex-1 bg-black/20 rounded-2xl p-3 backdrop-blur-sm">
                               <div className="text-[10px] font-bold opacity-70 mb-1">{t("ar_76")}</div>
                               <div className="text-2xl font-black">{getDriverHistory(selectedDriverHistoryId).length}</div>
                          </div>
                          <div className="flex-1 bg-black/20 rounded-2xl p-3 backdrop-blur-sm">
                               <div className="text-[10px] font-bold opacity-70 mb-1">{t("ar_166")}</div>
                               <div className="text-2xl font-black">
                                   {getDriverHistory(selectedDriverHistoryId).reduce((sum, o) => sum + o.price, 0)} {CURRENCY}
                               </div>
                          </div>
                      </div>
                  </div>

                  {/* History List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                      {getDriverHistory(selectedDriverHistoryId).length === 0 ? <div className="text-center py-10 text-gray-400">
                              <History size={48} className="mx-auto mb-2 opacity-50" />
                              <p>{t("ar_167")}</p>
                          </div> : getDriverHistory(selectedDriverHistoryId).map(order => <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => setSelectedOrder(order)}>
                                  <div>
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">#{order.id.slice(-4)}</span>
                                          <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('ar-EG')}</span>
                                      </div>
                                      <div className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{order.items}</div>
                                      <div className="text-[10px] text-gray-500 mt-0.5">{order.deliveryAddress.title}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="font-black text-primary">{order.price} {CURRENCY}</div>
                                      <div className="text-green-500 text-[10px] font-bold flex items-center justify-end gap-0.5">
                                          <CheckCircle size={10} />{t("ar_168")}</div>
                                  </div>
                              </div>)}
                  </div>
              </div>
          </div>}

      {/* --- CUSTOM DIALOG CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} onClick={() => setConfirmModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />

            {/* Modal Card */}
            <motion.div initial={{
          scale: 0.9,
          y: 20,
          opacity: 0
        }} animate={{
          scale: 1,
          y: 0,
          opacity: 1
        }} exit={{
          scale: 0.9,
          y: 20,
          opacity: 0
        }} transition={{
          type: "spring",
          stiffness: 300,
          damping: 25
        }} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative z-10 text-center">
              {/* Icon */}
              <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${confirmModal.isDanger ? 'bg-red-50 dark:bg-red-950/30 text-red-500' : 'bg-orange-50 dark:bg-orange-950/30 text-orange-500'}`}>
                <AlertTriangle size={28} className="animate-pulse" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 font-sans tracking-tight">
                {confirmModal.title}
              </h3>

              {/* Message */}
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                {confirmModal.message}
              </p>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => {
              confirmModal.onConfirm();
              setConfirmModal(null);
            }} variant="primary" className={`h-11 rounded-2xl text-sm font-black shadow-lg transition-all duration-250 ${confirmModal.isDanger ? 'bg-gradient-to-r from-red-500 to-red-650 hover:from-red-600 hover:to-red-700 text-white shadow-red-100/10' : 'bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 text-white shadow-orange-100/10'}`}>
                  {confirmModal.confirmText || t("ar_72")}
                </Button>
                
                <Button onClick={() => setConfirmModal(null)} type="button" variant="outline" className="h-11 rounded-2xl text-sm font-black border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {confirmModal.cancelText || t("ar_14")}
                </Button>
              </div>
            </motion.div>
          </div>}
      </AnimatePresence>
    </div>;
};