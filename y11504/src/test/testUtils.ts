import { DataSource } from 'typeorm';
import request from 'supertest';
import express from 'express';
import { createRoutes } from '../routes';
import { UserRole } from '../types/enums';

export const createTestApp = (dataSource: DataSource) => {
  const app = express();
  app.use(express.json());
  app.use('/api', createRoutes(dataSource));
  return app;
};

export const authHeaders = (role: UserRole, userId: string = 'test-user', userName: string = 'Test User') => ({
  'x-user-id': userId,
  'x-user-name': userName,
  'x-user-role': role,
});

export const engineerHeaders = authHeaders(UserRole.ENGINEER, 'ENG001', 'ZhangEngineer');
export const managerHeaders = authHeaders(UserRole.SERVICE_MANAGER, 'MGR001', 'LiManager');
export const auditorHeaders = authHeaders(UserRole.AUDITOR, 'AUD001', 'WangAuditor');
export const adminHeaders = authHeaders(UserRole.ADMIN, 'ADM001', 'ZhaoAdmin');

export const createTestLedger = async (
  app: express.Express,
  data: any = {}
): Promise<request.Response> => {
  return request(app)
    .post('/api/ledgers')
    .set(engineerHeaders)
    .send({
      engineerId: 'ENG001',
      engineerName: 'ZhangEngineer',
      partScans: [
        {
          partCode: 'PART001',
          partName: 'TestPart',
          quantity: 2,
        },
      ],
      receiptPhotos: [
        {
          photoUrl: 'https://example.com/photo1.jpg',
          description: 'CustomerReceiptPhoto',
        },
      ],
      ...data,
    });
};

export const submitTestLedger = async (
  app: express.Express,
  ledgerId: string,
  headers: any = engineerHeaders
): Promise<request.Response> => {
  return request(app)
    .post(`/api/ledgers/${ledgerId}/submit`)
    .set(headers)
    .send({ changeReason: '提交审核' });
};

export const confirmTestLedger = async (
  app: express.Express,
  ledgerId: string,
  headers: any = managerHeaders
): Promise<request.Response> => {
  return request(app)
    .post(`/api/ledgers/${ledgerId}/confirm`)
    .set(headers)
    .send({ changeReason: '确认通过' });
};

export const rejectTestLedger = async (
  app: express.Express,
  ledgerId: string,
  reason: string = '数据不全',
  headers: any = managerHeaders
): Promise<request.Response> => {
  return request(app)
    .post(`/api/ledgers/${ledgerId}/reject`)
    .set(headers)
    .send({ rejectReason: reason, changeReason: '驳回申请' });
};

export const auditTestLedger = async (
  app: express.Express,
  ledgerId: string,
  headers: any = auditorHeaders
): Promise<request.Response> => {
  return request(app)
    .post(`/api/ledgers/${ledgerId}/audit`)
    .set(headers)
    .send({ changeReason: '审计完成' });
};
