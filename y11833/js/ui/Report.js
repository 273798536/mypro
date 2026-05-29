class Report {
  constructor() {
    this.container = document.getElementById('report-screen');
    this.gameArea = document.getElementById('game-area');
  }
  
  show(gameReport, pendingReport) {
    if (!this.container) return;
    
    const html = this.generateHTML(gameReport, pendingReport);
    this.container.innerHTML = html;
    this.container.style.display = 'flex';
    this.gameArea.style.display = 'none';
    
    this.setupButtons();
  }
  
  generateHTML(gameReport, pendingReport) {
    const stats = gameReport.statistics;
    const errorReasons = stats.errorReasons;
    
    return `
      <div class="report-container">
        <div class="report-header">
          <h1>🔧 机器维修完成报告</h1>
          <div class="report-subtitle">${gameReport.machineHealth >= 80 ? '机器运转顺畅！' : gameReport.machineHealth >= 50 ? '机器勉强运行...' : '机器严重损坏！'}</div>
        </div>
        
        <div class="report-grid">
          <div class="report-panel">
            <h2>📊 基础统计</h2>
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-value">${gameReport.score.toLocaleString()}</div>
                <div class="stat-label">总分</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${gameReport.maxCombo}</div>
                <div class="stat-label">最高连击</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${stats.accuracy}%</div>
                <div class="stat-label">准确率</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${Math.round(gameReport.machineHealth)}%</div>
                <div class="stat-label">机器健康度</div>
              </div>
            </div>
          </div>
          
          <div class="report-panel">
            <h2>🎯 判定分布</h2>
            <div class="judgment-breakdown">
              <div class="judgment-row">
                <span class="judgment-name perfect">PERFECT</span>
                <div class="judgment-bar">
                  <div class="bar-fill perfect" style="width: ${stats.total > 0 ? (stats.perfect / stats.total * 100) : 0}%"></div>
                </div>
                <span class="judgment-count">${stats.perfect}</span>
              </div>
              <div class="judgment-row">
                <span class="judgment-name great">GREAT</span>
                <div class="judgment-bar">
                  <div class="bar-fill great" style="width: ${stats.total > 0 ? (stats.great / stats.total * 100) : 0}%"></div>
                </div>
                <span class="judgment-count">${stats.great}</span>
              </div>
              <div class="judgment-row">
                <span class="judgment-name good">GOOD</span>
                <div class="judgment-bar">
                  <div class="bar-fill good" style="width: ${stats.total > 0 ? (stats.good / stats.total * 100) : 0}%"></div>
                </div>
                <span class="judgment-count">${stats.good}</span>
              </div>
              <div class="judgment-row">
                <span class="judgment-name miss">MISS</span>
                <div class="judgment-bar">
                  <div class="bar-fill miss" style="width: ${stats.total > 0 ? (stats.miss / stats.total * 100) : 0}%"></div>
                </div>
                <span class="judgment-count">${stats.miss}</span>
              </div>
            </div>
          </div>
          
          <div class="report-panel">
            <h2>❌ 错因分析</h2>
            <div class="error-analysis">
              ${Object.entries(errorReasons).map(([reason, count]) => count > 0 ? `
                <div class="error-item">
                  <span class="error-label">${reason}</span>
                  <span class="error-count">${count} 次</span>
                </div>
              ` : '').join('')}
              ${Object.values(errorReasons).every(v => v === 0) ? '<div class="no-errors">完美！无错误记录</div>' : ''}
            </div>
          </div>
          
          <div class="report-panel">
            <h2>⚠️ 待确认区汇总</h2>
            <div class="pending-summary">
              <div class="pending-stat">
                <span>待确认总数:</span>
                <strong>${pendingReport.total}</strong>
              </div>
              <div class="pending-stat confirmed">
                <span>已确认:</span>
                <strong>${pendingReport.confirmed}</strong>
              </div>
              <div class="pending-stat rejected">
                <span>已驳回:</span>
                <strong>${pendingReport.rejected}</strong>
              </div>
              <div class="pending-stat unconfirmed">
                <span>未处理:</span>
                <strong>${pendingReport.unconfirmed}</strong>
              </div>
            </div>
          </div>
          
          ${gameReport.dirtyNotes.length > 0 ? `
            <div class="report-panel full-width">
              <h2>🗑️ 脏数据处理记录</h2>
              <div class="dirty-notes-list">
                ${gameReport.dirtyNotes.map(d => `
                  <div class="dirty-note-item">
                    <span class="dirty-index">#${d.index}</span>
                    <span class="dirty-reason">${d.reason}</span>
                    ${d.remark ? `<span class="dirty-remark">备注: ${d.remark}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="report-footer">
          <button id="btn-retry" class="btn-primary">🔄 再修一次</button>
          <button id="btn-export" class="btn-secondary">📋 导出报告</button>
        </div>
      </div>
    `;
  }
  
  setupButtons() {
    const retryBtn = document.getElementById('btn-retry');
    const exportBtn = document.getElementById('btn-export');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.hide();
        if (window.restartGame) window.restartGame();
      });
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        alert('报告已导出到控制台（F12查看）');
        console.log('游戏报告:', window.lastGameReport);
        console.log('待确认报告:', window.lastPendingReport);
      });
    }
  }
  
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    if (this.gameArea) {
      this.gameArea.style.display = 'block';
    }
  }
}
