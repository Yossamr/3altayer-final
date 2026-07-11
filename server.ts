import crypto from 'crypto';

import "dotenv/config";

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './db/schema.js';
import { eq, and, or, inArray, desc, gt, not, sql, lte, gte, like } from 'drizzle-orm';
import argon2 from 'argon2';
import cors from 'cors';
import { z } from 'zod';

import { firebaseAdminAuth, getMessaging } from "./services/firebaseAdmin.js";
import { INITIAL_ZONES } from "./constants.js";

const app = express();
const PORT = 3000;

export const saveFcmToken = async (userId: string, token: string) => {
  try {
    await db.update(schema.users)
      .set({ fcmToken: token })
      .where(eq(schema.users.id, Number(userId)));
  } catch (e: any) {
    console.error("Failed to save FCM token to DB:", e);
  }
};

const removeFcmToken = async (userId: string) => {
  try {
    await db.update(schema.users)
      .set({ fcmToken: null })
      .where(eq(schema.users.id, Number(userId)));
  } catch (e: any) {
    console.error("Failed to remove FCM token from DB:", e);
  }
};

export const sendPushToUser = async (userId: string, title: string, body: string, data?: Record<string, string>) => {
  try {
    const foundUsers = await db.select({ fcmToken: schema.users.fcmToken }).from(schema.users).where(eq(schema.users.id, Number(userId)));
    if (foundUsers.length === 0) return;
    const token = foundUsers[0].fcmToken;
    if (!token) return;

    await getMessaging().send({
      token,
      notification: { title, body },
      data: data || {},
      webpush: {
        fcmOptions: { link: "/" },
      },
    });
  } catch (e: any) {
    if (e?.code === "messaging/registration-token-not-registered" || 
        e?.message?.includes("registration-token-not-registered") ||
        e?.message?.includes("not-registered")) {
      await removeFcmToken(userId);
    } else {
      console.error("FCM send error:", e);
    }
  }
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize DB Client lazily using Proxies to prevent crashing on server startup when variables are missing.
let _db: any = null;
let _dbClient: any = null;

function initDbIfNeeded() {
  if (_db) return { db: _db, dbClient: _dbClient };
  let dbUrl = process.env.TURSO_DB_URL;
  let dbToken = process.env.TURSO_DB_TOKEN;
  
  if (!dbUrl) {
    console.warn("⚠️ Warning: TURSO_DB_URL is not defined. Falling back to local SQLite database 'file:local.db'.");
    dbUrl = "file:local.db";
    dbToken = undefined;
  }
  
  _dbClient = createClient({ url: dbUrl, authToken: dbToken });
  _db = drizzle(_dbClient, { schema });
  return { db: _db, dbClient: _dbClient };
}

const db = new Proxy({} as any, {
  get(target, prop) {
    const { db: actualDb } = initDbIfNeeded();
    const value = Reflect.get(actualDb, prop);
    if (typeof value === 'function') {
      return (...args: any[]) => value.apply(actualDb, args);
    }
    return value;
  }
});

const dbClient = new Proxy({} as any, {
  get(target, prop) {
    const { dbClient: actualClient } = initDbIfNeeded();
    const value = Reflect.get(actualClient, prop);
    if (typeof value === 'function') {
      return (...args: any[]) => value.apply(actualClient, args);
    }
    return value;
  }
});

// --- RATE LIMITING ---
const ipLimits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const clientLimit = ipLimits.get(String(ip));
    
    if (!clientLimit || now > clientLimit.resetAt) {
      ipLimits.set(String(ip), { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    clientLimit.count += 1;
    if (clientLimit.count > limit) {
      return res.status(429).json({ success: false, message: "Rate limit exceeded. Please try again later." });
    }
    
    next();
  };
}

// --- SECURE CRYPTO SESSIONS ---
let SESSION_SECRET: string = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.log("ℹ️ Using random fallback SESSION_SECRET. Session persistence across server restarts will be lost. Set SESSION_SECRET to prevent this.");
}

function generateToken(userId: number | string): string {
  const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = `${userId}:${expiration}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}:${signature}`;
}

function verifyToken(token: string): number | null {
  if (!token) return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [userId, expiration, signature] = parts;
  
  if (Date.now() > Number(expiration)) {
    return null; // Expired
  }
  
  const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(`${userId}:${expiration}`).digest("hex");
  if (signature !== expectedSignature) {
    return null; // Invalid signature
  }
  
  return Number(userId);
}

// Request extension interface
interface AuthenticatedRequest extends express.Request {
  userId?: number;
  userRole?: string;
}

// Authentication Middleware
async function authenticate(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized access. Please login first." });
  }
  
  const token = authHeader.split(" ")[1];
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Session expired. Please login again." });
  }
  
  const foundUsers = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (foundUsers.length === 0) {
    return res.status(401).json({ success: false, message: "User not found." });
  }
  
  const user = foundUsers[0];
  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: "This account is blocked." });
  }
  
  req.userId = userId;
  let normalizedRole = user.role;
  if (normalizedRole === 'admin') normalizedRole = 'manager';
  if (normalizedRole === 'driver') normalizedRole = 'agent';
  req.userRole = normalizedRole; // 'customer', 'agent', 'employee', 'manager', 'observer'
  next();
}

function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ success: false, message: "Unauthorized access." });
    }
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
    }
    next();
  };
}

// --- APIS ---

export const loginSchema = z.object({
  phone: z.string().trim().min(1),
  password: z.string().min(1)
});


// TEST ENDPOINT FOR LOAD TESTING (Bypasses Auth & Rate Limits)


// TEST ENDPOINT FOR LOAD TESTING (Bypasses Auth & Rate Limits)


// TEST ENDPOINT FOR LOAD TESTING (Bypasses Auth & Rate Limits)


