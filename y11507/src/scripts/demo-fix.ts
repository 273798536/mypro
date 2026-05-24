import { getManualInterventionItems, assignToManual, compensateAndClose, closeQueueItem } from '../services/queueService';
import { updateInspectionRecord, updateCalibrationCertificate, updateRepairQuote } from '../services/recordService';
import { getDiffLogsByQueueId, calculateDiff } from '../services/diffService';
import { formatISO } from 'date-fns';

const demoFix = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║               人工修正脏数据演示                            ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const manualItems = await getManualInterventionItems();
  console.log(`发现 ${manualItems.length} 条需要人工处理的记录\n`);

  let count = 1;
  for (const item of manualItems) {
    console.log(`────────────────────────────────────────────────────────────`);
    console.log(`【${count++}】处理队列项: ${item.id}`);
    console.log(`   类型: ${item.recordType}`);
    console.log(`   脏类型: ${item.dirtyType}`);
    console.log(`   详情: ${item.dirtyDetails}`);
    console.log(`   原始数据: ${item.rawData.substring(0, 100)}...\n`);

    await assignToManual(item.id, '护士长-李姐', '已核实数据');
    console.log(`   ✓ 已分配人工处理\n`);

    const rawData = JSON.parse(item.rawData);

    switch (item.dirtyType) {
      case 'missing_fields':
        console.log('   正在补全缺失字段...');
        if (item.recordType === 'inspection') {
          await updateInspectionRecord(
            item.recordId,
            {
              department: rawData.department || '通用科室',
              inspector: rawData.inspector || '默认检查员',
            },
            '护士长-李姐',
            item.id
          );
        }
        break;

      case 'cross_day':
        console.log('   正在修正日期...');
        if (item.recordType === 'inspection') {
          await updateInspectionRecord(
            item.recordId,
            {
              inspectionDate: formatISO(new Date(), { representation: 'date' }),
              remarks: '日期已核实并修正',
            },
            '护士长-李姐',
            item.id
          );
        }
        break;

      case 'name_changed':
        console.log('   正在确认设备名称...');
        if (item.recordType === 'calibration') {
          await updateCalibrationCertificate(
            item.recordId,
            {
              deviceName: '心电图机',
            },
            '护士长-李姐',
            item.id
          );
        }
        break;

      case 'amount_conflict':
        console.log('   正在核实金额...');
        if (item.recordType === 'repair') {
          await updateRepairQuote(
            item.recordId,
            {
              amount: 5200.00,
              manualOpinion: '经核实，正确金额为5200元',
            },
            '护士长-李姐',
            item.id
          );
        }
        break;
    }

    await compensateAndClose(item.id);
    console.log(`   ✓ 已补偿入账并关闭\n`);

    const diffLogs = await getDiffLogsByQueueId(item.id);
    if (diffLogs.length > 0) {
      console.log('   变更历史:');
      for (const log of diffLogs) {
        const changes = calculateDiff(log.beforeData, log.afterData);
        console.log(`   - ${log.action} (${log.operator} at ${log.createdAt})`);
        changes.forEach(c => {
          console.log(`     * ${c.field}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`);
        });
      }
      console.log('');
    }
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    人工修正完成！                           ║');
  console.log('║                                                            ║');
  console.log('║  已处理的每条记录都保留了:                                  ║');
  console.log('║  ✓ 原始数据内容                                            ║');
  console.log('║  ✓ 处理意见                                                ║');
  console.log('║  ✓ 前后变更差异                                            ║');
  console.log('║  ✓ 操作人信息                                              ║');
  console.log('║                                                            ║');
  console.log('║  下一步操作:                                                ║');
  console.log('║  npm run demo:report    - 生成护士长报告                    ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
};

demoFix().catch(console.error);
