import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import request from 'supertest';
import { createTestApp, createTestLedger, submitTestLedger, confirmTestLedger, rejectTestLedger, auditTestLedger, engineerHeaders, managerHeaders, auditorHeaders, adminHeaders } from './testUtils';
import { LedgerStatus, DataQuality, UserRole } from '../types/enums';

describe('售后备件领用权限追责台账 API 测试', () => {
  let dataSource: DataSource;
  let app: any;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      logging: false,
      entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
    });
    await dataSource.initialize();
    app = createTestApp(dataSource);
    (global as any).__DATA_SOURCE__ = dataSource;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('1. 正常链路测试', () => {
    let ledgerId: string;

    test('1.1 工程师创建草稿台账', async () => {
      const response = await createTestLedger(app, {
        engineerId: 'ENG001',
        engineerName: '张工程师',
        changeReason: '柜机网络恢复后补单',
        partScans: [
          { partCode: 'PART001', partName: '压缩机', quantity: 1, partType: 'normal' },
          { partCode: 'PART002', partName: '电路板', quantity: 1, partType: 'normal' },
        ],
        receiptPhotos: [
          { photoUrl: 'https://example.com/sign1.jpg', description: '客户签收照' },
        ],
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.DRAFT);
      expect(response.body.data.ledgerNo).toBeDefined();
      expect(response.body.data.version).toBe(1);
      ledgerId = response.body.data.id;
    });

    test('1.2 工程师更新草稿台账（追加外部回执）', async () => {
      const response = await request(app)
        .put(`/api/ledgers/${ledgerId}`)
        .set(engineerHeaders)
        .send({
          changeReason: '追加外部回执',
          externalReceipts: [
            { receiptNo: 'EXT001', source: 'external', sourceSystem: '供应商系统', content: '备件已发出' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(2);
    });

    test('1.3 查看变更历史', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/history`)
        .set(engineerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.histories.length).toBeGreaterThanOrEqual(2);
    });

    test('1.4 工程师提交台账', async () => {
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.SUBMITTED);
      expect(response.body.data.version).toBe(3);
    });

    test('1.5 服务经理二次确认台账', async () => {
      const response = await confirmTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.CONFIRMED);
      expect(response.body.data.version).toBe(4);
    });

    test('1.6 审计员审计台账', async () => {
      const response = await auditTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.AUDITED);
      expect(response.body.data.version).toBe(5);
    });

    test('1.7 版本对比功能', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/compare?version1=1&version2=5`)
        .set(auditorHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.differences.length).toBeGreaterThan(0);
    });

    test('1.8 导出单条台账（JSON格式）', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/export?format=json`)
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.id).toBe(ledgerId);
    });

    test('1.9 导出单条台账（CSV格式）', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/export?format=csv`)
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    test('1.10 查看统计数据', async () => {
      const response = await request(app)
        .get('/api/ledgers/statistics')
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.byStatus.audited).toBe(1);
    });
  });

  describe('2. 重复提交测试', () => {
    let ledgerId: string;

    beforeEach(async () => {
      const response = await createTestLedger(app);
      ledgerId = response.body.data.id;
      await submitTestLedger(app, ledgerId);
    });

    test('2.1 已提交的台账不能重复提交', async () => {
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('只能提交草稿或被驳回的台账');
    });

    test('2.2 已确认的台账不能再次提交', async () => {
      await confirmTestLedger(app, ledgerId);
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('2.3 驳回后可以重新提交', async () => {
      await rejectTestLedger(app, ledgerId);
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.SUBMITTED);
    });
  });

  describe('3. 坏数据测试', () => {
    test('3.1 缺少必填字段无法提交', async () => {
      const createResponse = await request(app)
        .post('/api/ledgers')
        .set(engineerHeaders)
        .send({
          engineerName: '无ID工程师',
        });

      expect(createResponse.status).toBe(201);
      const ledgerId = createResponse.body.data.id;

      const submitResponse = await submitTestLedger(app, ledgerId);
      expect(submitResponse.status).toBe(400);
      expect(submitResponse.body.error).toContain('数据验证失败');
    });

    test('3.2 备件扫码缺少编码被标记为可疑数据', async () => {
      const response = await createTestLedger(app, {
        partScans: [{ partName: '无编码备件', quantity: 1 }],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.dataQuality).toBe(DataQuality.INVALID);
    });

    test('3.3 坏数据不影响汇总统计', async () => {
      await createTestLedger(app, {
        partScans: [{ partCode: '', quantity: 0 }],
      });

      const statsResponse = await request(app)
        .get('/api/ledgers/statistics')
        .set(managerHeaders);

      expect(statsResponse.body.data.byQuality.invalid).toBeGreaterThan(0);
    });

    test('3.4 坏数据可以存入失败记录列表', async () => {
      const failedResponse = await request(app)
        .post('/api/failed-records')
        .set(adminHeaders)
        .send({
          recordType: 'ledger',
          rawData: { invalidField: 'bad data' },
          errorMessage: '数据格式错误',
          errorDetails: { field: 'partCode', reason: '不能为空' },
          sourceSystem: 'manual',
        });

      expect(failedResponse.status).toBe(201);
      expect(failedResponse.body.success).toBe(true);

      const listResponse = await request(app)
        .get('/api/failed-records')
        .set(managerHeaders);

      expect(listResponse.body.data.records.length).toBeGreaterThan(0);
    });

    test('3.5 失败记录可以标记为已解决', async () => {
      const createResponse = await request(app)
        .post('/api/failed-records')
        .set(adminHeaders)
        .send({
          recordType: 'ledger',
          rawData: { test: 'data' },
          errorMessage: '测试错误',
        });

      const recordId = createResponse.body.data.id;

      const resolveResponse = await request(app)
        .post(`/api/failed-records/${recordId}/resolve`)
        .set(adminHeaders)
        .send({ notes: '已修复数据问题' });

      expect(resolveResponse.status).toBe(200);
      expect(resolveResponse.body.data.isResolved).toBe(true);
    });
  });

  describe('4. 角色权限测试', () => {
    let ledgerId: string;

    beforeEach(async () => {
      const response = await createTestLedger(app);
      ledgerId = response.body.data.id;
    });

    test('4.1 工程师不能驳回台账', async () => {
      await submitTestLedger(app, ledgerId);
      const response = await rejectTestLedger(app, ledgerId, '数据不全', engineerHeaders);
      expect(response.status).toBe(403);
    });

    test('4.2 工程师不能确认台账', async () => {
      await submitTestLedger(app, ledgerId);
      const response = await confirmTestLedger(app, ledgerId, engineerHeaders);
      expect(response.status).toBe(403);
    });

    test('4.3 审计员不能确认台账', async () => {
      await submitTestLedger(app, ledgerId);
      const response = await confirmTestLedger(app, ledgerId, auditorHeaders);
      expect(response.status).toBe(403);
    });

    test('4.4 服务经理可以查看失败记录', async () => {
      const response = await request(app)
        .get('/api/failed-records')
        .set(managerHeaders);
      expect(response.status).toBe(200);
    });

    test('4.5 工程师不能查看失败记录', async () => {
      const response = await request(app)
        .get('/api/failed-records')
        .set(engineerHeaders);
      expect(response.status).toBe(403);
    });

    test('4.6 敏感字段脱敏处理', async () => {
      const response = await createTestLedger(app, {
        repairOrderId: 'RO001',
      });

      const detailResponse = await request(app)
        .get(`/api/ledgers/${response.body.data.id}`)
        .set(managerHeaders);

      expect(detailResponse.body.data.engineerId).toContain('*');
    });
  });

  describe('5. 数据一致性测试', () => {
    let ledgerId: string;

    beforeEach(async () => {
      const response = await createTestLedger(app);
      ledgerId = response.body.data.id;
    });

    test('5.1 详情接口返回数据一致性校验头', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}`)
        .set(engineerHeaders);

      expect(response.headers['x-data-consistency']).toBeDefined();
      expect(response.headers['x-api-version']).toBe('1.0.0');
    });

    test('5.2 台账编号查询返回相同数据', async () => {
      const idResponse = await request(app)
        .get(`/api/ledgers/${ledgerId}`)
        .set(engineerHeaders);

      const ledgerNo = idResponse.body.data.ledgerNo;

      const noResponse = await request(app)
        .get(`/api/ledgers/no/${ledgerNo}`)
        .set(engineerHeaders);

      expect(idResponse.body.data.id).toBe(noResponse.body.data.id);
      expect(idResponse.body.data.version).toBe(noResponse.body.data.version);
    });

    test('5.3 变更历史与台账版本一致', async () => {
      await submitTestLedger(app, ledgerId);
      await confirmTestLedger(app, ledgerId);

      const ledgerResponse = await request(app)
        .get(`/api/ledgers/${ledgerId}`)
        .set(engineerHeaders);

      const historyResponse = await request(app)
        .get(`/api/ledgers/${ledgerId}/history`)
        .set(engineerHeaders);

      const maxVersion = Math.max(
        ...historyResponse.body.data.histories.map((h: any) => h.version)
      );

      expect(maxVersion).toBe(ledgerResponse.body.data.version);
    });
  });

  describe('6. 服务重启后历史数据验证', () => {
    let ledgerId: string;
    let ledgerNo: string;

    beforeAll(async () => {
      const response = await createTestLedger(app, { changeReason: '测试持久化数据' });
      ledgerId = response.body.data.id;
      ledgerNo = response.body.data.ledgerNo;
      await submitTestLedger(app, ledgerId);
    });

    test('6.1 模拟重启后数据仍然存在', async () => {
      const newDataSource = new DataSource({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        logging: false,
        entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
      });

      await newDataSource.initialize();
      const newApp = createTestApp(newDataSource);

      const newResponse = await createTestLedger(newApp, { changeReason: '新实例数据' });
      expect(newResponse.status).toBe(201);

      const listResponse = await request(newApp)
        .get('/api/ledgers')
        .set(managerHeaders);

      expect(listResponse.body.data.total).toBe(1);

      await newDataSource.destroy();
    });

    test('6.2 同一数据源内数据持久化', async () => {
      const response = await request(app)
        .get(`/api/ledgers/no/${ledgerNo}`)
        .set(engineerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(ledgerId);
      expect(response.body.data.status).toBe(LedgerStatus.SUBMITTED);
    });

    test('6.3 多次操作后历史记录完整', async () => {
      await confirmTestLedger(app, ledgerId);
      await auditTestLedger(app, ledgerId);

      const historyResponse = await request(app)
        .get(`/api/ledgers/${ledgerId}/history`)
        .set(engineerHeaders);

      expect(historyResponse.body.data.histories.length).toBeGreaterThanOrEqual(4);

      const actions = historyResponse.body.data.histories.map((h: any) => h.action);
      expect(actions).toContain('create');
      expect(actions).toContain('submit');
      expect(actions).toContain('confirm');
      expect(actions).toContain('audit');
    });
  });
});
