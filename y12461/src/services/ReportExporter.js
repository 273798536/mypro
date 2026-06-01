const fs = require('fs');
const path = require('path');
const DataStore = require('./DataStore');

class ReportExporter {
  constructor(dataStore) {
    this.dataStore = dataStore || new DataStore();
    this.exportDir = path.join(__dirname, '../data/exports');
    this.ensureExportDir();
  }

  ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  exportSessionReport(sessionId, format = 'json') {
    const session = this.dataStore.getGameSessionById(sessionId);
    if (!session) {
      return { success: false, message: '会话不存在' };
    }

    const report = this.buildSessionReport(session);
    const consistencyCheck = this.verifyConsistency(report);

    if (!consistencyCheck.passed) {
      return {
        success: false,
        message: '报告数据不一致',
        errors: consistencyCheck.errors
      };
    }

    let filePath;
    switch (format) {
      case 'json':
        filePath = this.exportAsJSON(report, `session_${sessionId}_report`);
        break;
      case 'csv':
        filePath = this.exportSessionAsCSV(report, `session_${sessionId}_report`);
        break;
      case 'txt':
        filePath = this.exportAsText(report, `session_${sessionId}_report`);
        break;
      default:
        return { success: false, message: '不支持的导出格式' };
    }

    return {
      success: true,
      filePath,
      report,
      consistencyCheck
    };
  }

  buildSessionReport(session) {
    const guarantees = this.dataStore.getGuarantees();
    const clues = this.dataStore.getClues();
    const counterGuarantees = this.dataStore.getCounterGuarantees();

    const report = {
      sessionId: session.id,
      playerName: session.playerName,
      scenarioId: session.scenarioId,
      startTime: session.startTime,
      endTime: session.endTime,
      score: session.score,
      scoreDetails: session.scoreDetails,
      summary: {
        totalGuarantees: guarantees.length,
        totalClues: clues.length,
        totalCounterGuarantees: counterGuarantees.length,
        totalActions: session.actions?.length || 0,
        criticalIssues: session.analysis?.criticalIssues?.length || 0,
        warnings: session.analysis?.warnings?.length || 0
      },
      guarantees: guarantees.map(g => ({
        id: g.id,
        guaranteeNo: g.guaranteeNo,
        applicant: g.applicant,
        beneficiary: g.beneficiary,
        amount: g.amount,
        expiryDate: g.expiryDate,
        isExpiryMissed: g.isExpiryMissed,
        counterGuaranteeCount: g.counterGuaranteeIds?.length || 0,
        linkedClues: this.countLinkedClues(g, clues)
      })),
      clues: clues.map(c => ({
        id: c.id,
        clueNo: c.clueNo,
        projectName: c.projectName,
        riskLevel: c.riskLevel,
        status: c.status,
        linkedGuarantees: c.relatedGuaranteeIds?.length || 0
      })),
      counterGuarantees: counterGuarantees.map(cg => ({
        id: cg.id,
        cgNo: cg.cgNo,
        type: cg.type,
        amount: cg.amount,
        expiryDate: cg.expiryDate,
        isExpired: cg.isExpired,
        linkedGuarantees: cg.relatedGuaranteeIds?.length || 0
      })),
      actions: session.actions || [],
      feedback: session.feedback,
      exportedAt: new Date().toISOString(),
      exportHash: this.generateHash(session)
    };

    return report;
  }

  countLinkedClues(guarantee, allClues) {
    return allClues.filter(clue =>
      clue.relatedGuaranteeIds.includes(guarantee.guaranteeNo) ||
      (guarantee.projectId && clue.projectId === guarantee.projectId)
    ).length;
  }

