var Z = {
  'customer_card': '客户卡',
  'name': '姓名',
  'gender': '性别',
  'age': '年龄',
  'age_suffix': '岁',
  'industry': '行业',
  'high_risk': '高风险',
  'med_risk': '中风险',
  'loan_amount': '贷款金额',
  'loan_purpose': '贷款用途',
  'credit_score': '信用分',
  'overdue_record': '逾期记录',
  'overdue_yes': '有逾期',
  'overdue_no': '无',
  'masked_blocks': '████████',
  'masked_status': '遮盖中',
  'collateral_type': '担保方式',
  'collateral_value': '担保价值',
  'expiry_date': '到期日',
  'expired': '已过期',
  'valid': '有效',
  'phase_hint_0': '阶段提示：先仔细阅读客户卡信息，注意信用分、逾期记录和担保状态。如有遮盖字段，需从其他线索推断。',
  'overdue_masked_title': '逾期记录被遮盖',
  'overdue_masked_hint': '你可以选择揭示遮盖（模拟现场查档），或根据间接线索自行判断',
  'overdue_revealed_prefix': '遮盖已揭示：',
  'overdue_revealed_effect': '该逾期记录触发规则R2（逾期一票否决），影响：审批结论、担保要求、贷后监控等级',
  'indirect_hint': '间接线索提示：',
  'cashflow_sharp_decline_hint': '流水持续骤降可能暗示还款困难 ',
  'high_risk_industry_hint': '高风险行业易出逾期 ',
  'credit_score_low_hint': '信用分',
  'credit_score_mid_hint': '处于中等偏低区间 ',
  'collateral_expired_prefix': '担保过期：',
  'collateral_expired_mid': ' 已于 ',
  'collateral_expired_suffix': ' 过期',
  'collateral_expired_effect': '触发规则R3（担保有效性检查），影响：审批结论、担保要求、风险覆盖比例',
  'cashflow_gap_prefix': '流水断档：第 ',
  'cashflow_gap_mid': ' 月',
  'cashflow_gap_no_flow': '无流水记录',
  'cashflow_gap_consec': '（连续最长',
  'cashflow_gap_months': '个月）',
  'cashflow_gap_severe_effect': '触发规则R4（流水断档严重），影响：审批结论、还款能力评估、授信额度',
  'cashflow_gap_mild_effect': '触发规则R5（流水短期断档），影响：还款能力评估、贷后监控等级',
  'next_phase': '进入下一阶段：',
  'cashflow_title': '近12月银行流水',
  'wan': '万',
  'yue': '月',
  'avg_monthly': '月均流水',
  'loan_ratio': '贷款/月均流水',
  'times': '倍',
  'gap_months': '断档月数',
  'gap_months_unit': '个月',
  'trend_label': '趋势',
  'trend_stable': '稳定',
  'trend_declining': '下滑',
  'trend_sharp_decline': '骤降',
  'decision_title': '审批决策',
  'decision_hint': '根据当前线索做出判断：',
  'approve': '批准',
  'conditional': '有条件批准',
  'reject': '拒绝',
  'judgment_history': '判断记录',
  'stage': '阶段',
  'feedback_correct': '判断正确',
  'feedback_wrong': '判断有误',
  'your_vs_correct': '你的决策 vs 正确决策',
  'time_used': '用时',
  'sec': '秒',
  'decision_score': '决策得分',
  'time_bonus': '时间奖励',
  'time_penalty': '超时扣分',
  'risk_influence': '风险因素影响说明',
  'influence_label': '影响：',
  'masked_tag': '遮盖',
  'correction': '纠错说明',
  'correct_decision': '正确决策',
  'overdue_trap': '逾期遮盖陷阱：该客户存在逾期记录被遮盖，',
  'via_cashflow': '可通过流水',
  'indirect_infer': '等间接线索推断。',
  'sharp_decline': '骤降',
  'abnormal': '异常',
  'view_settlement': '查看结算',
  'next_case': '下一案件',
  'settlement_title': '闯关结算',
  'settlement_subtitle': '你的审批官评级',
  'grade': '评级',
  'full_score': '满分',
  'your_decision': '你的决策',
  'correct_decision_short': '正确决策',
  'time_pressure_analysis': '时间压力分析',
  'fast_bonus': '快速决策奖励：',
  'within_60': '（60秒内完成获得时间奖励）',
  'overtime_penalty': '超时扣分：',
  'per_10s': '（超过90秒后每10秒扣',
  'time_pressure_explanation': '在真实审批中，时间压力会导致审查不充分、遗漏风险信号，正如游戏中超时扣分对应的是匆忙审批带来的风险遗漏。',
  'replay_game': '重新闯关',
  'view_replay': '查看回放',
  'replay_title': '回放记录',
  'points_suffix': '分',
  'score_suffix': '分',
  'reveal_btn': '揭示遮盖内容',
  'case_prefix': '案件 ',
  'difficulty': '难度 ',
  'score_prefix': '得分 ',
  'star': '★',
  'wan_unit': '万元',
  'yuan_unit': '元',
  'warning_emoji': '⚠️ ',
  'lightbulb_emoji': '💡 ',
  'arrow_influence': '→ 影响：',
  'overdue_masked_note_r2': '触发规则R2（逾期一票否决），影响：审批结论、担保要求、贷后监控等级',
  'fen': ' 分',
};
class UI {
  constructor() {
    this.startScreen = document.getElementById('start-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.settlementScreen = document.getElementById('settlement-screen');
    this.feedbackOverlay = document.getElementById('feedback-overlay');
    this.timerEl = document.getElementById('timer');
    this.scoreEl = document.getElementById('score');
    this.Z = Z;
  }

  showScreen(name) {
    this.startScreen.classList.remove('active');
    this.gameScreen.classList.remove('active');
    this.settlementScreen.classList.remove('active');
    if (name === 'start') this.startScreen.classList.add('active');
    if (name === 'game') this.gameScreen.classList.add('active');
    if (name === 'settlement') this.settlementScreen.classList.add('active');
  }

  updateHeader(state) {
    var caseData = state.getCurrentCase();
    document.getElementById('case-badge').textContent = Z['case_prefix'] + (state.currentCaseIndex + 1) + ' / ' + CASES.length;
    var diff = caseData.difficulty;
    var diffText = '';
    for (var d = 0; d < diff; d++) diffText += Z['star'];
    document.getElementById('difficulty-badge').textContent = Z['difficulty'] + diffText;
    this.scoreEl.textContent = Z['score_prefix'] + state.score;
  }

  updateTimer(elapsed) {
    var remaining = TIME_LIMIT - elapsed;
    var display = remaining > 0 ? remaining : 0;
    var min = Math.floor(display / 60);
    var sec = display % 60;
    this.timerEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
    this.timerEl.className = 'timer';
    if (remaining <= 0) this.timerEl.classList.add('danger');
    else if (remaining <= 15) this.timerEl.classList.add('warning');
  }

  renderCase(state, engine) {
    var caseData = state.getCurrentCase();
    var phase = state.currentPhase;
    var overdueRevealed = state.isOverdueRevealed(caseData.id);
    this._renderLeftPanel(caseData, phase, overdueRevealed);
    this._renderCenterPanel(caseData, phase, overdueRevealed);
    this._renderRightPanel(caseData, phase, state);
  }

  _renderLeftPanel(caseData, phase, overdueRevealed) {
    var html = '<div class="panel-title">' + Z['customer_card'] + '</div>';
    html += '<div class="narrative-box">' + caseData.narrative + '</div>';
    html += '<div class="info-row"><span class="info-label">' + Z['name'] + '</span><span class="info-value">' + caseData.name + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['gender'] + '</span><span class="info-value">' + caseData.gender + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['age'] + '</span><span class="info-value">' + caseData.age + Z['age_suffix'] + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['industry'] + '</span><span class="info-value">' + caseData.industry;
    if (caseData.industryRisk === 'high') html += '<span class="hint-tag risk-high">' + Z['high_risk'] + '</span>';
    else if (caseData.industryRisk === 'medium') html += '<span class="hint-tag risk-medium">' + Z['med_risk'] + '</span>';
    html += '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['loan_amount'] + '</span><span class="info-value">' + this._formatMoney(caseData.loanAmount) + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['loan_purpose'] + '</span><span class="info-value">' + caseData.loanPurpose + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['credit_score'] + '</span><span class="info-value"';
    if (caseData.creditScore < 600) html += ' style="color:var(--danger)"';
    html += '>' + caseData.creditScore + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['overdue_record'] + '</span><span class="info-value">';
    if (caseData.overdueRecord) {
      if (caseData.overdueMasked && !overdueRevealed) {
        html += '<span class="masked">' + Z['masked_blocks'] + '</span>';
        html += '<span class="hint-tag masked">' + Z['masked_status'] + '</span>';
      } else {
        html += '<span style="color:var(--danger)">' + Z['overdue_yes'] + '</span>';
        if (caseData.overdueDetail) html += '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + caseData.overdueDetail + '</div>';
      }
    } else {
      html += '<span style="color:var(--success)">' + Z['overdue_no'] + '</span>';
    }
    html += '</span></div>';
    html += '<div class="collateral-section">';
    html += '<div class="info-row"><span class="info-label">' + Z['collateral_type'] + '</span><span class="info-value">' + caseData.collateral.type + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['collateral_value'] + '</span><span class="info-value">' + this._formatMoney(caseData.collateral.value) + '</span></div>';
    html += '<div class="info-row"><span class="info-label">' + Z['expiry_date'] + '</span>';
    if (caseData.collateral.expired) {
      html += '<span class="info-value expired">' + caseData.collateral.expiryDate;
      html += '<span class="collateral-status expired">' + Z['expired'] + '</span>';
      html += '</span>';
    } else {
      html += '<span class="info-value">' + caseData.collateral.expiryDate;
      html += '<span class="collateral-status valid">' + Z['valid'] + '</span>';
      html += '</span>';
    }
    html += '</div></div>';
    document.getElementById('left-panel').innerHTML = html;
  }

  _renderCenterPanel(caseData, phase, overdueRevealed) {
    var html = '<div class="phase-indicator">';
    for (var i = 0; i < PHASES.length; i++) {
      var cls = 'phase-step';
      if (i < phase) cls += ' completed';
      else if (i === phase) cls += ' active';
      html += '<div class="' + cls + '">' + PHASES[i].name + '</div>';
    }
    html += '</div>';
    if (phase === 0) {
      html += '<div class="narrative-box">' + Z['phase_hint_0'] + '</div>';
    }
    if (phase >= 1) {
      html += this._renderCashFlow(caseData);
    }
    if (phase >= 2) {
      if (caseData.overdueMasked && !overdueRevealed) {
        html += '<div class="overdue-mask">';
        html += '<div class="overdue-mask-icon">🔒</div>';
        html += '<div class="overdue-mask-text">' + Z['overdue_masked_title'] + '</div>';
        html += '<div class="overdue-mask-hint">' + Z['overdue_masked_hint'] + '</div>';
        html += '<button class="reveal-btn" onclick="game.revealOverdue()">' + Z['reveal_btn'] + '</button>';
        html += '</div>';
      } else if (caseData.overdueRecord && overdueRevealed) {
        html += '<div class="masked-reveal-note">';
        html += Z['warning_emoji'] + Z['overdue_revealed_prefix'] + '<strong>' + caseData.overdueDetail + '</strong><br>';
        html += Z['overdue_revealed_effect'];
        html += '</div>';
      }
      if (caseData.overdueMasked && !overdueRevealed && caseData.overdueRecord) {
        html += '<div class="masked-reveal-note">';
        html += Z['lightbulb_emoji'] + Z['indirect_hint'];
        if (caseData.cashFlow.trend === 'sharp_decline') html += Z['cashflow_sharp_decline_hint'];
        if (caseData.industryRisk === 'high') html += Z['high_risk_industry_hint'];
        if (caseData.creditScore < 700) html += Z['credit_score_low_hint'] + caseData.creditScore + Z['credit_score_mid_hint'];
        html += '</div>';
      }
    }
    if (caseData.collateral.expired) {
      html += '<div class="expired-note">';
      html += Z['warning_emoji'] + Z['collateral_expired_prefix'] + '<strong>' + caseData.collateral.type + Z['collateral_expired_mid'] + caseData.collateral.expiryDate + Z['collateral_expired_suffix'] + '</strong><br>';
      html += Z['collateral_expired_effect'];
      html += '</div>';
    }
    if (caseData.cashFlow.gapMonths.length > 0) {
      var maxConsec = this._maxConsecutiveGaps(caseData.cashFlow.gapMonths);
      html += '<div class="gap-note">';
      html += Z['warning_emoji'] + Z['cashflow_gap_prefix'] + '<strong>' + caseData.cashFlow.gapMonths.map(function (m) { return m + 1; }).join('、') + Z['cashflow_gap_mid'] + '</strong>' + Z['cashflow_gap_no_flow'];
      html += Z['cashflow_gap_consec'] + maxConsec + Z['cashflow_gap_months'] + '<br>';
      if (maxConsec > 2) {
        html += Z['cashflow_gap_severe_effect'];
      } else {
        html += Z['cashflow_gap_mild_effect'];
      }
      html += '</div>';
    }
    if (phase < PHASES.length - 1) {
      html += '<button class="next-phase-btn" onclick="game.nextPhase()">' + Z['next_phase'] + PHASES[phase + 1].name + ' ▶</button>';
    }
    document.getElementById('center-panel').innerHTML = html;
  }

  _renderCashFlow(caseData) {
    var cf = caseData.cashFlow;
    var maxVal = Math.max.apply(null, cf.monthly.filter(function (v) { return v > 0; }));
    if (maxVal === 0) maxVal = 1;
    var html = '<div class="cashflow-chart">';
    html += '<div style="font-size:14px;font-weight:600;margin-bottom:8px">' + Z['cashflow_title'] + '</div>';
    html += '<div class="chart-bars">';
    for (var i = 0; i < cf.monthly.length; i++) {
      var val = cf.monthly[i];
      var isGap = val === 0;
      var height = isGap ? 4 : Math.max(8, (val / maxVal) * 110);
      var barClass = 'chart-bar';
      if (isGap) barClass += ' gap';
      else if (cf.trend === 'sharp_decline' && i >= 4) barClass += ' declining';
      else barClass += ' normal';
      html += '<div class="chart-bar-wrapper">';
      if (!isGap) html += '<div style="font-size:9px;color:var(--text-muted)">' + (val / 10000).toFixed(1) + Z['wan'] + '</div>';
      html += '<div class="' + barClass + '" style="height:' + height + 'px"></div>';
      html += '<div class="chart-label">' + (i + 1) + Z['yue'] + '</div>';
      html += '</div>';
    }
    html += '</div></div>';
    html += '<div class="cashflow-stats">';
    html += '<div class="stat-card"><div class="stat-label">' + Z['avg_monthly'] + '</div><div class="stat-value normal">' + this._formatMoney(cf.avgMonthly) + '</div></div>';
    var ratio = caseData.loanAmount / cf.avgMonthly;
    html += '<div class="stat-card"><div class="stat-label">' + Z['loan_ratio'] + '</div><div class="stat-value ' + (ratio > 18 ? 'danger' : ratio > 12 ? 'warning' : 'normal') + '">' + ratio.toFixed(1) + Z['times'] + '</div></div>';
    var gapCount = cf.gapMonths.length;
    html += '<div class="stat-card"><div class="stat-label">' + Z['gap_months'] + '</div><div class="stat-value ' + (gapCount > 2 ? 'danger' : gapCount > 0 ? 'warning' : 'normal') + '">' + gapCount + Z['gap_months_unit'] + '</div></div>';
    var trendLabel = { stable: Z['trend_stable'], declining: Z['trend_declining'], sharp_decline: Z['trend_sharp_decline'] };
    var trendClass = { stable: 'normal', declining: 'warning', sharp_decline: 'danger' };
    html += '<div class="stat-card"><div class="stat-label">' + Z['trend_label'] + '</div><div class="stat-value ' + trendClass[cf.trend] + '">' + trendLabel[cf.trend] + '</div></div>';
    html += '</div>';
    return html;
  }

  _renderRightPanel(caseData, phase, state) {
    var html = '<div class="panel-title">' + Z['decision_title'] + '</div>';
    html += '<div class="decision-section">';
    html += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">' + Z['decision_hint'] + '</div>';
    html += '<div class="decision-buttons">';
    html += '<button class="decision-btn btn-approve" onclick="game.submitDecision(&#39;approve&#39;)">✅ ' + Z['approve'] + '</button>';
    html += '<button class="decision-btn btn-conditional" onclick="game.submitDecision(&#39;conditional&#39;)">⚠️ ' + Z['conditional'] + '</button>';
    html += '<button class="decision-btn btn-reject" onclick="game.submitDecision(&#39;reject&#39;)">❌ ' + Z['reject'] + '</button>';
    html += '</div></div>';
    var judgments = state.judgments[caseData.id];
    if (judgments && judgments.length > 0) {
      html += '<div class="judgment-history">';
      html += '<div class="panel-title" style="margin-top:0">' + Z['judgment_history'] + '</div>';
      for (var i = 0; i < judgments.length; i++) {
        var j = judgments[i];
        var phaseName = '';
        for (var p = 0; p < PHASES.length; p++) {
          if (PHASES[p].id === j.phase) phaseName = PHASES[p].name;
        }
        html += '<div class="judgment-item">';
        html += '<div class="judgment-phase">' + phaseName + ' ' + Z['stage'] + '</div>';
        html += '<div class="judgment-decision ' + j.decision + '">' + DECISION_LABELS[j.decision] + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    document.getElementById('right-panel').innerHTML = html;
  }

  showFeedback(result) {
    var html = '<div class="feedback-card">';
    html += '<div class="feedback-header">';
    if (result.isCorrect) {
      html += '<div class="feedback-icon">✅</div>';
      html += '<div class="feedback-title" style="color:var(--success)">' + Z['feedback_correct'] + '</div>';
    } else {
      html += '<div class="feedback-icon">❌</div>';
      html += '<div class="feedback-title" style="color:var(--danger)">' + Z['feedback_wrong'] + '</div>';
    }
    html += '</div>';
    html += '<div class="feedback-score ' + (result.totalScore >= 0 ? 'positive' : 'negative') + '">' + (result.totalScore >= 0 ? '+' : '') + result.totalScore + Z['fen'] + '</div>';
    html += '<div class="feedback-detail">';
    html += '<h4>' + Z['your_vs_correct'] + '</h4>';
    html += '<div>' + DECISION_LABELS[result.decision] + ' → ' + DECISION_LABELS[result.evaluation.recommendedDecision] + '</div>';
    html += '</div>';
    html += '<div class="time-breakdown">';
    html += '<div class="time-item"><div class="time-item-label">' + Z['time_used'] + '</div><div class="time-item-value">' + result.elapsed + Z['sec'] + '</div></div>';
    html += '<div class="time-item"><div class="time-item-label">' + Z['decision_score'] + '</div><div class="time-item-value">' + (result.decisionScore >= 0 ? '+' : '') + result.decisionScore + '</div></div>';
    if (result.timeBonus > 0) {
      html += '<div class="time-item"><div class="time-item-label">' + Z['time_bonus'] + '</div><div class="time-item-value bonus">+' + result.timeBonus + '</div></div>';
    }
    if (result.timePenalty > 0) {
      html += '<div class="time-item"><div class="time-item-label">' + Z['time_penalty'] + '</div><div class="time-item-value penalty">-' + result.timePenalty + '</div></div>';
    }
    html += '</div>';
    if (result.influences.length > 0) {
      html += '<div class="feedback-detail">';
      html += '<h4>' + Z['risk_influence'] + '</h4>';
      for (var i = 0; i < result.influences.length; i++) {
        var inf = result.influences[i];
        var cls = inf.masked ? 'masked' : inf.riskLevel;
        html += '<div class="influence-item ' + cls + '">';
        html += '<strong>' + inf.ruleName + '</strong>';
        if (inf.masked) html += ' <span class="hint-tag masked">' + Z['masked_tag'] + '</span>';
        html += '<br>' + inf.actual;
        html += '<br>' + Z['arrow_influence'] + inf.affectedResults.join('、');
        html += '</div>';
      }
      html += '</div>';
    }
    if (!result.isCorrect) {
      html += '<div class="feedback-detail" style="border-left:3px solid var(--danger)">';
      html += '<h4>' + Z['correction'] + '</h4>';
      var correct = result.evaluation.recommendedDecision;
      html += '<div>' + Z['correct_decision'] + '：<strong>' + DECISION_LABELS[correct] + '</strong></div>';
      if (result.maskedOverdue && result.caseData.overdueRecord) {
        html += '<div style="margin-top:8px;color:#c4b5fd">' + Z['lightbulb_emoji'] + Z['overdue_trap'];
        html += Z['via_cashflow'] + (result.caseData.cashFlow.trend === 'sharp_decline' ? Z['sharp_decline'] : Z['abnormal']) + Z['indirect_infer'] + '</div>';
      }
      html += '</div>';
    }
    html += '<div class="feedback-actions">';
    var isLast = state.currentCaseIndex >= CASES.length - 1;
    html += '<button class="btn btn-primary" onclick="game.nextCase()">' + (isLast ? Z['view_settlement'] : Z['next_case'] + ' ▶') + '</button>';
    html += '</div>';
    html += '</div>';
    document.getElementById('feedback-content').innerHTML = html;
    this.feedbackOverlay.classList.add('active');
  }

  hideFeedback() {
    this.feedbackOverlay.classList.remove('active');
  }

  renderSettlement(results) {
    var html = '';
    var grade = 'F';
    if (results.totalScore >= 60) grade = 'A';
    else if (results.totalScore >= 40) grade = 'B';
    else if (results.totalScore >= 20) grade = 'C';
    else if (results.totalScore >= 0) grade = 'D';
    html += '<div class="settlement-title">' + Z['settlement_title'] + '</div>';
    html += '<div class="settlement-subtitle">' + Z['settlement_subtitle'] + '</div>';
    html += '<div class="final-score">' + results.totalScore + Z['fen'] + '</div>';
    html += '<div class="score-label">' + Z['grade'] + ' ' + grade + ' | ' + Z['full_score'] + ' ' + results.maxPossibleScore + Z['fen'] + '</div>';
    html += '<div class="case-result-cards">';
    for (var i = 0; i < results.caseResults.length; i++) {
      var r = results.caseResults[i];
      html += '<div class="case-result-card">';
      html += '<div class="case-result-header">';
      html += '<span class="case-result-name">' + r.caseData.name + '</span>';
      html += '<span class="case-result-score ' + (r.totalScore >= 0 ? 'positive' : 'negative') + '">' + (r.totalScore >= 0 ? '+' : '') + r.totalScore + '</span>';
      html += '</div>';
      html += '<div class="case-result-detail">';
      html += '<div class="row"><span class="row-label">' + Z['your_decision'] + '</span><span>' + DECISION_LABELS[r.decision] + '</span></div>';
      html += '<div class="row"><span class="row-label">' + Z['correct_decision_short'] + '</span><span>' + DECISION_LABELS[r.evaluation.recommendedDecision] + '</span></div>';
      html += '<div class="row"><span class="row-label">' + Z['time_used'] + '</span><span>' + r.elapsed + Z['sec'] + '</span></div>';
      html += '<div class="row"><span class="row-label">' + Z['decision_score'] + '</span><span>' + r.decisionScore + '</span></div>';
      if (r.timeBonus > 0) html += '<div class="row"><span class="row-label">' + Z['time_bonus'] + '</span><span style="color:var(--success)">+' + r.timeBonus + '</span></div>';
      if (r.timePenalty > 0) html += '<div class="row"><span class="row-label">' + Z['time_penalty'] + '</span><span style="color:var(--danger)">-' + r.timePenalty + '</span></div>';
      if (r.influences.length > 0) {
        html += '<div class="influence-summary"><h5>' + Z['risk_influence'] + '</h5>';
        for (var j = 0; j < r.influences.length; j++) {
          var inf = r.influences[j];
          var tag = inf.masked ? '<span class="hint-tag masked">' + Z['masked_tag'] + '</span>' : '';
          html += '<div style="font-size:12px;margin-bottom:4px">' + inf.ruleName + tag + ' ' + Z['arrow_influence'] + inf.affectedResults.join('、') + '</div>';
        }
        html += '</div>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    var totalTimePenalty = 0;
    var totalTimeBonus = 0;
    for (var k = 0; k < results.caseResults.length; k++) {
      totalTimePenalty += results.caseResults[k].timePenalty;
      totalTimeBonus += results.caseResults[k].timeBonus;
    }
    if (totalTimePenalty > 0 || totalTimeBonus > 0) {
      html += '<div class="feedback-detail" style="max-width:600px;width:100%;margin-bottom:24px">';
      html += '<h4>' + Z['time_pressure_analysis'] + '</h4>';
      if (totalTimeBonus > 0) html += '<div>' + Z['fast_bonus'] + '<strong style="color:var(--success)">+' + totalTimeBonus + Z['score_suffix'] + '</strong>' + Z['within_60'] + '</div>';
      if (totalTimePenalty > 0) html += '<div>' + Z['overtime_penalty'] + '<strong style="color:var(--danger)">-' + totalTimePenalty + Z['score_suffix'] + '</strong>' + Z['per_10s'] + TIME_PENALTY_PER_10S + Z['score_suffix'] + '</div>';
      html += '<div style="margin-top:8px;color:var(--text-muted);font-size:13px">' + Z['time_pressure_explanation'] + '</div>';
      html += '</div>';
    }
    html += '<div class="settlement-actions">';
    html += '<button class="btn btn-primary" onclick="game.replay()">🔄 ' + Z['replay_game'] + '</button>';
    html += '<button class="btn btn-secondary" onclick="game.toggleReplay()">📋 ' + Z['view_replay'] + '</button>';
    html += '</div>';
    html += '<div class="replay-panel" id="replay-panel">';
    html += '<div class="panel-title">' + Z['replay_title'] + '</div>';
    html += '<div class="replay-timeline">';
    for (var m = 0; m < results.caseResults.length; m++) {
      var cr = results.caseResults[m];
      html += '<div class="replay-case">';
      html += '<div class="replay-case-title">' + cr.caseData.name + '（' + DECISION_LABELS[cr.evaluation.recommendedDecision] + '）</div>';
      var jds = state.judgments[cr.caseData.id];
      if (jds) {
        for (var n = 0; n < jds.length; n++) {
          var jd = jds[n];
          var phName = jd.phase;
          for (var pp = 0; pp < PHASES.length; pp++) {
            if (PHASES[pp].id === jd.phase) phName = PHASES[pp].name;
          }
          html += '<div class="replay-judgment">' + phName + ' ' + Z['stage'] + ' → ' + DECISION_LABELS[jd.decision] + '</div>';
        }
      }
      html += '</div>';
    }
    html += '</div></div>';
    document.getElementById('settlement-content').innerHTML = html;
  }

  toggleReplay() {
    var panel = document.getElementById('replay-panel');
    panel.classList.toggle('active');
  }

  _formatMoney(val) {
    if (val >= 10000) return (val / 10000).toFixed(0) + Z['wan_unit'];
    return val.toLocaleString() + Z['yuan_unit'];
  }

  _maxConsecutiveGaps(gapMonths) {
    if (!gapMonths || gapMonths.length === 0) return 0;
    var sorted = gapMonths.slice().sort(function (a, b) { return a - b; });
    var maxLen = 1;
    var curLen = 1;
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        curLen++;
        if (curLen > maxLen) maxLen = curLen;
      } else {
        curLen = 1;
      }
    }
    return maxLen;
  }
}
