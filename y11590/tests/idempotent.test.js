const request = require('supertest');
const app = require('../src/app');
const { execAsync } = require('../src/config/database');

describe('幂等性测试', () => {
  beforeAll(async () => {
    await execAsync(`
      DELETE FROM appeals;
      DELETE FROM performance_records;
      DELETE FROM location_occupations;
      DELETE FROM replenishment_tasks;
      DELETE FROM review_scans;
      DELETE FROM picking_records;
      DELETE FROM wave_items;
      DELETE FROM operation_history;
      DELETE FROM waves;
    `);
  });

  describe('创建波次幂等性', () => {
    it('相同幂等键重复创建波次应返回幂等结果', async () => {
      const idempotentKey = 'test-create-wave-001';
      const waveData = {
        waveNo: 'TEST-WAVE-001',
        warehouseCode: 'WH001',
        zoneCode: 'ZONE-A',
        teamCode: 'TEAM-01',
        createdBy: 'tester',
        items: [
          { skuCode: 'SKU001', skuName: '测试商品', locationCode: 'A-01-01', planQty: 100 }
        ]
      };

      const res1 = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', idempotentKey)
        .send(waveData);
      
      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.idempotent).toBeUndefined();

      const res2 = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', idempotentKey)
        .send(waveData);
      
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.idempotent).toBe(true);
      expect(res2.body.message).toContain('幂等返回');

      const wavesRes = await request(app).get('/api/waves?waveNo=TEST-WAVE-001');
      const waves = wavesRes.body.data.filter(w => w.wave_no === 'TEST-WAVE-001');
      expect(waves.length).toBe(1);
    });
  });

  describe('标记缺货幂等性', () => {
    let waveId;
    let waveItemId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'test-shortage-wave')
        .send({
          waveNo: 'TEST-WAVE-002',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-A',
          teamCode: 'TEAM-01',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU002', skuName: '测试商品2', locationCode: 'A-01-02', planQty: 50 }
          ]
        });
      waveId = createRes.body.data.id;
      waveItemId = createRes.body.data.items[0].id;

      await request(app)
        .post(`/api/waves/${waveId}/picking`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId,
          pickerCode: 'picker01',
          locationCode: 'A-01-02',
          skuCode: 'SKU002',
          planQty: 50,
          actualQty: 30,
          diffType: 'SHORTAGE'
        });
    });

    it('相同幂等键重复标记缺货应返回幂等结果', async () => {
      const idempotentKey = 'test-shortage-001';
      const shortageData = {
        waveItemId,
        shortageQty: 20,
        shortageReason: 'INVENTORY_SHORTAGE',
        reviewerCode: 'reviewer01',
        scanQty: 30
      };

      const res1 = await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', idempotentKey)
        .send(shortageData);
      
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      const res2 = await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', idempotentKey)
        .send(shortageData);
      
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.idempotent).toBe(true);

      const waveRes = await request(app).get(`/api/waves/${waveId}`);
      expect(waveRes.body.data.items[0].shortage_qty).toBe(20);
    });
  });

  describe('确认回补幂等性', () => {
    let waveId;
    let waveItemId;
    let taskId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'test-replenish-wave')
        .send({
          waveNo: 'TEST-WAVE-003',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-B',
          teamCode: 'TEAM-02',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU003', skuName: '测试商品3', locationCode: 'B-01-01', planQty: 100 }
          ]
        });
      waveId = createRes.body.data.id;
      waveItemId = createRes.body.data.items[0].id;

      await request(app)
        .post(`/api/waves/${waveId}/picking`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId,
          pickerCode: 'picker01',
          locationCode: 'B-01-01',
          skuCode: 'SKU003',
          planQty: 100,
          actualQty: 70,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'test-shortage-002')
        .send({
          waveItemId,
          shortageQty: 30,
          shortageReason: 'INVENTORY_SHORTAGE',
          reviewerCode: 'reviewer01',
          scanQty: 70
        });

      const taskRes = await request(app)
        .post(`/api/waves/${waveId}/replenishment`)
        .set('x-operator', 'planner01')
        .set('x-idempotent-key', 'test-create-replenish')
        .send({
          waveItemId,
          fromLocation: 'B-02-01',
          toLocation: 'B-01-01',
          shortageQty: 30,
          skuCode: 'SKU003'
        });
      taskId = taskRes.body.data.taskId;
    });

    it('相同幂等键重复确认回补应返回幂等结果', async () => {
      const idempotentKey = 'test-confirm-replenish-001';
      const confirmData = {
        replenishQty: 30,
        pickerCode: 'replenisher01'
      };

      const res1 = await request(app)
        .post(`/api/waves/replenishment/${taskId}/confirm`)
        .set('x-operator', 'replenisher01')
        .set('x-idempotent-key', idempotentKey)
        .send(confirmData);
      
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      const res2 = await request(app)
        .post(`/api/waves/replenishment/${taskId}/confirm`)
        .set('x-operator', 'replenisher01')
        .set('x-idempotent-key', idempotentKey)
        .send(confirmData);
      
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.idempotent).toBe(true);

      const waveRes = await request(app).get(`/api/waves/${waveId}`);
      expect(waveRes.body.data.items[0].replenished_qty).toBe(30);
    });
  });

  describe('重算绩效幂等性', () => {
    let waveId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'test-perf-wave')
        .send({
          waveNo: 'TEST-WAVE-004',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-C',
          teamCode: 'TEAM-03',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU004', skuName: '测试商品4', locationCode: 'C-01-01', planQty: 50 }
          ]
        });
      waveId = createRes.body.data.id;
      const waveItemId = createRes.body.data.items[0].id;

      await request(app)
        .post(`/api/waves/${waveId}/picking`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId,
          pickerCode: 'picker01',
          locationCode: 'C-01-01',
          skuCode: 'SKU004',
          planQty: 50,
          actualQty: 50,
          diffType: null
        });
    });

    it('相同幂等键重复重算绩效应返回幂等结果', async () => {
      const idempotentKey = 'test-recalc-perf-001';

      const res1 = await request(app)
        .post(`/api/waves/${waveId}/performance/recalculate`)
        .set('x-operator', 'supervisor')
        .set('x-idempotent-key', idempotentKey)
        .send({});
      
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      const res2 = await request(app)
        .post(`/api/waves/${waveId}/performance/recalculate`)
        .set('x-operator', 'supervisor')
        .set('x-idempotent-key', idempotentKey)
        .send({});
      
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.idempotent).toBe(true);
    });
  });
});
