const DataStore = require('./DataStore');

class GameEngine {
  constructor(dataStore) {
    this.dataStore = dataStore || new DataStore();
    this.riskWeightConfig = {
      counterGuaranteeExpired: 30,
      expiryMissed: 20,
      clueNotInvestigated: 15,
      coverageInsufficient: 25,
      missingLink: 10
    };
  }

  createGameSession(playerName, scenarioId = 'default') {
    const session = {
      playerName,
      scenarioId,
      status: 'playing',
      startTime: new Date().toISOString(),
      endTime: null,
      score: 0,
      maxScore: 100,
      actions: [],
      findings: [],
      mistakes: [],
      conclusions: null
    };
    
    const result = this.dataStore.saveGameSession(session);
    return result.data;
  }

  recordAction(sessionId, actionType, details) {
    const session = this.dataStore.getGameSessionById(sessionId);
    if (!session) return { success: false, message: '会话不存在' };

    session.actions.push({
      type: actionType,
      details,
      timestamp: new Date().toISOString()
    });

    return this.dataStore.saveGameSession(session);
  }

  analyzeRisk(sessionId) {
    const guarantees = this.dataStore.getGuarantees();
    const clues = this.dataStore.getClues();
    const counterGuarantees = this.dataStore.getCounterGuarantees();
    
    const analysis = {
      totalRisk: 0,
      riskBreakdown: [],
      warnings: [],
      criticalIssues: [],
      recommendations: [],
      clueConnections: []
    };

    guarantees.forEach(guarantee => {
      const guaranteeRisk = this.analyzeGuaranteeRisk(guarantee, counterGuarantees, clues);
      analysis.totalRisk += guaranteeRisk.riskScore;
      analysis.riskBreakdown.push({
        guaranteeNo: guarantee.guaranteeNo,
        applicant: guarantee.applicant,
        riskScore: guaranteeRisk.riskScore,
        riskItems: guaranteeRisk.riskItems
      });
      
      if (guaranteeRisk.warnings.length > 0) {
        analysis.warnings.push(...guaranteeRisk.warnings);
      }
      
      if (guaranteeRisk.criticalIssues.length > 0) {
        analysis.criticalIssues.push(...guaranteeRisk.criticalIssues);
      }

      if (guaranteeRisk.clueConnections.length > 0) {
        analysis.clueConnections.push(...guaranteeRisk.clueConnections);
      }
    });

    clues.forEach(clue => {
      if (clue.status === 'pending') {
        analysis.totalRisk += this.riskWeightConfig.clueNotInvestigated;
        analysis.warnings.push({
          type: 'uninvestigated_clue',
          message: `线索 ${clue.clueNo} 尚未调查`,
          impact: '未处理的线索可能隐藏重大风险',
          relatedProject: clue.projectName
        });
      }
    });

    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  analyzeGuaranteeRisk(guarantee, counterGuarantees, clues) {
    const result = {
      riskScore: 0,
      riskItems: [],
      warnings: [],
      criticalIssues: [],
      clueConnections: []
    };

    const relatedCG = counterGuarantees.filter(cg => 
      cg.relatedGuaranteeIds.includes(guarantee.guaranteeNo) ||
      guarantee.counterGuaranteeIds.includes(cg.cgNo)
    );

    const relatedClues = clues.filter(clue =>
      clue.relatedGuaranteeIds.includes(guarantee.guaranteeNo) ||
      (guarantee.projectId && clue.projectId === guarantee.projectId)
    );

    const expiredCG = relatedCG.filter(cg => cg.isExpired);
    if (expiredCG.length > 0) {
      const riskAmount = expiredCG.reduce((sum, cg) => sum + parseFloat(cg.amount), 0);
      result.riskScore += this.riskWeightConfig.counterGuaranteeExpired;
      result.riskItems.push({
        type: 'counter_guarantee_expired',
        description: `反担保已过期`,
        severity: 'critical',
        affectedAmount: riskAmount
      });
      result.criticalIssues.push({
        type: 'cg_expired',
        guaranteeNo: guarantee.guaranteeNo,
        message: `反担保已过期！涉及 ${expiredCG.length} 份反担保`,
        details: expiredCG.map(cg => `${cg.cgNo} (${cg.getTypeDescription ? cg.getTypeDescription() : cg.type}): ${cg.amount}${cg.currency}`),
        clueImpact: this.analyzeClueImpactFromExpiredCG(relatedClues, expiredCG)
      });
    }

    const totalCoverage = relatedCG
      .filter(cg => !cg.isExpired)
      .reduce((sum, cg) => sum + (parseFloat(cg.amount) * parseFloat(cg.coverageRatio || 100) / 100), 0);
    
    const coverageRatio = guarantee.amount > 0 ? (totalCoverage / guarantee.amount) * 100 : 0;
    
    if (coverageRatio < 100 && relatedCG.length > 0) {
      result.riskScore += this.riskWeightConfig.coverageInsufficient;
      result.riskItems.push({
        type: 'coverage_insufficient',
        description: `反担保覆盖不足: ${coverageRatio.toFixed(1)}%`,
        severity: 'high',
        gap: guarantee.amount - totalCoverage
      });
      result.warnings.push({
        type: 'coverage_gap',
        guaranteeNo: guarantee.guaranteeNo,
        message: `反担保覆盖率仅 ${coverageRatio.toFixed(1)}%，存在风险敞口`,
        gapAmount: guarantee.amount - totalCoverage
      });
    }

    if (guarantee.isExpiryMissed) {
      result.riskScore += this.riskWeightConfig.expiryMissed;
      result.riskItems.push({
        type: 'expiry_missed',
        description: '到期处理遗漏',
        severity: 'high',
        note: '不是脏数据，需关注线索关联'
      });
      result.warnings.push({
        type: 'expiry_missed',
        guaranteeNo: guarantee.guaranteeNo,
        message: `保函 ${guarantee.guaranteeNo} 到期处理被遗漏`,
        impact: this.analyzeExpiryMissedImpact(guarantee, relatedClues),
        isNotDirtyData: true
      });
    }

    relatedClues.forEach(clue => {
      result.clueConnections.push({
        guaranteeNo: guarantee.guaranteeNo,
        clueNo: clue.clueNo,
        clueType: clue.clueType,
        riskLevel: clue.riskLevel,
        connectionType: this.getConnectionType(guarantee, clue),
        impact: clue.impactAnalysis
      });

      if (!this.isClueProperlyLinked(guarantee, clue)) {
        result.riskScore += this.riskWeightConfig.missingLink;
        result.warnings.push({
          type: 'missing_link',
          message: `保函 ${guarantee.guaranteeNo} 与线索 ${clue.clueNo} 关联不完整`,
          suggestion: '请检查保函与项目线索的关联关系'
        });
      }
    });

    return result;
  }

  analyzeClueImpactFromExpiredCG(clues, expiredCG) {
    const impacts = [];
    clues.forEach(clue => {
      const isRelated = expiredCG.some(cg => 
        cg.relatedClueIds.includes(clue.clueNo) || 
        clue.relatedCounterGuaranteeIds.includes(cg.cgNo)
      );
      
      if (isRelated) {
        impacts.push({
          clueNo: clue.clueNo,
          projectName: clue.projectName,
          impact: `反担保 ${expiredCG.map(cg => cg.cgNo).join(', ')} 过期，直接影响线索「${clue.description}」的风险缓释能力`,
          riskLevel: clue.riskLevel,
          consequence: '该线索发现的风险将失去反担保保护'
        });
      }
    });
    return impacts;
  }

  analyzeExpiryMissedImpact(guarantee, relatedClues) {
    if (relatedClues.length === 0) {
      return '到期漏看未发现关联线索，但仍需按流程处理';
    }
    
    const highRiskClues = relatedClues.filter(c => c.riskLevel === 'high');
    if (highRiskClues.length > 0) {
      return `⚠️ 严重影响：该保函关联 ${highRiskClues.length} 条高风险线索，到期漏看可能导致风险敞口扩大`;
    }
    
    return `到期漏看影响 ${relatedClues.length} 条关联线索的跟踪闭环`;
  }

  getConnectionType(guarantee, clue) {
    if (clue.relatedGuaranteeIds.includes(guarantee.guaranteeNo)) {
      return '直接关联';
    }
    if (guarantee.projectId && clue.projectId === guarantee.projectId) {
      return '项目关联';
    }
    return '间接关联';
  }

  isClueProperlyLinked(guarantee, clue) {
    return clue.relatedGuaranteeIds.includes(guarantee.guaranteeNo) ||
           (guarantee.projectId && clue.projectId === guarantee.projectId);
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.criticalIssues.length > 0) {
      recommendations.push({
        priority: 'urgent',
        action: '立即处理过期反担保',
        details: `发现 ${analysis.criticalIssues.length} 个关键问题，请优先处理反担保过期问题`
      });
    }

    const uninvestigatedClues = analysis.warnings.filter(w => w.type === 'uninvestigated_clue');
    if (uninvestigatedClues.length > 0) {
      recommendations.push({
        priority: 'high',
        action: '调查未处理线索',
        details: `${uninvestigatedClues.length} 条线索尚未调查，可能隐藏风险`
      });
    }

    const coverageIssues = analysis.warnings.filter(w => w.type === 'coverage_gap');
    if (coverageIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: '补充反担保',
        details: '部分保函反担保覆盖率不足，建议补充保证金或追加担保'
      });
    }

    return recommendations;
  }

  calculateScore(sessionId) {
    const analysis = this.analyzeRisk(sessionId);
    const session = this.dataStore.getGameSessionById(sessionId);

    const actions = session.actions || [];
    const actionScore = this.calculateActionScore(actions, analysis);
    
    const baseScore = Math.max(0, 100 - analysis.totalRisk);
    const finalScore = Math.round(baseScore * 0.6 + actionScore * 0.4);

    return {
      totalScore: Math.max(0, Math.min(100, finalScore)),
      baseScore: Math.round(baseScore),
      actionScore: Math.round(actionScore),
      riskDeduction: Math.min(100, analysis.totalRisk),
      grade: this.getGrade(finalScore)
    };
  }

  calculateActionScore(actions, analysis) {
    let score = 100;
    const criticalIssueTypes = analysis.criticalIssues.map(i => i.type);
    
    const hasFixedExpiredCG = actions.some(a => 
      a.type === 'fix' && a.details?.issueType === 'cg_expired'
    );
    if (criticalIssueTypes.includes('cg_expired') && !hasFixedExpiredCG) {
      score -= 30;
    }

    const hasInvestigatedClues = actions.filter(a => a.type === 'investigate').length;
    const totalClues = analysis.warnings.filter(w => w.type === 'uninvestigated_clue').length;
    if (totalClues > 0) {
      const investigationRatio = hasInvestigatedClues / totalClues;
      score -= (1 - investigationRatio) * 20;
    }

    const hasLinkedClues = actions.some(a => a.type === 'link_clue');
    const missingLinks = analysis.warnings.filter(w => w.type === 'missing_link').length;
    if (missingLinks > 0 && !hasLinkedClues) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  getGrade(score) {
    if (score >= 90) return { level: 'S', description: '风控大师', color: 'gold' };
    if (score >= 80) return { level: 'A', description: '风控专家', color: 'green' };
    if (score >= 70) return { level: 'B', description: '风控熟手', color: 'blue' };
    if (score >= 60) return { level: 'C', description: '风控新手', color: 'yellow' };
    return { level: 'D', description: '需要学习', color: 'red' };
  }

  endGame(sessionId) {
    const session = this.dataStore.getGameSessionById(sessionId);
    if (!session) return { success: false, message: '会话不存在' };

    const scoreResult = this.calculateScore(sessionId);
    const analysis = this.analyzeRisk(sessionId);

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    session.score = scoreResult.totalScore;
    session.scoreDetails = scoreResult;
    session.analysis = analysis;
    session.feedback = this.generateDetailedFeedback(analysis, scoreResult, session);

    this.dataStore.saveGameSession(session);
    this.saveGameReport(session);

    return {
      success: true,
      session,
      score: scoreResult,
      feedback: session.feedback
    };
  }

  generateDetailedFeedback(analysis, scoreResult, session) {
    const feedback = {
      summary: '',
      highlights: [],
      mistakes: [],
      learnings: [],
      clueRelations: [],
      nextSteps: []
    };

    feedback.summary = `本次风控排查得分 ${scoreResult.totalScore} 分，评级 ${scoreResult.grade.level}（${scoreResult.grade.description}）`;

    if (scoreResult.totalScore >= 80) {
      feedback.highlights.push('整体风控意识较强，能够识别主要风险点');
    } else if (scoreResult.totalScore >= 60) {
      feedback.highlights.push('基本掌握风控流程，但仍有改进空间');
    } else {
      feedback.highlights.push('建议系统学习保函风控基础知识');
    }

    analysis.criticalIssues.forEach(issue => {
      const mistake = {
        type: issue.type,
        description: issue.message,
        severity: 'critical',
        relatedGuarantee: issue.guaranteeNo
      };

      if (issue.type === 'cg_expired' && issue.clueImpact && issue.clueImpact.length > 0) {
        mistake.clueRelation = issue.clueImpact.map(ci => ({
          clue: `${ci.clueNo} - ${ci.projectName}`,
          impact: ci.impact,
          consequence: ci.consequence
        }));
        feedback.clueRelations.push(...mistake.clueRelation);
      }

      feedback.mistakes.push(mistake);
    });

    analysis.warnings.forEach(warning => {
      if (warning.type === 'expiry_missed' && warning.isNotDirtyData) {
        feedback.mistakes.push({
          type: 'expiry_missed',
          description: warning.message,
          severity: 'high',
          note: '⚠️ 这不是脏数据！到期漏看可能影响 ' + warning.impact,
          relatedGuarantee: warning.guaranteeNo
        });
      } else if (warning.type === 'coverage_gap') {
        feedback.mistakes.push({
          type: 'coverage_gap',
          description: warning.message,
          severity: 'medium',
          gapAmount: warning.gapAmount
        });
      }
    });

    if (analysis.clueConnections.length > 0) {
      const projectClueMap = {};
      analysis.clueConnections.forEach(conn => {
        if (!projectClueMap[conn.guaranteeNo]) {
          projectClueMap[conn.guaranteeNo] = [];
        }
        projectClueMap[conn.guaranteeNo].push({
          clue: conn.clueNo,
          type: conn.clueType,
          connection: conn.connectionType,
          risk: conn.riskLevel
        });
      });

      feedback.learnings.push({
        topic: '线索关联分析',
        content: `共发现 ${analysis.clueConnections.length} 条保函-线索关联关系`,
        details: Object.entries(projectClueMap).map(([guarantee, clues]) => 
          `保函 ${guarantee} 关联 ${clues.length} 条线索: ${clues.map(c => c.clue).join(', ')}`
        )
      });
    }

    if (analysis.criticalIssues.some(i => i.type === 'cg_expired')) {
      feedback.learnings.push({
        topic: '反担保与线索的关系',
        content: '反担保是风险缓释的重要手段。当反担保过期时，原本被覆盖的线索风险将重新暴露。',
        keyPoint: '必须确保反担保的有效期覆盖保函期限及线索跟踪周期'
      });
    }

    feedback.nextSteps = analysis.recommendations.map(r => ({
      priority: r.priority,
      action: r.action,
      details: r.details
    }));

    return feedback;
  }

  saveGameReport(session) {
    const report = {
      sessionId: session.id,
      playerName: session.playerName,
      scenarioId: session.scenarioId,
      score: session.score,
      scoreDetails: session.scoreDetails,
      completedAt: session.endTime,
      summary: {
        totalActions: session.actions?.length || 0,
        findingsCount: session.analysis?.riskBreakdown?.length || 0,
        criticalIssues: session.analysis?.criticalIssues?.length || 0
      },
      feedback: session.feedback
    };
    
    return this.dataStore.saveReport(report);
  }

  getGameHistory() {
    return this.dataStore.getGameSessions()
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
  }

  getReportBySessionId(sessionId) {
    const reports = this.dataStore.getReports();
    return reports.find(r => r.sessionId === sessionId);
  }
}

module.exports = GameEngine;
