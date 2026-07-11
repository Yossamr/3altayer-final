import "dotenv/config";
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './db/schema.js';
import argon2 from 'argon2';
import crypto from 'crypto';
import { INITIAL_ZONES } from './constants.js';
import { OrderType, OrderStatus } from './types';

const dbUrl = process.env.TURSO_DB_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_DB_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});
const db = drizzle(client, { schema });

async function seed() {
  console.log("Starting seed...");
  
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await argon2.hash(randomPassword);

  const zones = INITIAL_ZONES.map(z => z.id);
  const driverIds: number[] = [];
  
  console.log("Seeding 150 drivers...");
  for (let i = 0; i < 150; i++) {
    const statuses = ['available', 'busy', 'offline'];
    const status = statuses[i % 3];
    const zoneId = zones[i % zones.length];
    const isOnline = status === 'available' || status === 'busy';
    
    const [newUser] = await db.insert(schema.users).values({
      name: `Seeded Driver ${i}`,
      phone: `+20100${String(i).padStart(6, '0')}`,
      password: hashedPassword,
      role: 'driver',
      isOnline: isOnline,
      zoneId: zoneId,
      addressDetails: 'Cairo, Egypt',
    }).returning();
    driverIds.push(newUser.id);
  }

  console.log("Seeding 600 orders...");
  const orderStatuses = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PICKED_UP,
    OrderStatus.ON_THE_WAY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED
  ];
  const orderTypes = [
    OrderType.SHOPPING,
    OrderType.EMERGENCY,
    OrderType.PICK_DROP,
    OrderType.GOVERNORATE
  ];
  
  for (let i = 0; i < 600; i++) {
    const status = orderStatuses[i % orderStatuses.length];
    const type = orderTypes[i % orderTypes.length];
    const zoneId = zones[i % zones.length];
    
    let driverId: string | null = null;
    if ([OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED].includes(status)) {
       driverId = driverIds[i % driverIds.length].toString();
    }

    const [fakeCustomer] = await db.insert(schema.users).values({
      name: `Fake Customer ${i}`,
      phone: `+20111${String(i).padStart(6, '0')}`,
      password: hashedPassword,
      role: 'customer',
      zoneId: zoneId,
    }).returning();

    await db.insert(schema.orders).values({
      id: `order-seeded-${i}`,
      customerId: fakeCustomer.id.toString(),
      type: type,
      status: status,
      pickupAddress: 'Pickup ' + i,
      deliveryAddressJson: JSON.stringify({
        id: `addr-seeded-${i}`,
        title: 'Work',
        details: 'Dropoff ' + i,
        zoneId: zoneId
      }),
      driverId: driverId,
      price: 100 + (i % 50),
      itemCost: 20,
      items: JSON.stringify([{name: 'Item ' + i, quantity: 1, price: 100}]),
      timelineJson: JSON.stringify([]),
      createdAt: Date.now() - i * 1000 * 60,
      zoneId: zoneId
    });
  }
  
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
