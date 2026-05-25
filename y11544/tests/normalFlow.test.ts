import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './setup';
import { getDatabase } from '../src/database';
import { MaterialStatus, UserRole } from '../src/types';

describe('Normal Flow Test', () => {
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

  const materialId = 'MAT-001';

  it('should create a material in draft status', async () => {
    const response = await request(app)
      .post('/api/materials')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        name: 'Test Ad Material',
        platform: 'TikTok',
        originalName: 'original_ad_001.mp4'
      });

    expect(response.status).toBe(201);
    expect(response.body.materialId).toBe(materialId);
    expect(response.body.status).toBe(MaterialStatus.DRAFT);
  });

  it('should submit material for review', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/submit`)
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MaterialStatus.SUBMITTED);
  });

  it('should reject material with reason', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/reject`)
      .set('x-user-role', UserRole.REVIEWER)
      .set('x-user-id', 'reviewer1')
      .send({ reason: '素材内容不符合平台规范' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MaterialStatus.REJECTED);
  });

  it('should resubmit rejected material', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/submit`)
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MaterialStatus.SUBMITTED);
  });

  it('should secondary confirm material', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/confirm`)
      .set('x-user-role', UserRole.REVIEWER)
      .set('x-user-id', 'reviewer1');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MaterialStatus.SECONDARY_CONFIRMED);
  });

  it('should add manager comment with evidence', async () => {
    const response = await request(app)
      .post('/api/comments')
      .set('x-user-role', UserRole.MANAGER)
      .set('x-user-id', 'manager1')
      .send({
        materialId,
        comment: '已确认素材合规，可以投放',
        evidence: 'https://internal.example.com/audit/MAT-001'
      });

    expect(response.status).toBe(201);
    expect(response.body.comment).toBe('已确认素材合规，可以投放');
  });

  it('should import daily cost data', async () => {
    const response = await request(app)
      .post('/api/costs')
      .set('x-user-role', UserRole.OPERATOR)
      .set('x-user-id', 'operator1')
      .send({
        materialId,
        date: '2024-01-15',
        cost: 1500.50,
        impressions: 50000,
        clicks: 1200,
        source: 'daily_report'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cost).toBe(1500.50);
  });

  it('should add audit record', async () => {
    const response = await request(app)
      .post('/api/audit')
      .set('x-user-role', UserRole.REVIEWER)
      .set('x-user-id', 'reviewer1')
      .send({
        materialId,
        auditResult: 'pass',
        auditComment: '审核通过，素材质量良好'
      });

    expect(response.status).toBe(201);
    expect(response.body.auditResult).toBe('pass');
  });

  it('should mark material for audit only', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/status`)
      .set('x-user-role', UserRole.AUDITOR)
      .set('x-user-id', 'auditor1')
      .send({
        toStatus: MaterialStatus.AUDIT_ONLY,
        reason: '进入只读审计阶段'
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MaterialStatus.AUDIT_ONLY);
  });

  it('should mark material as exported', async () => {
    const response = await request(app)
      .post(`/api/materials/${materialId}/status`)
      .set('x-user-role', UserRole.AUDITOR)
      .set('x-user-id', 'auditor1')
      .send({
        toStatus: MaterialStatus.EXPORTED,
        reason: '台账数据脱敏导出完成'
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MaterialStatus.EXPORTED);
  });

  it('should get material detail with consistent data', async () => {
    const response = await request(app)
      .get(`/api/materials/${materialId}`)
      .set('x-user-role', UserRole.MANAGER);

    expect(response.status).toBe(200);
    expect(response.body.materialId).toBe(materialId);
    expect(response.body.status).toBe(MaterialStatus.EXPORTED);
    expect(response.body.summary.totalCost).toBe(1500.50);
    expect(response.body.statusHistory.length).toBeGreaterThan(0);
  });

  it('should get status history with all changes', async () => {
    const response = await request(app)
      .get(`/api/materials/${materialId}/history`)
      .set('x-user-role', UserRole.AUDITOR);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(6);

    const statuses = response.body.map((log: any) => log.toStatus);
    expect(statuses).toContain(MaterialStatus.DRAFT);
    expect(statuses).toContain(MaterialStatus.SUBMITTED);
    expect(statuses).toContain(MaterialStatus.REJECTED);
    expect(statuses).toContain(MaterialStatus.SECONDARY_CONFIRMED);
    expect(statuses).toContain(MaterialStatus.AUDIT_ONLY);
    expect(statuses).toContain(MaterialStatus.EXPORTED);
  });

  it('should export to CSV', async () => {
    const response = await request(app)
      .get('/api/export/csv')
      .set('x-user-role', UserRole.AUDITOR);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain(materialId);
  });
});
