import request from 'supertest';
import app from '../server';
import { LedgerStatus } from '../types';

async function createTestAppointment(appointmentNo: string, batchNo: string = 'BATCH001') {
  const response = await request(app)
    .post('/api/ledger/import/appointment')
    .send({
      appointmentNo,
      batchNo,
      customerName: '测试用户',
      customerPhone: '13800138000',
      customerAddress: '测试地址123号',
      area: '北京',
      applianceType: '空调',
      appointmentTime: '2024-01-15 10:00:00',
      technicianId: 'TECH001',
      technicianName: '测试师傅',
      status: '已完成',
      operatorId: 'OP001',
      operatorName: '操作人',
    });
  return response;
}

describe('台账 API - 状态流转测试', () => {
  test('初始状态应为草稿(draft)', async () => {
    const createResp = await createTestAppointment('STATETEST001');
    expect(createResp.body.success).toBe(true);
    const ledgerId = createResp.body.data.ledgerId;

    const response = await request(app).get(`/api/ledger/detail/${ledgerId}`);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(LedgerStatus.DRAFT);
  });

  test('草稿状态可以提交(submitted)', async () => {
    const createResp = await createTestAppointment('STATETEST002');
    const ledgerId = createResp.body.data.ledgerId;

    const response = await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });
    expect(response.body.success).toBe(true);
    expect(response.body.data.ledger.status).toBe(LedgerStatus.SUBMITTED);
  });

  test('已提交状态可以驳回(rejected)', async () => {
    const createResp = await createTestAppointment('STATETEST003');
    const ledgerId = createResp.body.data.ledgerId;

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });

    const response = await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.REJECTED,
        changeReason: '资料不全，需要补充',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });
    expect(response.body.success).toBe(true);
    expect(response.body.data.ledger.status).toBe(LedgerStatus.REJECTED);
  });

  test('驳回状态可以重新提交', async () => {
    const createResp = await createTestAppointment('STATETEST004');
    const ledgerId = createResp.body.data.ledgerId;

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.REJECTED,
        changeReason: '资料不全，需要补充',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });

    const response = await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '已补充资料，重新提交',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });
    expect(response.body.success).toBe(true);
    expect(response.body.data.ledger.status).toBe(LedgerStatus.SUBMITTED);
  });

  test('已提交状态可以进入二次确认', async () => {
    const createResp = await createTestAppointment('STATETEST005');
    const ledgerId = createResp.body.data.ledgerId;

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });

    const response = await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SECOND_CONFIRM,
        changeReason: '需要与客户二次确认',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });
    expect(response.body.success).toBe(true);
    expect(response.body.data.ledger.status).toBe(LedgerStatus.SECOND_CONFIRM);
  });

  test('二次确认后可以进入只读审计', async () => {
    const createResp = await createTestAppointment('STATETEST006');
    const ledgerId = createResp.body.data.ledgerId;

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SECOND_CONFIRM,
        changeReason: '需要与客户二次确认',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });

    const response = await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.AUDIT_ONLY,
        changeReason: '确认无误，归档',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });
    expect(response.body.success).toBe(true);
    expect(response.body.data.ledger.status).toBe(LedgerStatus.AUDIT_ONLY);
  });

  test('状态变更历史应被记录', async () => {
    const createResp = await createTestAppointment('STATETEST007');
    const ledgerId = createResp.body.data.ledgerId;

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.REJECTED,
        changeReason: '资料不全',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });

    const response = await request(app).get(`/api/ledger/detail/${ledgerId}`);
    expect(response.body.success).toBe(true);
    expect(response.body.data.statusHistory.length).toBeGreaterThanOrEqual(2);
  });

  test('无权限角色不能进行状态转换', async () => {
    const createResp = await createTestAppointment('STATETEST008');
    const ledgerId = createResp.body.data.ledgerId;

    const response = await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.AUDIT_ONLY,
        changeReason: '尝试跳过流程',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('无权限');
  });
});

