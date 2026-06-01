class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentCaseIndex = 0;
    this.currentPhase = 0;
    this.score = 0;
    this.caseResults = [];
    this.judgments = {};
    this.startTime = null;
    this.caseStartTime = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.gamePhase = "start";
    this.overdueRevealed = {};
  }

  startGame() {
    this.reset();
    this.gamePhase = "playing";
    this.startTime = Date.now();
    this.caseStartTime = Date.now();
  }

  startCase() {
    this.caseStartTime = Date.now();
    this.currentPhase = 0;
  }

  nextPhase() {
    if (this.currentPhase < PHASES.length - 1) {
      this.currentPhase++;
      return true;
    }
    return false;
  }

  addJudgment(caseId, phase, decision) {
    if (!this.judgments[caseId]) {
      this.judgments[caseId] = [];
    }
    this.judgments[caseId].push({
      phase: phase,
      decision: decision,
      timestamp: Date.now()
    });
  }

  revealOverdue(caseId) {
    this.overdueRevealed[caseId] = true;
  }

  isOverdueRevealed(caseId) {
    return !!this.overdueRevealed[caseId];
  }

  submitDecision(caseData, decision, engine) {
    var maskedOverdue = !this.isOverdueRevealed(caseData.id);
    var evaluation = engine.evaluate(caseData, decision, maskedOverdue);
    var elapsed = Math.floor((Date.now() - this.caseStartTime) / 1000);
    var timeBonus = 0;
    var timePenalty = 0;

    if (elapsed < TIME_BONUS_THRESHOLD) {
      timeBonus = Math.min(MAX_TIME_BONUS, Math.floor((TIME_BONUS_THRESHOLD - elapsed) / 10) * TIME_BONUS_PER_10S);
    } else if (elapsed > TIME_LIMIT) {
      timePenalty = Math.floor((elapsed - TIME_LIMIT) / 10) * TIME_PENALTY_PER_10S;
    }

    var decisionScore = this._calculateDecisionScore(caseData, decision, evaluation);
    var totalScore = decisionScore + timeBonus - timePenalty;

    var result = {
      caseData: caseData,
      decision: decision,
      evaluation: evaluation,
      maskedOverdue: maskedOverdue,
      elapsed: elapsed,
      timeBonus: timeBonus,
      timePenalty: timePenalty,
      decisionScore: decisionScore,
      totalScore: totalScore,
      isCorrect: evaluation.isCorrect,
      influences: engine.explainInfluence(evaluation.violations, evaluation.warnings)
    };

    this.caseResults.push(result);
    this.score += totalScore;
    this.addJudgment(caseData.id, PHASES[this.currentPhase].id, decision);

    return result;
  }

  _calculateDecisionScore(caseData, decision, evaluation) {
    var correct = caseData.correctDecision;
    if (decision === correct) {
      switch (decision) {
        case "approve": return SCORING.correctApprove;
        case "reject": return SCORING.correctReject;
        case "conditional": return SCORING.correctConditional;
      }
    } else {
      if (decision === "approve") return SCORING.wrongApprove;
      if (decision === "reject") {
        if (correct === "conditional") return SCORING.wrongConditionalShouldApprove;
        return SCORING.wrongReject;
      }
      if (decision === "conditional") {
        if (correct === "reject") return SCORING.wrongConditionalShouldReject;
        return SCORING.wrongConditionalShouldApprove;
      }
    }
    return 0;
  }

  nextCase() {
    this.currentCaseIndex++;
    if (this.currentCaseIndex >= CASES.length) {
      this.gamePhase = "settlement";
      return false;
    }
    return true;
  }

  getCurrentCase() {
    return CASES[this.currentCaseIndex];
  }

  getElapsed() {
    if (!this.caseStartTime) return 0;
    return Math.floor((Date.now() - this.caseStartTime) / 1000);
  }

  getFullResults() {
    return {
      totalScore: this.score,
      caseResults: this.caseResults,
      maxPossibleScore: CASES.length * SCORING.correctReject
    };
  }

  getReplayData() {
    return {
      judgments: JSON.parse(JSON.stringify(this.judgments)),
      caseResults: JSON.parse(JSON.stringify(this.caseResults))
    };
  }
}
