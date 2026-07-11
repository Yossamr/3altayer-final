import "dotenv/config";
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './db/schema.js';
import argon2 from 'argon2';

const dbUrl = process.env.TURSO_DB_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_DB_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});
const db = drizzle(client, { schema });

async function createDemoAccounts() {
  console.log("Creating/Updating Demo Accounts...");
  
  const accounts = [
    { role: 'manager', phone: '00000000000', password: '5276', name: 'Demo Admin' },
    { role: 'employee', phone: '02222222222', password: '1234', name: 'Demo Employee' },
    { role: 'agent', phone: '01111111111', password: '1234', name: 'Demo Driver' },
    { role: 'customer', phone: '01222222222', password: '1234', name: 'Demo Customer' }
  ];

  for (const acc of accounts) {
    const hashedPassword = await argon2.hash(acc.password);
    
    // Check if exists
    const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.phone, acc.phone)
    });

    if (existing) {
        console.log(`Updating existing ${acc.role} account (${acc.phone})...`);
        const { eq } = await import('drizzle-orm');
        await db.update(schema.users)
            .set({ password: hashedPassword, role: acc.role, name: acc.name })
            .where(eq(schema.users.id, existing.id));
    } else {
        console.log(`Creating new ${acc.role} account (${acc.phone})...`);
        await db.insert(schema.users).values({
            name: acc.name,
            phone: acc.phone,
            password: hashedPassword,
            role: acc.role,
            zoneId: 'z1' // Default zone
        });
    }
  }

  console.log("Demo Accounts Setup Complete!");
  process.exit(0);
}

createDemoAccounts().catch(e => {
  console.error(e);
  process.exit(1);
});
