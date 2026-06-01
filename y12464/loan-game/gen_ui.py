#!/usr/bin/env python3
# This script generates ui.js with proper encoding

Z = {}
Z['customer_card'] = '\u5ba2\u6237\u5361'
Z['name'] = '\u59d3\u540d'
Z['gender'] = '\u6027\u522b'
Z['age'] = '\u5e74\u9f84'
Z['age_suffix'] = '\u5c81'
Z['industry'] = '\u884c\u4e1a'
Z['high_risk'] = '\u9ad8\u98ce\u9669'
Z['med_risk'] = '\u4e2d\u98ce\u9669'
Z['loan_amount'] = '\u8d37\u6b3e\u91d1\u989d'
Z['loan_purpose'] = '\u8d37\u6b3e\u7528\u9014'
Z['credit_score'] = '\u4fe1\u7528\u5206'
Z['overdue_record'] = '\u903e\u671f\u8bb0\u5f55'
Z['overdue_yes'] = '\u6709\u903e\u671f'
Z['overdue_no'] = '\u65e0'
Z['masked_blocks'] = '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588'
Z['masked_status'] = '\u906e\u76d6\u4e2d'
Z['collateral_type'] = '\u62c5\u4fdd\u65b9\u5f0f'
Z['collateral_value'] = '\u62c5\u4fdd\u4ef7\u503c'
Z['expiry_date'] = '\u5230\u671f\u65e5'
Z['expired'] = '\u5df2\u8fc7\u671f'
Z['valid'] = '\u6709\u6548'
Z['phase_hint_0'] = '\u9636\u6bb5\u63d0\u793a\uff1a\u5148\u4ed4\u7ec6\u9605\u8bfb\u5ba2\u6237\u5361\u4fe1\u606f\uff0c\u6ce8\u610f\u4fe1\u7528\u5206\u3001\u903e\u671f\u8bb0\u5f55\u548c\u62c5\u4fdd\u72b6\u6001\u3002\u5982\u6709\u906e\u76d6\u5b57\u6bb5\uff0c\u9700\u4ece\u5176\u4ed6\u7ebf\u7d22\u63a8\u65ad\u3002'
Z['overdue_masked_title'] = '\u903e\u671f\u8bb0\u5f55\u88ab\u906e\u76d6'
Z['overdue_masked_hint'] = '\u4f60\u53ef\u4ee5\u9009\u62e9\u63ed\u793a\u906e\u76d6\uff08\u6a21\u62df\u73b0\u573a\u67e5\u6863\uff09\uff0c\u6216\u6839\u636e\u95f4\u63a5\u7ebf\u7d22\u81ea\u884c\u5224\u65ad'
Z['overdue_revealed_prefix'] = '\u906e\u76d6\u5df2\u63ed\u793a\uff1a'
Z['overdue_revealed_effect'] = '\u8be5\u903e\u671f\u8bb0\u5f55\u89e6\u53d1\u89c4\u5219R2\uff08\u903e\u671f\u4e00\u7968\u5426\u51b3\uff09\uff0c\u5f71\u54cd\uff1a\u5ba1\u6279\u7ed3\u8bba\u3001\u62c5\u4fdd\u8981\u6c42\u3001\u8d37\u540e\u76d1\u63a7\u7b49\u7ea7'
Z['indirect_hint'] = '\u95f4\u63a5\u7ebf\u7d22\u63d0\u793a\uff1a'
Z['cashflow_sharp_decline_hint'] = '\u6d41\u6c34\u6301\u7eed\u9aa4\u964d\u53ef\u80fd\u6697\u793a\u8fd8\u6b3e\u56f0\u96be '
Z['high_risk_industry_hint'] = '\u9ad8\u98ce\u9669\u884c\u4e1a\u6613\u51fa\u903e\u671f '
Z['credit_score_low_hint'] = '\u4fe1\u7528\u5206'
Z['credit_score_mid_hint'] = '\u5904\u4e8e\u4e2d\u7b49\u504f\u4f4e\u533a\u95f4 '
Z['collateral_expired_prefix'] = '\u62c5\u4fdd\u8fc7\u671f\uff1a'
Z['collateral_expired_mid'] = ' \u5df2\u4e8e '
Z['collateral_expired_suffix'] = ' \u8fc7\u671f'
Z['collateral_expired_effect'] = '\u89e6\u53d1\u89c4\u5219R3\uff08\u62c5\u4fdd\u6709\u6548\u6027\u68c0\u67e5\uff09\uff0c\u5f71\u54cd\uff1a\u5ba1\u6279\u7ed3\u8bba\u3001\u62c5\u4fdd\u8981\u6c42\u3001\u98ce\u9669\u8986\u76d6\u6bd4\u4f8b'
Z['cashflow_gap_prefix'] = '\u6d41\u6c34\u65ad\u6863\uff1a\u7b2c '
Z['cashflow_gap_mid'] = ' \u6708'
Z['cashflow_gap_no_flow'] = '\u65e0\u6d41\u6c34\u8bb0\u5f55'
Z['cashflow_gap_consec'] = '\uff08\u8fde\u7eed\u6700\u957f'
Z['cashflow_gap_months'] = '\u4e2a\u6708\uff09'
Z['cashflow_gap_severe_effect'] = '\u89e6\u53d1\u89c4\u5219R4\uff08\u6d41\u6c34\u65ad\u6863\u4e25\u91cd\uff09\uff0c\u5f71\u54cd\uff1a\u5ba1\u6279\u7ed3\u8bba\u3001\u8fd8\u6b3e\u80fd\u529b\u8bc4\u4f30\u3001\u6388\u4fe1\u989d\u5ea6'
Z['cashflow_gap_mild_effect'] = '\u89e6\u53d1\u89c4\u5219R5\uff08\u6d41\u6c34\u77ed\u671f\u65ad\u6863\uff09\uff0c\u5f71\u54cd\uff1a\u8fd8\u6b3e\u80fd\u529b\u8bc4\u4f30\u3001\u8d37\u540e\u76d1\u63a7\u7b49\u7ea7'
Z['next_phase'] = '\u8fdb\u5165\u4e0b\u4e00\u9636\u6bb5\uff1a'
Z['cashflow_title'] = '\u8fd112\u6708\u94f6\u884c\u6d41\u6c34'
Z['wan'] = '\u4e07'
Z['yue'] = '\u6708'
Z['avg_monthly'] = '\u6708\u5747\u6d41\u6c34'
Z['loan_ratio'] = '\u8d37\u6b3e/\u6708\u5747\u6d41\u6c34'
Z['times'] = '\u500d'
Z['gap_months'] = '\u65ad\u6863\u6708\u6570'
Z['gap_months_unit'] = '\u4e2a\u6708'
Z['trend_label'] = '\u8d8b\u52bf'
Z['trend_stable'] = '\u7a33\u5b9a'
Z['trend_declining'] = '\u4e0b\u6ed1'
Z['trend_sharp_decline'] = '\u9aa4\u964d'
Z['decision_title'] = '\u5ba1\u6279\u51b3\u7b56'
Z['decision_hint'] = '\u6839\u636e\u5f53\u524d\u7ebf\u7d22\u505a\u51fa\u5224\u65ad\uff1a'
Z['approve'] = '\u6279\u51c6'
Z['conditional'] = '\u6709\u6761\u4ef6\u6279\u51c6'
Z['reject'] = '\u62d2\u7edd'
Z['judgment_history'] = '\u5224\u65ad\u8bb0\u5f55'
Z['stage'] = '\u9636\u6bb5'
Z['feedback_correct'] = '\u5224\u65ad\u6b63\u786e'
Z['feedback_wrong'] = '\u5224\u65ad\u6709\u8bef'
Z['your_vs_correct'] = '\u4f60\u7684\u51b3\u7b56 vs \u6b63\u786e\u51b3\u7b56'
Z['time_used'] = '\u7528\u65f6'
Z['sec'] = '\u79d2'
Z['decision_score'] = '\u51b3\u7b56\u5f97\u5206'
Z['time_bonus'] = '\u65f6\u95f4\u5956\u52b1'
Z['time_penalty'] = '\u8d85\u65f6\u6263\u5206'
Z['risk_influence'] = '\u98ce\u9669\u56e0\u7d20\u5f71\u54cd\u8bf4\u660e'
Z['influence_label'] = '\u5f71\u54cd\uff1a'
Z['masked_tag'] = '\u906e\u76d6'
Z['correction'] = '\u7ea0\u9519\u8bf4\u660e'
Z['correct_decision'] = '\u6b63\u786e\u51b3\u7b56'
Z['overdue_trap'] = '\u903e\u671f\u906e\u76d6\u9677\u9631\uff1a\u8be5\u5ba2\u6237\u5b58\u5728\u903e\u671f\u8bb0\u5f55\u88ab\u906e\u76d6\uff0c'
Z['via_cashflow'] = '\u53ef\u901a\u8fc7\u6d41\u6c34'
Z['indirect_infer'] = '\u7b49\u95f4\u63a5\u7ebf\u7d22\u63a8\u65ad\u3002'
Z['sharp_decline'] = '\u9aa4\u964d'
Z['abnormal'] = '\u5f02\u5e38'
Z['view_settlement'] = '\u67e5\u770b\u7ed3\u7b97'
Z['next_case'] = '\u4e0b\u4e00\u6848\u4ef6'
Z['settlement_title'] = '\u95ef\u5173\u7ed3\u7b97'
Z['settlement_subtitle'] = '\u4f60\u7684\u5ba1\u6279\u5b98\u8bc4\u7ea7'
Z['grade'] = '\u8bc4\u7ea7'
Z['full_score'] = '\u6ee1\u5206'
Z['your_decision'] = '\u4f60\u7684\u51b3\u7b56'
Z['correct_decision_short'] = '\u6b63\u786e\u51b3\u7b56'
Z['time_pressure_analysis'] = '\u65f6\u95f4\u538b\u529b\u5206\u6790'
Z['fast_bonus'] = '\u5feb\u901f\u51b3\u7b56\u5956\u52b1\uff1a'
Z['within_60'] = '\uff0860\u79d2\u5185\u5b8c\u6210\u83b7\u5f97\u65f6\u95f4\u5956\u52b1\uff09'
Z['overtime_penalty'] = '\u8d85\u65f6\u6263\u5206\uff1a'
Z['per_10s'] = '\uff08\u8d85\u8fc790\u79d2\u540e\u6bcf10\u79d2\u6263'
Z['time_pressure_explanation'] = '\u5728\u771f\u5b9e\u5ba1\u6279\u4e2d\uff0c\u65f6\u95f4\u538b\u529b\u4f1a\u5bfc\u81f4\u5ba1\u67e5\u4e0d\u5145\u5206\u3001\u9057\u6f0f\u98ce\u9669\u4fe1\u53f7\uff0c\u6b63\u5982\u6e38\u620f\u4e2d\u8d85\u65f6\u6263\u5206\u5bf9\u5e94\u7684\u662f\u5306\u5fd9\u5ba1\u6279\u5e26\u6765\u7684\u98ce\u9669\u9057\u6f0f\u3002'
Z['replay_game'] = '\u91cd\u65b0\u95ef\u5173'
Z['view_replay'] = '\u67e5\u770b\u56de\u653e'
Z['replay_title'] = '\u56de\u653e\u8bb0\u5f55'
Z['points_suffix'] = '\u5206'
Z['score_suffix'] = '\u5206'
Z['reveal_btn'] = '\u63ed\u793a\u906e\u76d6\u5185\u5bb9'
Z['case_prefix'] = '\u6848\u4ef6 '
Z['difficulty'] = '\u96be\u5ea6 '
Z['score_prefix'] = '\u5f97\u5206 '
Z['star'] = '\u2605'
Z['wan_unit'] = '\u4e07\u5143'
Z['yuan_unit'] = '\u5143'
Z['warning_emoji'] = '\u26a0\ufe0f '
Z['lightbulb_emoji'] = '\U0001f4a1 '
Z['arrow_influence'] = '\u2192 \u5f71\u54cd\uff1a'
Z['overdue_masked_note_r2'] = '\u89e6\u53d1\u89c4\u5219R2\uff08\u903e\u671f\u4e00\u7968\u5426\u51b3\uff09\uff0c\u5f71\u54cd\uff1a\u5ba1\u6279\u7ed3\u8bba\u3001\u62c5\u4fdd\u8981\u6c42\u3001\u8d37\u540e\u76d1\u63a7\u7b49\u7ea7'
Z['fen'] = ' \u5206'

