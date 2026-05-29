import { level1 } from './src/data/levels';
import { getWindAtPosition, getWindFactor, compareWindFields } from './src/engine/wind';
import { isInNoFlyZone } from './src/engine/collision';
import { estimateSegmentCost, generateSegments, estimateReturnBattery } from './src/engine/battery';
import { calculateScore } from './src/engine/scoring';
import { windFieldV2Map } from './src/data/levels';

console.log('=== 引擎测试 ===\n');

console.log('1. 风场测试:');
const wind1 = getWindAtPosition(level1.windField, 5, 5);
console.log('   位置 (5,5) 的风:', wind1);
const windFactor1 = getWindFactor(wind1.direction, wind1.speed, 0, level1.headwindMultiplier);
console.log('   航向 0° 的风系数:', windFactor1);

console.log('\n2. 禁飞区测试:');
const inZone = isInNoFlyZone({ x: 8, y: 10 }, level1.noFlyZones);
console.log('   位置 (8,10) 在禁飞区:', inZone);
const notInZone = isInNoFlyZone({ x: 1, y: 1 }, level1.noFlyZones);
console.log('   位置 (1,1) 在禁飞区:', notInZone);

console.log('\n3. 耗电估算测试:');
const seg = estimateSegmentCost(
  { x: 1, y: 10 },
  { x: 5, y: 5 },
  level1.windField,
  level1.headwindMultiplier,
  level1.baseDrainRate
);
console.log('   段耗电:', {
  distance: seg.distance.toFixed(2),
  base: seg.basePowerCost.toFixed(2),
  actual: seg.actualPowerCost.toFixed(2),
  isHeadwind: seg.isHeadwind,
  explanation: seg.headwindExplanation,
});

console.log('\n4. 航线分段测试:');
const segments = generateSegments(
  level1.waypoints,
  level1.windField,
  level1.headwindMultiplier,
  level1.baseDrainRate,
  []
);
console.log('   分段数量:', segments.length);
segments.forEach((s, i) => {
  console.log(`   段${i + 1}: ${s.fromWaypoint}→${s.toWaypoint}, 耗电 ${s.actualPowerCost.toFixed(1)}%, 逆风: ${s.isHeadwind}`);
});

console.log('\n5. 返航电量测试:');
const returnEst = estimateReturnBattery(
  { x: 15, y: 15 },
  level1.home,
  level1.windField,
  level1.headwindMultiplier,
  level1.baseDrainRate,
  50
);
console.log('   返航估算:', returnEst);

console.log('\n6. 风场变更对比测试:');
const windChanges = compareWindFields(level1.windField, windFieldV2Map['level-1']);
console.log('   风场变更数量:', windChanges.length);
windChanges.forEach((c, i) => {
  console.log(`   变更${i}: 风速 ${c.previousSpeed}→${c.newSpeed}, 风向 ${c.previousDirection}→${c.newDirection}`);
});

console.log('\n7. 评分测试:');
const mockEvents = [];
const score = calculateScore(segments, mockEvents, level1, 30, true);
console.log('   评分:', {
  total: `${score.totalScore}/${score.maxTotalScore}`,
  pathEfficiency: score.pathEfficiency,
  batteryManagement: score.batteryManagement,
  noFlyZoneCompliance: score.noFlyZoneCompliance,
  returnBatteryMargin: score.returnBatteryMargin,
  headwindHandling: score.headwindHandling,
});

console.log('\n=== 测试完成 ===');
