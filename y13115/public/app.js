const API = '/api';

const STATUS_LABEL = {
  correct: '正确',
  wrong: '错误',
  rejudged: '已改判',
  pending: '待处理',
  withdrawn: '已撤回',
};

const OPERATOR_LABEL = {
  system: '系统',
  teacher_ye: '老叶(叶老师)',
  auto_grader: '自动判分',
};

const OP_TYPE_LABEL = {
  create: '创建错题',
  judge: '自动判分',
  rejudge: '人工改判',
  add_note: '添加备注',
  update_note: '更新备注',
  withdraw: '撤回判断',
  recalculate: '撤回复算',
  extrapolation_check: '越界检测',
};

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

function $(id) { return document.getElementById(id); }

function statusBadge(status, isTemporary) {
  let html = `<span class="status-badge status-${status}">${STATUS_LABEL[status] || status}</span>`;
  if (isTemporary) html += `<span class="status-badge status-temp">临时</span>`;
  return html;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

async function loadStats() {
  const r = await api(`${API}/stats`);
  if (!r.success) return;
  const s = r.data;
  $('statTotal').textContent = s.totalWrongQuestions;
  $('statJudgments').textContent = s.totalJudgments;
  $('statNotes').textContent = s.totalNotes;
  $('statAlerts').textContent = s.totalAlerts;
  $('statTemp').textContent = s.temporaryDecisions;

  $('chartCorrect').textContent = s.chart.correct;
  $('chartWrong').textContent = s.chart.wrong;
  $('chartPending').textContent = s.chart.pending;
  $('detailCorrect').textContent = s.detail.correct;
  $('detailWrong').textContent = s.detail.wrong;
  $('detailPending').textContent = s.detail.pending;

  const consistent =
    s.chart.correct === s.detail.correct &&
    s.chart.wrong === s.detail.wrong &&
    s.chart.pending === s.detail.pending;

  const el = $('consistencyResult');
  el.className = 'consistency-result ' + (consistent ? 'success' : 'fail');
  el.textContent = consistent ? '✅ 口径一致' : '❌ 口径不一致，请点击复算';
}

async function loadQuestions() {
  const r = await api(`${API}/wrong-questions`);
  if (!r.success) return;

  const html = r.data
    .map((item) => renderQuestionCard(item))
    .join('');
  $('questionsList').innerHTML = html || '<div class="empty-state">暂无错题数据</div>';

  r.data.forEach((item) => bindQuestionActions(item));
}

function renderQuestionCard(item) {
  const wq = item.wrongQuestion;
  const lj = item.latestJudgment;
  const unitMismatch = wq.unitInAnswer !== wq.standardUnit;

  let historyHtml = '';
  if (item.judgmentCount > 0) {
    historyHtml = `
      <div class="history-section">
        <h4>📜 判题历史（${item.judgmentCount} 条）</h4>
        <div class="history-timeline">
          ${getJudgmentHistoryHtml(wq.id)}
        </div>
      </div>
    `;
  }

  let notesHtml = '';
  if (item.notes.length > 0) {
    notesHtml = `
      <div class="notes-section">
        <h4>📝 老师备注（${item.notes.length} 条）</h4>
        ${item.notes
          .map(
            (n) => `
          <div class="note-card" data-note-id="${n.id}">
            <div class="note-operator">${OPERATOR_LABEL[n.operator] || n.operator} · ${formatTime(n.createdAt)}</div>
            <div class="note-content">${n.content}</div>
            <div class="note-impact" data-impact="${n.id}">
              ${n.affectedJudgmentIds.length > 0 ? `已影响 ${n.affectedJudgmentIds.length} 次改判` : '尚未影响任何判断'}
              <button class="btn btn-outline btn-sm" data-action="showImpact" data-note-id="${n.id}">查看影响详情</button>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  }

  let alertsHtml = '';
  if (item.extrapolationAlerts.length > 0) {
    alertsHtml = `
      <div class="alerts-section">
        <h4>⚠️ 外推越界告警（${item.extrapolationAlerts.length} 条）</h4>
        ${item.extrapolationAlerts
          .map(
            (a) => `
          <div class="alert-card ${a.severity}">
            <div class="alert-header">
              <span class="alert-severity ${a.severity}">${a.severity === 'critical' ? '严重' : '警告'}</span>
              <span class="alert-meta">来源行: <strong>${a.sourceLine}</strong> · ${formatTime(a.detectedAt)}</span>
            </div>
            <div class="alert-formula">公式: ${a.formula}</div>
            <div class="alert-meta">
              取值范围: [${a.inputRange[0]}, ${a.inputRange[1]}] · 实际输入: <strong style="color:#dc2626">${a.actualInput}</strong>
            </div>
            <div class="alert-scope">
              <div class="alert-scope-label">影响范围:</div>
              <ul class="alert-scope-list">
                ${a.impactScope.map((s) => `<li>${s}</li>`).join('')}
              </ul>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  }

  return `
    <div class="question-card" data-wq-id="${wq.id}">
      <div class="question-header">
        <div>
          <span class="question-id">${wq.questionId}</span>
          <span class="student-name">${wq.studentName}</span>
          <span class="question-meta">(${wq.studentId})</span>
        </div>
        <div>
          ${lj ? statusBadge(lj.status, lj.isTemporary) : '<span class="status-badge status-pending">待处理</span>'}
        </div>
      </div>

      <div class="question-text">${wq.questionText}</div>

      <div class="answer-row">
        <div>
          <div class="answer-label">学生答案</div>
          <div class="answer-value">${wq.studentAnswer}</div>
          <div class="answer-label" style="margin-top:4px">使用公式: ${wq.formulaUsed}</div>
        </div>
        <div>
          <div class="answer-label">标准答案</div>
          <div class="answer-value">${wq.standardAnswer} ${wq.standardUnit}</div>
        </div>
        <div>
          <div class="answer-label">单位对比</div>
          <div class="answer-value">
            <span class="${unitMismatch ? 'answer-unit-mismatch' : 'answer-unit-match'}">
              学生: "${wq.unitInAnswer}" vs 标准: "${wq.standardUnit}"
              ${unitMismatch ? ' ⚠️不一致' : ' ✅一致'}
            </span>
          </div>
          ${lj ? `<div class="answer-label" style="margin-top:4px">得分: ${lj.score} 分</div>` : ''}
        </div>
      </div>

      ${historyHtml}
      ${notesHtml}
      ${alertsHtml}

      <div class="card-actions">
        <button class="btn btn-outline" data-action="addNote" data-wq-id="${wq.id}">📝 添加备注</button>
        <button class="btn btn-warn" data-action="rejudge" data-wq-id="${wq.id}">🔄 改判</button>
        <button class="btn btn-danger" data-action="withdraw" data-wq-id="${wq.id}" data-judgment-id="${lj ? lj.id : ''}">↩️ 撤回最新判断</button>
        <button class="btn btn-outline" data-action="checkExtrapolation" data-wq-id="${wq.id}">🔍 外推越界检测</button>
      </div>
    </div>
  `;
}

function getJudgmentHistoryHtml(wqId) {
  const cached = window.__judgmentHistory || {};
  const list = cached[wqId] || [];
  if (list.length === 0) return '<div style="font-size:12px;color:#9ca3af">历史延迟加载中...</div>';

  return list
    .map(
      (j) => `
      <div class="history-item">
        <div>
          <span class="history-operator">${OPERATOR_LABEL[j.operator] || j.operator}</span>
          <span class="history-time">${formatTime(j.operatedAt)}</span>
          ${j.isTemporary ? '<span class="status-badge status-temp">临时判断</span>' : ''}
        </div>
        <div class="history-status">
          ${j.previousStatus ? `${STATUS_LABEL[j.previousStatus]} → ` : ''}
          <strong>${STATUS_LABEL[j.status]}</strong>
          ${j.previousScore !== undefined ? `（得分 ${j.previousScore} → ${j.score}）` : `（得分 ${j.score}）`}
        </div>
        ${j.comment ? `<div class="history-comment">💬 ${j.comment}</div>` : ''}
        ${
          j.sources.length > 0
            ? `<div class="history-sources">
               ${j.sources
                 .map(
                   (s) => `
                 <div class="history-source">
                   <strong>[${sourceTypeLabel(s.type)}]</strong>
                   ${s.description}
                   ${s.lineNumber !== undefined ? ` <span class="line">(L${s.lineNumber})</span>` : ''}
                 </div>
               `,
                 )
                 .join('')}
             </div>`
            : ''
        }
      </div>
    `,
    )
    .join('');
}

function sourceTypeLabel(t) {
  return (
    {
      formula: '公式',
      unit_conversion: '单位换算',
      extrapolation: '外推',
      manual: '人工',
      note: '备注',
    }[t] || t
  );
}

function bindQuestionActions(item) {
  const wqId = item.wrongQuestion.id;
  const card = document.querySelector(`[data-wq-id="${wqId}"]`);
  if (!card) return;

  loadHistoryFor(wqId);

  card.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      if (action === 'addNote') openAddNoteModal(wqId);
      if (action === 'rejudge') openRejudgeModal(wqId);
      if (action === 'withdraw') {
        const jid = e.currentTarget.dataset.judgmentId;
        if (jid) doWithdraw(jid);
      }
      if (action === 'checkExtrapolation') doExtrapolationCheck(wqId);
      if (action === 'showImpact') {
        const nid = e.currentTarget.dataset.noteId;
        showNoteImpact(nid);
      }
    });
  });
}

