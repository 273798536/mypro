class ReportGenerator {
  constructor() {
    this.smoothRuns = [];
    this.marginInsufficientRuns = [];
  }

  recordRun(runData) {
    if (runData.result === 'completed') {
      this.smoothRuns.push(runData);
    } else if (runData.result === 'margin_insufficient') {
      this.marginInsufficientRuns.push(runData);
    }
  }

  generateReport() {
    return {
      summary: this._generateSummary(),
      smoothRuns: this._generateSmoothRunsReport(),
      marginInsufficientRuns: this._generateMarginInsufficientReport(),
      volatilityAnalysis: this._generateVolatilityAnalysis()
    };
  }

  _generateSummary() {
    const totalRuns = this.smoothRuns.length + this.marginInsufficientRuns.length;
    const smoothRate = totalRuns > 0 ? (this.smoothRuns.length / totalRuns * 100).toFixed(1) : 0;
    const avgSmoothScore = this.smoothRuns.length > 0 
      ? (this.smoothRuns.reduce((sum, r) => sum + r.finalScore, 0) / this.smoothRuns.length).toFixed(1)
      : 0;

    return {
      totalRuns,
      smoothRuns: this.smoothRuns.length,
      marginInsufficientRuns: this.marginInsufficientRuns.length,
      smoothRate: `${smoothRate}%`,
      averageSmoothScore: avgSmoothScore,
      totalVolatilityJumpsIgnored: this._countTotalVolatilityJumpsIgnored()
    };
  }

  _countTotalVolatilityJumpsIgnored() {
    const allRuns = [...this.smoothRuns, ...this.marginInsufficientRuns];
    return allRuns.reduce((sum, r) => sum + (r.volatilityJumpsIgnored || 0), 0);
  }

  _generateSmoothRunsReport() {
    return {
      count: this.smoothRuns.length,
      details: this.smoothRuns.map((run, index) => ({
        runIndex: index + 1,
        finalScore: run.finalScore,
        finalMargin: run.finalMargin,
        roundsPlayed: run.decisions.length,
        volatilityJumpsIgnored: run.volatilityJumpsIgnored || 0,
        wrongDirections: run.wrongDirections || 0,
        decisions: this._summarizeDecisions(run.decisions)
      }))
    };
  }

  _generateMarginInsufficientReport() {
    return {
      count: this.marginInsufficientRuns.length,
      details: this.marginInsufficientRuns.map((run, index) => ({
        runIndex: index + 1,
        finalMargin: run.finalMargin,
        roundsPlayed: run.decisions.length,
        volatilityJumpsIgnored: run.volatilityJumpsIgnored || 0,
        wrongDirections: run.wrongDirections || 0,
        failureRound: run.decisions.length + 1,
        lastDecisions: this._getLastDecisions(run.decisions, 3)
      }))
    };
  }

  _generateVolatilityAnalysis() {
    const allRuns = [...this.smoothRuns, ...this.marginInsufficientRuns];
    const volatilityJumpDecisions = [];

    allRuns.forEach(run => {
      run.decisions.forEach(decision => {
        if (decision.volatilityJumped) {
          volatilityJumpDecisions.push({
            action: decision.action,
            volatilityAware: decision.volatilityAware,
            ignored: decision.ignoredVolatility || false,
            score: decision.score,
            materialId: decision.materialId,
            round: decision.round
          });
        }
      });
    });

    const awareCount = volatilityJumpDecisions.filter(d => d.volatilityAware).length;
    const ignoredCount = volatilityJumpDecisions.filter(d => d.ignored).length;

    return {
      totalVolatilityJumps: volatilityJumpDecisions.length,
      volatilityAwareCount: awareCount,
      volatilityIgnoredCount: ignoredCount,
      awarenessRate: volatilityJumpDecisions.length > 0 
        ? ((awareCount / volatilityJumpDecisions.length) * 100).toFixed(1) + '%'
        : '0%',
      details: volatilityJumpDecisions
    };
  }

  _summarizeDecisions(decisions) {
    return decisions.map(d => ({
      round: d.round,
      action: d.action,
      volatilityJumped: d.volatilityJumped,
      volatilityAware: d.volatilityAware,
      score: d.score,
      materialId: d.materialId
    }));
  }

  _getLastDecisions(decisions, count) {
    return decisions.slice(-count).map(d => ({
      round: d.round,
      action: d.action,
      marginChange: d.marginChange,
      volatilityJumped: d.volatilityJumped
    }));
  }

  printReport() {
    const report = this.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('波动率期权跑酷 - 测试报告');
    console.log('='.repeat(60));
    
    console.log('\n【概要统计】');
    console.log(`  总运行次数: ${report.summary.totalRuns}`);
    console.log(`  顺利完成: ${report.summary.smoothRuns} 次`);
    console.log(`  保证金不足: ${report.summary.marginInsufficientRuns} 次`);
    console.log(`  成功率: ${report.summary.smoothRate}`);
    console.log(`  平均得分(顺利): ${report.summary.averageSmoothScore}`);
    console.log(`  隐波跳变被忽略总次数: ${report.summary.totalVolatilityJumpsIgnored}`);
    
    console.log('\n【顺利完成材料详情】');
    if (report.smoothRuns.details.length === 0) {
      console.log('  暂无数据');
    } else {
      report.smoothRuns.details.forEach(run => {
        console.log(`  第${run.runIndex}轮 - 得分: ${run.finalScore}, 保证金: ${run.finalMargin.toFixed(0)}`);
        console.log(`    回合数: ${run.roundsPlayed}, 方向错误: ${run.wrongDirections}次`);
      });
    }
    
    console.log('\n【保证金不足材料详情】');
    if (report.marginInsufficientRuns.details.length === 0) {
      console.log('  暂无数据');
    } else {
      report.marginInsufficientRuns.details.forEach(run => {
        console.log(`  第${run.runIndex}轮 - 失败于第${run.failureRound}回合`);
        console.log(`    最终保证金: ${run.finalMargin.toFixed(0)}`);
      });
    }
    
    console.log('\n【隐波跳变分析】');
    console.log(`  隐波跳变总次数: ${report.volatilityAnalysis.totalVolatilityJumps}`);
    console.log(`  正确识别: ${report.volatilityAnalysis.volatilityAwareCount} 次`);
    console.log(`  被忽略: ${report.volatilityAnalysis.volatilityIgnoredCount} 次`);
    console.log(`  识别率: ${report.volatilityAnalysis.awarenessRate}`);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    return report;
  }

  clear() {
    this.smoothRuns = [];
    this.marginInsufficientRuns = [];
  }
}

module.exports = ReportGenerator;
