const { CollisionHeatmapSystem } = require('../src/index');

const sampleLevelData = {
  name: '新手村_2号路口_v2.1',
  version: 'v2.1',
  notes: '原名：新手村_主路口，2024年10月调整了碰撞体位置',
  sourceFile: 'level_xincun_v2.1.fbx',
  materials: [
    { name: 'stone_wall', type: 'solid', friction: 0.8 },
    { name: 'wood_fence', type: 'destructible', friction: 0.6 },
    { name: 'metal_rail', type: 'solid', friction: 0.3 }
  ],
  colliders: [
    {
      id: 'wall_001',
      name: '北墙',
      position: { x: 0, y: 0, z: -50 },
      size: { x: 100, y: 5, z: 2 },
      type: 'box',
      material: 'stone_wall',
      notes: '主要阻挡墙'
    },
    {
      id: 'wall_002',
      name: '东墙',
      position: { x: 50, y: 0, z: 0 },
      size: { x: 2, y: 5, z: 100 },
      type: 'box',
      material: 'stone_wall'
    },
    {
      id: 'fence_001',
      name: '木栅栏',
      position: { x: 0, y: 0, z: 20 },
      size: { x: 30, y: 2, z: 1 },
      type: 'box',
      material: 'wood_fence',
      notes: '可破坏，测试阶段'
    },
    {
      id: 'rail_001',
      name: '铁轨',
      position: { x: -20, y: 0, z: 0 },
      size: { x: 1, y: 0.5, z: 40 },
      type: 'box',
      material: 'metal_rail'
    },
    {
      id: 'pillar_001',
      name: '柱子',
      position: { x: 25, y: 0, z: 25 },
      size: { x: 3, y: 5, z: 3 },
      type: 'cylinder',
      material: 'stone_wall'
    }
  ]
};

function generateSampleTrajectories() {
  const trajectories = [];
  const versions = ['v2.1', 'v2.1', 'v2.1', 'v2.0', 'v2.1', 'v2.1', 'unknown', 'v2.1'];
  
  for (let i = 0; i < 8; i++) {
    const points = [];
    const collisions = [];
    const version = versions[i];
    
    for (let t = 0; t < 50; t++) {
      const baseX = -40 + t * 2 + (Math.random() - 0.5) * 2;
      const baseZ = -40 + t * 1.5 + (Math.random() - 0.5) * 2;
      
      if (t === 25 && i === 3) {
        points.push({
          x: baseX + 100,
          y: 0,
          z: baseZ + 100,
          timestamp: t * 0.1
        });
      } else {
        points.push({
          x: baseX,
          y: 0,
          z: baseZ,
          timestamp: t * 0.1
        });
      }
      
      if (t % 15 === 0 && t > 0) {
        const colliderIds = ['wall_001', 'wall_002', 'fence_001', 'rail_001', 'pillar_001'];
        const randomCollider = colliderIds[Math.floor(Math.random() * colliderIds.length)];
        
        collisions.push({
          colliderId: randomCollider,
          position: { x: baseX, y: 0, z: baseZ },
          timestamp: t * 0.1,
          force: 50 + Math.random() * 100,
          material: sampleLevelData.colliders.find(c => c.id === randomCollider)?.material
        });
      }
    }
    
    trajectories.push({
      playerId: `player_${i + 1}`,
      sessionId: `session_${i + 1}_20241015`,
      levelVersion: version,
      points,
      collisions
    });
  }
  
  return trajectories;
}

