import { SECTORS, RISK_LEVELS, DATA_SOURCE, isRetroactive, issuers, guarantees, ratingChanges, contagionPaths, detectDuplicateGuarantees, getRetroactiveRatingChanges, getAffectedDetailsForRatingChange, getContagionPathsForIssuer, getGuaranteesForIssuer, computeRiskLevels, getSummary, filterDataByDate } from './data.js';

export class Timeline {
  constructor(container, onDateChange) {
    this.container = container;
    this.onDateChange = onDateChange;
    this.minDate = new Date('2019-01-01');
    this.maxDate = new Date('2021-12-31');
    this.currentDate = new Date('2021-06-01');
    this.playing = false;
    this.playInterval = null;
    this.el = null;
  }

  render() {
    this.el = document.createElement('div');
    this.el.className = 'timeline-bar';
    this.el.innerHTML = `
      <div class="timeline-controls">
        <button class="tl-btn" id="tl-rewind" title="后退1月">⏪</button>
        <button class="tl-btn" id="tl-play" title="播放/暂停">▶</button>
        <button class="tl-btn" id="tl-forward" title="前进1月">⏩</button>
      </div>
      <div class="timeline-slider-wrap">
        <input type="range" id="tl-slider" class="timeline-slider"
          min="${this.minDate.getTime()}" max="${this.maxDate.getTime()}"
          value="${this.currentDate.getTime()}" step="86400000">
        <div class="timeline-labels">
          <span>2019-01</span><span>2020-01</span><span>2021-01</span><span>2021-12</span>
        </div>
      </div>
      <div class="timeline-date" id="tl-date-label">${this._formatDate(this.currentDate)}</div>
    `;
    this.container.appendChild(this.el);

    const slider = this.el.querySelector('#tl-slider');
    slider.addEventListener('input', () => {
      this.currentDate = new Date(parseInt(slider.value));
      this._updateLabel();
      if (this.onDateChange) this.onDateChange(this._formatDate(this.currentDate));
    });

    this.el.querySelector('#tl-play').addEventListener('click', () => this.togglePlay());
    this.el.querySelector('#tl-rewind').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      if (this.currentDate < this.minDate) this.currentDate = new Date(this.minDate);
      slider.value = this.currentDate.getTime();
      this._updateLabel();
      if (this.onDateChange) this.onDateChange(this._formatDate(this.currentDate));
    });
    this.el.querySelector('#tl-forward').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      if (this.currentDate > this.maxDate) this.currentDate = new Date(this.maxDate);
      slider.value = this.currentDate.getTime();
      this._updateLabel();
      if (this.onDateChange) this.onDateChange(this._formatDate(this.currentDate));
    });
  }

  togglePlay() {
    this.playing = !this.playing;
    const btn = this.el.querySelector('#tl-play');
    btn.textContent = this.playing ? '⏸' : '▶';
    if (this.playing) {
      this.playInterval = setInterval(() => {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        if (this.currentDate > this.maxDate) {
          this.currentDate = new Date(this.minDate);
        }
        const slider = this.el.querySelector('#tl-slider');
        slider.value = this.currentDate.getTime();
        this._updateLabel();
        if (this.onDateChange) this.onDateChange(this._formatDate(this.currentDate));
      }, 200);
    } else {
      clearInterval(this.playInterval);
    }
  }

  _updateLabel() {
    const label = this.el.querySelector('#tl-date-label');
    if (label) label.textContent = this._formatDate(this.currentDate);
  }

  _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export class DetailPanel {
  constructor(container, onIssuerSelect) {
    this.container = container;
    this.el = null;
    this.activeTab = 'issuer';
    this.onIssuerSelect = onIssuerSelect;
  }

  render() {
    this.el = document.createElement('div');
    this.el.className = 'detail-panel';
    this.el.innerHTML = `
      <div class="issuer-selector">
        <input type="text" id="issuer-search" class="issuer-search" placeholder="搜索发行人..." autocomplete="off">
        <div class="issuer-dropdown" id="issuer-dropdown"></div>
      </div>
      <div class="detail-tabs">
        <button class="detail-tab active" data-tab="issuer">发行人节点</button>
        <button class="detail-tab" data-tab="holding">持仓规模</button>
        <button class="detail-tab" data-tab="contagion">传染报告</button>
      </div>
      <div class="detail-content" id="detail-content">
        <div class="detail-placeholder">点击网络节点或搜索发行人查看详情</div>
      </div>
    `;
    this.container.appendChild(this.el);

    this.el.querySelectorAll('.detail-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        if (this._currentIssuer) this._showTab(this._currentIssuer, this._currentRiskLevel);
      });
    });

    const searchInput = this.el.querySelector('#issuer-search');
    const dropdown = this.el.querySelector('#issuer-dropdown');

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) { dropdown.classList.remove('show'); return; }
      const matches = issuers.filter(i =>
        i.name.toLowerCase().includes(query) || i.id.toLowerCase().includes(query)
      );
      if (matches.length === 0) { dropdown.classList.remove('show'); return; }
      dropdown.innerHTML = matches.map(i => `
        <div class="issuer-option" data-id="${i.id}">
          <span class="issuer-option-name">${i.name}</span>
          <span class="issuer-option-sector">${i.sector}</span>
          <span class="issuer-option-rating">${i.rating}</span>
          ${i.defaultStatus ? '<span class="badge badge-default">违约</span>' : ''}
        </div>
      `).join('');
      dropdown.classList.add('show');

      dropdown.querySelectorAll('.issuer-option').forEach(opt => {
        opt.addEventListener('mousedown', e => {
          e.preventDefault();
          const id = opt.dataset.id;
          searchInput.value = issuers.find(i => i.id === id)?.name || '';
          dropdown.classList.remove('show');
          if (this.onIssuerSelect) this.onIssuerSelect(id);
        });
      });
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.remove('show'), 150);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) searchInput.dispatchEvent(new Event('input'));
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) return;
        const match = issuers.find(i =>
          i.name.toLowerCase().includes(query) || i.id.toLowerCase().includes(query)
        );
        if (match) {
          searchInput.value = match.name;
          dropdown.classList.remove('show');
          if (this.onIssuerSelect) this.onIssuerSelect(match.id);
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('show');
        searchInput.blur();
      }
    });
  }

  showIssuer(issuerId, riskLevel) {
    const issuer = issuers.find(i => i.id === issuerId);
    if (!issuer) return;
    this._currentIssuer = issuer;
    this._currentRiskLevel = riskLevel || RISK_LEVELS.LOW;
    this._showTab(issuer, this._currentRiskLevel);
  }

  _showTab(issuer, riskLevel) {
    const content = this.el.querySelector('#detail-content');
    if (!issuer) {
      content.innerHTML = '<div class="detail-placeholder">点击网络节点查看详情</div>';
      return;
    }

    switch (this.activeTab) {
      case 'issuer': content.innerHTML = this._renderIssuerTab(issuer, riskLevel); break;
      case 'holding': content.innerHTML = this._renderHoldingTab(issuer); break;
      case 'contagion': content.innerHTML = this._renderContagionTab(issuer); break;
    }

    content.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = content.querySelector(btn.dataset.target);
        if (target) target.classList.toggle('expanded');
      });
    });
  }

  _renderIssuerTab(issuer, riskLevel) {
    const relatedGuarantees = getGuaranteesForIssuer(issuer.id);
    const relatedChanges = ratingChanges.filter(c => c.issuerId === issuer.id);
    const retroChanges = relatedChanges.filter(c => isRetroactive(c));
    const dups = detectDuplicateGuarantees().filter(d =>
      d.items.some(g => g.guarantorId === issuer.id || g.guaranteedId === issuer.id)
    );

    const riskBadge = riskLevel === RISK_LEVELS.HIGH ? '<span class="badge badge-high">高风险</span>' :
                      riskLevel === RISK_LEVELS.MEDIUM ? '<span class="badge badge-medium">中风险</span>' :
                      '<span class="badge badge-low">低风险</span>';

    const defaultBadge = issuer.defaultStatus ? '<span class="badge badge-default">已违约</span>' : '';

    return `
      <div class="detail-section">
        <h3>${issuer.name} ${riskBadge} ${defaultBadge}</h3>
        <table class="detail-table">
          <tr><td class="label">行业</td><td>${issuer.sector}</td></tr>
          <tr><td class="label">当前评级</td><td>${issuer.rating} <span class="source-tag ${issuer.ratingSource}">${issuer.ratingSource === DATA_SOURCE.RETROACTIVE ? '补录' : '原始'}</span></td></tr>
          <tr><td class="label">违约状态</td><td>${issuer.defaultStatus ? '是 (' + issuer.defaultDate + ')' : '否'}</td></tr>
          <tr><td class="label">持仓规模</td><td>${(issuer.holdingScale / 10000).toFixed(0)} 亿元 (${(issuer.holdingScale).toLocaleString()} 万元)</td></tr>
        </table>
      </div>

      ${dups.length > 0 ? `
      <div class="detail-section alert-section">
        <h4 class="alert-title">⚠ 担保重复 (${dups.length}组)</h4>
        ${dups.map(d => `
          <div class="dup-item">
            <span class="dup-source source-tag ${d.source}">${d.source === DATA_SOURCE.ORIGINAL ? '来自原始材料' : '来源未明'}</span>
            <span>${d.guarantorName} → ${d.guaranteedName}</span>
            <span class="dup-count">重复${d.count}条 / ${(d.amount / 10000).toFixed(1)}亿元</span>
          </div>
        `).join('')}
      </div>` : ''}

      ${retroChanges.length > 0 ? `
      <div class="detail-section alert-section">
        <h4 class="alert-title">⚠ 评级滞后（补录）</h4>
        ${retroChanges.map(c => `
          <div class="retro-item">
            <span class="retro-arrow">${c.oldRating} → ${c.newRating}</span>
            <span class="retro-dates">变更: ${c.changeDate} | 补录: ${c.recordDate}</span>
            <span class="retro-lag">滞后${c.lagDays || Math.round((new Date(c.recordDate) - new Date(c.changeDate)) / 86400000)}天</span>
            <button class="expand-btn" data-target="#affected-${c.id}">查看影响明细 ▼</button>
            <div class="affected-details" id="affected-${c.id}">
              ${getAffectedDetailsForRatingChange(c.id).map(d => `
                <div class="affected-bond">
                  <span>${d.bondName}</span>
                  <span>${(d.amount / 10000).toFixed(1)}亿元</span>
                  <span>到期 ${d.maturityDate}</span>
                  <span class="source-tag retroactive">受补录影响</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>` : ''}

      <div class="detail-section">
        <h4>关联担保</h4>
        ${relatedGuarantees.length > 0 ? relatedGuarantees.map(g => {
          const isGuarantor = g.guarantorId === issuer.id;
          const otherId = isGuarantor ? g.guaranteedId : g.guarantorId;
          const other = issuers.find(i => i.id === otherId);
          const dir = isGuarantor ? '担保 →' : '← 被担保';
          return `<div class="guarantee-item ${g.isDuplicate ? 'dup-line' : ''}">
            <span>${dir} ${other?.name || otherId}</span>
            <span>${(g.amount / 10000).toFixed(1)}亿元</span>
            ${g.isDuplicate ? '<span class="source-tag original">担保重复</span>' : ''}
          </div>`;
        }).join('') : '<div class="empty-text">无关联担保</div>'}
      </div>
    `;
  }

  _renderHoldingTab(issuer) {
    const total = issuer.holdingScale;
    return `
      <div class="detail-section">
        <h3>${issuer.name} - 持仓规模</h3>
        <div class="holding-total">
          <span class="holding-amount">${(total / 10000).toFixed(0)}</span>
          <span class="holding-unit">亿元</span>
        </div>
      </div>
      <div class="detail-section">
        <h4>债券明细</h4>
        <table class="detail-table bond-table">
          <thead><tr><th>债券名称</th><th>金额(亿元)</th><th>到期日</th><th>评级影响</th></tr></thead>
          <tbody>
          ${issuer.bonds.map(b => {
            const affectedBy = ratingChanges.filter(c =>
              c.issuerId === issuer.id && c.affectedDetails?.includes(b.id)
            );
            const hasRetro = affectedBy.some(c => isRetroactive(c));
            return `<tr>
              <td>${b.name}</td>
              <td>${(b.amount / 10000).toFixed(1)}亿</td>
              <td>${b.maturityDate}</td>
              <td>${hasRetro ? '<span class="source-tag retroactive">受补录影响</span>' :
                    affectedBy.length > 0 ? '<span class="source-tag original">正常调整</span>' : '—'}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
      <div class="detail-section">
        <h4>评级变化对持仓的影响</h4>
        ${ratingChanges.filter(c => c.issuerId === issuer.id).map(c => `
          <div class="rating-impact-item ${isRetroactive(c) ? 'retro' : ''}">
            <span class="rating-arrow">${c.oldRating} → ${c.newRating}</span>
            <span>${c.changeDate}</span>
            <span class="source-tag ${isRetroactive(c) ? 'retroactive' : 'original'}">
              ${isRetroactive(c) ? '补录 (滞后' + Math.round((new Date(c.recordDate) - new Date(c.changeDate)) / 86400000) + '天)' : '原始记录'}
            </span>
            <div class="impact-bonds">影响: ${(c.affectedDetails || []).map(bid => {
              const bond = issuer.bonds.find(b => b.id === bid);
              return bond ? bond.name : bid;
            }).join(', ')}</div>
          </div>
        `).join('') || '<div class="empty-text">无评级变化记录</div>'}
      </div>
    `;
  }

  _renderContagionTab(issuer) {
    const paths = getContagionPathsForIssuer(issuer.id);
    const outgoing = paths.filter(p => p.sourceId === issuer.id);
    const incoming = paths.filter(p => p.targetId === issuer.id);
    const transit = paths.filter(p => p.path.includes(issuer.id) && p.sourceId !== issuer.id && p.targetId !== issuer.id);

    return `
      <div class="detail-section">
        <h3>${issuer.name} - 传染报告</h3>
        <div class="contagion-summary">
          <div class="contagion-stat">
            <span class="stat-num">${outgoing.length}</span>
            <span class="stat-label">传染源</span>
          </div>
          <div class="contagion-stat">
            <span class="stat-num">${incoming.length}</span>
            <span class="stat-label">被传染</span>
          </div>
          <div class="contagion-stat">
            <span class="stat-num">${transit.length}</span>
            <span class="stat-label">传播中介</span>
          </div>
        </div>
      </div>

      ${outgoing.length > 0 ? `
      <div class="detail-section">
        <h4>作为传染源</h4>
        ${outgoing.map(p => this._renderPathItem(p)).join('')}
      </div>` : ''}

      ${incoming.length > 0 ? `
      <div class="detail-section">
        <h4>被传染影响</h4>
        ${incoming.map(p => this._renderPathItem(p)).join('')}
      </div>` : ''}

      ${transit.length > 0 ? `
      <div class="detail-section">
        <h4>传播中介路径</h4>
        ${transit.map(p => this._renderPathItem(p)).join('')}
      </div>` : ''}

      ${paths.length === 0 ? '<div class="detail-section"><div class="empty-text">该发行人暂无传染路径</div></div>' : ''}
    `;
  }

  _renderPathItem(path) {
    const pathNames = path.path.map(id => {
      const issuer = issuers.find(i => i.id === id);
      return issuer?.name || id;
    });
    const riskClass = path.riskLevel === RISK_LEVELS.HIGH ? 'risk-high' :
                      path.riskLevel === RISK_LEVELS.MEDIUM ? 'risk-medium' : 'risk-low';
    const typeLabel = path.pathType === 'direct_guarantee' ? '直接担保' :
                      path.pathType === 'indirect' ? '间接传染' : '行业关联';
    return `
      <div class="path-item ${riskClass}">
        <div class="path-header">
          <span class="path-type">${typeLabel}</span>
          <span class="badge badge-${path.riskLevel}">${path.riskLevel === RISK_LEVELS.HIGH ? '高' : path.riskLevel === RISK_LEVELS.MEDIUM ? '中' : '低'}风险</span>
          <span class="path-date">${path.triggerDate}</span>
        </div>
        <div class="path-flow">${pathNames.join(' → ')}</div>
      </div>
    `;
  }

  clear() {
    const content = this.el?.querySelector('#detail-content');
    if (content) content.innerHTML = '<div class="detail-placeholder">点击网络节点查看详情</div>';
    this._currentIssuer = null;
  }
}

export class SummaryPanel {
  constructor(container) {
    this.container = container;
    this.el = null;
  }

  render() {
    this.el = document.createElement('div');
    this.el.className = 'summary-panel';
    this.container.appendChild(this.el);
    this.update();
  }

  update(dateStr) {
    const summary = getSummary();
    const dups = summary.duplicateGuaranteeGroups;
    const retros = summary.retroactiveRatingChanges;

    let dupHtml = '';
    if (dups.length > 0) {
      dupHtml = `
        <div class="summary-alert">
          <span class="alert-icon">⚠</span>
          <span class="alert-text">担保重复 ${dups.length} 组</span>
          <div class="alert-detail">
            ${dups.map(d => `<div class="dup-summary-item">
              <span class="source-tag ${d.source}">${d.source === DATA_SOURCE.ORIGINAL ? '原始材料' : '未知来源'}</span>
              ${d.guarantorName} → ${d.guaranteedName} (${d.count}条 / ${(d.amount / 10000).toFixed(1)}亿元)
            </div>`).join('')}
          </div>
        </div>`;
    }

    let retroHtml = '';
    if (retros.length > 0) {
      retroHtml = `
        <div class="summary-alert retro-alert">
          <span class="alert-icon">⚠</span>
          <span class="alert-text">评级补录 ${retros.length} 条</span>
          <div class="alert-detail">
            ${retros.map(r => `<div class="retro-summary-item">
              <span class="source-tag retroactive">补录</span>
              ${r.issuerName}: ${r.oldRating}→${r.newRating} (滞后${r.lagDays}天)
            </div>`).join('')}
          </div>
        </div>`;
    }

    this.el.innerHTML = `
      <div class="summary-header">网络摘要</div>
      <div class="summary-stats">
        <div class="stat-item"><span class="stat-num">${summary.totalIssuers}</span><span class="stat-label">发行人</span></div>
        <div class="stat-item stat-default"><span class="stat-num">${summary.defaultCount}</span><span class="stat-label">已违约</span></div>
        <div class="stat-item"><span class="stat-num">${summary.totalGuarantees}</span><span class="stat-label">担保关系</span></div>
        <div class="stat-item"><span class="stat-num">${summary.totalContagionPaths}</span><span class="stat-label">传染路径</span></div>
      </div>
      ${dupHtml}
      ${retroHtml}
    `;
  }
}

export class FilterBar {
  constructor(container, onFilterChange) {
    this.container = container;
    this.onFilterChange = onFilterChange;
    this.el = null;
    this.selectedSectors = new Set(Object.values(SECTORS));
    this.showDuplicates = true;
    this.showRetro = true;
    this.riskFilter = 'all';
  }

  render() {
    this.el = document.createElement('div');
    this.el.className = 'filter-bar';
    this.el.innerHTML = `
      <div class="filter-group">
        <label>行业筛选:</label>
        <div class="sector-filters">
          ${Object.entries(SECTORS).map(([key, name]) => `
            <label class="sector-check">
              <input type="checkbox" value="${name}" checked> ${name}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="filter-group">
        <label>风险:</label>
        <select id="risk-filter">
          <option value="all">全部</option>
          <option value="high">高风险</option>
          <option value="medium">中风险</option>
          <option value="low">低风险</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="sector-check">
          <input type="checkbox" id="show-dup" checked> 显示担保重复
        </label>
        <label class="sector-check">
          <input type="checkbox" id="show-retro" checked> 显示评级补录
        </label>
      </div>
    `;
    this.container.appendChild(this.el);

    this.el.querySelectorAll('.sector-check input[type="checkbox"]').forEach(cb => {
      if (cb.id === 'show-dup' || cb.id === 'show-retro') return;
      cb.addEventListener('change', () => {
        this.selectedSectors = new Set(
          [...this.el.querySelectorAll('.sector-check input[type="checkbox"]:not(#show-dup):not(#show-retro)')]
            .filter(c => c.checked).map(c => c.value)
        );
        this._emit();
      });
    });

    this.el.querySelector('#risk-filter').addEventListener('change', e => {
      this.riskFilter = e.target.value;
      this._emit();
    });

    this.el.querySelector('#show-dup').addEventListener('change', e => {
      this.showDuplicates = e.target.checked;
      this._emit();
    });

    this.el.querySelector('#show-retro').addEventListener('change', e => {
      this.showRetro = e.target.checked;
      this._emit();
    });
  }

  _emit() {
    if (this.onFilterChange) {
      this.onFilterChange({
        sectors: this.selectedSectors,
        riskFilter: this.riskFilter,
        showDuplicates: this.showDuplicates,
        showRetro: this.showRetro,
      });
    }
  }

  getFilter() {
    return {
      sectors: this.selectedSectors,
      riskFilter: this.riskFilter,
      showDuplicates: this.showDuplicates,
      showRetro: this.showRetro,
    };
  }
}

export class ExportPanel {
  constructor(container, network3d) {
    this.container = container;
    this.network3d = network3d;
  }

  render() {
    this.el = document.createElement('div');
    this.el.className = 'export-panel';
    this.el.innerHTML = `
      <button class="export-btn" id="export-img">导出图片</button>
      <button class="export-btn" id="export-data">导出数据</button>
      <button class="export-btn" id="compare-btn">方案比较</button>
    `;
    this.container.appendChild(this.el);

    this.el.querySelector('#export-img').addEventListener('click', () => this.exportImage());
    this.el.querySelector('#export-data').addEventListener('click', () => this.exportData());
    this.el.querySelector('#compare-btn').addEventListener('click', () => this.showCompare());
  }

  exportImage() {
    if (!this.network3d) return;
    const dataUrl = this.network3d.exportImage();
    const link = document.createElement('a');
    link.download = 'bond-contagion-network.png';
    link.href = dataUrl;
    link.click();
  }

  exportData() {
    const summary = getSummary();
    const blob = new Blob([JSON.stringify({
      issuers: issuers.map(i => ({
        id: i.id, name: i.name, sector: i.sector, rating: i.rating,
        ratingSource: i.ratingSource, defaultStatus: i.defaultStatus,
        holdingScale: i.holdingScale,
      })),
      guarantees: guarantees.map(g => ({
        id: g.id, guarantorId: g.guarantorId, guaranteedId: g.guaranteedId,
        amount: g.amount, isDuplicate: g.isDuplicate, duplicateSource: g.duplicateSource,
      })),
      ratingChanges: ratingChanges.map(c => ({
        ...c, retroactive: isRetroactive(c),
      })),
      contagionPaths,
      summary,
    }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'bond-contagion-data.json';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  showCompare() {
    const modal = document.createElement('div');
    modal.className = 'compare-modal';
    modal.innerHTML = `
      <div class="compare-content">
        <div class="compare-header">
          <h3>方案比较</h3>
          <button class="compare-close">&times;</button>
        </div>
        <div class="compare-body">
          <div class="compare-col">
            <h4>方案A：含担保重复</h4>
            <div class="compare-stat">担保关系: ${guarantees.length} 条</div>
            <div class="compare-stat">含重复: ${guarantees.filter(g => g.isDuplicate).length} 条</div>
            <div class="compare-stat">传染路径: ${contagionPaths.length} 条</div>
            <div class="compare-highlight">担保重复在摘要和详情中均标注⚠</div>
          </div>
          <div class="compare-col">
            <h4>方案B：去重后</h4>
            <div class="compare-stat">担保关系: ${guarantees.filter(g => !g.isDuplicate).length + detectDuplicateGuarantees().length} 条</div>
            <div class="compare-stat">去重减少: ${guarantees.filter(g => g.isDuplicate).length - detectDuplicateGuarantees().length} 条</div>
            <div class="compare-stat">传染路径: ${contagionPaths.length} 条 (路径不变)</div>
            <div class="compare-highlight">去重后网络拓扑不变，但风险敞口更准确</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.compare-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }
}
