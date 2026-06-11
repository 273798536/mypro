const SummaryView = (function () {
  const state = {
    filters: null,
    filteredApprovals: [],
    filteredTransactions: [],
    summary: null
  };

  function initFilters() {
    if (state.filters) return state.filters;
    const range = Utils.getMonthRange();
    state.filters = {
      dateFrom: range.from,
      dateTo: range.to,
      supplier: '',
      status: 'all',
      onlyChanged: false
    };
    return state.filters;
  }

  function applyFilters() {
    const { approvals, transactions } = DataStore.filterData(state.filters);
    state.filteredApprovals = approvals;
    state.filteredTransactions = transactions;
    state.summary = DataStore.computeSummary(approvals);
  }

  function render(container) {
    initFilters();
    applyFilters();
    renderAll(container);
  }

  function refresh() {
    const container = document.getElementById('view-summary');
    if (container && container.classList.contains('active')) {
      applyFilters();
      renderAll(container);
    }
  }

  function renderAll(container) {
    const f = state.filters;
    const s = state.summary;

    const html = `
      <div class="info-panel">
        <div class="info-panel-title">📊 同源数据说明</div>
        <ul>
          <li>本页筛选条件、统计卡片、明细表均来自<strong>同一套筛选结果</strong>，确保截图说明与数字一致</li>
          <li>点击任意统计卡片可联动筛选下方明细表，查看构成该数字的明细记录</li>
          <li>点击明细行中的"追溯"可查看该笔记录对汇总数字产生了什么影响（包括变更历史）</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">
          筛选条件（用于统计、明细、截图说明的同源数据）
          <span class="badge">共 ${state.filteredApprovals.length} 条审批 / ${state.filteredTransactions.length} 条流水</span>
        </div>
        <div class="filter-bar">
          <div class="filter-item">
            <label>银行日期起</label>
            <input type="date" id="f-dateFrom" value="${f.dateFrom}">
          </div>
          <div class="filter-item">
            <label>银行日期止</label>
            <input type="date" id="f-dateTo" value="${f.dateTo}">
          </div>
          <div class="filter-item">
            <label>供应商</label>
            <input type="text" id="f-supplier" placeholder="模糊搜索" value="${f.supplier}">
          </div>
          <div class="filter-item">
            <label>审批状态</label>
            <select id="f-status">
              <option value="all" ${f.status === 'all' ? 'selected' : ''}>全部</option>
              <option value="approved" ${f.status === 'approved' ? 'selected' : ''}>已通过</option>
              <option value="pending" ${f.status === 'pending' ? 'selected' : ''}>待审批</option>
              <option value="modified" ${f.status === 'modified' ? 'selected' : ''}>已调整</option>
              <option value="rejected" ${f.status === 'rejected' ? 'selected' : ''}>已拒绝</option>
            </select>
          </div>
          <div class="filter-item" style="justify-content:flex-end">
            <label style="visibility:hidden">仅看变更</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="f-onlyChanged" ${f.onlyChanged ? 'checked' : ''}>
              仅显示有判断/审批人变更的记录
            </label>
          </div>
          <div class="filter-item" style="justify-content:flex-end">
            <label style="visibility:hidden">按钮</label>
            <div class="btn-group">
              <button class="btn btn-primary" id="btn-apply-filter">应用筛选</button>
              <button class="btn" id="btn-reset-filter">重置</button>
              <button class="btn btn-warning" id="btn-reset-data">重置演示数据</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          汇总统计（点击卡片联动筛选明细）
        </div>
        <div class="stats-grid" id="statsGrid">
          ${statCardHtml({
            label: '审批总笔数', value: s.totalCount, sub: `总金额 ${DataStore.fmtAmount(s.totalAmount)}`,
            type: 'info', dataFilter: 'total'
          })}
          ${statCardHtml({
            label: '已通过', value: s.approvedCount, sub: `金额 ${DataStore.fmtAmount(s.approvedAmount)}`,
            type: 'success', dataFilter: 'approved'
          })}
          ${statCardHtml({
            label: '待审批', value: s.pendingCount, sub: `金额 ${DataStore.fmtAmount(s.pendingAmount)}`,
            type: 'warning', dataFilter: 'pending'
          })}
          ${statCardHtml({
            label: '已调整（月底补录/修改）', value: s.modifiedCount, sub: `金额 ${DataStore.fmtAmount(s.modifiedAmount)} · 点击查看异常`,
            type: 'danger', dataFilter: 'modified'
          })}
          ${statCardHtml({
            label: '发生过变更的记录', value: s.changedCount, sub: '含判断修改/审批人改名/补录备注',
            type: 'warning', dataFilter: 'changed'
          })}
          ${statCardHtml({
            label: '已拒绝', value: s.rejectedCount, sub: `金额 ${DataStore.fmtAmount(s.rejectedAmount)}`,
            type: '', dataFilter: 'rejected'
          })}
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          审批明细（与上方统计同源）
          <span id="activeFilterBadge" class="badge" style="display:none"></span>
        </div>
        <table class="data-table" id="summaryTable">
          <thead>
            <tr>
              <th>审批单号</th>
              <th>供应商</th>
              <th>银行日期</th>
              <th>预付金额</th>
              <th>审批人</th>
              <th>状态</th>
              <th>审批判断</th>
              <th>银行备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="summaryTableBody">
            ${renderRows(state.filteredApprovals)}
          </tbody>
        </table>
        ${state.filteredApprovals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div>当前筛选条件下暂无数据</div>
          </div>` : ''}
      </div>
    `;
    container.innerHTML = html;
    bindEvents(container);
  }

  function statCardHtml({ label, value, sub, type, dataFilter }) {
    const cls = type ? ` ${type}` : '';
    return `
      <div class="stat-card${cls}" data-filter="${dataFilter}">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-sub">${sub}</div>
      </div>
    `;
  }

  function renderRows(approvals) {
    if (approvals.length === 0) return '';
    return approvals.map(ap => {
      const tx = DataStore.getTransactionById(ap.transactionId);
      const changed = Utils.isChangedApproval(ap);
      const bankRemark = tx && tx.remark ? `<span class="change-highlight">${Utils.escapeHtml(tx.remark)}</span>` : '—';
      const judgmentHtml = ap.judgmentHistory && ap.judgmentHistory.length > 1
        ? `<span class="change-highlight">${Utils.escapeHtml(ap.judgment)}</span> <span class="tag tag-amber">${ap.judgmentHistory.length}版</span>`
        : Utils.escapeHtml(ap.judgment);
      return `
        <tr class="${changed ? 'changed' : ''}" data-ap-id="${ap.id}">
          <td>${ap.id}${changed ? ' <span class="tag tag-blue">变更</span>' : ''}</td>
          <td>${Utils.escapeHtml(ap.supplierName)}</td>
          <td>${tx ? tx.bankDate : '—'}</td>
          <td class="amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</td>
          <td>${Utils.escapeHtml(ap.approver)}</td>
          <td>${Utils.statusLabel(ap.approvalStatus)}</td>
          <td style="max-width:260px">${judgmentHtml}</td>
          <td>${bankRemark}</td>
          <td>
            <button class="btn btn-sm btn-primary" data-action="trace" data-id="${ap.id}">追溯变化</button>
            <button class="btn btn-sm" data-action="approval-detail" data-id="${ap.id}">详情</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function bindEvents(container) {
    document.getElementById('btn-apply-filter').addEventListener('click', () => {
      readFilters();
      applyFilters();
      document.getElementById('activeFilterBadge').style.display = 'none';
      document.getElementById('summaryTableBody').innerHTML = renderRows(state.filteredApprovals);
      updateStatCards();
      Utils.showToast('筛选已应用，统计与明细已同步更新', 'success');
    });

    document.getElementById('btn-reset-filter').addEventListener('click', () => {
      const range = Utils.getMonthRange();
      state.filters = { dateFrom: range.from, dateTo: range.to, supplier: '', status: 'all', onlyChanged: false };
      document.getElementById('f-dateFrom').value = state.filters.dateFrom;
      document.getElementById('f-dateTo').value = state.filters.dateTo;
      document.getElementById('f-supplier').value = '';
      document.getElementById('f-status').value = 'all';
      document.getElementById('f-onlyChanged').checked = false;
      applyFilters();
      document.getElementById('activeFilterBadge').style.display = 'none';
      document.getElementById('summaryTableBody').innerHTML = renderRows(state.filteredApprovals);
      updateStatCards();
    });

    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if (confirm('确认重置所有演示数据？此操作会清除所有变更记录。')) {
        DataStore.reset();
        applyFilters();
        renderAll(container);
        Utils.showToast('演示数据已重置', 'success');
      }
    });

    document.getElementById('statsGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.stat-card');
      if (!card) return;
      const filter = card.dataset.filter;
      applySubFilter(filter);
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      const id = btn.dataset.id;
      if (a === 'trace') showTrace(id);
      if (a === 'approval-detail') {
        Utils.closeModal();
        ApprovalsView.render(document.getElementById('view-approvals'));
        App.switchView('approvals', { highlight: id });
        setTimeout(() => ApprovalsView.render(document.getElementById('view-approvals'), { highlight: id }), 50);
      }
    });
  }

  function readFilters() {
    state.filters.dateFrom = document.getElementById('f-dateFrom').value;
    state.filters.dateTo = document.getElementById('f-dateTo').value;
    state.filters.supplier = document.getElementById('f-supplier').value;
    state.filters.status = document.getElementById('f-status').value;
    state.filters.onlyChanged = document.getElementById('f-onlyChanged').checked;
  }

  function applySubFilter(filterType) {
    let label = '';
    let filtered;
    switch (filterType) {
      case 'total':
        filtered = state.filteredApprovals;
        label = '全部';
        break;
      case 'approved':
        filtered = state.filteredApprovals.filter(a => a.approvalStatus === 'approved');
        label = '状态：已通过';
        break;
      case 'pending':
        filtered = state.filteredApprovals.filter(a => a.approvalStatus === 'pending');
        label = '状态：待审批';
        break;
      case 'modified':
        filtered = state.filteredApprovals.filter(a => a.approvalStatus === 'modified');
        label = '状态：已调整（月底补录/修改）';
        break;
      case 'rejected':
        filtered = state.filteredApprovals.filter(a => a.approvalStatus === 'rejected');
        label = '状态：已拒绝';
        break;
      case 'changed':
        filtered = state.filteredApprovals.filter(a => Utils.isChangedApproval(a));
        label = '仅变更记录';
        break;
      default:
        filtered = state.filteredApprovals;
    }
    const badge = document.getElementById('activeFilterBadge');
    badge.textContent = '📌 联动筛选：' + label + `（${filtered.length}条）`;
    badge.style.display = 'inline-block';
    document.getElementById('summaryTableBody').innerHTML = renderRows(filtered);
    Utils.showToast(`已联动筛选：${label}，共 ${filtered.length} 条`, 'info');
  }

  function updateStatCards() {
    const s = state.summary;
    const cards = document.querySelectorAll('.stat-card');
    const values = [
      s.totalCount, s.approvedCount, s.pendingCount,
      s.modifiedCount, s.changedCount, s.rejectedCount
    ];
    const subs = [
      `总金额 ${DataStore.fmtAmount(s.totalAmount)}`,
      `金额 ${DataStore.fmtAmount(s.approvedAmount)}`,
      `金额 ${DataStore.fmtAmount(s.pendingAmount)}`,
      `金额 ${DataStore.fmtAmount(s.modifiedAmount)} · 点击查看异常`,
      '含判断修改/审批人改名/补录备注',
      `金额 ${DataStore.fmtAmount(s.rejectedAmount)}`
    ];
    cards.forEach((c, i) => {
      c.querySelector('.stat-value').textContent = values[i];
      c.querySelector('.stat-sub').textContent = subs[i];
    });
  }

  function showTrace(apId) {
    const ap = DataStore.getApprovalById(apId);
    if (!ap) return;
    const tx = DataStore.getTransactionById(ap.transactionId);
    const audit = DataStore.getAuditLogsByEntity('approval', apId);
    const txAudit = tx ? DataStore.getAuditLogsByEntity('transaction', tx.id) : [];
    const allAudit = [...audit, ...txAudit].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const jh = ap.judgmentHistory || [];
    const ah = ap.approverHistory || [];
    const rh = tx ? (tx.remarkHistory || []) : [];
    const hasChanges = jh.length > 1 || ah.length > 0 || rh.length > 0;

    const impactSection = hasChanges ? `
      <div class="info-panel" style="background:#fef2f2;border-color:#fecaca">
        <div class="info-panel-title" style="color:#991b1b">🔍 本记录对汇总的影响明细</div>
        <ul>
          ${renderImpactList(ap, tx, allAudit)}
        </ul>
      </div>
    ` : `
      <div class="info-panel">
        <div class="info-panel-title">✅ 本记录未发生变更</div>
        <ul>
          <li>审批判断、审批人、银行备注均与初始录入一致</li>
          <li>对汇总统计的贡献：预付款 +${DataStore.fmtAmount(ap.prepaidAmount)}，审批笔数 +1</li>
        </ul>
      </div>
    `;

    const timelineItems = [];
    jh.forEach((j, i) => {
      const isLatest = i === jh.length - 1;
      const isChange = j.oldJudgment !== null;
      timelineItems.push({
        time: j.timestamp,
        cls: isLatest ? 'success' : (isChange ? 'warning' : ''),
        title: `判断${isChange ? '修改' : '建立'}（版本 ${i + 1}/${jh.length}）${isLatest ? ' · 当前版本' : ''}`,
        operator: j.operator,
        content: isChange
          ? `<span class="diff-old">${Utils.escapeHtml(j.oldJudgment)}</span> → <span class="diff-new">${Utils.escapeHtml(j.newJudgment)}</span>`
          : `初始：<span class="diff-new">${Utils.escapeHtml(j.newJudgment)}</span>`,
        reason: j.reason,
        extraFields: j.changedFields
      });
    });
    ah.forEach(a => {
      timelineItems.push({
        time: a.timestamp,
        cls: 'danger',
        title: '审批人变更',
        operator: a.operator,
        content: `<span class="diff-old">${Utils.escapeHtml(a.oldApprover)}</span> → <span class="diff-new">${Utils.escapeHtml(a.newApprover)}</span>`,
        reason: a.reason,
        sourceLine: a.sourceLine
      });
    });
    rh.forEach(r => {
      timelineItems.push({
        time: r.timestamp,
        cls: 'warning',
        title: '银行流水补录备注',
        operator: r.operator,
        content: `<span class="diff-old">${r.oldRemark ? Utils.escapeHtml(r.oldRemark) : '（空）'}</span> → <span class="diff-new">${Utils.escapeHtml(r.newRemark)}</span>`,
        reason: r.reason,
        impactScope: r.impactScope
      });
    });
    timelineItems.sort((a, b) => new Date(a.time) - new Date(b.time));

    const html = `
      <div class="modal-header">
        <h3>追溯变化 · ${ap.id} ${ap.supplierName}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="breadcrumb">
        <span>汇总统计</span>
        <span>›</span>
        <span class="current">追溯异常：${ap.id}</span>
      </div>
      <div class="trace-path">
        <div class="trace-step">📊 汇总数字</div>
        <span class="trace-arrow">←</span>
        <div class="trace-step">📋 审批 ${ap.id}</div>
        <span class="trace-arrow">⇄</span>
        <div class="trace-step">📄 银行流水 ${tx ? tx.id : '无'}</div>
        <span class="trace-arrow">⇄</span>
        <div class="trace-step">🖼️ 截图说明 ${ap.screenshots ? ap.screenshots.length : 0} 张</div>
      </div>
      ${impactSection}
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">当前状态速览</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">供应商</span><span class="detail-value">${Utils.escapeHtml(ap.supplierName)}</span></div>
        <div class="detail-item"><span class="detail-label">预付金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</span></div>
        <div class="detail-item"><span class="detail-label">当前状态</span><span class="detail-value">${Utils.statusLabel(ap.approvalStatus)}</span></div>
        <div class="detail-item"><span class="detail-label">审批人</span><span class="detail-value">${Utils.escapeHtml(ap.approver)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">当前判断</span><span class="detail-value">${Utils.escapeHtml(ap.judgment)}</span></div>
        ${tx ? `<div class="detail-item" style="grid-column:1/-1"><span class="detail-label">银行备注</span><span class="detail-value">${tx.remark ? '<span class="change-highlight">' + Utils.escapeHtml(tx.remark) + '</span>' : '（空）'}</span></div>` : ''}
      </div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">完整变更时间线（解释汇总为什么变了）</div>
      ${timelineItems.length > 0 ? `
        <div class="timeline">
          ${timelineItems.map(t => `
            <div class="timeline-item ${t.cls}">
              <div class="timeline-time">${DataStore.fmtDate(t.time)} · ${Utils.escapeHtml(t.operator)}</div>
              <div class="timeline-title">${t.title}</div>
              <div class="timeline-meta">
                <div>${t.content}</div>
                ${t.reason ? `<div style="margin-top:6px">原因：${Utils.escapeHtml(t.reason)}</div>` : ''}
                ${t.sourceLine ? `<div style="margin-top:4px">来源行：${Utils.escapeHtml(t.sourceLine)}</div>` : ''}
                ${t.extraFields && t.extraFields.length ? `<div style="margin-top:4px">变更字段：<ul style="margin-left:18px;margin-top:4px">${t.extraFields.map(f => `<li>${Utils.escapeHtml(f)}</li>`).join('')}</ul></div>` : ''}
                ${t.impactScope && t.impactScope.length ? `<div style="margin-top:4px">影响范围：<ul style="margin-left:18px;margin-top:4px">${t.impactScope.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')}</ul></div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="color:#9ca3af">暂无变更历史</div>'}
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">关联银行流水原始说法</div>
      ${tx ? `
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">流水号</span><span class="detail-value">${tx.id}</span></div>
          <div class="detail-item"><span class="detail-label">交易日期</span><span class="detail-value">${tx.bankDate}</span></div>
          <div class="detail-item"><span class="detail-label">对方账户</span><span class="detail-value">${Utils.escapeHtml(tx.counterparty)}</span></div>
          <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(tx.amount)}</span></div>
          <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">银行原始摘要</span><span class="detail-value">${Utils.escapeHtml(tx.summary)}</span></div>
          <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">系统备注（含补录）</span><span class="detail-value">${tx.remark ? '<span class="change-highlight">' + Utils.escapeHtml(tx.remark) + '</span>' : '（空）'}</span></div>
        </div>
      ` : '无'}
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">截图说明（处理结果）</div>
      ${ap.screenshots && ap.screenshots.length > 0 ? ap.screenshots.map(ss => `
        <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px">
          <div class="screenshot-placeholder">📷 ${Utils.escapeHtml(ss.description)}</div>
          <div style="font-size:13px"><strong>截图：</strong>${Utils.escapeHtml(ss.description)}</div>
          <div style="font-size:13px;margin-top:4px"><strong>处理结果：</strong>${Utils.escapeHtml(ss.processingResult)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">${DataStore.fmtDate(ss.uploadedAt)} · ${Utils.escapeHtml(ss.uploadedBy)}</div>
        </div>
      `).join('') : '<div style="color:#9ca3af;font-size:13px">暂无截图</div>'}
      <div class="modal-footer">
        <button class="btn" data-action="close">关闭</button>
        <button class="btn btn-primary" data-action="goto-approval" data-id="${ap.id}">查看完整审批详情</button>
        <button class="btn btn-warning" data-action="goto-tx" data-id="${tx ? tx.id : ''}">查看银行流水</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn && !e.target.classList.contains('close-btn')) return;
      const a = btn ? btn.dataset.action : (e.target.classList.contains('close-btn') ? 'close' : '');
      if (a === 'close') Utils.closeModal();
      if (a === 'goto-approval') {
        Utils.closeModal();
        App.switchView('approvals', { highlight: btn.dataset.id });
      }
      if (a === 'goto-tx' && btn.dataset.id) {
        Utils.closeModal();
        App.switchView('transactions');
      }
    });
  }

  function renderImpactList(ap, tx, audits) {
    const items = [];
    const jh = ap.judgmentHistory || [];
    const ah = ap.approverHistory || [];
    const rh = tx ? (tx.remarkHistory || []) : [];

    if (jh.length > 1) {
      const first = jh[0];
      const last = jh[jh.length - 1];
      items.push(`<li>审批判断经过 <strong>${jh.length}</strong> 次修改："${first.newJudgment.substring(0, 20)}..." → "${last.newJudgment.substring(0, 20)}..."</li>`);
    }
    if (ah.length > 0) {
      items.push(`<li>审批人发生 <strong>${ah.length}</strong> 次变更（来源行已记录）</li>`);
    }
    if (rh.length > 0) {
      items.push(`<li>银行流水补录备注 <strong>${rh.length}</strong> 次，触发审批判断调整</li>`);
    }
    if (ap.approvalStatus === 'modified') {
      items.push(`<li>审批状态为"已调整"：该笔金额 <strong>${DataStore.fmtAmount(ap.prepaidAmount)}</strong> 不计入本月有效预付款汇总</li>`);
    } else {
      items.push(`<li>对汇总的贡献：预付款笔数 +1，金额 +${DataStore.fmtAmount(ap.prepaidAmount)}</li>`);
    }
    audits.forEach(a => {
      if (a.impactScope && a.impactScope.length) {
        a.impactScope.forEach(i => items.push(`<li>${Utils.escapeHtml(i)}</li>`));
      }
    });
    const unique = [];
    const seen = new Set();
    items.forEach(i => { if (!seen.has(i)) { seen.add(i); unique.push(i); } });
    return unique.join('');
  }

  return { render, refresh };
})();
