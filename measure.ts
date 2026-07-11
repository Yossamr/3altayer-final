import "dotenv/config";
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './db/schema.js';
import { desc } from 'drizzle-orm';

const dbUrl = process.env.TURSO_DB_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_DB_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});
const db = drizzle(client, { schema });

async function measure() {
  const startAll = Date.now();
  const allOrders = await db.select().from(schema.orders).limit(600);
  const timeAll = Date.now() - startAll;
  
  const startPaginated = Date.now();
  const paginatedOrders = await db.select().from(schema.orders).limit(20).offset(0);
  const timePaginated = Date.now() - startPaginated;

  console.log("600 Orders Response Size (KB):", (Buffer.byteLength(JSON.stringify(allOrders)) / 1024).toFixed(2));
  console.log("600 Orders Time (ms):", timeAll);

  console.log("20 Orders Response Size (KB):", (Buffer.byteLength(JSON.stringify(paginatedOrders)) / 1024).toFixed(2));
  console.log("20 Orders Time (ms):", timePaginated);
  
  process.exit(0);
}
measure();
