import { createEstimation, reviewEstimation, advanceStatus, getEstimation } from '../services/sidepocket';
import { exportReportAsText } from '../services/report';
import { store } from '../store/store';

function main() {
  console.log('=== 私募侧袋份额估算 - 示例数据 ===\n');

  const record1 = createEstimation({
    fundId: 'FUND-2024-001',
    fundName: '明远稳健成长私募基金',
    sidePocketAssetName: 'XX地产项目A期（风险资产）',
    sidePocketNav: 0.85,
    investorShares: [
      { investorId: 'INV-001', investorName: '张三', originalShares: 5000000, sidePocketShares: 1250000 },
      { investorId: 'INV-002', investorName: '李四', originalShares: 3000000, sidePocketShares: 750000 },
      { investorId: 'INV-003', investorName: '王五', originalShares: 2000000, sidePocketShares: 500000 },
    ],
    feeRules: [
      { feeType: 'management', feeRate: 0.015, feeBase: 'nav', description: '侧袋管理费1.5%' },
      { feeType: 'custody', feeRate: 0.002, feeBase: 'nav', description: '托管费0.2%' },
    ],
    valuationDate: '2024-11-30',
    valuationDelayDays: 5,
    delayReason: '底层资产审计报告延迟出具',
  });
  console.log(`[1] 创建估算记录: ${record1.id}`);
  console.log(`    状态: ${record1.status}`);
  console.log(`    侧袋总份额: ${record1.summary.totalSidePocketShares}`);
  console.log(`    估值延迟: ${record1.summary.valuationDelayDays}天 - ${record1.summary.delayReason}`);

  const reviewed = reviewEstimation(record1.id, { reviewer: '赵会计' });
  console.log(`\n[2] 复核通过: 复核人=${reviewed.reviewer}, 状态=${reviewed.status}`);

  const advanced1 = advanceStatus(record1.id);
  console.log(`[3] 推进状态: ${advanced1.status}`);

  const advanced2 = advanceStatus(record1.id, { note: '确认侧袋份额拆分，执行赎回冻结' });
  console.log(`[4] 推进状态: ${advanced2.status}, 冻结笔数: ${advanced2.summary.frozenShareCount}`);

  console.log('\n--- 文本报告 ---\n');
  const textReport = exportReportAsText(record1.id);
  console.log(textReport);

  const record2 = createEstimation({
    fundId: 'FUND-2024-002',
    fundName: '恒信优选对冲基金',
    sidePocketAssetName: 'YY能源债券（违约资产）',
    sidePocketNav: 0.42,
    investorShares: [
      { investorId: 'INV-004', investorName: '赵六', originalShares: 8000000, sidePocketShares: 2000000 },
      { investorId: 'INV-005', investorName: '钱七', originalShares: 4000000, sidePocketShares: 1000000 },
    ],
    feeRules: [
      { feeType: 'management', feeRate: 0.02, feeBase: 'nav', description: '侧袋管理费2%' },
      { feeType: 'performance', feeRate: 0.2, feeBase: 'nav', description: '业绩报酬20%（高水位法）' },
    ],
    valuationDate: '2024-12-15',
    valuationDelayDays: 0,
    delayReason: '',
  });
  console.log(`\n\n[5] 创建第二条估算记录: ${record2.id}`);
  console.log(`    状态: ${record2.status}, 估值延迟: ${record2.summary.valuationDelayDays}天`);

  console.log('\n=== 数据写入完成 ===');
  console.log(`估算记录总数: ${store.estimationRecords.size}`);
  console.log(`投资人份额总数: ${store.investorShares.size}`);
  console.log(`费用扣减总数: ${store.feeDeductions.size}`);
  console.log(`赎回冻结总数: ${store.redemptionFreezes.size}`);
  console.log(`估值版本总数: ${store.valuationVersions.size}`);
}

main();
