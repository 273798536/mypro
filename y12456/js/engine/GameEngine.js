class GameEngine {
  constructor(levelData) {
    this.level = levelData;
    this.state = {
      status: 'idle',
      gold: levelData.startGold,
      lives: levelData.startLives,
      score: 0,
      currentWave: 0,
      waveInProgress: false,
      gameTime: 0,
      currentBpm: levelData.targetBpm,
      bpmHistory: [],
      speedDriftEvents: [],
      lastBeatTime: 0,
      beatInterval: 60000 / levelData.targetBpm,
    };
    
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.rhythmJudgments = [];
    this.errorLogs = [];
    this.beatEvents = [];
    this.spawnQueue = [];
    
    this.pathLength = this.calculatePathLength();
    this.currentBeatIndex = 0;
    this.expandedBeats = this.expandDrumTrack();
    
    this.towerIdCounter = 0;
    this.enemyIdCounter = 0;
    this.projectileIdCounter = 0;
    this.effectIdCounter = 0;
    this.judgmentIdCounter = 0;
    
    this.callbacks = {
      onStateChange: null,
      onEnemySpawn: null,
      onEnemyDeath: null,
      onEnemyReachEnd: null,
      onTowerAttack: null,
      onRhythmJudgment: null,
      onSpeedDrift: null,
      onGameOver: null,
      onGameWin: null,
    };
  }

  calculatePathLength() {
    let length = 0;
    const path = this.level.path;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i-1].x;
      const dy = path[i].y - path[i-1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  expandDrumTrack() {
    const beats = [];
    const track = this.level.drumTrack;
    const barDuration = (60000 / track.bpm) * 4;
    
    for (let repeat = 0; repeat < track.repeat; repeat++) {
      const timeOffset = repeat * barDuration;
      track.beats.forEach((beat, idx) => {
        beats.push({
          ...beat,
          id: `beat_${repeat}_${idx}`,
          time: timeOffset + beat.time,
          bar: repeat + 1,
          judged: false,
          judgment: null,
        });
      });
    }
    return beats;
  }

  start() {
    if (this.state.status !== 'idle') return;
    this.state.status = 'playing';
    this.state.gameTime = 0;
    this.startNextWave();
    this.notifyStateChange();
  }

  pause() {
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
      this.notifyStateChange();
    }
  }

  resume() {
    if (this.state.status === 'paused') {
      this.state.status = 'playing';
      this.notifyStateChange();
    }
  }

  startNextWave() {
    if (this.state.currentWave >= this.level.waves.length) {
      this.checkWinCondition();
      return;
    }
    
    const wave = this.level.waves[this.state.currentWave];
    this.state.waveInProgress = true;
    
    this.spawnQueue = [];
    wave.enemies.forEach(enemyGroup => {
      enemyGroup.beatAlignment.forEach((beatPos, idx) => {
        if (idx < enemyGroup.count) {
          const spawnTime = wave.delay + idx * wave.spawnInterval;
          this.spawnQueue.push({
            time: spawnTime,
            type: enemyGroup.type,
            beatPosition: beatPos,
          });
        }
      });
    });
    
    this.spawnQueue.sort((a, b) => a.time - b.time);
  }

  placeTower(towerType, x, y) {
    const type = TOWER_TYPES[towerType];
    if (!type) return null;
    if (this.state.gold < type.cost) return null;
    if (this.isOnPath(x, y)) return null;
    
    const tower = {
      id: ++this.towerIdCounter,
      type: towerType,
      typeData: type,
      x,
      y,
      level: 1,
      lastAttackTime: 0,
      kills: 0,
      totalDamage: 0,
      upgradeCost: Math.floor(type.cost * 0.75),
    };
    
    this.towers.push(tower);
    this.state.gold -= type.cost;
    this.notifyStateChange();
    
    return tower;
  }

  upgradeTower(towerId) {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return false;
    if (this.state.gold < tower.upgradeCost) return false;
    if (tower.level >= 3) return false;
    
    this.state.gold -= tower.upgradeCost;
    tower.level++;
    tower.typeData = {
      ...tower.typeData,
      damage: Math.floor(tower.typeData.damage * 1.5),
      range: Math.floor(tower.typeData.range * 1.1),
    };
    tower.upgradeCost = Math.floor(tower.upgradeCost * 1.5);
    
    this.addEffect(tower.x, tower.y, 'upgrade', '#FFD700');
    this.notifyStateChange();
    
    return true;
  }

  sellTower(towerId) {
    const idx = this.towers.findIndex(t => t.id === towerId);
    if (idx === -1) return false;
    
    const tower = this.towers[idx];
    const sellValue = Math.floor(tower.typeData.cost * 0.6 * tower.level);
    this.state.gold += sellValue;
    this.towers.splice(idx, 1);
    
    this.addEffect(tower.x, tower.y, 'sell', '#95E1D3');
    this.notifyStateChange();
    
    return true;
  }

  isOnPath(x, y) {
    const path = this.level.path;
    const halfWidth = CONFIG.PATH_WIDTH / 2;
    
    for (let i = 1; i < path.length; i++) {
      const p1 = path[i-1];
      const p2 = path[i];
      
      const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist < halfWidth + CONFIG.GRID_SIZE / 2) {
        return true;
      }
    }
    return false;
  }

  pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    
    if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    
    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;
    
    return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
  }

  update(deltaTime) {
    if (this.state.status !== 'playing') return;
    
    this.state.gameTime += deltaTime;
    
    this.updateBpmDetection(deltaTime);
    this.processSpawning();
    this.updateEnemies(deltaTime);
    this.updateTowers(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updateEffects(deltaTime);
    this.checkRhythmJudgments();
    this.checkWaveCompletion();
    this.checkGameOver();
  }

  updateBpmDetection(deltaTime) {
    const beatInterval = this.state.beatInterval;
    const currentTime = this.state.gameTime;
    
    if (currentTime - this.state.lastBeatTime >= beatInterval) {
      this.state.lastBeatTime = currentTime;
      this.detectSpeedDrift();
    }
    
    this.state.bpmHistory.push({
      time: currentTime,
      bpm: this.state.currentBpm,
    });
    
    if (this.state.bpmHistory.length > 100) {
      this.state.bpmHistory.shift();
    }
  }

  detectSpeedDrift() {
    const drift = Math.abs(this.state.currentBpm - this.level.targetBpm);
    
    if (drift > CONFIG.SPEED_DRIFT_THRESHOLD) {
      const driftEvent = {
        id: `drift_${Date.now()}_${Math.random()}`,
        time: this.state.gameTime,
        targetBpm: this.level.targetBpm,
        actualBpm: this.state.currentBpm,
        driftAmount: this.state.currentBpm - this.level.targetBpm,
        severity: drift > 10 ? 'high' : drift > 5 ? 'medium' : 'low',
      };
      
      this.state.speedDriftEvents.push(driftEvent);
      this.state.score += CONFIG.SCORE_MISS;
      
      if (this.callbacks.onSpeedDrift) {
        this.callbacks.onSpeedDrift(driftEvent);
      }
      
      this.addErrorLog('SPEED_DRIFT', {
        beat: this.currentBeatIndex,
        expected: this.level.targetBpm,
        actual: this.state.currentBpm,
      });
    }
  }

  adjustBpm(amount) {
    this.state.currentBpm = Math.max(40, Math.min(200, this.state.currentBpm + amount));
    this.state.beatInterval = 60000 / this.state.currentBpm;
  }

  processSpawning() {
    const currentTime = this.state.gameTime;
    
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].time <= currentTime) {
      const spawn = this.spawnQueue.shift();
      this.spawnEnemy(spawn.type, spawn.beatPosition);
    }
  }

  spawnEnemy(type, beatPosition) {
    const enemyType = ENEMY_TYPES[type];
    if (!enemyType) return;
    
    const enemy = {
      id: ++this.enemyIdCounter,
      type,
      typeData: enemyType,
      x: this.level.path[0].x,
      y: this.level.path[0].y,
      hp: enemyType.hp,
      maxHp: enemyType.hp,
      speed: enemyType.speed * CONFIG.ENEMY_BASE_SPEED,
      pathIndex: 0,
      pathProgress: 0,
      beatPosition,
      spawnTime: this.state.gameTime,
    };
    
    this.enemies.push(enemy);
    
    if (this.callbacks.onEnemySpawn) {
      this.callbacks.onEnemySpawn(enemy);
    }
  }

  updateEnemies(deltaTime) {
    const toRemove = [];
    
    this.enemies.forEach(enemy => {
      this.moveEnemy(enemy, deltaTime);
      
      if (enemy.pathIndex >= this.level.path.length - 1) {
        toRemove.push(enemy);
        this.handleEnemyReachEnd(enemy);
      }
    });
    
    toRemove.forEach(enemy => {
      const idx = this.enemies.indexOf(enemy);
      if (idx > -1) this.enemies.splice(idx, 1);
    });
  }

  moveEnemy(enemy, deltaTime) {
    const path = this.level.path;
    if (enemy.pathIndex >= path.length - 1) return;
    
    const target = path[enemy.pathIndex + 1];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const moveDistance = enemy.speed * deltaTime / 16;
    
    if (moveDistance >= dist) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / dist) * moveDistance;
      enemy.y += (dy / dist) * moveDistance;
    }
  }

  handleEnemyReachEnd(enemy) {
    this.state.lives--;
    this.state.score += CONFIG.SCORE_MISS;
    
    this.addErrorLog('MISS', {
      enemyType: enemy.type,
      beatPosition: enemy.beatPosition,
    });
    
    if (this.callbacks.onEnemyReachEnd) {
      this.callbacks.onEnemyReachEnd(enemy);
    }
  }

  updateTowers(deltaTime) {
    this.towers.forEach(tower => {
      const attackSpeed = tower.typeData.attackSpeed || CONFIG.TOWER_ATTACK_SPEED;
      
      if (this.state.gameTime - tower.lastAttackTime >= attackSpeed) {
        const target = this.findTarget(tower);
        if (target) {
          this.attackEnemy(tower, target);
          tower.lastAttackTime = this.state.gameTime;
        }
      }
    });
  }

  findTarget(tower) {
    let bestTarget = null;
    let bestProgress = -1;
    
    this.enemies.forEach(enemy => {
      const dist = Math.sqrt(
        (enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2
      );
      
      if (dist <= tower.typeData.range) {
        const canTarget = this.canTowerTarget(tower, enemy);
        const progress = enemy.pathIndex + (enemy.pathProgress || 0);
        
        if (canTarget && progress > bestProgress) {
          bestTarget = enemy;
          bestProgress = progress;
        }
      }
    });
    
    return bestTarget;
  }

  canTowerTarget(tower, enemy) {
    const pattern = tower.typeData.targetPattern;
    if (pattern.includes('all')) return true;
    
    return pattern.includes(enemy.typeData.beatType);
  }

  attackEnemy(tower, enemy) {
    let damage = tower.typeData.damage;
    
    if (tower.type === 'ACCENT' && enemy.typeData.beatType === 'accent') {
      damage *= 2;
    }
    if (tower.type === 'SYNCOPATION' && enemy.typeData.beatType === 'syncopation') {
      damage *= 1.5;
    }
    if (tower.typeData.antiDrift && enemy.typeData.causesDrift) {
      damage *= 1.3;
    }
    
    const projectile = {
      id: ++this.projectileIdCounter,
      x: tower.x,
      y: tower.y,
      targetId: enemy.id,
      damage,
      speed: 8,
      color: tower.typeData.color,
      towerType: tower.type,
    };
    
    this.projectiles.push(projectile);
    
    if (this.callbacks.onTowerAttack) {
      this.callbacks.onTowerAttack(tower, enemy, damage);
    }
  }

  updateProjectiles(deltaTime) {
    const toRemove = [];
    
    this.projectiles.forEach(proj => {
      const target = this.enemies.find(e => e.id === proj.targetId);
      
      if (!target) {
        toRemove.push(proj);
        return;
      }
      
      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10) {
        this.hitEnemy(target, proj);
        toRemove.push(proj);
      } else {
        const moveSpeed = proj.speed * deltaTime / 16;
        proj.x += (dx / dist) * moveSpeed;
        proj.y += (dy / dist) * moveSpeed;
      }
    });
    
    toRemove.forEach(proj => {
      const idx = this.projectiles.indexOf(proj);
      if (idx > -1) this.projectiles.splice(idx, 1);
    });
  }

  hitEnemy(enemy, projectile) {
    enemy.hp -= projectile.damage;
    
    const tower = this.towers.find(t => t.type === projectile.towerType);
    if (tower) {
      tower.totalDamage += projectile.damage;
    }
    
    this.addEffect(enemy.x, enemy.y, 'hit', projectile.color);
    
    if (enemy.hp <= 0) {
      this.killEnemy(enemy, tower);
    }
  }

  killEnemy(enemy, tower) {
    const idx = this.enemies.indexOf(enemy);
    if (idx > -1) this.enemies.splice(idx, 1);
    
    this.state.gold += enemy.typeData.reward;
    this.state.score += Math.floor(enemy.typeData.reward * 2);
    
    if (tower) {
      tower.kills++;
    }
    
    this.addEffect(enemy.x, enemy.y, 'death', enemy.typeData.color);
    
    this.judgeRhythm(enemy);
    
    if (this.callbacks.onEnemyDeath) {
      this.callbacks.onEnemyDeath(enemy, tower);
    }
    
    this.notifyStateChange();
  }

  judgeRhythm(enemy) {
    const currentTime = this.state.gameTime;
    const expectedBeat = this.expandedBeats.find(b => 
      !b.judged && Math.abs(b.time - currentTime) < CONFIG.MISS_WINDOW
    );
    
    if (!expectedBeat) {
      this.addRhythmJudgment('MISS', enemy, null, currentTime);
      return;
    }
    
    const timeDiff = currentTime - expectedBeat.time;
    let judgment;
    let score;
    
    if (Math.abs(timeDiff) <= CONFIG.PERFECT_WINDOW) {
      judgment = 'PERFECT';
      score = CONFIG.SCORE_PERFECT;
    } else if (Math.abs(timeDiff) <= CONFIG.GOOD_WINDOW) {
      judgment = 'GOOD';
      score = CONFIG.SCORE_GOOD;
    } else {
      judgment = timeDiff < 0 ? 'EARLY' : 'LATE';
      score = Math.floor(CONFIG.SCORE_GOOD * RHYTHM_ERROR_TYPES[judgment].penalty);
    }
    
    if (expectedBeat.type === 'accent' && judgment !== 'PERFECT') {
      this.addErrorLog('WEAK_ACCENT', {
        beat: expectedBeat.beat,
        bar: expectedBeat.bar,
        expectedStrength: expectedBeat.strength,
      });
    }
    
    expectedBeat.judged = true;
    expectedBeat.judgment = judgment;
    
    this.addRhythmJudgment(judgment, enemy, expectedBeat, currentTime);
    this.state.score += score;
    
    this.beatEvents.push({
      time: currentTime,
      beat: expectedBeat,
      judgment,
      timeDiff,
      score,
    });
  }

  checkRhythmJudgments() {
    const currentTime = this.state.gameTime;
    
    this.expandedBeats.forEach(beat => {
      if (!beat.judged && currentTime - beat.time > CONFIG.MISS_WINDOW) {
        beat.judged = true;
        beat.judgment = 'MISS';
        this.addRhythmJudgment('MISS', null, beat, currentTime);
        this.state.score += CONFIG.SCORE_MISS;
        
        this.addErrorLog('MISS', {
          beat: beat.beat,
          bar: beat.bar,
          expectedTime: beat.time,
        });
      }
    });
  }

  addRhythmJudgment(type, enemy, beat, time) {
    const judgment = {
      id: ++this.judgmentIdCounter,
      type,
      enemy: enemy ? { id: enemy.id, type: enemy.type } : null,
      beat: beat ? { ...beat } : null,
      time,
      errorType: type !== 'PERFECT' && type !== 'GOOD' ? type : null,
    };
    
    this.rhythmJudgments.push(judgment);
    
    if (this.callbacks.onRhythmJudgment) {
      this.callbacks.onRhythmJudgment(judgment);
    }
  }

  addErrorLog(type, details) {
    this.errorLogs.push({
      id: `error_${Date.now()}_${Math.random()}`,
      type,
      time: this.state.gameTime,
      details,
      ...RHYTHM_ERROR_TYPES[type],
    });
  }

  addEffect(x, y, type, color) {
    this.effects.push({
      id: ++this.effectIdCounter,
      x,
      y,
      type,
      color,
      startTime: this.state.gameTime,
      duration: 500,
    });
  }

  updateEffects(deltaTime) {
    this.effects = this.effects.filter(e => 
      this.state.gameTime - e.startTime < e.duration
    );
  }

  checkWaveCompletion() {
    if (this.state.waveInProgress && 
        this.spawnQueue.length === 0 && 
        this.enemies.length === 0) {
      this.state.waveInProgress = false;
      this.state.currentWave++;
      
      setTimeout(() => {
        if (this.state.status === 'playing') {
          this.startNextWave();
        }
      }, 2000);
    }
  }

  checkGameOver() {
    if (this.state.lives <= 0) {
      this.state.status = 'lost';
      if (this.callbacks.onGameOver) {
        this.callbacks.onGameOver(this.generateGameSummary());
      }
    }
  }

  checkWinCondition() {
    if (this.state.currentWave >= this.level.waves.length && 
        this.enemies.length === 0 && 
        this.state.lives > 0) {
      this.state.status = 'won';
      if (this.callbacks.onGameWin) {
        this.callbacks.onGameWin(this.generateGameSummary());
      }
    }
  }

  generateGameSummary() {
    const totalJudgments = this.rhythmJudgments.length;
    const perfectCount = this.rhythmJudgments.filter(j => j.type === 'PERFECT').length;
    const goodCount = this.rhythmJudgments.filter(j => j.type === 'GOOD').length;
    const missCount = this.rhythmJudgments.filter(j => j.type === 'MISS').length;
    const earlyCount = this.rhythmJudgments.filter(j => j.type === 'EARLY').length;
    const lateCount = this.rhythmJudgments.filter(j => j.type === 'LATE').length;
    
    const accentBeats = this.expandedBeats.filter(b => b.type === 'accent');
    const accentCorrect = accentBeats.filter(b => 
      b.judgment === 'PERFECT' || b.judgment === 'GOOD'
    ).length;
    const accentAccuracy = accentBeats.length > 0 
      ? Math.round((accentCorrect / accentBeats.length) * 100) 
      : 100;
    
    const syncopationBeats = this.expandedBeats.filter(b => b.type === 'syncopation');
    const syncopationCorrect = syncopationBeats.filter(b => 
      b.judgment === 'PERFECT' || b.judgment === 'GOOD'
    ).length;
    const syncopationAccuracy = syncopationBeats.length > 0 
      ? Math.round((syncopationCorrect / syncopationBeats.length) * 100) 
      : 100;
    
    const totalErrors = this.errorLogs.length;
    const speedDriftCount = this.state.speedDriftEvents.length;
    
    let grade = 'F';
    const accuracy = totalJudgments > 0 
      ? ((perfectCount + goodCount) / totalJudgments) * 100 
      : 0;
    
    if (accuracy >= 95 && speedDriftCount <= 1) grade = 'S';
    else if (accuracy >= 90 && speedDriftCount <= 2) grade = 'A';
    else if (accuracy >= 80 && speedDriftCount <= 3) grade = 'B';
    else if (accuracy >= 70) grade = 'C';
    else if (accuracy >= 60) grade = 'D';
    
    const scoreBreakdown = this.calculateScoreBreakdown();
    
    return {
      levelId: this.level.id,
      levelName: this.level.name,
      levelVersion: this.level.version,
      levelSource: this.level.source,
      gameVersion: CONFIG.VERSION,
      dataSource: CONFIG.DATA_SOURCE,
      timestamp: Date.now(),
      duration: this.state.gameTime,
      finalScore: this.state.score,
      grade,
      status: this.state.status,
      stats: {
        totalJudgments,
        perfectCount,
        goodCount,
        missCount,
        earlyCount,
        lateCount,
        accuracy: Math.round(accuracy),
        accentAccuracy,
        syncopationAccuracy,
        totalErrors,
        speedDriftCount,
        goldEarned: this.state.gold - this.level.startGold,
        livesRemaining: this.state.lives,
        wavesCompleted: this.state.currentWave,
        towersBuilt: this.towers.length,
        totalKills: this.towers.reduce((sum, t) => sum + t.kills, 0),
        totalDamage: this.towers.reduce((sum, t) => sum + t.totalDamage, 0),
      },
      scoreBreakdown,
      objectives: this.evaluateObjectives(),
      speedDriftEvents: this.state.speedDriftEvents,
      errorLogs: this.errorLogs,
      rhythmJudgments: this.rhythmJudgments,
      towerPerformance: this.towers.map(t => ({
        id: t.id,
        type: t.type,
        level: t.level,
        kills: t.kills,
        totalDamage: t.totalDamage,
      })),
      bpmHistory: this.state.bpmHistory,
    };
  }

  calculateScoreBreakdown() {
    const breakdown = [];
    let baseScore = 0;
    
    this.rhythmJudgments.forEach(j => {
      let points = 0;
      let description = '';
      
      switch (j.type) {
        case 'PERFECT':
          points = CONFIG.SCORE_PERFECT;
          description = '完美判定';
          break;
        case 'GOOD':
          points = CONFIG.SCORE_GOOD;
          description = '良好判定';
          break;
        case 'EARLY':
          points = Math.floor(CONFIG.SCORE_GOOD * RHYTHM_ERROR_TYPES.EARLY.penalty);
          description = '抢拍扣分';
          break;
        case 'LATE':
          points = Math.floor(CONFIG.SCORE_GOOD * RHYTHM_ERROR_TYPES.LATE.penalty);
          description = '拖拍扣分';
          break;
        case 'MISS':
          points = CONFIG.SCORE_MISS;
          description = '漏拍扣分';
          break;
      }
      
      baseScore += points;
      
      if (j.type !== 'PERFECT' && j.type !== 'GOOD') {
        breakdown.push({
          time: j.time,
          type: j.type,
          description,
          points,
          beat: j.beat ? `${j.beat.bar}:${j.beat.beat}` : null,
          errorType: j.errorType,
        });
      }
    });
    
    this.state.speedDriftEvents.forEach(drift => {
      breakdown.push({
        time: drift.time,
        type: 'SPEED_DRIFT',
        description: `速度漂移: 目标${drift.targetBpm}BPM, 实际${drift.actualBpm.toFixed(1)}BPM`,
        points: CONFIG.SCORE_MISS,
        severity: drift.severity,
      });
    });
    
    const enemyBonus = this.towers.reduce((sum, t) => sum + t.kills, 0) * 10;
    if (enemyBonus > 0) {
      breakdown.push({
        type: 'ENEMY_BONUS',
        description: '消灭怪物奖励',
        points: enemyBonus,
      });
    }
    
    const survivalBonus = this.state.lives * 50;
    if (survivalBonus > 0) {
      breakdown.push({
        type: 'SURVIVAL_BONUS',
        description: '剩余生命奖励',
        points: survivalBonus,
      });
    }
    
    return {
      baseScore,
      adjustments: breakdown,
      totalScore: this.state.score,
    };
  }

  evaluateObjectives() {
    return this.level.objectives.map(obj => {
      let achieved = false;
      let actual = 0;
      
      switch (obj.type) {
        case 'accent_accuracy':
          const accentBeats = this.expandedBeats.filter(b => b.type === 'accent');
          const accentCorrect = accentBeats.filter(b => 
            b.judgment === 'PERFECT' || b.judgment === 'GOOD'
          ).length;
          actual = accentBeats.length > 0 
            ? Math.round((accentCorrect / accentBeats.length) * 100) 
            : 100;
          achieved = actual >= obj.target;
          break;
        case 'syncopation_accuracy':
          const syncBeats = this.expandedBeats.filter(b => b.type === 'syncopation');
          const syncCorrect = syncBeats.filter(b => 
            b.judgment === 'PERFECT' || b.judgment === 'GOOD'
          ).length;
          actual = syncBeats.length > 0 
            ? Math.round((syncCorrect / syncBeats.length) * 100) 
            : 100;
          achieved = actual >= obj.target;
          break;
        case 'speed_stability':
          const maxDrift = this.state.speedDriftEvents.length > 0
            ? Math.max(...this.state.speedDriftEvents.map(d => Math.abs(d.driftAmount)))
            : 0;
          actual = Math.round(maxDrift);
          achieved = actual <= obj.target;
          break;
        case 'drift_count':
          actual = this.state.speedDriftEvents.length;
          achieved = actual <= obj.target;
          break;
        case 'survive':
          actual = this.level.startLives - this.state.lives;
          achieved = actual <= obj.target;
          break;
        case 'lives_remaining':
          actual = this.state.lives;
          achieved = actual >= obj.target;
          break;
        case 'fill_perfection':
          const fillBeats = this.expandedBeats.filter(b => b.type === 'fill');
          const fillCorrect = fillBeats.filter(b => 
            b.judgment === 'PERFECT' || b.judgment === 'GOOD'
          ).length;
          actual = fillBeats.length > 0 
            ? Math.round((fillCorrect / fillBeats.length) * 100) 
            : 100;
          achieved = actual >= obj.target;
          break;
      }
      
      return {
        ...obj,
        actual,
        achieved,
      };
    });
  }

  notifyStateChange() {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.getPublicState());
    }
  }

  getPublicState() {
    return {
      ...this.state,
      towers: [...this.towers],
      enemies: [...this.enemies],
      projectiles: [...this.projectiles],
      effects: [...this.effects],
      currentBeat: this.expandedBeats.find(b => 
        !b.judged && this.state.gameTime >= b.time - 100
      ),
    };
  }

  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }
}
