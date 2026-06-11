const TransactionsView = (function () {
  function render(container) {
    const txs = DataStore.getTransactions();

    const html = `
      <div class="card">
        <div class="card-title">
          银行流水列表
          <span class="badge">${txs.length} 条</span>
        </div>
        <div class="info-panel">
          <div class="info-panel-title">操作说明</div>
          <ul>
            <li>月底封账前如银行补录备注，点击"补录备注"同步到系统，系统会自动记录影响范围并关联审批判断变更</li>
            <li>点击流水行可查看关联审批、备注历史、变更审计</li>
            <li>标记<span class="tag tag-amber">已补备注</span>的行曾发生过备注补录，需注意相关审批判断</li>
          </ul>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>交易日期</th>
              <th>对方账户</th>
              <th>账号</th>
              <th>摘要</th>
              <th>金额</th>
              <th>系统备注</th>
              <th>关联审批</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${txs.map(tx => rowHtml(tx)).join('')}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
    bindEvents(container);
  }

  function rowHtml(tx) {
    const ap = DataStore.getApprovalByTransactionId(tx.id);
    const isChanged = tx.isSupplementRemark;
    const remarkCell = tx.remark
      ? `<span class="change-highlight">${Utils.escapeHtml(tx.remark)}</span>`
      : '<span style="color:#9ca3af">—</span>';
    const apCell = ap
      ? `<button class="link-btn" data-action="goto-approval" data-id="${ap.id}">${ap.id} · ${Utils.statusLabel(ap.approvalStatus)}</button>`
      : '<span style="color:#9ca3af">未关联</span>';
    const tag = isChanged ? ' <span class="tag tag-amber">已补备注</span>' : '';

    return `
      <tr class="${isChanged ? 'changed' : ''}">
        <td>${tx.bankDate}${tag}</td>
        <td>${Utils.escapeHtml(tx.counterparty)}</td>
        <td style="font-family:monospace">${Utils.escapeHtml(tx.counterpartyAccount)}</td>
        <td>${Utils.escapeHtml(tx.summary)}</td>
        <td class="amount positive">${DataStore.fmtAmount(tx.amount)}</td>
        <td>${remarkCell}</td>
        <td>${apCell}</td>
        <td>
          <button class="btn btn-sm" data-action="detail" data-id="${tx.id}">详情</button>
          <button class="btn btn-sm btn-warning" data-action="edit-remark" data-id="${tx.id}">补录备注</button>
        </td>
      </tr>
    `;
  }

  function bindEvents(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'detail') showDetail(id);
      if (action === 'edit-remark') openRemarkEditor(id);
      if (action === 'goto-approval') {
        App.switchView('approvals', { highlight: id });
      }
    });
  }

  function showDetail(txId) {
    const tx = DataStore.getTransactionById(txId);
    if (!tx) return;
    const ap = DataStore.getApprovalByTransactionId(txId);
    const audit = DataStore.getAuditLogsByEntity('transaction', txId);
    const rh = tx.remarkHistory || [];

    const approvalHtml = ap ? `
      <div class="detail-grid" style="margin-bottom:12px">
        <div class="detail-item"><span class="detail-label">审批单号</span><span class="detail-value">${ap.id}</span></div>
        <div class="detail-item"><span class="detail-label">当前状态</span><span class="detail-value">${Utils.statusLabel(ap.approvalStatus)}</span></div>
        <div class="detail-item"><span class="detail-label">审批人</span><span class="detail-value">${Utils.escapeHtml(ap.approver)}</span></div>
        <div class="detail-item"><span class="detail-label">预付款金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">当前审批判断</span><span class="detail-value">${Utils.escapeHtml(ap.judgment)}</span></div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" data-action="jump-ap" data-id="${ap.id}">查看审批详情</button>
      </div>
    ` : '<span style="color:#9ca3af">暂未关联审批记录</span>';

    const historyHtml = rh.length > 0 ? rh.map(r => `
      <div class="timeline-item warning">
        <div class="timeline-time">${DataStore.fmtDate(r.timestamp)} · ${Utils.escapeHtml(r.operator)}</div>
        <div class="timeline-title">补录银行备注</div>
        <div class="timeline-meta">
          原备注：<span class="diff-old">${r.oldRemark ? Utils.escapeHtml(r.oldRemark) : '（空）'}</span>
          → 新备注：<span class="diff-new">${Utils.escapeHtml(r.newRemark)}</span>
          ${r.reason ? `<div style="margin-top:6px">补录原因：${Utils.escapeHtml(r.reason)}</div>` : ''}
          ${r.impactScope && r.impactScope.length ? `<div style="margin-top:6px">影响范围：<ul style="margin-left:18px;margin-top:4px">${r.impactScope.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>
    `).join('') : '<div style="color:#9ca3af;font-size:13px">暂无备注历史</div>';

    const auditHtml = audit.length > 0 ? audit.map(a => `
      <div class="timeline-item danger">
        <div class="timeline-time">${DataStore.fmtDate(a.timestamp)} · ${Utils.escapeHtml(a.operator)}</div>
        <div class="timeline-title">${actionText(a.actionType)}</div>
        <div class="timeline-desc">${Utils.escapeHtml(a.reason || '')}</div>
        <div class="timeline-meta">
          <div>来源行：${Utils.escapeHtml(a.sourceLine || '—')}</div>
          <div style="margin-top:4px">变更：<span class="diff-old">${Utils.escapeHtml(a.oldValue || '（空）')}</span> → <span class="diff-new">${Utils.escapeHtml(a.newValue || '（空）')}</span></div>
          ${a.impactScope && a.impactScope.length ? `<div style="margin-top:6px">影响范围：<ul style="margin-left:18px;margin-top:4px">${a.impactScope.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>
    `).join('') : '<div style="color:#9ca3af;font-size:13px">暂无审计记录</div>';

    const html = `
      <div class="modal-header">
        <h3>银行流水详情 · ${tx.id}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="trace-path">
        <div class="trace-step">📄 银行流水 ${tx.id}</div>
        <span class="trace-arrow">→</span>
        <div class="trace-step">✅ 关联审批 ${ap ? ap.id : '无'}</div>
        <span class="trace-arrow">→</span>
        <div class="trace-step">📝 审计记录 ${audit.length} 条</div>
      </div>
      <div class="card-title" style="font-size:14px">基础信息</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">交易日期</span><span class="detail-value">${tx.bankDate}</span></div>
        <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(tx.amount)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">对方账户</span><span class="detail-value">${Utils.escapeHtml(tx.counterparty)} (${Utils.escapeHtml(tx.counterpartyAccount)})</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">摘要</span><span class="detail-value">${Utils.escapeHtml(tx.summary)}</span></div>
        <div class="detail-item"><span class="detail-label">银行备注</span><span class="detail-value">${tx.remark ? `<span class="change-highlight">${Utils.escapeHtml(tx.remark)}</span>` : '—'}</span></div>
        <div class="detail-item"><span class="detail-label">是否补录</span><span class="detail-value">${tx.isSupplementRemark ? '<span class="tag tag-amber">是</span>' : '否'}</span></div>
      </div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">关联审批</div>
      ${approvalHtml}
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">备注历史</div>
      <div class="timeline">${historyHtml}</div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">变更审计</div>
      <div class="timeline">${auditHtml}</div>
      <div class="modal-footer">
        <button class="btn" data-action="close">关闭</button>
        <button class="btn btn-warning" data-action="edit-remark" data-id="${tx.id}">补录备注</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'close' || e.target.classList.contains('close-btn')) Utils.closeModal();
      if (a === 'edit-remark') { Utils.closeModal(); openRemarkEditor(btn.dataset.id); }
      if (a === 'jump-ap') { Utils.closeModal(); App.switchView('approvals', { highlight: btn.dataset.id }); }
    });
  }

  function openRemarkEditor(txId) {
    const tx = DataStore.getTransactionById(txId);
    if (!tx) return;
    const ap = DataStore.getApprovalByTransactionId(txId);

    const defaultNewJudgment = ap
      ? `月底银行补录备注"${tx.remark || '（新备注内容）'}"，原判断"${ap.judgment.substring(0, 20)}${ap.judgment.length > 20 ? '...' : ''}"需要调整`
      : '';
    const defaultReason = ap
      ? `补录银行备注后，原审批判断不再适用；审批状态改为"已调整"，金额${ap.prepaidAmount ? DataStore.fmtAmount(ap.prepaidAmount) : ''}从本月预付款统计中扣除`
      : '';

    const apSection = ap ? `
      <div class="info-panel" style="background:#fef2f2;border-color:#fecaca;margin-top:12px">
        <div class="info-panel-title" style="color:#991b1b">⚠️ 本流水已关联审批，请同步修改审批判断</div>
        <ul>
          <li>不修改：流水备注更新，但审批判断、汇总数字不变（仅留痕备查）</li>
          <li>同步修改（推荐）：系统自动写入审批 judgmentHistory、调整 approvalStatus、新增审计日志；汇总统计会实时变化</li>
        </ul>
      </div>
      <div class="detail-grid" style="margin:12px 0 8px 0">
        <div class="detail-item"><span class="detail-label">关联审批单号</span><span class="detail-value">${ap.id}</span></div>
        <div class="detail-item"><span class="detail-label">预付金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</span></div>
        <div class="detail-item"><span class="detail-label">当前审批状态</span><span class="detail-value">${Utils.statusLabel(ap.approvalStatus)}</span></div>
        <div class="detail-item"><span class="detail-label">判断历史版本</span><span class="detail-value">${ap.judgmentHistory.length} 版</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">当前审批判断</span><span class="detail-value" style="font-size:13px">${Utils.escapeHtml(ap.judgment)}</span></div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="syncApprovalCheck" checked>
          <strong>同步修改关联审批（推荐勾选）</strong>
        </label>
      </div>
      <div id="apSyncFields">
        <div class="form-row">
          <div class="form-group">
            <label>新审批状态</label>
            <select id="newStatusSelect">
              <option value="">不修改</option>
              <option value="approved">已通过</option>
              <option value="pending">待审批</option>
              <option value="modified" ${ap.approvalStatus !== 'modified' ? 'selected' : ''}>已调整（月底补录通常选此项）</option>
              <option value="rejected">已拒绝</option>
            </select>
            <div class="form-hint">选"已调整"则该笔金额从本月预付款汇总中扣除</div>
          </div>
          <div class="form-group">
            <label>当前状态对比</label>
            <div style="padding:8px 12px;background:#f9fafb;border-radius:4px;font-size:13px">
              原状态：${Utils.statusLabel(ap.approvalStatus)}
              <span style="margin:0 6px">→</span>
              新状态：<span id="newStatusPreview">${Utils.statusLabel('modified')}</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>新审批判断（会写入 judgmentHistory，不覆盖原判断）</label>
          <textarea id="newJudgmentInput" placeholder="请输入新的审批判断结论。原判断不会被删除，会完整保留在历史版本中。">${Utils.escapeHtml(defaultNewJudgment)}</textarea>
          <div class="form-hint">接手同事可在审批详情的"判断历史"时间线中看到两个版本的完整对比</div>
        </div>
        <div class="form-group">
          <label>审批判断修改原因（写入审计日志）</label>
          <textarea id="apReasonInput" placeholder="说明为什么银行补录备注导致审批判断需要修改。例如：月底银行补录"结清5月货款"，原按6月预付款审批，实际为5月尾款核销。">${Utils.escapeHtml(defaultReason)}</textarea>
          <div class="form-hint">此内容会出现在"汇总→追溯变化"的影响说明中，是交接的关键依据</div>
        </div>
      </div>
    ` : `
      <div class="info-panel" style="margin-top:12px">
        <div class="info-panel-title">ℹ️ 本流水暂未关联审批记录</div>
        <ul>
          <li>仅补录流水备注即可，不会触发审批判断联动</li>
          <li>后续创建审批时可关联到此流水</li>
        </ul>
      </div>
    `;

    const html = `
      <div class="modal-header">
        <h3>补录银行流水备注 · ${tx.id}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="info-panel">
        <div class="info-panel-title">📋 补录备注数据流</div>
        <ul>
          <li>① 写入银行流水 remark 和 remarkHistory（历史版本留痕）</li>
          <li>② 生成 remark_supplement 审计日志（含影响范围）</li>
          <li>③ 若勾选同步修改 → 写入审批 judgmentHistory + 调整 approvalStatus + 生成 judgment_change 审计日志</li>
          <li>④ 汇总统计页面数字自动变化，追溯弹窗可解释"为什么变了"</li>
        </ul>
      </div>
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><span class="detail-label">对方账户</span><span class="detail-value">${Utils.escapeHtml(tx.counterparty)}</span></div>
        <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(tx.amount)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">原备注</span><span class="detail-value">${tx.remark ? Utils.escapeHtml(tx.remark) : '（空）'}</span></div>
      </div>
      <div class="form-group">
        <label>银行补录备注内容 *</label>
        <input type="text" id="remarkInput" placeholder="例如：结清5月货款、保证金退回、上年尾款核销等">
      </div>
      <div class="form-group">
        <label>流水备注补录原因</label>
        <textarea id="reasonInput" placeholder="说明银行为何月底补录该备注，例如：银行月底统一补录对账单摘要；收到供应商确认函说明此款性质为尾款等"></textarea>
      </div>
      ${apSection}
      <div class="modal-footer">
        <button class="btn" data-action="cancel">取消</button>
        <button class="btn btn-primary" data-action="save">保存补录（含联动修改）</button>
      </div>
    `;
    Utils.showModal(html);

    const syncCheck = document.getElementById('syncApprovalCheck');
    const syncFields = document.getElementById('apSyncFields');
    const statusSelect = document.getElementById('newStatusSelect');
    const statusPreview = document.getElementById('newStatusPreview');
    if (syncCheck && syncFields) {
      const toggleFields = () => {
        syncFields.style.display = syncCheck.checked ? 'block' : 'none';
      };
      syncCheck.addEventListener('change', toggleFields);
      toggleFields();
    }
    if (statusSelect && statusPreview) {
      statusSelect.addEventListener('change', () => {
        const v = statusSelect.value;
        statusPreview.innerHTML = v ? Utils.statusLabel(v) : '<span style="color:#9ca3af">（不修改）</span>';
      });
    }

    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'cancel' || e.target.classList.contains('close-btn')) Utils.closeModal();
      if (btn.dataset.action === 'save') {
        const remark = document.getElementById('remarkInput').value.trim();
        const reason = document.getElementById('reasonInput').value.trim();
        if (!remark) { Utils.showToast('请输入银行补录备注内容', 'warning'); return; }

        const opts = { reason };

        if (ap) {
          const syncChecked = document.getElementById('syncApprovalCheck').checked;
          if (syncChecked) {
            const newStatus = document.getElementById('newStatusSelect').value || null;
            const newJudgment = document.getElementById('newJudgmentInput').value.trim();
            const apReason = document.getElementById('apReasonInput').value.trim();
            if (!newJudgment) { Utils.showToast('请填写新的审批判断', 'warning'); return; }
            if (!apReason) { Utils.showToast('请填写审批判断修改原因（会写入审计日志）', 'warning'); return; }
            opts.syncApproval = true;
            opts.approvalNewStatus = newStatus;
            opts.approvalNewJudgment = newJudgment;
            opts.approvalJudgmentReason = apReason;
          } else {
            opts.syncApproval = false;
          }
        }

        const result = DataStore.updateTransactionRemark(txId, remark, opts);
        if (result) {
          Utils.closeModal();
          const parts = [`流水备注已补录`];
          if (result.audit) parts.push(`审计日志：${result.audit.impactScope.length}项影响`);
          if (result.approvalUpdate) {
            parts.push(`审批判断已更新：${result.approvalUpdate.ap.judgmentHistory.length}版历史`);
            if (result.approvalUpdate.audit) parts.push(`审批审计日志已生成`);
          } else if (ap && !opts.syncApproval) {
            parts.push(`⚠️ 未同步修改审批（按你勾选的"不修改"）`);
          }
          Utils.showToast(parts.join('；'), 'success', 3500);
          render(document.getElementById('view-transactions'));
          if (App.getCurrentView() === 'summary') SummaryView.refresh();
          if (App.getCurrentView() === 'audit') AuditView.refresh();
          if (App.getCurrentView() === 'approvals') ApprovalsView.render(document.getElementById('view-approvals'));
        }
      }
    });
  }

  function actionText(type) {
    const m = {
      'remark_supplement': '银行备注补录',
      'judgment_change': '审批判断变更',
      'approver_change': '审批人变更',
      'status_change': '审批状态变更'
    };
    return m[type] || type;
  }

  return { render };
})();
