import { initDB } from '../db';
import { AuthService } from '../services/authService';
import { LedgerService } from '../services/ledgerService';
import { Role, ProcessResult } from '../types';
import { logger } from '../utils/logger';

async function seed() {
  logger.info('开始初始化数据库...');
  await initDB();

  logger.info('创建测试用户...');
  
  await AuthService.register(
    'boss', 'boss123', Role.FACTORY_OWNER,
    '张老板', '管理层', '13800138001'
  );
  
  await AuthService.register(
    'accountant', 'account123', Role.ACCOUNTANT,
    '李会计', '财务部', '13800138002'
  );
  
  await AuthService.register(
    'auditor', 'audit123', Role.AUDITOR,
    '王审计', '审计部', '13800138003'
  );
  
  await AuthService.register(
    'operator', 'oper123', Role.OPERATOR,
    '赵操作', '运营部', '13800138004'
  );

  logger.info('用户创建完成');
  logger.info('测试账号:');
  logger.info('  工厂老板: boss / boss123');
  logger.info('  财务: accountant / account123');
  logger.info('  审计: auditor / audit123');
  logger.info('  操作员: operator / oper123');

  logger.info('获取操作员用户信息...');
  const { user: operator } = await AuthService.login('operator', 'oper123');
  const { user: accountant } = await AuthService.login('accountant', 'account123');

  logger.info('创建样例台账 - 正常结果...');
  const normalLedger = await LedgerService.createLedger({
    batchNo: 'BATCH-2024-001',
    deliveryNotes: [{
      batchNo: 'BATCH-2024-001',
      supplierId: 'SUP001',
      supplierName: '深圳市鑫源五金制品厂',
      productCode: 'PROD-001',
      productName: '不锈钢外壳A款',
      quantity: 5000,
      unit: '个',
      deliveryDate: '2024-01-15',
      warehouse: '主仓库A区',
      receiver: '张三',
      remark: '首批送货，质量合格'
    }],
    reworkRecords: [],
    deductionDetails: [],
    handoverPapers: [],
    smsEvidences: []
  }, operator.userId, operator.role);

  const deliveryNoteId = normalLedger.deliveryNotes[0].id;

  await LedgerService.appendToLedger(normalLedger.id, {
    batchNo: 'BATCH-2024-001',
    deliveryNotes: [],
    reworkRecords: [{
      batchNo: 'BATCH-2024-001',
      deliveryNoteId: deliveryNoteId,
      reworkReason: '表面划痕',
      reworkType: '抛光处理',
      reworkQuantity: 200,
      reworkDate: '2024-01-16',
      responsiblePerson: '李四'
    }],
    deductionDetails: [{
      batchNo: 'BATCH-2024-001',
      deliveryNoteId: deliveryNoteId,
      deductionType: '质量扣款',
      deductionAmount: 500,
      deductionReason: '200个产品表面划痕返工费用',
      deductionDate: '2024-01-18',
      operator: '李会计'
    }],
    handoverPapers: [{
      batchNo: 'BATCH-2024-001',
      deliveryNoteId: deliveryNoteId,
      storeId: 'STORE001',
      storeName: '南山旗舰店',
      handoverDate: '2024-01-20',
      handoverPerson: '王五',
      receiver: '陈店长',
      items: [{
        productCode: 'PROD-001',
        productName: '不锈钢外壳A款',
        quantity: 4800,
        unit: '个'
      }]
    }]
  }, operator.userId, operator.role);

  await LedgerService.addSmsEvidence(normalLedger.id, {
    batchNo: 'BATCH-2024-001',
    relatedType: 'deduction',
    relatedId: '',
    sender: '138****0002',
    receiver: '139****1234',
    content: '王总您好，BATCH-2024-001批次因表面划痕扣款500元，请知悉。',
    sendTime: '2024-01-18 10:30:00',
    screenshotUrl: '/uploads/sms/sms_20240118_1030.png'
  }, operator.userId, operator.role);

  await LedgerService.submit(normalLedger.id, operator.userId, operator.role);
  await LedgerService.confirm(normalLedger.id, accountant.userId, accountant.role);
  await LedgerService.setProcessResult(
    normalLedger.id, ProcessResult.NORMAL,
    '数据核对无误，扣款金额确认',
    accountant.userId, accountant.role
  );

  logger.info('创建样例台账 - 待复核结果...');
  const pendingLedger = await LedgerService.createLedger({
    batchNo: 'BATCH-2024-002',
    deliveryNotes: [{
      batchNo: 'BATCH-2024-002',
      supplierId: 'SUP002',
      supplierName: '东莞市精密电子有限公司',
      productCode: 'PROD-002',
      productName: 'PCB主板V2.0',
      quantity: 10000,
      unit: '片',
      deliveryDate: '2024-01-20',
      warehouse: '电子仓B区',
      receiver: '赵六',
      remark: ''
    }],
    reworkRecords: [],
    deductionDetails: []
  }, operator.userId, operator.role);

  const pendingDeliveryNoteId = pendingLedger.deliveryNotes[0].id;

  await LedgerService.appendToLedger(pendingLedger.id, {
    batchNo: 'BATCH-2024-002',
    deliveryNotes: [],
    reworkRecords: [{
      batchNo: 'BATCH-2024-002',
      deliveryNoteId: pendingDeliveryNoteId,
      reworkReason: '焊点不良',
      reworkType: '补焊',
      reworkQuantity: 1500,
      reworkDate: '2024-01-21',
      responsiblePerson: '孙七'
    }, {
      batchNo: 'BATCH-2024-002',
      deliveryNoteId: pendingDeliveryNoteId,
      reworkReason: '元件贴装偏移',
      reworkType: '重贴',
      reworkQuantity: 800,
      reworkDate: '2024-01-22',
      responsiblePerson: '孙七'
    }],
    deductionDetails: [{
      batchNo: 'BATCH-2024-002',
      deliveryNoteId: pendingDeliveryNoteId,
      deductionType: '返工扣款',
      deductionAmount: 4500,
      deductionReason: '1500片补焊+800片重贴，返工费用合计',
      deductionDate: '2024-01-23',
      operator: '李会计'
    }]
  }, operator.userId, operator.role);

  await LedgerService.submit(pendingLedger.id, operator.userId, operator.role);
  await LedgerService.setProcessResult(
    pendingLedger.id, ProcessResult.PENDING_REVIEW,
    '同一批次出现两次返工，需财务主管复核返工原因是否合理',
    accountant.userId, accountant.role
  );

  logger.info('创建样例台账 - 无法处理结果...');
  const unprocessableLedger = await LedgerService.createLedger({
    batchNo: 'BATCH-2024-003',
    deliveryNotes: [{
      batchNo: 'BATCH-2024-003',
      supplierId: 'SUP003',
      supplierName: '广州市塑胶制品厂',
      productCode: 'PROD-003',
      productName: '塑料按键',
      quantity: 20000,
      unit: '个',
      deliveryDate: '2024-01-25',
      warehouse: '塑胶仓',
      receiver: '周八',
      remark: '送货单无签字'
    }],
    reworkRecords: [],
    deductionDetails: [{
      batchNo: 'BATCH-2024-003',
      deductionType: '数量不符',
      deductionAmount: 3000,
      deductionReason: '实际收货18000个，差2000个',
      deductionDate: '2024-01-26',
      operator: '李会计'
    }]
  }, operator.userId, operator.role);

  await LedgerService.submit(unprocessableLedger.id, operator.userId, operator.role);
  await LedgerService.setProcessResult(
    unprocessableLedger.id, ProcessResult.UNPROCESSABLE,
    '送货单无对方签字确认，且供应商不承认少货。需提供原始物流凭证或协商解决',
    accountant.userId, accountant.role
  );

  logger.info('样例数据创建完成！');
  logger.info('');
  logger.info('=== 样例台账汇总 ===');
  logger.info('1. BATCH-2024-001 - 正常结果');
  logger.info('   - 5000个不锈钢外壳');
  logger.info('   - 200个表面划痕返工');
  logger.info('   - 扣款500元');
  logger.info('   - 已附短信证据');
  logger.info('');
  logger.info('2. BATCH-2024-002 - 待复核');
  logger.info('   - 10000片PCB主板');
  logger.info('   - 同一批次两次返工(1500+800)');
  logger.info('   - 需财务主管复核');
  logger.info('');
  logger.info('3. BATCH-2024-003 - 无法处理');
  logger.info('   - 20000个塑料按键');
  logger.info('   - 送货单无签字，少货2000个');
  logger.info('   - 需人工核实原始单据');
}

seed().catch(error => {
  logger.error('初始化数据失败:', error);
  process.exit(1);
});
