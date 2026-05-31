class GameEngine {
  constructor(config = {}) {
    this.config = {
      initialMargin: config.initialMargin || 100000,
      marginCallThreshold: config.marginCallThreshold || 0.3,
      volatilityJumpThreshold: config.volatilityJumpThreshold || 0.15,
      maxRounds: config.maxRounds || 10,
      ...config
    };
    
    this.gameState = null;
    this.materialQueue = [];
    this.pendingMaterials = [];
    this.history = [];
    
    this._initState();
  }
  
  _initState() {
    this.gameState = {
      isRunning: false,
      isPaused: false,
      currentRound: 0,
      currentVolatility: 0.2,
      previousVolatility: 0.2,
      volatilityJumped: false,
      margin: this.config.initialMargin,
      positions: [],
      marginBars: this._createInitialMarginBars(),
      missingMarginColumns: [],
      score: 0,
      decisions: [],
      gameOver: false,
      gameResult: null,
      supplementMode: false,
      currentMaterial: null
    };
  }
  
  _createInitialMarginBars() {
    return [
      { id: 'initial', value: this.config.initialMargin * 0.25, filled: true },
      { id: 'maintenance', value: this.config.initialMargin * 0.15, filled: true },
      { id: 'variation', value: this.config.initialMargin * 0.1, filled: true },
      { id: 'reserve', value: this.config.initialMargin * 0.05, filled: false }
    ];
  }
  
  loadMaterials(materials) {
    this.materialQueue = [...materials];
    this.pendingMaterials = [];
  }
  
  start() {
    this._initState();
    this.gameState.isRunning = true;
    this.gameState.currentRound = 1;
    this._loadNextMaterial();
    return this.getState();
  }
  
  pause() {
    if (!this.gameState.isRunning) return;
    this.gameState.isPaused = true;
    return this.getState();
  }
  
  resume() {
    if (!this.gameState.isPaused) return;
    this._clearStateResidue();
    this.gameState.isPaused = false;
    return this.getState();
  }
  
  _clearStateResidue() {
    this.gameState.positions = this.gameState.positions.filter(p => !p.settled);
    this.gameState.decisions = this.gameState.decisions.filter(d => d.round === this.gameState.currentRound);
  }
  
  restart() {
    this.history = [];
    return this.start();
  }
  
  _loadNextMaterial() {
    if (this.materialQueue.length === 0) {
      if (this.pendingMaterials.length > 0) {
        this.materialQueue = [...this.pendingMaterials];
        this.pendingMaterials = [];
      } else {
        this._endGame('completed');
        return;
      }
    }
    
    const material = this.materialQueue.shift();
    this.gameState.currentMaterial = material;
    this.gameState.previousVolatility = this.gameState.currentVolatility;
    
    if (material.volatility) {
      this.gameState.currentVolatility = material.volatility;
      const volChange = Math.abs(material.volatility - this.gameState.previousVolatility);
      this.gameState.volatilityJumped = volChange >= this.config.volatilityJumpThreshold;
    }
    
    this._checkMarginBars();
  }
  
  _checkMarginBars() {
    const missing = this.gameState.marginBars.filter(bar => !bar.filled);
    this.gameState.missingMarginColumns = missing.map(m => m.id);
    
    if (missing.length > 0) {
      this.gameState.supplementMode = true;
    }
  }
  
  supplementMargin(columnId, amount) {
    const bar = this.gameState.marginBars.find(b => b.id === columnId);
    if (!bar) return { success: false, error: 'Invalid column ID' };
    
    bar.filled = true;
    this.gameState.margin += amount;
    this.gameState.missingMarginColumns = this.gameState.missingMarginColumns.filter(id => id !== columnId);
    
    if (this.gameState.missingMarginColumns.length === 0) {
      this.gameState.supplementMode = false;
    }
    
    return { success: true, state: this.getState() };
  }
  
  skipToSupplement() {
    if (this.gameState.currentMaterial) {
      this.pendingMaterials.push({
        ...this.gameState.currentMaterial,
        supplementRequired: true
      });
    }
    this._loadNextMaterial();
    return this.getState();
  }
  
  makeDecision(decision) {
    if (this.gameState.gameOver || this.gameState.supplementMode) {
      return { success: false, error: 'Cannot make decision now' };
    }
    
    const material = this.gameState.currentMaterial;
    const decisionRecord = {
      round: this.gameState.currentRound,
      materialId: material.id,
      action: decision.action,
      quantity: decision.quantity || 1,
      volatilityJumped: this.gameState.volatilityJumped,
      volatilityAware: decision.volatilityAware || false,
      timestamp: Date.now()
    };
    
    this._executeDecision(decision, decisionRecord);
    this.gameState.decisions.push(decisionRecord);
    
    this._updateScore(decisionRecord);
    this._advanceRound();
    
    return { success: true, state: this.getState() };
  }
  
  _executeDecision(decision, record) {
    const material = this.gameState.currentMaterial;
    const strikePrice = material.strikePrice || 100;
    const quantity = decision.quantity || 1;
    const optionPrice = material.optionPrice || 5;
    
    if (decision.action === 'buy_call' || decision.action === 'buy_put') {
      const cost = optionPrice * quantity * 100;
      const position = {
        id: `pos_${Date.now()}`,
        type: decision.action,
        strikePrice,
        quantity,
        entryPrice: optionPrice,
        entryVolatility: this.gameState.currentVolatility,
        settled: false
      };
      
      this.gameState.positions.push(position);
      this.gameState.margin -= cost;
      record.marginChange = -cost;
      record.positionId = position.id;
    }
    
    if (decision.action === 'sell_call' || decision.action === 'sell_put') {
      const premium = optionPrice * quantity * 100;
      const marginRequired = premium * 0.5;
      const position = {
        id: `pos_${Date.now()}`,
        type: decision.action,
        strikePrice,
        quantity,
        entryPrice: optionPrice,
        entryVolatility: this.gameState.currentVolatility,
        marginRequired,
        settled: false
      };
      
      this.gameState.positions.push(position);
      this.gameState.margin += premium - marginRequired;
      record.marginChange = premium - marginRequired;
      record.positionId = position.id;
    }
  }
  
  _updateScore(decision) {
    const material = this.gameState.currentMaterial;
    let score = 0;
    
    if (this.gameState.volatilityJumped && decision.volatilityAware) {
      score += 50;
    }
    
    if (this.gameState.volatilityJumped && !decision.volatilityAware) {
      score -= 30;
      decision.ignoredVolatility = true;
    }
    
    if (material.expectedDirection) {
      const directionMatch = this._checkDirectionMatch(decision.action, material.expectedDirection);
      if (directionMatch) {
        score += 30;
      } else {
        score -= 20;
        decision.wrongDirection = true;
      }
    }
    
    this.gameState.score += score;
    decision.score = score;
  }
  
  _checkDirectionMatch(action, expected) {
    const actionDirection = action.includes('call') ? 'up' : 'down';
    return actionDirection === expected;
  }
  
  _advanceRound() {
    this._settlePositions();
    
    if (this.gameState.margin < this.config.initialMargin * this.config.marginCallThreshold) {
      this.gameState.marginBars.forEach(bar => {
        if (bar.id === 'reserve') bar.filled = false;
      });
      this.gameState.supplementMode = true;
      this.gameState.missingMarginColumns = ['reserve'];
    }
    
    if (this.gameState.margin < 0) {
      this._endGame('margin_insufficient');
      return;
    }
    
    this.gameState.currentRound++;
    
    if (this.gameState.currentRound > this.config.maxRounds) {
      this._endGame('completed');
      return;
    }
    
    this._loadNextMaterial();
  }
  
  _settlePositions() {
    const material = this.gameState.currentMaterial;
    const underlyingPrice = material.underlyingPrice || material.strikePrice || 100;
    
    this.gameState.positions.forEach(position => {
      if (position.settled) return;
      
      let pnl = 0;
      const strike = position.strikePrice;
      
      if (position.type === 'buy_call') {
        pnl = Math.max(0, underlyingPrice - strike) * position.quantity * 100;
        pnl -= position.entryPrice * position.quantity * 100;
      } else if (position.type === 'buy_put') {
        pnl = Math.max(0, strike - underlyingPrice) * position.quantity * 100;
        pnl -= position.entryPrice * position.quantity * 100;
      } else if (position.type === 'sell_call') {
        pnl = position.entryPrice * position.quantity * 100;
        pnl -= Math.max(0, underlyingPrice - strike) * position.quantity * 100;
      } else if (position.type === 'sell_put') {
        pnl = position.entryPrice * position.quantity * 100;
        pnl -= Math.max(0, strike - underlyingPrice) * position.quantity * 100;
      }
      
      position.settled = true;
      position.settlePrice = underlyingPrice;
      position.pnl = pnl;
      
      this.gameState.margin += pnl;
    });
  }
  
  _endGame(result) {
    this.gameState.isRunning = false;
    this.gameState.gameOver = true;
    this.gameState.gameResult = result;
    
    const record = {
      result,
      finalScore: this.gameState.score,
      finalMargin: this.gameState.margin,
      decisions: [...this.gameState.decisions],
      volatilityJumpsIgnored: this.gameState.decisions.filter(d => d.ignoredVolatility).length,
      wrongDirections: this.gameState.decisions.filter(d => d.wrongDirection).length
    };
    
    this.history.push(record);
  }
  
  getState() {
    return {
      ...this.gameState,
      config: this.config,
      canSupplement: this.gameState.missingMarginColumns.length > 0,
      availableActions: this._getAvailableActions()
    };
  }
  
  _getAvailableActions() {
    if (this.gameState.supplementMode) {
      return ['supplement_margin', 'skip'];
    }
    return ['buy_call', 'buy_put', 'sell_call', 'sell_put', 'hold'];
  }
  
  getHistory() {
    return this.history;
  }
}

module.exports = GameEngine;
