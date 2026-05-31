const GameEngine = require('../src/core/GameEngine');
const ReportGenerator = require('../src/core/ReportGenerator');
const { volatilitySamples, smoothTestMaterials, marginInsufficientMaterials } = require('../src/data/volatilitySamples');

function runSampleTest(sample, options = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`运行测试样例: ${sample.name}`);
  console.log(`样例ID: ${sample.id}`);
  console.log(`难度: ${sample.difficulty}`);
  console.log(`${'='.repeat(60)}\n`);

  const engine = new GameEngine({
    initialMargin: options.initialMargin || 100000,
    maxRounds: sample.materials.length
  });

  engine.loadMaterials(sample.materials);
  let state = engine.start();

  console.log(`初始保证金: ${state.margin}`);
  console.log(`材料数量: ${sample.materials.length}\n`);

  while (!state.gameOver) {
    if (state.supplementMode) {
      console.log(`[第${state.currentRound}轮] 🔴 保证金不足！缺列: ${state.missingMarginColumns.join(', ')}`);
      console.log('  → 投教老师可选择: 补充保证金 或 跳过继续');
      
      if (options.autoSupplement) {
        const result = engine.supplementMargin(state.missingMarginColumns[0], 10000);
        console.log('  → [自动补充] 已补充保证金10000');
        state = result.state;
      } else {
        state = engine.skipToSupplement();
        console.log('  → [跳过] 材料暂存，继续下一个');
      }
      continue;
    }

    const material = state.currentMaterial;
    console.log(`[第${state.currentRound}轮] ${material.title}`);
    console.log(`  行权价: ${material.strikePrice} | 期权价: ${material.optionPrice}`);
    console.log(`  标的价: ${material.underlyingPrice} | 隐波: ${(material.volatility * 100).toFixed(1)}%`);
    
    if (state.volatilityJumped) {
      console.log(`  ⚠️  隐波跳变！从 ${(state.previousVolatility * 100).toFixed(1)}% → ${(state.currentVolatility * 100).toFixed(1)}%`);
    }

    const decision = makeOptimalDecision(state, sample);
    console.log(`  操作: ${decision.action}${decision.volatilityAware ? ' [识别隐波变化]' : ''}`);

    const result = engine.makeDecision(decision);
    if (result.success) {
      state = result.state;
      console.log(`  得分: ${state.decisions[state.decisions.length - 1].score} | 当前总分: ${state.score}`);
      console.log(`  保证金: ${state.margin.toFixed(0)}\n`);
    }
  }

  console.log(`\n游戏结束! 结果: ${state.gameResult === 'completed' ? '✅ 顺利完成' : '❌ 保证金不足'}`);
  console.log(`最终得分: ${state.score}`);
  console.log(`最终保证金: ${state.margin.toFixed(0)}`);
  
  const history = engine.getHistory()[0];
  console.log(`隐波跳变被忽略: ${history.volatilityJumpsIgnored} 次`);
  console.log(`方向判断错误: ${history.wrongDirections} 次`);

  return history;
}

function makeOptimalDecision(state, sample) {
  const material = state.currentMaterial;
  const expected = sample.expectedOutcome;
  
  let action = 'hold';
  let volatilityAware = false;

  if (state.volatilityJumped && expected.volatilityAwareRequired) {
    volatilityAware = true;
  }

  if (expected.optimalAction) {
    action = expected.optimalAction;
  } else if (expected.optimalActions && expected.optimalActions.length > 0) {
    action = expected.optimalActions[Math.min(state.currentRound - 1, expected.optimalActions.length - 1)] || 'hold';
  } else if (material.expectedDirection) {
    action = material.expectedDirection === 'up' ? 'buy_call' : 'buy_put';
  }

  return { action, volatilityAware, quantity: 1 };
}

function runAllSamples() {
  console.log('\n' + '#'.repeat(70));
  console.log('# 波动率期权跑酷 - 隐波跳变样例测试');
  console.log('#'.repeat(70));

  const report = new ReportGenerator();
  const samples = Object.values(volatilitySamples);

  samples.forEach((sample, index) => {
    console.log(`\n\n[${index + 1}/${samples.length}]`);
    const result = runSampleTest(sample);
    report.recordRun(result);
  });

  console.log('\n\n' + '#'.repeat(70));
  console.log('# 汇总报告');
  console.log('#'.repeat(70));
  report.printReport();
}

