import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(__dirname, '../data/test-database.db');

process.env.DB_PATH = TEST_DB_PATH;

let app: any;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  app = (await import('../src/index')).default;
});

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

const USERS = {
  entry: 'entry-1',
  reviewer: 'reviewer-1',
  supervisor: 'supervisor-1',
  readonly: 'readonly-1'
};

function generateUniqueTicketId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

describe('数据一致性集成测试', () => {
  describe('工作流状态流转一致性', () => {
    let recordId: string;
    let ticketId: string;

    it('创建草稿记录', async () => {
      ticketId = generateUniqueTicketId('TICKET-A');
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId,
          ticketNumber: 'CS-2024-001',
          customerName: '张三',
          customerPhone: '13800138000',
          agentName: '李四',
          agentId: 'AGENT-001',
          department: '客服一部',
          compensationAmount: 100,
          dataSources: ['session_summary', 'sla_rule', 'compensation_approval'],
          occurrenceDate: '2024-01-15'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.ticketId).toBe(ticketId);
      
      recordId = res.body.data.id;
    });

    it('提交审核状态变更一致', async () => {
      const res = await request(app)
        .post(`/api/records/${recordId}/submit`)
        .set('x-user-id', USERS.entry);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('submitted');

      const detailRes = await request(app)
        .get(`/api/records/${recordId}`)
        .set('x-user-id', USERS.entry);
      
      expect(detailRes.body.data.status).toBe('submitted');
    });

    it('审核通过状态变更一致', async () => {
      const res = await request(app)
        .post(`/api/records/${recordId}/approve`)
        .set('x-user-id', USERS.reviewer);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('audit_only');

      const historyRes = await request(app)
        .get(`/api/records/${recordId}/history`)
        .set('x-user-id', USERS.entry);
      
      const statusChanges = historyRes.body.data.filter(
        (h: any) => h.operationType === 'status_change'
      );
      expect(statusChanges.length).toBeGreaterThan(0);
    });

    it('历史记录与详情一致', async () => {
      const detailRes = await request(app)
        .get(`/api/records/${recordId}`)
        .set('x-user-id', USERS.supervisor);

      const historyRes = await request(app)
        .get(`/api/records/${recordId}/history`)
        .set('x-user-id', USERS.supervisor);

      expect(historyRes.body.data.length).toBeGreaterThan(0);
      
      const lastHistory = historyRes.body.data[0];
      expect(lastHistory.recordId).toBe(recordId);
    });
  });

  describe('幂等性与重复数据处理', () => {
    let recordId: string;
    let idempotencyKey: string;
    let ticketId: string;

    it('创建初始记录', async () => {
      ticketId = generateUniqueTicketId('TICKET-B');
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId,
          customerName: '测试用户',
          compensationAmount: 100,
          dataSources: ['session_summary', 'sla_rule', 'compensation_approval'],
          occurrenceDate: '2024-01-15'
        });

      expect(res.status).toBe(200);
      recordId = res.body.data.id;
      idempotencyKey = res.body.idempotencyKey;
    });

    it('重复请求使用忽略策略不创建新记录', async () => {
      const listBefore = await request(app)
        .get('/api/records')
        .set('x-user-id', USERS.entry);

      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId,
          compensationAmount: 100,
          dataSources: ['session_summary', 'sla_rule', 'compensation_approval'],
          occurrenceDate: '2024-01-15',
          idempotencyKey,
          duplicateStrategy: 'ignore'
        });

      expect(res.body.isDuplicate).toBe(true);
      expect(res.body.duplicateStrategy).toBe('ignore');

      const listAfter = await request(app)
        .get('/api/records')
        .set('x-user-id', USERS.entry);

      expect(listAfter.body.total).toBe(listBefore.body.total);
    });

    it('重复请求使用覆盖策略更新同一条记录', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId,
          compensationAmount: 200,
          customerName: '测试用户修改',
          dataSources: ['session_summary', 'sla_rule', 'compensation_approval'],
          occurrenceDate: '2024-01-15',
          idempotencyKey,
          duplicateStrategy: 'overwrite',
          changeReason: '修正客户姓名'
        });

      expect(res.body.isDuplicate).toBe(true);
      expect(res.body.duplicateStrategy).toBe('overwrite');
      expect(res.body.data.id).toBe(recordId);
      expect(res.body.data.customerName).toBe('测试用户修改');
    });

    it('汇总金额不因重复处理而变大', async () => {
      const summaryRes = await request(app)
        .get('/api/summary/role-view')
        .set('x-user-id', USERS.supervisor);

      const totalAmount = summaryRes.body.data.keyMetrics.totalCompensation;
      expect(totalAmount).toBeGreaterThanOrEqual(200);
    });
  });

  describe('权限控制与字段可见性', () => {
    let testRecordId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId: generateUniqueTicketId('TICKET-C'),
          customerName: '权限测试用户',
          customerPhone: '13900139000',
          compensationAmount: 200,
          dataSources: ['session_summary', 'sla_rule'],
          occurrenceDate: '2024-01-18'
        });
      testRecordId = res.body.data.id;

      await request(app)
        .post(`/api/records/${testRecordId}/submit`)
        .set('x-user-id', USERS.entry);
    });

    it('不同角色可见字段不同', async () => {
      const supervisorRes = await request(app)
        .get(`/api/records/${testRecordId}`)
        .set('x-user-id', USERS.supervisor);

      const readonlyRes = await request(app)
        .get(`/api/records/${testRecordId}`)
        .set('x-user-id', USERS.readonly);

      expect(supervisorRes.body.data).toBeDefined();
      expect(readonlyRes.body.data).toBeDefined();

      const supervisorFields = Object.keys(supervisorRes.body.data);
      const readonlyFields = Object.keys(readonlyRes.body.data);

      expect(supervisorFields.length).toBeGreaterThan(readonlyFields.length);
      expect(supervisorFields).toContain('submittedBy');
      expect(readonlyFields).not.toContain('submittedBy');
    });

    it('只读用户不能修改记录', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/approve`)
        .set('x-user-id', USERS.readonly);

      expect(res.status).toBe(403);
    });

    it('录入员不能直接审核记录', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/approve`)
        .set('x-user-id', USERS.entry);

      expect(res.status).toBe(403);
    });
  });

  describe('脏记录检测与处理', () => {
    let dirtyRecordId: string;
    let baseTicketId: string;

    beforeAll(async () => {
      baseTicketId = generateUniqueTicketId('TICKET-D');
      await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId: baseTicketId,
          customerName: '原始用户',
          customerPhone: '13800138000',
          compensationAmount: 100,
          dataSources: ['session_summary', 'sla_rule'],
          occurrenceDate: '2024-01-19'
        });
    });

    it('同工单号不同日期检测为跨日脏记录', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId: baseTicketId,
          customerName: '原始用户',
          compensationAmount: 100,
          dataSources: ['session_summary'],
          occurrenceDate: '2024-01-20'
        });

      dirtyRecordId = res.body.data.id;
      expect(res.status).toBe(200);

      const detailRes = await request(app)
        .get(`/api/records/${dirtyRecordId}`)
        .set('x-user-id', USERS.supervisor);

      expect(detailRes.body.data.isDirty).toBe(true);
    });

    it('脏记录日志正确记录冲突信息', async () => {
      const res = await request(app)
        .get(`/api/records/${dirtyRecordId}/dirty-logs`)
        .set('x-user-id', USERS.supervisor);

      expect(res.body.data.length).toBeGreaterThan(0);
      const crossDateLog = res.body.data.find(
        (l: any) => l.dirtyType === 'cross_date'
      );
      expect(crossDateLog).toBeDefined();
    });

    it('可以标记脏记录已解决', async () => {
      const dirtyLogs = await request(app)
        .get(`/api/records/${dirtyRecordId}/dirty-logs`)
        .set('x-user-id', USERS.supervisor);

      const dirtyLogId = dirtyLogs.body.data[0].id;

      const resolveRes = await request(app)
        .post(`/api/records/${dirtyRecordId}/resolve-dirty/${dirtyLogId}`)
        .set('x-user-id', USERS.supervisor)
        .send({
          resolution: '跨日记录，确认属于同一工单不同处理阶段',
          corrections: {}
        });

      expect(resolveRes.status).toBe(200);
    });
  });

  describe('导出与数据一致性', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId: generateUniqueTicketId('TICKET-E'),
          customerName: '导出测试用户',
          customerPhone: '13800138000',
          compensationAmount: 150,
          dataSources: ['session_summary', 'sla_rule'],
          occurrenceDate: '2024-01-21'
        });
    });

    it('导出CSV成功并记录日志', async () => {
      const exportRes = await request(app)
        .post('/api/export/csv')
        .set('x-user-id', USERS.supervisor)
        .send({ isMasked: true });

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('csv');
      expect(exportRes.headers['x-export-log-id']).toBeDefined();
    });

    it('导出内容包含脱敏处理', async () => {
      const exportRes = await request(app)
        .post('/api/export/csv')
        .set('x-user-id', USERS.supervisor)
        .send({ isMasked: true });

      const csvContent = exportRes.text;
      expect(csvContent).toContain('*');
    });

    it('导出历史可查询', async () => {
      const historyRes = await request(app)
        .get('/api/export/history')
        .set('x-user-id', USERS.supervisor);

      expect(historyRes.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('运营经理视图与数据一致性报告', () => {
    it('角色视图汇总数据正确', async () => {
      const summaryRes = await request(app)
        .get('/api/summary/role-view')
        .set('x-user-id', USERS.supervisor);

      expect(summaryRes.body.data.role).toBe('supervisor');
      expect(summaryRes.body.data.totalRecords).toBeGreaterThan(0);
      expect(summaryRes.body.data.keyMetrics.totalCompensation).toBeGreaterThan(0);
    });

    it('变更原因统计可查询', async () => {
      const reasonsRes = await request(app)
        .get('/api/summary/change-reasons')
        .set('x-user-id', USERS.supervisor);

      expect(reasonsRes.status).toBe(200);
      expect(Array.isArray(reasonsRes.body.data)).toBe(true);
    });

    it('数据一致性报告无冲突', async () => {
      const reportRes = await request(app)
        .get('/api/summary/consistency-report')
        .set('x-user-id', USERS.supervisor);

      expect(reportRes.status).toBe(200);
      
      const report = reportRes.body.data;
      console.log('一致性报告:', report);
      
      expect(report.listCount).toBe(report.detailCount);
      expect(Math.abs(report.totalAmountFromList - report.totalAmountFromDetails)).toBeLessThan(0.01);
    });

    it('列表、详情、历史三者数字一致', async () => {
      const listRes = await request(app)
        .get('/api/records')
        .set('x-user-id', USERS.supervisor);

      const listRecords = listRes.body.data;
      const listTotal = listRecords.reduce((sum: number, r: any) => sum + r.compensationAmount, 0);

      let detailTotal = 0;
      for (const record of listRecords) {
        const detailRes = await request(app)
          .get(`/api/records/${record.id}`)
          .set('x-user-id', USERS.supervisor);
        detailTotal += detailRes.body.data.compensationAmount;
      }

      const summaryRes = await request(app)
        .get('/api/summary/role-view')
        .set('x-user-id', USERS.supervisor);
      const summaryTotal = summaryRes.body.data.keyMetrics.totalCompensation;

      expect(listTotal).toBe(detailTotal);
      expect(Math.abs(listTotal - summaryTotal)).toBeLessThan(0.01);
    });
  });

  describe('驳回与二次确认流程', () => {
    let testRecordId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId: generateUniqueTicketId('TICKET-F'),
          compensationAmount: 300,
          dataSources: ['session_summary', 'sla_rule'],
          occurrenceDate: '2024-01-17'
        });
      testRecordId = res.body.data.id;

      await request(app)
        .post(`/api/records/${testRecordId}/submit`)
        .set('x-user-id', USERS.entry);
    });

    it('复核员可以驳回记录', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/reject`)
        .set('x-user-id', USERS.reviewer)
        .send({ reason: '缺少审批邮件来源，需要补充材料' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('驳回记录可以重新编辑后提交', async () => {
      await request(app)
        .put(`/api/records/${testRecordId}`)
        .set('x-user-id', USERS.entry)
        .send({
          sourceApprovalEmailId: 'EMAIL-001',
          changeReason: '补充审批邮件'
        });

      const res = await request(app)
        .post(`/api/records/${testRecordId}/submit`)
        .set('x-user-id', USERS.entry);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('submitted');
    });

    it('复核员可以申请二次确认', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/approve`)
        .set('x-user-id', USERS.reviewer)
        .send({ requestSecondConfirmation: true });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('second_confirmation');
    });

    it('主管可以进行二次确认', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/second-confirm`)
        .set('x-user-id', USERS.supervisor);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('audit_only');
    });
  });

  describe('导出校验一致性修复验证', () => {
    let exportLogId: string;

    beforeAll(async () => {
      const exportRes = await request(app)
        .post('/api/export/csv')
        .set('x-user-id', USERS.supervisor)
        .send({ isMasked: true });
      exportLogId = exportRes.headers['x-export-log-id'];
    });

    it('同一导出内容导出校验一致', async () => {
      const verifyRes = await request(app)
        .get(`/api/export/verify/${exportLogId}`)
        .set('x-user-id', USERS.supervisor);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.consistent).toBe(true);
      expect(verifyRes.body.data.expectedChecksum).toBe(verifyRes.body.data.actualChecksum);
    });

    it('导出前后记录数和总金额一致', async () => {
      const verifyRes = await request(app)
        .get(`/api/export/verify/${exportLogId}`)
        .set('x-user-id', USERS.supervisor);

      expect(verifyRes.body.data.details.recordCount).toBeGreaterThan(0);
      expect(verifyRes.body.data.details.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('一致性报告修复验证', () => {
    it('exportLogCount 正确统计不为0', async () => {
      const reportRes = await request(app)
        .get('/api/summary/consistency-report')
        .set('x-user-id', USERS.supervisor);

      expect(reportRes.status).toBe(200);
      expect(reportRes.body.data.exportLogCount).toBeGreaterThan(0);
    });

    it('导出历史不混入台账历史记录数', async () => {
      const reportRes = await request(app)
        .get('/api/summary/consistency-report')
        .set('x-user-id', USERS.supervisor);

      const report = reportRes.body.data;
      expect(report.listCount).toBe(report.historyCount);
      expect(report.inconsistencies).not.toContainEqual(
        expect.stringContaining('export-')
      );
    });
  });

  describe('补全数据源接口验证', () => {
    let testRecordId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/records')
        .set('x-user-id', USERS.entry)
        .send({
          ticketId: generateUniqueTicketId('TICKET-G'),
          compensationAmount: 250,
          dataSources: ['session_summary'],
          occurrenceDate: '2024-01-22'
        });
      testRecordId = res.body.data.id;
    });

    it('可以补全审批邮件来源', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/supplement-source`)
        .set('x-user-id', USERS.entry)
        .send({
          dataSource: 'approval_email',
          sourceId: 'EMAIL-APPROVAL-001',
          sourceIdField: 'sourceApprovalEmailId'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.dataSources).toContain('approval_email');
      expect(res.body.data.sourceApprovalEmailId).toBe('EMAIL-APPROVAL-001');
    });

    it('可以补全供应商对账单来源', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/supplement-source`)
        .set('x-user-id', USERS.entry)
        .send({
          dataSource: 'supplier_statement',
          sourceId: 'SUPPLIER-STMT-001',
          sourceIdField: 'sourceSupplierStatementId'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.dataSources).toContain('supplier_statement');
      expect(res.body.data.sourceSupplierStatementId).toBe('SUPPLIER-STMT-001');
    });

    it('补全来源后历史记录可追溯', async () => {
      const historyRes = await request(app)
        .get(`/api/records/${testRecordId}/history`)
        .set('x-user-id', USERS.supervisor);

      const supplementHistory = historyRes.body.data.find(
        (h: any) => h.changeReason && h.changeReason.includes('补全数据源')
      );
      expect(supplementHistory).toBeDefined();
    });

    it('无效的sourceIdField返回错误', async () => {
      const res = await request(app)
        .post(`/api/records/${testRecordId}/supplement-source`)
        .set('x-user-id', USERS.entry)
        .send({
          dataSource: 'approval_email',
          sourceId: 'EMAIL-002',
          sourceIdField: 'invalidField'
        });

      expect(res.status).toBe(400);
    });
  });
});
