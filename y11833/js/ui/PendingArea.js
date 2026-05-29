class PendingArea {
  constructor() {
    this.container = document.getElementById('pending-area');
    this.toggleButton = document.getElementById('pending-toggle');
    this.listContainer = document.getElementById('pending-list');
    this.countBadge = document.getElementById('pending-count');
    this.items = [];
    this.isExpanded = false;
    
    this.setupToggle();
  }
  
  setupToggle() {
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        this.container.classList.toggle('expanded', this.isExpanded);
      });
    }
  }
  
  addItem(item) {
    this.items.push({
      ...item,
      displayId: Date.now() + Math.random()
    });
    this.updateCount();
    this.render();
  }
  
  updateCount() {
    if (this.countBadge) {
      const unconfirmed = this.items.filter(i => i.userConfirmed === null).length;
      this.countBadge.textContent = unconfirmed;
      this.countBadge.style.display = unconfirmed > 0 ? 'flex' : 'none';
    }
  }
  
  render() {
    if (!this.listContainer) return;
    
    this.listContainer.innerHTML = '';
    
    this.items.forEach((item, index) => {
      const element = this.createItemElement(item, index);
      this.listContainer.appendChild(element);
    });
  }
  
  createItemElement(item, index) {
    const div = document.createElement('div');
    div.className = `pending-item ${item.userConfirmed !== null ? 'confirmed' : ''}`;
    
    const timeFormatted = (item.note.time).toFixed(2);
    const judgmentColor = item.judgment === 'PERFECT' ? '#00ff88' :
                          item.judgment === 'GREAT' ? '#00ccff' :
                          item.judgment === 'GOOD' ? '#ffcc00' : '#ff4444';
    
    div.innerHTML = `
      <div class="pending-item-header">
        <span class="pending-time">${timeFormatted}s</span>
        <span class="pending-judgment" style="color: ${judgmentColor}">${item.judgment}</span>
        ${item.note.type === 'syncopated' ? '<span class="sync-tag">切分音</span>' : ''}
      </div>
      <div class="pending-reason">${item.pendingReason}</div>
      ${item.note.remark ? `<div class="pending-remark">备注: ${item.note.remark}</div>` : ''}
      ${item.userConfirmed === null ? `
        <div class="pending-actions">
          <button class="btn-confirm" data-index="${index}">确认判定</button>
          <button class="btn-reject" data-index="${index}">驳回修正</button>
        </div>
      ` : `
        <div class="pending-status ${item.userConfirmed ? 'confirmed-yes' : 'confirmed-no'}">
          ${item.userConfirmed ? '✓ 已确认' : '✗ 已驳回'}
        </div>
      `}
    `;
    
    if (item.userConfirmed === null) {
      const confirmBtn = div.querySelector('.btn-confirm');
      const rejectBtn = div.querySelector('.btn-reject');
      
      confirmBtn.addEventListener('click', () => this.handleConfirm(index, true));
      rejectBtn.addEventListener('click', () => this.handleConfirm(index, false));
    }
    
    return div;
  }
  
  handleConfirm(index, confirmed) {
    if (this.items[index]) {
      this.items[index].userConfirmed = confirmed;
      this.updateCount();
      this.render();
    }
  }
  
  getFinalReport() {
    return {
      total: this.items.length,
      confirmed: this.items.filter(i => i.userConfirmed === true).length,
      rejected: this.items.filter(i => i.userConfirmed === false).length,
      unconfirmed: this.items.filter(i => i.userConfirmed === null).length,
      details: this.items.map(i => ({
        time: i.note.time,
        judgment: i.judgment,
        reason: i.pendingReason,
        userConfirmed: i.userConfirmed,
        noteType: i.note.type,
        remark: i.note.remark
      }))
    };
  }
  
  clear() {
    this.items = [];
    this.updateCount();
    this.render();
  }
}