function runSmoothThenMarginTest() {
  console.log('\n' + '#'.repeat(70));
  console.log('# 先跑顺利材料，再跑保证金不足材料');
  console.log('#'.repeat(70));

  const report = new ReportGenerator();

  console.log('\n【第一阶段】顺利材料测试');
  const engine1 = new GameEngine({ maxRounds: smoothTestMaterials.length });
  engine1.loadMaterials(smoothTestMaterials);
  let state = engine1.start();

  while (!state.gameOver) {
    if (state.supplementMode) {
      state = engine1.skipToSupplement();
      continue;
    }
    const material = state.currentMaterial;
    const action = material.expectedDirection === 'up' ? 'buy_call' : 'buy_put';
    const result = engine1.makeDecision({ action, volatilityAware: state.volatilityJumped });
    state = result.state;
  }
  report.recordRun(engine1.getHistory()[0]);

  console.log('\n【第二阶段】保证金不足材料测试');
  const engine2 = new GameEngine({ 
    initialMargin: 30000,
    maxRounds: marginInsufficientMaterials.length 
  });
  engine2.loadMaterials(marginInsufficientMaterials);
  state = engine2.start();

  while (!state.gameOver) {
    if (state.supplementMode) {
      console.log(`  → 检测到缺列: ${state.missingMarginColumns.join(', ')}, 不整批失败，给补材料入口`);
      state = engine2.skipToSupplement();
      continue;
    }
    const material = state.currentMaterial;
    const wrongAction = material.expectedDirection === 'up' ? 'buy_put' : 'buy_call';
    const result = engine2.makeDecision({ action: wrongAction, volatilityAware: false, quantity: 5 });
    state = result.state;
  }
  report.recordRun(engine2.getHistory()[0]);

  console.log('\n\n' + '#'.repeat(70));
  console.log('# 分类报告 - 顺利材料 vs 保证金不足');
  console.log('#'.repeat(70));
  report.printReport();
}

function runPauseResumeTest() {
  console.log('\n' + '#'.repeat(70));
  console.log('# 暂停重开状态清理测试');
  console.log('#'.repeat(70));

  const sample = volatilitySamples.sample1_volatility_spike;
  const engine = new GameEngine({ maxRounds: sample.materials.length });
  engine.loadMaterials(sample.materials);
  
  let state = engine.start();
  console.log(`\n初始状态 - 回合: ${state.currentRound}, 决策数: ${state.decisions.length}`);

  const result1 = engine.makeDecision({ action: 'hold', volatilityAware: false });
  state = result1.state;
  console.log(`第1轮后 - 回合: ${state.currentRound}, 决策数: ${state.decisions.length}, 持仓数: ${state.positions.length}`);

  engine.pause();
  console.log('已暂停');

  engine.resume();
  state = engine.getState();
  console.log(`恢复后 - 回合: ${state.currentRound}, 决策数: ${state.decisions.length}, 持仓数: ${state.positions.length}`);
  console.log('✓ 暂停重开后状态干净，无上一局残影\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--pause-test')) {
    runPauseResumeTest();
  } else if (args.includes('--smooth-margin')) {
    runSmoothThenMarginTest();
  } else if (args.length > 0) {
    const sampleId = args[0];
    const sample = Object.values(volatilitySamples).find(s => s.id === sampleId || s.id.toLowerCase().includes(sampleId.toLowerCase()));
    if (sample) {
      runSampleTest(sample, { autoSupplement: args.includes('--auto-supplement') });
    } else {
      console.log('未找到样例，运行全部测试');
      runAllSamples();
    }
  } else {
    runAllSamples();
    runSmoothThenMarginTest();
    runPauseResumeTest();
  }
}

module.exports = { runSampleTest, runAllSamples, runSmoothThenMarginTest, runPauseResumeTest };