describe('台账 API - 幂等性测试', () => {
  test('重复导入预约单应只创建一条记录', async () => {
    const appointmentData = {
      appointmentNo: 'IDEMPOTENT001',
      batchNo: 'BATCH001',
      customerName: '幂等测试用户',
      customerPhone: '13800138999',
      customerAddress: '幂等测试地址',
      area: '上海',
      applianceType: '洗衣机',
      appointmentTime: '2024-01-16 14:00:00',
      technicianId: 'TECH002',
      technicianName: '幂等测试师傅',
      status: '已完成',
      operatorId: 'OP002',
      operatorName: '操作人2',
    };

    const response1 = await request(app)
      .post('/api/ledger/import/appointment')
      .send(appointmentData);
    expect(response1.body.success).toBe(true);
    expect(response1.body.created).toBe(true);
    const ledgerId1 = response1.body.data.ledgerId;

    const response2 = await request(app)
      .post('/api/ledger/import/appointment')
      .send(appointmentData);
    expect(response2.body.success).toBe(true);
    expect(response2.body.created).toBe(false);
    const ledgerId2 = response2.body.data.ledgerId;

    expect(ledgerId1).toBe(ledgerId2);
  });

  test('更新数据应覆盖原有记录', async () => {
    const appointmentData = {
      appointmentNo: 'IDEMPOTENT002',
      batchNo: 'BATCH001',
      customerName: '幂等测试用户',
      customerPhone: '13800138998',
      customerAddress: '幂等测试地址',
      area: '上海',
      applianceType: '洗衣机',
      appointmentTime: '2024-01-16 14:00:00',
      technicianId: 'TECH002',
      technicianName: '原始师傅姓名',
      status: '已完成',
      operatorId: 'OP002',
      operatorName: '操作人2',
    };

    await request(app)
      .post('/api/ledger/import/appointment')
      .send(appointmentData);

    const updatedData = {
      ...appointmentData,
      technicianName: '更新后的师傅姓名',
    };

    const response = await request(app)
      .post('/api/ledger/import/appointment')
      .send(updatedData);
    expect(response.body.success).toBe(true);
    expect(response.body.created).toBe(false);

    const detailResponse = await request(app).get(`/api/ledger/detail/${response.body.data.ledgerId}`);
    expect(detailResponse.body.data.appointment.technicianName).toBe('更新后的师傅姓名');
  });

  test('重复导入定位数据应更新同一条记录', async () => {
    await createTestAppointment('IDEMPOTENT003', 'BATCH001');

    const locationData = {
      appointmentNo: 'IDEMPOTENT003',
      batchNo: 'BATCH001',
      technicianId: 'TECH002',
      checkInTime: '2024-01-16 13:55:00',
      locationAddress: '测试地址',
      latitude: 31.2304,
      longitude: 121.4737,
      distanceToCustomer: 100,
    };

    const response1 = await request(app)
      .post('/api/ledger/import/technician-location')
      .send(locationData);
    expect(response1.body.success).toBe(true);
    expect(response1.body.created).toBe(true);

    const updatedLocation = {
      ...locationData,
      distanceToCustomer: 50,
      checkOutTime: '2024-01-16 15:30:00',
    };

    const response2 = await request(app)
      .post('/api/ledger/import/technician-location')
      .send(updatedLocation);
    expect(response2.body.success).toBe(true);
    expect(response2.body.created).toBe(false);
    expect(response2.body.data.distanceToCustomer).toBe(50);
  });
});

describe('台账 API - 数据质量与失败记录测试', () => {
  test('无效手机号应被拒绝并记录到失败表', async () => {
    const badData = {
      appointmentNo: 'BAD001',
      batchNo: 'BATCH001',
      customerName: '坏数据用户',
      customerPhone: 'invalid-phone',
      customerAddress: '测试地址',
      area: '广州',
      applianceType: '冰箱',
      appointmentTime: '2024-01-17 09:00:00',
      technicianId: 'TECH003',
      technicianName: '测试师傅',
      status: '已完成',
      operatorId: 'OP003',
      operatorName: '操作人3',
    };

    const response = await request(app)
      .post('/api/ledger/import/appointment')
      .send(badData);
    expect(response.body.success).toBe(false);

    const failedResponse = await request(app).get('/api/ledger/failed-records');
    expect(failedResponse.body.success).toBe(true);
    expect(failedResponse.body.data.list.length).toBeGreaterThan(0);
  });

  test('导入定位数据前必须先导入预约单', async () => {
    const locationData = {
      appointmentNo: 'NONEXISTENT',
      batchNo: 'BATCH001',
      technicianId: 'TECH004',
      checkInTime: '2024-01-17 09:00:00',
      locationAddress: '测试地址',
      latitude: 23.1291,
      longitude: 113.2644,
      distanceToCustomer: 80,
    };

    const response = await request(app)
      .post('/api/ledger/import/technician-location')
      .send(locationData);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('台账记录不存在');
  });

  test('统计数据不应包含失败记录', async () => {
    const statsResponse = await request(app).get('/api/ledger/statistics');
    expect(statsResponse.body.success).toBe(true);
    const total = statsResponse.body.data.total;

    const failedResponse = await request(app).get('/api/ledger/failed-records');
    const failedCount = failedResponse.body.data.list.length;

    expect(total).toBeGreaterThanOrEqual(0);
    expect(failedCount).toBeGreaterThanOrEqual(0);
  });
});

