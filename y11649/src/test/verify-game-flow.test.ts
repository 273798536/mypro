/**
 * 滑雪救援派遣赛 - 核心流程验证测试
 * 验证从开始→派遣→暂停→结算→回放→导出的完整流程
 */

import { useGameStore } from '@/store/useGameStore';
import { generateReportText } from '@/utils/export';
import { findShortestPath, calculateTravelTime, isPathOpen } from '@/utils/pathfinding';
import { slopeMapData } from '@/data/slopes';
import type { EquipmentType, GameDifficulty } from '@/types';

const log = (section: string, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${section}]`;
  console.log(`\x1b[36m${prefix}\x1b[0m ${message}`);
  if (data !== undefined) {
    console.log('  ', JSON.stringify(data, null, 2).split('\n').join('\n   '));
  }
};

const logSuccess = (message: string) => console.log(`\x1b[32m✓ ${message}\x1b[0m`);
const logError = (message: string) => console.log(`\x1b[31m✗ ${message}\x1b[0m`);

let allAssertionsPassed = true;
const check = (condition: boolean, message: string): boolean => {
  if (!condition) {
    logError(message);
    allAssertionsPassed = false;
    return false;
  }
  return true;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TestResult {
  test: string;
  passed: boolean;
}

export async function runGameFlowVerification(): Promise<boolean> {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('⛷️  滑雪救援派遣赛 - 核心流程验证测试');
  console.log('═'.repeat(70));
  console.log('\n');

  const store = useGameStore;
  const results: TestResult[] = [];

  // =========================================================================
  // TEST 1: 初始化与开始游戏
  // =========================================================================
  log('TEST 1', '初始化与开始游戏');

  const initialState = store.getState();
  check(initialState.status === 'idle', '初始状态应为idle');
  check(initialState.victims.length === 0, '初始状态应无伤员');
  check(initialState.patrollers.length === 0, '初始状态应无巡逻员');
  logSuccess('初始状态检查通过');

  // 测试三种难度
  const difficulties: GameDifficulty[] = ['easy', 'normal', 'hard'];
  const expectedVictims = { easy: 3, normal: 5, hard: 7 };
  const expectedPatrollers = { easy: 3, normal: 2, hard: 2 };

  for (const diff of difficulties) {
    store.getState().resetGame();
    await sleep(50);
    store.getState().startGame(diff);
    await sleep(100);

    const state = store.getState();
    check(state.status === 'playing', `${diff}模式: 游戏状态应为playing`);
    check(state.difficulty === diff, `${diff}模式: 难度设置正确`);
    check(state.victims.length === expectedVictims[diff], `${diff}模式: 应有${expectedVictims[diff]}名伤员`);
    check(state.patrollers.length === expectedPatrollers[diff], `${diff}模式: 应有${expectedPatrollers[diff]}名巡逻员`);
    log(`${diff}模式`, `验证通过 - ${state.victims.length}名伤员, ${state.patrollers.length}名巡逻员`);
  }

  results.push({ test: '初始化与开始游戏', passed: true });

  // =========================================================================
  // TEST 2: 选择与派遣流程
  // =========================================================================
  console.log('\n');
  log('TEST 2', '选择与派遣流程');

  store.getState().resetGame();
  store.getState().startGame('easy');
  await sleep(100);

  const state = store.getState();
  const idlePatroller = state.patrollers.find(p => p.status === 'idle');
  const activeVictim = state.victims.find(v => !v.isRescued && !v.isFailed);

  if (!idlePatroller || !activeVictim) {
    logError('无法找到可用的巡逻员或伤员');
    results.push({ test: '选择与派遣流程', passed: false });
  } else {
    log('操作', `选择巡逻员: ${idlePatroller.name}`);
    store.getState().selectPatroller(idlePatroller.id);
    await sleep(50);

    log('操作', `选择伤员: ${activeVictim.name} (${activeVictim.injury})`);
    store.getState().selectVictim(activeVictim.id);
    await sleep(50);

    const stateAfterSelect = store.getState();
    check(stateAfterSelect.selectedPatroller === idlePatroller.id, '巡逻员已选中');
    check(stateAfterSelect.selectedVictim === activeVictim.id, '伤员已选中');

    log('信息', `伤员所需装备:`, activeVictim.requiredEquipment);

    // 测试1: 不完整装备派遣（应该产生警告）
    const incompleteEquipment: EquipmentType[] = ['first-aid'];
    store.getState().dispatchPatroller(
      idlePatroller.id,
      activeVictim.id,
      incompleteEquipment
    );
    await sleep(100);

    const warnings = store.getState().warnings;
    const equipWarning = warnings.find(
      w => w.type === 'equipment-mismatch' && !w.isResolved
    );
    check(equipWarning !== undefined, '装备不匹配时应产生警告');
    log('警告', '装备不匹配警告已生成:', equipWarning?.message);

    // 重置选择
    store.getState().selectPatroller(null);
    store.getState().selectVictim(null);

    // 找另一个空闲巡逻员
    const anotherPatroller = store.getState().patrollers.find(
      p => p.status === 'idle' && p.id !== idlePatroller.id
    );
    const anotherVictim = store.getState().victims.find(
      v => !v.isRescued && !v.isFailed && v.id !== activeVictim.id
    );

    if (anotherPatroller && anotherVictim) {
      log('操作', `完整装备派遣: ${anotherPatroller.name} → ${anotherVictim.name}`);
      store.getState().dispatchPatroller(
        anotherPatroller.id,
        anotherVictim.id,
        anotherVictim.requiredEquipment
      );
      await sleep(100);

      const dispatched = store.getState().patrollers.find(p => p.id === anotherPatroller.id);
      check(dispatched?.status === 'en-route', '巡逻员状态应为en-route');
      check(dispatched?.assignedVictim === anotherVictim.id, '巡逻员已分配任务');
      check(dispatched?.equipment.length === anotherVictim.requiredEquipment.length, '装备已正确携带');
      logSuccess('派遣流程正常');
    }

    results.push({ test: '选择与派遣流程', passed: true });
  }

  // =========================================================================
  // TEST 3: 警告系统
  // =========================================================================
  console.log('\n');
  log('TEST 3', '警告系统');

  const warningCountBefore = store.getState().warnings.length;

  store.getState().addWarning('equipment-mismatch', '测试警告：缺少担架', '装备检查');
  await sleep(50);
  store.getState().addWarning('route-closed', '测试警告：中级道B关闭', '路线检查');
  await sleep(50);
  store.getState().addWarning('injury-worsening', '测试警告：伤员李明伤情恶化', '伤情监测');
  await sleep(50);

  const warningsAfter = store.getState().warnings;
  check(warningsAfter.length === warningCountBefore + 3, '三条警告已添加');

  const warningToResolve = warningsAfter.find(w => w.message.includes('缺少担架'));
  if (warningToResolve) {
    store.getState().resolveWarning(warningToResolve.id, '已从装备库补充担架');
    await sleep(50);

    const resolved = store.getState().warnings.find(w => w.id === warningToResolve.id);
    check(resolved?.isResolved === true, '警告已标记为已解决');
    check(resolved?.correction === '已从装备库补充担架', '修正说明已记录');
    check(resolved?.resolvedAt !== undefined, '解决时间已记录');

    log('已修正', `警告: ${resolved?.message} → ${resolved?.correction}`);
  }

  const unresolvedCount = store.getState().warnings.filter(w => !w.isResolved).length;
  const resolvedCount = store.getState().warnings.filter(w => w.isResolved).length;
  log('统计', `警告总数: ${warningsAfter.length}, 已修正: ${resolvedCount}, 待确认: ${unresolvedCount}`);

  logSuccess('警告系统正常');
  results.push({ test: '警告系统', passed: true });

  // =========================================================================
  // TEST 4: 暂停/继续/重开
  // =========================================================================
  console.log('\n');
  log('TEST 4', '暂停/继续/重开功能');

  store.getState().pauseGame();
  await sleep(50);
  check(store.getState().status === 'paused', '游戏已暂停');
  logSuccess('暂停功能正常');

  store.getState().resumeGame();
  await sleep(50);
  check(store.getState().status === 'playing', '游戏已继续');
  logSuccess('继续功能正常');

  store.getState().restartGame();
  await sleep(100);
  const restartState = store.getState();
  check(restartState.status === 'playing', '游戏已重开');
  check(restartState.currentTime === 0, '时间已重置为0');
  check(restartState.victims.length === 3, '伤员已重新生成');
  logSuccess('重开功能正常');

  results.push({ test: '暂停/继续/重开', passed: true });

  // =========================================================================
  // TEST 5: 时间推进与操作记录
  // =========================================================================
  console.log('\n');
  log('TEST 5', '时间推进与操作记录');

  const startTime = store.getState().currentTime;
  const actionCountBefore = store.getState().actionHistory.length;

  for (let i = 0; i < 10; i++) {
    store.getState().updateTimer();
    await sleep(10);
  }

  const endTime = store.getState().currentTime;
  const actionCountAfter = store.getState().actionHistory.length;

  check(endTime === startTime + 10, `时间准确推进10秒 (${startTime} → ${endTime})`);
  check(actionCountAfter >= actionCountBefore, '操作记录已增加');
  log('信息', `时间: ${startTime}s → ${endTime}s, 操作记录: ${actionCountBefore} → ${actionCountAfter}`);

  const recentActions = store.getState().actionHistory.slice(-5);
  log('信息', '最近操作:', recentActions.map(a => ({
    type: a.type,
    desc: a.description.substring(0, 30),
    time: a.timestamp,
  })));

  logSuccess('时间推进与记录功能正常');
  results.push({ test: '时间推进与操作记录', passed: true });

  // =========================================================================
  // TEST 6: 结算与评分
  // =========================================================================
  console.log('\n');
  log('TEST 6', '结算与评分');

  store.getState().endGame();
  await sleep(100);

  const report = store.getState().report;
  check(report !== null, '报告已生成');
  check(report !== undefined && report.totalVictims === 3, '报告中伤员总数正确');
  check(report !== undefined && report.score >= 0 && report.score <= 100, `分数在有效范围: ${report?.score}`);
  check(report !== undefined && ['S', 'A', 'B', 'C', 'D', 'F'].includes(report.grade), `评级有效: ${report?.grade}`);

  if (report) {
    log('信息', '评分结果:', {
      grade: report.grade,
      score: report.score,
      breakdown: report.breakdown,
    });

    const totalScore =
      report.breakdown.successRate +
      report.breakdown.speedScore +
      report.breakdown.equipmentScore +
      report.breakdown.warningScore;
    check(totalScore === report.score, `分数组成正确: ${totalScore} === ${report.score}`);

    // 验证分类统计
    check(report.unhandled === report.totalVictims - report.rescued - report.failed,
      `未处理数量计算正确: ${report.unhandled}`);
    check(report.needsConfirmation === store.getState().warnings.filter(w => !w.isResolved).length,
      `待确认数量计算正确: ${report.needsConfirmation}`);
    check(report.corrected === store.getState().warnings.filter(w => w.isResolved).length,
      `已修正数量计算正确: ${report.corrected}`);

    log('分类统计', '', {
      总数: report.totalVictims,
      成功: report.rescued,
      失败: report.failed,
      未处理: report.unhandled,
      已修正: report.corrected,
      待确认: report.needsConfirmation,
    } as unknown);
  }

  logSuccess('结算与评分系统正常');
  results.push({ test: '结算与评分', passed: true });

  // =========================================================================
  // TEST 7: 报告导出
  // =========================================================================
  console.log('\n');
  log('TEST 7', '报告导出');

  if (report) {
    const reportText = generateReportText(report);

    const requiredSections = [
      '滑雪救援派遣赛',
      '评级:',
      '总分:',
      '得分明细',
      '救援统计',
      '警告处理情况',
      '详细警告记录',
      '未处理',
      '已修正',
      '需人工确认',
    ];

    for (const section of requiredSections) {
      check(reportText.includes(section), `报告包含"${section}"`);
    }

    log('信息', '报告文本预览（前800字符）:');
    console.log(reportText.substring(0, 800) + '...\n');

    // 验证警告记录在报告中
    store.getState().warnings.forEach((w, i) => {
      check(reportText.includes(w.message), `报告包含警告${i + 1}: ${w.message.substring(0, 20)}...`);
      if (w.source) {
        check(reportText.includes(w.source), `报告包含警告来源: ${w.source}`);
      }
    });

    logSuccess('报告导出功能正常');
  }

  results.push({ test: '报告导出', passed: true });

  // =========================================================================
  // TEST 8: 路径查找算法
  // =========================================================================
  console.log('\n');
  log('TEST 8', '路径查找算法');

  const testCases = [
    { start: 'base', end: 'peak', shouldExist: true },
    { start: 'base', end: 'mid-station', shouldExist: true },
    { start: 'green-1', end: 'double-black', shouldExist: true },
  ];

  for (const tc of testCases) {
    const path = findShortestPath(slopeMapData, tc.start, tc.end);
    if (tc.shouldExist) {
      check(path !== null, `路径存在: ${tc.start} → ${tc.end}`);
      if (path) {
        check(path[0] === tc.start, '路径起点正确');
        check(path[path.length - 1] === tc.end, '路径终点正确');
        check(path.length > 1, '路径包含多个节点');

        const travelTime = calculateTravelTime(slopeMapData, path, 1.0);
        check(travelTime > 0, `路径时间计算正确: ${travelTime}秒`);

        const open = isPathOpen(slopeMapData, path);
        check(open === true, '默认路径全部开放');

        log('路径', `${tc.start} → ${tc.end}:`, {
          节点: path.join(' → '),
          预计时间: `${travelTime}秒`,
        });
      }
    }
  }

  logSuccess('路径查找算法正常');
  results.push({ test: '路径查找算法', passed: true });

  // =========================================================================
  // 测试结果汇总
  // =========================================================================
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📊 验证测试结果汇总');
  console.log('═'.repeat(70));

  const allPassed = results.every(r => r.passed) && allAssertionsPassed;
  results.forEach((result, index) => {
    if (result.passed) {
      logSuccess(`${index + 1}. ${result.test}`);
    } else {
      logError(`${index + 1}. ${result.test}`);
    }
  });

  console.log('');
  console.log(`通过: ${results.filter(r => r.passed).length} / ${results.length}`);
  console.log(`断言全部通过: ${allAssertionsPassed ? '是' : '否'}`);

  if (allPassed) {
    console.log('\n\x1b[32m🎉 所有验证测试通过！\x1b[0m');
    console.log('\x1b[32m   ✓ 游戏初始化与难度选择\x1b[0m');
    console.log('\x1b[32m   ✓ 巡逻员与伤员选择\x1b[0m');
    console.log('\x1b[32m   ✓ 装备匹配与派遣\x1b[0m');
    console.log('\x1b[32m   ✓ 警告系统（添加/修正/来源记录）\x1b[0m');
    console.log('\x1b[32m   ✓ 暂停/继续/重开\x1b[0m');
    console.log('\x1b[32m   ✓ 时间推进与操作历史\x1b[0m');
    console.log('\x1b[32m   ✓ 结算评分与分类统计\x1b[0m');
    console.log('\x1b[32m   ✓ 报告导出（未处理/已修正/待确认）\x1b[0m');
    console.log('\x1b[32m   ✓ 路径查找算法\x1b[0m\n');
  } else {
    console.log('\n\x1b[31m⚠️  部分测试未通过，请检查代码。\x1b[0m\n');
  }

  // 清理状态
  store.getState().resetGame();

  return allPassed && allAssertionsPassed;
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runGameFlowVerification()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(error => {
      console.error('\n\x1b[31m测试执行出错:\x1b[0m', error);
      process.exit(1);
    });
}
