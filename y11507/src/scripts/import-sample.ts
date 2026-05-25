import { submitToQueue } from '../services/queueService';
import { formatISO, subDays } from 'date-fns';

const importSampleData = async () => {
  console.log('开始导入示例数据...\n');

  const today = new Date();
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);
  const nextYear = subDays(today, -365);
  const lastMonth = subDays(today, 30);
  const expiredDate = subDays(today, 10);

  console.log('1. 导入正常巡检记录...');
  await submitToQueue('inspection', {
    deviceId: 'DEV001',
    deviceName: '心电图机',
    department: '心内科',
    inspectionDate: formatISO(today, { representation: 'date' }),
    inspector: '张工',
    result: 'pass',
    remarks: '设备运行正常',
  }, 'EXT-001');

  await submitToQueue('inspection', {
    deviceId: 'DEV002',
    deviceName: '超声诊断仪',
    department: '超声科',
    inspectionDate: formatISO(yesterday, { representation: 'date' }),
    inspector: '李工',
    result: 'pending',
    remarks: '需进一步检查',
  }, 'EXT-002');

  console.log('2. 导入校准证书（含过期）...');
  await submitToQueue('calibration', {
    deviceId: 'DEV001',
    deviceName: '心电图机',
    certificateNo: 'CAL-2024-001',
    calibrationDate: formatISO(lastMonth, { representation: 'date' }),
    validUntil: formatISO(nextYear, { representation: 'date' }),
    calibrationOrg: '国家计量院',
    status: 'valid',
  }, 'EXT-003');

  await submitToQueue('calibration', {
    deviceId: 'DEV003',
    deviceName: '血压计',
    certificateNo: 'CAL-2024-002',
    calibrationDate: formatISO(expiredDate, { representation: 'date' }),
    validUntil: formatISO(expiredDate, { representation: 'date' }),
    calibrationOrg: '市计量所',
    status: 'valid',
  }, 'EXT-004');

  console.log('3. 导入维修报价...');
  await submitToQueue('repair', {
    deviceId: 'DEV001',
    deviceName: '心电图机',
    quoteNo: 'REP-2024-001',
    repairDate: formatISO(yesterday, { representation: 'date' }),
    description: '更换传感器',
    amount: 1500.00,
    quantity: 1,
    status: 'approved',
    serviceRemarks: '客服已确认报价',
    manualOpinion: '同意维修',
  }, 'EXT-005');

  await submitToQueue('repair', {
    deviceId: 'DEV002',
    deviceName: '超声诊断仪',
    quoteNo: 'REP-2024-002',
    repairDate: formatISO(today, { representation: 'date' }),
    description: '探头维护',
    amount: 3000.00,
    quantity: 2,
    status: 'pending',
  }, 'EXT-006');

  console.log('\n示例数据导入完成！');
  console.log(`
已创建数据:
  - 巡检记录: 2条
  - 校准证书: 2条 (含1条已过期)
  - 维修报价: 2条
  - 队列项: 6条

提示: 运行 npm run demo:bad-data 查看脏数据触发效果
  `);
};

importSampleData().catch(console.error);