  generateHash(session) {
    const data = JSON.stringify({
      id: session.id,
      score: session.score,
      endTime: session.endTime,
      actionCount: session.actions?.length || 0
    });
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  verifyConsistency(report) {
    const errors = [];

    const cgTotalFromSummary = report.summary.totalCounterGuarantees;
    const cgTotalFromList = report.counterGuarantees.length;
    if (cgTotalFromSummary !== cgTotalFromList) {
      errors.push(`反担保数量不一致: 汇总显示${cgTotalFromSummary}，但明细有${cgTotalFromList}条`);
    }

    const clueTotalFromSummary = report.summary.totalClues;
    const clueTotalFromList = report.clues.length;
    if (clueTotalFromSummary !== clueTotalFromList) {
      errors.push(`线索数量不一致: 汇总显示${clueTotalFromSummary}，但明细有${clueTotalFromList}条`);
    }

    const guaranteeTotalFromSummary = report.summary.totalGuarantees;
    const guaranteeTotalFromList = report.guarantees.length;
    if (guaranteeTotalFromSummary !== guaranteeTotalFromList) {
      errors.push(`保函数量不一致: 汇总显示${guaranteeTotalFromSummary}，但明细有${guaranteeTotalFromList}条`);
    }

    const reportedScore = report.score;
    const detailedScore = report.scoreDetails?.totalScore;
    if (reportedScore !== detailedScore) {
      errors.push(`分数不一致: 报告显示${reportedScore}，但明细计算为${detailedScore}`);
    }

    const actionCountFromSummary = report.summary.totalActions;
    const actionCountFromList = report.actions.length;
    if (actionCountFromSummary !== actionCountFromList) {
      errors.push(`操作记录数量不一致: 汇总显示${actionCountFromSummary}，但明细有${actionCountFromList}条`);
    }

    report.guarantees.forEach(g => {
      if (g.counterGuaranteeCount > 0) {
        const actualLinkedCG = report.counterGuarantees.filter(cg =>
          cg.linkedGuarantees > 0
        ).length;
      }
    });

    report.counterGuarantees.forEach(cg => {
      if (cg.isExpired) {
        const hasExpiryDate = !!cg.expiryDate;
        if (!hasExpiryDate) {
          errors.push(`反担保 ${cg.cgNo} 标记为过期但没有到期日期`);
        }
      }
    });

    return {
      passed: errors.length === 0,
      errors,
      checkedAt: new Date().toISOString()
    };
  }

  exportAsJSON(data, filename) {
    const filePath = path.join(this.exportDir, `${filename}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return filePath;
  }

  exportSessionAsCSV(report, filename) {
    const filePath = path.join(this.exportDir, `${filename}.csv`);
    const lines = [];

    lines.push('保函风控侦探局 - 游戏结算报告');
    lines.push(`玩家,${report.playerName}`);
    lines.push(`得分,${report.score},评级,${report.scoreDetails?.grade?.level || ''}`);
    lines.push(`开始时间,${report.startTime}`);
    lines.push(`结束时间,${report.endTime}`);
    lines.push('');

    lines.push('=== 汇总统计 ===');
    lines.push('项目,数量');
    lines.push(`保函总数,${report.summary.totalGuarantees}`);
    lines.push(`线索总数,${report.summary.totalClues}`);
    lines.push(`反担保总数,${report.summary.totalCounterGuarantees}`);
    lines.push(`操作记录数,${report.summary.totalActions}`);
    lines.push(`关键问题数,${report.summary.criticalIssues}`);
    lines.push(`警告数,${report.summary.warnings}`);
    lines.push('');

    lines.push('=== 保函明细 ===');
    lines.push('保函编号,申请人,受益人,金额,到期日期,是否到期漏看,关联反担保数,关联线索数');
    report.guarantees.forEach(g => {
      lines.push(`${g.guaranteeNo},${g.applicant},${g.beneficiary},${g.amount},${g.expiryDate},${g.isExpiryMissed ? '是' : '否'},${g.counterGuaranteeCount},${g.linkedClues}`);
    });
    lines.push('');

    lines.push('=== 线索明细 ===');
    lines.push('线索编号,项目名称,风险等级,状态,关联保函数');
    report.clues.forEach(c => {
      lines.push(`${c.clueNo},${c.projectName},${c.riskLevel},${c.status},${c.linkedGuarantees}`);
    });
    lines.push('');

    lines.push('=== 反担明明细 ===');
    lines.push('反担保编号,类型,金额,到期日期,是否过期,关联保函数');
    report.counterGuarantees.forEach(cg => {
      lines.push(`${cg.cgNo},${cg.type},${cg.amount},${cg.expiryDate},${cg.isExpired ? '是' : '否'},${cg.linkedGuarantees}`);
    });
    lines.push('');

    lines.push('=== 数据一致性校验 ===');
    const consistency = this.verifyConsistency(report);
    lines.push(`校验结果,${consistency.passed ? '通过' : '未通过'}`);
    if (!consistency.passed) {
      lines.push('错误详情:');
      consistency.errors.forEach(err => lines.push(err));
    }
    lines.push(`校验时间,${consistency.checkedAt}`);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return filePath;
  }

  exportAsText(report, filename) {
    const filePath = path.join(this.exportDir, `${filename}.txt`);
    const lines = [];

    lines.push('='.repeat(70));
    lines.push('🔍 保函风控侦探局 - 游戏结算报告');
    lines.push('='.repeat(70));
    lines.push('');

    lines.push(`👤 玩家: ${report.playerName}`);
    lines.push(`🎯 得分: ${report.score} 分`);
    lines.push(`🏆 评级: ${report.scoreDetails?.grade?.level || ''} - ${report.scoreDetails?.grade?.description || ''}`);
    lines.push(`⏰ 开始: ${report.startTime}`);
    lines.push(`⏰ 结束: ${report.endTime}`);
    lines.push('');

    lines.push('-'.repeat(70));
    lines.push('📊 汇总统计');
    lines.push('-'.repeat(70));
    lines.push(`  保函总数: ${report.summary.totalGuarantees}`);
    lines.push(`  线索总数: ${report.summary.totalClues}`);
    lines.push(`  反担保总数: ${report.summary.totalCounterGuarantees}`);
    lines.push(`  操作记录: ${report.summary.totalActions}`);
    lines.push(`  关键问题: ${report.summary.criticalIssues}`);
    lines.push(`  警告数量: ${report.summary.warnings}`);
    lines.push('');

    if (report.feedback) {
      lines.push('-'.repeat(70));
      lines.push('💡 学习反馈');
      lines.push('-'.repeat(70));
      
      if (report.feedback.summary) {
        lines.push(`  ${report.feedback.summary}`);
        lines.push('');
      }

      if (report.feedback.highlights?.length > 0) {
        lines.push('  ✅ 亮点:');
        report.feedback.highlights.forEach(h => lines.push(`    - ${h}`));
        lines.push('');
      }

      if (report.feedback.mistakes?.length > 0) {
        lines.push('  ❌ 错误分析:');
        report.feedback.mistakes.forEach((m, idx) => {
          lines.push(`    ${idx + 1}. [${m.severity}] ${m.description}`);
          if (m.note) lines.push(`       ${m.note}`);
          if (m.clueRelation) {
            m.clueRelation.forEach(cr => {
              lines.push(`       🔗 线索关联: ${cr.clue}`);
              lines.push(`          影响: ${cr.impact}`);
              lines.push(`          后果: ${cr.consequence}`);
            });
          }
        });
        lines.push('');
      }

      if (report.feedback.learnings?.length > 0) {
        lines.push('  📚 学习要点:');
        report.feedback.learnings.forEach((l, idx) => {
          lines.push(`    ${idx + 1}. ${l.topic}`);
          lines.push(`       ${l.content}`);
          if (l.keyPoint) lines.push(`       💡 ${l.keyPoint}`);
          if (l.details) {
            l.details.forEach(d => lines.push(`       - ${d}`));
          }
        });
        lines.push('');
      }

      if (report.feedback.nextSteps?.length > 0) {
        lines.push('  🚀 改进建议:');
        report.feedback.nextSteps.forEach(s => {
          const priorityIcon = s.priority === 'urgent' ? '🔴' : s.priority === 'high' ? '🟡' : '🟢';
          lines.push(`    ${priorityIcon} ${s.action}`);
          lines.push(`       ${s.details}`);
        });
      }
    }

    lines.push('');
    lines.push('-'.repeat(70));
    const consistency = this.verifyConsistency(report);
    lines.push(`🔍 数据一致性校验: ${consistency.passed ? '✅ 通过' : '❌ 未通过'}`);
    if (!consistency.passed) {
      consistency.errors.forEach(err => lines.push(`   ⚠️  ${err}`));
    }
    lines.push('='.repeat(70));
    lines.push(`导出时间: ${report.exportedAt}`);
    lines.push(`报告标识: ${report.exportHash}`);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return filePath;
  }

  exportAllSessions() {
    const sessions = this.dataStore.getGameSessions();
    const completedSessions = sessions.filter(s => s.status === 'completed');
    
    const exportResults = completedSessions.map(session => {
      try {
        const result = this.exportSessionReport(session.id, 'txt');
        return {
          sessionId: session.id,
          playerName: session.playerName,
          success: result.success,
          filePath: result.filePath,
          score: session.score
        };
      } catch (error) {
        return {
          sessionId: session.id,
          playerName: session.playerName,
          success: false,
          error: error.message
        };
      }
    });

    return {
      total: completedSessions.length,
      exported: exportResults.filter(r => r.success).length,
      failed: exportResults.filter(r => !r.success).length,
      results: exportResults
    };
  }

  getExportList() {
    if (!fs.existsSync(this.exportDir)) return [];
    
    const files = fs.readdirSync(this.exportDir);
    return files
      .filter(f => f.endsWith('.txt') || f.endsWith('.csv') || f.endsWith('.json'))
      .map(f => ({
        filename: f,
        path: path.join(this.exportDir, f),
        size: fs.statSync(path.join(this.exportDir, f)).size,
        createdAt: fs.statSync(path.join(this.exportDir, f)).birthtime
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

module.exports = ReportExporter;
