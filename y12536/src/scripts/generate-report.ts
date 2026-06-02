import { MarkovChain } from '../core/markov-chain';
import { DataStore } from '../data/data-store';
import { generateSampleData } from '../data/sample-data';
import { StrategyEngine } from '../strategy/strategy-engine';
import { ReportGenerator } from '../reporting/report-generator';

const VERSION = '1.0.0';
const SOURCE = 'cli-report';

console.log('📄 马尔可夫客户流失预测 - 报告生成');
console.log('=' .repeat(50));

const seed = parseInt(process.argv[2]) || 42;
const periods = parseInt(process.argv[3]) || 30;
const format = (process.argv[4] as 'html' | 'json') || 'html';

console.log(`\n📋 配置参数:`);
console.log(`   随机种子: ${seed}`);
console.log(`   预测周期: ${periods} 天`);
console.log(`   报告格式: ${format}`);
console.log(`   版本: ${VERSION}`);
console.log(`   来源: ${SOURCE}`);

const markovChain = new MarkovChain(seed, VERSION, SOURCE);
const dataStore = new DataStore(VERSION, SOURCE);
const strategyEngine = new StrategyEngine(dataStore, markovChain, VERSION, SOURCE);
const reportGenerator = new ReportGenerator(markovChain, undefined, VERSION, SOURCE);

console.log(`\n📊 生成示例数据...`);
generateSampleData(dataStore, 500, seed);
console.log(`   ✓ 会员: ${dataStore.getAllMembers().length} 人`);
console.log(`   ✓ 状态历史: ${dataStore.getAllStatusHistory().length} 条`);
console.log(`   ✓ 续费记录: ${dataStore.getAllRenewals().length} 条`);
console.log(`   ✓ 策略: ${dataStore.getAllStrategies().length} 个`);

console.log(`\n🧮 计算转移矩阵...`);
const statusHistory = dataStore.getAllStatusHistory();
const matrix = markovChain.calculateTransitionMatrix(statusHistory);
console.log(`   ✓ 样本量: ${matrix.sampleSize}`);

console.log(`\n🔮 执行马尔可夫预测...`);
const initialDist = dataStore.getCurrentDistribution();

const predictionConfig = {
  seed,
  periods,
  initialDistribution: initialDist,
  version: VERSION,
  source: SOURCE,
};

const prediction = markovChain.predict(matrix, predictionConfig);
console.log(`   ✓ 预测ID: ${prediction.id}`);

console.log(`\n⚖️  执行策略比较...`);
const strategies = dataStore.getAllStrategies();
const steadyState = markovChain.calculateSteadyState(matrix.matrix);
const churnedIdx = markovChain.getStates().indexOf('churned');
const baselineRetention = 1 - steadyState[churnedIdx];

const comparison = strategyEngine.compareStrategies(
  matrix,
  strategies,
  baselineRetention,
  1000,
  500
);
console.log(`   ✓ 比较策略: ${comparison.length} 个`);

if (comparison.length > 0) {
  console.log(`\n🏆 策略排名 (按 ROI):`);
  comparison.slice(0, 3).forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.strategyName}`);
    console.log(`      ROI: ${s.roi.toFixed(2)} | 留存提升: +${s.liftPercentage.toFixed(1)}% | 成本: ¥${s.costEstimate.toLocaleString()}`);
  });
}

console.log(`\n📝 生成报告...`);
const reportConfig = {
  title: `会员流失预测报告 - ${new Date().toLocaleDateString('zh-CN')}`,
  includeCharts: true,
  includeRawData: true,
  format,
  version: VERSION,
  source: SOURCE,
};

const report = reportGenerator.generateReport(prediction, comparison, reportConfig);

console.log(`   ✓ 报告ID: ${report.id}`);
console.log(`   ✓ 生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`);

console.log(`\n📊 报告摘要:`);
console.log(`   当前流失率: ${(report.summary.currentChurnRate * 100).toFixed(1)}%`);
console.log(`   预测流失率: ${(report.summary.predictedChurnRate * 100).toFixed(1)}%`);
console.log(`   预期留存提升: +${report.summary.expectedRetentionLift.toFixed(1)}%`);
console.log(`   平均流失周期: ${report.markovAnalysis.meanTimeToChurn.toFixed(1)} 天`);

console.log(`\n💡 优化建议:`);
report.recommendations.slice(0, 3).forEach((r, i) => {
  console.log(`   ${i + 1}. ${r}`);
});

console.log(`\n✅ 报告生成完成！`);
console.log(`\n📂 报告文件位于: reports/ 目录`);
console.log(`💡 运行 npm run compare 查看详细策略比较`);
console.log(`💡 运行 npm run dev 启动 Web 界面`);
