const DataStore = require('./src/services/DataStore');
const DataImporter = require('./src/services/DataImporter');
const GameEngine = require('./src/services/GameEngine');
const ReportExporter = require('./src/services/ReportExporter');
const sampleScenario = require('./src/data/sampleScenario');

class GuaranteeRiskGame {
  constructor() {
    this.dataStore = new DataStore();
    this.importer = new DataImporter(this.dataStore);
    this.engine = new GameEngine(this.dataStore);
    this.exporter = new ReportExporter(this.dataStore);
    this.currentSession = null;
  }

  initSampleData() {
    console.log('📦 正在加载示例场景数据...\n');

    sampleScenario.guarantees.forEach(g => {
      this.dataStore.saveGuarantee(g);
    });
    console.log(`  ✅ 加载了 ${sampleScenario.guarantees.length} 份保函`);

    sampleScenario.clues.forEach(c => {
      this.dataStore.saveClue(c);
    });
    console.log(`  ✅ 加载了 ${sampleScenario.clues.length} 条线索`);

    sampleScenario.counterGuarantees.forEach(cg => {
      this.dataStore.saveCounterGuarantee(cg);
    });
    console.log(`  ✅ 加载了 ${sampleScenario.counterGuarantees.length} 份反担保`);

    console.log('\n✅ 示例场景加载完成！\n');
  }

  startGame(playerName) {
    console.log(`🎮 开始新游戏 - 玩家: ${playerName}\n`);
    this.currentSession = this.engine.createGameSession(playerName);
    console.log(`  会话ID: ${this.currentSession.id}`);
    console.log(`  开始时间: ${this.currentSession.startTime}\n`);
    return this.currentSession;
  }

  showGameBriefing() {
    console.log('='.repeat(70));
    console.log('🔍 保函风控侦探局 - 任务简报');
    console.log('='.repeat(70));
    console.log('\n📋 任务目标:');
    console.log('  作为风控专员，请检查以下保函、线索和反担保，找出所有风险点。');
    console.log('  特别关注：反担保过期、到期漏看、线索关联等问题。\n');

    const guarantees = this.dataStore.getGuarantees();
    const clues = this.dataStore.getClues();
    const counterGuarantees = this.dataStore.getCounterGuarantees();

    console.log('📦 你的包里有:');
    console.log(`  💳 保函卡: ${guarantees.length} 份`);
    console.log(`  🔍 项目线索: ${clues.length} 条`);
    console.log(`  🛡️  反担保物: ${counterGuarantees.length} 份`);
    console.log(`  📝 临时备注: 请自行记录发现的问题\n`);

    console.log('💡 提示:');
    console.log('  1. 检查反担保是否过期');
    console.log('  2. 注意保函到期处理是否遗漏');
    console.log('  3. 分析线索与保函/反担保的关联关系');
    console.log('  4. 计算反担保覆盖率是否充足\n');
    console.log('='.repeat(70) + '\n');
  }

  listGuarantees() {
    const guarantees = this.dataStore.getGuarantees();
    console.log('💳 保函列表:');
    console.log('-'.repeat(70));
    guarantees.forEach((g, idx) => {
      const expiredMark = g.isExpiryMissed ? ' ⚠️ 到期漏看' : '';
      console.log(`${idx + 1}. ${g.guaranteeNo} - ${g.applicant}`);
      console.log(`   受益人: ${g.beneficiary}`);
      console.log(`   金额: ${g.amount.toLocaleString()}${g.currency}`);
      console.log(`   到期: ${g.expiryDate}${expiredMark}`);
      console.log(`   反担保: ${g.counterGuaranteeIds.join(', ') || '无'}`);
      console.log('');
    });
  }

  listClues() {
    const clues = this.dataStore.getClues();
    console.log('🔍 项目线索:');
    console.log('-'.repeat(70));
    clues.forEach((c, idx) => {
      const riskColor = c.riskLevel === 'high' ? '🔴' : c.riskLevel === 'medium' ? '🟡' : '🟢';
      console.log(`${idx + 1}. ${c.clueNo} - ${c.projectName}`);
      console.log(`   风险等级: ${riskColor} ${c.riskLevel.toUpperCase()}`);
      console.log(`   类型: ${c.clueType}`);
      console.log(`   描述: ${c.description}`);
      console.log(`   状态: ${c.status}`);
      console.log('');
    });
  }