async function loadHistoryFor(wqId) {
  const r = await api(`${API}/wrong-questions/${wqId}/history`);
  if (!r.success) return;
  window.__judgmentHistory = window.__judgmentHistory || {};
  window.__judgmentHistory[wqId] = r.data;

  const timeline = document.querySelector(`[data-wq-id="${wqId}"] .history-timeline`);
  if (timeline) timeline.innerHTML = getJudgmentHistoryHtml(wqId);
}

function openModal(html) {
  const root = $('modalRoot');
  root.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${html}</div></div>`;
  $('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
}

function closeModal() {
  $('modalRoot').innerHTML = '';
}

function openAddNoteModal(wqId) {
  openModal(`
    <h2>📝 添加错题备注</h2>
    <div class="form-group">
      <label>备注内容</label>
      <textarea id="noteContent" placeholder="例如：单位"种"与"个"在此题语义等价，数值正确即判对..."></textarea>
    </div>
    <div class="form-group">
      <label>操作人</label>
      <select id="noteOperator">
        <option value="teacher_ye">老叶(叶老师)</option>
        <option value="system">系统</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" id="btnSubmitNote">提交备注</button>
    </div>
  `);
  $('btnSubmitNote').addEventListener('click', async () => {
    const content = $('noteContent').value.trim();
    const operator = $('noteOperator').value;
    if (!content) return alert('请填写备注内容');
    const r = await api(`${API}/wrong-questions/${wqId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, operator }),
    });
    if (r.success) {
      closeModal();
      await refreshAll();
      alert('备注已添加，接下来可以基于此备注进行改判');
    } else {
      alert(r.error || '添加失败');
    }
  });
}

