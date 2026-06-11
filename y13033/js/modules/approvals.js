const ApprovalsView = (function () {
  let pendingHighlight = null;

  function render(container, options) {
    const approvals = DataStore.getApprovals();

    if (options && options.highlight) {
      pendingHighlight = options.highlight;
    }

    const html = `
      <div class="card">
        <div class="card-title">
          预付款审批记录
          <span class="badge">${approvals.length} 条</span>
        </div>
        <div class="info-panel">
          <div class="info-panel-title">操作说明</div>
          <ul>
            <li>点击"修改判断"可临时调整审批结论，所有历史版本都会完整保留，下一班同事能看到完整变更过程</li>
            <li>审批人改名（休产假、调岗等）后点击"变更审批人"，需填写来源依据，系统自动留存影响范围</li>
            <li>带<span class="tag tag-blue">已变更</span>标签的记录存在判断或审批人修改历史，可点详情查看时间线</li>
          </ul>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>审批单号</th>
              <th>供应商</th>
              <th>合同号</th>
              <th>预付金额</th>
              <th>审批人</th>
              <th>状态</th>
              <th>审批判断</th>
              <th>关联流水</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${approvals.map(ap => rowHtml(ap)).join('')}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
    bindEvents(container);

    if (pendingHighlight) {
      const row = container.querySelector(`tr[data-ap-id="${pendingHighlight}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.background = '#fef9c3';
        setTimeout(() => { row.style.background = ''; }, 3000);
      }
      pendingHighlight = null;
    }
  }

  function rowHtml(ap) {
    const tx = DataStore.getTransactionById(ap.transactionId);
    const changed = Utils.isChangedApproval(ap);
    const tag = changed ? ' <span class="tag tag-blue">已变更</span>' : '';
    const approverTag = ap.approverHistory && ap.approverHistory.length > 0 ? ' <span class="change-highlight">' + Utils.escapeHtml(ap.approver) + '</span>' : Utils.escapeHtml(ap.approver);
    const judgmentHtml = ap.judgmentHistory && ap.judgmentHistory.length > 1
      ? `<span class="change-highlight">${Utils.escapeHtml(ap.judgment)}</span> <span class="tag tag-amber">${ap.judgmentHistory.length}版</span>`
      : Utils.escapeHtml(ap.judgment);

    return `
      <tr data-ap-id="${ap.id}" class="${changed ? 'changed' : ''}">
        <td>${ap.id}${tag}</td>
        <td>${Utils.escapeHtml(ap.supplierName)}</td>
        <td style="font-family:monospace">${Utils.escapeHtml(ap.contractNo)}</td>
        <td class="amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</td>
        <td>${approverTag}</td>
        <td>${Utils.statusLabel(ap.approvalStatus)}</td>
        <td style="max-width:260px">${judgmentHtml}</td>
        <td>${tx ? `<button class="link-btn" data-action="goto-tx" data-id="${tx.id}">${tx.id} · ${tx.bankDate}</button>` : '—'}</td>
        <td>
          <button class="btn btn-sm" data-action="detail" data-id="${ap.id}">详情</button>
          <button class="btn btn-sm btn-warning" data-action="edit-judgment" data-id="${ap.id}">修改判断</button>
          <button class="btn btn-sm btn-primary" data-action="edit-approver" data-id="${ap.id}">变更审批人</button>
        </td>
      </tr>
    `;
  }

  function bindEvents(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      const id = btn.dataset.id;
      if (a === 'detail') showDetail(id);
      if (a === 'edit-judgment') openJudgmentEditor(id);
      if (a === 'edit-approver') openApproverEditor(id);
      if (a === 'goto-tx') {
        const tx = DataStore.getTransactionById(id);
        if (tx) App.switchView('transactions');
      }
    });
  }

  function showDetail(apId) {
    const ap = DataStore.getApprovalById(apId);
    if (!ap) return;
    const tx = DataStore.getTransactionById(ap.transactionId);
    const audit = DataStore.getAuditLogsByEntity('approval', apId);

    const txHtml = tx ? `
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">流水号</span><span class="detail-value">${tx.id}</span></div>
        <div class="detail-item"><span class="detail-label">交易日期</span><span class="detail-value">${tx.bankDate}</span></div>
        <div class="detail-item"><span class="detail-label">对方账户</span><span class="detail-value">${Utils.escapeHtml(tx.counterparty)}</span></div>
        <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(tx.amount)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">银行摘要/备注</span><span class="detail-value">${Utils.escapeHtml(tx.summary)}${tx.remark ? ' / <span class=\"change-highlight\">' + Utils.escapeHtml(tx.remark) + '</span>' : ''}</span></div>
      </div>
      <div style="margin-top:8px">
        <button class="btn btn-sm" data-action="jump-tx" data-id="${tx.id}">查看银行流水详情</button>
      </div>
    ` : '无';

    const jh = ap.judgmentHistory || [];
    const jhHtml = jh.map((j, idx) => {
      const isLatest = idx === jh.length - 1;
      const isChange = j.oldJudgment !== null;
      const cls = isLatest ? 'success' : (isChange ? 'warning' : '');
      return `
        <div class="timeline-item ${cls}">
          <div class="timeline-time">${DataStore.fmtDate(j.timestamp)} · ${Utils.escapeHtml(j.operator)}${isLatest ? ' · <span class="tag tag-green">当前版本</span>' : ''}</div>
          <div class="timeline-title">审批判断${isChange ? '修改' : '建立'}（版本 ${idx + 1}/${jh.length}）</div>
          <div class="timeline-meta">
            ${isChange ? `<div>原判断：<span class="diff-old">${Utils.escapeHtml(j.oldJudgment)}</span></div><div>新判断：<span class="diff-new">${Utils.escapeHtml(j.newJudgment)}</span></div>` : `<div>初始判断：<span class="diff-new">${Utils.escapeHtml(j.newJudgment)}</span></div>`}
            ${j.reason ? `<div style="margin-top:6px">原因说明：${Utils.escapeHtml(j.reason)}</div>` : ''}
            ${j.changedFields && j.changedFields.length ? `<div style="margin-top:6px">变更字段：<ul style="margin-left:18px;margin-top:4px">${j.changedFields.map(f => `<li>${Utils.escapeHtml(f)}</li>`).join('')}</ul></div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const ah = ap.approverHistory || [];
    const ahHtml = ah.length > 0 ? ah.map(a => `
      <div class="timeline-item danger">
        <div class="timeline-time">${DataStore.fmtDate(a.timestamp)} · ${Utils.escapeHtml(a.operator)}</div>
        <div class="timeline-title">审批人变更</div>
        <div class="timeline-meta">
          <div>原审批人：<span class="diff-old">${Utils.escapeHtml(a.oldApprover)}</span> → 新审批人：<span class="diff-new">${Utils.escapeHtml(a.newApprover)}</span></div>
          <div style="margin-top:6px">变更原因：${Utils.escapeHtml(a.reason || '—')}</div>
          <div style="margin-top:4px">来源依据：${Utils.escapeHtml(a.sourceLine || '—')}</div>
        </div>
      </div>
    `).join('') : '<div style="color:#9ca3af;font-size:13px">审批人未变更</div>';

    const ss = ap.screenshots || [];
    const ssHtml = ss.length > 0 ? ss.map(s => `
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px">
        <div class="screenshot-placeholder">📷 截图：${Utils.escapeHtml(s.description)}</div>
        <div style="font-size:13px"><strong>截图说明：</strong>${Utils.escapeHtml(s.description)}</div>
        <div style="font-size:13px;margin-top:4px"><strong>处理结果：</strong>${Utils.escapeHtml(s.processingResult)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">${DataStore.fmtDate(s.uploadedAt)} · ${Utils.escapeHtml(s.uploadedBy)}</div>
      </div>
    `).join('') : '<div style="color:#9ca3af;font-size:13px">暂无截图说明</div>';

    const auditHtml = audit.length > 0 ? audit.map(a => `
      <div class="timeline-item warning">
        <div class="timeline-time">${DataStore.fmtDate(a.timestamp)} · ${Utils.escapeHtml(a.operator)}</div>
        <div class="timeline-title">${actionText(a.actionType)}</div>
        <div class="timeline-desc">${Utils.escapeHtml(a.reason || '')}</div>
        <div class="timeline-meta">
          <div>来源：${Utils.escapeHtml(a.sourceLine || '—')}</div>
          <div style="margin-top:4px"><span class="diff-old">${Utils.escapeHtml(a.oldValue || '（空）')}</span> → <span class="diff-new">${Utils.escapeHtml(a.newValue || '（空）')}</span></div>
          ${a.impactScope && a.impactScope.length ? `<div style="margin-top:6px">影响范围：<ul style="margin-left:18px;margin-top:4px">${a.impactScope.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>
    `).join('') : '<div style="color:#9ca3af;font-size:13px">暂无审计记录</div>';

    const html = `
      <div class="modal-header">
        <h3>审批详情 · ${ap.id}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="trace-path">
        <div class="trace-step">📄 银行流水 ${tx ? tx.id : '无'}</div>
        <span class="trace-arrow">⇄</span>
        <div class="trace-step">📋 审批 ${ap.id}</div>
        <span class="trace-arrow">⇄</span>
        <div class="trace-step">🖼️ 截图说明 ${ss.length} 张</div>
        <span class="trace-arrow">⇄</span>
        <div class="trace-step">📝 变更历史 ${jh.length + ah.length} 条</div>
      </div>
      <div class="card-title" style="font-size:14px">审批信息</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">供应商</span><span class="detail-value">${Utils.escapeHtml(ap.supplierName)}</span></div>
        <div class="detail-item"><span class="detail-label">合同号</span><span class="detail-value mono">${Utils.escapeHtml(ap.contractNo)}</span></div>
        <div class="detail-item"><span class="detail-label">预付金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</span></div>
        <div class="detail-item"><span class="detail-label">审批状态</span><span class="detail-value">${Utils.statusLabel(ap.approvalStatus)}</span></div>
        <div class="detail-item"><span class="detail-label">当前审批人</span><span class="detail-value">${Utils.escapeHtml(ap.approver)}</span></div>
        <div class="detail-item"><span class="detail-label">创建人</span><span class="detail-value">${Utils.escapeHtml(ap.createdBy)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">付款事由</span><span class="detail-value">${Utils.escapeHtml(ap.paymentReason)}</span></div>
      </div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">关联银行流水</div>
      ${txHtml}
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">判断历史（共 ${jh.length} 个版本，所有修改均已留存）</div>
      <div class="timeline">${jhHtml}</div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">审批人变更历史</div>
      <div class="timeline">${ahHtml}</div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">截图说明</div>
      ${ssHtml}
      <div style="margin:8px 0">
        <button class="btn btn-sm btn-primary" data-action="add-screenshot" data-id="${ap.id}">+ 新增截图说明</button>
      </div>
      <div class="section-divider"></div>
      <div class="card-title" style="font-size:14px">变更审计日志</div>
      <div class="timeline">${auditHtml}</div>
      <div class="modal-footer">
        <button class="btn" data-action="close">关闭</button>
        <button class="btn btn-warning" data-action="edit-judgment" data-id="${ap.id}">修改判断</button>
        <button class="btn btn-primary" data-action="edit-approver" data-id="${ap.id}">变更审批人</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn && !e.target.classList.contains('close-btn')) return;
      const a = btn ? btn.dataset.action : (e.target.classList.contains('close-btn') ? 'close' : '');
      if (a === 'close') Utils.closeModal();
      if (a === 'edit-judgment') { Utils.closeModal(); openJudgmentEditor(btn.dataset.id); }
      if (a === 'edit-approver') { Utils.closeModal(); openApproverEditor(btn.dataset.id); }
      if (a === 'add-screenshot') { Utils.closeModal(); openScreenshotEditor(btn.dataset.id); }
      if (a === 'jump-tx') {
        Utils.closeModal();
        App.switchView('transactions');
        setTimeout(() => TransactionsView.render(document.getElementById('view-transactions')), 50);
      }
    });
  }

  function openJudgmentEditor(apId) {
    const ap = DataStore.getApprovalById(apId);
    if (!ap) return;

    const html = `
      <div class="modal-header">
        <h3>修改审批判断 · ${ap.id}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="info-panel">
        <div class="info-panel-title">⚠️ 所有历史版本将完整保留</div>
        <ul>
          <li>原判断不会被覆盖，修改前后都会出现在"判断历史"时间线中</li>
          <li>下一班同事能看到是谁、在什么时候、因为什么原因改了判断</li>
          <li>如果审批状态也发生变化（如 approved → modified），请同步选择新状态</li>
        </ul>
      </div>
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><span class="detail-label">供应商</span><span class="detail-value">${Utils.escapeHtml(ap.supplierName)}</span></div>
        <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value mono amount positive">${DataStore.fmtAmount(ap.prepaidAmount)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">当前判断（第 ${ap.judgmentHistory.length} 版）</span><span class="detail-value">${Utils.escapeHtml(ap.judgment)}</span></div>
        <div class="detail-item"><span class="detail-label">当前状态</span><span class="detail-value">${Utils.statusLabel(ap.approvalStatus)}</span></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>新审批状态</label>
          <select id="statusSelect">
            <option value="approved" ${ap.approvalStatus === 'approved' ? 'selected' : ''}>已通过</option>
            <option value="pending" ${ap.approvalStatus === 'pending' ? 'selected' : ''}>待审批</option>
            <option value="rejected" ${ap.approvalStatus === 'rejected' ? 'selected' : ''}>已拒绝</option>
            <option value="modified" ${ap.approvalStatus === 'modified' ? 'selected' : ''}>已调整</option>
          </select>
        </div>
        <div class="form-group">
          <label>本次修改触发来源</label>
          <input type="text" id="sourceInput" placeholder="如：银行补录备注、供应商来电等">
        </div>
      </div>
      <div class="form-group">
        <label>新审批判断</label>
        <textarea id="judgmentInput" placeholder="请输入新的审批判断结论"></textarea>
      </div>
      <div class="form-group">
        <label>修改原因 & 对汇总统计的影响</label>
        <textarea id="reasonInput" placeholder="说明为什么修改判断，以及这会改变哪些统计数字（例如：本月预付款金额减少X元，审批状态由通过改为已调整）。接手同事会依据此处说明理解变化。"></textarea>
        <div class="form-hint">此内容将出现在判断历史和审计日志中，是交接时的关键依据</div>
      </div>
      <div class="modal-footer">
        <button class="btn" data-action="cancel">取消</button>
        <button class="btn btn-primary" data-action="save">保存修改（保留历史）</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn && !e.target.classList.contains('close-btn')) return;
      const a = btn ? btn.dataset.action : (e.target.classList.contains('close-btn') ? 'cancel' : '');
      if (a === 'cancel') Utils.closeModal();
      if (a === 'save') {
        const judgment = document.getElementById('judgmentInput').value.trim();
        const status = document.getElementById('statusSelect').value;
        const reason = document.getElementById('reasonInput').value.trim();
        const source = document.getElementById('sourceInput').value.trim();
        if (!judgment) { Utils.showToast('请输入新判断', 'warning'); return; }
        if (!reason) { Utils.showToast('请填写修改原因和影响说明', 'warning'); return; }
        const fullReason = source ? `来源：${source}。${reason}` : reason;
        const result = DataStore.updateApprovalJudgment(apId, judgment, status, fullReason);
        if (result) {
          Utils.closeModal();
          Utils.showToast(`判断已更新，历史版本已留存（共${result.ap.judgmentHistory.length}版）`, 'success');
          render(document.getElementById('view-approvals'));
          if (App.getCurrentView() === 'summary') SummaryView.refresh();
          if (App.getCurrentView() === 'audit') AuditView.refresh();
        }
      }
    });
  }

  function openApproverEditor(apId) {
    const ap = DataStore.getApprovalById(apId);
    if (!ap) return;

    const html = `
      <div class="modal-header">
        <h3>变更审批人 · ${ap.id}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="info-panel">
        <div class="info-panel-title">⚠️ 变更需留痕</div>
        <ul>
          <li>必须填写来源依据（人事通知、邮件、审批单等），下一班同事需要溯源</li>
          <li>系统会自动记录影响范围，后续可在审计日志中检索</li>
        </ul>
      </div>
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><span class="detail-label">供应商</span><span class="detail-value">${Utils.escapeHtml(ap.supplierName)}</span></div>
        <div class="detail-item"><span class="detail-label">当前审批人</span><span class="detail-value">${Utils.escapeHtml(ap.approver)}</span></div>
      </div>
      <div class="form-group">
        <label>新审批人姓名</label>
        <input type="text" id="approverInput" placeholder="例如：王芳">
      </div>
      <div class="form-group">
        <label>变更原因</label>
        <input type="text" id="reasonInput" placeholder="例如：休产假、调岗、离职交接等">
      </div>
      <div class="form-group">
        <label>来源依据（来源行）</label>
        <input type="text" id="sourceInput" placeholder="例如：采购部人事通知-20260605、邮件主题xxx、审批单号xxx">
        <div class="form-hint">接手同事据此去原始凭证核对，务必填写准确</div>
      </div>
      <div class="modal-footer">
        <button class="btn" data-action="cancel">取消</button>
        <button class="btn btn-primary" data-action="save">保存变更</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn && !e.target.classList.contains('close-btn')) return;
      const a = btn ? btn.dataset.action : (e.target.classList.contains('close-btn') ? 'cancel' : '');
      if (a === 'cancel') Utils.closeModal();
      if (a === 'save') {
        const approver = document.getElementById('approverInput').value.trim();
        const reason = document.getElementById('reasonInput').value.trim();
        const source = document.getElementById('sourceInput').value.trim();
        if (!approver) { Utils.showToast('请输入新审批人', 'warning'); return; }
        if (!source) { Utils.showToast('请填写来源依据（来源行）', 'warning'); return; }
        const result = DataStore.updateApprover(apId, approver, reason, source);
        if (result) {
          Utils.closeModal();
          Utils.showToast('审批人已变更，影响范围已记录', 'success');
          render(document.getElementById('view-approvals'));
          if (App.getCurrentView() === 'audit') AuditView.refresh();
        }
      }
    });
  }

  function openScreenshotEditor(apId) {
    const html = `
      <div class="modal-header">
        <h3>新增截图说明</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="form-group">
        <label>截图说明</label>
        <input type="text" id="descInput" placeholder="描述截图内容，例如：银行回单-6月8日顺达化工补录备注">
      </div>
      <div class="form-group">
        <label>处理结果说明</label>
        <textarea id="resultInput" placeholder="基于该截图得出的处理结论，例如：银行月底补录备注\"结清5月货款\"，原预付款判定调整为应付尾款核销"></textarea>
        <div class="form-hint">交接测试时，接手同事通过此处说明理解处理结果</div>
      </div>
      <div class="modal-footer">
        <button class="btn" data-action="cancel">取消</button>
        <button class="btn btn-primary" data-action="save">保存</button>
      </div>
    `;
    Utils.showModal(html);
    Utils.bindModalClick((e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn && !e.target.classList.contains('close-btn')) return;
      const a = btn ? btn.dataset.action : (e.target.classList.contains('close-btn') ? 'cancel' : '');
      if (a === 'cancel') Utils.closeModal();
      if (a === 'save') {
        const desc = document.getElementById('descInput').value.trim();
        const result = document.getElementById('resultInput').value.trim();
        if (!desc || !result) { Utils.showToast('请填写截图说明和处理结果', 'warning'); return; }
        DataStore.addScreenshot(apId, desc, result);
        Utils.closeModal();
        Utils.showToast('截图说明已添加', 'success');
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