  listCounterGuarantees() {
    const counterGuarantees = this.dataStore.getCounterGuarantees();
    console.log('🛡️  反担保物:');
    console.log('-'.repeat(70));
    counterGuarantees.forEach((cg, idx) => {
      const expiredMark = cg.isExpired ? ' 🔴 已过期' : ' 🟢 有效';
      const typeDesc = this.getCGTypeDescription(cg.type);
      console.log(`${idx + 1}. ${cg.cgNo} - ${typeDesc}`);
      console.log(`   提供方: ${cg.provider}`);
      console.log(`   金额: ${cg.amount.toLocaleString()}${cg.currency} (覆盖率: ${cg.coverageRatio}%)`);
      console.log(`   到期: ${cg.expiryDate}${expiredMark}`);
      console.log(`   关联保函: ${cg.relatedGuaranteeIds.join(', ') || '无'}`);
      console.log('');
    });
  }

  getCGTypeDescription(type) {
    const typeMap = {
      'cash': '现金保证金',
      'bank_guarantee': '银行保函',
      'corporate_guarantee': '企业担保',
      'real_estate': '不动产抵押',
      'equity': '股权质押',
      'other': '其他'
    };
    return typeMap[type] || type;
  }

  analyzeRisk() {
    if (!this.currentSession) {
      console.log('❌ 请先开始游戏！');
      return;
    }

    console.log('🔍 正在进行风险分析...\n');
    const analysis = this.engine.analyzeRisk(this.currentSession.id);

    console.log('📊 风险分析结果:');
    console.log(`  总风险扣分: ${analysis.totalRisk}`);
    console.log('');

    if (analysis.criticalIssues.length > 0) {
      console.log('🔴 关键问题:');
      analysis.criticalIssues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.message}`);
        if (issue.details) {
          issue.details.forEach(d => console.log(`     - ${d}`));
        }
        if (issue.clueImpact && issue.clueImpact.length > 0) {
          console.log(`     🔗 线索关联影响:`);
          issue.clueImpact.forEach(ci => {
            console.log(`        * ${ci.clue}: ${ci.impact}`);
          });
        }
      });
      console.log('');
    }

    if (analysis.warnings.length > 0) {
      console.log('🟡 警告事项:');
      analysis.warnings.forEach((w, idx) => {
        console.log(`  ${idx + 1}. ${w.message}`);
        if (w.isNotDirtyData) {
          console.log(`     ⚠️  这不是脏数据！${w.impact}`);
        }
        if (w.gapAmount) {
          console.log(`     缺口: ${w.gapAmount.toLocaleString()}`);
        }
      });
      console.log('');
    }

    if (analysis.clueConnections.length > 0) {
      console.log('🔗 线索关联发现:');
      const grouped = {};
      analysis.clueConnections.forEach(conn => {
        if (!grouped[conn.guaranteeNo]) {
          grouped[conn.guaranteeNo] = [];
        }
        grouped[conn.guaranteeNo].push(conn);
      });
      
      Object.entries(grouped).forEach(([guaranteeNo, conns]) => {
        console.log(`  保函 ${guaranteeNo} 关联 ${conns.length} 条线索:`);
        conns.forEach(c => {
          console.log(`    - ${c.clueNo} [${c.connectionType}] - ${c.riskLevel.toUpperCase()}`);
        });
      });
      console.log('');
    }

    return analysis;
  }

  recordAction(actionType, details) {
    if (!this.currentSession) {
      console.log('❌ 请先开始游戏！');
      return;
    }
    this.engine.recordAction(this.currentSession.id, actionType, details);
    console.log(`✅ 记录操作: ${actionType}`);
  }

  endGame() {
    if (!this.currentSession) {
      console.log('❌ 没有进行中的游戏！');
      return;
    }

    console.log('🎯 游戏结束，正在结算...\n');
    const result = this.engine.endGame(this.currentSession.id);

    if (!result.success) {
      console.log(`❌ 结算失败: ${result.message}`);
      return;
    }

    this.printFeedback(result.feedback);
    this.currentSession = null;

    return result;
  }

  printFeedback(feedback) {
    console.log('='.repeat(70));
    console.log('📋 结算反馈');
    console.log('='.repeat(70));
    console.log(`\n${feedback.summary}\n`);

    if (feedback.highlights?.length > 0) {
      console.log('✅ 做得好的地方:');
      feedback.highlights.forEach(h => console.log(`  - ${h}`));
      console.log('');
    }

    if (feedback.mistakes?.length > 0) {
      console.log('❌ 需要改进的地方:');
      feedback.mistakes.forEach((m, idx) => {
        const severityIcon = m.severity === 'critical' ? '🔴' : m.severity === 'high' ? '🟡' : '🟠';
        console.log(`  ${idx + 1}. ${severityIcon} ${m.description}`);
        if (m.note) {
          console.log(`     ${m.note}`);
        }
        if (m.clueRelation) {
          console.log(`     🔗 线索关联:`);
          m.clueRelation.forEach(cr => {
            console.log(`        ${cr.clue}`);
            console.log(`        影响: ${cr.impact}`);
          });
        }
      });
      console.log('');
    }

    if (feedback.learnings?.length > 0) {
      console.log('📚 学习要点:');
      feedback.learnings.forEach((l, idx) => {
        console.log(`  ${idx + 1}. ${l.topic}`);
        console.log(`     ${l.content}`);
        if (l.keyPoint) {
          console.log(`     💡 关键: ${l.keyPoint}`);
        }
      });
      console.log('');
    }

    if (feedback.nextSteps?.length > 0) {
      console.log('🚀 改进建议:');
      feedback.nextSteps.forEach(s => {
        const pIcon = s.priority === 'urgent' ? '🔴' : s.priority === 'high' ? '🟡' : '🟢';
        console.log(`  ${pIcon} ${s.action}`);
        console.log(`     ${s.details}`);
      });
    }

    console.log('\n' + '='.repeat(70));
  }

  exportReport(sessionId = null, format = 'txt') {
    const targetSessionId = sessionId || (this.currentSession?.id);
    if (!targetSessionId) {
      console.log('❌ 请指定要导出的会话ID！');
      return;
    }

    console.log(`📤 正在导出报告 (${format})...`);
    const result = this.exporter.exportSessionReport(targetSessionId, format);

    if (result.success) {
      console.log(`✅ 报告已导出: ${result.filePath}`);
      console.log(`   一致性校验: ${result.consistencyCheck.passed ? '通过' : '未通过'}`);
    } else {
      console.log(`❌ 导出失败: ${result.message}`);
      if (result.errors) {
        result.errors.forEach(e => console.log(`   - ${e}`));
      }
    }

    return result;
  }

  showHistory() {
    const history = this.engine.getGameHistory();
    if (history.length === 0) {
      console.log('📭 暂无游戏历史记录');
      return;
    }

    console.log('📜 游戏历史记录:');
    console.log('-'.repeat(70));
    history.forEach((session, idx) => {
      const grade = session.scoreDetails?.grade || {};
      console.log(`${idx + 1}. ${session.playerName} - 得分: ${session.score} [${grade.level || '-'}]`);
      console.log(`   会话ID: ${session.id}`);
      console.log(`   时间: ${session.endTime}`);
      console.log('');
    });
  }

  clearAllData() {
    console.log('🗑️  正在清除所有数据...');
    this.dataStore.clear(this.dataStore.files.guarantees);
    this.dataStore.clear(this.dataStore.files.clues);
    this.dataStore.clear(this.dataStore.files.counterGuarantees);
    this.dataStore.clear(this.dataStore.files.gameSessions);
    this.dataStore.clear(this.dataStore.files.reports);
    console.log('✅ 所有数据已清除！');
  }
}

module.exports = GuaranteeRiskGame;

if (require.main === module) {
  const game = new GuaranteeRiskGame();
  
  console.log('\n🔍 保函风控侦探局 🔍\n');
  
  game.initSampleData();
  game.startGame('测试玩家');
  game.showGameBriefing();
  
  console.log('💡 快速演示: 查看所有数据并完成游戏\n');
  
  setTimeout(() => {
    game.listGuarantees();
    game.listClues();
    game.listCounterGuarantees();
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    game.analyzeRisk();
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    game.endGame();
    
    console.log('\n💾 导出报告...\n');
    const sessions = game.dataStore.getGameSessions();
    if (sessions.length > 0) {
      game.exportReport(sessions[sessions.length - 1].id, 'txt');
      game.exportReport(sessions[sessions.length - 1].id, 'csv');
    }
    
    console.log('\n✅ 演示完成！报告已导出到 data/exports 目录\n');
  }, 100);
}
