const { Vector } = require('./js/vector.js');
const { Grid } = require('./js/grid.js');
const { Sailboat, Wind, Current, Island, Target, StartPoint } = require('./js/gameObjects.js');
const { Level } = require('./js/level.js');

const grid = new Grid(800, 600, 50);
const levels = Level.getPredefinedLevels(grid);
const level = levels[0];

console.log('=== 测试分数计算 ===\n');

const boat = level.createSailboat('boat-1');

console.log('起点:', boat.startPosition.toString());
console.log('目标:', level.target.position.toString());
console.log('直线距离:', boat.startPosition.distanceTo(level.target.position).toFixed(2));
console.log();

const wind = level.wind.getVector();
const current = level.current.getVectorAt(boat.position);

console.log('风向:', level.wind.direction + '°,', wind.toString());
console.log('水流:', level.current.direction + '°,', current.toString());
console.log('合力:', wind.add(current).toString());
console.log();

for (let i = 0; i < 8; i++) {
    boat.move(wind, current, grid, level.islands, i);
    boat.checkTargetReached(level.target.position, level.targetTolerance);
    
    console.log(`第 ${i + 1} 步:`);
    console.log(`  位置: ${boat.position.toString()}`);
    console.log(`  距目标: ${boat.position.distanceTo(level.target.position).toFixed(2)}`);
    console.log(`  状态: ${boat.state}`);
    
    const score = level.calculateScore(boat);
    console.log(`  当前分数: ${score.total}/100`);
    console.log(`    完成分: ${score.breakdown[0].score}/${score.breakdown[0].max}`);
    console.log(`    错误分: ${score.breakdown[1].score}/${score.breakdown[1].max}`);
    console.log(`    效率分: ${score.breakdown[2].score}/${score.breakdown[2].max}`);
    console.log();
    
    if (boat.state === 'success' || boat.state === 'failed') break;
}

const finalScore = level.calculateScore(boat);
console.log('=== 最终结果 ===');
console.log('航行距离:', boat.getDistanceTraveled().toFixed(2));
console.log('位移:', boat.getFinalDisplacement().toString());
console.log('总分:', finalScore.total + '/100');
console.log('状态:', boat.state);

if (finalScore.total > 100) {
    console.log('\n❌ 错误: 分数超过100！');
    console.log('详细分解:');
    finalScore.breakdown.forEach(item => {
        console.log(`  ${item.category}: ${item.score}/${item.max}`);
    });
} else {
    console.log('\n✅ 分数计算正确！');
}
