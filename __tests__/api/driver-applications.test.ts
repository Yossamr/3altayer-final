import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    send: vi.fn().mockResolvedValue('mock-message-id'),
  })),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'mock-uid', phone_number: '+1234567890' }),
  })),
}));

const testDbClient = createClient({ url: "file:local.db" });
const testDb = drizzle(testDbClient, { schema });

describe('Driver Applications Action Endpoint', () => {
  beforeAll(async () => {
    // Delete tables if exists to avoid unique constraint issues
    await testDbClient.execute("DROP TABLE IF EXISTS users;");
    await testDbClient.execute("DROP TABLE IF EXISTS driver_applications;");

    // Create tables
    await testDbClient.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        wallet_balance INTEGER DEFAULT 0,
        cash_collected INTEGER DEFAULT 0,
        cash_limit INTEGER DEFAULT 2000,
        is_online INTEGER DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        address_details TEXT NOT NULL,
        zone_id INTEGER,
        current_lat REAL,
        current_lng REAL,
        saved_addresses_json TEXT,
        settlement_requested INTEGER DEFAULT 0,
        last_moved_at INTEGER,
        last_seen_at INTEGER,
        avg_delivery_time INTEGER,
        completed_orders_count INTEGER DEFAULT 0,
        total_distance REAL DEFAULT 0,
        location_pulse INTEGER,
        firebase_uid TEXT,
        email TEXT,
        fcm_token TEXT
      );
    `);
    await testDbClient.execute(`
      CREATE TABLE driver_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        id_card_front TEXT NOT NULL,
        id_card_back TEXT NOT NULL,
        license_image TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );
    `);
  });

  let phoneCounter = 1000000000;
  const setupAdminAgentAndApp = async () => {
    phoneCounter++;
    const adminPhone = phoneCounter.toString().padStart(11, '0');
    phoneCounter++;
    const testDriverPhone = phoneCounter.toString().padStart(11, '0');

    // Admin login token helper
    await testDb.insert(schema.users).values({
      name: 'Admin User',
      phone: adminPhone,
      password: await argon2.hash('adminpass'),
      role: 'ADMIN',
      addressDetails: 'Admin HQ',
      isOnline: false,
      isBlocked: false,
    });

    const adminUser = await testDb.select().from(schema.users).where(eq(schema.users.phone, adminPhone));
    const adminToken = adminUser[0].id.toString();

    // Insert an application
    const [insertedApp] = await testDb.insert(schema.driverApplications).values({
      name: 'Test Driver',
      phone: testDriverPhone,
      address: 'Test Address',
      vehicleType: 'motorcycle',
      idCardFront: 'base64_mock',
      idCardBack: 'base64_mock',
      status: 'pending',
      createdAt: Date.now(),
    }).returning();

    return { adminToken, appId: insertedApp.id, appPhone: insertedApp.phone };
  };

  it('should approve an application and create a user with the provided password', async () => {
    const { adminToken, appId, appPhone } = await setupAdminAgentAndApp();
    const testPassword = 'securepassword123';

    const adminUser2 = await testDb.select().from(schema.users).where(eq(schema.users.id, Number(adminToken)));
    const loginRes = await request(app).post('/api/login').send({
      phone: adminUser2[0].phone,
      password: 'adminpass'
    });
    const token = loginRes.body.token;

    const response = await request(app)
      .post(`/api/driver-applications/${appId}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve', password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const createdUser = await testDb.select().from(schema.users).where(eq(schema.users.phone, appPhone));
    expect(createdUser.length).toBe(1);

    const isPasswordCorrect = await argon2.verify(createdUser[0].password, testPassword);
    expect(isPasswordCorrect).toBe(true);

    const isOldHardcodedPassword = await argon2.verify(createdUser[0].password, '1234');
    expect(isOldHardcodedPassword).toBe(false);
  });

  it('should reject approval with missing or short password', async () => {
    const { appId, adminToken } = await setupAdminAgentAndApp();

    const adminUser2 = await testDb.select().from(schema.users).where(eq(schema.users.id, Number(adminToken)));
    const loginRes = await request(app).post('/api/login').send({
      phone: adminUser2[0].phone,
      password: 'adminpass'
    });
    const token = loginRes.body.token;

    const response1 = await request(app)
      .post(`/api/driver-applications/${appId}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(response1.status).toBe(400);

    const response2 = await request(app)
      .post(`/api/driver-applications/${appId}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve', password: '123' });

    expect(response2.status).toBe(400);
  });

  it('should reject if called by non-admin role', async () => {
    const { appId } = await setupAdminAgentAndApp();

    await testDb.insert(schema.users).values({
      name: 'Normal User',
      phone: '22222222222',
      password: await argon2.hash('userpass'),
      role: 'USER',
      addressDetails: 'User Home',
      isOnline: false,
      isBlocked: false,
    });

    const loginRes = await request(app).post('/api/login').send({
      phone: '22222222222',
      password: 'userpass'
    });
    const token = loginRes.body.token;

    const response = await request(app)
      .post(`/api/driver-applications/${appId}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve', password: 'validpassword' });

    expect(response.status).toBe(403);
  });

  it('should allow rejection without a password', async () => {
    const { appId, adminToken } = await setupAdminAgentAndApp();

    const adminUser2 = await testDb.select().from(schema.users).where(eq(schema.users.id, Number(adminToken)));
    const loginRes = await request(app).post('/api/login').send({
      phone: adminUser2[0].phone,
      password: 'adminpass'
    });
    const token = loginRes.body.token;

    const response = await request(app)
      .post(`/api/driver-applications/${appId}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject' });

    expect(response.status).toBe(200);

    const checkApp = await testDb.select().from(schema.driverApplications).where(eq(schema.driverApplications.id, appId));
    expect(checkApp[0].status).toBe('rejected');
  });
});
