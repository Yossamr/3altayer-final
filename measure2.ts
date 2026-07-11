import "dotenv/config";
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './db/schema.js';

const dbUrl = process.env.TURSO_DB_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_DB_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});
const db = drizzle(client, { schema });

async function measure() {
  const allUsers = await db.select({
    id: schema.users.id,
    name: schema.users.name,
    role: schema.users.role,
    phone: schema.users.phone,
    isOnline: schema.users.isOnline,
    currentLat: schema.users.currentLat,
    currentLng: schema.users.currentLng,
    lastSeenAt: schema.users.lastSeenAt,
    lastMovedAt: schema.users.lastMovedAt,
    firebaseUid: schema.users.firebaseUid,
    walletBalance: schema.users.walletBalance,
  }).from(schema.users);
  
  console.log("All Users (essential fields) Size (KB):", (Buffer.byteLength(JSON.stringify(allUsers)) / 1024).toFixed(2));
  process.exit(0);
}
measure();