function openRejudgeModal(wqId) {
  openModal(`
    <h2>🔄 改判错题</h2>
    <div class="form-group">
      <label>新状态</label>
      <select id="rjStatus">
        <option value="correct">正确</option>
        <option value="wrong">错误</option>
        <option value="rejudged">已改判</option>
      </select>
    </div>
    <div class="form-group">
      <label>新得分</label>
      <input type="number" id="rjScore" value="5" min="0" max="10" step="0.5" />
    </div>
    <div class="form-group">
      <label>操作人</label>
      <select id="rjOperator">
        <option value="teacher_ye">老叶(叶老师)</option>
        <option value="system">系统</option>
      </select>
    </div>
    <div class="form-group">
      <label>改判说明（comment）</label>
      <input type="text" id="rjComment" placeholder="例如：根据备注N_* 单位等价改判" />
    </div>
    <div class="form-group">
      <label>来源描述</label>
      <input type="text" id="rjSource" placeholder="例如：人工复核：单位差异不影响计数正确性" />
    </div>
    <div class="form-group checkbox-row">
      <input type="checkbox" id="rjTemporary" />
      <label for="rjTemporary">标记为临时判断（保留历史，不让下一班只看到最终结果）</label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" id="btnSubmitRj">提交改判</button>
    </div>
  `);
  $('btnSubmitRj').addEventListener('click', async () => {
    const body = {
      newStatus: $('rjStatus').value,
      newScore: parseFloat($('rjScore').value),
      operator: $('rjOperator').value,
      comment: $('rjComment').value,
      isTemporary: $('rjTemporary').checked,
      sources: [
        {
          type: 'manual',
          id: 'MANUAL_' + Date.now().toString(36),
          description: $('rjSource').value || '人工改判',
        },
      ],
      noteIds: [],
    };
    const r = await api(`${API}/wrong-questions/${wqId}/rejudge`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (r.success) {
      closeModal();
      await refreshAll();
      alert(`改判成功，ID: ${r.data.judgment.id.slice(0, 12)}...\n来源: ${r.data.judgment.sources.map((s) => `[${sourceTypeLabel(s.type)}] ${s.description}`).join('; ')}`);
    } else {
      alert(r.error || '改判失败');
    }
  });
}

async function doWithdraw(judgmentId) {
  if (!confirm(`确定要撤回判断 ${judgmentId.slice(0, 12)}...？`)) return;
  const r = await api(`${API}/judgments/${judgmentId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ operator: 'teacher_ye' }),
  });
  if (r.success) {
    await refreshAll();
    alert('已撤回。点击"立即复算校验"可验证图表明细一致性。');
  } else {
    alert(r.error || '撤回失败');
  }
}

async function doExtrapolationCheck(wqId) {
  const r = await api(`${API}/wrong-questions/${wqId}/extrapolation-check`, {
    method: 'POST',
  });
  if (r.success) {
    await refreshAll();
    if (r.data.alert) {
      alert(
        `检测到外推越界告警\n来源行: L${r.data.alert.sourceLine}\n实际输入: ${r.data.alert.actualInput}\n影响 ${r.data.alert.impactScope.length} 个指标`,
      );
    } else {
      alert('未检测到越界');
    }
  } else {
    alert(r.error || '检测失败');
  }
}

async function showNoteImpact(noteId) {
  const r = await api(`${API}/notes/${noteId}/impact`);
  if (!r.success) return alert(r.error || '加载失败');
  const d = r.data;
  openModal(`
    <h2>📊 备注影响分析</h2>
    <div style="background:#fef3c7;padding:12px;border-radius:6px;margin-bottom:12px">
      <strong>${d.summary}</strong>
    </div>
    <div class="delivery-section">
      <h3>备注原文</h3>
      <div class="note-content">${d.note.content}</div>
    </div>
    <div class="delivery-section">
      <h3>改变的判断（${d.changedJudgments.length}）</h3>
      ${
        d.changedJudgments.length > 0
          ? d.changedJudgments
              .map(
                (c) => `
            <div style="padding:8px;background:#f9fafb;border-radius:4px;margin-bottom:6px">
              <strong>${STATUS_LABEL[c.before.status]} (${c.before.score}分)</strong>
              → <strong style="color:#4f46e5">${STATUS_LABEL[c.after.status]} (${c.after.score}分)</strong>
              <div style="font-size:12px;color:#6b7280;margin-top:4px">${c.after.comment || ''}</div>
            </div>
          `,
              )
              .join('')
          : '<div style="color:#9ca3af;font-size:13px">暂无</div>'
      }
    </div>
    <div class="delivery-section">
      <h3>影响学生</h3>
      <div>${d.affectedStudents.join('、') || '无'}</div>
    </div>
    <div class="delivery-section">
      <h3>影响题目</h3>
      <div>${d.affectedQuestions.join('、') || '无'}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">关闭</button>
    </div>
  `);
}

async function loadAlerts() {
  const r = await api(`${API}/extrapolation-alerts`);
  if (!r.success) return;
  $('alertsList').innerHTML =
    r.data.length === 0
      ? '<div class="empty-state">暂无外推越界告警</div>'
      : r.data
          .map(
            (a) => `
        <div class="alert-card ${a.severity}">
          <div class="alert-header">
            <div>
              <span class="alert-severity ${a.severity}">${a.severity === 'critical' ? '严重' : '警告'}</span>
              <span class="alert-meta" style="margin-left:8px">错题ID: ${a.wrongQuestionId.slice(0, 16)}...</span>
            </div>
            <span class="alert-meta">${a.resolved ? '✅已解决' : '⏳待处理'} · ${formatTime(a.detectedAt)}</span>
          </div>
          <div class="alert-formula">公式: ${a.formula}</div>
          <div class="alert-meta">
            来源行: <strong style="color:#dc2626">L${a.sourceLine}</strong>
            &nbsp;|&nbsp;
            取值范围: [${a.inputRange[0]}, ${a.inputRange[1]}]
            &nbsp;|&nbsp;
            实际输入: <strong style="color:#dc2626">${a.actualInput}</strong>
            &nbsp;|&nbsp;
            判题ID: ${a.judgmentId.slice(0, 16)}...
          </div>
          <div class="alert-scope">
            <div class="alert-scope-label">影响范围:</div>
            <ul class="alert-scope-list">
              ${a.impactScope.map((s) => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        </div>
      `,
          )
          .join('');
}

async function loadAudit() {
  const r = await api(`${API}/audit-log`);
  if (!r.success) return;
  $('auditList').innerHTML = `
    <table class="audit-table">
      <thead>
        <tr>
          <th>时间</th>
          <th>操作类型</th>
          <th>操作人</th>
          <th>错题ID</th>
          <th>目标</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        ${r.data
          .map(
            (a) => `
          <tr>
            <td style="font-size:12px;color:#6b7280">${formatTime(a.timestamp)}</td>
            <td><span class="op-type op-${a.operationType}">${OP_TYPE_LABEL[a.operationType] || a.operationType}</span></td>
            <td><span class="operator-label">${OPERATOR_LABEL[a.operator] || a.operator}</span></td>
            <td style="font-family:monospace;font-size:11px">${a.wrongQuestionId.slice(0, 12)}...</td>
            <td style="font-family:monospace;font-size:11px">${a.targetId ? a.targetId.slice(0, 12) + '...' : '-'}</td>
            <td style="color:#4b5563;font-size:12px;max-width:240px">${a.note || '-'}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function verifyConsistency() {
  const r = await api(`${API}/wrong-questions`);
  if (!r.success || !r.data.length) return;

  const firstWq = r.data[0];
  const latestId = firstWq.latestJudgment ? firstWq.latestJudgment.id : '';
  if (!latestId) return alert('暂无判题记录可用于复算');

  const recalc = await api(`${API}/judgments/${latestId}/recalculate`, {
    method: 'POST',
  });
  if (!recalc.success) return;

  const d = recalc.data;
  $('recalcInfo').innerHTML = `
    <div>复算ID: ${d.recalculationId.slice(0, 16)}...</div>
    <div>撤回判断: ${d.withdrawnJudgmentId.slice(0, 16)}...</div>
    ${
      d.discrepancies.length > 0
        ? `<div style="color:#dc2626">差异: ${d.discrepancies.join('; ')}</div>`
        : '<div style="color:#059669">✅ 图表与明细口径完全一致</div>'
    }
    <div>时间: ${formatTime(d.recalculatedAt)}</div>
  `;

  await loadStats();
}

async function showDelivery() {
  const [statsR, questionsR, alertsR, auditR] = await Promise.all([
    api(`${API}/stats`),
    api(`${API}/wrong-questions`),
    api(`${API}/extrapolation-alerts`),
    api(`${API}/audit-log`),
  ]);

  const s = statsR.data;
  const qs = questionsR.data || [];
  const alerts = alertsR.data || [];
  const audit = auditR.data || [];

  const samples = qs.slice(0, 2);

  let noteImpactHtml = '';
  for (const q of qs) {
    for (const n of q.notes) {
      const imp = await api(`${API}/notes/${n.id}/impact`);
      if (imp.success) {
        noteImpactHtml += `
          <div style="padding:8px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 4px 4px 0;margin-bottom:6px">
            <div style="font-weight:600;font-size:13px;color:#92400e">${imp.data.note.content}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">${imp.data.summary}</div>
          </div>
        `;
      }
    }
  }

  openModal(`
    <div class="delivery-modal">
      <h2>📦 组合计数错题复盘 · 交付说明</h2>
      <p style="color:#6b7280;font-size:13px;margin-bottom:16px">
        本说明用于数学老师老叶向他人展示：学生错题、处理记录、截图说明
      </p>

      <div class="delivery-section">
        <h3>1️⃣ 总览</h3>
        <ul style="margin-left:18px;font-size:14px;color:#374151">
          <li>错题总数: <strong>${s.totalWrongQuestions}</strong></li>
          <li>判题记录: <strong>${s.totalJudgments}</strong>（含临时改动 <strong>${s.temporaryDecisions}</strong> 条）</li>
          <li>老师备注: <strong>${s.totalNotes}</strong></li>
          <li>外推越界告警: <strong>${s.totalAlerts}</strong></li>
          <li>图表明细一致性: <strong>${s.chart.correct === s.detail.correct && s.chart.wrong === s.detail.wrong ? '✅一致' : '❌需复核'}</strong></li>
        </ul>
      </div>

      <div class="delivery-section">
        <h3>2️⃣ 典型学生错题示例</h3>
        ${samples
          .map(
            (q) => `
          <div style="padding:10px;background:#f9fafb;border-radius:6px;margin-bottom:8px">
            <div style="font-weight:600">${q.wrongQuestion.studentName}(${q.wrongQuestion.studentId}) · ${q.wrongQuestion.questionId}</div>
            <div style="margin:6px 0">${q.wrongQuestion.questionText}</div>
            <div style="font-size:13px">
              学生答案: <strong>${q.wrongQuestion.studentAnswer}</strong>
              &nbsp;|&nbsp;
              标准: <strong>${q.wrongQuestion.standardAnswer} ${q.wrongQuestion.standardUnit}</strong>
              &nbsp;|&nbsp;
              当前: ${q.latestJudgment ? statusBadge(q.latestJudgment.status, q.latestJudgment.isTemporary) : ''}
            </div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">单位: 学生"${q.wrongQuestion.unitInAnswer}" vs 标准"${q.wrongQuestion.standardUnit}" ${q.wrongQuestion.unitInAnswer !== q.wrongQuestion.standardUnit ? '⚠️' : '✅'}</div>
          </div>
        `,
          )
          .join('')}
      </div>

      <div class="delivery-section">
        <h3>3️⃣ 备注影响说明</h3>
        ${noteImpactHtml || '<div style="color:#9ca3af">暂无备注</div>'}
      </div>

      <div class="delivery-section">
        <h3>4️⃣ 外推越界告警（来源行 + 影响范围）</h3>
        ${
          alerts.length > 0
            ? alerts
                .map(
                  (a) => `
              <div style="padding:10px;background:#fff7ed;border-radius:6px;margin-bottom:8px">
                <div style="font-weight:600;color:#9a3412">
                  [${a.severity === 'critical' ? '严重' : '警告'}] 来源行 L${a.sourceLine}
                </div>
                <div style="font-size:13px;margin:4px 0">公式: <code style="background:#f3f4f6;padding:2px 6px">${a.formula}</code></div>
                <div style="font-size:13px">范围 [${a.inputRange[0]}, ${a.inputRange[1]}]，实际输入: <strong style="color:#dc2626">${a.actualInput}</strong></div>
                <div style="font-size:13px;margin-top:4px">影响范围: ${a.impactScope.join('；')}</div>
              </div>
            `,
                )
                .join('')
            : '<div style="color:#9ca3af">暂无告警</div>'
        }
      </div>

      <div class="delivery-section">
        <h3>5️⃣ 最近处理记录（截图可用）</h3>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:6px;text-align:left">时间</th>
              <th style="padding:6px;text-align:left">操作</th>
              <th style="padding:6px;text-align:left">操作人</th>
              <th style="padding:6px;text-align:left">说明</th>
            </tr>
          </thead>
          <tbody>
            ${audit
              .slice(0, 10)
              .map(
                (a) => `
              <tr style="border-bottom:1px solid #f3f4f6">
                <td style="padding:6px;color:#6b7280">${formatTime(a.timestamp)}</td>
                <td style="padding:6px"><span class="op-type op-${a.operationType}">${OP_TYPE_LABEL[a.operationType] || a.operationType}</span></td>
                <td style="padding:6px">${OPERATOR_LABEL[a.operator] || a.operator}</td>
                <td style="padding:6px;color:#4b5563">${a.note || '-'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="delivery-section">
        <h3>6️⃣ 截图位置指引</h3>
        <ol style="margin-left:18px;font-size:13px;color:#374151;line-height:1.8">
          <li><strong>顶部统计栏</strong>：展示总数、图表明细一致性状态</li>
          <li><strong>错题卡片</strong>：展示学生答案、单位对比、判题历史时间线、来源溯源</li>
          <li><strong>判题历史时间线</strong>：每条判断含操作人、前后状态、分数变化、来源（含行号）、备注关联</li>
          <li><strong>备注卡片</strong>："查看影响详情"按钮可展开"改变了哪些判断"</li>
          <li><strong>外推越界告警</strong>：展示来源行号、实际输入、影响范围列表</li>
          <li><strong>操作审计</strong>：全量操作记录，可导出作为处理凭证</li>
          <li><strong>立即复算校验</strong>：撤回复算后可验证图表明细是否同口径</li>
        </ol>
      </div>

      <div class="modal-actions">
        <button class="btn btn-outline" onclick="window.print()">🖨️ 打印 / 保存PDF</button>
        <button class="btn btn-primary" onclick="closeModal()">关闭</button>
      </div>
    </div>
  `);
}

async function refreshAll() {
  await Promise.all([loadStats(), loadQuestions(), loadAlerts(), loadAudit()]);
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

async function init() {
  initTabs();
  $('btnRefresh').addEventListener('click', refreshAll);
  $('btnDelivery').addEventListener('click', showDelivery);
  $('btnVerifyConsistency').addEventListener('click', verifyConsistency);
  await refreshAll();
}

window.closeModal = closeModal;
document.addEventListener('DOMContentLoaded', init);
