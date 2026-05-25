import request from 'supertest';
import app from '../src/app';
import { initDatabase, db } from '../src/db';
import { ExceptionType, ExceptionStatus, Role } from '../src/types';
import { v4 as uuidv4 } from 'uuid';

beforeAll(async () => {
  process.env.DB_PATH = ':memory:';
  await initDatabase();
});

afterAll(async () => {
  await db.destroy();
});

const authHeaders = {
  'x-user-id': 'admin001',
  'x-user-name': 'Admin User',
  'x-user-role': Role.ADMIN,
};

const reviewerHeaders = {
  'x-user-id': 'reviewer001',
  'x-user-name': 'Reviewer User',
  'x-user-role': Role.REVIEWER,
};

const operatorHeaders = {
  'x-user-id': 'operator001',
  'x-user-name': 'Operator User',
  'x-user-role': Role.OPERATOR,
};

describe('API Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('library-interlibrary-loan-exception');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without auth headers', async () => {
      const res = await request(app).get('/api/exceptions/receipts');
      expect(res.status).toBe(401);
    });

    it('should reject requests with invalid role', async () => {
      const res = await request(app)
        .get('/api/exceptions/receipts')
        .set({
          'x-user-id': 'user001',
          'x-user-name': 'Test User',
          'x-user-role': 'invalid_role',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Exception Receipts', () => {
    let receiptId: string;
    let batchId: string;

    it('should batch create receipts', async () => {
      const res = await request(app)
        .post('/api/exceptions/batch')
        .set(authHeaders)
        .send({
          batchName: '测试批次',
          records: [
            {
              borrowApplication: {
                id: uuidv4(),
                applicationNo: 'APP001',
                readerId: 'R001',
                readerName: '张三',
                bookId: 'B001',
                bookTitle: '计算机网络',
                sourceLibrary: '图书馆A',
                targetLibrary: '图书馆B',
                applyDate: new Date().toISOString(),
                status: 'exception',
              },
              exceptionType: ExceptionType.OVERDUE,
              amount: 50,
              reason: '逾期30天未还',
            },
            {
              borrowApplication: {
                id: uuidv4(),
                applicationNo: 'APP002',
                readerId: 'R002',
                readerName: '李四',
                bookId: 'B002',
                bookTitle: '数据库原理',
                sourceLibrary: '图书馆A',
                targetLibrary: '图书馆B',
                applyDate: new Date().toISOString(),
                status: 'exception',
              },
              exceptionType: ExceptionType.DAMAGED,
              amount: 100,
              reason: '图书封面损坏',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCount).toBe(2);
      expect(res.body.data.successCount).toBe(2);
      expect(res.body.data.failedCount).toBe(0);
      expect(res.body.data.receiptIds.length).toBe(2);

      receiptId = res.body.data.receiptIds[0];
      batchId = res.body.data.batchId;
    });

    it('should get receipts list', async () => {
      const res = await request(app)
        .get('/api/exceptions/receipts')
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(2);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter receipts by status', async () => {
      const res = await request(app)
        .get('/api/exceptions/receipts?status=pending_review')
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(2);
    });

    it('should get receipt by id', async () => {
      const res = await request(app)
        .get(`/api/exceptions/receipts/${receiptId}`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(receiptId);
      expect(res.body.data.status).toBe(ExceptionStatus.PENDING_REVIEW);
    });

    it('should get receipt detail', async () => {
      const res = await request(app)
        .get(`/api/exceptions/receipts/${receiptId}/detail`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt.id).toBe(receiptId);
      expect(res.body.data).toHaveProperty('history');
    });

    it('should approve receipt', async () => {
      const res = await request(app)
        .post(`/api/exceptions/receipts/${receiptId}/review`)
        .set(reviewerHeaders)
        .send({
          approved: true,
          reviewComment: '情况属实，予以通过',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ExceptionStatus.APPROVED);
    });

    it('should freeze receipt', async () => {
      const res = await request(app)
        .post(`/api/exceptions/receipts/${receiptId}/freeze`)
        .set(authHeaders)
        .send({
          frozenReason: '发现异常，需要进一步核实',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ExceptionStatus.FROZEN);
      expect(res.body.data.statusBeforeFreeze).toBe(ExceptionStatus.APPROVED);
    });

    it('should unfreeze receipt', async () => {
      const res = await request(app)
        .post(`/api/exceptions/receipts/${receiptId}/unfreeze`)
        .set(authHeaders)
        .send({
          targetStatus: ExceptionStatus.APPROVED,
          reason: '核实无误，恢复状态',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ExceptionStatus.APPROVED);
    });

    it('should not allow freeze by non-admin', async () => {
      const res = await request(app)
        .post(`/api/exceptions/receipts/${receiptId}/freeze`)
        .set(reviewerHeaders)
        .send({
          frozenReason: '测试冻结',
        });

      expect(res.status).toBe(403);
    });

    it('should cancel receipt', async () => {
      const res = await request(app)
        .post(`/api/exceptions/receipts/${receiptId}/cancel`)
        .set(authHeaders)
        .send({
          reason: '经核实为误报，予以撤销',
          archive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ExceptionStatus.CANCELLED);
    });

    it('should get receipt history', async () => {
      const res = await request(app)
        .get(`/api/exceptions/receipts/${receiptId}/history`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should get batch info', async () => {
      const res = await request(app)
        .get(`/api/exceptions/batches/${batchId}`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(batchId);
    });

    it('should get batch receipts', async () => {
      const res = await request(app)
        .get(`/api/exceptions/batches/${batchId}/receipts`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('Reports', () => {
    it('should get summary report', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalReceipts');
      expect(res.body.data).toHaveProperty('byStatus');
      expect(res.body.data).toHaveProperty('byType');
      expect(res.body.data).toHaveProperty('totalAmount');
    });

    it('should run auto-check', async () => {
      const res = await request(app)
        .post('/api/reports/auto-check')
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should get auto-check results', async () => {
      const res = await request(app)
        .get('/api/reports/auto-check/results')
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should not allow auto-check by non-admin', async () => {
      const res = await request(app)
        .post('/api/reports/auto-check')
        .set(operatorHeaders);

      expect(res.status).toBe(403);
    });
  });

  describe('Permission Tests', () => {
    it('should allow operator to create batch', async () => {
      const res = await request(app)
        .post('/api/exceptions/batch')
        .set(operatorHeaders)
        .send({
          records: [
            {
              borrowApplication: {
                id: uuidv4(),
                applicationNo: 'APP003',
                readerId: 'R003',
                readerName: '王五',
                bookId: 'B003',
                bookTitle: '操作系统',
                sourceLibrary: '图书馆A',
                targetLibrary: '图书馆B',
                applyDate: new Date().toISOString(),
                status: 'exception',
              },
              exceptionType: ExceptionType.OVERDUE,
              amount: 30,
              reason: '逾期15天',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not allow operator to review', async () => {
      const createRes = await request(app)
        .post('/api/exceptions/batch')
        .set(authHeaders)
        .send({
          records: [
            {
              borrowApplication: {
                id: uuidv4(),
                applicationNo: 'APP004',
                readerId: 'R004',
                readerName: '赵六',
                bookId: 'B004',
                bookTitle: '数据结构',
                sourceLibrary: '图书馆A',
                targetLibrary: '图书馆B',
                applyDate: new Date().toISOString(),
                status: 'exception',
              },
              exceptionType: ExceptionType.OTHER,
              amount: 20,
              reason: '其他异常',
            },
          ],
        });

      const receiptId = createRes.body.data.receiptIds[0];

      const res = await request(app)
        .post(`/api/exceptions/receipts/${receiptId}/review`)
        .set(operatorHeaders)
        .send({
          approved: true,
          reviewComment: '测试',
        });

      expect(res.status).toBe(403);
    });
  });
});
