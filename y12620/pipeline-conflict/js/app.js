import CanvasEngine from './canvas-engine.js';
import Importer from './importer.js';
import GameFlow from './game-flow.js';
import ReplayManager from './replay.js';
import { SAMPLE_RECORDS, COLOR_RULES } from './sample-data.js';
import { showError, clearError, formatError } from './errors.js';

class App {
  constructor() {
    this.engine = null;
    this.importer = new Importer();
    this.gameFlow = new GameFlow();
    this.replayManager = null;
    this.records = [...SAMPLE_RECORDS];
    this.currentRecord = null;
  }

  init() {
    const canvas = document.getElementById('main-canvas');
    const container = document.getElementById('canvas-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    this.engine = new CanvasEngine(canvas);
    this.replayManager = new ReplayManager(this.engine);

    this.gameFlow.setRecords(this.records);
    this.gameFlow.setCallbacks({
      onStateChange: (state, record) => this._onGameStateChanged(state, record),
      onTimerUpdate: (elapsed) => this._onTimerUpdate(elapsed)
    });

    this.replayManager.onSnapshotChange = (idx, snap) => this._onReplaySnapshot(idx, snap);
    this.replayManager.onPlaybackComplete = () => this._onReplayComplete();

    this._bindUI();
    this._renderRecordList();
    this._updateGameUI();

    window.addEventListener('resize', () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.engine.render();
    });
  }

  _bindUI() {
    document.getElementById('btn-start').addEventListener('click', () => this._startGame());
    document.getElementById('btn-pause').addEventListener('click', () => this._pauseGame());
    document.getElementById('btn-resume').addEventListener('click', () => this._resumeGame());
    document.getElementById('btn-restart').addEventListener('click', () => this._restartGame());
    document.getElementById('btn-settle').addEventListener('click', () => this._settleGame());
    document.getElementById('btn-replay').addEventListener('click', () => this._startReplay());
    document.getElementById('btn-replay-stop').addEventListener('click', () => this._stopReplay());
    document.getElementById('btn-replay-export').addEventListener('click', () => this._exportReplay());
    document.getElementById('btn-reset-view').addEventListener('click', () => this.engine.resetView());
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', (e) => this._onFileImport(e));
    document.getElementById('btn-load-sample').addEventListener('click', () => this._loadSample());
    document.getElementById('btn-flip-y').addEventListener('click', () => this._toggleFlipY());

    document.getElementById('replay-import-input').addEventListener('change', (e) => this._importReplay(e));
    document.getElementById('btn-replay-import').addEventListener('click', () => document.getElementById('replay-import-input').click());
  }

