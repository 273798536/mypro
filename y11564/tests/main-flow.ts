import { db } from '../src/database/connection';
import { ledgerService } from '../src/services/ledger-service';
import { LedgerStatus, Role } from '../src/types';

async function testIdempotency() {
  console.log('\n=== 测试1: 幂等性测试 ===\n');

  const checkInData = {
    checkInNo: 'CI_IDEMPOTENT_001',
    guestName: '幂等测试',
    guestIdCard: '110101199001019999',
    roomNo: '9999',
    roomType: '测试房',
    checkInTime: '2024-05-24T14:00:00Z',
    checkOutTime: '2024-05-25T12:00:00Z',
    expectedDays: 1,
    roomRate: 200
  };

  const result1 = await ledgerService.createLedgerFromCheckIn(checkInData, '测试员', Role.FRONT_DESK);
  console.log('第一次创建:', result1.success ? '成功' : result1.message);

  const result2 = await ledgerService.createLedgerFromCheckIn(checkInData, '测试员', Role.FRONT_DESK);
  console.log('第二次创建(重复):', result2.success ? '异常成功' : '正确拒绝: ' + result2.message);

  const depositData = {
    depositNo: 'DP_IDEMPOTENT_001',
    checkInNo: 'CI_IDEMPOTENT_001',
    amount: 500,
    paymentMethod: '现金'
  };

  const depResult1 = await ledgerService.addDeposit(depositData, '测试员', Role.FRONT_DESK);
  console.log('第一次添加押金:', depResult1.success ? '成功' : depResult1.message);

  const depResult2 = await ledgerService.addDeposit(depositData, '测试员', Role.FRONT_DESK);
  console.log('第二次添加押金(重复):', depResult2.success ? '异常成功' : '正确拒绝: ' + depResult2.message);
}

async function testStateTransitions() {
  console.log('\n=== 测试2: 状态流转测试 ===\n');

  const checkInData = {
    checkInNo: 'CI_STATE_001',
    guestName: '状态测试',
    guestIdCard: '110101199001018888',
    roomNo: '8888',
    roomType: '测试房',
    checkInTime: '2024-05-24T14:00:00Z',
    checkOutTime: '2024-05-25T12:00:00Z',
    expectedDays: 1,
    roomRate: 200
  };

  const result = await ledgerService.createLedgerFromCheckIn(checkInData, '测试员', Role.FRONT_DESK);
  const ledgerId = result.ledger!.id;
  console.log('初始状态:', result.ledger!.status);

  const submitResult = await ledgerService.submitLedger(ledgerId, '测试员', Role.FRONT_DESK);
  console.log('草稿 → 提交:', submitResult.ledger?.status, submitResult.success ? '✅' : '❌');

  const rejectResult = await ledgerService.rejectLedger(ledgerId, '测试驳回', '审核员', Role.SUPERVISOR);
  console.log('提交 → 驳回:', rejectResult.ledger?.status, rejectResult.success ? '✅' : '❌');

  const resubmitResult = await ledgerService.submitLedger(ledgerId, '测试员', Role.FRONT_DESK);
  console.log('驳回 → 提交:', resubmitResult.ledger?.status, resubmitResult.success ? '✅' : '❌');

  const confirmResult = await ledgerService.confirmLedger(ledgerId, '主管', Role.SUPERVISOR);
  console.log('提交 → 确认:', confirmResult.ledger?.status, confirmResult.success ? '✅' : '❌');

  const auditResult = await ledgerService.auditLedger(ledgerId, '夜审员', Role.AUDITOR);
  console.log('确认 → 审计:', auditResult.ledger?.status, auditResult.success ? '✅' : '❌');

  const invalidTransition = await ledgerService.submitLedger(ledgerId, '测试员', Role.FRONT_DESK);
  console.log('审计 → 提交(非法):', invalidTransition.success ? '❌ 非法成功' : '✅ 正确阻止: ' + invalidTransition.message);
}