async function runDemo() {
  console.log('='.repeat(60));
  console.log('游戏关卡碰撞热图分析系统 - 演示');
  console.log('='.repeat(60));
  
  const system = new CollisionHeatmapSystem();
  
  console.log('\n【1/6】注册版本别名...');
  system.registerVersionAlias('v2.1', ['2.1', 'ver2.1', 'v21']);
  system.registerVersionAlias('v2.0', ['2.0', 'ver2.0', 'v20']);
  
  console.log('\n【2/6】加载关卡数据...');
  const levelResult = system.loadLevel(sampleLevelData);
  console.log(`  关卡: ${levelResult.level.name}`);
  console.log(`  版本: ${levelResult.level.version}`);
  console.log(`  碰撞体: ${levelResult.level.colliders.length} 个`);
  if (levelResult.warnings.length > 0) {
    console.log(`  警告: ${levelResult.warnings.length} 条`);
  }
  
  console.log('\n【3/6】加载玩家轨迹数据...');
  const trajectoriesData = generateSampleTrajectories();
  const trajResult = system.loadTrajectories(trajectoriesData);
  console.log(`  轨迹数量: ${trajResult.trajectories.length} 条`);
  console.log(`  警告: ${trajResult.warnings.length} 条`);
  
  console.log('\n【4/6】执行分析...');
  const analysis = system.analyze();
  console.log(`  异常数量: ${analysis.anomalies.length} 个`);
  console.log(`  高优先级异常: ${analysis.anomalies.filter(a => a.severity === 'high').length} 个`);
  
  console.log('\n【5/6】版本分布:');
  const versionDist = system.getVersionDistribution();
  versionDist.forEach(v => {
    console.log(`  ${v.version}: ${v.count}条 (${v.percentage}%)`);
  });
  
  console.log('\n【6/6】数据质量概要:');
  const quality = system.getDataQualitySummary();
  console.log(`  总轨迹数: ${quality.totalTrajectories}`);
  console.log(`  含漂移: ${quality.withDrift}条 (${quality.driftPercentage}%)`);
  console.log(`  平均完整度: ${quality.avgCompleteness}%`);
  console.log(`  异常分级: 高${quality.anomalies.high} 中${quality.anomalies.medium} 低${quality.anomalies.low}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('异常详情:');
  console.log('='.repeat(60));
  analysis.anomalies.forEach((a, i) => {
    const severityTag = a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '🟢';
    console.log(`\n${severityTag} [${a.category}] ${a.title}`);
    console.log(`   ${a.message}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('热点碰撞体 (Top 5):');
  console.log('='.repeat(60));
  const hotspots = system.findHotspots(0.5, 5);
  hotspots.forEach((h, i) => {
    const collider = levelResult.level.getColliderById(h.colliderId);
    console.log(`\n${i + 1}. ${collider?.name || h.colliderId}`);
    console.log(`   碰撞次数: ${h.collisionCount}`);
    console.log(`   强度: ${(h.intensity * 100).toFixed(0)}%`);
    console.log(`   材料: ${collider?.material || 'unknown'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('点击对象详情 (示例: 北墙):');
  console.log('='.repeat(60));
  const objInfo = system.getObjectInfo('北墙');
  if (objInfo) {
    console.log('\n📦 对象基本信息:');
    console.log(`  名称: ${objInfo.collider.name}`);
    console.log(`  ID: ${objInfo.collider.id}`);
    console.log(`  类型: ${objInfo.collider.type}`);
    console.log(`  材料: ${objInfo.collider.material}`);
    console.log(`  材料类型: ${objInfo.collider.materialInfo.type}`);
    console.log(`  位置: (${objInfo.collider.position.x}, ${objInfo.collider.position.y}, ${objInfo.collider.position.z})`);
    console.log(`  备注: ${objInfo.collider.notes || '无'}`);
    
    console.log('\n🔥 热力数据:');
    console.log(`  碰撞次数: ${objInfo.heatmap.collisionCount}`);
    console.log(`  强度等级: ${objInfo.heatmap.intensityLevel}`);
    console.log(`  排名: 第 ${objInfo.heatmap.rank} 名`);
    console.log(`  百分位: 前 ${objInfo.heatmap.percentile}%`);
    console.log(`  颜色: ${objInfo.heatmap.color}`);
    
    console.log('\n📋 关卡来源:');
    console.log(`  关卡: ${objInfo.levelSource.levelName}`);
    console.log(`  版本: ${objInfo.levelSource.levelVersion}`);
    console.log(`  源文件: ${objInfo.levelSource.sourceFile}`);
    console.log(`  关卡备注: ${objInfo.levelSource.levelNotes || '无'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('导出报告...');
  console.log('='.repeat(60));
  const report = system.exportReport({ format: 'json' });
  console.log(`\n✓ 报告已生成: ${report.filepath}`);
  
  const objReport = system.exportObjectReport('北墙', { format: 'json' });
  console.log(`✓ 对象详情报告已生成: ${objReport.filepath}`);
  
  console.log('\n🎉 演示完成!');
  console.log('\n核心特性总结:');
  console.log('  ✓ 版本混用检测 + 人话说明');
  console.log('  ✓ 轨迹漂移检测');
  console.log('  ✓ 碰撞体缺失检测');
  console.log('  ✓ 点击对象: 热力+异常+来源 三合一');
  console.log('  ✓ 方案比较');
  console.log('  ✓ 业务友好的报告导出');
}

runDemo().catch(console.error);