// TEST ENDPOINT FOR LOAD TESTING (Bypasses Auth & Rate Limits)
app.post("/api/test-order-load", async (req, res) => {
  try {
    const { customerId } = req.body;
    await dbClient.execute(`
      INSERT INTO orders (type, status, customer_id, created_at, zone_id)
      VALUES ('delivery', 'PENDING', ${Number(customerId) || 1}, '${new Date().toISOString()}', 'zone-1')
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Account Deletion (Apple Guideline 5.1.1(v))
app.post("/api/delete-account", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const uId = Number(req.userId);
    
    // Check if user has associated orders
    const associatedOrders = await db.select().from(schema.orders)
      .where(or(eq(schema.orders.customerId, String(uId)), eq(schema.orders.driverId, String(uId))));
      
    if (associatedOrders.length === 0) {
      // Hard delete if no orders
      await db.delete(schema.users).where(eq(schema.users.id, uId));
    } else {
      // Soft delete + anonymization
      await db.update(schema.users)
        .set({
          name: "مستخدم محذوف",
          phone: `deleted_${Date.now()}_${uId}`,
          password: "",
          isBlocked: true,
          email: null,
          fcmToken: null,
          firebaseUid: null,
          addressDetails: null,
          currentLat: null,
          currentLng: null,
          savedAddressesJson: null,
          walletBalance: 0
        })
        .where(eq(schema.users.id, uId));
    }
    
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/zones", async (req, res) => {
  try {
    const rawZones = await db.select().from(schema.zones);
    const result = rawZones.map((z: any) => {
      let prices = {};
      if (z.pricesJson) {
        try {
          prices = typeof z.pricesJson === 'string' ? JSON.parse(z.pricesJson) : z.pricesJson;
        } catch (e: any) {}
      }
      return {
        ...z,
        prices
      };
    });
    res.json({ success: true, result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: "Error fetching zones" });
  }
});

app.post("/api/login", rateLimit(10, 60 * 1000), async (req, res) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    
    const foundUsers = await db.select().from(schema.users).where(eq(schema.users.phone, phone.trim()));
    if (foundUsers.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid phone number or password (or account is blocked)" });
    }
    
    const user = foundUsers[0];
    
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "This account is blocked. Please contact administration." });
    }
    
    let isValid = false;
    let needsHashing = false;
    
    if (user.password.startsWith('$argon2')) {
      isValid = await argon2.verify(user.password, password);
    } else {
      if (user.password === password) {
        isValid = true;
        needsHashing = true;
      }
    }
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid phone number or password (or account is blocked)" });
    }
    
    if (needsHashing) {
      const hashed = await argon2.hash(password);
      await db.update(schema.users).set({ password: hashed }).where(eq(schema.users.id, user.id));
      console.log(`Password updated to Argon2 for user ${user.phone}`);
    }
    
    let returnedRole = user.role;
    if (user.role === 'manager' || user.role === 'admin') returnedRole = 'ADMIN';
    if (user.role === 'agent' || user.role === 'driver') returnedRole = 'DRIVER';
    if (user.role === 'employee') returnedRole = 'EMPLOYEE';
    if (user.role === 'customer') returnedRole = 'CUSTOMER';
    if (user.role === 'observer') returnedRole = 'OBSERVER';
    
    const { password: _, ...cleanUser } = user;
    const clientUser = {
      ...cleanUser,
      role: returnedRole,
      isBlocked: Boolean(user.isBlocked),
      settlementRequested: Boolean(user.settlementRequested),
    };
    
    const token = generateToken(user.id);
    
    res.json({ success: true, token, user: clientUser });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }
    console.error("Login Error:", e);
    res.json({ success: false, message: "An unexpected error occurred" });
  }
});

export const changePasswordSchema = z.object({
  userId: z.union([z.string(), z.number()]),
  oldPassword: z.string().min(1),
  newPassword: z.string().min(4)
});

app.post("/api/change-password", rateLimit(5, 60 * 1000), authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, oldPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    if (req.userId !== Number(userId)) {
      return res.status(403).json({ success: false, message: "You are not allowed to change another user's password" });
    }

    const foundUsers = await db.select().from(schema.users).where(eq(schema.users.id, Number(userId)));
    if (foundUsers.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user = foundUsers[0];

    let isValid = false;
    if (user.password.startsWith('$argon2')) {
      isValid = await argon2.verify(user.password, oldPassword);
    } else {
      isValid = user.password === oldPassword;
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Old password is incorrect" });
    }

    const newHash = await argon2.hash(newPassword);
    await db.update(schema.users).set({ password: newHash }).where(eq(schema.users.id, user.id));

    res.json({ success: true, message: "Password changed successfully" });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "New password is too short or data is invalid" });
    }
    console.error("Change Password Error:", e);
    res.json({ success: false, message: "An unexpected error occurred" });
  }
});

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().length(11),
  password: z.string().min(4),
  address: z.string().min(1),
  zoneId: z.string().min(1)
});

app.post("/api/register", rateLimit(5, 60 * 1000), async (req, res) => {
  try {
    const { name, phone, password, address, zoneId } = registerSchema.parse(req.body);
    const cleanPhone = phone.trim();

    const zoneObj = await db.select().from(schema.zones).where(eq(schema.zones.id, zoneId));
    if (zoneObj.length === 0) {
      return res.status(400).json({ success: false, message: "Selected zone does not exist" });
    }
    if (zoneObj[0].status !== 'active') {
      return res.status(400).json({ success: false, message: "Selected zone is currently inactive or coming soon" });
    }

    const existing = await db.select().from(schema.users).where(eq(schema.users.phone, cleanPhone));
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Phone number is already in use" });
    }

    const hashedPassword = await argon2.hash(password);

    const initialAddress = {
      id: `addr-${Date.now()}`,
      title: 'Primary Address',
      details: address,
      zoneId: zoneId
    };

    const [newUser] = await db.insert(schema.users).values({
      name,
      phone: cleanPhone,
      password: hashedPassword,
      role: 'customer',
      addressDetails: address,
      zoneId: zoneId,
      savedAddressesJson: JSON.stringify([initialAddress])
    }).returning();

    const token = generateToken(newUser.id);

    res.json({ success: true, token });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Missing or invalid data" });
    }
    console.error("Register Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

const zoneWaitlistSchema = z.object({
  zoneId: z.string().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal('')),
  name: z.string().trim().min(1).optional()
});

const driverAppSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  vehicleType: z.enum(['motorcycle', 'bicycle']),
  idCardFront: z.string().min(1),
  idCardBack: z.string().min(1),
  licenseImage: z.string().optional()
});

app.post("/api/driver-applications", rateLimit(5, 60 * 1000), async (req, res) => {
  try {
    const data = driverAppSchema.parse(req.body);
    await db.insert(schema.driverApplications).values({
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      vehicleType: data.vehicleType,
      idCardFront: data.idCardFront,
      idCardBack: data.idCardBack,
      licenseImage: data.licenseImage || null,
      createdAt: Date.now()
    });
    res.json({ success: true, message: "Application submitted" });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Missing or invalid data" });
    }
    console.error("Driver App Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

app.get("/api/driver-applications", authenticate, requireRoles(["ADMIN", "EMPLOYEE"]), async (req, res) => {
  try {
    const applications = await db.select().from(schema.driverApplications).orderBy(desc(schema.driverApplications.createdAt));
    res.json({ success: true, applications });
  } catch (e) {
    console.error("Get Driver Apps Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

app.post("/api/driver-applications/:id/action", authenticate, requireRoles(["ADMIN", "EMPLOYEE"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { action } = req.body; // 'approve' or 'reject'
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    if (action === 'approve') {
      // Fetch application details
      const apps = await db.select().from(schema.driverApplications).where(eq(schema.driverApplications.id, id));
      if (apps.length > 0) {
        const appData = apps[0];
        const cleanPhone = appData.phone.trim();
        // Check if user already exists
        const existing = await db.select().from(schema.users).where(eq(schema.users.phone, cleanPhone));
        if (existing.length === 0) {
          // Create a new driver user with default password '1234'
          const hashedPassword = await argon2.hash("1234");
          await db.insert(schema.users).values({
            name: appData.name,
            phone: cleanPhone,
            password: hashedPassword,
            role: 'agent', // 'agent' in DB is mapped to 'DRIVER' in front-end
            addressDetails: appData.address,
            isOnline: false,
            isBlocked: false,
          });
        }
      }
    }

    await db.update(schema.driverApplications).set({ status: action === 'approve' ? 'approved' : 'rejected' }).where(eq(schema.driverApplications.id, id));
    res.json({ success: true });
  } catch (e) {
    console.error("Driver App Action Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

app.post("/api/zone-waitlist", rateLimit(5, 60 * 1000), async (req, res) => {
  try {
    const { zoneId, phone, email, name } = zoneWaitlistSchema.parse(req.body);
    const cleanPhone = phone.trim();

    const zoneObj = await db.select().from(schema.zones).where(eq(schema.zones.id, zoneId));
    if (zoneObj.length === 0) {
      return res.status(400).json({ success: false, message: "Selected zone does not exist" });
    }

    // Insert into waitlist
    await db.insert(schema.zoneWaitlist).values({
      zoneId,
      phone: cleanPhone,
      email: email || null,
      name: name || null,
      createdAt: Date.now()
    });

    res.json({ success: true, message: "Successfully registered to the waitlist!" });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Missing or invalid data" });
    }
    console.error("Waitlist Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

const createUserSchema = z.object({
  name: z.string().min(1),
  phone: z.string().length(11),
  password: z.string().min(4),
  role: z.string().min(1)
});

app.post("/api/create-user", authenticate, requireRoles(["ADMIN"]), async (req, res) => {
  try {
    const { name, phone, password, role } = createUserSchema.parse(req.body);
    const cleanPhone = phone.trim();

    const existing = await db.select().from(schema.users).where(eq(schema.users.phone, cleanPhone));
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Phone number is already in use" });
    }

    const hashedPassword = await argon2.hash(password);

    let dbRole = role;
    if (role === 'ADMIN') dbRole = 'manager';
    if (role === 'DRIVER') dbRole = 'agent';
    if (role === 'EMPLOYEE') dbRole = 'employee';
    if (role === 'CUSTOMER') dbRole = 'customer';
    if (role === 'OBSERVER') dbRole = 'observer';

    await db.insert(schema.users).values({
      name,
      phone: cleanPhone,
      password: hashedPassword,
      role: dbRole
    });

    res.json({ success: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Missing or invalid data" });
    }
    console.error("Create User Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

// --- GOOGLE AUTH ---
async function verifyOrDecodeIdToken(idToken: string) {
  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    return decoded;
  } catch (error) {
    console.warn("⚠️ Firebase ID Token verification failed. Falling back to unverified manual JWT decode for development/sandbox convenience:", error);
    try {
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid ID Token format");
      }
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      return {
        uid: payload.sub || payload.user_id || payload.uid,
        email: payload.email,
        name: payload.name || payload.email?.split("@")[0] || "Google User",
        picture: payload.picture
      };
    } catch (manualError) {
      console.error("❌ Manual JWT decoding also failed:", manualError);
      throw error; // throw original verification error if manual also fails
    }
  }
}

const googleAuthSchema = z.object({ idToken: z.string().min(1) });

app.post("/api/auth/google", async (req, res) => {
  try {
    const { idToken } = googleAuthSchema.parse(req.body);
    const decoded = await verifyOrDecodeIdToken(idToken);
    const { uid, email, name } = decoded;

    let foundUsers = await db.select().from(schema.users).where(eq(schema.users.firebaseUid, uid));

    if (foundUsers.length === 0 && email) {
      const emailUsers = await db.select().from(schema.users).where(eq(schema.users.email, email));
      if (emailUsers.length > 0) {
        return res.json({ success: true, needsLinking: true, email: email || "", name: name || "", phone: emailUsers[0].phone });
      }
    }

    if (foundUsers.length === 0) {
      return res.json({ success: true, needsPhone: true, email: email || "", name: name || "" });
    }

    const user = foundUsers[0];
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "This account is blocked." });
    }

    let returnedRole = user.role;
    if (user.role === 'manager' || user.role === 'admin') returnedRole = 'ADMIN';
    if (user.role === 'agent' || user.role === 'driver') returnedRole = 'DRIVER';
    if (user.role === 'employee') returnedRole = 'EMPLOYEE';
    if (user.role === 'customer') returnedRole = 'CUSTOMER';
    if (user.role === 'observer') returnedRole = 'OBSERVER';

    const token = generateToken(user.id);

    const { password: _, ...cleanUser } = user;

    res.json({
      success: true,
      needsPhone: false,
      token,
      user: { ...cleanUser, role: returnedRole, isBlocked: Boolean(user.isBlocked) },
    });
  } catch (e: any) {
    console.error("Google Auth Error:", e);
    res.json({ success: false, message: "Google account verification failed" });
  }
});

const googleLinkSchema = z.object({ idToken: z.string().min(1), password: z.string().min(1) });

app.post("/api/auth/google-link", rateLimit(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { idToken, password } = googleLinkSchema.parse(req.body);
    const decoded = await verifyOrDecodeIdToken(idToken);
    const { uid, email } = decoded;

    if (!email) return res.status(400).json({ success: false, message: "No email found in Google account." });

    const foundUsers = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (foundUsers.length === 0) {
      return res.status(404).json({ success: false, message: "Account to link not found." });
    }

    const user = foundUsers[0];
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password for existing account." });
    }

    await db.update(schema.users).set({ firebaseUid: uid }).where(eq(schema.users.id, user.id));

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "This account is blocked." });
    }
    
    let returnedRole = user.role;
    if (user.role === 'manager' || user.role === 'admin') returnedRole = 'ADMIN';
    if (user.role === 'agent' || user.role === 'driver') returnedRole = 'DRIVER';
    if (user.role === 'employee') returnedRole = 'EMPLOYEE';
    if (user.role === 'customer') returnedRole = 'CUSTOMER';
    if (user.role === 'observer') returnedRole = 'OBSERVER';

    const token = generateToken(user.id);
    const { password: _, ...cleanUser } = user;
    
    res.json({
      success: true,
      token,
      user: { ...cleanUser, role: returnedRole, isBlocked: Boolean(user.isBlocked) },
    });
  } catch (e: any) {
    console.error("Google Link Error:", e);
    res.status(500).json({ success: false, message: "Unexpected error" });
  }
});

const googleCompleteSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().length(11),
  address: z.string().min(1),
  zoneId: z.string().min(1),
});

app.post("/api/auth/google-complete", async (req, res) => {
  try {
    const { idToken, name, phone, address, zoneId } = googleCompleteSchema.parse(req.body);
    const decoded = await verifyOrDecodeIdToken(idToken);
    const { uid, email } = decoded;

    const zoneObj = await db.select().from(schema.zones).where(eq(schema.zones.id, zoneId));
    if (zoneObj.length === 0) {
      return res.status(400).json({ success: false, message: "Selected zone does not exist" });
    }
    if (zoneObj[0].status !== 'active') {
      return res.status(400).json({ success: false, message: "Selected zone is currently inactive or coming soon" });
    }

    const existingPhone = await db.select().from(schema.users).where(eq(schema.users.phone, phone));
    if (existingPhone.length > 0) {
      return res.status(409).json({ success: false, message: "This phone number is already registered to another account" });
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await argon2.hash(randomPassword);

    const [newUser] = await db.insert(schema.users).values({
      name,
      phone,
      password: hashedPassword,
      role: "customer",
      addressDetails: address,
      zoneId,
      firebaseUid: uid,
      email: email || null,
    }).returning();

    const token = generateToken(newUser.id);

    const { password: _, ...cleanUser } = newUser;
    res.json({ success: true, token, user: { ...cleanUser, role: "CUSTOMER" } });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ success: false, message: "Missing data" });
    console.error("Google Complete Error:", e);
    res.json({ success: false, message: e.message || "An unexpected error occurred" });
  }
});

// --- REGISTER FCM TOKEN ---
const fcmTokenSchema = z.object({ userId: z.union([z.string(), z.number()]), token: z.string().min(1) });

app.post("/api/fcm/token", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, token } = fcmTokenSchema.parse(req.body);
    if (Number(userId) !== req.userId) return res.status(403).json({ success: false, message: "Forbidden" });
    await saveFcmToken(String(userId), token);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ success: false });
  }
});

const notifySchema = z.object({
  targetUserId: z.union([z.string(), z.number()]),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string(), z.string()).optional(),
});

app.post("/api/notify", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetUserId, title, body, data } = notifySchema.parse(req.body);
    if (req.userRole !== "manager" && req.userRole !== "employee") return res.status(403).json({ success: false, message: "Forbidden" });
    await sendPushToUser(String(targetUserId), title, body, data || {});
    
    await db.insert(schema.notifications).values({
      id: crypto.randomUUID(),
      userId: String(targetUserId),
      title,
      body,
      type: data?.type || null,
      relatedId: data?.relatedId || null,
      createdAt: Date.now()
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ success: false });
  }
});

app.get("/api/notifications", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = String(req.query.userId || "");
    if (!userId || Number(userId) !== req.userId) return res.status(403).json({ success: false, notifications: [] });
    
    const notifs = await db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(schema.notifications.createdAt)
      .all();
      
    res.json({ success: true, notifications: notifs.reverse() });
  } catch (e: any) {
    res.json({ success: false, notifications: [] });
  }
});

app.post("/api/notifications/mark-read", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { notificationId } = req.body;
    // Note: should ideally verify the notification belongs to req.userId
    await db.update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, notificationId));
    res.json({ success: true });
  } catch (e: any) {
    res.json({ success: false });
  }
});

// --- SECURE SECURE RPC ENDPOINT ---
app.post("/api/rpc", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { method, args = [] } = req.body;
    
    if (!method) {
      return res.status(400).json({ success: false, message: "Method missing" });
    }
    
    const userRole = req.userRole;
    const userId = req.userId;
    
    // Observers are READ-ONLY on all endpoints
    const isObserver = userRole === "observer";
    const isWriteOperation = [
      "updateUserProfileInDB",
      "adminUpdateUserInDB",
      "topUpWalletInDB",
      "deductWalletInDB",
      "createZoneInDB",
      "updateZoneInDB",
      "deleteZoneInDB",
      "addUserAddressInDB",
      "cancelOrderInDB",
      "notifyDriverOfTrackingInDB",
      "createOrderInDB",
      "tryAcceptOrderInDB",
      "updateOrderStatusInDB",
      "rejectCancellationInDB",
      "requestCancellationInDB",
      "updateUserLocationInDB",
      "updateUserStatusInDB",
      "submitOrderRatingInDB",
      "updateLocationPulseForAdminInDB",
      "sendMessageInDB"
    ].includes(method);
    
    if (isObserver && isWriteOperation) {
      return res.status(403).json({ success: false, message: "Read-only access is active for partner account." });
    }

    switch (method) {
      case "getAllUsersFromDB": {
        if (!["manager", "employee", "observer"].includes(userRole!)) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
        const [pageParam, limitParam] = args;
        const page = pageParam ? Number(pageParam) : 1;
        const limit = limitParam ? Number(limitParam) : 5000;
        const offset = (page - 1) * limit;

        const result = await db.select().from(schema.users).limit(limit).offset(offset);
        const cleanResult = result.map(({ password, ...u }: any) => {
          let returnedRole = u.role;
          if (u.role === 'manager' || u.role === 'admin') returnedRole = 'ADMIN';
          if (u.role === 'agent' || u.role === 'driver') returnedRole = 'DRIVER';
          if (u.role === 'employee') returnedRole = 'EMPLOYEE';
          if (u.role === 'customer') returnedRole = 'CUSTOMER';
          if (u.role === 'observer') returnedRole = 'OBSERVER';
          return { ...u, role: returnedRole };
        });
        return res.json({ success: true, result: cleanResult });
      }

      case "getUsersCountFromDB": {
        if (!["manager", "employee", "observer"].includes(userRole!)) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
        const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
        return res.json({ success: true, result: result.count });
      }
      
      case "getUserByIdFromDB": {
        const [targetId] = args;
        const numericId = Number(targetId);
        if (userRole !== "manager" && userRole !== "employee" && userRole !== "observer" && userId !== numericId) {
          return res.status(403).json({ success: false, message: "Access denied for this account data" });
        }
        const found = await db.select().from(schema.users).where(eq(schema.users.id, numericId));
        if (found.length > 0) {
          const { password, ...cleanUser } = found[0];
          let returnedRole = cleanUser.role;
          if (cleanUser.role === 'manager' || cleanUser.role === 'admin') returnedRole = 'ADMIN';
          if (cleanUser.role === 'agent' || cleanUser.role === 'driver') returnedRole = 'DRIVER';
          if (cleanUser.role === 'employee') returnedRole = 'EMPLOYEE';
          if (cleanUser.role === 'customer') returnedRole = 'CUSTOMER';
          if (cleanUser.role === 'observer') returnedRole = 'OBSERVER';
          return res.json({ success: true, result: { ...cleanUser, role: returnedRole } });
        }
        return res.json({ success: true, result: null });
      }
      
      case "updateUserProfileInDB": {
        const [targetId, name, phone] = args;
        const numericId = Number(targetId);
        if (userId !== numericId && userRole !== "manager" && userRole !== "employee") {
          return res.status(403).json({ success: false, message: "Modification denied" });
        }
        await db.update(schema.users)
          .set({ name, phone: phone.trim() })
          .where(eq(schema.users.id, numericId));
        return res.json({ success: true, result: true });
      }
      
      case "adminUpdateUserInDB": {
        if (userRole !== "manager") {
          return res.status(403).json({ success: false, message: "Admin access only" });
        }
        const [targetId, updates] = args;
        const numericId = Number(targetId);
        const up: any = {};
        if (updates.name !== undefined) up.name = updates.name;
        if (updates.phone !== undefined) up.phone = updates.phone.trim();
        if (updates.password !== undefined) up.password = await argon2.hash(updates.password);
        if (updates.role !== undefined) {
          let dbRole = updates.role;
          if (updates.role === 'ADMIN') dbRole = 'manager';
          if (updates.role === 'DRIVER') dbRole = 'agent';
          if (updates.role === 'EMPLOYEE') dbRole = 'employee';
          if (updates.role === 'CUSTOMER') dbRole = 'customer';
          if (updates.role === 'OBSERVER') dbRole = 'observer';
          up.role = dbRole;
        }
        if (updates.isBlocked !== undefined) up.isBlocked = !!updates.isBlocked;
        
        await db.update(schema.users).set(up).where(eq(schema.users.id, numericId));
        return res.json({ success: true, result: true });
      }
      
      case "topUpWalletInDB": {
        if (userRole !== "manager" && userRole !== "employee") {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        const [targetId, amount] = args;
        const numericId = Number(targetId);
        if (!amount || amount <= 0) return res.json({ success: true, result: false });
        
        const found = await db.select().from(schema.users).where(eq(schema.users.id, numericId));
        if (found.length === 0) return res.json({ success: true, result: false });
        const newBalance = (found[0].walletBalance || 0) + amount;
        
        await db.update(schema.users).set({ walletBalance: newBalance }).where(eq(schema.users.id, numericId));
        return res.json({ success: true, result: true });
      }
      
      case "deductWalletInDB": {
        if (userRole !== "manager" && userRole !== "employee") {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        const [targetId, amount] = args;
        const numericId = Number(targetId);
        if (!amount || amount <= 0) return res.json({ success: true, result: false });
        
        const found = await db.select().from(schema.users).where(eq(schema.users.id, numericId));
        if (found.length === 0 || (found[0].walletBalance || 0) < amount) return res.json({ success: true, result: false });
        const newBalance = (found[0].walletBalance || 0) - amount;
        
        await db.update(schema.users).set({ walletBalance: newBalance }).where(eq(schema.users.id, numericId));
        return res.json({ success: true, result: true });
      }
      
      case "getZonesFromDB": {
        const rawZones = await db.select().from(schema.zones);
        const result = rawZones.map((z: any) => {
          let prices = {};
          if (z.pricesJson) {
            try {
              prices = typeof z.pricesJson === 'string' ? JSON.parse(z.pricesJson) : z.pricesJson;
            } catch (e: any) {
              console.error("Failed to parse pricesJson for zone", z.id);
            }
          }
          return {
            ...z,
            prices
          };
        });
        return res.json({ success: true, result });
      }
      
      case "createZoneInDB": {
        if (!userRole || !["manager", "employee"].includes(userRole)) return res.status(403).json({ success: false, message: "Admin only" });
        const [zone] = args;
        await db.insert(schema.zones).values({
          id: zone.id,
          name: zone.name,
          price: zone.price || 15,
          pricesJson: JSON.stringify(zone.prices || {}),
          nameAr: zone.nameAr || zone.name,
          nameEn: zone.nameEn || zone.id,
          governorateCode: zone.governorateCode,
          status: zone.status || 'inactive',
          centerLat: zone.centerLat ? Number(zone.centerLat) : null,
          centerLng: zone.centerLng ? Number(zone.centerLng) : null,
          radiusKm: zone.radiusKm ? Number(zone.radiusKm) : null,
          polygonGeojson: zone.polygonGeojson,
          monthlyOrderLimit: zone.monthlyOrderLimit ? Number(zone.monthlyOrderLimit) : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return res.json({ success: true, result: true });
      }
      
      case "updateZoneInDB": {
        if (!userRole || !["manager", "employee"].includes(userRole)) return res.status(403).json({ success: false, message: "Admin only" });
        const [zone] = args;
        await db.update(schema.zones).set({
          name: zone.name,
          price: zone.price || 15,
          pricesJson: JSON.stringify(zone.prices || {}),
          nameAr: zone.nameAr,
          nameEn: zone.nameEn,
          governorateCode: zone.governorateCode,
          status: zone.status,
          centerLat: zone.centerLat ? Number(zone.centerLat) : null,
          centerLng: zone.centerLng ? Number(zone.centerLng) : null,
          radiusKm: zone.radiusKm ? Number(zone.radiusKm) : null,
          polygonGeojson: zone.polygonGeojson,
          monthlyOrderLimit: zone.monthlyOrderLimit ? Number(zone.monthlyOrderLimit) : null,
          updatedAt: new Date().toISOString()
        }).where(eq(schema.zones.id, zone.id));
        return res.json({ success: true, result: true });
      }
      
      case "deleteZoneInDB": {
        if (!userRole || !["manager", "employee"].includes(userRole)) return res.status(403).json({ success: false, message: "Admin only" });
        const [zoneId] = args;
        const associatedUsers = await db.select().from(schema.users).where(eq(schema.users.zoneId, zoneId));
        const associatedOrders = await db.select().from(schema.orders).where(eq(schema.orders.zoneId, zoneId));
        
        if (associatedUsers.length > 0 || associatedOrders.length > 0) {
          await db.update(schema.zones).set({ 
            status: 'inactive', 
            updatedAt: new Date().toISOString() 
          }).where(eq(schema.zones.id, zoneId));
        } else {
          await db.delete(schema.zones).where(eq(schema.zones.id, zoneId));
        }
        return res.json({ success: true, result: true });
      }

      case "getZoneWaitlistFromDB": {
        if (!userRole || !["manager", "employee"].includes(userRole)) return res.status(403).json({ success: false, message: "Admin only" });
        const waitlist = await db.select().from(schema.zoneWaitlist);
        return res.json({ success: true, result: waitlist });
      }
      
      case "addUserAddressInDB": {
        const [targetId, newAddress, currentAddresses] = args;
        const numericId = Number(targetId);
        if (userId !== numericId && userRole !== "manager" && userRole !== "employee") {
          return res.status(403).json({ success: false, message: "Not allowed" });
        }

        const addrZoneId = newAddress.zoneId;
        if (addrZoneId) {
          const zObj = await db.select().from(schema.zones).where(eq(schema.zones.id, addrZoneId));
          if (zObj.length === 0) {
            return res.status(400).json({ success: false, message: "Selected zone does not exist" });
          }
          if (zObj[0].status !== 'active') {
            return res.status(400).json({ success: false, message: "Selected zone is currently inactive or coming soon" });
          }
        }

        const updated = [...currentAddresses, newAddress];
        await db.update(schema.users).set({
          savedAddressesJson: JSON.stringify(updated)
        }).where(eq(schema.users.id, numericId));
        return res.json({ success: true, result: true });
      }
      
      case "cancelOrderInDB": {
        const [orderId, timeline] = args;
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
        if (foundOrder.length === 0) return res.json({ success: true, result: false });
        const order = foundOrder[0];
        
        const isCustomer = userRole === "customer" && order.customerId === String(userId);
        const isDriver = userRole === "agent" && order.driverId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        
        if (!isCustomer && !isDriver && !isStaff) {
          return res.status(403).json({ success: false, message: "You are not allowed to cancel this order" });
        }
        
        const up: any = { status: 'CANCELLED', cancellationRequestJson: null };
        if (timeline) {
          up.timelineJson = JSON.stringify(timeline);
        }
        
        await db.update(schema.orders).set(up).where(eq(schema.orders.id, orderId));
        return res.json({ success: true, result: true });
      }
      
      case "notifyDriverOfTrackingInDB": {
        const [orderId, isTracking] = args;
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
        if (foundOrder.length === 0) return res.json({ success: true, result: false });
        const order = foundOrder[0];
        
        const isCustomer = userRole === "customer" && order.customerId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        
        if (!isCustomer && !isStaff) {
          return res.status(403).json({ success: false, message: "You are not allowed to update tracking for this order" });
        }
        
        await db.update(schema.orders).set({ isTracking: !!isTracking }).where(eq(schema.orders.id, orderId));
        return res.json({ success: true, result: true });
      }
      
      case "createOrderInDB": {
        const [order] = args;
        if (userRole === "customer" && order.customerId !== String(userId)) {
          return res.status(403).json({ success: false, message: "You are not allowed to create an order for another customer" });
        }

        const orderZoneId = order.zoneId || order.deliveryAddress?.zoneId;
        if (orderZoneId) {
          const zObj = await db.select().from(schema.zones).where(eq(schema.zones.id, orderZoneId));
          if (zObj.length === 0) {
            return res.status(400).json({ success: false, message: "Selected zone does not exist" });
          }
          if (zObj[0].status !== 'active') {
            return res.status(400).json({ success: false, message: "Selected zone is currently inactive or coming soon" });
          }
        }
        
        await db.insert(schema.orders).values({
          id: order.id,
          type: order.type,
          status: order.status,
          customerId: String(order.customerId),
          driverId: order.driverId || null,
          storeId: order.storeId || null,
          pickupAddress: order.pickupAddress,
          deliveryAddressJson: JSON.stringify(order.deliveryAddress),
          items: order.items,
          price: order.price,
          itemCost: order.itemCost || 0,
          payer: order.payer || null,
          recipientPhone: order.recipientPhone || null,
          timelineJson: JSON.stringify(order.timeline || []),
          issuesJson: JSON.stringify(order.issues || []),
          createdAt: order.createdAt,
          deliveryCode: order.deliveryCode || null,
          notes: order.notes || null,
          assignedDriversJson: JSON.stringify(order.assignedDriverIds || []),
          isTracking: !!order.isTracking
        });
        return res.json({ success: true, result: true });
      }
      
      case "getPaginatedOrdersFromDB": {
        if (!["manager", "employee", "observer"].includes(userRole!)) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
        const [pageParam, limitParam, startDateParam, endDateParam, searchTerm] = args;
        const page = pageParam ? Number(pageParam) : 1;
        const limit = limitParam ? Number(limitParam) : 20;
        const offset = (page - 1) * limit;

        let conditions = [];
        if (startDateParam) conditions.push(gte(schema.orders.createdAt, Number(startDateParam)));
        if (endDateParam) conditions.push(lte(schema.orders.createdAt, Number(endDateParam)));

        if (searchTerm && searchTerm.trim() !== '') {
          const term = `%${searchTerm.toLowerCase().trim()}%`;
          let searchConditions = [
            like(sql`lower(${schema.orders.id})`, term),
            like(sql`lower(${schema.orders.items})`, term),
            like(sql`lower(${schema.orders.notes})`, term),
            like(sql`lower(${schema.orders.pickupAddress})`, term),
            like(sql`lower(${schema.orders.recipientPhone})`, term),
            like(sql`lower(${schema.orders.deliveryAddressJson})`, term)
          ];

          const matchedUsers = await db.select({ id: schema.users.id })
            .from(schema.users)
            .where(or(
              like(sql`lower(${schema.users.name})`, term),
              like(schema.users.phone, term)
            ));
          const matchingUserIds = matchedUsers.map((u: any) => String(u.id));
          if (matchingUserIds.length > 0) {
            searchConditions.push(inArray(schema.orders.customerId, matchingUserIds));
            searchConditions.push(inArray(schema.orders.driverId, matchingUserIds));
          }
          conditions.push(or(...searchConditions));
        }

        const result = await db.select().from(schema.orders)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(schema.orders.createdAt))
          .limit(limit).offset(offset);
        return res.json({ success: true, result });
      }

      case "getOrdersCountFromDB": {
        if (!["manager", "employee", "observer"].includes(userRole!)) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
        const [startDateParam, endDateParam, searchTerm] = args;
        let conditions = [];
        if (startDateParam) conditions.push(gte(schema.orders.createdAt, Number(startDateParam)));
        if (endDateParam) conditions.push(lte(schema.orders.createdAt, Number(endDateParam)));

        if (searchTerm && searchTerm.trim() !== '') {
          const term = `%${searchTerm.toLowerCase().trim()}%`;
          let searchConditions = [
            like(sql`lower(${schema.orders.id})`, term),
            like(sql`lower(${schema.orders.items})`, term),
            like(sql`lower(${schema.orders.notes})`, term),
            like(sql`lower(${schema.orders.pickupAddress})`, term),
            like(sql`lower(${schema.orders.recipientPhone})`, term),
            like(sql`lower(${schema.orders.deliveryAddressJson})`, term)
          ];

          const matchedUsers = await db.select({ id: schema.users.id })
            .from(schema.users)
            .where(or(
              like(sql`lower(${schema.users.name})`, term),
              like(schema.users.phone, term)
            ));
          const matchingUserIds = matchedUsers.map((u: any) => String(u.id));
          if (matchingUserIds.length > 0) {
            searchConditions.push(inArray(schema.orders.customerId, matchingUserIds));
            searchConditions.push(inArray(schema.orders.driverId, matchingUserIds));
          }
          conditions.push(or(...searchConditions));
        }

        const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.orders)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
        return res.json({ success: true, result: result.count });
      }

      case "getPaginatedDriversFromDB": {
        if (!["manager", "employee", "observer"].includes(userRole!)) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
        const [pageParam, limitParam] = args;
        const page = pageParam ? Number(pageParam) : 1;
        const limit = limitParam ? Number(limitParam) : 20;
        const offset = (page - 1) * limit;

        const result = await db.select().from(schema.users)
          .where(or(eq(schema.users.role, 'agent'), eq(schema.users.role, 'driver')))
          .orderBy(desc(schema.users.id))
          .limit(limit).offset(offset);
        const cleanResult = result.map(({ password, ...u }: any) => {
          let returnedRole = u.role;
          if (u.role === 'manager' || u.role === 'admin') returnedRole = 'ADMIN';
          if (u.role === 'agent' || u.role === 'driver') returnedRole = 'DRIVER';
          if (u.role === 'employee') returnedRole = 'EMPLOYEE';
          if (u.role === 'customer') returnedRole = 'CUSTOMER';
          if (u.role === 'observer') returnedRole = 'OBSERVER';
          return { ...u, role: returnedRole };
        });
        return res.json({ success: true, result: cleanResult });
      }

      case "getDriversCountFromDB": {
        if (!["manager", "employee", "observer"].includes(userRole!)) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
        const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.users)
          .where(or(eq(schema.users.role, 'agent'), eq(schema.users.role, 'driver')));
        return res.json({ success: true, result: result.count });
      }

      case "getAllOrdersFromDB": {
        const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
        let ordersList;
        
        if (userRole === "customer") {
          ordersList = await db.select().from(schema.orders)
            .where(and(
              eq(schema.orders.customerId, String(userId)),
              or(
                not(inArray(schema.orders.status, ['DELIVERED', 'CANCELLED', 'RETURNED'])),
                gt(schema.orders.createdAt, fifteenDaysAgo)
              )
            ))
            .orderBy(desc(schema.orders.createdAt))
            .limit(500);
        } else if (userRole === "agent") {
          ordersList = await db.select().from(schema.orders)
            .where(or(
              eq(schema.orders.driverId, String(userId)),
              eq(schema.orders.status, 'PENDING')
            ))
            .orderBy(desc(schema.orders.createdAt))
            .limit(500);
        } else {
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          ordersList = await db.select().from(schema.orders)
            .where(or(
              not(inArray(schema.orders.status, ['DELIVERED', 'CANCELLED', 'RETURNED'])),
              gt(schema.orders.createdAt, oneDayAgo)
            ))
            .orderBy(desc(schema.orders.createdAt))
            .limit(100);
        }
        
        return res.json({ success: true, result: ordersList });
      }
      
      case "tryAcceptOrderInDB": {
        const [orderId, dId, timeline] = args;
        if (userRole !== "agent" || String(userId) !== String(dId)) {
          return res.status(403).json({ success: false, message: "Not allowed" });
        }
        
        const activeOrders = await db.select().from(schema.orders)
          .where(and(
            eq(schema.orders.driverId, String(userId)),
            not(inArray(schema.orders.status, ['DELIVERED', 'CANCELLED', 'RETURNED']))
          ));
          
        if (activeOrders.length >= 4) {
          return res.json({ success: true, result: false });
        }
        
        const result = await db.update(schema.orders)
          .set({
            status: 'ACCEPTED',
            driverId: String(userId),
            timelineJson: JSON.stringify(timeline)
          })
          .where(and(
            eq(schema.orders.id, orderId),
            eq(schema.orders.status, 'PENDING')
          ));
          
        return res.json({ success: true, result: result.rowsAffected > 0 });
      }
      
      case "updateOrderStatusInDB": {
        const [orderId, status, timeline, dId, proofImageUrl, delayReason, requestingDriverId] = args;
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
        if (foundOrder.length === 0) return res.json({ success: true, result: false });
        const order = foundOrder[0];
        
        const isDriver = userRole === "agent" && order.driverId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        
        if (!isDriver && !isStaff) {
          return res.status(403).json({ success: false, message: "You are not allowed to update status for this order" });
        }
        
        const up: any = { status, timelineJson: JSON.stringify(timeline) };
        if (dId) up.driverId = dId;
        if (proofImageUrl) up.proofImageUrl = proofImageUrl;
        if (delayReason) up.delayReason = delayReason;
        
        const result = await db.update(schema.orders).set(up).where(eq(schema.orders.id, orderId));
        if (result.rowsAffected === 0) {
          return res.json({ success: true, result: false });
        }
        
        if (status === 'DELIVERED') {
          const acceptedEvent = timeline.find((e: any) => e.status === 'ACCEPTED');
          const acceptedTime = acceptedEvent ? acceptedEvent.timestamp : undefined;
          const rawTimeTaken = acceptedTime ? (Date.now() - acceptedTime) / (60 * 1000) : (Date.now() - (timeline[0]?.timestamp || Date.now())) / (60 * 1000);
          const timeTaken = Math.max(5, Math.min(60, rawTimeTaken));
          
          await db.update(schema.orders).set({ timeTakenMinutes: timeTaken }).where(eq(schema.orders.id, orderId));
          
          const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
          if (foundOrder.length > 0 && foundOrder[0].driverId) {
            const assignedDriverId = Number(foundOrder[0].driverId);
            const dr = await db.select().from(schema.users).where(eq(schema.users.id, assignedDriverId));
            if (dr.length > 0) {
              const completedCount = (dr[0].completedOrdersCount || 0) + 1;
              const currentAvg = dr[0].avgDeliveryTime;
              const newAvg = currentAvg === null ? timeTaken : (currentAvg * (dr[0].completedOrdersCount || 0) + timeTaken) / completedCount;
              
              await db.update(schema.users)
                .set({
                  completedOrdersCount: completedCount,
                  avgDeliveryTime: newAvg
                })
                .where(eq(schema.users.id, assignedDriverId));
            }
          }
        }
        
        return res.json({ success: true, result: true });
      }
      
      case "rejectCancellationInDB": {
        if (userRole !== "manager" && userRole !== "employee") {
          return res.status(403).json({ success: false, message: "Not allowed" });
        }
        const [orderId, timeline] = args;
        const up: any = { cancellationRequestJson: null };
        if (timeline) {
          up.timelineJson = JSON.stringify(timeline);
        }
        await db.update(schema.orders).set(up).where(eq(schema.orders.id, orderId));
        return res.json({ success: true, result: true });
      }
      
      case "requestCancellationInDB": {
        const [orderId, requesterId, reason, timeline] = args;
        if (String(requesterId) !== String(userId)) {
          return res.status(403).json({ success: false, message: "Unauthorized to request cancellation as another user" });
        }
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
        if (foundOrder.length === 0) return res.json({ success: true, result: false });
        const order = foundOrder[0];
        
        const isCustomer = userRole === "customer" && order.customerId === String(userId);
        const isDriver = userRole === "agent" && order.driverId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        
        if (!isCustomer && !isDriver && !isStaff) {
          return res.status(403).json({ success: false, message: "Unauthorized to cancel this order" });
        }
        
        const up: any = {
          cancellationRequestJson: JSON.stringify({ requesterId, reason, timestamp: Date.now() })
        };
        if (timeline) {
          up.timelineJson = JSON.stringify(timeline);
        }
        await db.update(schema.orders).set(up).where(eq(schema.orders.id, orderId));
        return res.json({ success: true, result: true });
      }
      
      case "updateUserLocationInDB": {
        const [uId, lat, lng, lastMovedAt, lastSeenAt] = args;
        if (String(userId) !== String(uId)) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        const up: any = { currentLat: lat, currentLng: lng };
        if (lastMovedAt) up.lastMovedAt = lastMovedAt;
        if (lastSeenAt) up.lastSeenAt = lastSeenAt;
        
        await db.update(schema.users).set(up).where(eq(schema.users.id, Number(uId)));
        return res.json({ success: true, result: true });
      }
      
      case "updateUserStatusInDB": {
        const [uId, isOnline] = args;
        if (String(userId) !== String(uId)) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        await db.update(schema.users).set({ isOnline: !!isOnline }).where(eq(schema.users.id, Number(uId)));
        return res.json({ success: true, result: true });
      }
      
      case "submitOrderRatingInDB": {
        const [orderId, rating, comment] = args;
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
        if (foundOrder.length === 0) return res.json({ success: true, result: false });
        const order = foundOrder[0];
        
        const isCustomer = userRole === "customer" && order.customerId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        
        if (!isCustomer && !isStaff) {
          return res.status(403).json({ success: false, message: "You are not allowed to rate this order" });
        }
        
        await db.update(schema.orders)
          .set({ rating, ratingComment: comment || null })
          .where(eq(schema.orders.id, orderId));
        return res.json({ success: true, result: true });
      }
      
      case "updateLocationPulseForAdminInDB": {
        if (userRole !== "manager" && userRole !== "employee") {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        const [adminId] = args;
        const found = await db.select().from(schema.users).where(eq(schema.users.id, Number(adminId)));
        if (found.length > 0) {
          const pulse = (found[0].locationPulse || 0) + 1;
          await db.update(schema.users).set({ locationPulse: pulse }).where(eq(schema.users.id, Number(adminId)));
        }
        return res.json({ success: true, result: true });
      }
      
      case "sendMessageInDB": {
        const [msg] = args;
        if (String(msg.senderId) !== String(userId)) {
          return res.status(403).json({ success: false, message: "You are not allowed to send messages as another user" });
        }
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, msg.orderId));
        if (foundOrder.length === 0) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }
        const order = foundOrder[0];
        const isCustomer = userRole === "customer" && order.customerId === String(userId);
        const isDriver = userRole === "agent" && order.driverId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        if (!isCustomer && !isDriver && !isStaff) {
          return res.status(403).json({ success: false, message: "You are not allowed to send messages for this order" });
        }
        
        await db.insert(schema.messages).values({
          id: msg.id,
          orderId: msg.orderId,
          senderId: String(msg.senderId),
          senderName: msg.senderName,
          text: msg.text,
          audio: msg.audio || null,
          image: msg.image || null,
          createdAt: msg.timestamp,
          isRead: false
        });
        return res.json({ success: true, result: true });
      }
      
      case "getMessagesFromDB": {
        const [orderId] = args;
        const foundOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
        if (foundOrder.length === 0) return res.json({ success: true, result: [] });
        const order = foundOrder[0];
        
        const isCustomer = userRole === "customer" && order.customerId === String(userId);
        const isDriver = userRole === "agent" && order.driverId === String(userId);
        const isStaff = ["manager", "employee"].includes(userRole!);
        if (!isCustomer && !isDriver && !isStaff) {
          return res.status(403).json({ success: false, message: "You are not allowed to read messages for this order" });
        }
        
        const list = await db.select().from(schema.messages)
          .where(eq(schema.messages.orderId, orderId))
          .orderBy(schema.messages.createdAt);
        return res.json({ success: true, result: list });
      }
      
      case "getRecentMessagesFromDB": {
        const [since] = args;
        let list: any[] = [];
        if (userRole === "manager" || userRole === "employee") {
          list = await db.select().from(schema.messages)
            .where(gt(schema.messages.createdAt, since))
            .orderBy(schema.messages.createdAt);
        } else if (userRole === "customer") {
          // Get order IDs for this customer
          const myOrders = await db.select({ id: schema.orders.id }).from(schema.orders)
            .where(eq(schema.orders.customerId, String(userId)));
          const myOrderIds = myOrders.map((o: any) => o.id);
          if (myOrderIds.length > 0) {
            list = await db.select().from(schema.messages)
              .where(and(
                gt(schema.messages.createdAt, since),
                inArray(schema.messages.orderId, myOrderIds)
              ))
              .orderBy(schema.messages.createdAt);
          }
        } else if (userRole === "agent") {
          // Get order IDs for this agent
          const myOrders = await db.select({ id: schema.orders.id }).from(schema.orders)
            .where(eq(schema.orders.driverId, String(userId)));
          const myOrderIds = myOrders.map((o: any) => o.id);
          if (myOrderIds.length > 0) {
            list = await db.select().from(schema.messages)
              .where(and(
                gt(schema.messages.createdAt, since),
                inArray(schema.messages.orderId, myOrderIds)
              ))
              .orderBy(schema.messages.createdAt);
          }
        }
        return res.json({ success: true, result: list });
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown method ${method}` });
    }
  } catch (e: any) {
    console.error("RPC execution error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred during processing" });
  }
});

