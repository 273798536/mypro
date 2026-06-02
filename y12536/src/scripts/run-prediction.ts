import { MarkovChain } from '../core/markov-chain';
import { DataStore } from '../data/data-store';
import { generateSampleData } from '../data/sample-data';

const VERSION = '1.0.0';
const SOURCE = 'cli-prediction';

console.log('🔮 马尔可夫客户流失预测 - 预测任务');
console.log('=' .repeat(50));

const seed = parseInt(process.argv[2]) || 42;
const periods = parseInt(process.argv[3]) || 30;

console.log(`\n📋 配置参数:`);
console.log(`   随机种子: ${seed}`);
console.log(`   预测周期: ${periods} 天`);
console.log(`   版本: ${VERSION}`);
console.log(`   来源: ${SOURCE}`);

const markovChain = new MarkovChain(seed, VERSION, SOURCE);
const dataStore = new DataStore(VERSION, SOURCE);

console.log(`\n📊 生成示例数据...`);
generateSampleData(dataStore, 300, seed);
console.log(`   ✓ 会员数量: ${dataStore.getAllMembers().length}`);
console.log(`   ✓ 策略数量: ${dataStore.getAllStrategies().length}`);

const statusDist = dataStore.calculateStatusDistribution();
console.log(`\n📈 当前状态分布:`);
Object.entries(statusDist).forEach(([status, count]) => {
  console.log(`   ${status}: ${count}`);
});

console.log(`\n🧮 计算转移矩阵...`);
const statusHistory = dataStore.getAllStatusHistory();
console.log(`   状态历史记录: ${statusHistory.length} 条`);

const matrix = markovChain.calculateTransitionMatrix(statusHistory);
console.log(`   ✓ 转移矩阵计算完成`);
console.log(`   ✓ 样本量: ${matrix.sampleSize}`);

console.log(`\n🔄 转移矩阵 (概率 %):`);
const states = markovChain.getStates();
console.log(`   ${'从↓/到→'.padEnd(10)} ${states.map(s => s.padEnd(10)).join(' ')}`);
matrix.matrix.forEach((row, i) => {
  const probs = row.map(p => (p * 100).toFixed(1).padStart(9) + '%');
  console.log(`   ${states[i].padEnd(10)} ${probs.join(' ')}`);
});

console.log(`\n📊 计算稳态分布...`);
const steadyState = markovChain.calculateSteadyState(matrix.matrix);
console.log(`   稳态分布:`);
states.forEach((state, i) => {
  console.log(`     ${state.padEnd(12)} ${(steadyState[i] * 100).toFixed(2)}%`);
});

console.log(`\n⏱️  计算平均流失周期...`);
const mttc = markovChain.calculateMeanTimeToChurn(matrix.matrix);
console.log(`   平均流失时间: ${mttc.toFixed(2)} 天`);

console.log(`\n🔮 执行预测 (${periods} 天)...`);
const initialDist = dataStore.getCurrentDistribution();

const config = {
  seed,
  periods,
  initialDistribution: initialDist,
  version: VERSION,
  source: SOURCE,
};

try {
  const prediction = markovChain.predict(matrix, config);
  console.log(`   ✓ 预测完成，预测ID: ${prediction.id}`);

  console.log(`\n📉 流失率变化:`);
  console.log(`   第 1 天: ${(prediction.churnProbability[0] * 100).toFixed(2)}%`);
  console.log(`   第 ${Math.floor(periods / 2)} 天: ${(prediction.churnProbability[Math.floor(periods / 2) - 1] * 100).toFixed(2)}%`);
  console.log(`   第 ${periods} 天: ${(prediction.churnProbability[periods - 1] * 100).toFixed(2)}%`);

  console.log(`\n✅ 预测任务完成！`);
  console.log(`\n💡 提示: 运行 npm run report 生成完整报告`);
} catch (error) {
  console.error(`\n❌ 预测失败:`, error instanceof Error ? error.message : error);
  process.exit(1);
}