js = """class UI {
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
        html += '<div class="overdue-mask-icon">\U0001f512</div>';
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
      html += Z['warning_emoji'] + Z['cashflow_gap_prefix'] + '<strong>' + caseData.cashFlow.gapMonths.map(function (m) { return m + 1; }).join('\u3001') + Z['cashflow_gap_mid'] + '</strong>' + Z['cashflow_gap_no_flow'];
      html += Z['cashflow_gap_consec'] + maxConsec + Z['cashflow_gap_months'] + '<br>';
      if (maxConsec > 2) {
        html += Z['cashflow_gap_severe_effect'];
      } else {
        html += Z['cashflow_gap_mild_effect'];
      }
      html += '</div>';
    }
    if (phase < PHASES.length - 1) {
      html += '<button class="next-phase-btn" onclick="game.nextPhase()">' + Z['next_phase'] + PHASES[phase + 1].name + ' \u25b6</button>';
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
    html += '<button class="decision-btn btn-approve" onclick="game.submitDecision(&#39;approve&#39;)">\u2705 ' + Z['approve'] + '</button>';
    html += '<button class="decision-btn btn-conditional" onclick="game.submitDecision(&#39;conditional&#39;)">\u26a0\ufe0f ' + Z['conditional'] + '</button>';
    html += '<button class="decision-btn btn-reject" onclick="game.submitDecision(&#39;reject&#39;)">\u274c ' + Z['reject'] + '</button>';
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
      html += '<div class="feedback-icon">\u2705</div>';
      html += '<div class="feedback-title" style="color:var(--success)">' + Z['feedback_correct'] + '</div>';
    } else {
      html += '<div class="feedback-icon">\u274c</div>';
      html += '<div class="feedback-title" style="color:var(--danger)">' + Z['feedback_wrong'] + '</div>';
    }
    html += '</div>';
    html += '<div class="feedback-score ' + (result.totalScore >= 0 ? 'positive' : 'negative') + '">' + (result.totalScore >= 0 ? '+' : '') + result.totalScore + Z['fen'] + '</div>';
    html += '<div class="feedback-detail">';
    html += '<h4>' + Z['your_vs_correct'] + '</h4>';
    html += '<div>' + DECISION_LABELS[result.decision] + ' \u2192 ' + DECISION_LABELS[result.evaluation.recommendedDecision] + '</div>';
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
        html += '<br>' + Z['arrow_influence'] + inf.affectedResults.join('\u3001');
        html += '</div>';
      }
      html += '</div>';
    }
    if (!result.isCorrect) {
      html += '<div class="feedback-detail" style="border-left:3px solid var(--danger)">';
      html += '<h4>' + Z['correction'] + '</h4>';
      var correct = result.evaluation.recommendedDecision;
      html += '<div>' + Z['correct_decision'] + '\uff1a<strong>' + DECISION_LABELS[correct] + '</strong></div>';
      if (result.maskedOverdue && result.caseData.overdueRecord) {
        html += '<div style="margin-top:8px;color:#c4b5fd">' + Z['lightbulb_emoji'] + Z['overdue_trap'];
        html += Z['via_cashflow'] + (result.caseData.cashFlow.trend === 'sharp_decline' ? Z['sharp_decline'] : Z['abnormal']) + Z['indirect_infer'] + '</div>';
      }
      html += '</div>';
    }
    html += '<div class="feedback-actions">';
    var isLast = state.currentCaseIndex >= CASES.length - 1;
    html += '<button class="btn btn-primary" onclick="game.nextCase()">' + (isLast ? Z['view_settlement'] : Z['next_case'] + ' \u25b6') + '</button>';
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
          html += '<div style="font-size:12px;margin-bottom:4px">' + inf.ruleName + tag + ' ' + Z['arrow_influence'] + inf.affectedResults.join('\u3001') + '</div>';
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
    html += '<button class="btn btn-primary" onclick="game.replay()">\U0001f504 ' + Z['replay_game'] + '</button>';
    html += '<button class="btn btn-secondary" onclick="game.toggleReplay()">\U0001f4cb ' + Z['view_replay'] + '</button>';
    html += '</div>';
    html += '<div class="replay-panel" id="replay-panel">';
    html += '<div class="panel-title">' + Z['replay_title'] + '</div>';
    html += '<div class="replay-timeline">';
    for (var m = 0; m < results.caseResults.length; m++) {
      var cr = results.caseResults[m];
      html += '<div class="replay-case">';
      html += '<div class="replay-case-title">' + cr.caseData.name + '\uff08' + DECISION_LABELS[cr.evaluation.recommendedDecision] + '\uff09</div>';
      var jds = state.judgments[cr.caseData.id];
      if (jds) {
        for (var n = 0; n < jds.length; n++) {
          var jd = jds[n];
          var phName = jd.phase;
          for (var pp = 0; pp < PHASES.length; pp++) {
            if (PHASES[pp].id === jd.phase) phName = PHASES[pp].name;
          }
          html += '<div class="replay-judgment">' + phName + ' ' + Z['stage'] + ' \u2192 ' + DECISION_LABELS[jd.decision] + '</div>';
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
"""

# Build the Z constant as a JS object
z_lines = ['var Z = {']
for key, val in Z.items():
    z_lines.append("  '{}': '{}',".format(key, val.replace("'", "\\'")))
z_lines.append('};')

full_content = '\n'.join(z_lines) + '\n' + js

with open('ui.js', 'w', encoding='utf-8') as f:
    f.write(full_content)

print("ui.js written successfully")
