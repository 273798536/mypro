import { CityServiceRadiusOptimizer, ServiceRadiusConfig } from '../src';
import { sampleResidents, sampleFacilities, sampleNetwork } from './sampleData';

async function runDemo() {
  console.log('='.repeat(70));
  console.log('城市服务半径优化计算工具 - 演示程序');
  console.log('='.repeat(70));
  console.log('');

  const optimizer = new CityServiceRadiusOptimizer({
    distanceMetric: 'euclidean',
    useNetworkDistance: false
  });

  optimizer.setResidents(sampleResidents);
  optimizer.setFacilities(sampleFacilities);
  optimizer.setNetwork(sampleNetwork);

  console.log('【场景1: 服务半径 500 米 - 基础计算】');
  console.log('-'.repeat(70));
  const radiusConfig1: ServiceRadiusConfig = {
    type: 'community_hospital',
    radius: 500,
    unit: 'meter'
  };
  const result1 = optimizer.optimize(radiusConfig1);
  console.log(optimizer.generateReport(result1));
  console.log('');

  console.log('【场景2: 服务半径调整为 800 米 - 增量检测】');
  console.log('-'.repeat(70));
  const radiusConfig2: ServiceRadiusConfig = {
    type: 'community_hospital',
    radius: 800,
    unit: 'meter'
  };
  const result2 = optimizer.optimize(radiusConfig2);
  console.log(optimizer.generateReport(result2));
  console.log('');

  console.log('【场景3: 服务半径过小 - 边界值处理】');
  console.log('-'.repeat(70));
  const radiusConfig3: ServiceRadiusConfig = {
    type: 'community_hospital',
    radius: 10,
    unit: 'meter'
  };
  const result3 = optimizer.optimize(radiusConfig3);
  console.log(optimizer.generateReport(result3));
  console.log('');

  console.log('【场景4: 启用路网距离计算】');
  console.log('-'.repeat(70));
  optimizer.clearHistory();
  const networkOptimizer = new CityServiceRadiusOptimizer({
    distanceMetric: 'euclidean',
    useNetworkDistance: true
  });
  networkOptimizer.setResidents(sampleResidents);
  networkOptimizer.setFacilities(sampleFacilities);
  networkOptimizer.setNetwork(sampleNetwork);

  const radiusConfig4: ServiceRadiusConfig = {
    type: 'community_hospital',
    radius: 600,
    unit: 'meter'
  };
  const result4 = networkOptimizer.optimize(radiusConfig4);
  console.log(networkOptimizer.generateReport(result4));
  console.log('');

  console.log('【选址报告】');
  console.log('-'.repeat(70));
  const selectionReport = optimizer.generateSelectionReport(result2);
  console.log('分析结论:', selectionReport.analysis);
  console.log('');
  console.log('建议候选设施:', selectionReport.recommendedFacilities.join(', '));
  console.log('');
  console.log('优化建议:');
  selectionReport.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
  console.log('数据来源:', selectionReport.dataSources.join(', '));
  console.log('');

  console.log('【算法说明】');
  console.log('-'.repeat(70));
  const algorithms = optimizer.getAlgorithmDescriptions();
  Object.entries(algorithms).forEach(([key, value]) => {
    console.log(`${value.name}:`);
    console.log(`  公式: ${value.formula}`);
    console.log(`  说明: ${value.description}`);
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('演示完成！');
  console.log('='.repeat(70));
}

runDemo().catch(console.error);
