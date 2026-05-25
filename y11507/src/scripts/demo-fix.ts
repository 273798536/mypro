import { getManualInterventionItems, assignToManual, fixAndCompensate, compensateAndClose, closeQueueItem } from '../services/queueService';
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

    const beforeDiffLogs = await getDiffLogsByQueueId(item.id);
    console.log(`   处理前已有 ${beforeDiffLogs.length} 条变更日志\n`);

    await assignToManual(item.id, '护士长-李姐', '已核实数据，准备修正');
    console.log(`   ✓ 已分配人工处理\n`);

    const rawData = JSON.parse(item.rawData);
    let recordData: any = {};

    switch (item.dirtyType) {
      case 'missing_fields':
        console.log('   正在补全缺失字段...');
        if (item.recordType === 'inspection') {
          recordData = {
            department: rawData.department || '通用科室',
            inspector: rawData.inspector || '默认检查员',
          };
        } else if (item.recordType === 'calibration') {
          recordData = {
            calibrationOrg: rawData.calibrationOrg || '默认校准机构',
            status: rawData.status || 'valid',
          };
        } else if (item.recordType === 'repair') {
          recordData = {
            description: rawData.description || '默认描述',
            status: rawData.status || 'pending',
          };
        }
        break;

      case 'cross_day':
        console.log('   正在修正日期...');
        if (item.recordType === 'inspection') {
          recordData = {
            inspectionDate: formatISO(new Date(), { representation: 'date' }),
            remarks: '日期已核实并修正',
          };
        } else if (item.recordType === 'calibration') {
          recordData = {
            calibrationDate: formatISO(new Date(), { representation: 'date' }),
          };
        } else if (item.recordType === 'repair') {
          recordData = {
            repairDate: formatISO(new Date(), { representation: 'date' }),
          };
        }
        break;

      case 'name_changed':
        console.log('   正在确认设备名称...');
        recordData = {
          deviceName: '心电图机',
        };
        break;

      case 'amount_conflict':
        console.log('   正在核实金额...');
        recordData = {
          amount: 5200.00,
          manualOpinion: '经核实，正确金额为5200元',
        };
        break;
    }

    const result = await fixAndCompensate(item.id, recordData, '护士长-李姐');
    console.log(`   ✓ 已修正并补偿入账\n`);

    const afterDiffLogs = await getDiffLogsByQueueId(item.id);
    console.log(`   变更历史 (共 ${afterDiffLogs.length} 条):`);
    afterDiffLogs.forEach((log, i) => {
      const changes = calculateDiff(log.beforeData, log.afterData);
      console.log(`   ${i + 1}. ${log.action} (${log.operator} at ${log.createdAt})`);
      console.log(`      备注: ${log.remarks}`);
      if (changes.length > 0) {
        console.log(`      变更详情:`);
        changes.forEach(c => {
          console.log(`        • ${c.field}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`);
        });
      }
      console.log('');
    });
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    人工修正完成！                           ║');
  console.log('║                                                            ║');
  console.log('║  每一步都有差异日志可回看:                                  ║');
  console.log('║  ✓ 提交回执时的原始数据和脏类型                             ║');
  console.log('║  ✓ 人工接管时的操作人和处理意见                             ║');
  console.log('║  ✓ 修正时的字段变更前后对比                                 ║');
  console.log('║  ✓ 补偿入账时的状态变更                                    ║');
  console.log('║                                                            ║');
  console.log('║  数据一致性保证:                                            ║');
  console.log('║  ✓ 导出文件、详情接口、历史查询使用同一数据源               ║');
  console.log('║  ✓ 所有变更都记录操作人、时间、前后差异                     ║');
  console.log('║                                                            ║');
  console.log('║  下一步操作:                                                ║');
  console.log('║  npm run demo:report    - 生成护士长报告                    ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
};

demoFix().catch(console.error);
