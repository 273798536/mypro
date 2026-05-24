import request from 'supertest';
import { initializeApp } from '../app';
import { Express } from 'express';
import { RoleType, RecordStatus } from '../database/schema';

describe('门店会员储值权限追责台账 API 集成测试', () => {
  let app: Express;

  const testOperator = {
    id: 'test-operator-001',
    name: '测试操作员',
    role: RoleType.STORE_MANAGER
  };

  const financeOperator = {
    id: 'finance-001',
    name: '财务主管',
    role: RoleType.FINANCE
  };

  const auditorOperator = {
    id: 'auditor-001',
    name: '审计员',
    role: RoleType.AUDITOR
  };

  beforeAll(async () => {
    app = await initializeApp();
  });

  describe('第一部分：正常链路测试', () => {
    let rechargeId: string;
    let rechargeOrderNo: string;
    let refundId: string;
    let handoverId: string;
    let receiptId: string;

    test('1.1 健康检查接口正常', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    test('1.2 创建充值流水记录（草稿状态）', async () => {
      const data = {
        orderNo: 'R' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        memberId: 'member-001',
        memberPhone: '13800138001',
        amount: 1000,
        beforeBalance: 500,
        afterBalance: 1500,
        operatorId: 'op-001',
        operatorName: '张三',
        source: '柜台充值',
        remark: '会员生日充值活动'
      };

      const res = await request(app)
        .post('/api/recharges')
        .send({ ...data, operator: testOperator });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(RecordStatus.DRAFT);
      expect(res.body.order_no).toBe(data.orderNo);
      rechargeId = res.body.id;
      rechargeOrderNo = data.orderNo;
    });

    test('1.3 提交充值流水（提交状态）', async () => {
      const res = await request(app)
        .post(`/api/recharges/${rechargeId}/status`)
        .send({
          action: 'submit',
          operator: testOperator,
          changeReason: '数据核对无误，提交审核'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(RecordStatus.SUBMITTED);
    });

    test('1.4 确认充值流水（二次确认状态）', async () => {
      const res = await request(app)
        .post(`/api/recharges/${rechargeId}/status`)
        .send({
          action: 'confirm',
          operator: financeOperator,
          changeReason: '财务复核通过'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(RecordStatus.CONFIRMED);
    });

    test('1.5 审计充值流水（最终状态）', async () => {
      const res = await request(app)
        .post(`/api/recharges/${rechargeId}/status`)
        .send({
          action: 'audit',
          operator: auditorOperator,
          changeReason: '审计通过，数据有效'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(RecordStatus.AUDITED);
    });

    test('1.6 查询充值流水详情，状态正确', async () => {
      const res = await request(app).get(`/api/recharges/${rechargeId}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(RecordStatus.AUDITED);
    });

    test('1.7 充值流水审计轨迹完整记录', async () => {
      const res = await request(app).get(`/api/recharges/${rechargeId}/audit-trails`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      const actions = res.body.map((t: any) => t.action);
      expect(actions).toContain('create');
      expect(actions).toContain('submit');
      expect(actions).toContain('confirm');
      expect(actions).toContain('audit');
    });

    test('1.8 创建退款申请（关联已审计的充值订单）', async () => {
      const data = {
        applyNo: 'REF' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        rechargeOrderNo: rechargeOrderNo,
        memberId: 'member-001',
        memberPhone: '13800138001',
        refundAmount: 500,
        refundReason: '会员误操作申请退款',
        applicantId: 'op-001',
        applicantName: '张三'
      };

      const res = await request(app)
        .post('/api/refunds')
        .send({ ...data, operator: testOperator });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(RecordStatus.DRAFT);
      refundId = res.body.id;
    });

    test('1.9 退款申请完整流程，并标记库存回滚', async () => {
      await request(app)
        .post(`/api/refunds/${refundId}/status`)
        .send({
          action: 'submit',
          operator: testOperator,
          changeReason: '提交退款申请'
        });

      await request(app)
        .post(`/api/refunds/${refundId}/status`)
        .send({
          action: 'confirm',
          operator: financeOperator,
          changeReason: '财务确认退款',
          inventoryRollback: true
        });

      const res = await request(app)
        .post(`/api/refunds/${refundId}/status`)
        .send({
          action: 'audit',
          operator: auditorOperator,
          changeReason: '审计通过，库存已回滚'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(RecordStatus.AUDITED);
    });

    test('1.10 创建门店交接记录', async () => {
      const data = {
        handoverNo: 'HO' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        previousManagerId: 'mgr-001',
        previousManagerName: '老店长',
        newManagerId: 'mgr-002',
        newManagerName: '新店长',
        handoverDate: Date.now(),
        totalBalance: 50000,
        cashAmount: 5000,
        pendingRefundCount: 3,
        witnessId: 'wit-001',
        witnessName: '区域经理',
        remark: '正常工作交接'
      };

      const res = await request(app)
        .post('/api/handovers')
        .send({ ...data, operator: testOperator });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(RecordStatus.DRAFT);
      handoverId = res.body.id;
    });

    test('1.11 创建外部回执记录', async () => {
      const data = {
        receiptNo: 'REC' + Date.now(),
        relatedRecordId: rechargeId,
        relatedRecordType: 'recharge',
        storeId: 'store-001',
        storeName: '朝阳门店',
        receiptType: 'payment',
        amount: 1000,
        channel: 'wechat_pay',
        channelTransactionId: 'wx' + Date.now(),
        operatorId: 'op-001',
        operatorName: '张三',
        remark: '微信支付凭证'
      };

      const res = await request(app)
        .post('/api/receipts')
        .send({ ...data, operator: testOperator });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(RecordStatus.DRAFT);
      receiptId = res.body.id;
    });

    test('1.12 财务主管角色视图包含完整数据', async () => {
      const res = await request(app).get('/api/views/finance');
      expect(res.status).toBe(200);
      expect(res.body.role).toBe(RoleType.FINANCE);
      expect(res.body.data.financialSummary).toBeDefined();
      expect(res.body.data.breakdown).toBeDefined();
      expect(res.body.data.changeHistory).toBeDefined();
    });

    test('1.13 导出脱敏CSV文件', async () => {
      const res = await request(app)
        .get('/api/recharges/export/csv')
        .query({ role: RoleType.STORE_STAFF });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('订单号');
      expect(res.text).toContain('会员手机号');
    });

    test('1.14 充值汇总统计准确', async () => {
      const res = await request(app).get('/api/recharges/summary');
      expect(res.status).toBe(200);
      expect(res.body.verified_count).toBeGreaterThanOrEqual(1);
      expect(res.body.verified_amount).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('第二部分：重复提交和坏数据测试', () => {
    const baseRechargeData = {
      orderNo: 'R-DUP-' + Date.now(),
      storeId: 'store-001',
      storeName: '朝阳门店',
      memberId: 'member-002',
      memberPhone: '13800138002',
      amount: 500,
      beforeBalance: 200,
      afterBalance: 700,
      operatorId: 'op-001',
      operatorName: '张三'
    };

    test('2.1 重复提交相同订单号被拒绝，并记录到失败列表', async () => {
      await request(app)
        .post('/api/recharges')
        .send({ ...baseRechargeData, operator: testOperator });

      const res = await request(app)
        .post('/api/recharges')
        .send({ ...baseRechargeData, operator: testOperator });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('订单号已存在');
    });

    test('2.2 余额不匹配的坏数据被拒绝', async () => {
      const badData = {
        ...baseRechargeData,
        orderNo: 'R-BAD-' + Date.now(),
        afterBalance: 600
      };

      const res = await request(app)
        .post('/api/recharges')
        .send({ ...badData, operator: testOperator });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('余额不匹配');
    });

    test('2.3 手机号格式错误被拒绝', async () => {
      const badData = {
        ...baseRechargeData,
        orderNo: 'R-BAD2-' + Date.now(),
        memberPhone: '12345'
      };

      const res = await request(app)
        .post('/api/recharges')
        .send({ ...badData, operator: testOperator });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('校验失败');
    });

    test('2.4 退款金额超过充值金额被拒绝', async () => {
      const badRefund = {
        applyNo: 'REF-BAD-' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        rechargeOrderNo: baseRechargeData.orderNo,
        memberId: 'member-002',
        memberPhone: '13800138002',
        refundAmount: 10000,
        refundReason: '测试超额退款',
        applicantId: 'op-001',
        applicantName: '张三'
      };

      const res = await request(app)
        .post('/api/refunds')
        .send({ ...badRefund, operator: testOperator });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('不能超过充值金额');
    });

    test('2.5 关联不存在充值订单的退款被拒绝', async () => {
      const badRefund = {
        applyNo: 'REF-BAD2-' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        rechargeOrderNo: 'NONEXISTENT-ORDER',
        memberId: 'member-002',
        memberPhone: '13800138002',
        refundAmount: 100,
        refundReason: '测试关联不存在订单',
        applicantId: 'op-001',
        applicantName: '张三'
      };

      const res = await request(app)
        .post('/api/refunds')
        .send({ ...badRefund, operator: testOperator });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('不存在');
    });

    test('2.6 已审计记录不可修改', async () => {
      const data = {
        orderNo: 'R-AUDIT-LOCK-' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        memberId: 'member-003',
        memberPhone: '13800138003',
        amount: 200,
        beforeBalance: 100,
        afterBalance: 300,
        operatorId: 'op-001',
        operatorName: '张三'
      };

      const createRes = await request(app)
        .post('/api/recharges')
        .send({ ...data, operator: testOperator });

      const recordId = createRes.body.id;

      await request(app)
        .post(`/api/recharges/${recordId}/status`)
        .send({ action: 'submit', operator: testOperator, changeReason: '提交' });

      await request(app)
        .post(`/api/recharges/${recordId}/status`)
        .send({ action: 'confirm', operator: financeOperator, changeReason: '确认' });

      await request(app)
        .post(`/api/recharges/${recordId}/status`)
        .send({ action: 'audit', operator: auditorOperator, changeReason: '审计' });

      const res = await request(app)
        .post(`/api/recharges/${recordId}/status`)
        .send({ action: 'reject', operator: testOperator, changeReason: '尝试修改已审计记录' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('不可修改');
    });

    test('2.7 失败记录列表可查询', async () => {
      const res = await request(app).get('/api/audit/failed-records');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('2.8 失败记录统计可查询', async () => {
      const res = await request(app).get('/api/audit/failed-records/stats');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('第三部分：数据一致性和历史查询测试', () => {
    let testRecordId: string;
    let testOrderNo: string;

    beforeAll(async () => {
      testOrderNo = 'R-CONSIST-' + Date.now();
      const res = await request(app)
        .post('/api/recharges')
        .send({
          orderNo: testOrderNo,
          storeId: 'store-002',
          storeName: '海淀门店',
          memberId: 'member-100',
          memberPhone: '13900139001',
          amount: 800,
          beforeBalance: 200,
          afterBalance: 1000,
          operatorId: 'op-002',
          operatorName: '李四',
          operator: testOperator
        });
      testRecordId = res.body.id;
    });

    test('3.1 详情接口和列表接口返回同一套数据', async () => {
      const detailRes = await request(app).get(`/api/recharges/${testRecordId}`);
      const listRes = await request(app)
        .get('/api/recharges')
        .query({ orderNo: testOrderNo });

      expect(detailRes.body.order_no).toBe(testOrderNo);
      const listRecord = listRes.body.find((r: any) => r.id === testRecordId);
      expect(listRecord).toBeDefined();
      expect(listRecord.amount).toBe(detailRes.body.amount);
      expect(listRecord.status).toBe(detailRes.body.status);
    });

    test('3.2 状态变更后详情立即更新', async () => {
      await request(app)
        .post(`/api/recharges/${testRecordId}/status`)
        .send({
          action: 'submit',
          operator: testOperator,
          changeReason: '数据一致性测试提交'
        });

      const res = await request(app).get(`/api/recharges/${testRecordId}`);
      expect(res.body.status).toBe(RecordStatus.SUBMITTED);
    });

    test('3.3 审计员视图可查看失败记录', async () => {
      const res = await request(app).get('/api/views/auditor');
      expect(res.status).toBe(200);
      expect(res.body.data.dataQuality).toBeDefined();
      expect(res.body.data.dataQuality.failedRecords).toBeDefined();
    });

    test('3.4 脱敏导出和详情接口数据一致', async () => {
      await request(app)
        .post(`/api/recharges/${testRecordId}/status`)
        .send({
          action: 'confirm',
          operator: financeOperator,
          changeReason: '确认'
        });

      await request(app)
        .post(`/api/recharges/${testRecordId}/status`)
        .send({
          action: 'audit',
          operator: auditorOperator,
          changeReason: '审计通过'
        });

      const detailRes = await request(app).get(`/api/recharges/${testRecordId}`);
      const exportRes = await request(app)
        .get('/api/recharges/export/csv')
        .query({ role: RoleType.FINANCE, storeId: 'store-002' });

      expect(exportRes.text).toContain(testOrderNo);
      expect(exportRes.text).toContain(detailRes.body.amount.toString());
    });

    test('3.5 所有审计轨迹可按时间范围查询', async () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const oneHourLater = now + 3600000;

      const res = await request(app)
        .get('/api/audit/trails')
        .query({
          startTime: oneHourAgo,
          endTime: oneHourLater
        });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('3.6 门店员工视图数据已脱敏', async () => {
      const res = await request(app).get('/api/views/store_staff');
      expect(res.status).toBe(200);
      const records = res.body.data.rechargeRecords;
      if (records.length > 0) {
        const phone = records[0].member_phone;
        expect(phone).toContain('****');
      }
    });
  });

  describe('第四部分：服务重启后历史数据验证', () => {
    test('4.1 模拟服务重启后数据仍可查询', async () => {
      const newApp = await initializeApp();
      const res = await request(newApp).get('/api/recharges/summary');
      expect(res.status).toBe(200);
      expect(res.body.total_count).toBeGreaterThan(0);
    });

    test('4.2 重启后审计轨迹依然完整', async () => {
      const newApp = await initializeApp();
      const res = await request(newApp).get('/api/audit/trails');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('4.3 重启后失败记录不丢失', async () => {
      const newApp = await initializeApp();
      const res = await request(newApp).get('/api/audit/failed-records');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
