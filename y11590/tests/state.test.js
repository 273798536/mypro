const request = require('supertest');
const app = require('../src/app');
const { execAsync } = require('../src/config/database');

describe('状态机与业务规则测试', () => {
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

  describe('波次状态转换限制', () => {
    let waveId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'state-test-wave')
        .send({
          waveNo: 'STATE-TEST-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-A',
          teamCode: 'TEAM-01',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU001', skuName: '测试商品', locationCode: 'A-01-01', planQty: 100 }
          ]
        });
      waveId = createRes.body.data.id;
    });

    it('CREATED状态不能直接转换到COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/waves/${waveId}/status`)
        .set('x-operator', 'tester')
        .send({ status: 'COMPLETED' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('STATE_TRANSITION_ERROR');
    });

    it('CREATED状态可以转换到PICKING', async () => {
      const res = await request(app)
        .patch(`/api/waves/${waveId}/status`)
        .set('x-operator', 'tester')
        .send({ status: 'PICKING' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PICKING');
    });

    it('PICKING状态不能直接转换到REPLENISHING', async () => {
      const res = await request(app)
        .patch(`/api/waves/${waveId}/status`)
        .set('x-operator', 'tester')
        .send({ status: 'REPLENISHING' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('STATE_TRANSITION_ERROR');
    });
  });

  describe('回补任务重复创建限制', () => {
    let waveId;
    let waveItemId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'dup-test-wave')
        .send({
          waveNo: 'DUP-TEST-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-B',
          teamCode: 'TEAM-02',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU002', skuName: '测试商品2', locationCode: 'B-01-01', planQty: 100 }
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
          skuCode: 'SKU002',
          planQty: 100,
          actualQty: 70,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'dup-test-shortage')
        .send({
          waveItemId,
          shortageQty: 30,
          shortageReason: 'INVENTORY_SHORTAGE',
          reviewerCode: 'reviewer01',
          scanQty: 70
        });
    });

    it('同一商品存在未完成回补任务时不能重复创建', async () => {
      await request(app)
        .post(`/api/waves/${waveId}/replenishment`)
        .set('x-operator', 'planner01')
        .set('x-idempotent-key', 'dup-test-replenish1')
        .send({
          waveItemId,
          fromLocation: 'B-02-01',
          toLocation: 'B-01-01',
          shortageQty: 30,
          skuCode: 'SKU002'
        });

      const res2 = await request(app)
        .post(`/api/waves/${waveId}/replenishment`)
        .set('x-operator', 'planner01')
        .set('x-idempotent-key', 'dup-test-replenish2')
        .send({
          waveItemId,
          fromLocation: 'B-02-02',
          toLocation: 'B-01-01',
          shortageQty: 30,
          skuCode: 'SKU002'
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.message).toContain('未完成的回补任务');

      const tasksRes = await request(app).get(`/api/waves/${waveId}/replenishment`);
      expect(tasksRes.body.data.length).toBe(1);
    });
  });

  describe('回补任务状态转换限制', () => {
    let waveId;
    let waveItemId;
    let taskId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'replenish-state-wave')
        .send({
          waveNo: 'REPLENISH-STATE-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-C',
          teamCode: 'TEAM-03',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU003', skuName: '测试商品3', locationCode: 'C-01-01', planQty: 100 }
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
          locationCode: 'C-01-01',
          skuCode: 'SKU003',
          planQty: 100,
          actualQty: 70,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'replenish-state-shortage')
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
        .set('x-idempotent-key', 'replenish-state-create')
        .send({
          waveItemId,
          fromLocation: 'C-02-01',
          toLocation: 'C-01-01',
          shortageQty: 30,
          skuCode: 'SKU003'
        });
      taskId = taskRes.body.data.taskId;
    });

    it('已完成的回补任务不能重复确认', async () => {
      await request(app)
        .post(`/api/waves/replenishment/${taskId}/confirm`)
        .set('x-operator', 'replenisher01')
        .set('x-idempotent-key', 'replenish-state-confirm1')
        .send({
          replenishQty: 30,
          pickerCode: 'replenisher01'
        });

      const res2 = await request(app)
        .post(`/api/waves/replenishment/${taskId}/confirm`)
        .set('x-operator', 'replenisher01')
        .set('x-idempotent-key', 'replenish-state-confirm2')
        .send({
          replenishQty: 10,
          pickerCode: 'replenisher01'
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('已处理申诉不能重复审核', () => {
    let waveId;
    let waveItemId;
    let appealId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'appeal-state-wave')
        .send({
          waveNo: 'APPEAL-STATE-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-D',
          teamCode: 'TEAM-04',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU004', skuName: '测试商品4', locationCode: 'D-01-01', planQty: 100 }
          ]
        });
      waveId = createRes.body.data.id;
      waveItemId = createRes.body.data.items[0].id;

      const appealRes = await request(app)
        .post(`/api/waves/${waveId}/appeals`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId,
          appealReason: '测试申诉',
          appellant: 'picker01'
        });
      appealId = appealRes.body.data.appealId;
    });

    it('已审核的申诉不能重复审核', async () => {
      await request(app)
        .patch(`/api/waves/appeals/${appealId}/review`)
        .set('x-operator', 'manager01')
        .send({
          reviewResult: 'APPROVED',
          reviewComment: '测试通过',
          correctShortage: false
        });

      const res2 = await request(app)
        .patch(`/api/waves/appeals/${appealId}/review`)
        .set('x-operator', 'manager02')
        .send({
          reviewResult: 'REJECTED',
          reviewComment: '测试驳回',
          correctShortage: false
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.message).toContain('已处理');
    });
  });
});
