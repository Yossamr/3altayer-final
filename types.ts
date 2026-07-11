
export enum Role {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  OBSERVER = 'OBSERVER'
}

export enum OrderType {
  SHOPPING = 'SHOPPING',     // مشتريات
  EMERGENCY = 'EMERGENCY',   // رايح جاي
  PICK_DROP = 'PICK_DROP',   // من هنا لهنا (Inside Zone)
  GOVERNORATE = 'GOVERNORATE' // شحن محافظات
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  // Purchase specific (legacy support or mapped to Receive)
  RECEIPT_PAID = 'RECEIPT_PAID',
  WAITING_PREP = 'WAITING_PREP',
  // General
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export interface Zone {
  id: string;
  name: string;
  price: number; // Legacy support
  prices: {
    [key in OrderType]: number;
  };
  nameAr?: string;
  nameEn?: string;
  governorateCode?: string;
  status?: 'active' | 'inactive' | 'coming_soon';
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  polygonGeojson?: string;
  monthlyOrderLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  title: string;
  details: string;
  zoneId: string;
  lat?: number;
  lng?: number;
}

export interface TimelineEvent {
  status: OrderStatus;
  timestamp: number;
  imageUrl?: string;
  driverId?: string;
  notes?: string; // For delay reasons or extra info
}

export interface Issue {
  id: string;
  orderId: string;
  reporterId: string;
  reason: string;
  timestamp: number;
  resolved: boolean;
}

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  text: string;
  audio?: string; // Base64 audio string
  image?: string; // Base64 image string
  timestamp: number;
  isRead: boolean;
}

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  customerId: string;
  recipientPhone?: string; 
  driverId?: string;
  storeId?: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryAddress: Address;
  items: string;
  price: number;
  itemCost?: number;
  payer?: 'SENDER' | 'RECIPIENT'; // Who pays the total
  timeline: TimelineEvent[]; 
  issues: Issue[];
  createdAt: number;
  notes?: string;
  deliveryCode?: string; // The secret code for QR
  zoneId?: string;       // The zone of the order
  
  // Attachments
  orderImageUrl?: string; // Base64 or URL
  voiceNote?: string; // Base64 audio string (legacy)
  voiceNotes?: string[]; // Array of base64 audio strings

  // Cancellation Request
  cancellationRequest?: {
    requesterId: string;
    reason: string;
    timestamp: number;
  };

  // Automated Dispatch & Batching
  assignedDriverIds?: string[]; // Targeted drivers for auto-dispatch
  isBatched?: boolean;          // Part of a multi-order delivery
  batchId?: string;             
  
  // Security & Proof
  proofImageUrl?: string;       // Base64 photo proof at delivery
  delayReason?: string;         // Current delay reason if reported
  isCustomerMonitoring?: boolean; // Live tracking active
  rating?: number;
  ratingComment?: string;
  timeTakenMinutes?: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: number;
}

export interface DriverApplication {
  id: number;
  name: string;
  phone: string;
  address: string;
  vehicleType: 'motorcycle' | 'bicycle';
  idCardFront: string;
  idCardBack: string;
  licenseImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;     
  password: string;  
  role: Role;
  walletBalance: number;
  isOnline?: boolean;
  isBlocked?: boolean; // New: For banning users
  savedAddresses?: Address[]; // For customers
  currentLat?: number; 
  currentLng?: number; 
  lastMovedAt?: number; // Timestamp of last significant movement
  lastSeenAt?: number;  // Timestamp of last GPS update received
  isIdle?: boolean;     // UI flag for inactivity
  zoneId?: string;      // Assigned coverage zone

  // Efficiency Metrics (Calculated)
  avgDeliveryTime?: number; // In minutes
  completedOrdersCount?: number;
  totalDistanceTraveled?: number; // In km
  locationPulse?: number;

  firebaseUid?: string;
  email?: string;
}