  _renderRecordList() {
    const list = document.getElementById('record-list');
    list.innerHTML = '';
    this.records.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = `record-item record-${rec.reviewTag}`;
      item.innerHTML = `
        <div class="record-header">
          <span class="record-id">${rec.id}</span>
          <span class="record-badge badge-${rec.reviewTag}">${rec.statusLabel}</span>
        </div>
        <div class="record-label">${rec.label}</div>
        <div class="record-meta">${rec.source.fileName} · ${rec.conflicts.length}个冲突</div>
      `;
      item.addEventListener('click', () => this._selectRecord(idx));
      list.appendChild(item);
    });
  }

  _selectRecord(idx) {
    const record = this.records[idx];
    this.currentRecord = record;
    this.engine.loadRecord(record);
    this.replayManager.capture('select_record');
    this._renderRecordDetail(record);
    clearError(document.getElementById('error-container'));
  }

  _renderRecordDetail(record) {
    const detail = document.getElementById('record-detail');
    const reviewClass = `review-${record.reviewTag}`;
    detail.innerHTML = `
      <div class="detail-section ${reviewClass}">
        <h4>📋 记录信息</h4>
        <div class="detail-row"><span>编号</span><span>${record.id}</span></div>
        <div class="detail-row"><span>来源</span><span>${record.source.fileName}</span></div>
        <div class="detail-row"><span>尺寸</span><span>${record.source.imageWidth}×${record.source.imageHeight}</span></div>
        <div class="detail-row"><span>状态</span><span class="badge-${record.reviewTag}">${record.statusLabel}</span></div>
      </div>
      <div class="detail-section">
        <h4>📐 比例尺</h4>
        ${record.scale.valid
          ? `<div class="detail-row"><span>比例</span><span>${record.scale.ratio.toFixed(4)} ${record.scale.unit}</span></div>
             <div class="detail-row"><span>标尺</span><span>${record.scale.barRealMm}mm / ${record.scale.barPixels}px</span></div>`
          : `<div class="scale-error">❌ ${record.scale.error || '比例尺无效'}</div>`
        }
      </div>
      <div class="detail-section">
        <h4>🔧 管线</h4>
        ${record.pipelines.map(p => `
          <div class="pipeline-chip">
            <span class="pipeline-color" style="background:${p.color}"></span>
            <span>${p.label}</span>
            <span class="pipeline-type">${COLOR_RULES[p.type]?.name || p.type}</span>
          </div>
        `).join('')}
      </div>
      <div class="detail-section">
        <h4>${record.conflicts.length > 0 ? '⚠️ 冲突' : '✅ 无冲突'}</h4>
        ${record.conflicts.length > 0 ? record.conflicts.map(c => `
          <div class="conflict-item conflict-${c.severity}" data-conflict-id="${c.id}">
            <div class="conflict-header">
              <span class="conflict-id">${c.id}</span>
              <span class="conflict-severity severity-${c.severity}">${c.severity === 'critical' ? '严重' : '警告'}</span>
            </div>
            <div class="conflict-msg">${c.message}</div>
          </div>
        `).join('') : '<div class="no-conflict">未检测到冲突</div>'}
      </div>
      ${record.notes ? `<div class="detail-section"><h4>📝 备注</h4><div class="notes">${record.notes}</div></div>` : ''}
    `;

    detail.querySelectorAll('.conflict-item').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.conflictId;
        const conflict = record.conflicts.find(c => c.id === cid);
        if (conflict) {
          this.engine.highlightConflict(conflict);
          this.replayManager.capture('highlight_conflict');
        }
      });
    });
  }

  _loadSample() {
    this._selectRecord(0);
    this._renderRecordList();
  }

  _onFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const errorContainer = document.getElementById('error-container');
    this.importer.importImage(file).then(result => {
      const newRecord = {
        id: `REC-IMP-${Date.now()}`,
        label: `导入: ${result.fileName}`,
        status: 'pending',
        statusLabel: '待检查',
        reviewTag: 'review',
        source: {
          fileName: result.fileName,
          importedAt: new Date().toISOString(),
          imageWidth: result.width,
          imageHeight: result.height
        },
        scale: { detected: false, valid: false, error: '自动比例尺检测未完成，请手动设置或确认比例尺。' },
        pipelines: [],
        conflicts: [],
        coordinateFlip: false,
        notes: '通过截图导入，管线数据需手动标注或AI识别补充。'
      };

      const colorIssues = this.importer.validateColorRules(newRecord);
      if (colorIssues.length > 0) {
        showError(errorContainer, {
          code: 'MISSING_COLOR_RULE',
          title: '管线类型颜色规则不全',
          action: colorIssues.map(i => i.message).join('；'),
          isActionable: true
        });
      }

      this.engine.loadBgImage(result.dataUrl).then(() => {
        this.records.push(newRecord);
        this._renderRecordList();
        this._selectRecord(this.records.length - 1);
        this.replayManager.capture('import_image');
        clearError(errorContainer);
      });
    }).catch(err => {
      showError(errorContainer, err);
    });
    e.target.value = '';
  }

  _toggleFlipY() {
    this.engine.flipY = !this.engine.flipY;
    if (this.currentRecord) {
      this.currentRecord.coordinateFlip = this.engine.flipY;
    }
    this.replayManager.capture('toggle_flip_y');
    this.engine.render();
  }

  _startGame() {
    this.gameFlow.start();
    const record = this.gameFlow.getCurrentRecord();
    if (record) {
      this.currentRecord = record;
      this.engine.loadRecord(record);
      this.replayManager.capture('game_start');
    }
  }

  _pauseGame() {
    this.gameFlow.pause();
    this.replayManager.capture('game_pause');
  }

  _resumeGame() {
    this.gameFlow.resume();
    this.replayManager.capture('game_resume');
  }

  _restartGame() {
    this.gameFlow.restart();
    this.replayManager.snapshots = [];
    const record = this.gameFlow.getCurrentRecord();
    if (record) {
      this.currentRecord = record;
      this.engine.loadRecord(record);
      this.replayManager.capture('game_restart');
    }
  }

  _settleGame() {
    this.gameFlow.settle();
    this.replayManager.capture('game_settle');
    this._showSettlement();
  }

  _showSettlement() {
    const settlement = this.gameFlow.getSettlement();
    const panel = document.getElementById('settlement-panel');
    panel.style.display = 'flex';
    panel.innerHTML = `
      <div class="settlement-content">
        <h3>📊 结算</h3>
        <div class="settlement-grid">
          <div class="settlement-item">
            <div class="settlement-value">${settlement.conflictsFound}/${settlement.totalConflicts}</div>
            <div class="settlement-label">发现冲突</div>
          </div>
          <div class="settlement-item">
            <div class="settlement-value">${settlement.accuracy}</div>
            <div class="settlement-label">准确率</div>
          </div>
          <div class="settlement-item settlement-good">
            <div class="settlement-value">${settlement.score.correct}</div>
            <div class="settlement-label">正确标记</div>
          </div>
          <div class="settlement-item settlement-warn">
            <div class="settlement-value">${settlement.score.falseAlarm}</div>
            <div class="settlement-label">误报</div>
          </div>
          <div class="settlement-item settlement-bad">
            <div class="settlement-value">${settlement.score.missed}</div>
            <div class="settlement-label">遗漏</div>
          </div>
          <div class="settlement-item">
            <div class="settlement-value">${settlement.time}</div>
            <div class="settlement-label">用时</div>
          </div>
        </div>
        <div class="settlement-actions">
          <button id="btn-settle-replay" class="btn btn-primary">复盘</button>
          <button id="btn-settle-close" class="btn btn-secondary">关闭</button>
        </div>
      </div>
    `;
    document.getElementById('btn-settle-replay').addEventListener('click', () => {
      panel.style.display = 'none';
      this._startReplay();
    });
    document.getElementById('btn-settle-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }

  _startReplay() {
    this.gameFlow.startReplay();
    this.replayManager.startPlayback(2);
    document.getElementById('replay-controls').style.display = 'flex';
  }

  _stopReplay() {
    this.replayManager.stopPlayback();
    this.gameFlow.endReplay();
    document.getElementById('replay-controls').style.display = 'none';
  }

  _exportReplay() {
    this.replayManager.exportAsJSON();
  }

  _importReplay(e) {
    const file = e.target.files[0];
    if (!file) return;
    const errorContainer = document.getElementById('error-container');
    this.replayManager.importFromJSON(file).then(() => {
      this.gameFlow.startReplay();
      this.replayManager.startPlayback(1);
      document.getElementById('replay-controls').style.display = 'flex';
      clearError(errorContainer);
    }).catch(err => {
      showError(errorContainer, err);
    });
    e.target.value = '';
  }

  _onGameStateChanged(state, record) {
    if (record && state === 'playing') {
      this.currentRecord = record;
      this.engine.loadRecord(record);
    }
    this._updateGameUI();
  }

  _onTimerUpdate(elapsed) {
    const timerEl = document.getElementById('game-timer');
    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  _onReplaySnapshot(idx, snapshot) {
    const progress = document.getElementById('replay-progress');
    const total = this.replayManager.snapshots.length;
    progress.textContent = `${idx + 1}/${total}`;
    progress.title = snapshot.actionLabel || '';
  }

  _onReplayComplete() {
    document.getElementById('replay-controls').style.display = 'none';
    this.gameFlow.endReplay();
  }

  _updateGameUI() {
    const state = this.gameFlow.state;
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnRestart = document.getElementById('btn-restart');
    const btnSettle = document.getElementById('btn-settle');
    const btnReplay = document.getElementById('btn-replay');
    const progressEl = document.getElementById('game-progress');
    const timerEl = document.getElementById('game-timer');

    btnStart.style.display = state === 'idle' ? '' : 'none';
    btnPause.style.display = state === 'playing' ? '' : 'none';
    btnResume.style.display = state === 'paused' ? '' : 'none';
    btnRestart.style.display = (state === 'playing' || state === 'paused') ? '' : 'none';
    btnSettle.style.display = state === 'playing' ? '' : 'none';
    btnReplay.style.display = state === 'settled' ? '' : 'none';

    const prog = this.gameFlow.getProgress();
    progressEl.textContent = state === 'idle' ? '就绪' : `${prog.current}/${prog.total} · 发现${prog.conflictsFound}/${prog.totalConflicts}冲突`;

    if (state === 'idle') {
      timerEl.textContent = '00:00';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
