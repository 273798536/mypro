import { submitToQueue, retryQueueItem, getQueueStatistics, checkAndUpdateCalibrationStatus, disableDeviceRecords } from '../services/queueService';
import { formatISO, subDays } from 'date-fns';
import { getDiffLogsByQueueId } from '../services/diffService';

const triggerBadData = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║               触发脏数据演示                                ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const today = new Date();
  const threeDaysAgo = subDays(today, 3);

  console.log('1. 创建【缺失字段】的巡检记录 - 将进入人工干预队列...');
  const q1 = await submitToQueue('inspection', {
    deviceId: 'DEV004',
    deviceName: '听诊器',
    department: '',
    inspectionDate: formatISO(today, { representation: 'date' }),
    inspector: '',
    result: 'pass',
  }, 'BAD-001');
  console.log(`   ✓ 已创建: ${q1.status} - ${q1.dirtyDetails}\n`);

  console.log('2. 创建【跨日】的巡检记录...');
  const q2 = await submitToQueue('inspection', {
    deviceId: 'DEV005',
    deviceName: '体温计',
    department: '发热门诊',
    inspectionDate: formatISO(threeDaysAgo, { representation: 'date' }),
    inspector: '王工',
    result: 'fail',
    remarks: '跨日提交的记录',
  }, 'BAD-002');
  console.log(`   ✓ 已创建: ${q2.status} - ${q2.dirtyDetails}\n`);

  console.log('3. 创建【设备名称变更】的校准证书...');
  const q3 = await submitToQueue('calibration', {
    deviceId: 'DEV001',
    deviceName: '心电图机-新版',
    certificateNo: 'CAL-BAD-001',
    calibrationDate: formatISO(today, { representation: 'date' }),
    validUntil: formatISO(subDays(today, -300), { representation: 'date' }),
    calibrationOrg: '第三方机构',
    status: 'valid',
  }, 'BAD-003');
  console.log(`   ✓ 已创建: ${q3.status} - ${q3.dirtyDetails}\n`);

  console.log('4. 创建【金额冲突】的维修报价...');
  await submitToQueue('repair', {
    deviceId: 'DEV002',
    deviceName: '超声诊断仪',
    quoteNo: 'REP-CONFLICT',
    repairDate: formatISO(today, { representation: 'date' }),
    description: '主板维修',
    amount: 5000.00,
    quantity: 1,
    status: 'pending',
  }, 'BAD-004-FIRST');

  const q4 = await submitToQueue('repair', {
    deviceId: 'DEV002',
    deviceName: '超声诊断仪',
    quoteNo: 'REP-CONFLICT',
    repairDate: formatISO(today, { representation: 'date' }),
    description: '主板维修',
    amount: 5500.00,
    quantity: 1,
    status: 'pending',
  }, 'BAD-004');
  console.log(`   ✓ 已创建: ${q4.status} - ${q4.dirtyDetails}\n`);

  console.log('5. 模拟重试失败，产生死信（记录差异日志）...');
  await retryQueueItem(q1.id, 'demo');
  await retryQueueItem(q1.id, 'demo');
  await retryQueueItem(q1.id, 'demo');
  const deadLetter = await retryQueueItem(q1.id, 'demo');
  console.log(`   ✓ 已产生死信: ${deadLetter?.status} (重试次数: ${deadLetter?.retryCount}/${deadLetter?.maxRetries})\n`);

  console.log('6. 查看差异日志（记录了每一步变化）...');
  const diffLogs = await getDiffLogsByQueueId(q1.id);
  console.log(`   ✓ 该队列项有 ${diffLogs.length} 条变更日志:`);
  diffLogs.forEach((log, i) => {
    console.log(`   ${i + 1}. ${log.action} - ${log.remarks} (${log.operator} at ${log.createdAt})`);
  });

  console.log('\n7. 检查并更新过期证书状态（证书联动）...');
  const certResult = await checkAndUpdateCalibrationStatus();
  console.log(`   ✓ 已更新 ${certResult.updated} 条过期证书\n`);

  console.log('8. 演示设备停用联动...');
  const disableResult = await disableDeviceRecords('DEV003', 'demo-admin');
  console.log(`   ✓ 设备 DEV003 已停用，影响 ${disableResult.calibrations} 条证书\n`);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                        脏数据统计                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const stats = await getQueueStatistics();
  console.log('\n按状态分类:');
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\n按脏类型分类:');
  Object.entries(stats.byDirtyType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log(`\n重试统计: 平均 ${stats.retryStats.averageRetries.toFixed(1)} 次，最大 ${stats.retryStats.maxRetries} 次`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    脏数据触发完成！                         ║');
  console.log('║                                                            ║');
  console.log('║  关键改进:                                                  ║');
  console.log('║  ✓ 脏数据不会被业务表拦截，先进入队列                       ║');
  console.log('║  ✓ 每一步操作都有差异日志可回看                              ║');
  console.log('║  ✓ 证书过期自动检查和状态更新                               ║');
  console.log('║  ✓ 设备停用联动相关记录处理                                 ║');
  console.log('║                                                            ║');
  console.log('║  下一步操作:                                                ║');
  console.log('║  npm run demo:fix       - 人工修正脏数据                    ║');
  console.log('║  npm run demo:report    - 生成护士长报告                    ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
};

triggerBadData().catch(console.error);
