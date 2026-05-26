import { initializeApp } from './app';
import { RoleType } from './database/schema';
import { createRechargeRecord, updateRechargeStatus, getRechargeById } from './services/rechargeService';
import { createRefundApplication } from './services/refundService';
import { getAuditTrailsByRecord } from './services/auditService';
import { getFailedRecords } from './services/failedRecordService';
import { RecordType } from './database/schema';

const staffOperator = {
  id: 'staff-001',
  name: '门店员工',
  role: RoleType.STORE_STAFF
};

async function verify() {
  console.log('=== 门店会员储值权限追责台账 API 功能验证 ===\n');

  await initializeApp();

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

  try {
    console.log('1. 测试正常链路 - 创建充值流水');
    const orderNo = 'R-TEST-' + Date.now();
    const recharge = await createRechargeRecord({
      orderNo,
      storeId: 'store-001',
      storeName: '朝阳门店',
      memberId: 'member-001',
      memberPhone: '13800138001',
      amount: 1000,
      beforeBalance: 500,
      afterBalance: 1500,
      operatorId: 'op-001',
      operatorName: '张三'
    }, testOperator);
    console.log('   ✓ 创建成功, ID:', recharge.id);
    console.log('   ✓ 当前状态:', recharge.status);

    console.log('\n2. 测试状态流转 - 提交审核');
    await updateRechargeStatus(recharge.id, 'submit', testOperator, '提交审核');
    const submitted = await getRechargeById(recharge.id);
    console.log('   ✓ 提交后状态:', submitted.status);

    console.log('\n3. 测试状态流转 - 财务确认');
    await updateRechargeStatus(recharge.id, 'confirm', financeOperator, '财务复核通过');
    const confirmed = await getRechargeById(recharge.id);
    console.log('   ✓ 确认后状态:', confirmed.status);

    console.log('\n4. 测试状态流转 - 最终审计');
    await updateRechargeStatus(recharge.id, 'audit', auditorOperator, '审计通过');
    const audited = await getRechargeById(recharge.id);
    console.log('   ✓ 审计后状态:', audited.status);

    console.log('\n5. 测试审计轨迹查询');
    const trails = await getAuditTrailsByRecord(recharge.id, RecordType.RECHARGE);
    console.log('   ✓ 审计轨迹数量:', trails.length);
    trails.forEach((t: any) => {
      console.log(`     - ${t.action}: ${t.old_status || '无'} → ${t.new_status}`);
    });

    console.log('\n6. 测试数据校验 - 余额不匹配');
    try {
      await createRechargeRecord({
        orderNo: 'R-BAD-' + Date.now(),
        storeId: 'store-001',
        storeName: '朝阳门店',
        memberId: 'member-002',
        memberPhone: '13800138002',
        amount: 500,
        beforeBalance: 200,
        afterBalance: 600,
        operatorId: 'op-001',
        operatorName: '张三'
      }, testOperator);
      console.log('   ✗ 应该抛出错误');
    } catch (e: any) {
      console.log('   ✓ 正确拒绝:', e.message);
    }

    console.log('\n7. 测试重复提交');
    try {
      await createRechargeRecord({
        orderNo,
        storeId: 'store-001',
        storeName: '朝阳门店',
        memberId: 'member-001',
        memberPhone: '13800138001',
        amount: 1000,
        beforeBalance: 500,
        afterBalance: 1500,
        operatorId: 'op-001',
        operatorName: '张三'
      }, testOperator);
      console.log('   ✗ 应该抛出错误');
    } catch (e: any) {
      console.log('   ✓ 正确拒绝:', e.message);
    }

    console.log('\n8. 测试失败记录查询');
    const failed = await getFailedRecords({ limit: 10 });
    console.log('   ✓ 失败记录数量:', failed.length);

    console.log('\n9. 测试创建退款申请');
    const refund = await createRefundApplication({
      applyNo: 'REF-TEST-' + Date.now(),
      storeId: 'store-001',
      storeName: '朝阳门店',
      rechargeOrderNo: orderNo,
      memberId: 'member-001',
      memberPhone: '13800138001',
      refundAmount: 500,
      refundReason: '测试退款',
      applicantId: 'op-001',
      applicantName: '张三'
    }, testOperator);
    console.log('   ✓ 退款申请创建成功, ID:', refund.id);

    console.log('\n10. 测试已审计记录不可修改');
    try {
      await updateRechargeStatus(recharge.id, 'reject', testOperator, '尝试修改已审计记录');
      console.log('   ✗ 应该抛出错误');
    } catch (e: any) {
      console.log('   ✓ 正确拒绝:', e.message);
    }

    console.log('\n11. 测试状态机校验 - 草稿不能直接审计（必须经过提交、确认）');
    const draftRecharge = await createRechargeRecord({
      orderNo: 'R-DRAFT-TEST-' + Date.now(),
      storeId: 'store-001',
      storeName: '朝阳门店',
      memberId: 'member-003',
      memberPhone: '13800138003',
      amount: 800,
      beforeBalance: 200,
      afterBalance: 1000,
      operatorId: 'op-001',
      operatorName: '张三'
    }, testOperator);
    try {
      await updateRechargeStatus(draftRecharge.id, 'audit', auditorOperator, '尝试直接审计草稿记录');
      console.log('   ✗ 应该抛出错误');
    } catch (e: any) {
      console.log('   ✓ 正确拒绝:', e.message);
    }

    console.log('\n12. 测试状态机校验 - 门店经理不能执行财务确认');
    const submittedRecharge = await createRechargeRecord({
      orderNo: 'R-SUBMIT-TEST-' + Date.now(),
      storeId: 'store-001',
      storeName: '朝阳门店',
      memberId: 'member-004',
      memberPhone: '13800138004',
      amount: 600,
      beforeBalance: 400,
      afterBalance: 1000,
      operatorId: 'op-001',
      operatorName: '张三'
    }, testOperator);
    await updateRechargeStatus(submittedRecharge.id, 'submit', testOperator, '提交审核');
    try {
      await updateRechargeStatus(submittedRecharge.id, 'confirm', testOperator, '门店经理尝试确认');
      console.log('   ✗ 应该抛出错误');
    } catch (e: any) {
      console.log('   ✓ 正确拒绝:', e.message);
    }

    console.log('\n13. 测试状态机校验 - 门店员工可以提交草稿');
    const staffRecharge = await createRechargeRecord({
      orderNo: 'R-STAFF-TEST-' + Date.now(),
      storeId: 'store-001',
      storeName: '朝阳门店',
      memberId: 'member-005',
      memberPhone: '13800138005',
      amount: 300,
      beforeBalance: 700,
      afterBalance: 1000,
      operatorId: 'op-002',
      operatorName: '李四'
    }, staffOperator);
    try {
      await updateRechargeStatus(staffRecharge.id, 'submit', staffOperator, '门店员工提交');
      const afterSubmit = await getRechargeById(staffRecharge.id);
      console.log('   ✓ 员工提交成功, 状态:', afterSubmit.status);
    } catch (e: any) {
      console.log('   ✗ 员工应该可以提交:', e.message);
      process.exit(1);
    }

    console.log('\n14. 测试状态机校验 - 财务确认后才能审计');
    await updateRechargeStatus(submittedRecharge.id, 'confirm', financeOperator, '财务确认');
    try {
      await updateRechargeStatus(submittedRecharge.id, 'audit', auditorOperator, '最终审计');
      const afterAudit = await getRechargeById(submittedRecharge.id);
      console.log('   ✓ 确认后可审计, 状态:', afterAudit.status);
    } catch (e: any) {
      console.log('   ✗ 确认后应该可以审计:', e.message);
      process.exit(1);
    }

    console.log('\n=== 所有验证通过! ===');
  } catch (e: any) {
    console.error('\n✗ 验证失败:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

verify();
