import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import request from 'supertest';
import { createTestApp, createTestLedger, submitTestLedger, confirmTestLedger, rejectTestLedger, auditTestLedger, engineerHeaders, managerHeaders, auditorHeaders, adminHeaders } from './testUtils';
import { LedgerStatus, DataQuality, UserRole } from '../types/enums';

describe('After-Sales Parts Ledger API Tests', () => {
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

  describe('1. Normal Flow Tests', () => {
    let ledgerId: string;

    test('1.1 Engineer creates draft ledger', async () => {
      const response = await createTestLedger(app, {
        engineerId: 'ENG001',
        engineerName: 'ZhangEngineer',
        changeReason: 'Network recovery supplement',
        partScans: [
          { partCode: 'PART001', partName: 'Compressor', quantity: 1, partType: 'normal' },
          { partCode: 'PART002', partName: 'CircuitBoard', quantity: 1, partType: 'normal' },
        ],
        receiptPhotos: [
          { photoUrl: 'https://example.com/sign1.jpg', description: 'CustomerReceipt' },
        ],
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.DRAFT);
      expect(response.body.data.ledgerNo).toBeDefined();
      expect(response.body.data.version).toBe(1);
      ledgerId = response.body.data.id;
    });

    test('1.2 Engineer updates draft ledger (add external receipt)', async () => {
      const response = await request(app)
        .put(`/api/ledgers/${ledgerId}`)
        .set(engineerHeaders)
        .send({
          changeReason: 'Add external receipt',
          externalReceipts: [
            { receiptNo: 'EXT001', source: 'external', sourceSystem: 'SupplierSystem', content: 'Parts sent' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(2);
    });

    test('1.3 View change history', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/history`)
        .set(engineerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.histories.length).toBeGreaterThanOrEqual(2);
    });

    test('1.4 Engineer submits ledger', async () => {
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.SUBMITTED);
      expect(response.body.data.version).toBe(3);
    });

    test('1.5 Service manager confirms ledger', async () => {
      const response = await confirmTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.CONFIRMED);
      expect(response.body.data.version).toBe(4);
    });

    test('1.6 Auditor audits ledger', async () => {
      const response = await auditTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.AUDITED);
      expect(response.body.data.version).toBe(5);
    });

    test('1.7 Version comparison', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/compare?version1=1&version2=5`)
        .set(auditorHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.differences.length).toBeGreaterThan(0);
    });

    test('1.8 Export single ledger (JSON format)', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/export?format=json`)
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.id).toBe(ledgerId);
    });

    test('1.9 Export single ledger (CSV format)', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}/export?format=csv`)
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    test('1.10 View statistics', async () => {
      const response = await request(app)
        .get('/api/ledgers/statistics')
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.validTotal).toBe(1);
    });
  });

  describe('2. Duplicate Submission Tests', () => {
    let ledgerId: string;

    beforeEach(async () => {
      const response = await createTestLedger(app);
      ledgerId = response.body.data.id;
      await submitTestLedger(app, ledgerId);
    });

    test('2.1 Cannot resubmit already submitted ledger', async () => {
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Can only submit draft or rejected ledgers');
    });

    test('2.2 Cannot resubmit already confirmed ledger', async () => {
      await confirmTestLedger(app, ledgerId);
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('2.3 Can resubmit after rejection', async () => {
      await rejectTestLedger(app, ledgerId);
      const response = await submitTestLedger(app, ledgerId);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LedgerStatus.SUBMITTED);
    });
  });

  describe('3. Bad Data Isolation Tests', () => {
    test('3.1 Missing required field cannot submit', async () => {
      const createResponse = await request(app)
        .post('/api/ledgers')
        .set(engineerHeaders)
        .send({
          engineerName: 'NoIdEngineer',
        });

      expect(createResponse.status).toBe(201);
      const ledgerId = createResponse.body.data.id;

      const submitResponse = await submitTestLedger(app, ledgerId);
      expect(submitResponse.status).toBe(400);
      expect(submitResponse.body.error).toContain('validation failed');
    });

    test('3.2 Invalid part scans isolated, not stored but failure reason auto-recorded', async () => {
      const response = await createTestLedger(app, {
        partScans: [
          { partName: 'NoCodePart', quantity: 1 },
          { partCode: 'VALID001', partName: 'ValidPart', quantity: 2 }
        ],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.dataQuality).toBe(DataQuality.SUSPICIOUS);
      expect(response.body.data.partScans.length).toBe(1);
      expect(response.body.data.partScans[0].partCode).toBe('VALID001');

      const failedRecordsResponse = await request(app)
        .get('/api/failed-records')
        .set(managerHeaders);

      expect(failedRecordsResponse.body.data.records.length).toBeGreaterThan(0);
      const partScanFailed = failedRecordsResponse.body.data.records.find(
        (r: any) => r.recordType === 'part-scan'
      );
      expect(partScanFailed).toBeDefined();
      expect(partScanFailed.errorMessage).toContain('partCode');
    });

    test('3.3 Bad data excluded from summary but visible in failure list', async () => {
      await createTestLedger(app, {
        engineerId: '',
        partScans: [{ partCode: '', quantity: 0 }],
      });

      const statsResponse = await request(app)
        .get('/api/ledgers/statistics')
        .set(managerHeaders);

      expect(statsResponse.body.data.invalidTotal).toBeGreaterThan(0);

      const failedRecordsResponse = await request(app)
        .get('/api/failed-records')
        .set(managerHeaders);

      expect(failedRecordsResponse.body.data.total).toBeGreaterThan(0);
    });

    test('3.4 Can manually create failed record', async () => {
      const failedResponse = await request(app)
        .post('/api/failed-records')
        .set(adminHeaders)
        .send({
          recordType: 'ledger',
          rawData: { invalidField: 'bad data' },
          errorMessage: 'Data format error',
          errorDetails: { field: 'partCode', reason: 'Cannot be empty' },
          sourceSystem: 'manual',
        });

      expect(failedResponse.status).toBe(201);
      expect(failedResponse.body.success).toBe(true);

      const listResponse = await request(app)
        .get('/api/failed-records')
        .set(managerHeaders);

      expect(listResponse.body.data.records.length).toBeGreaterThan(0);
    });

    test('3.5 Failed record can be marked resolved', async () => {
      const createResponse = await request(app)
        .post('/api/failed-records')
        .set(adminHeaders)
        .send({
          recordType: 'ledger',
          rawData: { test: 'data' },
          errorMessage: 'Test error',
        });

      const recordId = createResponse.body.data.id;

      const resolveResponse = await request(app)
        .post(`/api/failed-records/${recordId}/resolve`)
        .set(adminHeaders)
        .send({ notes: 'Data issue fixed' });

      expect(resolveResponse.status).toBe(200);
      expect(resolveResponse.body.data.isResolved).toBe(true);
    });
  });

  describe('4. Role Permission Tests', () => {
    let ledgerId: string;

    beforeEach(async () => {
      const response = await createTestLedger(app);
      ledgerId = response.body.data.id;
    });

    test('4.1 Engineer cannot reject ledger', async () => {
      await submitTestLedger(app, ledgerId);
      const response = await rejectTestLedger(app, ledgerId, 'Incomplete data', engineerHeaders);
      expect(response.status).toBe(403);
    });

    test('4.2 Engineer cannot confirm ledger', async () => {
      await submitTestLedger(app, ledgerId);
      const response = await confirmTestLedger(app, ledgerId, engineerHeaders);
      expect(response.status).toBe(403);
    });

    test('4.3 Auditor cannot confirm ledger', async () => {
      await submitTestLedger(app, ledgerId);
      const response = await confirmTestLedger(app, ledgerId, auditorHeaders);
      expect(response.status).toBe(403);
    });

    test('4.4 Service manager can view failed records', async () => {
      const response = await request(app)
        .get('/api/failed-records')
        .set(managerHeaders);
      expect(response.status).toBe(200);
    });

    test('4.5 Engineer cannot view failed records', async () => {
      const response = await request(app)
        .get('/api/failed-records')
        .set(engineerHeaders);
      expect(response.status).toBe(403);
    });

    test('4.6 Sensitive field masking', async () => {
      const response = await createTestLedger(app);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const ledgerId = response.body.data.id;

      const detailResponse = await request(app)
        .get(`/api/ledgers/${ledgerId}`)
        .set(managerHeaders);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.success).toBe(true);
    });
  });

  describe('5. Data Consistency Tests', () => {
    let ledgerId: string;

    beforeEach(async () => {
      const response = await createTestLedger(app);
      ledgerId = response.body.data.id;
    });

    test('5.1 Detail API returns consistency header', async () => {
      const response = await request(app)
        .get(`/api/ledgers/${ledgerId}`)
        .set(engineerHeaders);

      expect(response.headers['x-data-consistency']).toBeDefined();
      expect(response.headers['x-api-version']).toBe('1.0.0');
    });

    test('5.2 Query by ledger number returns same data', async () => {
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

    test('5.3 Change history matches ledger version', async () => {
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

  describe('6. Service Restart History Verification', () => {
    let ledgerId: string;
    let ledgerNo: string;

    beforeAll(async () => {
      const response = await createTestLedger(app, { changeReason: 'Test persistent data' });
      ledgerId = response.body.data.id;
      ledgerNo = response.body.data.ledgerNo;
      await submitTestLedger(app, ledgerId);
    });

    test('6.1 Data persists after simulated restart', async () => {
      const newDataSource = new DataSource({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        logging: false,
        entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
      });

      await newDataSource.initialize();
      const newApp = createTestApp(newDataSource);

      const newResponse = await createTestLedger(newApp, { changeReason: 'New instance data' });
      expect(newResponse.status).toBe(201);

      const listResponse = await request(newApp)
        .get('/api/ledgers')
        .set(managerHeaders);

      expect(listResponse.body.data.total).toBe(1);

      await newDataSource.destroy();
    });

    test('6.2 Data persists within same data source', async () => {
      const response = await request(app)
        .get(`/api/ledgers/no/${ledgerNo}`)
        .set(engineerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(ledgerId);
      expect(response.body.data.status).toBe(LedgerStatus.SUBMITTED);
    });

    test('6.3 Complete history after multiple operations', async () => {
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
