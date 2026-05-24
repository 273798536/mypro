import { db } from '../src/database/connection';
import { ledgerService } from '../src/services/ledger-service';
import { Role } from '../src/types';

async function seedData() {
  await db.init();
  console.log('开始插入样例数据...\n');

  const checkInData1 = {
    checkInNo: 'CI20240524001',
    guestName: '张三',
    guestIdCard: '110101199001011234',
    roomNo: '1001',
    roomType: '豪华大床房',
    checkInTime: '2024-05-24T14:30:00Z',
    checkOutTime: '2024-05-27T12:00:00Z',
    expectedDays: 3,
    roomRate: 388
  };
  const result1 = await ledgerService.createLedgerFromCheckIn(checkInData1, '前台小王', Role.FRONT_DESK);
  console.log('✅ 入住单1:', result1.success ? '成功' : result1.message);

  if (result1.ledger) {
    const deposit1 = {
      depositNo: 'DP20240524001',
      checkInNo: 'CI20240524001',
      amount: 1500,
      paymentMethod: '微信支付',
      remark: '押金'
    };
    const depResult1 = await ledgerService.addDeposit(deposit1, '前台小王', Role.FRONT_DESK);
    console.log('✅ 押金1:', depResult1.success ? '成功' : depResult1.message);

    const submitResult = await ledgerService.submitLedger(result1.ledger.id, '前台小王', Role.FRONT_DESK);
    console.log('✅ 提交审核1:', submitResult.success ? '成功' : submitResult.message);
  }

  const checkInData2 = {
    checkInNo: 'CI20240524002',
    guestName: '李四',
    guestIdCard: '310101198505055678',
    roomNo: '1002',
    roomType: '标准双床房',
    checkInTime: '2024-05-24T16:00:00Z',
    checkOutTime: '2024-05-25T12:00:00Z',
    expectedDays: 1,
    roomRate: 268
  };
  const result2 = await ledgerService.createLedgerFromCheckIn(checkInData2, '前台小李', Role.FRONT_DESK);
  console.log('✅ 入住单2:', result2.success ? '成功' : result2.message);

  if (result2.ledger) {
    const deposit2 = {
      depositNo: 'DP20240524002',
      checkInNo: 'CI20240524002',
      amount: 500,
      paymentMethod: '支付宝',
      remark: '押金'
    };
    const depResult2 = await ledgerService.addDeposit(deposit2, '前台小李', Role.FRONT_DESK);
    console.log('✅ 押金2:', depResult2.success ? '成功' : depResult2.message);

    const roomChange = {
      changeNo: 'RC20240524001',
      checkInNo: 'CI20240524002',
      oldRoomNo: '1002',
      newRoomNo: '1005',
      oldRoomType: '标准双床房',
      newRoomType: '豪华大床房',
      oldRoomRate: 268,
      newRoomRate: 388,
      changeTime: '2024-05-25T02:30:00Z',
      changeReason: '客人投诉噪音，升级房型',
      isMidNight: true
    };
    const changeResult = await ledgerService.addRoomChange(roomChange, '夜班小张', Role.FRONT_DESK);
    console.log('✅ 半夜换房(异常场景):', changeResult.success ? '成功' : changeResult.message);

    const submitResult = await ledgerService.submitLedger(result2.ledger.id, '夜班小张', Role.FRONT_DESK);
    console.log('✅ 提交审核2:', submitResult.success ? '成功' : submitResult.message);
  }

  const checkInData3 = {
    checkInNo: 'CI20240524003',
    guestName: '王五',
    guestIdCard: '440101199212129012',
    roomNo: '1003',
    roomType: '商务套房',
    checkInTime: '2024-05-24T10:00:00Z',
    checkOutTime: '2024-05-30T12:00:00Z',
    expectedDays: 6,
    roomRate: 588
  };
  const result3 = await ledgerService.createLedgerFromCheckIn(checkInData3, '前台小王', Role.FRONT_DESK);
  console.log('✅ 入住单3:', result3.success ? '成功' : result3.message);

  if (result3.ledger) {
    const deposit3 = {
      depositNo: 'DP20240524003',
      checkInNo: 'CI20240524003',
      amount: 4000,
      paymentMethod: '信用卡',
      remark: '预授权'
    };
    const depResult3 = await ledgerService.addDeposit(deposit3, '前台小王', Role.FRONT_DESK);
    console.log('✅ 押金3:', depResult3.success ? '成功' : depResult3.message);

    const submitResult = await ledgerService.submitLedger(result3.ledger.id, '前台小王', Role.FRONT_DESK);
    console.log('✅ 提交审核3:', submitResult.success ? '成功' : submitResult.message);

    const rejectResult = await ledgerService.rejectLedger(result3.ledger.id, '押金金额与房费比例异常，请核实', '财务审核员', Role.FINANCE);
    console.log('✅ 驳回(流程演示):', rejectResult.success ? '成功' : rejectResult.message);

    const resubmitResult = await ledgerService.submitLedger(result3.ledger.id, '前台小王', Role.FRONT_DESK);
    console.log('✅ 重新提交:', resubmitResult.success ? '成功' : resubmitResult.message);

    const confirmResult = await ledgerService.confirmLedger(result3.ledger.id, '主管老李', Role.SUPERVISOR);
    console.log('✅ 二次确认:', confirmResult.success ? '成功' : confirmResult.message);

    const auditResult = await ledgerService.auditLedger(result3.ledger.id, '夜审员', Role.AUDITOR);
    console.log('✅ 夜审通过:', auditResult.success ? '成功' : auditResult.message);
  }

  const badCheckInData = {
    checkInNo: 'BAD001',
    guestName: '',
    guestIdCard: '',
    roomNo: '',
    roomType: '',
    checkInTime: '',
    checkOutTime: '',
    expectedDays: -1,
    roomRate: -100
  };
  const badResult = await ledgerService.createLedgerFromCheckIn(badCheckInData, '测试员', Role.FRONT_DESK);
  console.log('✅ 坏数据(应失败并保存):', !badResult.success ? '已存入失败记录' : '异常');

  console.log('\n========================================');
  console.log('样例数据插入完成！');
  console.log('包含: 3条完整台账 + 1条半夜换房异常 + 1条驳回-重提流程 + 1条坏数据');
  console.log('========================================\n');

  process.exit(0);
}

seedData().catch(console.error);
