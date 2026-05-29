class GameEngine {
  constructor(beatData) {
    this.state = 'idle';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.machineHealth = 100;
    this.currentBPM = beatData.bpm || 120;
    this.startTime = 0;
    this.currentTime = 0;
    this.duration = 25;
    
    this.noteManager = new NoteManager(beatData.notes, beatData.speedCurve);
    this.judge = new Judge();
    
    this.onNoteSpawn = null;
    this.onNoteHit = null;
    this.onNoteMiss = null;
    this.onComboChange = null;
    this.onHealthChange = null;
    this.onPendingItem = null;
    this.onUpdate = null;
    this.onGameEnd = null;
    
    this.animationId = null;
  }
  
  start() {
    this.state = 'playing';
    this.startTime = performance.now();
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.machineHealth = 100;
    this.judge.reset();
    this.noteManager.activeNotes = [];
    this.gameLoop();
  }
  
  gameLoop() {
    if (this.state !== 'playing') return;
    
    const elapsed = (performance.now() - this.startTime) / 1000;
    this.currentTime = elapsed;
    
    this.currentBPM = this.noteManager.getCurrentBPM(elapsed);
    
    const notesToSpawn = this.noteManager.getNotesToSpawn(elapsed, 2);
    notesToSpawn.forEach(note => {
      this.noteManager.spawnNote(note);
      if (this.onNoteSpawn) this.onNoteSpawn(note);
    });
    
    const missedNotes = this.noteManager.markMissed(elapsed);
    missedNotes.forEach(note => {
      const result = this.judge.miss(note);
      this.handleMiss(result);
    });
    
    if (this.onUpdate) this.onUpdate(elapsed, this.currentBPM);
    
    if (elapsed >= this.duration) {
      this.finish();
      return;
    }
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }
  
  handleInput(trackIndex) {
    if (this.state !== 'playing') return;
    
    const note = this.noteManager.getNoteAtTrack(trackIndex, this.currentTime);
    
    if (note) {
      note.hit = true;
      const result = this.judge.judge(note, this.currentTime);
      this.handleHit(result);
    } else {
      this.handleEmptyHit();
    }
  }
  
  handleHit(result) {
    this.score += result.score;
    
    if (result.judgment !== 'MISS') {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      
      const healthGain = result.judgment === 'PERFECT' ? 2 : 
                         result.judgment === 'GREAT' ? 1 : 0.5;
      this.machineHealth = Math.min(100, this.machineHealth + healthGain);
    } else {
      this.combo = 0;
      this.machineHealth = Math.max(0, this.machineHealth - 5);
    }
    
    if (this.onNoteHit) this.onNoteHit(result);
    if (this.onComboChange) this.onComboChange(this.combo, this.maxCombo);
    if (this.onHealthChange) this.onHealthChange(this.machineHealth);
    
    if (result.isPending && this.onPendingItem) {
      this.onPendingItem(this.judge.pendingJudgments[this.judge.pendingJudgments.length - 1]);
    }
  }
  
  handleMiss(result) {
    this.combo = 0;
    this.machineHealth = Math.max(0, this.machineHealth - 8);
    
    if (this.onNoteMiss) this.onNoteMiss(result);
    if (this.onComboChange) this.onComboChange(this.combo, this.maxCombo);
    if (this.onHealthChange) this.onHealthChange(this.machineHealth);
    
    if (result.isPending && this.onPendingItem) {
      this.onPendingItem(this.judge.pendingJudgments[this.judge.pendingJudgments.length - 1]);
    }
  }
  
  handleEmptyHit() {
    this.combo = 0;
    this.machineHealth = Math.max(0, this.machineHealth - 2);
    if (this.onComboChange) this.onComboChange(this.combo, this.maxCombo);
    if (this.onHealthChange) this.onHealthChange(this.machineHealth);
  }
  
  pause() {
    this.state = 'paused';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.startTime = performance.now() - this.currentTime * 1000;
      this.gameLoop();
    }
  }
  
  finish() {
    this.state = 'finished';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const report = this.generateReport();
    if (this.onGameEnd) this.onGameEnd(report);
  }
  
  generateReport() {
    const stats = this.judge.getStatistics();
    const pendingList = this.judge.getPendingList();
    const dirtyReport = this.noteManager.getDirtyNotesReport();
    
    return {
      score: this.score,
      maxCombo: this.maxCombo,
      machineHealth: this.machineHealth,
      finalBPM: this.currentBPM,
      statistics: stats,
      pendingJudgments: pendingList,
      dirtyNotes: dirtyReport,
      totalNotes: this.noteManager.getTotalNotes()
    };
  }
  
  getPendingCount() {
    return this.judge.pendingJudgments.length;
  }
  
  confirmPending(index, confirmed) {
    this.judge.confirmJudgment(index, confirmed);
  }
}
