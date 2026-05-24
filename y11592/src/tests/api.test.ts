import request from 'supertest';
import app from '../app';
import { initModels } from '../models';
import sequelize from '../database/connection';
import { DataSourceType, IdempotencyStrategy } from '../types';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await sequelize.sync({ force: true });
  await initModels();
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  const models = sequelize.models;
  for (const model of Object.values(models)) {
    await model.destroy({ where: {}, truncate: true });
  }
});

const authHeaders = {
  'x-user-id': 'test-user-001',
  'x-user-name': '测试用户',
  'x-user-roles': 'admin,manager',
  'x-user-permissions': 'retry:submit,retry:cancel,retry:freeze,export:view',
};

describe('API 集成测试', () => {
  describe('健康检查', () => {
    it('GET /api/v1/health 应返回200', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });
  });

  describe('权限测试', () => {
    it('未提供用户ID应返回401', async () => {
      const response = await request(app)
        .post('/api/v1/retry-queue/submit')
        .send({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('死信队列需要manager角色', async () => {
      const response = await request(app)
        .get('/api/v1/dead-letter-queue')
        .set({
          'x-user-id': 'test-user-001',
          'x-user-roles': 'user',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('重试队列 API', () => {
    it('POST /submit 应成功提交数据', async () => {
      const response = await request(app)
        .post('/api/v1/retry-queue/submit')
        .set(authHeaders)
        .send({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
          batchId: 'BATCH-API-001',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('created');
      expect(response.body.data.retryQueueId).toBeDefined();
    });

    it('POST /batch-submit 应批量提交', async () => {
      const items = [
        {
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        },
        {
          sourceType: DataSourceType.PICKING_DIFFERENCE,
          sourceId: 'DIFF-001',
          sourceData: {
            differenceNo: 'DIFF-001',
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            skuCode: 'SKU-001',
            expectedQty: 10,
            actualQty: 8,
            differenceQty: 2,
            differenceType: 'SHORTAGE',
            isResolved: false,
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        },
      ];

      const response = await request(app)
        .post('/api/v1/retry-queue/batch-submit')
        .set(authHeaders)
        .send({ items, batchId: 'BATCH-API-002' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.success).toBe(2);
    });

    it('GET /:id 应获取重试项详情', async () => {
      const submitResponse = await request(app)
        .post('/api/v1/retry-queue/submit')
        .set(authHeaders)
        .send({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        });

      const id = submitResponse.body.data.retryQueueId;
      const getResponse = await request(app)
        .get(`/api/v1/retry-queue/${id}`)
        .set(authHeaders);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(id);
    });

    it('POST /:id/cancel 应取消重试项', async () => {
      const submitResponse = await request(app)
        .post('/api/v1/retry-queue/submit')
        .set(authHeaders)
        .send({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        });

      const id = submitResponse.body.data.retryQueueId;
      const cancelResponse = await request(app)
        .post(`/api/v1/retry-queue/${id}/cancel`)
        .set(authHeaders);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.status).toBe('cancelled');
    });

    it('POST /:id/freeze 应冻结重试项', async () => {
      const submitResponse = await request(app)
        .post('/api/v1/retry-queue/submit')
        .set(authHeaders)
        .send({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        });

      const id = submitResponse.body.data.retryQueueId;
      const freezeResponse = await request(app)
        .post(`/api/v1/retry-queue/${id}/freeze`)
        .set(authHeaders)
        .send({ reason: '导出前冻结' });

      expect(freezeResponse.status).toBe(200);
      expect(freezeResponse.body.success).toBe(true);
      expect(freezeResponse.body.data.status).toBe('frozen');
    });

    it('GET /statistics/summary 应返回统计数据', async () => {
      const response = await request(app)
        .get('/api/v1/retry-queue/statistics/summary')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('导出 API', () => {
    it('POST /export 应导出数据', async () => {
      await request(app)
        .post('/api/v1/retry-queue/submit')
        .set(authHeaders)
        .send({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: {
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            waveType: 'NORMAL',
            totalOrders: 10,
            totalSkus: 5,
            totalQty: 100,
            status: 'PICKING',
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
          batchId: 'EXPORT-BATCH',
        });

      await request(app)
        .post('/api/v1/retry-queue/trigger-process')
        .set(authHeaders);

      const response = await request(app)
        .post('/api/v1/export')
        .set(authHeaders)
        .send({ batchId: 'EXPORT-BATCH', includeHistory: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
    });

    it('GET /export/verify-consistency/:batchId 应验证一致性', async () => {
      const response = await request(app)
        .get('/api/v1/export/verify-consistency/TEST-BATCH')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.consistent).toBeDefined();
    });

    it('GET /export/retry-classification 应返回重试分类', async () => {
      const response = await request(app)
        .get('/api/v1/export/retry-classification')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.retryable).toBeDefined();
      expect(response.body.data.nonRetryable).toBeDefined();
    });
  });

  describe('历史记录 API', () => {
    it('GET /history/batch/:batchId 应获取批次历史', async () => {
      const response = await request(app)
        .get('/api/v1/history/batch/TEST-BATCH')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
