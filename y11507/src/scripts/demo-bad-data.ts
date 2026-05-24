import { createInspectionRecord, createCalibrationCertificate, createRepairQuote } from '../services/recordService';
import { createQueueItem, getAllQueueItems, retryQueueItem, getQueueStatistics } from '../services/queueService';
import { formatISO, subDays } from 'date-fns';

const triggerBadData = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║               触发脏数据演示                                ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const today = new Date();
  const threeDaysAgo = subDays(today, 3);

  console.log('1. 创建【缺失字段】的巡检记录...');
  const badInspection1 = await createInspectionRecord(
    {
      deviceId: 'DEV004',
      deviceName: '听诊器',
      department: '',
      inspectionDate: formatISO(today, { representation: 'date' }),
      inspector: '',
      result: 'pass',
    },
    'demo'
  );
  const queue1 = await createQueueItem('inspection', badInspection1.id, badInspection1, 'BAD-001');
  console.log(`   ✓ 已创建: ${queue1.dirtyType} - ${queue1.dirtyDetails}\n`);

  console.log('2. 创建【跨日】的巡检记录...');
  const badInspection2 = await createInspectionRecord(
    {
      deviceId: 'DEV005',
      deviceName: '体温计',
      department: '发热门诊',
      inspectionDate: formatISO(threeDaysAgo, { representation: 'date' }),
      inspector: '王工',
      result: 'fail',
      remarks: '跨日提交的记录',
    },
    'demo'
  );
  const queue2 = await createQueueItem('inspection', badInspection2.id, badInspection2, 'BAD-002');
  console.log(`   ✓ 已创建: ${queue2.dirtyType} - ${queue2.dirtyDetails}\n`);

  console.log('3. 创建【设备名称变更】的校准证书...');
  const badCalibration = await createCalibrationCertificate(
    {
      deviceId: 'DEV001',
      deviceName: '心电图机-新版',
      certificateNo: 'CAL-BAD-001',
      calibrationDate: formatISO(today, { representation: 'date' }),
      validUntil: formatISO(subDays(today, -300), { representation: 'date' }),
      calibrationOrg: '第三方机构',
      status: 'valid',
    },
    'demo'
  );
  const queue3 = await createQueueItem('calibration', badCalibration.id, badCalibration, 'BAD-003');
  console.log(`   ✓ 已创建: ${queue3.dirtyType} - ${queue3.dirtyDetails}\n`);

  console.log('4. 创建【金额冲突】的维修报价...');
  await createRepairQuote(
    {
      deviceId: 'DEV002',
      deviceName: '超声诊断仪',
      quoteNo: 'REP-CONFLICT',
      repairDate: formatISO(today, { representation: 'date' }),
      description: '主板维修',
      amount: 5000.00,
      quantity: 1,
      status: 'pending',
    },
    'demo'
  );

  const badRepair = await createRepairQuote(
    {
      deviceId: 'DEV002',
      deviceName: '超声诊断仪',
      quoteNo: 'REP-CONFLICT',
      repairDate: formatISO(today, { representation: 'date' }),
      description: '主板维修',
      amount: 5500.00,
      quantity: 1,
      status: 'pending',
    },
    'demo'
  );
  const queue4 = await createQueueItem('repair', badRepair.id, badRepair, 'BAD-004');
  console.log(`   ✓ 已创建: ${queue4.dirtyType} - ${queue4.dirtyDetails}\n`);

  console.log('5. 模拟重试失败，产生死信...');
  await retryQueueItem(queue1.id);
  await retryQueueItem(queue1.id);
  await retryQueueItem(queue1.id);
  const deadLetter = await retryQueueItem(queue1.id);
  console.log(`   ✓ 已产生死信: ${deadLetter?.status} (重试次数: ${deadLetter?.retryCount}/${deadLetter?.maxRetries})\n`);

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

  console.log(`\n今日总数: ${stats.todayCount}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    脏数据触发完成！                         ║');
  console.log('║                                                            ║');
  console.log('║  下一步操作:                                                ║');
  console.log('║  npm run demo:fix       - 人工修正脏数据                    ║');
  console.log('║  npm run demo:report    - 生成护士长报告                    ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
};

triggerBadData().catch(console.error);
