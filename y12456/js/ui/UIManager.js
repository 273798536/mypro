class UIManager {
  constructor(engine, renderer) {
    this.engine = engine;
    this.renderer = renderer;
    this.historyManager = historyManager;
    
    this.setupUI();
    this.setupEventListeners();
    this.setupEngineCallbacks();
  }

  setupUI() {
    this.updateHUD();
    this.renderTowerPanel();
    this.renderLevelInfo();
  }

  setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', () => {
      this.engine.start();
      this.showMessage('游戏开始！守住节拍！', 'info');
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
      if (this.engine.state.status === 'playing') {
        this.engine.pause();
        document.getElementById('pauseBtn').textContent = '继续';
        this.showMessage('游戏暂停', 'info');
      } else if (this.engine.state.status === 'paused') {
        this.engine.resume();
        document.getElementById('pauseBtn').textContent = '暂停';
        this.showMessage('游戏继续', 'info');
      }
    });
    
    document.getElementById('restartBtn').addEventListener('click', () => {
      this.restartLevel();
    });
    
    document.getElementById('bpmUp').addEventListener('click', () => {
      this.engine.adjustBpm(5);
      this.updateHUD();
    });
    
    document.getElementById('bpmDown').addEventListener('click', () => {
      this.engine.adjustBpm(-5);
      this.updateHUD();
    });
    
    document.getElementById('historyBtn').addEventListener('click', () => {
      this.showHistoryPanel();
    });
    
    document.getElementById('closeHistory').addEventListener('click', () => {
      document.getElementById('historyPanel').style.display = 'none';
    });
    
    document.getElementById('closeSettlement').addEventListener('click', () => {
      document.getElementById('settlementPanel').style.display = 'none';
    });
    
    document.getElementById('exportCSV').addEventListener('click', () => {
      this.exportHistoryCSV();
    });
    
    document.getElementById('exportScoreCard').addEventListener('click', () => {
      this.exportCurrentScoreCard();
    });
    
    document.querySelectorAll('.speed-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBpm = parseInt(e.target.dataset.bpm);
        while (this.engine.state.currentBpm < targetBpm) {
          this.engine.adjustBpm(5);
        }
        while (this.engine.state.currentBpm > targetBpm) {
          this.engine.adjustBpm(-5);
        }
        this.updateHUD();
      });
    });
    
    document.getElementById('upgradeTowerBtn').addEventListener('click', () => {
      if (this.renderer.selectedTower) {
        const success = this.engine.upgradeTower(this.renderer.selectedTower.id);
        if (success) {
          this.showMessage('塔升级成功！', 'success');
        } else {
          this.showMessage('金币不足或已满级', 'error');
        }
        this.updateTowerInfo();
        this.updateHUD();
      }
    });
    
    document.getElementById('sellTowerBtn').addEventListener('click', () => {
      if (this.renderer.selectedTower) {
        const tower = this.renderer.selectedTower;
        const success = this.engine.sellTower(tower.id);
        if (success) {
          this.renderer.selectedTower = null;
          this.hideTowerInfo();
          this.showMessage('塔已出售', 'success');
          this.updateHUD();
        }
      }
    });
  }

  setupEngineCallbacks() {
    this.engine.on('onStateChange', () => {
      this.updateHUD();
      this.updateTowerInfo();
    });
    
    this.engine.on('onRhythmJudgment', (judgment) => {
      this.renderer.showRhythmJudgment(judgment);
    });
    
    this.engine.on('onSpeedDrift', (drift) => {
      this.showMessage(
        `⚠️ 速度漂移！目标: ${drift.targetBpm} BPM, 当前: ${drift.actualBpm.toFixed(1)} BPM`,
        'warning'
      );
    });
    
    this.engine.on('onEnemyReachEnd', () => {
      this.showMessage('怪物突破防线！-1生命', 'error');
    });
    
    this.engine.on('onGameOver', (summary) => {
      this.handleGameEnd(summary);
    });
    
    this.engine.on('onGameWin', (summary) => {
      this.handleGameEnd(summary);
    });
  }

  updateHUD() {
    const state = this.engine.state;
    const level = this.engine.level;
    
    document.getElementById('score').textContent = state.score.toLocaleString();
    document.getElementById('gold').textContent = state.gold;
    document.getElementById('lives').textContent = state.lives;
    document.getElementById('currentBpm').textContent = state.currentBpm.toFixed(1);
    document.getElementById('targetBpm').textContent = level.targetBpm;
    document.getElementById('wave').textContent = `${state.currentWave} / ${level.waves.length}`;
    document.getElementById('gameTime').textContent = this.formatTime(state.gameTime);
    
    const driftCount = state.speedDriftEvents.length;
    document.getElementById('driftCount').textContent = driftCount;
    document.getElementById('driftWarning').style.display = driftCount > 0 ? 'inline' : 'none';
    
    const statusText = {
      'idle': '准备开始',
      'playing': '进行中',
      'paused': '已暂停',
      'won': '胜利！',
      'lost': '失败',
    };
    document.getElementById('gameStatus').textContent = statusText[state.status] || state.status;
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    startBtn.disabled = state.status !== 'idle';
    pauseBtn.disabled = state.status !== 'playing' && state.status !== 'paused';
  }

  renderTowerPanel() {
    const panel = document.getElementById('towerPanel');
    panel.innerHTML = '';
    
    Object.entries(TOWER_TYPES).forEach(([key, tower]) => {
      const card = document.createElement('div');
      card.className = 'tower-card';
      card.dataset.type = key;
      card.innerHTML = `
        <div class="tower-icon" style="background-color: ${tower.color}">${tower.icon}</div>
        <div class="tower-info">
          <div class="tower-name">${tower.name}</div>
          <div class="tower-cost">💰 ${tower.cost}</div>
          <div class="tower-desc">${tower.description}</div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        if (this.engine.state.gold >= tower.cost) {
          this.renderer.selectTowerType(key);
          document.querySelectorAll('.tower-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.showMessage(`选择了 ${tower.name}，点击地图放置`, 'info');
        } else {
          this.showMessage('金币不足！', 'error');
        }
      });
      
      panel.appendChild(card);
    });
  }

  renderLevelInfo() {
    const level = this.engine.level;
    const track = level.drumTrack;
    
    document.getElementById('levelName').textContent = level.name;
    document.getElementById('levelDesc').textContent = level.description;
    document.getElementById('levelVersion').textContent = `v${level.version}`;
    document.getElementById('levelSource').textContent = level.source;
    document.getElementById('trackName').textContent = track.name;
    document.getElementById('trackVersion').textContent = `v${track.version}`;
    document.getElementById('trackSource').textContent = track.source;
    document.getElementById('difficulty').textContent = '★'.repeat(level.difficulty);
    
    const objectivesEl = document.getElementById('objectives');
    objectivesEl.innerHTML = level.objectives.map(obj => `
      <div class="objective">
        <span class="objective-text">${obj.description}</span>
        <span class="objective-target">目标: ${obj.target}${obj.type.includes('accuracy') ? '%' : ''}</span>
      </div>
    `).join('');
  }

  updateTowerInfo() {
    const tower = this.renderer.selectedTower;
    const panel = document.getElementById('selectedTowerPanel');
    
    if (!tower) {
      this.hideTowerInfo();
      return;
    }
    
    panel.style.display = 'block';
    document.getElementById('selectedTowerName').textContent = tower.typeData.name;
    document.getElementById('selectedTowerLevel').textContent = `Lv.${tower.level}`;
    document.getElementById('selectedTowerDamage').textContent = tower.typeData.damage;
    document.getElementById('selectedTowerRange').textContent = tower.typeData.range;
    document.getElementById('selectedTowerKills').textContent = tower.kills;
    document.getElementById('selectedTowerDamageDealt').textContent = tower.totalDamage;
    
    const upgradeBtn = document.getElementById('upgradeTowerBtn');
    const sellBtn = document.getElementById('sellTowerBtn');
    
    if (tower.level >= 3) {
      upgradeBtn.textContent = '已满级';
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `升级 (💰${tower.upgradeCost})`;
      upgradeBtn.disabled = this.engine.state.gold < tower.upgradeCost;
    }
    
    const sellValue = Math.floor(tower.typeData.cost * 0.6 * tower.level);
    sellBtn.textContent = `出售 (💰+${sellValue})`;
  }

  hideTowerInfo() {
    document.getElementById('selectedTowerPanel').style.display = 'none';
  }

  handleGameEnd(summary) {
    this.historyManager.addGameRecord(summary);
    this.showSettlementPanel(summary);
  }

  showSettlementPanel(summary) {
    const panel = document.getElementById('settlementPanel');
    const content = document.getElementById('settlementContent');
    
    const rhythm = summary.rhythmPerformance || 
      this.historyManager.calculateRhythmPerformance(summary);
    const errors = summary.errorAnalysis || 
      this.historyManager.calculateErrorAnalysis(summary);
    const speed = summary.speedAnalysis || 
      this.historyManager.calculateSpeedAnalysis(summary);
    const recommendations = summary.recommendations || 
      this.historyManager.generateRecommendations(summary);
    
    content.innerHTML = `
      <div class="settlement-header ${summary.status === 'won' ? 'win' : 'lose'}">
        <div class="settlement-title">
          ${summary.status === 'won' ? '🎉 关卡通过！' : '💔 挑战失败'}
        </div>
        <div class="settlement-grade">评级: <span class="grade-${summary.grade}">${summary.grade}</span></div>
        <div class="settlement-score">得分: ${summary.finalScore.toLocaleString()}</div>
      </div>
      
      <div class="settlement-section">
        <h3>📊 节奏表现</h3>
        <div class="rhythm-stats">
          <div class="stat-item perfect">
            <span class="stat-label">PERFECT</span>
            <span class="stat-value">${rhythm.perfect.count}</span>
            <span class="stat-percent">${rhythm.perfect.percentage}%</span>
          </div>
          <div class="stat-item good">
            <span class="stat-label">GOOD</span>
            <span class="stat-value">${rhythm.good.count}</span>
            <span class="stat-percent">${rhythm.good.percentage}%</span>
          </div>
          <div class="stat-item early">
            <span class="stat-label">EARLY</span>
            <span class="stat-value">${rhythm.early.count}</span>
            <span class="stat-percent">${rhythm.early.percentage}%</span>
          </div>
          <div class="stat-item late">
            <span class="stat-label">LATE</span>
            <span class="stat-value">${rhythm.late.count}</span>
            <span class="stat-percent">${rhythm.late.percentage}%</span>
          </div>
          <div class="stat-item miss">
            <span class="stat-label">MISS</span>
            <span class="stat-value">${rhythm.miss.count}</span>
            <span class="stat-percent">${rhythm.miss.percentage}%</span>
          </div>
        </div>
        <div class="accuracy-row">
          <div class="accuracy-item">
            <span>总准确率</span>
            <span class="highlight">${summary.stats.accuracy}%</span>
          </div>
          <div class="accuracy-item">
            <span>重音准确率</span>
            <span class="highlight">${rhythm.accentAccuracy}</span>
          </div>
          <div class="accuracy-item">
            <span>切分准确率</span>
            <span class="highlight">${rhythm.syncopationAccuracy}</span>
          </div>
        </div>
      </div>
      
      <div class="settlement-section">
        <h3>❌ 错误分析</h3>
        ${errors.length > 0 ? `
          <div class="error-list">
            ${errors.map(err => `
              <div class="error-item" style="border-left: 4px solid ${err.color}">
                <div class="error-header">
                  <span class="error-name">${err.name}</span>
                  <span class="error-count">×${err.count}</span>
                </div>
                <div class="error-desc">${err.description}</div>
                <div class="error-time">首次出现: ${this.formatTime(err.firstOccurrence)}</div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="no-errors">表现完美，没有错误！</div>'}
      </div>
      
      <div class="settlement-section">
        <h3>⚡ 速度分析</h3>
        <div class="speed-stats">
          <div class="speed-item">
            <span>目标 BPM</span>
            <span class="highlight">${speed.targetBpm}</span>
          </div>
          <div class="speed-item">
            <span>平均 BPM</span>
            <span class="highlight">${speed.averageBpm}</span>
          </div>
          <div class="speed-item">
            <span>最高 BPM</span>
            <span>${speed.maxBpm}</span>
          </div>
          <div class="speed-item">
            <span>最低 BPM</span>
            <span>${speed.minBpm}</span>
          </div>
          <div class="speed-item">
            <span>漂移次数</span>
            <span class="${speed.driftCount > 0 ? 'warning' : 'success'}">${speed.driftCount}</span>
          </div>
          <div class="speed-item">
            <span>稳定性</span>
            <span class="highlight">${speed.stability}</span>
          </div>
        </div>
        ${speed.driftEvents.length > 0 ? `
          <div class="drift-events">
            <h4>漂移记录</h4>
            ${speed.driftEvents.map((d, i) => `
              <div class="drift-event severity-${d.severity}">
                #${i + 1} @ ${d.time}: ${d.driftAmount > 0 ? '+' : ''}${d.driftAmount} BPM (${d.severity})
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <div class="settlement-section">
        <h3>💰 得分明细</h3>
        <div class="score-breakdown">
          <div class="score-row">
            <span>基础得分</span>
            <span>${summary.scoreBreakdown.baseScore}</span>
          </div>
          ${summary.scoreBreakdown.adjustments.map(adj => `
            <div class="score-row ${adj.points < 0 ? 'negative' : 'positive'}">
              <span>${adj.description}${adj.beat ? ` (${adj.beat})` : ''}</span>
              <span>${adj.points > 0 ? '+' : ''}${adj.points}</span>
            </div>
          `).join('')}
          <div class="score-row total">
            <span>最终得分</span>
            <span>${summary.scoreBreakdown.totalScore}</span>
          </div>
        </div>
      </div>
      
      <div class="settlement-section">
        <h3>🎯 目标完成情况</h3>
        <div class="objectives-list">
          ${summary.objectives.map(obj => `
            <div class="objective-result ${obj.achieved ? 'achieved' : 'failed'}">
              <span class="objective-icon">${obj.achieved ? '✅' : '❌'}</span>
              <span class="objective-text">${obj.description}</span>
              <span class="objective-progress">${obj.actual}/${obj.target}${obj.type.includes('accuracy') ? '%' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      ${recommendations.length > 0 ? `
        <div class="settlement-section">
          <h3>💡 改进建议</h3>
          <div class="recommendations">
            ${recommendations.map(rec => `
              <div class="recommendation priority-${rec.priority}">
                <div class="rec-title">${rec.title}</div>
                <div class="rec-desc">${rec.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="settlement-section">
        <h3>📋 数据版本</h3>
        <div class="version-info">
          <div class="version-row">
            <span>关卡版本</span>
            <span>${summary.levelVersion}</span>
          </div>
          <div class="version-row">
            <span>关卡来源</span>
            <span>${summary.levelSource}</span>
          </div>
          <div class="version-row">
            <span>游戏引擎版本</span>
            <span>${summary.gameVersion}</span>
          </div>
          <div class="version-row">
            <span>数据源</span>
            <span>${summary.dataSource}</span>
          </div>
        </div>
      </div>
      
      <div class="settlement-actions">
        <button id="retryBtn" class="btn btn-primary">重新挑战</button>
        <button id="exportScoreCardBtn" class="btn btn-secondary">导出评分表</button>
        <button id="closeSettlement2" class="btn btn-outline">关闭</button>
      </div>
    `;
    
    panel.style.display = 'block';
    
    document.getElementById('retryBtn').addEventListener('click', () => {
      this.restartLevel();
      panel.style.display = 'none';
    });
    
    document.getElementById('exportScoreCardBtn').addEventListener('click', () => {
      this.exportScoreCard(summary.id);
    });
    
    document.getElementById('closeSettlement2').addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }

  showHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    const content = document.getElementById('historyContent');
    
    const records = this.historyManager.getRecords();
    
    if (records.length === 0) {
      content.innerHTML = '<div class="no-history">暂无游戏记录</div>';
    } else {
      content.innerHTML = `
        <div class="history-stats">
          <div class="history-stat">
            <span>总场次</span>
            <span class="highlight">${records.length}</span>
          </div>
          <div class="history-stat">
            <span>胜利场次</span>
            <span class="success">${records.filter(r => r.status === 'won').length}</span>
          </div>
          <div class="history-stat">
            <span>最高得分</span>
            <span class="highlight">${Math.max(...records.map(r => r.finalScore)).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="history-list">
          ${records.map((record, idx) => `
            <div class="history-item" data-id="${record.id}">
              <div class="history-main">
                <span class="history-level">${record.levelName}</span>
                <span class="history-grade grade-${record.grade}">${record.grade}</span>
                <span class="history-score">${record.finalScore.toLocaleString()}</span>
                <span class="history-accuracy">${record.stats.accuracy}%</span>
                <span class="history-date">${new Date(record.createdAt).toLocaleDateString('zh-CN')}</span>
                <button class="btn btn-small view-detail" data-id="${record.id}">查看详情</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      document.querySelectorAll('.view-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const recordId = e.target.dataset.id;
          const record = this.historyManager.getRecordById(recordId);
          if (record) {
            this.showSettlementPanel(record);
          }
        });
      });
    }
    
    panel.style.display = 'block';
  }

  exportHistoryCSV() {
    const csv = this.historyManager.exportRecords('csv');
    this.downloadFile(csv, `drum-td-history-${Date.now()}.csv`, 'text/csv');
    this.showMessage('历史记录已导出', 'success');
  }

  exportCurrentScoreCard() {
    const records = this.historyManager.getRecords();
    if (records.length > 0) {
      this.exportScoreCard(records[0].id);
    } else {
      this.showMessage('暂无记录可导出', 'error');
    }
  }

  exportScoreCard(recordId) {
    const scoreCard = this.historyManager.exportScoreCard(recordId);
    if (!scoreCard) {
      this.showMessage('记录不存在', 'error');
      return;
    }
    
    const json = JSON.stringify(scoreCard, null, 2);
    this.downloadFile(json, `score-card-${recordId}.json`, 'application/json');
    
    const text = this.formatScoreCardAsText(scoreCard);
    this.downloadFile(text, `score-card-${recordId}.txt`, 'text/plain');
    
    this.showMessage('评分表已导出（JSON + TXT）', 'success');
  }

  formatScoreCardAsText(scoreCard) {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('🎮 鼓点塔防排练室 - 评分表');
    lines.push('='.repeat(60));
    lines.push('');
    
    lines.push('【基本信息】');
    lines.push(`记录ID: ${scoreCard.header.recordId}`);
    lines.push(`日期: ${scoreCard.header.date}`);
    lines.push('');
    
    lines.push('【关卡信息】');
    lines.push(`关卡ID: ${scoreCard.levelInfo.id}`);
    lines.push(`关卡名称: ${scoreCard.levelInfo.name}`);
    lines.push(`关卡版本: ${scoreCard.levelInfo.version}`);
    lines.push(`关卡来源: ${scoreCard.levelInfo.source}`);
    lines.push(`目标BPM: ${scoreCard.levelInfo.targetBpm}`);
    lines.push(`难度: ${'★'.repeat(scoreCard.levelInfo.difficulty)}`);
    lines.push('');
    
    lines.push('【游戏信息】');
    lines.push(`引擎版本: ${scoreCard.gameInfo.engineVersion}`);
    lines.push(`数据源: ${scoreCard.gameInfo.dataSource}`);
    lines.push(`游戏时长: ${scoreCard.gameInfo.duration}`);
    lines.push(`游戏状态: ${scoreCard.gameInfo.status}`);
    lines.push('');
    
    lines.push('【综合评分】');
    lines.push(`最终得分: ${scoreCard.overallScore.score}`);
    lines.push(`评级: ${scoreCard.overallScore.grade}`);
    lines.push(`准确率: ${scoreCard.overallScore.accuracy}`);
    lines.push('');
    
    lines.push('【节奏表现】');
    const r = scoreCard.rhythmPerformance;
    lines.push(`总节拍数: ${r.totalBeats}`);
    lines.push(`  PERFECT: ${r.perfect.count} (${r.perfect.percentage}%) +${r.perfect.score}分`);
    lines.push(`  GOOD:    ${r.good.count} (${r.good.percentage}%) +${r.good.score}分`);
    lines.push(`  EARLY:   ${r.early.count} (${r.early.percentage}%) ${r.early.penalty}分`);
    lines.push(`  LATE:    ${r.late.count} (${r.late.percentage}%) ${r.late.penalty}分`);
    lines.push(`  MISS:    ${r.miss.count} (${r.miss.percentage}%) ${r.miss.penalty}分`);
    lines.push(`重音准确率: ${r.accentAccuracy}`);
    lines.push(`切分准确率: ${r.syncopationAccuracy}`);
    lines.push('');
    
    lines.push('【错误分析】');
    if (scoreCard.errorAnalysis.length > 0) {
      scoreCard.errorAnalysis.forEach(err => {
        lines.push(`- ${err.name} ×${err.count}: ${err.description}`);
      });
    } else {
      lines.push('无错误记录');
    }
    lines.push('');
    
    lines.push('【速度分析】');
    const s = scoreCard.speedAnalysis;
    lines.push(`目标BPM: ${s.targetBpm}`);
    lines.push(`平均BPM: ${s.averageBpm}`);
    lines.push(`最高/最低: ${s.maxBpm} / ${s.minBpm}`);
    lines.push(`漂移次数: ${s.driftCount}`);
    lines.push(`稳定性: ${s.stability}`);
    if (s.driftEvents.length > 0) {
      lines.push('漂移记录:');
      s.driftEvents.forEach((d, i) => {
        lines.push(`  #${i + 1} @ ${d.time}: ${d.driftAmount} BPM (${d.severity})`);
      });
    }
    lines.push('');
    
    lines.push('【得分明细】');
    scoreCard.scoreBreakdown.adjustments.forEach(adj => {
      lines.push(`  ${adj.description}: ${adj.points > 0 ? '+' : ''}${adj.points}`);
    });
    lines.push(`  总分: ${scoreCard.scoreBreakdown.totalScore}`);
    lines.push('');
    
    lines.push('【目标完成情况】');
    scoreCard.objectives.forEach(obj => {
      const status = obj.achieved ? '✅' : '❌';
      lines.push(`  ${status} ${obj.description} (${obj.actual}/${obj.target})`);
    });
    lines.push('');
    
    if (scoreCard.recommendations.length > 0) {
      lines.push('【改进建议】');
      scoreCard.recommendations.forEach(rec => {
        lines.push(`  [${rec.priority.toUpperCase()}] ${rec.title}`);
        lines.push(`     ${rec.description}`);
      });
    }
    
    lines.push('');
    lines.push('='.repeat(60));
    lines.push('评分表生成时间: ' + new Date().toLocaleString('zh-CN'));
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  restartLevel() {
    const levelId = this.engine.level.id;
    const level = getLevelById(levelId);
    
    this.renderer.stop();
    this.engine = new GameEngine(level);
    this.renderer = new GameRenderer(
      document.getElementById('gameCanvas'),
      this.engine
    );
    
    this.engine.on('onStateChange', () => this.updateHUD());
    this.engine.on('onRhythmJudgment', (j) => this.renderer.showRhythmJudgment(j));
    this.engine.on('onSpeedDrift', (d) => this.showMessage(
      `⚠️ 速度漂移！目标: ${d.targetBpm} BPM, 当前: ${d.actualBpm.toFixed(1)} BPM`,
      'warning'
    ));
    this.engine.on('onEnemyReachEnd', () => this.showMessage('怪物突破防线！-1生命', 'error'));
    this.engine.on('onGameOver', (s) => this.handleGameEnd(s));
    this.engine.on('onGameWin', (s) => this.handleGameEnd(s));
    
    document.getElementById('pauseBtn').textContent = '暂停';
    this.setupUI();
    this.renderer.start();
    
    this.showMessage('关卡已重置', 'info');
  }

  showMessage(text, type = 'info') {
    const container = document.getElementById('messageContainer');
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    msg.textContent = text;
    
    container.appendChild(msg);
    
    setTimeout(() => {
      msg.style.opacity = '0';
      msg.style.transform = 'translateY(-20px)';
      setTimeout(() => msg.remove(), 300);
    }, 3000);
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
