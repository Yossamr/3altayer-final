import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(), // ADMIN, EMPLOYEE, DRIVER, CUSTOMER
  walletBalance: real('wallet_balance').default(0),
  cashCollected: real('cash_collected').default(0),
  cashLimit: real('cash_limit').default(2000),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  isBlocked: integer('is_blocked', { mode: 'boolean' }).default(false),
  addressDetails: text('address_details'),
  zoneId: text('zone_id'),
  currentLat: real('current_lat'),
  currentLng: real('current_lng'),
  savedAddressesJson: text('saved_addresses_json'),
  settlementRequested: integer('settlement_requested', { mode: 'boolean' }).default(false),
  lastMovedAt: integer('last_moved_at'),
  lastSeenAt: integer('last_seen_at'),
  avgDeliveryTime: real('avg_delivery_time'),
  completedOrdersCount: integer('completed_orders_count').default(0),
  totalDistance: real('total_distance').default(0),
  locationPulse: integer('location_pulse').default(0),
  firebaseUid: text('firebase_uid').unique(),
  email: text('email'),
  fcmToken: text('fcm_token'),
}, (table) => {
  return {
    phoneIdx: index('phone_idx').on(table.phone)
  };
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  customerId: text('customer_id').notNull(),
  driverId: text('driver_id'),
  storeId: text('store_id'),
  pickupAddress: text('pickup_address'),
  deliveryAddressJson: text('delivery_address_json'),
  items: text('items'),
  price: real('price'),
  itemCost: real('item_cost').default(0),
  payer: text('payer'),
  recipientPhone: text('recipient_phone'),
  timelineJson: text('timeline_json'),
  issuesJson: text('issues_json'),
  createdAt: integer('created_at'),
  isTracking: integer('is_tracking', { mode: 'boolean' }).default(false),
  deliveryCode: text('delivery_code'),
  notes: text('notes'),
  allowDoubleOrder: integer('allow_double_order', { mode: 'boolean' }).default(true),
  cancellationRequestJson: text('cancellation_request_json'),
  assignedDriversJson: text('assigned_drivers_json'),
  isBatched: integer('is_batched', { mode: 'boolean' }).default(false),
  batchId: text('batch_id'),
  proofImageUrl: text('proof_image_url'),
  delayReason: text('delay_reason'),
  bidsJson: text('bids_json'),
  rating: integer('rating'),
  ratingComment: text('rating_comment'),
  timeTakenMinutes: real('time_taken_minutes'),
  zoneId: text('zone_id'),
}, (table) => {
  return {
    statusIdx: index('status_idx').on(table.status),
    driverIdIdx: index('driver_id_idx').on(table.driverId),
    zoneIdIdx: index('orders_zone_id_idx').on(table.zoneId)
  };
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  text: text('text').notNull(),
  audio: text('audio'),
  image: text('image'),
  createdAt: integer('created_at'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
});

export const zones = sqliteTable('zones', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  pricesJson: text('prices_json'),
  nameAr: text('name_ar'),
  nameEn: text('name_en'),
  governorateCode: text('governorate_code').unique(),
  status: text('status').default('inactive'), // 'active', 'inactive', 'coming_soon'
  centerLat: real('center_lat'),
  centerLng: real('center_lng'),
  radiusKm: real('radius_km'),
  polygonGeojson: text('polygon_geojson'),
  monthlyOrderLimit: integer('monthly_order_limit'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type'),
  relatedId: text('related_id'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at').notNull(),
});

export const zoneWaitlist = sqliteTable('zone_waitlist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  zoneId: text('zone_id').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  name: text('name'),
  createdAt: integer('created_at').notNull(),
});

export const driverApplications = sqliteTable('driver_applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  vehicleType: text('vehicle_type').notNull(), // 'motorcycle', 'bicycle'
  idCardFront: text('id_card_front').notNull(), // base64 string
  idCardBack: text('id_card_back').notNull(), // base64 string
  licenseImage: text('license_image'), // base64 string, optional for bicycle
  status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
  createdAt: integer('created_at').notNull(),
});