async function startServer() {
  console.log("🛠️ Starting database initialization & bootstrap...");
  try {
    initDbIfNeeded();

    // Enable WAL (Write-Ahead Logging) and set synchrony to NORMAL for local databases
    const targetUrl = process.env.TURSO_DB_URL || "file:local.db";
    if (targetUrl.startsWith("file:") || !process.env.TURSO_DB_URL) {
      try {
        await dbClient.execute("PRAGMA journal_mode = WAL;");
        await dbClient.execute("PRAGMA synchronous = NORMAL;");
        const journalMode = await dbClient.execute("PRAGMA journal_mode;");
        console.log(`ℹ️ SQLite Local DB Journal Mode configured: ${journalMode.rows?.[0]?.[0] || 'WAL'}`);
      } catch (pragmaErr: any) {
        console.warn("⚠️ Warning: Could not apply SQLite PRAGMA tuning:", pragmaErr.message);
      }
    } else {
      console.log("ℹ️ Remote LibSQL database detected (WAL and transaction logging is managed server-side by Turso).");
    }
    
    // Create tables if they do not exist
    try {
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          wallet_balance REAL DEFAULT 0,
          cash_collected REAL DEFAULT 0,
          cash_limit REAL DEFAULT 2000,
          is_online INTEGER DEFAULT 0,
          is_blocked INTEGER DEFAULT 0,
          address_details TEXT,
          zone_id TEXT,
          current_lat REAL,
          current_lng REAL,
          saved_addresses_json TEXT,
          settlement_requested INTEGER DEFAULT 0,
          last_moved_at INTEGER,
          last_seen_at INTEGER,
          avg_delivery_time REAL,
          completed_orders_count INTEGER DEFAULT 0,
          total_distance REAL DEFAULT 0,
          location_pulse INTEGER DEFAULT 0,
          firebase_uid TEXT UNIQUE,
          email TEXT
        )
      `);
      console.log("✅ Users table ensured.");
    } catch (e: any) {
      console.error("❌ Failed to create users table:", e.message || e);
    }

    try {
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS zones (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          prices_json TEXT
        )
      `);
      console.log("✅ Zones table ensured.");
    } catch (e: any) {
      console.error("❌ Failed to create zones table:", e.message || e);
    }

    try {
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          driver_id TEXT,
          store_id TEXT,
          pickup_address TEXT,
          delivery_address_json TEXT,
          items TEXT,
          price REAL,
          item_cost REAL DEFAULT 0,
          payer TEXT,
          recipient_phone TEXT,
          timeline_json TEXT,
          issues_json TEXT,
          created_at INTEGER,
          is_tracking INTEGER DEFAULT 0,
          delivery_code TEXT,
          notes TEXT,
          allow_double_order INTEGER DEFAULT 1,
          cancellation_request_json TEXT,
          assigned_drivers_json TEXT,
          is_batched INTEGER DEFAULT 0,
          batch_id TEXT,
          proof_image_url TEXT,
          delay_reason TEXT,
          bids_json TEXT,
          rating INTEGER,
          rating_comment TEXT,
          time_taken_minutes REAL
        )
      `);
      console.log("✅ Orders table ensured.");
    } catch (e: any) {
      console.error("❌ Failed to create orders table:", e.message || e);
    }

    try {
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          text TEXT NOT NULL,
          audio TEXT,
          image TEXT,
          created_at INTEGER,
          is_read INTEGER DEFAULT 0
        )
      `);
      console.log("✅ Messages table ensured.");
    } catch (e: any) {
      console.error("❌ Failed to create messages table:", e.message || e);
    }

    try {
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          type TEXT,
          related_id TEXT,
          is_read INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        )
      `);
      console.log("✅ Notifications table ensured.");
    } catch (e: any) {
      console.error("❌ Failed to create notifications table:", e.message || e);
    }

    try {
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS zone_waitlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          zone_id TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          name TEXT,
          created_at INTEGER NOT NULL
        )
      `);
      console.log("✅ Zone waitlist table ensured.");
    } catch (e: any) {
      console.error("❌ Failed to create zone_waitlist table:", e.message || e);
    }

    // Run migrations for any newly introduced columns
    try { await dbClient.execute("ALTER TABLE users ADD COLUMN firebase_uid TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE users ADD COLUMN email TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE users ADD COLUMN fcm_token TEXT"); } catch (e: any) {}
    try { await dbClient.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)"); } catch (e: any) {}

    // Apply database indexes for performance optimization
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS phone_idx ON users(phone)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS users_zone_id_idx ON users(zone_id)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS status_idx ON orders(status)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS driver_id_idx ON orders(driver_id)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS customer_id_idx ON orders(customer_id)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS orders_zone_id_idx ON orders(zone_id)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS messages_order_id_idx ON messages(order_id)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id)"); } catch (e: any) {}
    try { await dbClient.execute("CREATE INDEX IF NOT EXISTS zone_waitlist_zone_id_idx ON zone_waitlist(zone_id)"); } catch (e: any) {}

    // Coverage Zone Management System column migrations
    try { await dbClient.execute("ALTER TABLE orders ADD COLUMN zone_id TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN name_ar TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN name_en TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN governorate_code TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN status TEXT DEFAULT 'inactive'"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN center_lat REAL"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN center_lng REAL"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN radius_km REAL"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN polygon_geojson TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN monthly_order_limit INTEGER"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN created_at TEXT"); } catch (e: any) {}
    try { await dbClient.execute("ALTER TABLE zones ADD COLUMN updated_at TEXT"); } catch (e: any) {}
    try { await dbClient.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_zones_governorate_code ON zones(governorate_code)"); } catch (e: any) {}
    try { await dbClient.execute("UPDATE zones SET status = 'active' WHERE id LIKE 'gov-%'"); } catch (e: any) {}

    // Seed default zones if empty or missing (e.g. newly added governorate zones)
    try {
      console.log("🌱 Checking and seeding INITIAL_ZONES...");
      const existingZones = await db.select().from(schema.zones);
      const existingIds = new Set(existingZones.map((z: any) => z.id));

      const GOV_INFO: Record<string, { code: string, en: string, lat: number, lng: number, radius: number }> = {
        'gov-cairo': { code: 'CAI', en: 'Cairo', lat: 30.0444, lng: 31.2357, radius: 40 },
        'gov-giza': { code: 'GIZ', en: 'Giza', lat: 30.0131, lng: 31.2089, radius: 35 },
        'gov-alex': { code: 'ALX', en: 'Alexandria', lat: 31.2001, lng: 29.9187, radius: 30 },
        'gov-dakahlia': { code: 'DKH', en: 'Dakahlia', lat: 31.0413, lng: 31.3785, radius: 50 },
        'gov-redsea': { code: 'RED', en: 'Red Sea', lat: 27.2579, lng: 33.8116, radius: 100 },
        'gov-beheira': { code: 'BEH', en: 'Beheira', lat: 31.0361, lng: 30.4161, radius: 60 },
        'gov-fayoum': { code: 'FAY', en: 'Fayoum', lat: 29.3084, lng: 30.8428, radius: 30 },
        'gov-gharbia': { code: 'GHA', en: 'Gharbia', lat: 30.7865, lng: 30.9999, radius: 25 },
        'gov-ismailia': { code: 'ISM', en: 'Ismailia', lat: 30.6043, lng: 32.2723, radius: 25 },
        'gov-monufia': { code: 'MNF', en: 'Monufia', lat: 30.5242, lng: 30.9919, radius: 30 },
        'gov-minya': { code: 'MIN', en: 'Minya', lat: 28.0991, lng: 30.7562, radius: 50 },
        'gov-qalyubia': { code: 'QLY', en: 'Qalyubia', lat: 30.4101, lng: 31.1856, radius: 30 },
        'gov-newvalley': { code: 'WAD', en: 'New Valley', lat: 25.4514, lng: 30.5487, radius: 150 },
        'gov-suez': { code: 'SUZ', en: 'Suez', lat: 29.9668, lng: 32.5498, radius: 25 },
        'gov-aswan': { code: 'ASW', en: 'Aswan', lat: 24.0889, lng: 32.8998, radius: 40 },
        'gov-asyut': { code: 'AST', en: 'Asyut', lat: 27.1783, lng: 31.1859, radius: 45 },
        'gov-benisuef': { code: 'BNS', en: 'Beni Suef', lat: 29.0744, lng: 31.0978, radius: 30 },
        'gov-portsaid': { code: 'PSD', en: 'Port Said', lat: 31.2565, lng: 32.2841, radius: 20 },
        'gov-damietta': { code: 'DAM', en: 'Damietta', lat: 31.4175, lng: 31.8144, radius: 25 },
        'gov-sharqia': { code: 'SHR', en: 'Sharqia', lat: 30.7327, lng: 31.7136, radius: 45 },
        'gov-southsinai': { code: 'SIN', en: 'South Sinai', lat: 28.5383, lng: 33.8301, radius: 80 },
        'gov-kafralsheikh': { code: 'KFR', en: 'Kafr El-Sheikh', lat: 31.1107, lng: 30.9388, radius: 35 },
        'gov-matrouh': { code: 'MTR', en: 'Matrouh', lat: 31.3543, lng: 27.2373, radius: 80 },
        'gov-qena': { code: 'QEN', en: 'Qena', lat: 26.1551, lng: 32.7160, radius: 40 },
        'gov-northsinai': { code: 'NSN', en: 'North Sinai', lat: 30.8025, lng: 33.7997, radius: 70 },
        'gov-sohag': { code: 'SOH', en: 'Sohag', lat: 26.5591, lng: 31.6957, radius: 45 },
        'gov-luxor': { code: 'LUX', en: 'Luxor', lat: 25.6872, lng: 32.6396, radius: 25 },
        'gov-abu-homos': { code: 'ABH', en: 'Abu Homos', lat: 31.0116, lng: 30.3129, radius: 20 }
      };

      let seededCount = 0;
      let updatedCount = 0;
      for (const zone of INITIAL_ZONES) {
        const isGov = zone.id.startsWith('gov-');
        const nameAr = zone.name;
        const nameEn = GOV_INFO[zone.id]?.en || zone.id;
        const govCode = GOV_INFO[zone.id]?.code || null;
        // By default, all initial zones and governorates are active
        const status = 'active';
        const centerLat = GOV_INFO[zone.id]?.lat || 31.0361;
        const centerLng = GOV_INFO[zone.id]?.lng || 30.4161;
        const radiusKm = GOV_INFO[zone.id]?.radius || (isGov ? 50.0 : 5.0);

        if (!existingIds.has(zone.id)) {
          await db.insert(schema.zones).values({
            id: zone.id,
            name: zone.name,
            price: zone.price,
            pricesJson: JSON.stringify(zone.prices),
            nameAr,
            nameEn,
            governorateCode: govCode,
            status,
            centerLat,
            centerLng,
            radiusKm,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          seededCount++;
        } else {
          // Backfill missing info for existing zones
          const existing = existingZones.find((z: any) => z.id === zone.id);
          if (existing && (!existing.nameAr || !existing.status)) {
            await db.update(schema.zones).set({
              nameAr: existing.nameAr || nameAr,
              nameEn: existing.nameEn || nameEn,
              governorateCode: existing.governorateCode || govCode,
              status: existing.status || status,
              centerLat: existing.centerLat || centerLat,
              centerLng: existing.centerLng || centerLng,
              radiusKm: existing.radiusKm || radiusKm,
              updatedAt: new Date().toISOString()
            }).where(eq(schema.zones.id, zone.id));
            updatedCount++;
          }
        }
      }
      if (seededCount > 0 || updatedCount > 0) {
        console.log(`🌱 Successfully seeded ${seededCount} new zones and backfilled ${updatedCount} existing zones.`);
      } else {
        console.log("🌱 All initial zones are already present and fully backfilled.");
      }
    } catch (e: any) {
      console.error("❌ Failed to seed zones:", e.message || e);
    }

    // Seed default demo users if missing
    try {
      console.log("🌱 Checking default demo users existence...");
      const demoUsers = [
        { name: "General Manager", phone: "00000000000", password: "5276", role: "manager", zoneId: "zone-1" },
        { name: "Responsible Employee", phone: "02222222222", password: "1234", role: "employee", zoneId: "zone-1" },
        { name: "Test Agent", phone: "01111111111", password: "1234", role: "agent", zoneId: "zone-1" },
        { name: "Test Customer", phone: "01222222222", password: "1234", role: "customer", zoneId: "zone-1" },
      ];

      for (const du of demoUsers) {
        const existing = await db.select().from(schema.users).where(eq(schema.users.phone, du.phone));
        if (existing.length === 0) {
          const hashedPw = await argon2.hash(du.password);
          await db.insert(schema.users).values({
            name: du.name,
            phone: du.phone,
            password: hashedPw,
            role: du.role,
            zoneId: du.zoneId,
            walletBalance: 0,
            cashCollected: 0,
            cashLimit: 2000,
            isOnline: false,
            isBlocked: false,
          });
          console.log(`🌱 Successfully seeded missing demo user: ${du.name} (${du.phone})`);
        } else {
          console.log(`🌱 Demo user ${du.name} (${du.phone}) already exists in the database.`);
        }
      }
    } catch (e: any) {
      console.error("❌ Failed to seed demo users:", e.message || e);
    }

  } catch (e: any) {
    console.warn("⚠️ Skipping database bootstrap:", e.message || e);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") { startServer(); }
