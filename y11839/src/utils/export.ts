import type { BridgeNode, BridgeMember, ActionRecord, TestResult, OverloadEvent, MATERIALS } from '../types';

export function generateReport(
  nodes: BridgeNode[],
  members: BridgeMember[],
  actionHistory: ActionRecord[],
  testResult: TestResult | null,
  budget: number,
  budgetUsed: number
): string {
  const lines: string[] = [];

  lines.push('========================================');
  lines.push('    物理桥梁搭建赛 - 结构报告');
  lines.push('========================================');
  lines.push('');

  lines.push('【基本信息】');
  lines.push(`  节点数：${nodes.length}`);
  lines.push(`  杆件数：${members.length}`);
  lines.push(`  预算使用：${budgetUsed.toFixed(0)} / ${budget}`);
  if (budgetUsed > budget) {
    lines.push(`  ⚠ 预算超支 ${(budgetUsed - budget).toFixed(0)} 单位`);
  }
  lines.push('');

  lines.push('【核心问题：杆件过载有没有被拦住？】');
  if (!testResult) {
    lines.push('  未进行载荷测试，无法判断。');
  } else if (testResult.failedMemberIds.length === 0 && testResult.overloadedMemberIds.length === 0) {
    lines.push('  ✅ 所有杆件均未过载，结构安全。');
  } else if (testResult.overloadedMemberIds.length > 0 && testResult.failedMemberIds.length === 0) {
    lines.push('  ⚠ 存在杆件过载但尚未断裂（应力比超过1.0），结构处于危险状态。');
    lines.push(`  过载杆件：${testResult.overloadedMemberIds.join(', ')}`);
  } else {
    lines.push('  ❌ 杆件过载未被拦住，已发生结构破坏。');
    lines.push(`  断裂杆件：${testResult.failedMemberIds.join(', ')}`);
    lines.push(`  过载杆件：${testResult.overloadedMemberIds.join(', ')}`);
  }
  lines.push('');

  lines.push('【杆件受力详情】');
  for (const m of members) {
    const force = m.internalForce;
    const ratio = m.stressRatio;
    const status = ratio > 1.0 ? '❌过载' : ratio > 0.8 ? '⚠临界' : '✅安全';
    lines.push(`  杆件 ${m.id}（${m.nodeAId}-${m.nodeBId}）：`);
    lines.push(`    受力：${force.toFixed(2)} kN（${force > 0 ? '拉力' : force < 0 ? '压力' : '零力'}）`);
    lines.push(`    应力比：${ratio.toFixed(3)}  ${status}`);
    if (m.overloadReason) {
      lines.push(`    过载原因：${m.overloadReason}`);
    }
  }
  lines.push('');

  lines.push('【支点反力与稳定性】');
  const supportNodes = nodes.filter((n) => n.type === 'support');
  for (const n of supportNodes) {
    const rf = n.reactionForce;
    lines.push(`  支点 ${n.id}（${n.x.toFixed(1)}, ${n.y.toFixed(1)}）：`);
    if (rf) {
      lines.push(`    水平反力：${rf.fx.toFixed(2)} kN`);
      lines.push(`    竖向反力：${rf.fy.toFixed(2)} kN`);
    }
    if (n.isStable === false) {
      lines.push(`    ⚠ 不稳定：${n.instabilityReason}`);
    } else {
      lines.push(`    ✅ 稳定`);
    }
  }
  lines.push('');

  if (testResult) {
    lines.push('【载荷测试结果】');
    lines.push(`  车辆是否通过：${testResult.vehicleCompleted ? '是' : '否'}`);
    lines.push(`  最大挠度：${testResult.maxDeflection.toFixed(4)} m`);
    lines.push(`  结构完整性分：${testResult.structuralIntegrityScore.toFixed(0)}`);
    lines.push(`  预算效率分：${testResult.budgetEfficiencyScore.toFixed(0)}`);
    lines.push(`  总评：${testResult.totalScore.toFixed(0)}`);
    lines.push('');

    if (testResult.overloadEvents.length > 0) {
      lines.push('【过载事件记录】');
      for (let i = 0; i < testResult.overloadEvents.length; i++) {
        const evt = testResult.overloadEvents[i];
        lines.push(`  事件 ${i + 1}（车辆位置 ${evt.vehiclePosition.toFixed(1)} m）：`);
        for (const mid of evt.memberIds) {
          lines.push(`    杆件 ${mid}：受力 ${evt.forces[mid]?.toFixed(2)} kN`);
          if (evt.reasons[mid]) {
            lines.push(`      ${evt.reasons[mid]}`);
          }
        }
      }
      lines.push('');
    }
  }

  lines.push('【操作历史摘要】');
  const actionTypes: Record<string, number> = {};
  for (const action of actionHistory) {
    actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(actionTypes)) {
    lines.push(`  ${type}：${count} 次`);
  }

  const keyActions = actionHistory.filter(
    (a) => a.structuralImpact && a.structuralImpact !== '无影响'
  );
  if (keyActions.length > 0) {
    lines.push('');
    lines.push('【关键结构影响操作】');
    for (const a of keyActions) {
      const time = new Date(a.timestamp).toLocaleTimeString();
      lines.push(`  [${time}] ${a.type} → ${a.structuralImpact}`);
    }
  }

  lines.push('');
  lines.push('========================================');
  lines.push('  报告生成时间：' + new Date().toLocaleString());
  lines.push('========================================');

  return lines.join('\n');
}
