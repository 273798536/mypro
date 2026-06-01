var engine = new RuleEngine(RULES);
var state = new GameState();
var ui = new UI();

var GameController = {
  start: function () {
    ui.showScreen("start");
  },

  startGame: function () {
    state.startGame();
    state.startCase();
    ui.showScreen("game");
    ui.updateHeader(state);
    ui.renderCase(state, engine);
    this._startTimer();
  },

  nextPhase: function () {
    if (state.nextPhase()) {
      ui.renderCase(state, engine);
    }
  },

  revealOverdue: function () {
    var caseData = state.getCurrentCase();
    state.revealOverdue(caseData.id);
    ui.renderCase(state, engine);
  },

  submitDecision: function (decision) {
    this._stopTimer();
    var caseData = state.getCurrentCase();
    var result = state.submitDecision(caseData, decision, engine);
    ui.showFeedback(result);
  },

  nextCase: function () {
    ui.hideFeedback();
    if (state.nextCase()) {
      state.startCase();
      ui.updateHeader(state);
      ui.renderCase(state, engine);
      this._startTimer();
    } else {
      var results = state.getFullResults();
      ui.renderSettlement(results);
      ui.showScreen("settlement");
    }
  },

  replay: function () {
    state.reset();
    this.startGame();
  },

  toggleReplay: function () {
    ui.toggleReplay();
  },

  _startTimer: function () {
    this._stopTimer();
    var self = this;
    this._timerInterval = setInterval(function () {
      var elapsed = state.getElapsed();
      ui.updateTimer(elapsed);
      if (elapsed >= TIME_LIMIT + 60) {
        self.submitDecision("approve");
      }
    }, 1000);
  },

  _stopTimer: function () {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }
};

var game = GameController;
game.start();
