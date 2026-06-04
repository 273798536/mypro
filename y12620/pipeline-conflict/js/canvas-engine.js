class CanvasEngine {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.flipY = false;
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.records = [];
    this.activeRecord = null;
    this.highlightedConflict = null;
    this.bgImage = null;
    this.stateHistory = [];
    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this._onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this._onMouseUp());
    this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this._onMouseUp());
  }

  _onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const prevScale = this.scale;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.scale = Math.max(0.05, Math.min(50, this.scale * factor));
    this.offsetX = mx - (mx - this.offsetX) * (this.scale / prevScale);
    this.offsetY = my - (my - this.offsetY) * (this.scale / prevScale);
    this._saveState();
    this.render();
  }

  _onMouseDown(e) {
    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  _onMouseMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.offsetX += dx;
    this.offsetY += dy;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.render();
  }

  _onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
      this._saveState();
    }
  }

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.render();
    }
  }

  screenToWorld(sx, sy) {
    let wx = (sx - this.offsetX) / this.scale;
    let wy = (sy - this.offsetY) / this.scale;
    if (this.flipY) {
      wy = this.canvas.height / this.scale - wy;
    }
    return { x: wx, y: wy };
  }

  worldToScreen(wx, wy) {
    if (this.flipY) {
      wy = this.canvas.height / this.scale - wy;
    }
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY
    };
  }

  _saveState() {
    this.stateHistory.push({
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      scale: this.scale,
      flipY: this.flipY,
      activeRecordId: this.activeRecord ? this.activeRecord.id : null,
      highlightedConflictId: this.highlightedConflict ? this.highlightedConflict.id : null,
      timestamp: Date.now()
    });
    if (this.stateHistory.length > 500) {
      this.stateHistory = this.stateHistory.slice(-500);
    }
  }

  loadRecord(record) {
    this.activeRecord = record;
    this.flipY = record.coordinateFlip || false;
    this.highlightedConflict = null;
    const w = record.source.imageWidth || 2400;
    const h = record.source.imageHeight || 1600;
    this.scale = Math.min(this.canvas.width / w, this.canvas.height / h) * 0.8;
    this.offsetX = (this.canvas.width - w * this.scale) / 2;
    this.offsetY = (this.canvas.height - h * this.scale) / 2;
    this._saveState();
    this.render();
  }

  loadBgImage(imgSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.bgImage = img;
        this.render();
        resolve(img);
      };
      img.onerror = () => reject(new Error('图片加载失败，请检查文件格式。'));
      img.src = imgSrc;
    });
  }

  highlightConflict(conflict) {
    this.highlightedConflict = conflict;
    if (conflict && conflict.location) {
      const sp = this.worldToScreen(conflict.location[0], conflict.location[1]);
      this.offsetX = this.canvas.width / 2 - sp.x + this.offsetX * 0;
      this.offsetX = this.canvas.width / 2 - conflict.location[0] * this.scale;
      this.offsetY = this.canvas.height / 2 - conflict.location[1] * this.scale;
    }
    this._saveState();
    this.render();
  }

  resetView() {
    if (this.activeRecord) {
      this.loadRecord(this.activeRecord);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    if (this.flipY) {
      ctx.translate(0, (this.activeRecord ? this.activeRecord.source.imageHeight : h / this.scale));
      ctx.scale(1, -1);
    }

    if (this.bgImage) {
      ctx.drawImage(this.bgImage, 0, 0);
    }

    if (this.activeRecord) {
      this._drawBounds(this.activeRecord);
      this._drawPipelines(this.activeRecord.pipelines);
      this._drawConflicts(this.activeRecord.conflicts);
      this._drawScaleBar(this.activeRecord);
    }

    ctx.restore();
    this._drawOverlayInfo();
  }

  _drawBounds(record) {
    const ctx = this.ctx;
    const w = record.source.imageWidth || 2400;
    const h = record.source.imageHeight || 1600;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2 / this.scale;
    ctx.strokeRect(0, 0, w, h);
  }

  _drawPipelines(pipelines) {
    const ctx = this.ctx;
    pipelines.forEach(pipe => {
      if (!pipe.points || pipe.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pipe.points[0][0], pipe.points[0][1]);
      for (let i = 1; i < pipe.points.length; i++) {
        ctx.lineTo(pipe.points[i][0], pipe.points[i][1]);
      }
      ctx.strokeStyle = pipe.color || '#fff';
      ctx.lineWidth = (pipe.width || 3) / this.scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (pipe.label) {
        const mid = pipe.points[Math.floor(pipe.points.length / 2)];
        ctx.fillStyle = '#fff';
        ctx.font = `${14 / this.scale}px sans-serif`;
        ctx.fillText(pipe.label, mid[0] + 8 / this.scale, mid[1] - 8 / this.scale);
      }
    });
  }

  _drawConflicts(conflicts) {
    const ctx = this.ctx;
    conflicts.forEach(cf => {
      if (!cf.location) return;
      const isHighlighted = this.highlightedConflict && this.highlightedConflict.id === cf.id;
      const radius = (isHighlighted ? 20 : 12) / this.scale;
      ctx.beginPath();
      ctx.arc(cf.location[0], cf.location[1], radius, 0, Math.PI * 2);
      if (cf.severity === 'critical') {
        ctx.fillStyle = isHighlighted ? 'rgba(244,67,54,0.6)' : 'rgba(244,67,54,0.3)';
        ctx.strokeStyle = '#F44336';
      } else {
        ctx.fillStyle = isHighlighted ? 'rgba(255,152,0,0.6)' : 'rgba(255,152,0,0.3)';
        ctx.strokeStyle = '#FF9800';
      }
      ctx.fill();
      ctx.lineWidth = 2 / this.scale;
      ctx.stroke();

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(cf.location[0], cf.location[1], radius + 6 / this.scale, 0, Math.PI * 2);
        ctx.strokeStyle = cf.severity === 'critical' ? '#F44336' : '#FF9800';
        ctx.lineWidth = 1.5 / this.scale;
        ctx.setLineDash([4 / this.scale, 4 / this.scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#fff';
      ctx.font = `${11 / this.scale}px sans-serif`;
      const text = cf.id + (cf.type === 'out_of_bounds' ? ' ⚠越界' : cf.type === 'proximity' ? ' ⚠近距' : '');
      ctx.fillText(text, cf.location[0] + radius + 4 / this.scale, cf.location[1] + 4 / this.scale);
    });
  }

  _drawScaleBar(record) {
    if (!record.scale || !record.scale.detected || !record.scale.valid) return;
    const ctx = this.ctx;
    const barLen = record.scale.barPixels || 120;
    const y = (record.source.imageHeight || 1600) - 60;
    const x = 60;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 / this.scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + barLen, y);
    ctx.moveTo(x, y - 6 / this.scale);
    ctx.lineTo(x, y + 6 / this.scale);
    ctx.moveTo(x + barLen, y - 6 / this.scale);
    ctx.lineTo(x + barLen, y + 6 / this.scale);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${13 / this.scale}px sans-serif`;
    ctx.fillText(`${record.scale.barRealMm}mm`, x + barLen / 2 - 20 / this.scale, y - 10 / this.scale);
  }

  _drawOverlayInfo() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, 8, 220, 56);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.fillText(`缩放: ${(this.scale * 100).toFixed(1)}%`, 16, 26);
    ctx.fillText(`偏移: (${this.offsetX.toFixed(0)}, ${this.offsetY.toFixed(0)})`, 16, 42);
    ctx.fillText(`Y轴翻转: ${this.flipY ? '是' : '否'}`, 16, 58);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.render();
  }

  getStateSnapshot() {
    return {
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      scale: this.scale,
      flipY: this.flipY,
      activeRecordId: this.activeRecord ? this.activeRecord.id : null,
      highlightedConflictId: this.highlightedConflict ? this.highlightedConflict.id : null,
      timestamp: Date.now()
    };
  }

  restoreState(state) {
    this.offsetX = state.offsetX;
    this.offsetY = state.offsetY;
    this.scale = state.scale;
    this.flipY = state.flipY;
    this.highlightedConflict = null;
    this.render();
  }
}

export default CanvasEngine;
