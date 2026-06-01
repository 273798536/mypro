class RuleEngine {
  constructor(rules) {
    this.rules = rules;
  }

  evaluate(caseData, decision, maskedOverdue) {
    var triggered = [];
    var violations = [];
    var warnings = [];

    for (var i = 0; i < this.rules.length; i++) {
      var rule = this.rules[i];
      var result = this._checkRule(rule, caseData, decision, maskedOverdue);
      if (result.triggered) {
        triggered.push({
          rule: rule,
          actual: result.actual,
          masked: result.masked || false
        });
      }
    }

    for (var j = 0; j < triggered.length; j++) {
      var t = triggered[j];
      if (t.rule.riskLevel === "high" && t.rule.appliesTo.indexOf(decision) !== -1) {
        violations.push(t);
      } else if (t.rule.riskLevel === "medium" && t.rule.appliesTo.indexOf(decision) !== -1) {
        warnings.push(t);
      }
    }

    return {
      triggered: triggered,
      violations: violations,
      warnings: warnings,
      isCorrect: this._isCorrectDecision(caseData, decision, maskedOverdue),
      recommendedDecision: caseData.correctDecision
    };
  }

  _checkRule(rule, caseData, decision, maskedOverdue) {
    switch (rule.id) {
      case "R1":
        return this._checkCreditScore(rule, caseData);
      case "R2":
        return this._checkOverdue(rule, caseData, maskedOverdue);
      case "R3":
        return this._checkCollateralExpiry(rule, caseData);
      case "R4":
        return this._checkCashFlowGapSevere(rule, caseData);
      case "R5":
        return this._checkCashFlowGapMild(rule, caseData);
      case "R6":
        return this._checkLoanToFlowRatio(rule, caseData);
      case "R7":
        return this._checkHighRiskIndustry(rule, caseData);
      default:
        return { triggered: false };
    }
  }

  _checkCreditScore(rule, caseData) {
    if (caseData.creditScore < rule.threshold) {
      return {
        triggered: true,
        actual: "信用分 " + caseData.creditScore + " < " + rule.threshold
      };
    }
    return { triggered: false };
  }

  _checkOverdue(rule, caseData, maskedOverdue) {
    if (caseData.overdueRecord) {
      if (maskedOverdue && caseData.overdueMasked) {
        return {
          triggered: true,
          actual: "逾期记录（被遮盖）",
          masked: true
        };
      }
      return {
        triggered: true,
        actual: caseData.overdueDetail || "存在逾期记录"
      };
    }
    return { triggered: false };
  }

  _checkCollateralExpiry(rule, caseData) {
    if (caseData.collateral.expired) {
      return {
        triggered: true,
        actual: caseData.collateral.type + " 已过期（到期日：" + caseData.collateral.expiryDate + "）"
      };
    }
    return { triggered: false };
  }

  _checkCashFlowGapSevere(rule, caseData) {
    var maxConsecutiveGap = this._maxConsecutiveGaps(caseData.cashFlow.gapMonths);
    if (maxConsecutiveGap > rule.threshold) {
      return {
        triggered: true,
        actual: "连续断档 " + maxConsecutiveGap + " 个月 > " + rule.threshold + " 个月"
      };
    }
    return { triggered: false };
  }

  _checkCashFlowGapMild(rule, caseData) {
    var maxConsecutiveGap = this._maxConsecutiveGaps(caseData.cashFlow.gapMonths);
    if (maxConsecutiveGap >= 1 && maxConsecutiveGap <= 2) {
      return {
        triggered: true,
        actual: "断档 " + maxConsecutiveGap + " 个月"
      };
    }
    return { triggered: false };
  }

  _checkLoanToFlowRatio(rule, caseData) {
    var ratio = caseData.loanAmount / caseData.cashFlow.avgMonthly;
    if (ratio > rule.threshold) {
      return {
        triggered: true,
        actual: "贷款/月均流水 = " + ratio.toFixed(1) + " 倍 > " + rule.threshold + " 倍"
      };
    }
    return { triggered: false };
  }

  _checkHighRiskIndustry(rule, caseData) {
    if (caseData.industryRisk === "high" && caseData.cashFlow.trend === "sharp_decline") {
      return {
        triggered: true,
        actual: caseData.industry + "（高风险行业）+ 流水骤降"
      };
    }
    return { triggered: false };
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

  _isCorrectDecision(caseData, decision, maskedOverdue) {
    if (maskedOverdue && caseData.overdueMasked && caseData.overdueRecord) {
      return decision === "reject";
    }
    return decision === caseData.correctDecision;
  }

  getFullEvaluation(caseData) {
    return this.evaluate(caseData, caseData.correctDecision, false);
  }

  explainInfluence(violations, warnings) {
    var explanations = [];
    var all = violations.concat(warnings);
    for (var i = 0; i < all.length; i++) {
      var item = all[i];
      explanations.push({
        ruleName: item.rule.name,
        riskLevel: item.rule.riskLevel,
        actual: item.actual,
        masked: item.masked || false,
        affectedResults: item.rule.affectedResults,
        description: item.rule.description + " → 影响：" + item.rule.affectedResults.join("、")
      });
    }
    return explanations;
  }
}
