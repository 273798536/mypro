class HUD {
  constructor() {
    this.scoreElement = document.getElementById('score');
    this.comboElement = document.getElementById('combo');
    this.healthElement = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.bpmElement = document.getElementById('bpm');
    this.timeElement = document.getElementById('time');
    this.judgmentDisplay = document.getElementById('judgment-display');
    this.progressBar = document.getElementById('progress-bar');
  }
  
  updateScore(score) {
    if (this.scoreElement) {
      this.scoreElement.textContent = score.toLocaleString();
    }
  }
  
  updateCombo(combo, maxCombo) {
    if (this.comboElement) {
      this.comboElement.textContent = combo > 0 ? `${combo} 连击` : '';
      this.comboElement.style.opacity = combo > 0 ? '1' : '0';
      this.comboElement.style.transform = combo > 10 ? 'scale(1.2)' : 'scale(1)';
    }
  }
  
  updateHealth(health) {
    if (this.healthElement) {
      this.healthElement.style.width = `${health}%`;
      
      if (health > 60) {
        this.healthElement.className = 'health-bar good';
      } else if (health > 30) {
        this.healthElement.className = 'health-bar warning';
      } else {
        this.healthElement.className = 'health-bar danger';
      }
    }
    if (this.healthText) {
      this.healthText.textContent = `${Math.round(health)}%`;
    }
  }
  
  updateBPM(bpm) {
    if (this.bpmElement) {
      this.bpmElement.textContent = `${bpm} BPM`;
    }
  }
  
  updateTime(current, total) {
    if (this.timeElement) {
      const mins = Math.floor(current / 60);
      const secs = Math.floor(current % 60);
      this.timeElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    if (this.progressBar) {
      this.progressBar.style.width = `${(current / total) * 100}%`;
    }
  }
  
  showJudgment(judgment, timeDiff) {
    if (!this.judgmentDisplay) return;
    
    const colors = {
      'PERFECT': '#00ff88',
      'GREAT': '#00ccff',
      'GOOD': '#ffcc00',
      'MISS': '#ff4444'
    };
    
    this.judgmentDisplay.textContent = judgment;
    this.judgmentDisplay.style.color = colors[judgment] || '#fff';
    this.judgmentDisplay.style.transform = 'translate(-50%, -50%) scale(1.3)';
    this.judgmentDisplay.style.opacity = '1';
    
    setTimeout(() => {
      this.judgmentDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
      this.judgmentDisplay.style.opacity = '0';
    }, 200);
  }
}