async function testDataTraceability() {
  console.log('\n=== 测试3: 数据可追溯性测试 ===\n');

  const checkInData = {
    checkInNo: 'CI_TRACE_001',
    guestName: '追溯测试',
    guestIdCard: '110101199001017777',
    roomNo: '7777',
    roomType: '测试房',
    checkInTime: '2024-05-24T14:00:00Z',
    checkOutTime: '2024-05-25T12:00:00Z',
    expectedDays: 1,
    roomRate: 200
  };

  const result = await ledgerService.createLedgerFromCheckIn(checkInData, '测试员', Role.FRONT_DESK);
  const ledgerId = result.ledger!.id;

  const depositData = {
    depositNo: 'DP_TRACE_001',
    checkInNo: 'CI_TRACE_001',
    amount: 500,
    paymentMethod: '微信'
  };
  await ledgerService.addDeposit(depositData, '测试员', Role.FRONT_DESK);

  const detail = await ledgerService.getLedgerDetail(ledgerId, Role.FINANCE);
  console.log('台账余额计算:', detail?.ledger.balance);
  console.log('押金总额:', detail?.deposits.reduce((sum, d) => sum + d.amount, 0));
  console.log('房费总额:', detail?.ledger.totalRoomFee);
  console.log('余额验证:', detail!.ledger.balance === detail!.ledger.totalDeposit - detail!.ledger.totalRoomFee ? '✅ 一致' : '❌ 不一致');

  const histories = await ledgerService.getLedgerHistories(ledgerId);
  console.log('历史记录数量:', histories.length);
  console.log('操作历史:', histories.map(h => `${h.operation} (${h.operator})`));
}

async function testBadDataIsolation() {
  console.log('\n=== 测试4: 坏数据隔离测试 ===\n');

  const badData = {
    checkInNo: '',
    guestName: '',
    guestIdCard: '',
    roomNo: '',
    roomType: '',
    checkInTime: '',
    checkOutTime: '',
    expectedDays: 0,
    roomRate: 0
  };

  await ledgerService.createLedgerFromCheckIn(badData, '测试员', Role.FRONT_DESK);

  const failedRecords = await ledgerService.getFailedRecords({ page: 1, pageSize: 10 });
  console.log('失败记录数量:', failedRecords.total);
  if (failedRecords.list.length > 0) {
    const latest = failedRecords.list[0];
    console.log('最新失败记录类型:', latest.recordType);
    console.log('失败原因:', latest.failReason);
    console.log('原始数据已保存:', latest.recordData ? '✅' : '❌');
  }

  const summary = await ledgerService.getReportSummary();
  console.log('报表汇总(坏数据不影响):', summary.totalLedgers > 0 ? '✅ 汇总正常' : '❌');
}

async function testRoleMasking() {
  console.log('\n=== 测试5: 角色脱敏测试 ===\n');

  const checkInData = {
    checkInNo: 'CI_MASK_001',
    guestName: '脱敏测试',
    guestIdCard: '110101199001016666',
    roomNo: '6666',
    roomType: '测试房',
    checkInTime: '2024-05-24T14:00:00Z',
    checkOutTime: '2024-05-25T12:00:00Z',
    expectedDays: 1,
    roomRate: 200
  };

  const result = await ledgerService.createLedgerFromCheckIn(checkInData, '测试员', Role.FRONT_DESK);
  const ledgerId = result.ledger!.id;

  const frontDeskView = await ledgerService.getLedgerDetail(ledgerId, Role.FRONT_DESK);
  console.log('前台视图身份证:', frontDeskView?.checkIn?.guestIdCard);

  const financeView = await ledgerService.getLedgerDetail(ledgerId, Role.FINANCE);
  console.log('财务视图身份证:', financeView?.checkIn?.guestIdCard);

  console.log('脱敏验证:', frontDeskView!.checkIn!.guestIdCard.includes('*') ? '✅ 前台已脱敏' : '❌ 前台未脱敏');
  console.log('财务权限验证:', !financeView!.checkIn!.guestIdCard.includes('*') ? '✅ 财务可见原始' : '❌ 财务被错误脱敏');
}

async function runAllTests() {
  await db.init();
  console.log('数据库初始化完成\n');

  try {
    await testIdempotency();
    await testStateTransitions();
    await testDataTraceability();
    await testBadDataIsolation();
    await testRoleMasking();

    console.log('\n========================================');
    console.log('所有测试完成！');
    console.log('========================================\n');
  } catch (error) {
    console.error('测试出错:', error);
  }

  process.exit(0);
}

runAllTests();
