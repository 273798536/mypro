import { createInspectionRecord, createCalibrationCertificate, createRepairQuote } from '../services/recordService';
import { createQueueItem } from '../services/queueService';
import { formatISO, subDays } from 'date-fns';

const importSampleData = async () => {
  console.log('开始导入示例数据...');

  const today = new Date();
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);
  const nextYear = subDays(today, -365);
  const lastMonth = subDays(today, 30);

  const inspection1 = await createInspectionRecord(
    {
      deviceId: 'DEV001',
      deviceName: '心电图机',
      department: '心内科',
      inspectionDate: formatISO(today, { representation: 'date' }),
      inspector: '张工',
      result: 'pass',
      remarks: '设备运行正常',
    },
    'system'
  );
  await createQueueItem('inspection', inspection1.id, inspection1, 'EXT-001');

  const inspection2 = await createInspectionRecord(
    {
      deviceId: 'DEV002',
      deviceName: '超声诊断仪',
      department: '超声科',
      inspectionDate: formatISO(yesterday, { representation: 'date' }),
      inspector: '李工',
      result: 'pending',
      remarks: '需进一步检查',
    },
    'system'
  );
  await createQueueItem('inspection', inspection2.id, inspection2, 'EXT-002');

  const calibration1 = await createCalibrationCertificate(
    {
      deviceId: 'DEV001',
      deviceName: '心电图机',
      certificateNo: 'CAL-2024-001',
      calibrationDate: formatISO(lastMonth, { representation: 'date' }),
      validUntil: formatISO(nextYear, { representation: 'date' }),
      calibrationOrg: '国家计量院',
      status: 'valid',
    },
    'system'
  );
  await createQueueItem('calibration', calibration1.id, calibration1, 'EXT-003');

  const calibration2 = await createCalibrationCertificate(
    {
      deviceId: 'DEV003',
      deviceName: '血压计',
      certificateNo: 'CAL-2024-002',
      calibrationDate: formatISO(lastWeek, { representation: 'date' }),
      validUntil: formatISO(lastWeek, { representation: 'date' }),
      calibrationOrg: '市计量所',
      status: 'expired',
    },
    'system'
  );
  await createQueueItem('calibration', calibration2.id, calibration2, 'EXT-004');

  const repair1 = await createRepairQuote(
    {
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
    },
    'system'
  );
  await createQueueItem('repair', repair1.id, repair1, 'EXT-005');

  const repair2 = await createRepairQuote(
    {
      deviceId: 'DEV002',
      deviceName: '超声诊断仪',
      quoteNo: 'REP-2024-002',
      repairDate: formatISO(today, { representation: 'date' }),
      description: '探头维护',
      amount: 3000.00,
      quantity: 2,
      status: 'pending',
    },
    'system'
  );
  await createQueueItem('repair', repair2.id, repair2, 'EXT-006');

  console.log('示例数据导入完成！');
  console.log(`
已创建数据:
  - 巡检记录: 2条
  - 校准证书: 2条
  - 维修报价: 2条
  - 队列项: 6条
  `);
};

importSampleData().catch(console.error);