describe('台账 API - 敏感字段脱敏测试', () => {
  test('管理员角色可以看到完整信息', async () => {
    const createResp = await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo: 'MASKTEST001',
        batchNo: 'BATCH001',
        customerName: '脱敏测试',
        customerPhone: '13900139000',
        customerAddress: '深圳市南山区科技园路100号',
        area: '深圳',
        applianceType: '电视',
        appointmentTime: '2024-01-18 10:00:00',
        technicianId: 'TECH005',
        technicianName: '脱敏师傅',
        status: '已完成',
        operatorId: 'OP005',
        operatorName: '操作人5',
      });
    const ledgerId = createResp.body.data.ledgerId;

    const response = await request(app)
      .get(`/api/ledger/detail/${ledgerId}?role=admin`);
    expect(response.body.success).toBe(true);
    expect(response.body.data.appointment.customerPhone).toBe('13900139000');
    expect(response.body.data.appointment.customerName).toBe('脱敏测试');
  });

  test('区域经理角色看到脱敏信息', async () => {
    const createResp = await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo: 'MASKTEST002',
        batchNo: 'BATCH001',
        customerName: '脱敏测试',
        customerPhone: '13900139001',
        customerAddress: '深圳市南山区科技园路100号',
        area: '深圳',
        applianceType: '电视',
        appointmentTime: '2024-01-18 10:00:00',
        technicianId: 'TECH005',
        technicianName: '脱敏师傅',
        status: '已完成',
        operatorId: 'OP005',
        operatorName: '操作人5',
      });
    const ledgerId = createResp.body.data.ledgerId;

    const response = await request(app)
      .get(`/api/ledger/detail/${ledgerId}?role=area_manager`);
    expect(response.body.success).toBe(true);
    expect(response.body.data.appointment.customerPhone).toContain('****');
    expect(response.body.data.appointment.customerName).toContain('*');
  });

  test('售后角色看到脱敏信息', async () => {
    const createResp = await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo: 'MASKTEST003',
        batchNo: 'BATCH001',
        customerName: '脱敏测试',
        customerPhone: '13900139002',
        customerAddress: '深圳市南山区科技园路100号',
        area: '深圳',
        applianceType: '电视',
        appointmentTime: '2024-01-18 10:00:00',
        technicianId: 'TECH005',
        technicianName: '脱敏师傅',
        status: '已完成',
        operatorId: 'OP005',
        operatorName: '操作人5',
      });
    const ledgerId = createResp.body.data.ledgerId;

    const response = await request(app)
      .get(`/api/ledger/detail/${ledgerId}?role=after_sales`);
    expect(response.body.success).toBe(true);
    expect(response.body.data.appointment.customerPhone).toContain('****');
    expect(response.body.data.appointment.customerAddress).toContain('***');
  });
});

