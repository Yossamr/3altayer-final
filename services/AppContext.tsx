import { useLanguage } from "./LanguageContext";
import toast from 'react-hot-toast';
import localforage from "localforage";
import { Capacitor, registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Order, Zone, Role, OrderType, OrderStatus, TimelineEvent, Address, Issue, Message, AppNotification } from '../types';
import { INITIAL_ZONES, CURRENCY } from '../constants';
import { VAPID_KEY, getFirebaseMessaging, firebaseAuth, googleProvider } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { signInWithPopup, signOut } from 'firebase/auth';
import { initializeDatabase, loginUserFromDB, registerUserInDB, createUserWithRoleInDB, getAllUsersFromDB, getUserByIdFromDB, createOrderInDB, getAllOrdersFromDB, updateOrderStatusInDB, updateUserPasswordInDB, updateUserStatusInDB, updateUserLocationInDB, requestCancellationInDB, rejectCancellationInDB, cancelOrderInDB, notifyDriverOfTrackingInDB, addUserAddressInDB, tryAcceptOrderInDB, sendMessageInDB, getMessagesFromDB, getRecentMessagesFromDB, getZonesFromDB, getPublicZonesFromDB, createZoneInDB, updateZoneInDB, deleteZoneInDB, updateUserProfileInDB, adminUpdateUserInDB, topUpWalletInDB, deductWalletInDB, submitOrderRatingInDB, triggerPushNotification, setCachedToken, getCachedToken, db } from './db';
interface AppContextType {
  currentUser: User | null;
  users: User[];
  orders: Order[];
  zones: Zone[];
  isNetworkAvailable: boolean;
  isDbReady: boolean;
  isInitializing: boolean;
  dbError: string | null;

