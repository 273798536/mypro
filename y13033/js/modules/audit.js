const AuditView = (function () {
  function render(container) {
    const logs = DataStore.getAuditLogs();

    const html = `
      <div class="card">
        <div class="card-title">
          变更审计日志
          <span class="badge">${logs.length} 条</span>
        </div>
        <div class="info-panel">
          <div class="info-panel-title">审计说明</div>
          <ul>
            <li>所有银行备注补录、审批判断修改、审批人改名都会自动记录到此处</li>
            <li>每条审计包含：操作人、时间、来源行（触发依据）、影响范围</li>
            <li>点击"跳转原记录"可直接查看发生变更的原始审批单或银行流水</li>
          </ul>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作人</th>
              <th>操作类型</th>
              <th>关联对象</th>
              <th>变更字段</th>
              <th>变更内容</th>
              <th>来源行</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => rowHtml(l)).join('')}
          </tbody>
        </table>
        ${logs.length === 0 ? `
          <div class="empty-state"><div class="empty-state-icon">📝</div><div>暂无审计记录</div></div>
        ` : ''}
      </div>
      <div class="card">
        <div class="card-title">按时间线查看（完整变更时间线）</div>
        <div class="timeline">
          ${logs.map(l => timelineHtml(l)).join('')}
        </div>
      </div>
    `;
    container.innerHTML = html;
    bindEvents(container);
  }

  function refresh() {
    const container = document.getElementById('view-audit');
    if (container && container.classList.contains('active')) {
      render(container);
    }
  }

  function rowHtml(l) {
    const typeMap = {
      'remark_supplement': { text: '银行备注补录', cls: 'tag-amber' },
      'judgment_change': { text: '审批判断修改', cls: 'tag-blue' },
      'approver_change': { text: '审批人变更', cls: 'tag-red' },
      'status_change': { text: '状态变更', cls: 'tag' }
    };
    const type = typeMap[l.actionType] || { text: l.actionType, cls: 'tag' };
    const entityLabel = l.entityType === 'approval' ? '审批' : (l.entityType === 'transaction' ? '银行流水' : l.entityType);

    return `
      <tr>
        <td style="white-space:nowrap">${DataStore.fmtDate(l.timestamp)}</td>
        <td>${Utils.escapeHtml(l.operator)}</td>
        <td><span class="tag ${type.cls}">${type.text}</span></td>
        <td>${entityLabel} ${Utils.escapeHtml(l.entityId)}</td>
        <td>${Utils.escapeHtml(l.fieldName)}</td>
        <td style="min-width:240px">
          <span class="diff-old" style="text-decoration:line-through;color:#dc2626">${Utils.escapeHtml(l.oldValue || '（空）')}</span>
          →
          <span class="diff-new" style="color:#059669;font-weight:600">${Utils.escapeHtml(l.newValue || '（空）')}</span>
        </td>
        <td style="max-width:200px;font-size:12px">${Utils.escapeHtml(l.sourceLine || '—')}</td>
        <td>
          <button class="btn btn-sm" data-action="detail" data-id="${l.id}">查看影响</button>
          <button class="btn btn-sm btn-primary" data-action="goto" data-type="${l.entityType}" data-id="${l.entityId}">跳转原记录</button>
        </td>
      </tr>
    `;
  }

  function timelineHtml(l) {
    const clsMap = {
      'remark_supplement': 'warning',
      'judgment_change': '',
      'approver_change': 'danger',
      'status_change': 'info'
    };
    const typeTextMap = {
      'remark_supplement': '银行备注补录',
      'judgment_change': '审批判断修改',
      'approver_change': '审批人变更',
      'status_change': '状态变更'
    };
    const cls = clsMap[l.actionType] || '';
    const typeText = typeTextMap[l.actionType] || l.actionType;

    return `
      <div class="timeline-item ${cls}">
        <div class="timeline-time">${DataStore.fmtDate(l.timestamp)} · ${Utils.escapeHtml(l.operator)}</div>
        <div class="timeline-title">${typeText} · ${l.entityType === 'approval' ? '审批' : '银行流水'} ${l.entityId}</div>
        <div class="timeline-desc">${Utils.escapeHtml(l.reason || '')}</div>
        <div class="timeline-meta">
          <div>字段 ${Utils.escapeHtml(l.fieldName)}：
            <span class="diff-old">${Utils.escapeHtml(l.oldValue || '（空）')}</span>
            →
            <span class="diff-new">${Utils.escapeHtml(l.newValue || '（空）')}</span>
          </div>
          <div style="margin-top:4px">来源：${Utils.escapeHtml(l.sourceLine || '—')}</div>
          ${l.impactScope && l.impactScope.length
            ? `<div style="margin-top:4px">影响范围：<ul style="margin-left:18px;margin-top:4px">${l.impactScope.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')}</ul></div>`
            : ''}
        </div>
      </div>
    `;
  }

  function bindEvents(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'detail') showAuditDetail(btn.dataset.id);
      if (a === 'goto') {
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        if (type === 'approval') App.switchView('approvals', { highlight: id });
        else App.switchView('transactions');
      }
    });
  }

  function showAuditDetail(auditId) {
    const logs = DataStore.getAuditLogs();
    const l = logs.find(x => x.id === auditId);
    if (!l) return;

    const typeTextMap = {
      'remark_supplement': '银行备注补录',
      'judgment_change': '审批判断修改',
      'approver_change': '审批人变更',
      'status_change': '状态变更'
    };

    let linkedEntity = null;
    if (l.entityType === 'approval') {
      linkedEntity = DataStore.getApprovalById(l.entityId);
    } else if (l.entityType === 'transaction') {
      linkedEntity = DataStore.getTransactionById(l.entityId);
    }

    const html = `
      <div class="modal-header">
        <h3>审计详情 · ${typeTextMap[l.actionType] || l.actionType}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><span class="detail-label">操作时间</span><span class="detail-value">${DataStore.fmtDate(l.timestamp)}</span></div>
        <div class="detail-item"><span class="detail-label">操作人</span><span class="detail-value">${Utils.escapeHtml(l.operator)}</span></div>
        <div class="detail-item"><span class="detail-label">操作类型</span><span class="detail-value">${typeTextMap[l.actionType] || l.actionType}</span></div>
        <div class="detail-item"><span class="detail-label">关联对象</span><span class="detail-value">${l.entityType} / ${l.entityId}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">变更字段</span><span class="detail-value">${Utils.escapeHtml(l.fieldName)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">变更前</span><span class="detail-value" style="color:#dc2626;text-decoration:line-through">${Utils.escapeHtml(l.oldValue || '（空）')}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">变更后</span><span class="detail-value" style="color:#059669;font-weight:600">${Utils.escapeHtml(l.newValue || '（空）')}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">来源行（触发依据）</span><span class="detail-value">${Utils.escapeHtml(l.sourceLine || '—')}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">原因说明</span><span class="detail-value">${Utils.escapeHtml(l.reason || '—')}</span></div>
      </div>
      <div class="info-panel">
        <div class="info-panel-title">影响范围</div>
        <ul>
          ${l.impactScope && l.impactScope.length
            ? l.impactScope.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')
            : '<li>无</li>'}
        </ul>
      </div>
      <div class="modal-footer">
        <button class="btn" data-action="close">关闭</button>
        <button class="btn btn-primary" data-action="goto">查看关联记录</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn && !e.target.classList.contains('close-btn')) return;
      const a = btn ? btn.dataset.action : (e.target.classList.contains('close-btn') ? 'close' : '');
      if (a === 'close') Utils.closeModal();
      if (a === 'goto') {
        Utils.closeModal();
        if (l.entityType === 'approval') App.switchView('approvals', { highlight: l.entityId });
        else App.switchView('transactions');
      }
    });
  }

  return { render, refresh };
})();