describe('台账 API - 只读审计状态保护测试', () => {
  async function createAndMoveToAuditOnly(appointmentNo: string, batchNo: string = 'BATCH001') {
    const createResp = await createTestAppointment(appointmentNo, batchNo);
    const ledgerId = createResp.body.data.ledgerId;

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SUBMITTED,
        changeReason: '提交审核',
        operatorId: 'OP001',
        operatorName: '操作人',
        role: 'after_sales',
      });

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.SECOND_CONFIRM,
        changeReason: '需要二次确认',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });

    await request(app)
      .post('/api/ledger/status/change')
      .send({
        ledgerId,
        targetStatus: LedgerStatus.AUDIT_ONLY,
        changeReason: '确认无误，归档',
        operatorId: 'AUD001',
        operatorName: '审核员',
        role: 'auditor',
      });

    return ledgerId;
  }

  test('进入只读审计后，预约单导入应被拒绝', async () => {
    const appointmentNo = 'AUDITPROTECT001';
    await createAndMoveToAuditOnly(appointmentNo);

    const response = await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        customerName: '尝试修改用户',
        customerPhone: '13800138001',
        customerAddress: '尝试修改地址',
        area: '北京',
        applianceType: '空调',
        appointmentTime: '2024-01-15 10:00:00',
        technicianId: 'TECH001',
        technicianName: '归档后仍被修改',
        status: '已完成',
        operatorId: 'OP002',
        operatorName: '尝试修改人',
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('只读审计状态');
  });

  test('进入只读审计后，师傅定位导入应被拒绝', async () => {
    const appointmentNo = 'AUDITPROTECT002';
    await createAndMoveToAuditOnly(appointmentNo);

    const response = await request(app)
      .post('/api/ledger/import/technician-location')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        technicianId: 'TECH002',
        checkInTime: '2024-01-15 09:00:00',
        locationAddress: '测试地址',
        latitude: 39.9042,
        longitude: 116.4074,
        distanceToCustomer: 100,
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('只读审计状态');
  });

  test('进入只读审计后，用户评价导入应被拒绝', async () => {
    const appointmentNo = 'AUDITPROTECT003';
    await createAndMoveToAuditOnly(appointmentNo);

    const response = await request(app)
      .post('/api/ledger/import/user-review')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        rating: 1,
        reviewContent: '差评内容',
        reviewTime: '2024-01-15 18:00:00',
        reviewerPhone: '13900139000',
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('只读审计状态');
  });

  test('进入只读审计后，二次确认单导入应被拒绝', async () => {
    const appointmentNo = 'AUDITPROTECT004';
    await createAndMoveToAuditOnly(appointmentNo);

    const response = await request(app)
      .post('/api/ledger/import/second-confirmation')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        confirmType: 'reschedule',
        confirmResult: '已确认改约',
        confirmTime: '2024-01-15 20:00:00',
        operatorId: 'OP003',
        operatorName: '确认人',
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('只读审计状态');
  });

  test('只读审计状态下尝试修改应记录到失败表', async () => {
    const appointmentNo = 'AUDITPROTECT005';
    await createAndMoveToAuditOnly(appointmentNo);

    await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        customerName: '尝试修改用户',
        customerPhone: '13800138002',
        customerAddress: '尝试修改地址',
        area: '北京',
        applianceType: '空调',
        appointmentTime: '2024-01-15 10:00:00',
        technicianId: 'TECH001',
        technicianName: '归档后仍被修改',
        status: '已完成',
        operatorId: 'OP002',
        operatorName: '尝试修改人',
      });

    const failedResponse = await request(app).get('/api/ledger/failed-records');
    expect(failedResponse.body.success).toBe(true);
    const failedRecord = failedResponse.body.data.list.find(
      (r: any) => r.appointmentNo === appointmentNo && r.errorMessage.includes('只读审计')
    );
    expect(failedRecord).toBeDefined();
  });

  test('只读审计状态下尝试修改应在历史中留下痕迹', async () => {
    const appointmentNo = 'AUDITPROTECT006';
    const ledgerId = await createAndMoveToAuditOnly(appointmentNo);

    await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        customerName: '尝试修改用户',
        customerPhone: '13800138003',
        customerAddress: '尝试修改地址',
        area: '北京',
        applianceType: '空调',
        appointmentTime: '2024-01-15 10:00:00',
        technicianId: 'TECH001',
        technicianName: '归档后仍被修改',
        status: '已完成',
        operatorId: 'OP002',
        operatorName: '尝试修改人',
      });

    const detailResponse = await request(app).get(`/api/ledger/detail/${ledgerId}?role=admin`);
    expect(detailResponse.body.success).toBe(true);
    const attemptLog = detailResponse.body.data.statusHistory.find(
      (log: any) => log.changeReason && log.changeReason.includes('尝试在只读审计状态下修改')
    );
    expect(attemptLog).toBeDefined();
    expect(attemptLog.fromStatus).toBe(LedgerStatus.AUDIT_ONLY);
    expect(attemptLog.toStatus).toBe(LedgerStatus.AUDIT_ONLY);
  });

  test('只读审计状态下数据应保持原值不被修改', async () => {
    const appointmentNo = 'AUDITPROTECT007';
    const ledgerId = await createAndMoveToAuditOnly(appointmentNo);

    const originalDetail = await request(app).get(`/api/ledger/detail/${ledgerId}?role=admin`);
    const originalTechnicianName = originalDetail.body.data.appointment.technicianName;

    await request(app)
      .post('/api/ledger/import/appointment')
      .send({
        appointmentNo,
        batchNo: 'BATCH001',
        customerName: '尝试修改用户',
        customerPhone: '13800138004',
        customerAddress: '尝试修改地址',
        area: '北京',
        applianceType: '空调',
        appointmentTime: '2024-01-15 10:00:00',
        technicianId: 'TECH001',
        technicianName: '归档后仍被修改',
        status: '已完成',
        operatorId: 'OP002',
        operatorName: '尝试修改人',
      });

    const detailResponse = await request(app).get(`/api/ledger/detail/${ledgerId}?role=admin`);
    expect(detailResponse.body.data.appointment.technicianName).toBe(originalTechnicianName);
  });
});