  // Notifications
  unreadCount: number;
  autoOpenChatId: string | null;
  clearAutoOpenChat: () => void;
  resetUnreadCount: () => void;
  notificationsList: AppNotification[];
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  // Tracking State
  isTrackingActive: boolean;
  login: (phone: string, password: string, remember?: boolean) => Promise<{
    success: boolean;
    message?: string;
  }>;
  loginWithGoogle: (idToken: string) => Promise<{
    success: boolean;
    needsPhone?: boolean;
    needsLinking?: boolean;
    phone?: string;
    email?: string;
    name?: string;
    message?: string;
  }>;
  linkGoogleAccount: (idToken: string, password: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  completeGoogleRegistration: (idToken: string, name: string, phone: string, address: string, zoneId: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  register: (name: string, phone: string, password: string, address: string, zoneId: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  adminCreateUser: (name: string, phone: string, password: string, role: Role) => Promise<{
    success: boolean;
    message?: string;
  }>;
  logout: () => void;
  deleteAccount: () => Promise<{success: boolean; message?: string}>;
  createOrder: (order: Partial<Order>) => Promise<boolean>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, proof?: {
    imageUrl?: string;
    isQrScan?: boolean;
  }, delayReason?: string) => void;
  acceptOrder: (orderId: string, driverId: string, allowTracking: boolean) => Promise<boolean>;
  addAddress: (userId: string, address: Address) => void;
  deleteAddress: (userId: string, addressId: string) => void;
  reportIssue: (orderId: string, reason: string) => void;
  reportDelay: (orderId: string, reason: string) => void;

  // ZONES MANAGEMENT
  addZone: (name: string, price: number, prices?: Record<OrderType, number>, customId?: string, additionalFields?: Partial<Zone>) => Promise<boolean>;
  editZone: (id: string, name: string, price: number, prices?: Record<OrderType, number>, additionalFields?: Partial<Zone>) => Promise<boolean>;
  removeZone: (id: string) => Promise<boolean>;
  updateZonePrice: (zoneId: string, newPrice: number) => void;
  addDriver: (name: string, phone: string, password: string) => void;
  verifyDeliveryCode: (code: string, driverId: string) => {
    success: boolean;
    orderId?: string;
  };
  checkGeofence: (order: Order) => {
    success: boolean;
    message?: string;
  };
  changePassword: (oldPass: string, newPass: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  topUpWallet: (amount: number) => Promise<{
    success: boolean;
    message?: string;
  }>;
  withdrawWallet: (amount: number) => Promise<{
    success: boolean;
    message?: string;
  }>;
  submitOrderRating: (orderId: string, rating: number, comment: string) => Promise<boolean>;
  requestCancellation: (orderId: string, reason: string) => void;
  rejectCancellation: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  notifyDriverOfTracking: (orderId: string, isTracking: boolean) => Promise<void>;
  manualRefresh: () => void;
  toggleOnlineStatus: (isOnline: boolean) => Promise<void>;

  // Chat
  sendMessage: (orderId: string, text: string, audio?: string, image?: string) => Promise<void>;
  fetchOrderMessages: (orderId: string) => Promise<Message[]>;

  // Tracking & Location
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  syncDriverLocation: (driverId: string) => Promise<User | null>;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number; // Km

  // User Management
  updateProfile: (name: string, phone: string) => Promise<boolean>;
  adminUpdateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  requestLocationPulse: () => Promise<void>;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const {
    t,
    isAr
  } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);

  // Notification State
  const [unreadCount, setUnreadCount] = useState(0);
  const [autoOpenChatId, setAutoOpenChatId] = useState<string | null>(null);
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>([]);
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const token = getCachedToken();
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setNotificationsList(data.notifications);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };
  const markNotificationRead = async (id: string) => {
    try {
      const token = getCachedToken();
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          notificationId: id
        })
      });
      setNotificationsList(prev => prev.map(n => n.id === id ? {
        ...n,
        isRead: true
      } : n));
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  // Tracking State
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const lastKnownPulseRef = useRef<number>(0);

  // Network State
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(navigator.onLine);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const wakeLockRef = useRef<any>(null);
  const locationWatchId = useRef<number | null>(null); // For tracking
  const lastLocationUpdateRef = useRef<number>(0); // For throttling DB updates
  const lastHandledLocationRef = useRef<{
    lat: number;
    lng: number;
  } | null>(null);

  // Advanced Notification Tracking
  const prevOrdersRef = useRef<Order[]>([]);
  const prevIsOnlineRef = useRef<boolean>(false);
  const lastMessageCheckRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);
  const isCheckingMessagesRef = useRef<boolean>(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
  const urgentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);
  const lastZoneStatusRef = useRef<string | undefined>(undefined);

  // Initialize Audio
  useEffect(() => {
    notificationAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    messageAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    urgentAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3');

    // Request Browser Notification Permission on load
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // --- AUDIO UNLOCKER (SILENT STARTUP) ---
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      const unlock = (audio: HTMLAudioElement | null) => {
        if (audio) {
          // FIX: Mute audio during unlock phase to prevent startup noise
          const originalVolume = audio.volume;
          audio.volume = 0;
          audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
          }).catch(() => {}).finally(() => {
            audio.volume = originalVolume; // Restore volume after unlock
          });
        }
      };
      unlock(notificationAudioRef.current);
      unlock(messageAudioRef.current);
      unlock(urgentAudioRef.current);
      audioUnlockedRef.current = true;
      console.log("🔊 Audio Unlocked (Silently)");
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // --- HELPER: Trigger Instant Global Refresh ---
  const notifyGlobalUpdate = () => {
    refreshData(true);
    const channel = new BroadcastChannel('altayyar_sync');
    channel.postMessage({
      type: 'REFRESH',
      timestamp: Date.now()
    });
    channel.close();
  };

  // --- HELPER: Send Browser Notification ---
  const sendBrowserNotification = (title: string, body: string, tag?: string) => {
    // In-app toast for better UX without leaving the app context
    toast(t => <div className="flex flex-col gap-1">
                  <span className="font-black text-sm">{title}</span>
                  <span className="text-xs font-bold opacity-90">{body}</span>
              </div>, {
      duration: 5000,
      icon: title.includes('🚨') || title.includes('⚠️') ? '⚠️' : title.includes('✅') ? '✅' : '🔔'
    });

    // System notification as a fallback/background
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== 'visible') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          tag: tag || 'general',
          vibrate: [200, 100, 200]
        } as any);
      } catch (e) {
        console.error("Notification Error", e);
      }
    }
  };

  // --- WAKE LOCK API ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== Role.DRIVER) return;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {});
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.warn(`Wake Lock Error: ${err}`);
        }
      }
    };
    if (currentUser.isOnline) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
    }
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && currentUser.isOnline) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // 1. Initial Data Load & Network Listeners
  useEffect(() => {
    const init = async () => {
      setDbError(null);
      try {
        // Fetch zones for unauthenticated users first
        const publicZones = await getPublicZonesFromDB();
        if (publicZones.length > 0) {
          setZones(publicZones);
        }

        // LOAD FROM CACHE FIRST (OFFLINE SUPPORT)
        const cachedOrders = await localforage.getItem('offline_orders');
        if (cachedOrders) setOrders(cachedOrders as Order[]);
        const cachedUsers = await localforage.getItem('offline_users');
        if (cachedUsers) setUsers(cachedUsers as User[]);
        const cachedZones = await localforage.getItem('offline_zones');
        if (cachedZones) setZones(cachedZones as Zone[]);
        const cachedCurrentUser = await localforage.getItem('offline_current_user');
        const hasToken = !!getCachedToken();
        if (hasToken && cachedCurrentUser) {
          setCurrentUser(cachedCurrentUser as User);
        } else {
          setCurrentUser(null);
          await localforage.removeItem('offline_current_user');
          localStorage.removeItem('al_tayyar_user_id');
        }
        await initializeDatabase();
        setIsDbReady(true);
        const savedUserId = localStorage.getItem('al_tayyar_user_id');
        if (savedUserId) {
          console.log("Found saved session, restoring...");
          try {
            const user = await getUserByIdFromDB(savedUserId);
            if (user) {
              if (user.isBlocked) {
                toast.error(t("ctx_500"));
                localStorage.removeItem('al_tayyar_user_id');
                localforage.removeItem('offline_current_user');
                setCurrentUser(null);
              } else {
                setCurrentUser(user);
                localforage.setItem('offline_current_user', user);
                registerFcmToken(user.id);
              }
            }
          } catch (dbErr) {
            console.warn("Offline: couldn't fetch user from DB, using cached if available", dbErr);
          }
        }
        await refreshData();
      } catch (e: any) {
        console.error("DB Init/Restore Error:", e);
        setDbError(e.message || t("ctx_501"));
      } finally {
        setIsInitializing(false);
      }
    };
    init();
    const channel = new BroadcastChannel('altayyar_sync');
    channel.onmessage = event => {
      if (event.data === 'REFRESH' || event.data && event.data.type === 'REFRESH') {
        refreshData(true);
        checkForNewMessages();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const handleOnline = () => {
      setIsNetworkAvailable(true);
      refreshData(true);
    };
    const handleOffline = () => setIsNetworkAvailable(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      channel.close();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. SMART ADAPTIVE POLLING
  useEffect(() => {
    if (!currentUser) return;

    // --- IDLE DETECTION ---
    const checkInactivity = async () => {
      const now = Date.now();

      // 1. Driver Side: Self-Warning
      if (currentUser.role === Role.DRIVER && currentUser.isOnline && currentUser.lastMovedAt) {
        const idleTime = now - currentUser.lastMovedAt;
        const IDLE_WARNING_TIME = 10 * 60 * 1000; // 10 mins
        const IDLE_CRITICAL_TIME = 15 * 60 * 1000; // 15 mins

        if (idleTime >= IDLE_WARNING_TIME && idleTime < IDLE_CRITICAL_TIME) {
          // Show warning locally if not recently shown
          const lastWarnTime = Number(localStorage.getItem('last_idle_warn') || 0);
          if (now - lastWarnTime > 2 * 60 * 1000) {
            // Notify every 2 mins during warning phase
            sendBrowserNotification(t("ctx_502"), `You have been idle for ${Math.floor(idleTime / 60000)} minutes. Move to avoid a report.`);
            if (urgentAudioRef.current) urgentAudioRef.current.play().catch(() => {});
            localStorage.setItem('last_idle_warn', String(now));
          }
        } else if (idleTime >= IDLE_CRITICAL_TIME) {
          const lastCriticalTime = Number(localStorage.getItem('last_idle_critical') || 0);
          if (now - lastCriticalTime > 3 * 60 * 1000) {
            sendBrowserNotification(t("ctx_503"), `You have been idle for ${Math.floor(idleTime / 60000)} minutes. Idle alert sent to company.`);
            if (urgentAudioRef.current) urgentAudioRef.current.play().catch(() => {});
            localStorage.setItem('last_idle_critical', String(now));
          }
        }
      }

      // 2. Admin Side: Monitor all drivers (Idle & Signal Loss)
      if ([Role.ADMIN, Role.EMPLOYEE].includes(currentUser.role)) {
        users.filter(u => u.role === Role.DRIVER && u.isOnline).forEach(driver => {
          const idleTime = driver.lastMovedAt ? now - driver.lastMovedAt : 0;
          const signalLossTime = driver.lastSeenAt ? now - driver.lastSeenAt : 0;

          // Alert if idle for 15+ mins
          if (idleTime >= 15 * 60 * 1000) {
            const notifyKey = `alert_admin_idle_${driver.id}_${Math.floor(idleTime / (15 * 60 * 1000))}`;
            if (!localStorage.getItem(notifyKey)) {
              sendBrowserNotification(t("ctx_504"), `Driver ${driver.name} is idle for ${Math.floor(idleTime / 60000)} minutes (over 15 minutes).`);
              if (urgentAudioRef.current) urgentAudioRef.current.play().catch(() => {});
              localStorage.setItem(notifyKey, String(now));
            }
          }

          // Alert if signal lost for 20+ mins
          if (signalLossTime >= 20 * 60 * 1000) {
            const signalKey = `alert_admin_signal_${driver.id}_${Math.floor(signalLossTime / (20 * 60 * 1000))}`;
            if (!localStorage.getItem(signalKey)) {
              sendBrowserNotification(t("ctx_505"), `Lost connection to ${driver.name} for more than 20 minutes.`);
              localStorage.setItem(signalKey, String(now));
            }
          }
        });
      }
    };
    let pollInterval = 45000;
    const isDriver = currentUser.role === Role.DRIVER;
    const isCustomerWaiting = currentUser.role === Role.CUSTOMER && orders.some(o => o.customerId === currentUser.id && o.status === OrderStatus.PENDING);

    // Check if active order exists
    const hasActiveOrder = orders.some(o => {
      const isActive = o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.RETURNED;
      if (!isActive) return false;
      if (currentUser.role === Role.CUSTOMER && o.customerId === currentUser.id) return true;
      if (currentUser.role === Role.DRIVER && o.driverId === currentUser.id) return true;
      return false;
    });

    // Special case: Fast poll for ANY recent activity
    const hasRecentActivity = orders.some(o => {
      const isMine = currentUser.role === Role.CUSTOMER && o.customerId === currentUser.id || currentUser.role === Role.DRIVER && o.driverId === currentUser.id;
      const isRecent = Date.now() - o.createdAt < 30 * 60 * 1000; // 30 minutes
      return isMine && isRecent;
    });

    // Speed up if active order, driver online with active order, customer waiting, admin, OR RECENT ACTIVITY
    const isDriverWithActiveOrder = isDriver && currentUser.isOnline && hasActiveOrder;
    if (hasActiveOrder || isDriverWithActiveOrder || isCustomerWaiting || [Role.ADMIN, Role.EMPLOYEE].includes(currentUser.role) || hasRecentActivity) {
      pollInterval = 5000; // Super fast sync (1.5 seconds)
    } else if (isDriver && currentUser.isOnline) {
      pollInterval = 20000; // Slower sync for idle drivers (20 seconds)
    }
    const intervalId = setInterval(async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        await refreshData(true);
        await checkForNewMessages();
        await checkInactivity();

        // --- LOCATION PULSE DETECTION (For Drivers) ---
        if (currentUser && currentUser.role === Role.DRIVER && currentUser.isOnline) {
          const adminUser = users.find(u => [Role.ADMIN, Role.EMPLOYEE].includes(u.role));
          if (adminUser && adminUser.locationPulse && adminUser.locationPulse > lastKnownPulseRef.current) {
            console.log("⚡ ADMIN PULSE DETECTED! Forcing immediate location update...");
            lastKnownPulseRef.current = adminUser.locationPulse;
            // Reset throttle to force immediate DB update
            lastLocationUpdateRef.current = 0;
            // Trigger tracking update
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(pos => {
                const {
                  latitude,
                  longitude
                } = pos.coords;
                const now = Date.now();
                updateUserLocationInDB(currentUser.id, latitude, longitude, now, now);
                lastLocationUpdateRef.current = now;
              }, null, {
                enableHighAccuracy: true
              });
            }
          }
        }
      }
    }, pollInterval);
    return () => clearInterval(intervalId);
  }, [currentUser, orders]);

  // --- 3. LOGIC: Compare Old vs New Orders for Notifications ---
  const detectOrderChanges = (newOrders: Order[]) => {
    if (!currentUser) return;
    const oldOrders: Order[] = prevOrdersRef.current;

    // Stop notification sound on startup/login
    // If we have no history, treat everything as "existing" state, not new
    if (oldOrders.length === 0) {
      prevOrdersRef.current = newOrders;
      return;
    }

    // Map for fast lookup
    const oldOrdersMap = new Map(oldOrders.map(o => [o.id, o]));

    // 1. Check for Order Acceptance (Customer)
    if (currentUser.role === Role.CUSTOMER) {
      newOrders.forEach(newOrder => {
        if (newOrder.customerId === currentUser.id) {
          const oldOrder = oldOrdersMap.get(newOrder.id);
          if (oldOrder && oldOrder.status === OrderStatus.PENDING && newOrder.status === OrderStatus.ACCEPTED) {
            // NOTIFY CUSTOMER
            sendBrowserNotification(t("ctx_506"), `Captain accepted your order ${newOrder.items} and is on the way.`);
            if (notificationAudioRef.current) notificationAudioRef.current.play().catch(() => {});
          }
          if (oldOrder && oldOrder.status !== OrderStatus.CANCELLED && newOrder.status === OrderStatus.CANCELLED) {
            // NOTIFY CUSTOMER OF CANCELLATION
            sendBrowserNotification(t("ctx_507"), `Sorry, your order has been canceled: ${newOrder.items}`);
            if (notificationAudioRef.current) notificationAudioRef.current.play().catch(() => {});
          }
        }
      });
    }

    // 2. Check for New Pending Orders (Driver)
    if (currentUser.role === Role.DRIVER && currentUser.isOnline) {
      const newPending = newOrders.filter(o => o.status === OrderStatus.PENDING);
      const oldPendingIds = new Set(oldOrders.filter(o => o.status === OrderStatus.PENDING).map(o => o.id));
      const trulyNewOrder = newPending.find(o => !oldPendingIds.has(o.id));
      if (trulyNewOrder) {
        // NOTIFY DRIVER
        sendBrowserNotification(t("ctx_508"), `New order at ${trulyNewOrder.pickupAddress}. Click to accept.`);
        if (notificationAudioRef.current) notificationAudioRef.current.play().catch(() => {});
        if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
      }
    }

    // 3. Check for New Cancellation Requests (Admin/Employee)
    if ([Role.ADMIN, Role.EMPLOYEE].includes(currentUser.role)) {
      newOrders.forEach(newOrder => {
        const oldOrder = oldOrdersMap.get(newOrder.id);
        const hadRequestBefore = oldOrder && oldOrder.cancellationRequest;
        const hasRequestNow = newOrder.cancellationRequest;
        if (hasRequestNow && !hadRequestBefore) {
          // NEW CANCELLATION REQUEST ALERT!
          sendBrowserNotification(t("ctx_509"), `Cancellation requested for order #${newOrder.id.slice(-4)}. Please review.`);
          // Play the urgent sound!
          if (urgentAudioRef.current) {
            urgentAudioRef.current.play().catch(() => {});
          }
          // Fire a highly visible, persistent in-app toast
          toast.error(`🚨 Urgent cancellation request for order #${newOrder.id.slice(-4)}!\nReason: ${newOrder.cancellationRequest?.reason || ""}`, {
            duration: 8000,
            position: 'top-center'
          });
        }
      });
    }
    prevOrdersRef.current = newOrders;
  };
  const checkForNewMessages = async () => {
    if (!currentUser) return;
    if (isCheckingMessagesRef.current) return;
    isCheckingMessagesRef.current = true;
    try {
      const checkTime = lastMessageCheckRef.current;
      const newMessages = await getRecentMessagesFromDB(checkTime);
      if (newMessages.length > 0) {
        lastMessageCheckRef.current = Date.now();

        // Filter messages relevant to me AND sent by someone else
        const myNewMessages = newMessages.filter(msg => {
          if (msg.senderId === currentUser.id) return false; // Ignore my own

          const relatedOrder = orders.find(o => o.id === msg.orderId);
          if (!relatedOrder) return false;
          const isRelevant = currentUser.role === Role.DRIVER && relatedOrder.driverId === currentUser.id || currentUser.role === Role.CUSTOMER && relatedOrder.customerId === currentUser.id || [Role.ADMIN, Role.EMPLOYEE].includes(currentUser.role);
          return isRelevant;
        });
        if (myNewMessages.length > 0) {
          console.log("🔔 New Message Received!", myNewMessages);

          // 1. Play Sound
          try {
            const soundsEnabled = localStorage.getItem('sounds') !== 'false';
            if (soundsEnabled) {
              if (messageAudioRef.current) messageAudioRef.current.play().catch(() => {});
              if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
            }
          } catch (e) {
            console.error(e);
          }

          // 2. Browser Notification (Content Preview)
          const lastMsg = myNewMessages[myNewMessages.length - 1];
          sendBrowserNotification(`New message from ${lastMsg.senderName}`, lastMsg.text);

          // 3. Increment Badge
          setUnreadCount(prev => prev + myNewMessages.length);

          // 4. Auto Open Chat Logic
          const orderId = lastMsg.orderId;
          setAutoOpenChatId(orderId);
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const isNetworkError = errMsg.includes("Failed to fetch") || errMsg.includes("fetch") || !navigator.onLine;
      if (isNetworkError) {
        console.warn("Network disconnected or transient database fetch failure while polling for messages.");
      } else {
        console.error("Error polling for messages:", e);
      }
    } finally {
      isCheckingMessagesRef.current = false;
    }
  };
  const refreshData = async (silent = false) => {
    if (!navigator.onLine || !getCachedToken()) return;
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const dbOrders = await getAllOrdersFromDB();

      // Detect Changes BEFORE setting state
      detectOrderChanges(dbOrders);
      setOrders(dbOrders);
      localforage.setItem('offline_orders', dbOrders).catch(console.error);
      const dbUsers = await getAllUsersFromDB();
      setUsers(dbUsers);
      localforage.setItem('offline_users', dbUsers).catch(console.error);

      // Fetch Zones from DB
      const dbZones = await getZonesFromDB();
      if (dbZones.length > 0) {
        setZones(dbZones);
        localforage.setItem('offline_zones', dbZones).catch(console.error);
      }

      // Detect Zone Status Change for Drivers
      if (currentUser && dbZones.length > 0) {
        const myZoneId = currentUser.zoneId || (dbUsers.find(u => u.id === currentUser.id)?.zoneId);
        if (myZoneId) {
          const myZone = dbZones.find(z => z.id === myZoneId);
          if (myZone) {
            const currentStatus = myZone.status; // 'active', 'inactive', 'coming_soon'
            if (lastZoneStatusRef.current !== undefined && lastZoneStatusRef.current !== currentStatus) {
              if (currentUser.role === Role.DRIVER) {
                if (currentStatus === 'inactive') {
                  toast.error(isAr ? "المنطقة اتقفلت مؤقتًا ⚠️" : "Your assigned zone has been closed temporarily! ⚠️", { duration: 6000 });
                } else if (currentStatus === 'active') {
                  toast.success(isAr ? "تم إعادة تفعيل منطقتك! ✅" : "Your assigned zone has been re-activated! ✅", { duration: 6000 });
                }
              }
            }
            lastZoneStatusRef.current = currentStatus;
          }
        }
      }

      if (currentUser) {
        const updatedMe = dbUsers.find(u => u.id === currentUser.id);
        if (updatedMe) {
          // Check if blocked during session
          if (updatedMe.isBlocked) {
            toast.error(t("ctx_510"));
            logout();
            return;
          }
          setCurrentUser(prev => prev ? {
            ...prev,
            ...updatedMe
          } : null);
          localforage.setItem('offline_current_user', updatedMe).catch(console.error);
          fetchNotifications(); // Don't await so we don't block
        }
      }
    } catch (e) {
      if (!silent) console.error("Failed to refresh data", e);
    } finally {
      isRefreshingRef.current = false;
    }
  };
  const manualRefresh = () => {
    refreshData(false);
    checkForNewMessages();
  };
  const validatePhone = (phone: string) => {
    return phone.trim().length === 11;
  };
  const registerFcmToken = async (userId: string) => {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      if ("Notification" in window && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY || undefined
      });
      if (token) {
        console.log("FCM Token acquired:", token);
        const cachedToken = getCachedToken();
        const res = await fetch("/api/fcm/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cachedToken ? { "Authorization": `Bearer ${cachedToken}` } : {})
          },
          body: JSON.stringify({
            userId,
            token
          })
        });
        const data = await res.json();
        if (data.success) {
          console.log("FCM Token registered on server successfully");
        }
      }
    } catch (e) {
      console.error("Failed to register FCM token:", e);
    }
  };
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      unsubscribe = onMessage(messaging, payload => {
        const title = payload.notification?.title || t("ctx_511");
        const body = payload.notification?.body || "";
        toast(`${title}\n${body}`);
      });
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  const login = async (phone: string, password: string, remember: boolean = true): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!isDbReady) return {
      success: false,
      message: t("ctx_512")
    };
    const cleanPhone = phone.trim();
    if (!validatePhone(cleanPhone)) return {
      success: false,
      message: t("ctx_513")
    };
    try {
      const user = await loginUserFromDB(cleanPhone, password);
      if (user) {
        setCurrentUser(user);
        if (remember) {
          localStorage.setItem('al_tayyar_user_id', user.id);
        } else {
          localStorage.removeItem('al_tayyar_user_id');
        }
        // Ask for Notification Permission on Login
        if ("Notification" in window && Notification.permission !== "granted") {
          Notification.requestPermission();
        }
        registerFcmToken(user.id);
        refreshData();
        return {
          success: true
        };
      } else {
        return {
          success: false,
          message: t("ctx_514")
        };
      }
    } catch (error: any) {
      console.error(error);
      return {
        success: false,
        message: error.message || t("ctx_515")
      };
    }
  };
  const loginWithGoogle = async (idToken: string): Promise<{
    success: boolean;
    needsPhone?: boolean;
    needsLinking?: boolean;
    phone?: string;
    email?: string;
    name?: string;
    message?: string;
  }> => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idToken
        })
      });
      const data = await res.json();
      if (!data.success) {
        return {
          success: false,
          message: data.message || t("ctx_516")
        };
      }
      if (data.needsLinking) {
        return {
          success: true,
          needsLinking: true,
          phone: data.phone,
          email: data.email,
          name: data.name
        };
      }
      if (data.needsPhone) {
        return {
          success: true,
          needsPhone: true,
          email: data.email,
          name: data.name
        };
      }
      const user = data.user;
      if (data.token) {
        setCachedToken(data.token);
      }
      setCurrentUser(user);
      localStorage.setItem('al_tayyar_user_id', user.id);
      registerFcmToken(user.id);
      await refreshData();
      return {
        success: true,
        needsPhone: false
      };
    } catch (e) {
      console.error("Google login error:", e);
      return {
        success: false,
        message: t("ctx_517")
      };
    }
  };

  const linkGoogleAccount = async (idToken: string, password: string): Promise<{
    success: boolean;
    message?: string;
  }> => {
    try {
      const res = await fetch("/api/auth/google-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idToken,
          password
        })
      });
      const data = await res.json();
      if (!data.success) {
        return {
          success: false,
          message: data.message || "Failed to link account"
        };
      }
      const user = data.user;
      if (data.token) {
        setCachedToken(data.token);
      }
      setCurrentUser(user);
      localStorage.setItem('al_tayyar_user_id', user.id);
      registerFcmToken(user.id);
      await refreshData();
      return {
        success: true
      };
    } catch (e) {
      console.error("Google link error:", e);
      return {
        success: false,
        message: "Network error occurred."
      };
    }
  };
  const completeGoogleRegistration = async (idToken: string, name: string, phone: string, address: string, zoneId: string): Promise<{
    success: boolean;
    message?: string;
  }> => {
    try {
      const res = await fetch("/api/auth/google-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idToken,
          name,
          phone,
          address,
          zoneId
        })
      });
      const data = await res.json();
      if (!data.success) {
        return {
          success: false,
          message: data.message || t("ctx_518")
        };
      }
      const user = data.user;
      if (data.token) {
        setCachedToken(data.token);
      }
      setCurrentUser(user);
      localStorage.setItem('al_tayyar_user_id', user.id);
      registerFcmToken(user.id);
      await refreshData();
      return {
        success: true
      };
    } catch (e) {
      console.error("Google complete error:", e);
      return {
        success: false,
        message: t("ctx_517")
      };
    }
  };
  const toggleOnlineStatus = async (isOnline: boolean) => {
    if (!currentUser) return;
    setCurrentUser(prev => prev ? {
      ...prev,
      isOnline
    } : null);
    
    // Force immediate location update when going online
    if (isOnline && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          const now = Date.now();
          updateUserLocationInDB(currentUser.id, latitude, longitude, now, now);
        },
        null,
        { enableHighAccuracy: true }
      );
    }
    
    const success = await updateUserStatusInDB(currentUser.id, isOnline);
    if (success) {
      notifyGlobalUpdate();
    } else {
      refreshData(true);
    }
  };
  const register = async (name: string, phone: string, password: string, address: string, zoneId: string): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!isDbReady) return {
      success: false,
      message: t("ctx_512")
    };
    const cleanPhone = phone.trim();
    if (!validatePhone(cleanPhone)) return {
      success: false,
      message: t("ctx_513")
    };
    if (password.length < 4) return {
      success: false,
      message: t("ctx_519")
    };
    try {
      const result = await registerUserInDB(name, cleanPhone, password, address, zoneId);
      if (result.success) {
        await refreshData();
        const user = await loginUserFromDB(cleanPhone, password);
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('al_tayyar_user_id', user.id);
          if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
          }
          registerFcmToken(user.id);
        }
        return {
          success: true
        };
      } else {
        return {
          success: false,
          message: result.message || t("ctx_520")
        };
      }
    } catch (e) {
      return {
        success: false,
        message: t("ctx_517")
      };
    }
  };
  const adminCreateUser = async (name: string, phone: string, password: string, role: Role): Promise<{
    success: boolean;
    message?: string;
  }> => {
    const cleanPhone = phone.trim();
    const result = await createUserWithRoleInDB(name, cleanPhone, password, role);
    if (result.success) {
      await refreshData();
      return {
        success: true
      };
    } else {
      return {
        success: false,
        message: result.message || t("ctx_521")
      };
    }
  };
  
  const deleteAccount = async () => {
    try {
      const rawRes = await fetch('/api/delete-account', { method: 'POST', headers: { 'Authorization': `Bearer ${getCachedToken()}` } });
      const res = await rawRes.json();
      if (res.success) {
        logout();
        toast.success(isAr ? "تم حذف الحساب بنجاح" : "Account deleted successfully");
        return { success: true };
      }
      return { success: false, message: res.error };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    stopLocationTracking();
    setCurrentUser(null);
    localStorage.removeItem('al_tayyar_user_id');
    setCachedToken(null);
    localforage.removeItem('offline_current_user');
    if (wakeLockRef.current) wakeLockRef.current.release();
    prevOrdersRef.current = []; // Clear history to prevent stale comparisons on re-login
    setUnreadCount(0); // clear notifications
    setAutoOpenChatId(null);
    signOut(firebaseAuth).catch(e => console.error("Firebase signOut error", e));
  };
  const addAddress = async (userId: string, address: Address) => {
    if (currentUser?.id === userId) {
      const newAddresses = [...(currentUser.savedAddresses || []), address];
      setCurrentUser(prev => prev ? {
        ...prev,
        savedAddresses: newAddresses
      } : null);
      try {
        await addUserAddressInDB(userId, address, currentUser.savedAddresses || []);
      } catch (e) {
        console.error("Failed to persist address", e);
      }
    }
  };
  const deleteAddress = (userId: string, addressId: string) => {
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? {
        ...prev,
        savedAddresses: (prev.savedAddresses || []).filter(a => a.id !== addressId)
      } : null);
    }
  };
  const reportIssue = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newIssue: Issue = {
          id: `iss-${Date.now()}`,
          orderId,
          reporterId: currentUser?.id || 'unknown',
          reason,
          timestamp: Date.now(),
          resolved: false
        };
        return {
          ...o,
          issues: [...o.issues, newIssue]
        };
      }
      return o;
    }));
  };
  const reportDelay = async (orderId: string, reason: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newEvent: TimelineEvent = {
      status: order.status,
      timestamp: Date.now(),
      driverId: currentUser?.id,
      notes: `Delay: ${reason}`
    };
    const newTimeline = [...order.timeline, newEvent];
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      delayReason: reason,
      timeline: newTimeline
    } : o));
    await updateOrderStatusInDB(orderId, order.status, newTimeline, undefined, undefined, reason);
    notifyGlobalUpdate();
  };

  // --- ZONES MANAGEMENT ---
  const addZone = async (name: string, price: number, prices?: Record<OrderType, number>, customId?: string, additionalFields?: Partial<Zone>): Promise<boolean> => {
    const newZone: Zone = {
      id: customId || `z-${Date.now()}`,
      name,
      price,
      prices: prices || {
        [OrderType.SHOPPING]: price,
        [OrderType.EMERGENCY]: price,
        [OrderType.PICK_DROP]: price,
        [OrderType.GOVERNORATE]: price
      },
      ...additionalFields
    };
    // Optimistic
    setZones(prev => [...prev, newZone]);
    const success = await createZoneInDB(newZone);
    if (!success) refreshData(true); // Revert
    else notifyGlobalUpdate();
    return success;
  };
  const editZone = async (id: string, name: string, price: number, prices?: Record<OrderType, number>, additionalFields?: Partial<Zone>): Promise<boolean> => {
    setZones(prev => prev.map(z => z.id === id ? {
      ...z,
      name,
      price,
      prices: prices || z.prices,
      ...additionalFields
    } : z));
    const zoneToUpdate = zones.find(z => z.id === id);
    const success = await updateZoneInDB({
      ...zoneToUpdate,
      id,
      ...additionalFields,
      name,
      price,
      prices: prices || zoneToUpdate?.prices || {
        [OrderType.SHOPPING]: price,
        [OrderType.EMERGENCY]: price,
        [OrderType.PICK_DROP]: price,
        [OrderType.GOVERNORATE]: price
      }
    });
    if (!success) refreshData(true);else notifyGlobalUpdate();
    return success;
  };
  const removeZone = async (id: string): Promise<boolean> => {
    setZones(prev => prev.filter(z => z.id !== id));
    const success = await deleteZoneInDB(id);
    if (!success) refreshData(true);else notifyGlobalUpdate();
    return success;
  };
  const updateZonePrice = (zoneId: string, newPrice: number) => {
    // Wrapper for backward compatibility
    const zone = zones.find(z => z.id === zoneId);
    if (zone) editZone(zoneId, zone.name, newPrice);
  };
  const addDriver = (name: string, phone: string, password: string) => {
    alert("Deprecated");
  };
  const findBestDriverForOrder = (order: Order): string | undefined => {
    const orderZoneId = order.zoneId || order.deliveryAddress?.zoneId;
    const isZoneActive = (zId?: string) => {
      if (!zId) return false;
      const z = zones.find(x => x.id === zId);
      return z ? z.status === 'active' : false;
    };

    let onlineDrivers = users.filter(u => 
      u.role === Role.DRIVER && 
      u.isOnline && 
      !u.isBlocked && 
      u.zoneId === orderZoneId && 
      isZoneActive(u.zoneId)
    );

    // Fallback for GOVERNORATE orders to any driver in an active zone
    if (onlineDrivers.length === 0 && order.type === OrderType.GOVERNORATE) {
      onlineDrivers = users.filter(u => 
        u.role === Role.DRIVER && 
        u.isOnline && 
        !u.isBlocked && 
        isZoneActive(u.zoneId)
      );
    }

    if (onlineDrivers.length === 0) return undefined;

    const eligibleDrivers = onlineDrivers.map(driver => {
      const activeOrdersCount = orders.filter(o => o.driverId === driver.id && ![OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(o.status)).length;
      let distance = 999;
      if (driver.currentLat && driver.currentLng && order.pickupLat && order.pickupLng) {
        distance = calculateDistance(driver.currentLat, driver.currentLng, order.pickupLat, order.pickupLng);
      }
      return {
        driver,
        activeOrdersCount,
        distance
      };
    }).filter(d => d.activeOrdersCount < 4); // Max 4 orders per driver

    if (eligibleDrivers.length === 0) return undefined;
    const radiusBands = [0.5, 1, 1.5, 2, 3, 5, 10, 20, 50, 100];
    for (const radius of radiusBands) {
      const driversInBand = eligibleDrivers.filter(d => d.distance <= radius);
      if (driversInBand.length > 0) {
        const minOrders = Math.min(...driversInBand.map(d => d.activeOrdersCount));
        const bestDrivers = driversInBand.filter(d => d.activeOrdersCount === minOrders);
        bestDrivers.sort((a, b) => a.distance - b.distance);
        return bestDrivers[0].driver.id;
      }
    }

    // Fallback if no driver in the radiuses or location missing
    const minOrdersFallback = Math.min(...eligibleDrivers.map(d => d.activeOrdersCount));
    const bestFallbackDrivers = eligibleDrivers.filter(d => d.activeOrdersCount === minOrdersFallback);
    bestFallbackDrivers.sort((a, b) => a.distance - b.distance);
    return bestFallbackDrivers[0]?.driver.id;
  };
  const createOrder = async (orderData: Partial<Order>): Promise<boolean> => {
    const deliveryCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `ORD-${Date.now().toString().slice(-6)}`;

    // Automated Dispatch Logic - find best drivers for recommendation/targeting
    const tempOrder = {
      id: newId,
      ...orderData
    } as Order;
    const bestDriverId = findBestDriverForOrder(tempOrder);
    const timeline: TimelineEvent[] = [{
      status: OrderStatus.PENDING,
      timestamp: Date.now()
    }];
    const newOrder: Order = {
      id: newId,
      type: orderData.type || OrderType.SHOPPING,
      status: OrderStatus.PENDING,
      customerId: currentUser?.id || 'guest',
      driverId: undefined,
      pickupAddress: orderData.pickupAddress || '',
      deliveryAddress: orderData.deliveryAddress!,
      items: orderData.items || '',
      price: orderData.price || 0,
      itemCost: orderData.itemCost || 0,
      timeline,
      issues: [],
      createdAt: Date.now(),
      notes: orderData.notes,
      recipientPhone: orderData.recipientPhone,
      orderImageUrl: orderData.orderImageUrl,
      voiceNote: orderData.voiceNote,
      deliveryCode,
      assignedDriverIds: bestDriverId ? [bestDriverId] : undefined,
      ...orderData
    };
    try {
      const success = await createOrderInDB(newOrder);
      if (success) {
        setOrders(prev => [newOrder, ...prev]);
        notifyGlobalUpdate();
        if (bestDriverId) {
          // Order auto-assigned to specific driver on creation
          triggerPushNotification(bestDriverId, t("ctx_508"), `New order at ${newOrder.pickupAddress}.`, {
            orderId: newOrder.id,
            type: "NEW_ORDER"
          });
        } else {
          // Notify online drivers in the same active zone
          const orderZoneId = newOrder.zoneId || newOrder.deliveryAddress?.zoneId;
          const isZoneActive = (zId?: string) => {
            if (!zId) return false;
            const z = zones.find(x => x.id === zId);
            return z ? z.status === 'active' : false;
          };

          const onlineDrivers = users.filter(u => 
            u.role === Role.DRIVER && 
            u.isOnline && 
            !u.isBlocked && 
            isZoneActive(u.zoneId) &&
            (u.zoneId === orderZoneId || newOrder.type === OrderType.GOVERNORATE)
          );
          onlineDrivers.forEach(driver => {
            triggerPushNotification(driver.id, t("ctx_508"), `New order at ${newOrder.pickupAddress}. Click to accept.`, {
              orderId: newOrder.id,
              type: "NEW_ORDER"
            });
          });
        }
        return true;
      } else {
        toast.error(t("ctx_522"));
        return false;
      }
    } catch {
      toast.error(t("ctx_523"));
      return false;
    }
  };
  const acceptOrder = async (orderId: string, driverId: string, allowTracking: boolean): Promise<boolean> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    // RULE: Max 2 active orders per driver, and must be allowed by the first order
    const activeOrders = orders.filter(o => o.driverId === driverId && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.RETURNED);
    const activeOrdersCount = activeOrders.length;
    if (activeOrdersCount >= 4) {
      toast.error(t("ctx_524"));
      return false;
    }
    const newTimeline = [...order.timeline, {
      status: OrderStatus.ACCEPTED,
      timestamp: Date.now(),
      driverId
    }];
    try {
      const success = await tryAcceptOrderInDB(orderId, driverId, newTimeline);
      if (success) {
        setOrders(prev => prev.map(o => o.id === orderId ? {
          ...o,
          status: OrderStatus.ACCEPTED,
          driverId,
          timeline: newTimeline
        } : o));

        // START TRACKING IF ALLOWED
        if (allowTracking) {
          startLocationTracking();
        }
        notifyGlobalUpdate();
        triggerPushNotification(order.customerId, t("ctx_506"), `Captain accepted your order (${order.items}) and is on the way.`, {
          orderId: order.id,
          type: "ORDER_ACCEPTED"
        });
        return true;
      } else {
        notifyGlobalUpdate();
        toast.error(t("ctx_525"));
        return false;
      }
    } catch (e) {
      toast.error(t("ctx_526"));
      return false;
    }
  };
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, proof?: {
    imageUrl?: string;
    isQrScan?: boolean;
  }, delayReason?: string): Promise<boolean> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;
    const newEvent: TimelineEvent = {
      status: newStatus,
      timestamp: Date.now(),
      imageUrl: proof?.imageUrl,
      driverId: currentUser?.id,
      notes: delayReason ? `Delay: ${delayReason}` : undefined
    };
    const newTimeline = [...order.timeline, newEvent];
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: newStatus,
        timeline: newTimeline,
        proofImageUrl: proof?.imageUrl,
        delayReason: delayReason || o.delayReason
      } : o));
      const requestingDriverId = newStatus === OrderStatus.DELIVERED && currentUser?.role === Role.DRIVER ? currentUser.id : undefined;
      const success = await updateOrderStatusInDB(orderId, newStatus, newTimeline, undefined, proof?.imageUrl, delayReason, requestingDriverId);
      if (success) {
        if (newStatus === OrderStatus.DELIVERED) {
          stopLocationTracking();
          triggerPushNotification(order.customerId, t("ctx_527"), `Order (${order.items}) delivered successfully. Thanks for using Al-Tayyar!`, {
            orderId: order.id,
            type: "ORDER_DELIVERED"
          });
        } else if (newStatus === OrderStatus.CANCELLED) {
          triggerPushNotification(order.customerId, t("ctx_507"), `Sorry, your order has been canceled: ${order.items}`, {
            orderId: order.id,
            type: "ORDER_CANCELLED"
          });
        }
        notifyGlobalUpdate();
        return true;
      }
      // Update failed = not this driver's order, rollback state and show message
      setOrders(prev => prev.map(o => o.id === orderId ? order : o));
      toast.error(t("ctx_528"));
      return false;
    } catch {
      toast.error(t("ctx_526"));
      return false;
    }
  };
  const rejectCancellation = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newEvent: TimelineEvent = {
      status: order.status,
      timestamp: Date.now(),
      notes: t("ctx_529")
    };
    const newTimeline = [...order.timeline, newEvent];
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        cancellationRequest: undefined,
        timeline: newTimeline
      } : o));
      const success = await rejectCancellationInDB(orderId, newTimeline);
      if (success) notifyGlobalUpdate();
    } catch {
      toast.error(t("ctx_526"));
    }
  };
  const requestCancellation = async (orderId: string, reason: string) => {
    if (!currentUser) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const requesterRoleLabel = currentUser.role === Role.DRIVER ? t("ctx_530") : t("ctx_531");
    const newEvent: TimelineEvent = {
      status: order.status,
      timestamp: Date.now(),
      notes: `⚠️ Cancellation requested by ${requesterRoleLabel} (${currentUser.name}). Reason: ${reason}`
    };
    const newTimeline = [...order.timeline, newEvent];
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        cancellationRequest: {
          requesterId: currentUser.id,
          reason,
          timestamp: Date.now()
        },
        timeline: newTimeline
      } : o));
      const success = await requestCancellationInDB(orderId, currentUser.id, reason, newTimeline);
      if (success) {
        notifyGlobalUpdate();
      }
    } catch {
      toast.error(t("ctx_526"));
    }
  };
  const cancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newEvent: TimelineEvent = {
      status: OrderStatus.CANCELLED,
      timestamp: Date.now(),
      notes: order.cancellationRequest ? `Cancellation approved by admin. Reason: ${order.cancellationRequest.reason}` : t("ctx_532")
    };
    const newTimeline = [...order.timeline, newEvent];
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: OrderStatus.CANCELLED,
        cancellationRequest: undefined,
        timeline: newTimeline
      } : o));
      const success = await cancelOrderInDB(orderId, newTimeline);
      if (success) {
        // Stop tracking if it was the active order
        stopLocationTracking();
        notifyGlobalUpdate();
      }
    } catch {
      toast.error(t("ctx_526"));
    }
  };
  const verifyDeliveryCode = (code: string, driverId: string) => {
    const order = orders.find(o => o.deliveryCode === code && o.status !== OrderStatus.DELIVERED && o.driverId === driverId);
    if (order) {
      return {
        success: true,
        orderId: order.id
      };
    }
    return {
      success: false
    };
  };
  const checkGeofence = (order: Order): {
    success: boolean;
    message?: string;
  } => {
    if (!order.deliveryAddress || !order.deliveryAddress.lat || !order.deliveryAddress.lng) {
      return {
        success: true
      };
    }
    if (!currentUser?.currentLat || !currentUser?.currentLng) {
      return {
        success: false,
        message: t("ctx_533")
      };
    }
    const distKm = calculateDistance(currentUser.currentLat, currentUser.currentLng, order.deliveryAddress.lat, order.deliveryAddress.lng);
    const MAX_DISTANCE_KM = 0.8;
    if (distKm > MAX_DISTANCE_KM) {
      return {
        success: false,
        message: `🚫 You are far from the customer (${(distKm * 1000).toFixed(0)} meters). Must be within 800m.`
      };
    }
    return {
      success: true
    };
  };
  const changePassword = async (oldPass: string, newPass: string): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!currentUser) return {
      success: false,
      message: t("ctx_534")
    };
    if (newPass.length < 4) return {
      success: false,
      message: t("ctx_535")
    };
    try {
      const result = await updateUserPasswordInDB(currentUser.id, oldPass, newPass);
      if (result.success) {
        return {
          success: true,
          message: t("ctx_536")
        };
      }
      return {
        success: false,
        message: result.message || t("ctx_537")
      };
    } catch (e) {
      return {
        success: false,
        message: t("ctx_526")
      };
    }
  };
  const topUpWallet = async (amount: number): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!currentUser) return {
      success: false,
      message: t("ctx_534")
    };
    if (!amount || amount <= 0) return {
      success: false,
      message: t("ctx_538")
    };
    try {
      const success = await topUpWalletInDB(currentUser.id, amount);
      if (success) {
        setCurrentUser({
          ...currentUser,
          walletBalance: (currentUser.walletBalance || 0) + amount
        });
        toast.success(`Recharged ${amount} ${CURRENCY} successfully`);
        notifyGlobalUpdate();
        return {
          success: true
        };
      }
      toast.error(t("ctx_539"));
      return {
        success: false,
        message: t("ctx_539")
      };
    } catch (e) {
      toast.error(t("ctx_526"));
      return {
        success: false,
        message: t("ctx_526")
      };
    }
  };
  const withdrawWallet = async (amount: number): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!currentUser) return {
      success: false,
      message: t("ctx_534")
    };
    if (!amount || amount <= 0) return {
      success: false,
      message: t("ctx_538")
    };
    if (amount > (currentUser.walletBalance || 0)) return {
      success: false,
      message: t("ctx_540")
    };
    try {
      const success = await deductWalletInDB(currentUser.id, amount);
      if (success) {
        setCurrentUser({
          ...currentUser,
          walletBalance: (currentUser.walletBalance || 0) - amount
        });
        toast.success(`Withdrew ${amount} ${CURRENCY} successfully`);
        notifyGlobalUpdate();
        return {
          success: true
        };
      }
      toast.error(t("ctx_541"));
      return {
        success: false,
        message: t("ctx_542")
      };
    } catch (e) {
      toast.error(t("ctx_526"));
      return {
        success: false,
        message: t("ctx_526")
      };
    }
  };
  const submitOrderRating = async (orderId: string, rating: number, comment: string): Promise<boolean> => {
    try {
      const success = await submitOrderRatingInDB(orderId, rating, comment);
      if (success) {
        setOrders(prev => prev.map(o => o.id === orderId ? {
          ...o,
          rating,
          ratingComment: comment
        } : o));
        notifyGlobalUpdate();
        return true;
      }
      return false;
    } catch (e) {
      console.error("submitOrderRating error:", e);
      return false;
    }
  };
  const sendMessage = async (orderId: string, text: string, audio?: string, image?: string) => {
    if (!currentUser) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      orderId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text,
      audio,
      image,
      timestamp: Date.now(),
      isRead: false
    };
    await sendMessageInDB(newMessage);
    notifyGlobalUpdate();

    // Send push notification to the other party (not the sender)
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const recipientId = currentUser.id === order.customerId ? order.driverId : order.customerId;
      if (recipientId && recipientId !== currentUser.id) {
        triggerPushNotification(recipientId, `New message from ${currentUser.name}`, audio ? t("ctx_543") : image ? t("ctx_544") : text, {
          orderId,
          type: "NEW_MESSAGE"
        });
      }
    }
  };
  const fetchOrderMessages = async (orderId: string): Promise<Message[]> => {
    return await getMessagesFromDB(orderId);
  };

  // --- LOCATION TRACKING IMPL ---
  
  // --- BACKGROUND TRACKING EFFECT ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== Role.DRIVER) return;
    
    const hasActiveOrder = orders.some(o => 
      o.driverId === currentUser.id && 
      [OrderStatus.ACCEPTED, OrderStatus.RECEIPT_PAID, OrderStatus.WAITING_PREP, OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY].includes(o.status)
    );

    const shouldTrack = currentUser.isOnline || hasActiveOrder;

    if (shouldTrack && !isTrackingActive) {
      startLocationTracking();
    } else if (!shouldTrack && isTrackingActive) {
      stopLocationTracking();
    }
  }, [currentUser?.isOnline, orders, isTrackingActive]);

  const startLocationTracking = async () => {

    if (!currentUser) return;
    const currentUserId = currentUser.id;

    if (locationWatchId.current) {
      return;
    }
    setIsTrackingActive(true);

    const handleLocation = (latitude: number, longitude: number) => {
      const now = Date.now();
      setCurrentUser(prev => {
        if (!prev) return null;
        let lastMoved = prev.lastMovedAt || now;

        if (lastHandledLocationRef.current) {
          const dist = calculateDistance(latitude, longitude, lastHandledLocationRef.current.lat, lastHandledLocationRef.current.lng);
          if (dist > 0.010) {
            lastMoved = now;
            lastHandledLocationRef.current = { lat: latitude, lng: longitude };
          }
        } else {
          lastHandledLocationRef.current = { lat: latitude, lng: longitude };
          lastMoved = now;
        }
        
        const updatedUser = {
          ...prev,
          currentLat: latitude,
          currentLng: longitude,
          lastMovedAt: lastMoved,
          lastSeenAt: now
        };

        setUsers(allUsers => allUsers.map(u => u.id === currentUserId ? updatedUser : u));

        const moved = lastMoved === now;
        const timeSinceLastUpdate = now - lastLocationUpdateRef.current;
        const hasActiveOrderLocal = orders.some(o => o.driverId === currentUserId && ![OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(o.status));
        const throttleTime = hasActiveOrderLocal ? moved ? 10000 : 20000 : moved ? 30000 : 60000;

        if (timeSinceLastUpdate > throttleTime) {
          updateUserLocationInDB(currentUserId, latitude, longitude, lastMoved, now);
          lastLocationUpdateRef.current = now;
        }
        return updatedUser;
      });
    };

    if (Capacitor.isNativePlatform()) {
      try {
        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "عالطاير يتتبع موقعك لتوصيل الطلب بنجاح",
            backgroundTitle: "عالطاير - تتبع الطلب",
            requestPermissions: true,
            stale: false,
            distanceFilter: 10
          },
          function callback(location: any, error: any) {
            if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                console.error("Location not authorized");
              }
              return console.error(error);
            }
            if (location) {
              handleLocation(location.latitude, location.longitude);
            }
          }
        );
        locationWatchId.current = id;
      } catch (err) {
        console.error("Background Geolocation Error", err);
        setIsTrackingActive(false);
      }
    } else {
      if (!navigator.geolocation) return;
      locationWatchId.current = navigator.geolocation.watchPosition(pos => {
        handleLocation(pos.coords.latitude, pos.coords.longitude);
      }, err => {
        setIsTrackingActive(false);
      }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }) as any;
    }
  };

  const stopLocationTracking = async () => {
    if (locationWatchId.current) {
      if (Capacitor.isNativePlatform()) {
        try {
          await BackgroundGeolocation.removeWatcher({ id: String(locationWatchId.current) });
        } catch(e) {
          console.error(e);
        }
      } else {
        navigator.geolocation.clearWatch(Number(locationWatchId.current));
      }
      locationWatchId.current = null;
    }
    setIsTrackingActive(false);
  };

  // --- SYNC DRIVER LOCATION FOR CUSTOMER ---
  const syncDriverLocation = async (driverId: string): Promise<User | null> => {
    try {
      const freshUser = await getUserByIdFromDB(driverId);
      if (freshUser) {
        setUsers(prev => prev.map(u => u.id === driverId ? freshUser : u));
        return freshUser;
      }
    } catch (e) {
      console.error("Sync Error", e);
    }
    return null;
  };
  const notifyDriverOfTracking = async (orderId: string, isTracking: boolean) => {
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        isCustomerMonitoring: isTracking
      } : o));
      const success = await notifyDriverOfTrackingInDB(orderId, isTracking);
      if (success) {
        notifyGlobalUpdate();
      }
    } catch (err) {
      console.error("Error notifying tracking status", err);
    }
  };

  // --- GEOFENCING MATH ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };
  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // --- USER MANAGEMENT ---
  const updateProfile = async (name: string, phone: string): Promise<boolean> => {
    if (!currentUser) return false;
    const success = await updateUserProfileInDB(currentUser.id, name, phone);
    if (success) {
      setCurrentUser(prev => prev ? {
        ...prev,
        name,
        phone
      } : null);
      notifyGlobalUpdate();
    }
    return success;
  };
  const adminUpdateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    const success = await adminUpdateUserInDB(userId, updates);
    if (success) {
      notifyGlobalUpdate();
    }
    return success;
  };
  const requestLocationPulse = async () => {
    if (!currentUser || currentUser.role !== Role.ADMIN) return;
    const {
      updateLocationPulseForAdminInDB
    } = await import('./db');
    await updateLocationPulseForAdminInDB(currentUser.id);
    notifyGlobalUpdate();
  };

  // --- TRACKING NOTIFICATION ---

  return <AppContext.Provider value={{
    currentUser,
    users,
    orders,
    zones,
    isNetworkAvailable,
    isDbReady,
    isInitializing,
    dbError,
    unreadCount,
    autoOpenChatId,
    clearAutoOpenChat: () => setAutoOpenChatId(null),
    resetUnreadCount: () => setUnreadCount(0),
    notificationsList,
    fetchNotifications,
    markNotificationRead,
    isTrackingActive,
    login,
    loginWithGoogle,
    linkGoogleAccount,
    completeGoogleRegistration,
    register,
    adminCreateUser,
    logout,
    deleteAccount,
    createOrder,
    updateOrderStatus,
    acceptOrder,
    addAddress,
    deleteAddress,
    reportIssue,
    addZone,
    editZone,
    removeZone,
    updateZonePrice,
    addDriver,
    verifyDeliveryCode,
    checkGeofence,
    changePassword,
    topUpWallet,
    withdrawWallet,
    submitOrderRating,
    requestCancellation,
    rejectCancellation,
    cancelOrder,
    notifyDriverOfTracking,
    startLocationTracking,
    stopLocationTracking,
    syncDriverLocation,
    calculateDistance,
    // Exported
    manualRefresh,
    toggleOnlineStatus,
    sendMessage,
    fetchOrderMessages,
    updateProfile,
    // Exported
    adminUpdateUser,
    // Exported
    requestLocationPulse,
    // Exported
    reportDelay // Exported
  }}>
      {children}
    </AppContext.Provider>;
};
export const useApp = () => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};