import { seededRandom, curveFitting, diagnoseCurve, calculateHash, verifyDiagnosisConsistency, generateMockCurveData, parseIVCurveCSV, parseIVCurveJSON } from './src/utils/diagnosis';
import type { DiagnosisResult } from './src/types';

console.log('=== 光伏IV曲线诊断系统核心功能测试 ===\n');

console.log('1. 测试种子随机数的可复现性:');
const seed = 12345;
const r1 = seededRandom(seed);
const r2 = seededRandom(seed);
console.log(`   相同种子(${seed})的随机数: ${r1} vs ${r2}`);
console.log(`   结果一致: ${r1 === r2 ? '✅ 通过' : '❌ 失败'}\n`);

console.log('2. 测试曲线拟合的可复现性:');
const voltage = [0, 5, 10, 15, 20, 25, 30, 35, 37];
const current = [8.5, 8.4, 8.3, 8.1, 7.8, 7.2, 6.0, 3.5, 0];
const fit1 = curveFitting(voltage, current, seed);
const fit2 = curveFitting(voltage, current, seed);
console.log(`   两次拟合Rs: ${fit1.rs} vs ${fit2.rs}`);
console.log(`   两次拟合Rsh: ${fit1.rsh} vs ${fit2.rsh}`);
console.log(`   结果一致: ${fit1.rs === fit2.rs && fit1.rsh === fit2.rsh ? '✅ 通过' : '❌ 失败'}\n`);

console.log('3. 测试完整诊断流程的可复算性:');
const mockCurve = generateMockCurveData();
console.log(`   模拟数据: ${mockCurve.voltage.length}个数据点, 温度: ${mockCurve.temperature.toFixed(1)}°C`);
console.log(`   输入哈希: ${mockCurve.hash}`);

const diag1 = diagnoseCurve(mockCurve);
const diag2 = diagnoseCurve(mockCurve);
console.log(`   两次诊断输出哈希: ${diag1.outputHash} vs ${diag2.outputHash}`);
console.log(`   输出哈希一致: ${diag1.outputHash === diag2.outputHash ? '✅ 通过' : '❌ 失败'}`);

const result1: DiagnosisResult = {
  id: 'test1',
  curveId: mockCurve.id,
  inputHash: mockCurve.hash,
  outputHash: diag1.outputHash,
  parameters: diag1.parameters,
  abnormalities: diag1.abnormalities,
  traceNodes: diag1.traceNodes,
  faultLevel: diag1.faultLevel,
  createdAt: Date.now(),
};

const result2: DiagnosisResult = {
  ...result1,
  id: 'test2',
  outputHash: diag2.outputHash,
  parameters: diag2.parameters,
};

const consistency = verifyDiagnosisConsistency(result1, result2);
console.log(`   一致性验证: ${consistency.isConsistent ? '✅ 通过' : '❌ 失败'}`);
if (!consistency.isConsistent) {
  console.log(`   差异: ${consistency.differences.join(', ')}`);
}
console.log('');

console.log('4. 测试CSV解析:');
const csvContent = `Voltage,Current,Temperature
0,8.5,25
10,8.3,25
20,7.8,25
30,6.0,25
37,0,25`;
const parsedCSV = parseIVCurveCSV(csvContent);
console.log(`   解析结果: ${parsedCSV ? `✅ ${parsedCSV.voltage?.length}个数据点` : '❌ 失败'}`);
if (parsedCSV) {
  console.log(`   电压范围: ${parsedCSV.voltage?.[0]} - ${parsedCSV.voltage?.[parsedCSV.voltage.length - 1]}V`);
}
console.log('');

console.log('5. 测试JSON解析:');
const jsonContent = JSON.stringify({
  voltage: [0, 10, 20, 30, 37],
  current: [8.5, 8.3, 7.8, 6.0, 0],
  temperature: 30,
  irradiance: 950,
});
const parsedJSON = parseIVCurveJSON(jsonContent);
console.log(`   解析结果: ${parsedJSON ? `✅ ${parsedJSON.voltage?.length}个数据点` : '❌ 失败'}`);
if (parsedJSON) {
  console.log(`   温度: ${parsedJSON.temperature}°C, 辐照度: ${parsedJSON.irradiance}W/m²`);
}
console.log('');

console.log('6. 测试输入变更检测:');
const modifiedCurve = { ...mockCurve, temperature: mockCurve.temperature + 1 };
modifiedCurve.hash = calculateHash({
  voltage: modifiedCurve.voltage,
  current: modifiedCurve.current,
  temperature: modifiedCurve.temperature,
  irradiance: modifiedCurve.irradiance,
});
const diag3 = diagnoseCurve(modifiedCurve);
console.log(`   原输入哈希: ${mockCurve.hash}`);
console.log(`   改后输入哈希: ${modifiedCurve.hash}`);
console.log(`   哈希不同: ${mockCurve.hash !== modifiedCurve.hash ? '✅ 通过 (输入变更可检测)' : '❌ 失败'}`);
console.log('');

console.log('=== 所有测试完成 ===');
