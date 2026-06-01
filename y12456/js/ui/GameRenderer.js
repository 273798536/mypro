class GameRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.animationId = null;
    this.lastTime = 0;
    
    this.selectedTowerType = null;
    this.selectedTower = null;
    this.hoverPosition = null;
    
    this.judgmentPopups = [];
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.cancelSelection();
    });
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (this.selectedTowerType) {
      this.tryPlaceTower(x, y);
    } else {
      this.selectTowerAt(x, y);
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.hoverPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  selectTowerType(type) {
    this.selectedTowerType = type;
    this.selectedTower = null;
  }

  cancelSelection() {
    this.selectedTowerType = null;
    this.selectedTower = null;
  }

  tryPlaceTower(x, y) {
    const gridX = Math.floor(x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
    const gridY = Math.floor(y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
    
    const tower = this.engine.placeTower(this.selectedTowerType, gridX, gridY);
    if (tower) {
      this.addJudgmentPopup(gridX, gridY - 30, '建造成功!', '#4ECDC4');
    }
  }

  selectTowerAt(x, y) {
    const tower = this.engine.towers.find(t => {
      const dist = Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2);
      return dist < CONFIG.GRID_SIZE / 2;
    });
    
    this.selectedTower = tower || null;
  }

  start() {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  gameLoop() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.engine.update(deltaTime);
    this.render();
    this.updateJudgmentPopups(deltaTime);
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawBackground();
    this.drawPath();
    this.drawGrid();
    this.drawRangeIndicator();
    this.drawTowers();
    this.drawEnemies();
    this.drawProjectiles();
    this.drawEffects();
    this.drawPlacementPreview();
    this.drawJudgmentPopups();
    this.drawBeatIndicator();
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.canvas.width;
      const y = (i * 89.3) % this.canvas.height;
      const r = 2 + (i % 3);
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.canvas.width; x += CONFIG.GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvas.height; y += CONFIG.GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawPath() {
    const path = this.engine.level.path;
    
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = CONFIG.PATH_WIDTH + 10;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(path[i].x, path[i].y);
    }
    this.ctx.stroke();
    
    const pathGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    pathGradient.addColorStop(0, '#2d3436');
    pathGradient.addColorStop(0.5, '#636e72');
    pathGradient.addColorStop(1, '#2d3436');
    
    this.ctx.strokeStyle = pathGradient;
    this.ctx.lineWidth = CONFIG.PATH_WIDTH;
    
    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(path[i].x, path[i].y);
    }
    this.ctx.stroke();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(path[i].x, path[i].y);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    this.drawPathMarker(path[0], 'START', '#00b894');
    this.drawPathMarker(path[path.length - 1], 'END', '#d63031');
  }

  drawPathMarker(point, label, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, point.x, point.y);
  }

  drawRangeIndicator() {
    if (this.selectedTower) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.lineWidth = 2;
      
      this.ctx.beginPath();
      this.ctx.arc(this.selectedTower.x, this.selectedTower.y, this.selectedTower.typeData.range, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  drawTowers() {
    this.engine.towers.forEach(tower => {
      const isSelected = this.selectedTower && this.selectedTower.id === tower.id;
      this.drawTower(tower, isSelected);
    });
  }

  drawTower(tower, isSelected) {
    const size = CONFIG.GRID_SIZE * 0.8;
    
    if (isSelected) {
      this.ctx.shadowColor = tower.typeData.color;
      this.ctx.shadowBlur = 20;
    }
    
    this.ctx.fillStyle = '#2d3436';
    this.ctx.beginPath();
    this.ctx.roundRect(tower.x - size/2 - 4, tower.y - size/2 - 4, size + 8, size + 8, 8);
    this.ctx.fill();
    
    const gradient = this.ctx.createRadialGradient(
      tower.x - 10, tower.y - 10, 0,
      tower.x, tower.y, size
    );
    gradient.addColorStop(0, tower.typeData.color);
    gradient.addColorStop(1, this.darkenColor(tower.typeData.color, 30));
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(tower.x - size/2, tower.y - size/2, size, size, 6);
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
    
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(tower.typeData.icon, tower.x, tower.y);
    
    if (tower.level > 1) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 10px Arial';
      for (let i = 0; i < tower.level; i++) {
        this.ctx.fillText('★', tower.x - 15 + i * 15, tower.y + size/2 - 8);
      }
    }
    
    if (isSelected) {
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.roundRect(tower.x - size/2 - 6, tower.y - size/2 - 6, size + 12, size + 12, 8);
      this.ctx.stroke();
    }
  }

  drawEnemies() {
    this.engine.enemies.forEach(enemy => {
      this.drawEnemy(enemy);
    });
  }

  drawEnemy(enemy) {
    const size = 25 + (enemy.hp / enemy.maxHp) * 10;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(enemy.x, enemy.y + size/2 + 5, size/2, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    const gradient = this.ctx.createRadialGradient(
      enemy.x - 5, enemy.y - 5, 0,
      enemy.x, enemy.y, size
    );
    gradient.addColorStop(0, enemy.typeData.color);
    gradient.addColorStop(1, this.darkenColor(enemy.typeData.color, 40));
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(enemy.x, enemy.y, size/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(enemy.x - 6, enemy.y - 3, 4, 0, Math.PI * 2);
    this.ctx.arc(enemy.x + 6, enemy.y - 3, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(enemy.x - 5, enemy.y - 3, 2, 0, Math.PI * 2);
    this.ctx.arc(enemy.x + 7, enemy.y - 3, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    const hpBarWidth = 40;
    const hpBarHeight = 6;
    const hpPercent = enemy.hp / enemy.maxHp;
    
    this.ctx.fillStyle = '#2d3436';
    this.ctx.fillRect(enemy.x - hpBarWidth/2, enemy.y - size/2 - 15, hpBarWidth, hpBarHeight);
    
    const hpColor = hpPercent > 0.6 ? '#00b894' : hpPercent > 0.3 ? '#fdcb6e' : '#d63031';
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(enemy.x - hpBarWidth/2, enemy.y - size/2 - 15, hpBarWidth * hpPercent, hpBarHeight);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.ceil(enemy.hp)}`, enemy.x, enemy.y - size/2 - 18);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = 'bold 9px Arial';
    this.ctx.fillText(this.getBeatLabel(enemy.beatPosition), enemy.x, enemy.y + size/2 + 15);
  }

  getBeatLabel(beatPos) {
    if (beatPos % 1 === 0) return `${beatPos}`;
    if (beatPos % 0.5 === 0) return `${Math.floor(beatPos)}&`;
    if (beatPos % 0.33 < 0.1) return `${Math.floor(beatPos)}e`;
    if (beatPos % 0.66 < 0.1) return `${Math.floor(beatPos)}a`;
    return `${beatPos}`;
  }

  drawProjectiles() {
    this.engine.projectiles.forEach(proj => {
      this.ctx.fillStyle = proj.color;
      this.ctx.shadowColor = proj.color;
      this.ctx.shadowBlur = 10;
      
      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.shadowBlur = 0;
      
      this.ctx.strokeStyle = proj.color;
      this.ctx.lineWidth = 3;
      this.ctx.globalAlpha = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(proj.x, proj.y);
      const target = this.engine.enemies.find(e => e.id === proj.targetId);
      if (target) {
        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.ctx.lineTo(proj.x - (dx / dist) * 15, proj.y - (dy / dist) * 15);
      }
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    });
  }

  drawEffects() {
    this.engine.effects.forEach(effect => {
      const progress = (this.engine.state.gameTime - effect.startTime) / effect.duration;
      const alpha = 1 - progress;
      const scale = 1 + progress;
      
      this.ctx.globalAlpha = alpha;
      
      switch (effect.type) {
        case 'hit':
          this.ctx.strokeStyle = effect.color;
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(effect.x, effect.y, 15 * scale, 0, Math.PI * 2);
          this.ctx.stroke();
          break;
          
        case 'death':
          this.ctx.fillStyle = effect.color;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 20 * scale;
            const px = effect.x + Math.cos(angle) * dist;
            const py = effect.y + Math.sin(angle) * dist;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4 * (1 - progress), 0, Math.PI * 2);
            this.ctx.fill();
          }
          break;
          
        case 'upgrade':
          this.ctx.strokeStyle = effect.color;
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(effect.x, effect.y, 30 * scale, 0, Math.PI * 2);
          this.ctx.stroke();
          
          this.ctx.fillStyle = effect.color;
          this.ctx.font = 'bold 20px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('⬆', effect.x, effect.y - 30 * scale);
          break;
          
        case 'sell':
          this.ctx.fillStyle = effect.color;
          this.ctx.font = 'bold 16px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('+$', effect.x, effect.y - 20 * scale);
          break;
      }
      
      this.ctx.globalAlpha = 1;
    });
  }

  drawPlacementPreview() {
    if (!this.selectedTowerType || !this.hoverPosition) return;
    
    const type = TOWER_TYPES[this.selectedTowerType];
    const x = Math.floor(this.hoverPosition.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
    const y = Math.floor(this.hoverPosition.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
    
    const canPlace = !this.engine.isOnPath(x, y) && 
                     this.engine.state.gold >= type.cost &&
                     !this.engine.towers.some(t => Math.abs(t.x - x) < 10 && Math.abs(t.y - y) < 10);
    
    this.ctx.fillStyle = canPlace ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)';
    this.ctx.strokeStyle = canPlace ? 'rgba(0, 184, 148, 0.5)' : 'rgba(214, 48, 49, 0.5)';
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, type.range, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    const size = CONFIG.GRID_SIZE * 0.8;
    this.ctx.globalAlpha = 0.6;
    
    this.ctx.fillStyle = canPlace ? type.color : '#d63031';
    this.ctx.beginPath();
    this.ctx.roundRect(x - size/2, y - size/2, size, size, 6);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(type.icon, x, y);
    
    this.ctx.globalAlpha = 1;
    
    this.ctx.fillStyle = canPlace ? '#00b894' : '#d63031';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillText(`$${type.cost}`, x, y + size/2 + 20);
  }

  drawJudgmentPopups() {
    this.judgmentPopups.forEach(popup => {
      this.ctx.globalAlpha = popup.alpha;
      this.ctx.fillStyle = popup.color;
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(popup.text, popup.x, popup.y);
      this.ctx.globalAlpha = 1;
    });
  }

  drawBeatIndicator() {
    const state = this.engine.getPublicState();
    if (!state.currentBeat) return;
    
    const beat = state.currentBeat;
    const barWidth = 200;
    const barHeight = 20;
    const x = this.canvas.width / 2 - barWidth / 2;
    const y = 10;
    
    const progress = Math.min(1, (state.gameTime - beat.time + 100) / 200);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x, y, barWidth, barHeight);
    
    const beatColor = beat.type === 'accent' ? '#FF6B6B' : 
                      beat.type === 'syncopation' ? '#4ECDC4' : 
                      beat.type === 'fill' ? '#DDA0DD' : '#95E1D3';
    
    this.ctx.fillStyle = beatColor;
    this.ctx.fillRect(x, y, barWidth * progress, barHeight);
    
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, barWidth, barHeight);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${beat.bar}:${beat.beat} ${beat.type.toUpperCase()}`, this.canvas.width / 2, y + barHeight + 18);
  }

  addJudgmentPopup(x, y, text, color) {
    this.judgmentPopups.push({
      x, y, text, color,
      alpha: 1,
      vy: -2,
    });
  }

  updateJudgmentPopups(deltaTime) {
    this.judgmentPopups = this.judgmentPopups.filter(popup => {
      popup.y += popup.vy * deltaTime / 16;
      popup.alpha -= 0.02 * deltaTime / 16;
      return popup.alpha > 0;
    });
  }

  showRhythmJudgment(judgment) {
    let text = '';
    let color = '';
    
    switch (judgment.type) {
      case 'PERFECT':
        text = 'PERFECT!';
        color = '#00b894';
        break;
      case 'GOOD':
        text = 'GOOD';
        color = '#fdcb6e';
        break;
      case 'EARLY':
        text = 'EARLY!';
        color = '#e17055';
        break;
      case 'LATE':
        text = 'LATE!';
        color = '#e84393';
        break;
      case 'MISS':
        text = 'MISS';
        color = '#d63031';
        break;
    }
    
    if (judgment.beat) {
      const beat = this.engine.expandedBeats.find(b => b.id === judgment.beat.id);
      if (beat) {
        const pathIndex = Math.min(
          this.engine.level.path.length - 1,
          Math.floor((beat.time / this.engine.state.gameTime) * this.engine.level.path.length)
        );
        const point = this.engine.level.path[pathIndex];
        this.addJudgmentPopup(point.x, point.y - 50, text, color);
      }
    } else if (judgment.enemy) {
      const enemy = this.engine.enemies.find(e => e.id === judgment.enemy.id);
      if (enemy) {
        this.addJudgmentPopup(enemy.x, enemy.y - 50, text, color);
      }
    }
  }

  darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
