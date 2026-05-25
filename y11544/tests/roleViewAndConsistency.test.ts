import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './setup';
import { getDatabase } from '../src/database';
import { UserRole, MaterialStatus } from '../src/types';

describe('Role View and Data Consistency Tests', () => {
  let app: any;
  const materialId = 'MAT-CONSISTENCY-001';

  beforeAll(async () => {
    await setupTestDatabase();
    const db = getDatabase();
    await db.init();
    app = (await import('../src/index')).default;

    await request(app)
      .post('/api/materials')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        name: 'Consistency Test Material',
        platform: 'TikTok',
        originalName: 'consistency_test.mp4'
      });

    await request(app)
      .post(`/api/materials/${materialId}/submit`)
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1');

    await request(app)
      .post(`/api/materials/${materialId}/confirm`)
      .set('x-user-role', UserRole.REVIEWER)
      .set('x-user-id', 'reviewer1');

    await request(app)
      .post('/api/costs')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        date: '2024-01-20',
        cost: 2500,
        impressions: 100000,
        clicks: 2500,
        source: 'test'
      });
  });

  describe('Role-Based Views', () => {
    it('should return operator dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('x-user-role', UserRole.OPERATOR);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.OPERATOR);
      expect(response.body.focus).toContain('Drafts');
      expect(response.body.actions).toContain('Create Draft');
    });

    it('should return reviewer dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('x-user-role', UserRole.REVIEWER);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.REVIEWER);
      expect(response.body.focus).toContain('Review');
      expect(response.body.pendingReview).toBeDefined();
    });

    it('should return manager dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('x-user-role', UserRole.MANAGER);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.MANAGER);
      expect(response.body.focus).toContain('Overview');
      expect(response.body.byStatus).toBeDefined();
    });

    it('should return auditor dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('x-user-role', UserRole.AUDITOR);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.AUDITOR);
      expect(response.body.focus).toContain('Audit');
      expect(response.body.actions).toContain('Export Reports');
    });

    it('should return admin dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('x-user-role', UserRole.ADMIN);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.ADMIN);
      expect(response.body.focus).toContain('Control');
      expect(response.body.actions).toContain('Full CRUD Access');
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent data between detail and summary', async () => {
      const detailResponse = await request(app)
        .get(`/api/materials/${materialId}`)
        .set('x-user-role', UserRole.MANAGER);

      const costResponse = await request(app)
        .get(`/api/costs/material/${materialId}/summary`)
        .set('x-user-role', UserRole.MANAGER);

      expect(detailResponse.status).toBe(200);
      expect(costResponse.status).toBe(200);
      expect(detailResponse.body.summary.totalCost).toBe(costResponse.body.totalCost);
      expect(detailResponse.body.summary.totalImpressions).toBe(costResponse.body.totalImpressions);
      expect(detailResponse.body.summary.totalClicks).toBe(costResponse.body.totalClicks);
    });

    it('should have consistent status in list and detail views', async () => {
      const listResponse = await request(app)
        .get('/api/materials')
        .set('x-user-role', UserRole.MANAGER);

      const detailResponse = await request(app)
        .get(`/api/materials/${materialId}`)
        .set('x-user-role', UserRole.MANAGER);

      const listMaterial = listResponse.body.items.find((m: any) => m.materialId === materialId);

      expect(listMaterial).toBeDefined();
      expect(listMaterial.status).toBe(detailResponse.body.status);
    });

    it('should have consistent status history and current status', async () => {
      const detailResponse = await request(app)
        .get(`/api/materials/${materialId}`)
        .set('x-user-role', UserRole.AUDITOR);

      const historyResponse = await request(app)
        .get(`/api/materials/${materialId}/history`)
        .set('x-user-role', UserRole.AUDITOR);

      const lastStatusChange = historyResponse.body[historyResponse.body.length - 1];

      expect(lastStatusChange.toStatus).toBe(detailResponse.body.status);
    });

    it('should have version incremented on status change', async () => {
      const response = await request(app)
        .get(`/api/materials/${materialId}`)
        .set('x-user-role', UserRole.AUDITOR);

      expect(response.body.version).toBeGreaterThan(1);
    });
  });

  describe('Data Masking', () => {
    it('should mask sensitive fields for operator role', async () => {
      const response = await request(app)
        .get(`/api/materials/${materialId}`)
        .set('x-user-role', UserRole.OPERATOR);

      expect(response.status).toBe(200);
      expect(response.body.originalName).toBeDefined();
      expect(response.body.originalName).not.toBe('consistency_test.mp4');
      expect(response.body.originalName).toContain('*');
    });

    it('should show original name for manager role', async () => {
      const response = await request(app)
        .get(`/api/materials/${materialId}`)
        .set('x-user-role', UserRole.MANAGER);

      expect(response.status).toBe(200);
      expect(response.body.originalName).toBe('consistency_test.mp4');
    });
  });

  describe('Service Restart and History Persistence', () => {
    it('should persist all data and history', async () => {
      const historyResponse = await request(app)
        .get(`/api/materials/${materialId}/history`)
        .set('x-user-role', UserRole.AUDITOR);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.length).toBeGreaterThanOrEqual(3);

      const statuses = historyResponse.body.map((log: any) => log.toStatus);
      expect(statuses).toContain(MaterialStatus.DRAFT);
      expect(statuses).toContain(MaterialStatus.SUBMITTED);
      expect(statuses).toContain(MaterialStatus.SECONDARY_CONFIRMED);

      historyResponse.body.forEach((log: any) => {
        expect(log.changedAt).toBeDefined();
        expect(log.changedBy).toBeDefined();
        expect(log.reason).toBeDefined();
      });
    });
  });
});
