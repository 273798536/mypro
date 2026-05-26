const request = require('supertest');
const app = require('../src/app');
const { execAsync, runAsync, getAsync, allAsync } = require('../src/config/database');

describe('数据一致性测试', () => {
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

  describe('操作历史记录一致性', () => {
    let waveId;

    it('创建波次应记录操作历史', async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'history-test-create')
        .send({
          waveNo: 'HISTORY-TEST-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-A',
          teamCode: 'TEAM-01',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU001', skuName: '测试商品', locationCode: 'A-01-01', planQty: 100 }
          ]
        });
      
      waveId = createRes.body.data.id;

      const historyRes = await request(app).get(`/api/waves/${waveId}/history`);
      
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBeGreaterThan(0);
      
      const createOp = historyRes.body.data.find(h => h.operation_type === 'CREATE_WAVE');
      expect(createOp).toBeDefined();
      expect(createOp.operator).toBe('tester');
      expect(createOp.after_status).toBe('CREATED');
    });

    it('标记缺货应记录操作历史', async () => {
      const waveItemId = (await request(app).get(`/api/waves/${waveId}`)).body.data.items[0].id;

      await request(app)
        .post(`/api/waves/${waveId}/picking`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId,
          pickerCode: 'picker01',
          locationCode: 'A-01-01',
          skuCode: 'SKU001',
          planQty: 100,
          actualQty: 70,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'history-test-shortage')
        .send({
          waveItemId,
          shortageQty: 30,
          shortageReason: 'INVENTORY_SHORTAGE',
          reviewerCode: 'reviewer01',
          scanQty: 70
        });

      const historyRes = await request(app).get(`/api/waves/${waveId}/history`);
      const shortageOp = historyRes.body.data.find(h => h.operation_type === 'MARK_SHORTAGE');
      
      expect(shortageOp).toBeDefined();
      expect(shortageOp.operator).toBe('reviewer01');
      expect(shortageOp.change_content).toBeDefined();
      expect(shortageOp.change_content.shortageQty).toBe(30);
    });

    it('重算绩效应保留历史版本', async () => {
      const perfRes1 = await request(app)
        .post(`/api/waves/${waveId}/performance/recalculate`)
        .set('x-operator', 'supervisor')
        .set('x-idempotent-key', 'history-test-perf1')
        .send({});
      
      expect(perfRes1.status).toBe(200);

      const allRecords = await allAsync(
        `SELECT * FROM performance_records WHERE wave_id = ? ORDER BY calculated_at`,
        [waveId]
      );
      
      await request(app)
        .post(`/api/waves/${waveId}/performance/recalculate`)
        .set('x-operator', 'supervisor')
        .set('x-idempotent-key', 'history-test-perf2')
        .send({});

      const invalidRecords = await allAsync(
        `SELECT * FROM performance_records WHERE wave_id = ? AND is_valid = 0`,
        [waveId]
      );
      const validRecords = await allAsync(
        `SELECT * FROM performance_records WHERE wave_id = ? AND is_valid = 1`,
        [waveId]
      );

      expect(invalidRecords.length).toBeGreaterThan(0);
      expect(validRecords.length).toBeGreaterThan(0);
      expect(invalidRecords[0].invalid_reason).toBe('重新计算作废');
    });
  });

  describe('库位占用释放一致性', () => {
    let waveId;
    let waveItemId;
    let taskId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'occupation-test-wave')
        .send({
          waveNo: 'OCCUPATION-TEST-001',
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
        .set('x-idempotent-key', 'occupation-test-shortage')
        .send({
          waveItemId,
          shortageQty: 30,
          shortageReason: 'INVENTORY_SHORTAGE',
          reviewerCode: 'reviewer01',
          scanQty: 70
        });
    });

    it('创建回补任务应创建库位占用', async () => {
      const taskRes = await request(app)
        .post(`/api/waves/${waveId}/replenishment`)
        .set('x-operator', 'planner01')
        .set('x-idempotent-key', 'occupation-test-create')
        .send({
          waveItemId,
          fromLocation: 'B-02-01',
          toLocation: 'B-01-01',
          shortageQty: 30,
          skuCode: 'SKU002'
        });
      
      taskId = taskRes.body.data.taskId;

      const occupations = await allAsync(
        `SELECT * FROM location_occupations WHERE replenishment_task_id = ?`,
        [taskId]
      );

      expect(occupations.length).toBe(1);
      expect(occupations[0].status).toBe('OCCUPIED');
      expect(occupations[0].occupied_qty).toBe(30);
    });

    it('回补完成应释放库位占用', async () => {
      await request(app)
        .post(`/api/waves/replenishment/${taskId}/confirm`)
        .set('x-operator', 'replenisher01')
        .set('x-idempotent-key', 'occupation-test-confirm')
        .send({
          replenishQty: 30,
          pickerCode: 'replenisher01'
        });

      const occupations = await allAsync(
        `SELECT * FROM location_occupations WHERE replenishment_task_id = ?`,
        [taskId]
      );

      expect(occupations[0].status).toBe('RELEASED');
      expect(occupations[0].released_at).toBeDefined();
      expect(occupations[0].released_by).toBe('replenisher01');
    });

    it('回补失败也应释放库位占用', async () => {
      const waveItemId2 = (await request(app).get(`/api/waves/${waveId}`)).body.data.items[0].id;
      
      const taskRes2 = await request(app)
        .post(`/api/waves/${waveId}/replenishment`)
        .set('x-operator', 'planner01')
        .set('x-idempotent-key', 'occupation-test-create2')
        .send({
          waveItemId: waveItemId2,
          fromLocation: 'B-02-02',
          toLocation: 'B-01-01',
          shortageQty: 10,
          skuCode: 'SKU002'
        });
      
      const taskId2 = taskRes2.body.data.taskId;

      await request(app)
        .post(`/api/waves/replenishment/${taskId2}/confirm`)
        .set('x-operator', 'replenisher01')
        .set('x-idempotent-key', 'occupation-test-confirm2')
        .send({
          replenishQty: 0,
          pickerCode: 'replenisher01'
        });

      const occupations = await allAsync(
        `SELECT * FROM location_occupations WHERE replenishment_task_id = ?`,
        [taskId2]
      );

      expect(occupations[0].status).toBe('RELEASED');
    });
  });

  describe('报表数据一致性', () => {
    let waveId1, waveId2;

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

      const createRes1 = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'report-test-wave1')
        .send({
          waveNo: 'REPORT-TEST-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-A',
          teamCode: 'TEAM-01',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU010', skuName: '报表商品A', locationCode: 'A-01-10', planQty: 100 }
          ]
        });
      waveId1 = createRes1.body.data.id;

      const createRes2 = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'report-test-wave2')
        .send({
          waveNo: 'REPORT-TEST-002',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-A',
          teamCode: 'TEAM-01',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU011', skuName: '报表商品B', locationCode: 'A-01-11', planQty: 200 }
          ]
        });
      waveId2 = createRes2.body.data.id;
    });

    it('差异报表应与实际数据一致', async () => {
      const item1Id = (await request(app).get(`/api/waves/${waveId1}`)).body.data.items[0].id;
      const item2Id = (await request(app).get(`/api/waves/${waveId2}`)).body.data.items[0].id;

      await request(app)
        .post(`/api/waves/${waveId1}/picking`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId: item1Id,
          pickerCode: 'picker01',
          locationCode: 'A-01-10',
          skuCode: 'SKU010',
          planQty: 100,
          actualQty: 80,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId2}/picking`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId: item2Id,
          pickerCode: 'picker01',
          locationCode: 'A-01-11',
          skuCode: 'SKU011',
          planQty: 200,
          actualQty: 180,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId1}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'report-test-shortage1')
        .send({
          waveItemId: item1Id,
          shortageQty: 20,
          shortageReason: 'INVENTORY_SHORTAGE',
          reviewerCode: 'reviewer01',
          scanQty: 80
        });

      await request(app)
        .post(`/api/waves/${waveId2}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'report-test-shortage2')
        .send({
          waveItemId: item2Id,
          shortageQty: 20,
          shortageReason: 'PICKER_ERROR',
          reviewerCode: 'reviewer01',
          scanQty: 180
        });

      const reportRes = await request(app)
        .get('/api/waves/report/variance')
        .query({ teamCode: 'TEAM-01' });

      expect(reportRes.status).toBe(200);
      expect(reportRes.body.data.summary.byTeam['TEAM-01'].shortageQty).toBe(40);
      expect(reportRes.body.data.summary.shortageReasons['INVENTORY_SHORTAGE']).toBe(20);
      expect(reportRes.body.data.summary.shortageReasons['PICKER_ERROR']).toBe(20);
    });

    it('导出CSV数据应与JSON报表一致', async () => {
      const jsonRes = await request(app)
        .get('/api/waves/report/variance')
        .query({ teamCode: 'TEAM-01' });

      const csvRes = await request(app)
        .get('/api/waves/report/variance/export')
        .query({ teamCode: 'TEAM-01' });

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text.length).toBeGreaterThan(0);
      expect(csvRes.text).toContain('wave_no');
      expect(csvRes.text).toContain('SKU010');
      expect(csvRes.text).toContain('SKU011');
    });
  });

  describe('主管改判后数据一致性', () => {
    let waveId;
    let waveItemId;
    let appealId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/waves')
        .set('x-operator', 'tester')
        .set('x-idempotent-key', 'correct-test-wave')
        .send({
          waveNo: 'CORRECT-TEST-001',
          warehouseCode: 'WH001',
          zoneCode: 'ZONE-C',
          teamCode: 'TEAM-03',
          createdBy: 'tester',
          items: [
            { skuCode: 'SKU020', skuName: '改判测试商品', locationCode: 'C-01-01', planQty: 100 }
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
          skuCode: 'SKU020',
          planQty: 100,
          actualQty: 80,
          diffType: 'SHORTAGE'
        });

      await request(app)
        .post(`/api/waves/${waveId}/shortage`)
        .set('x-operator', 'reviewer01')
        .set('x-idempotent-key', 'correct-test-shortage')
        .send({
          waveItemId,
          shortageQty: 20,
          shortageReason: 'PICKER_ERROR',
          reviewerCode: 'reviewer01',
          scanQty: 80
        });

      await request(app)
        .post(`/api/waves/${waveId}/performance/recalculate`)
        .set('x-operator', 'supervisor')
        .set('x-idempotent-key', 'correct-test-perf1')
        .send({});

      const appealRes = await request(app)
        .post(`/api/waves/${waveId}/appeals`)
        .set('x-operator', 'picker01')
        .send({
          waveItemId,
          appealReason: '实际是库位不准',
          appellant: 'picker01'
        });
      appealId = appealRes.body.data.appealId;
    });

    it('申诉通过后缺货原因和绩效应更新', async () => {
      const beforeWave = await request(app).get(`/api/waves/${waveId}`);
      const beforeReason = beforeWave.body.data.items[0].shortage_reason;
      expect(beforeReason).toBe('PICKER_ERROR');

      const beforePerf = await request(app).get(`/api/waves/${waveId}/performance`);
      const beforeValidCount = beforePerf.body.data.records.filter(r => r.is_valid).length;

      await request(app)
        .patch(`/api/waves/appeals/${appealId}/review`)
        .set('x-operator', 'manager01')
        .send({
          reviewResult: 'APPROVED',
          reviewComment: '申诉成立，改为系统库存误差',
          correctShortage: true
        });

      const afterWave = await request(app).get(`/api/waves/${waveId}`);
      const afterReason = afterWave.body.data.items[0].shortage_reason;
      expect(afterReason).toBe('申诉成立，改为系统库存误差');

      const afterPerf = await request(app).get(`/api/waves/${waveId}/performance`);
      const afterValidCount = afterPerf.body.data.records.filter(r => r.is_valid).length;
      const invalidCount = afterPerf.body.data.records.filter(r => !r.is_valid).length;

      expect(invalidCount).toBeGreaterThan(0);
      expect(afterValidCount).toBeGreaterThan(0);
    });

    it('操作历史应记录改判过程', async () => {
      const historyRes = await request(app).get(`/api/waves/${waveId}/history`);
      
      const reviewOp = historyRes.body.data.find(h => h.operation_type === 'REVIEW_APPEAL');
      expect(reviewOp).toBeDefined();
      expect(reviewOp.operator).toBe('manager01');

      const perfOp = historyRes.body.data.find(h => h.operation_type === 'RECALCULATE_PERFORMANCE');
      expect(perfOp).toBeDefined();
    });
  });
});
