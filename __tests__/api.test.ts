// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, initializeDatabase } from '../server';

describe('API Routes', () => {
  beforeAll(async () => {
    // Ensures tables are created in test.db
    await initializeDatabase();
  });

  it('GET /api/zones should return a list of zones', async () => {
    const response = await request(app).get('/api/zones');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('result');
    expect(Array.isArray(response.body.result)).toBe(true);
  });

  it('POST /api/login with invalid data should return 401/400', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ phone: 'invalid', password: 'wrong' });
    // Since phone needs to be valid, it might be a 400 or 401
    expect([400, 401]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  it('POST /api/register with invalid data should fail', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({ name: 'T' }); // Incomplete data
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('POST /api/zone-waitlist should return success for valid data', async () => {
    // Testing waitlist endpoint which does not require auth
    const response = await request(app)
      .post('/api/zone-waitlist')
      .send({
        zoneId: 'gov-cairo',
        phone: '01234567890',
        name: 'Test Waitlist User'
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
