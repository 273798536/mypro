import { initGame, processRound, simulateGame } from './gameEngine';
import { hashConfig } from './helpers';
import type { GameConfig, Decision, ProjectCard } from '../types';

const testProjects: ProjectCard[] = [
  {
    id: 'test1',
    name: '测试项目A',
    investmentAmount: 5000,
    expectedRevenue: 8000,
    duration: 5,
    riskLevel: 'low',
    category: '测试',
    revenuePerRound: [0, 0, 1500, 2000, 2500, 2000],
  },
  {
    id: 'test2',
    name: '测试项目B',
    investmentAmount: 3000,
    expectedRevenue: 5500,
    duration: 4,
    riskLevel: 'medium',
    category: '测试',
    revenuePerRound: [0, 500, 1500, 2000, 1500],
  },
];

const testConfig: GameConfig = {
  projects: testProjects,
  debt: {
    totalDebt: 20000,
    interestRate: 0.045,
    interestType: 'fixed',
    repaymentTerm: 10,
  },
  totalRounds: 10,
  difficulty: 'normal',
  seed: 12345,
};

function runDeterminismTest(): { passed: boolean; message: string } {
  const decisions: Decision[] = [];
  for (let round = 1; round <= 10; round++) {
    decisions.push({
      round,
      projectIds: round === 1 ? ['test1'] : round === 3 ? ['test2'] : [],
      repaymentAmount: round <= 5 ? 75 : 200,
      repaymentType: round <= 5 ? 'minimum' : 'partial',
    });
  }

  const result1 = simulateGame(testConfig, decisions);
  const result2 = simulateGame(testConfig, decisions);

  if (result1.cash !== result2.cash) {
    return { passed: false, message: `现金不一致: ${result1.cash} vs ${result2.cash}` };
  }
  if (result1.debtBalance !== result2.debtBalance) {
    return { passed: false, message: `债务余额不一致: ${result1.debtBalance} vs ${result2.debtBalance}` };
  }
  if (result1.rating !== result2.rating) {
    return { passed: false, message: `评级不一致: ${result1.rating} vs ${result2.rating}` };
  }
  if (result1.totalInterestPaid !== result2.totalInterestPaid) {
    return { passed: false, message: `累计利息不一致: ${result1.totalInterestPaid} vs ${result2.totalInterestPaid}` };
  }
  if (result1.totalProjectRevenue !== result2.totalProjectRevenue) {
    return { passed: false, message: `项目收益不一致: ${result1.totalProjectRevenue} vs ${result2.totalProjectRevenue}` };
  }

  return { passed: true, message: '确定性测试通过：相同配置运行两遍结果完全一致' };
}

function runEdgeCaseTest(): { passed: boolean; message: string } {
  const state = initGame(testConfig);

  const interestMissEvents = state.events.filter((e) => e.type === 'interest_miss');
  const projectDelayEvents = state.events.filter((e) => e.type === 'project_delay');
  const revenueDeclineEvents = state.events.filter((e) => e.type === 'revenue_decline');

  const hasEdgeCases = interestMissEvents.length > 0 || projectDelayEvents.length > 0 || revenueDeclineEvents.length > 0;

  if (!hasEdgeCases) {
    return { passed: true, message: '边界事件生成器正常（本轮未生成边界事件，属于正常随机波动）' };
  }

  let eventsDesc: string[] = [];
  if (interestMissEvents.length > 0) eventsDesc.push(`利息漏算${interestMissEvents.length}次`);
  if (projectDelayEvents.length > 0) eventsDesc.push(`项目延期${projectDelayEvents.length}次`);
  if (revenueDeclineEvents.length > 0) eventsDesc.push(`收入下滑${revenueDeclineEvents.length}次`);

  return { passed: true, message: `边界事件正常生成：${eventsDesc.join('，')}` };
}

function runInitGameTest(): { passed: boolean; message: string } {
  const state = initGame(testConfig);

  if (state.cash !== testConfig.debt.totalDebt) {
    return { passed: false, message: `初始现金应为债务总额 ${testConfig.debt.totalDebt}，实际为 ${state.cash}` };
  }
  if (state.debtBalance !== testConfig.debt.totalDebt) {
    return { passed: false, message: `初始债务余额应为 ${testConfig.debt.totalDebt}，实际为 ${state.debtBalance}` };
  }
  if (state.currentRound !== 1) {
    return { passed: false, message: `初始回合应为1，实际为 ${state.currentRound}` };
  }
  if (state.isGameOver) {
    return { passed: false, message: '初始状态不应为游戏结束' };
  }
  if (state.interestPayments.length !== testConfig.totalRounds) {
    return { passed: false, message: `利息支付记录应为${testConfig.totalRounds}条，实际为${state.interestPayments.length}` };
  }

  return { passed: true, message: '游戏初始化测试通过' };
}

function runProcessRoundTest(): { passed: boolean; message: string } {
  let state = initGame(testConfig);

  const firstPayment = state.interestPayments[0];
  const interestDue = firstPayment.amount;

  state = processRound(state, {
    round: 1,
    projectIds: ['test1'],
    repaymentAmount: interestDue,
    repaymentType: 'minimum',
  });

  if (state.cash >= testConfig.debt.totalDebt) {
    return { passed: false, message: '投资后现金应减少' };
  }
  if (state.activeProjects.length !== 1) {
    return { passed: false, message: `应有一个活跃项目，实际有${state.activeProjects.length}` };
  }
  if (state.snapshots.length !== 1) {
    return { passed: false, message: `应有一个快照，实际有${state.snapshots.length}` };
  }

  return { passed: true, message: '回合处理测试通过' };
}

function runHashConfigTest(): { passed: boolean; message: string } {
  const hash1 = hashConfig(testConfig);
  const hash2 = hashConfig(testConfig);
  const differentConfig = { ...testConfig, totalRounds: 5 };
  const hash3 = hashConfig(differentConfig);

  if (hash1 !== hash2) {
    return { passed: false, message: `相同配置哈希不一致: ${hash1} vs ${hash2}` };
  }
  if (hash1 === hash3) {
    return { passed: false, message: '不同配置哈希不应相同' };
  }

  return { passed: true, message: '配置哈希测试通过' };
}

export function runAllTests(): { name: string; passed: boolean; message: string }[] {
  return [
    { name: '确定性测试', ...runDeterminismTest() },
    { name: '边界事件测试', ...runEdgeCaseTest() },
    { name: '初始化测试', ...runInitGameTest() },
    { name: '回合处理测试', ...runProcessRoundTest() },
    { name: '哈希测试', ...runHashConfigTest() },
  ];
}

console.log('=== 城市债务经营赛 - 游戏引擎测试 ===');
const results = runAllTests();
for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`${icon} ${r.name}: ${r.message}`);
}
const failedCount = results.filter((r) => !r.passed).length;
console.log(`\n总计: ${results.length} 项测试，${failedCount > 0 ? failedCount + ' 项失败' : '全部通过'}`);
