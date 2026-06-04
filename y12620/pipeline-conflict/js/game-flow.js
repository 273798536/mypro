class GameFlow {
  constructor() {
    this.STATES = {
      IDLE: 'idle',
      PLAYING: 'playing',
      PAUSED: 'paused',
      SETTLED: 'settled',
      REPLAYING: 'replaying'
    };
    this.state = this.STATES.IDLE;
    this.currentRecordIndex = -1;
    this.records = [];
    this.startTime = null;
    this.elapsedMs = 0;
    this.score = { correct: 0, missed: 0, falseAlarm: 0 };
    this.conflictsFound = new Set();
    this.totalConflicts = 0;
    this.onStateChange = null;
    this.onTimerUpdate = null;
    this._timerInterval = null;
  }

  setRecords(records) {
    this.records = records;
    this.reset();
  }

  setCallbacks({ onStateChange, onTimerUpdate }) {
    this.onStateChange = onStateChange;
    this.onTimerUpdate = onTimerUpdate;
  }

  start() {
    if (this.records.length === 0) return;
    this.state = this.STATES.PLAYING;
    this.currentRecordIndex = 0;
    this.startTime = Date.now();
    this.elapsedMs = 0;
    this.score = { correct: 0, missed: 0, falseAlarm: 0 };
    this.conflictsFound = new Set();
    this.totalConflicts = this._countAllConflicts();
    this._startTimer();
    this._notify();
  }

  pause() {
    if (this.state !== this.STATES.PLAYING) return;
    this.state = this.STATES.PAUSED;
    this.elapsedMs += Date.now() - this.startTime;
    this._stopTimer();
    this._notify();
  }

  resume() {
    if (this.state !== this.STATES.PAUSED) return;
    this.state = this.STATES.PLAYING;
    this.startTime = Date.now();
    this._startTimer();
    this._notify();
  }

  restart() {
    this.reset();
    this.start();
  }

  markConflict(conflictId) {
    if (this.state !== this.STATES.PLAYING) return null;
    const record = this.records[this.currentRecordIndex];
    if (!record) return null;
    const conflict = record.conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      this.score.falseAlarm++;
      return { result: 'false_alarm', message: '这不是一个真实冲突点。' };
    }
    if (this.conflictsFound.has(conflictId)) {
      return { result: 'already_found', message: '此冲突已标记过。' };
    }
    this.conflictsFound.add(conflictId);
    this.score.correct++;
    return { result: 'correct', message: `找到冲突：${conflict.message}`, conflict };
  }

  nextRecord() {
    if (this.state !== this.STATES.PLAYING) return;
    if (this.currentRecordIndex < this.records.length - 1) {
      this.currentRecordIndex++;
      this._notify();
    } else {
      this.settle();
    }
  }

  settle() {
    this.state = this.STATES.SETTLED;
    this.elapsedMs += Date.now() - this.startTime;
    this._stopTimer();
    this.score.missed = this.totalConflicts - this.conflictsFound.size;
    this._notify();
  }

  startReplay() {
    if (this.state !== this.STATES.SETTLED) return;
    this.state = this.STATES.REPLAYING;
    this._notify();
  }

  endReplay() {
    this.state = this.STATES.IDLE;
    this._notify();
  }

  reset() {
    this.state = this.STATES.IDLE;
    this.currentRecordIndex = -1;
    this.startTime = null;
    this.elapsedMs = 0;
    this.score = { correct: 0, missed: 0, falseAlarm: 0 };
    this.conflictsFound = new Set();
    this._stopTimer();
    this._notify();
  }

  getCurrentRecord() {
    if (this.currentRecordIndex >= 0 && this.currentRecordIndex < this.records.length) {
      return this.records[this.currentRecordIndex];
    }
    return null;
  }

  getProgress() {
    return {
      current: this.currentRecordIndex + 1,
      total: this.records.length,
      conflictsFound: this.conflictsFound.size,
      totalConflicts: this.totalConflicts
    };
  }

  getSettlement() {
    const total = this.score.correct + this.score.missed + this.score.falseAlarm;
    const accuracy = total > 0 ? (this.score.correct / total * 100).toFixed(1) : '0.0';
    const timeSeconds = (this.elapsedMs / 1000).toFixed(1);
    return {
      score: { ...this.score },
      accuracy: `${accuracy}%`,
      time: `${timeSeconds}s`,
      conflictsFound: this.conflictsFound.size,
      totalConflicts: this.totalConflicts,
      recordsReviewed: this.currentRecordIndex + 1
    };
  }

  _countAllConflicts() {
    return this.records.reduce((sum, r) => sum + (r.conflicts ? r.conflicts.length : 0), 0);
  }

  _startTimer() {
    this._stopTimer();
    this._timerInterval = setInterval(() => {
      const elapsed = this.elapsedMs + (Date.now() - this.startTime);
      if (this.onTimerUpdate) {
        this.onTimerUpdate(elapsed);
      }
    }, 100);
  }

  _stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  _notify() {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.getCurrentRecord());
    }
  }
}

export default GameFlow;
