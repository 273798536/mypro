import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './setup';
import { getDatabase } from '../src/database';
import { UserRole } from '../src/types';

describe('Duplicate Submission and Bad Data Tests', () => {
  let app: any;

  beforeAll(async () => {
    await setupTestDatabase();
    const db = getDatabase();
    await db.init();
    app = (await import('../src/index')).default;
  });

  afterAll(async () => {
    const db = getDatabase();
    await teardownTestDatabase(db);
    jest.resetModules();
  });

  const materialId = 'MAT-TEST-002';

  it('should create initial material', async () => {
    const response = await request(app)
      .post('/api/materials')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        name: 'Test Material',
        platform: 'TikTok',
        originalName: 'test.mp4'
      });

    expect(response.status).toBe(201);
  });

  it('should reject duplicate material creation', async () => {
    const response = await request(app)
      .post('/api/materials')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        name: 'Duplicate Material',
        platform: 'TikTok',
        originalName: 'test.mp4'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already exists');
  });

  it('should reject cost import with invalid date format', async () => {
    const response = await request(app)
      .post('/api/costs')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        date: '2024/01/15',
        cost: 100,
        impressions: 1000,
        clicks: 50,
        source: 'test'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('date format');
  });

  it('should reject cost import with negative cost', async () => {
    const response = await request(app)
      .post('/api/costs')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        date: '2024-01-15',
        cost: -100,
        impressions: 1000,
        clicks: 50,
        source: 'test'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('non-negative number');
  });

  it('should reject cost import with clicks exceeding impressions', async () => {
    const response = await request(app)
      .post('/api/costs')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        date: '2024-01-16',
        cost: 100,
        impressions: 100,
        clicks: 500,
        source: 'test'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('cannot exceed impressions');
  });

  it('should record bad data in failed records', async () => {
    const response = await request(app)
      .get('/api/failed-records')
      .set('x-user-role', UserRole.MANAGER);

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThanOrEqual(3);
  });

  it('should return failed record stats', async () => {
    const response = await request(app)
      .get('/api/failed-records/stats')
      .set('x-user-role', UserRole.MANAGER);

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(response.body.byType)).toBe(true);
  });

  it('should handle bulk import with mixed valid and invalid data', async () => {
    const response = await request(app)
      .post('/api/costs/bulk')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send([
        {
          materialId,
          date: '2024-01-17',
          cost: 200,
          impressions: 5000,
          clicks: 100,
          source: 'bulk'
        },
        {
          materialId,
          date: 'invalid-date',
          cost: 150,
          impressions: 3000,
          clicks: 75,
          source: 'bulk'
        },
        {
          materialId,
          date: '2024-01-18',
          cost: 300,
          impressions: 8000,
          clicks: 200,
          source: 'bulk'
        }
      ]);

    expect(response.status).toBe(200);
    expect(response.body.successCount).toBe(2);
    expect(response.body.failCount).toBe(1);
    expect(response.body.errors.length).toBe(1);
  });

  it('should reject invalid state transition', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/status`)
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        toStatus: 'invalid_status',
        reason: 'test'
      });

    expect(response.status).toBe(400);
  });

  it('should reject unauthorized role for status transition', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/confirm`)
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1');

    expect(response.status).toBe(403);
  });

  it('should have failed records with proper error reasons', async () => {
    const response = await request(app)
      .get('/api/failed-records?type=cost_import')
      .set('x-user-role', UserRole.AUDITOR);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);

    const failedRecord = response.body.items[0];
    expect(failedRecord.errorReason).toBeDefined();
    expect(failedRecord.originalData).toBeDefined();
    expect(failedRecord.failedAt).toBeDefined();
  });
});
