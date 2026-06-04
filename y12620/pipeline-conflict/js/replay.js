class ReplayManager {
  constructor(canvasEngine) {
    this.engine = canvasEngine;
    this.snapshots = [];
    this.playbackIndex = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1;
    this._playbackTimer = null;
    this.onPlaybackComplete = null;
    this.onSnapshotChange = null;
  }

  capture(actionLabel) {
    const snapshot = {
      ...this.engine.getStateSnapshot(),
      actionLabel: actionLabel || 'unknown',
      canvasDataURL: this.engine.canvas.toDataURL('image/png')
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getFullReplayData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      totalSnapshots: this.snapshots.length,
      snapshots: this.snapshots.map(s => ({
        offsetX: s.offsetX,
        offsetY: s.offsetY,
        scale: s.scale,
        flipY: s.flipY,
        activeRecordId: s.activeRecordId,
        highlightedConflictId: s.highlightedConflictId,
        actionLabel: s.actionLabel,
        timestamp: s.timestamp,
        canvasDataURL: s.canvasDataURL
      }))
    };
  }

  loadReplayData(data) {
    if (!data || !data.snapshots || !Array.isArray(data.snapshots)) {
      throw this._makeError('INVALID_REPLAY', '复盘数据格式无效', '文件不是有效的复盘记录，请确认文件来源。');
    }
    this.snapshots = data.snapshots;
    this.playbackIndex = 0;
  }

  startPlayback(speed = 1) {
    if (this.snapshots.length === 0) return;
    this.isPlaying = true;
    this.playbackSpeed = speed;
    this.playbackIndex = 0;
    this._playNext();
  }

  pausePlayback() {
    this.isPlaying = false;
    if (this._playbackTimer) {
      clearTimeout(this._playbackTimer);
      this._playbackTimer = null;
    }
  }

  resumePlayback() {
    if (!this.isPlaying && this.playbackIndex < this.snapshots.length) {
      this.isPlaying = true;
      this._playNext();
    }
  }

  stopPlayback() {
    this.isPlaying = false;
    if (this._playbackTimer) {
      clearTimeout(this._playbackTimer);
      this._playbackTimer = null;
    }
    this.playbackIndex = 0;
  }

  goToSnapshot(index) {
    if (index < 0 || index >= this.snapshots.length) return;
    this.playbackIndex = index;
    const snapshot = this.snapshots[index];
    this.engine.restoreState(snapshot);
    if (this.onSnapshotChange) {
      this.onSnapshotChange(index, snapshot);
    }
  }

  stepForward() {
    if (this.playbackIndex < this.snapshots.length - 1) {
      this.goToSnapshot(this.playbackIndex + 1);
    }
  }

  stepBackward() {
    if (this.playbackIndex > 0) {
      this.goToSnapshot(this.playbackIndex - 1);
    }
  }

  exportAsJSON() {
    const data = this.getFullReplayData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-conflict-replay-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.loadReplayData(data);
          resolve(data);
        } catch (err) {
          reject(this._makeError('PARSE_FAILED', '复盘文件解析失败', '文件内容不是合法的JSON格式，请检查文件是否损坏。'));
        }
      };
      reader.onerror = () => {
        reject(this._makeError('READ_FAILED', '文件读取失败', '浏览器无法读取该文件，请检查文件权限。'));
      };
      reader.readAsText(file);
    });
  }

  getPlaybackProgress() {
    return {
      current: this.playbackIndex,
      total: this.snapshots.length,
      isPlaying: this.isPlaying,
      speed: this.playbackSpeed
    };
  }

  _playNext() {
    if (!this.isPlaying || this.playbackIndex >= this.snapshots.length) {
      this.isPlaying = false;
      if (this.onPlaybackComplete) {
        this.onPlaybackComplete();
      }
      return;
    }
    const snapshot = this.snapshots[this.playbackIndex];
    this.engine.restoreState(snapshot);
    if (this.onSnapshotChange) {
      this.onSnapshotChange(this.playbackIndex, snapshot);
    }
    this.playbackIndex++;
    const delay = Math.max(100, 500 / this.playbackSpeed);
    this._playbackTimer = setTimeout(() => this._playNext(), delay);
  }

  _makeError(code, title, action) {
    return { code, title, action, isActionable: true };
  }
}

export default ReplayManager;
