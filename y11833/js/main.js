class RhythmMechanic {
  constructor() {
    this.gameEngine = null;
    this.hud = null;
    this.pendingArea = null;
    this.report = null;
    this.trackElements = [];
    this.notePool = [];
    this.audioContext = null;
    
    this.init();
  }
  
  init() {
    this.hud = new HUD();
    this.pendingArea = new PendingArea();
    this.report = new Report();
    this.setupTracks();
    this.setupInputs();
    this.setupStartScreen();
  }
  
  setupTracks() {
    this.trackElements = [
      document.getElementById('track-0'),
      document.getElementById('track-1'),
      document.getElementById('track-2'),
      document.getElementById('track-3')
    ];
  }
  
  setupInputs() {
    document.addEventListener('keydown', (e) => {
      if (this.gameEngine && this.gameEngine.state === 'playing') {
        const keyMap = { 'd': 0, 'f': 1, 'j': 2, 'k': 3 };
        if (keyMap.hasOwnProperty(e.key.toLowerCase())) {
          e.preventDefault();
          this.handleInput(keyMap[e.key.toLowerCase()]);
        }
      }
    });
    
    this.trackElements.forEach((track, index) => {
      track.addEventListener('click', () => {
        if (this.gameEngine && this.gameEngine.state === 'playing') {
          this.handleInput(index);
        }
      });
    });
  }
  
  setupStartScreen() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }
  }
  
  handleInput(trackIndex) {
    this.playSound();
    this.flashTrack(trackIndex);
    this.gameEngine.handleInput(trackIndex);
  }
  
  flashTrack(trackIndex) {
    const track = this.trackElements[trackIndex];
    if (track) {
      track.classList.add('hit-flash');
      setTimeout(() => track.classList.remove('hit-flash'), 100);
    }
  }
  
  startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    
    this.gameEngine = new GameEngine(sampleBeatData);
    this.pendingArea.clear();
    this.clearNotes();
    
    this.gameEngine.onNoteSpawn = (note) => this.spawnNote(note);
    this.gameEngine.onNoteHit = (result) => this.onNoteHit(result);
    this.gameEngine.onNoteMiss = (result) => this.onNoteMiss(result);
    this.gameEngine.onComboChange = (combo, max) => this.hud.updateCombo(combo, max);
    this.gameEngine.onHealthChange = (health) => this.hud.updateHealth(health);
    this.gameEngine.onPendingItem = (item) => this.pendingArea.addItem(item);
    this.gameEngine.onUpdate = (time, bpm) => this.onUpdate(time, bpm);
    this.gameEngine.onGameEnd = (report) => this.onGameEnd(report);
    
    this.gameEngine.start();
  }
  
  spawnNote(note) {
    const track = this.trackElements[note.track];
    if (!track) return;
    
    const noteEl = document.createElement('div');
    noteEl.className = `note note-${note.type}`;
    noteEl.dataset.noteId = note.id;
    noteEl.style.top = '-60px';
    
    if (note.type === 'syncopated') {
      noteEl.innerHTML = '<span class="sync-indicator">切</span>';
    }
    if (note.inSpeedChangeZone) {
      noteEl.classList.add('speed-zone');
    }
    if (note.comboCritical) {
      noteEl.classList.add('combo-critical');
    }
    if (note.remark) {
      noteEl.title = note.remark;
    }
    
    track.appendChild(noteEl);
    this.notePool.push({ element: noteEl, note });
  }
  
  onUpdate(time, bpm) {
    this.hud.updateScore(this.gameEngine.score);
    this.hud.updateBPM(bpm);
    this.hud.updateTime(time, 25);
    this.updateNotePositions(time);
  }
  
  updateNotePositions(currentTime) {
    const travelTime = 2;
    const judgeLineY = 80;
    
    this.notePool.forEach(({ element, note }) => {
      if (note.hit || note.missed) return;
      
      const timeUntilHit = note.time - currentTime;
      const progress = 1 - (timeUntilHit / travelTime);
      const yPos = progress * judgeLineY;
      
      element.style.top = `${yPos}%`;
      
      if (progress > 1.2) {
        element.style.opacity = '0';
      }
    });
  }
  
  onNoteHit(result) {
    this.hud.showJudgment(result.judgment, result.timeDiff);
    
    const noteObj = this.notePool.find(n => n.note.id === result.note.id);
    if (noteObj) {
      noteObj.element.classList.add(`hit-${result.judgment.toLowerCase()}`);
      setTimeout(() => {
        noteObj.element.remove();
        this.notePool = this.notePool.filter(n => n.note.id !== result.note.id);
      }, 200);
    }
    
    this.playMachineEffect(result.judgment);
  }
  
  onNoteMiss(result) {
    this.hud.showJudgment('MISS', null);
    
    const noteObj = this.notePool.find(n => n.note.id === result.note.id);
    if (noteObj) {
      noteObj.element.classList.add('hit-miss');
      setTimeout(() => {
        noteObj.element.remove();
        this.notePool = this.notePool.filter(n => n.note.id !== result.note.id);
      }, 300);
    }
    
    this.spawnSparks();
  }
  
  playMachineEffect(judgment) {
    const machine = document.querySelector('.machine-bg');
    if (judgment === 'PERFECT') {
      machine.classList.add('machine-success');
      setTimeout(() => machine.classList.remove('machine-success'), 300);
    } else if (judgment === 'MISS') {
      machine.classList.add('machine-fail');
      setTimeout(() => machine.classList.remove('machine-fail'), 300);
    }
  }
  
  spawnSparks() {
    for (let i = 0; i < 5; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = `${30 + Math.random() * 40}%`;
      spark.style.top = `${70 + Math.random() * 10}%`;
      document.getElementById('game-area').appendChild(spark);
      setTimeout(() => spark.remove(), 500);
    }
  }
  
  playSound() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 440;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }
  
  onGameEnd(gameReport) {
    const pendingReport = this.pendingArea.getFinalReport();
    window.lastGameReport = gameReport;
    window.lastPendingReport = pendingReport;
    this.report.show(gameReport, pendingReport);
  }
  
  clearNotes() {
    this.notePool.forEach(({ element }) => element.remove());
    this.notePool = [];
    this.trackElements.forEach(track => {
      const notes = track.querySelectorAll('.note');
      notes.forEach(n => n.remove());
    });
  }
}

window.restartGame = function() {
  if (window.rhythmGame) {
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('report-screen').style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.rhythmGame = new RhythmMechanic();
});
