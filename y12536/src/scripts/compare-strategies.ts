import { MarkovChain } from '../core/markov-chain';
import { DataStore } from '../data/data-store';
import { generateSampleData } from '../data/sample-data';
import { StrategyEngine } from '../strategy/strategy-engine';

const VERSION = '1.0.0';
const SOURCE = 'cli-compare';

console.log('⚖️  马尔可夫客户流失预测 - 策略比较');
console.log('=' .repeat(60));

const seed = parseInt(process.argv[2]) || 42;

console.log(`\n📋 配置参数:`);
console.log(`   随机种子: ${seed}`);
console.log(`   版本: ${VERSION}`);
console.log(`   来源: ${SOURCE}`);

const markovChain = new MarkovChain(seed, VERSION, SOURCE);
const dataStore = new DataStore(VERSION, SOURCE);
const strategyEngine = new StrategyEngine(dataStore, markovChain, VERSION, SOURCE);

console.log(`\n📊 生成示例数据...`);
generateSampleData(dataStore, 500, seed);
console.log(`   ✓ 会员: ${dataStore.getAllMembers().length} 人`);

console.log(`\n🧮 计算基准转移矩阵...`);
const statusHistory = dataStore.getAllStatusHistory();
const matrix = markovChain.calculateTransitionMatrix(statusHistory);

const steadyState = markovChain.calculateSteadyState(matrix.matrix);
const churnedIdx = markovChain.getStates().indexOf('churned');
const baselineRetention = 1 - steadyState[churnedIdx];

console.log(`   ✓ 基准留存率: ${(baselineRetention * 100).toFixed(2)}%`);

const strategies = dataStore.getAllStrategies();
console.log(`\n📋 策略列表 (${strategies.length} 个):`);
strategies.forEach((s, i) => {
  console.log(`   ${i + 1}. ${s.name}${s.isActive ? '' : ' (未启用)'}`);
  console.log(`      ${s.description}`);
  console.log(`      规则数: ${s.rules.length} | 创建者: ${s.createdBy}`);
});

console.log(`\n⚙️  计算策略效果...`);
const comparison = strategyEngine.compareStrategies(
  matrix,
  strategies,
  baselineRetention,
  1000,
  500
);

console.log(`\n${'='.repeat(90)}`);
console.log(`${'排名'.padEnd(4)} ${'策略名称'.padEnd(24)} ${'基准留存'.padEnd(10)} ${'优化后'.padEnd(10)} ${'提升'.padEnd(10)} ${'成本'.padEnd(12)} ${'ROI'.padEnd(8)} ${'评级'}`);
console.log(`${'-'.repeat(90)}`);

const getRoiLabel = (roi: number): string => {
  if (roi >= 2) return '⭐ 优秀';
  if (roi >= 1) return '✓ 良好';
  if (roi >= 0) return '△ 一般';
  return '✗ 亏损';
};

comparison.forEach((s, idx) => {
  console.log(
    `${String(idx + 1).padEnd(4)} ` +
    `${s.strategyName.padEnd(24)} ` +
    `${(s.baselineRetention * 100).toFixed(1).padStart(7)}% ` +
    `${(s.improvedRetention * 100).toFixed(1).padStart(7)}% ` +
    `+${s.liftPercentage.toFixed(1).padStart(5)}% ` +
    `¥${String(s.costEstimate.toFixed(0)).padStart(9)} ` +
    `${s.roi.toFixed(2).padStart(6)} ` +
    `${getRoiLabel(s.roi)}`
  );
});

console.log(`${'='.repeat(90)}`);

if (comparison.length > 0) {
  const best = comparison[0];
  console.log(`\n🏆 最优策略: ${best.strategyName}`);
  console.log(`   ROI: ${best.roi.toFixed(2)}`);
  console.log(`   预计留存提升: +${best.liftPercentage.toFixed(2)}%`);
  console.log(`   预计 LTV 增益: ¥${best.estimatedLtvGain.toLocaleString()}`);
  console.log(`   预计触达次数: ${best.touchCount.toLocaleString()}`);
  console.log(`   预计成本: ¥${best.costEstimate.toLocaleString()}`);
}

console.log(`\n📊 渠道效果参考:`);
const channels = ['email', 'sms', 'push', 'popup', 'wechat', 'phone'];
const channelLabels: Record<string, string> = {
  email: '邮件',
  sms: '短信',
  push: '推送',
  popup: '弹窗',
  wechat: '微信',
  phone: '电话',
};

channels.forEach(ch => {
  const effectiveness = strategyEngine.getChannelEffectiveness(ch as any);
  const cost = strategyEngine.getChannelCost(ch as any);
  console.log(`   ${channelLabels[ch].padEnd(6)} 效果: ${(effectiveness * 100).toFixed(0)}% | 成本: ¥${cost}`);
});

console.log(`\n✅ 策略比较完成！`);
console.log(`\n💡 运行 npm run report 生成完整分析报告`);
