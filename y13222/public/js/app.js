let currentPage = 1;
let pageSize = 10;
let currentStatus = 'all';
let currentKeyword = '';
let currentItemId = null;
let currentItemData = null;

const API_BASE = '/api';

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => {
    toast.className = 'toast';
  }, 2500);
}

function getStatusClass(status) {
  if (status && status.includes('待')) return 'status-pending';
  if (status && status.includes('已改判')) return 'status-changed';
  if (status && status.includes('冲突')) return 'status-conflict';
  if (status && status.includes('复核')) return 'status-review';
  if (status && status.includes('已')) return 'status-judged';
  return 'status-pending';
}

function getFileIcon(fileType) {
  switch (fileType) {
    case 'contract': return '📄';
    case 'screenshot': return '🖼️';
    case 'supplement': return '📝';
    default: return '📎';
  }
}

function getFileTypeName(fileType) {
  switch (fileType) {
    case 'contract': return '合同扫描件';
    case 'screenshot': return '截图说明';
    case 'supplement': return '后补说明';
    default: return '附件';
  }
}

function loadStats() {
  fetch(`${API_BASE}/stats`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('pendingBadge').textContent = data.pending;
      document.getElementById('conflictBadge').textContent = data.conflicts;
      document.getElementById('badDataBadge').textContent = data.badData;
    })
    .catch(err => console.error('加载统计失败:', err));
}

function showStats() {
  fetch(`${API_BASE}/stats`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('statTotal').textContent = data.total;
      document.getElementById('statJudged').textContent = data.judged;
      document.getElementById('statPending').textContent = data.pending;
      document.getElementById('statChanged').textContent = data.changed;
      document.getElementById('statConflicts').textContent = data.conflicts;
      document.getElementById('statBadData').textContent = data.badData;
      document.getElementById('statsModal').classList.add('show');
    });
}

function closeStatsModal() {
  document.getElementById('statsModal').classList.remove('show');
}

function loadList() {
  let url = `${API_BASE}/beat-items?page=${currentPage}&pageSize=${pageSize}`;
  if (currentStatus && currentStatus !== 'all') {
    url += `&status=${encodeURIComponent(currentStatus)}`;
  }
  if (currentKeyword) {
    url += `&keyword=${encodeURIComponent(currentKeyword)}`;
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      renderList(data.items);
      renderPagination(data.total, data.page, data.pageSize);
    })
    .catch(err => {
      console.error('加载列表失败:', err);
      document.getElementById('listBody').innerHTML = '<tr><td colspan="8" class="loading">加载失败，请刷新重试</td></tr>';
    });
}

function renderList(items) {
  const tbody = document.getElementById('listBody');

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${item.item_no}</td>
      <td>
        ${item.student_name}
        ${item.is_name_mismatch ? '<span class="status-badge status-pending" style="font-size:10px;padding:1px 6px;">名异</span>' : ''}
      </td>
      <td>
        ${item.piece_name}
        ${item.is_duplicate_alias ? '<span class="status-badge status-pending" style="font-size:10px;padding:1px 6px;">重名</span>' : ''}
      </td>
      <td>${item.beat_pattern}</td>
      <td>${item.difficulty}</td>
      <td><span class="status-badge ${getStatusClass(item.status)}">${item.status || '待判定'}</span></td>
      <td>${item.judge_result || '<span style="color:#bbb;">未判定</span>'}</td>
      <td>
        <a class="action-link" href="#" onclick="viewDetail(${item.id}, event)">详情</a>
        <a class="action-link" href="#" onclick="openJudgeFromList(${item.id}, event)">改判</a>
      </td>
    </tr>
  `).join('');
}

function renderPagination(total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize);
  const pagination = document.getElementById('pagination');

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i === page - 3 || i === page + 3) {
      html += '<span style="padding: 6px 4px;">...</span>';
    }
  }

  html += `<button class="page-btn" onclick="goPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>下一页</button>`;
  html += `<span style="margin-left:16px;color:#999;font-size:12px;">共 ${total} 条</span>`;

  pagination.innerHTML = html;
}

function goPage(page) {
  if (page < 1) return;
  currentPage = page;
  loadList();
}

function handleSearch(e) {
  if (e.key === 'Enter') {
    doSearch();
  }
}

function doSearch() {
  currentKeyword = document.getElementById('searchInput').value.trim();
  currentPage = 1;
  loadList();
}

function filterByStatus() {
  currentStatus = document.getElementById('statusFilter').value;
  currentPage = 1;
  loadList();
}

function showList(e) {
  if (e) e.preventDefault();
  document.getElementById('listView').style.display = 'block';
  document.getElementById('detailView').style.display = 'none';

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector('.nav-item:first-child').classList.add('active');

  currentStatus = 'all';
  currentKeyword = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('searchInput').value = '';
  currentPage = 1;
  loadList();
}

function showPendingList(e) {
  if (e) e.preventDefault();
  document.getElementById('listView').style.display = 'block';
  document.getElementById('detailView').style.display = 'none';

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  e.target.closest('.nav-item').classList.add('active');

  currentStatus = '待判定';
  document.getElementById('statusFilter').value = '待判定';
  currentPage = 1;
  loadList();
}

function showConflicts(e) {
  if (e) e.preventDefault();
  document.getElementById('listView').style.display = 'block';
  document.getElementById('detailView').style.display = 'none';

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  e.target.closest('.nav-item').classList.add('active');

  currentStatus = '版本冲突待处理';
  document.getElementById('statusFilter').value = '版本冲突待处理';
  currentPage = 1;
  loadList();
}

function showBadData(e) {
  if (e) e.preventDefault();

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  e.target.closest('.nav-item').classList.add('active');

  fetch(`${API_BASE}/bad-data`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('listView').style.display = 'block';
      document.getElementById('detailView').style.display = 'none';

      const tbody = document.getElementById('listBody');
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">暂无异常数据</td></tr>';
      } else {
        tbody.innerHTML = data.map(item => `
          <tr>
            <td>${item.item_no}</td>
            <td>${item.student_name}</td>
            <td>${item.piece_name}</td>
            <td colspan="2">${item.error_type === 'duplicate_alias' ? '曲名别名重复' : item.error_type === 'name_mismatch' ? '姓名不一致' : item.error_type}</td>
            <td><span class="status-badge status-conflict">异常</span></td>
            <td>${item.description ? item.description.substring(0, 30) + '...' : '-'}</td>
            <td>
              <a class="action-link" href="#" onclick="viewDetail(${item.beat_item_id}, event)">查看详情</a>
            </td>
          </tr>
        `).join('');
      }
      document.getElementById('pagination').innerHTML = `<span style="color:#999;font-size:12px;">共 ${data.length} 条异常记录</span>`;
    });
}

function viewDetail(id, e) {
  if (e) e.preventDefault();
  currentItemId = id;

  fetch(`${API_BASE}/beat-items/${id}`)
    .then(res => res.json())
    .then(data => {
      currentItemData = data;
      renderDetail(data);
      document.getElementById('listView').style.display = 'none';
      document.getElementById('detailView').style.display = 'block';
    })
    .catch(err => {
      console.error('加载详情失败:', err);
      showToast('加载详情失败', 'error');
    });
}

function renderDetail(data) {
  const item = data.item;

  document.getElementById('detailTitle').textContent = item.item_no + ' - ' + item.piece_name;

  document.getElementById('detailItemNo').textContent = item.item_no;
  document.getElementById('detailStudentName').textContent = item.student_name;
  document.getElementById('detailTeacherName').textContent = item.teacher_name;
  document.getElementById('detailPieceName').textContent = item.piece_name;
  document.getElementById('detailPieceAlias').textContent = item.piece_alias || '-';
  document.getElementById('detailBeatPattern').textContent = item.beat_pattern;
  document.getElementById('detailDifficulty').textContent = item.difficulty;

  const statusEl = document.getElementById('detailStatus');
  statusEl.textContent = item.status || '待判定';
  statusEl.className = 'status-badge ' + getStatusClass(item.status);

  document.getElementById('detailSourceVersion').textContent = item.source_version || '-';
  document.getElementById('detailContractRef').textContent = item.contract_ref || '-';

  document.getElementById('detailJudgeResult').textContent = item.judge_result || '未判定';
  document.getElementById('detailJudgeRemark').textContent = item.judge_remark || '暂无备注';
  document.getElementById('detailJudgeBy').textContent = item.judge_by || '-';
  document.getElementById('detailJudgeAt').textContent = item.judge_at || '-';

  const warningSection = document.getElementById('warningSection');
  const warningContent = document.getElementById('warningContent');
  let hasWarning = false;
  let warningHtml = '';

  if (item.is_duplicate_alias) {
    hasWarning = true;
    warningHtml += `
      <div class="warning-item">
        <div class="warning-title">⚠️ 曲名与别名重复</div>
        <div class="warning-desc">曲名"${item.piece_name}"与别名"${item.piece_alias}"完全一致，疑似重复录入或数据错误。建议核实原始合同扫描件。</div>
        <div class="warning-source">来源：合同第 ${item.contract_line_no || '-'} 行</div>
      </div>
    `;
  }

  if (item.is_name_mismatch) {
    hasWarning = true;
    warningHtml += `
      <div class="warning-item">
        <div class="warning-title">⚠️ 学生姓名不一致</div>
        <div class="warning-desc">合同扫描件上的学生姓名与系统记录不一致，请核实是否为同一人。处理结果备注中应有说明。</div>
        <div class="warning-source">来源：合同第 ${item.contract_line_no || '-'} 行 / 系统记录对比</div>
      </div>
    `;
  }

  if (hasWarning) {
    warningSection.style.display = 'block';
    warningContent.innerHTML = warningHtml;
  } else {
    warningSection.style.display = 'none';
  }

  const conflictSection = document.getElementById('versionConflictSection');
  const conflictContent = document.getElementById('versionConflictContent');

  if (data.versionConflict) {
    conflictSection.style.display = 'block';
    let newVerInfo = '';
    if (data.newVersionItem) {
      newVerInfo = `<a class="action-link" href="#" onclick="viewDetail(${data.newVersionItem.id}, event)">查看新版记录 →</a>`;
    }

    conflictContent.innerHTML = `
      <div class="conflict-info">
        <div class="conflict-versions">
          <div class="version-block old">
            <div class="version-title">📄 旧版 ${data.versionConflict.old_version_no}</div>
            <div class="version-meta">
              来源：${data.versionConflict.old_source}<br>
              状态：${item.status}<br>
              处理建议前请勿覆盖
            </div>
          </div>
          <div class="version-block new">
            <div class="version-title">📄 新版 ${data.versionConflict.new_version_no}</div>
            <div class="version-meta">
              来源：${data.versionConflict.new_source}<br>
              ${data.newVersionItem ? '状态：' + data.newVersionItem.status : ''}<br>
              ${newVerInfo}
            </div>
          </div>
        </div>
        <div class="conflict-diff">
          <strong>差异字段：</strong>${data.versionConflict.diff_fields}
        </div>
        <div class="conflict-suggestion">
          <strong>💡 处理建议：</strong>${data.versionConflict.suggestion}
        </div>
        ${data.versionConflict.resolved ? '' : `
        <div class="conflict-actions">
          <button class="btn btn-primary" onclick="resolveConflict(${data.versionConflict.id}, 'keep_new')">以新版为准</button>
          <button class="btn btn-ghost" onclick="resolveConflict(${data.versionConflict.id}, 'keep_old')">保留旧版</button>
        </div>
        `}
      </div>
    `;
  } else {
    conflictSection.style.display = 'none';
  }

  renderAttachments(data.attachments);
  renderHistory(data.history);

  const badDataSection = document.getElementById('badDataSection');
  const badDataList = document.getElementById('badDataList');
  if (data.badData && data.badData.length > 0) {
    badDataSection.style.display = 'block';
    badDataList.innerHTML = data.badData.map(bd => `
      <div class="bad-data-item">
        <div class="bad-data-type">🔍 ${bd.error_type === 'duplicate_alias' ? '曲名别名重复' : bd.error_type === 'name_mismatch' ? '姓名不一致' : bd.error_type}</div>
        <div class="bad-data-desc">${bd.description}</div>
        <div class="bad-data-original">原始行：${bd.original_line || '-'}</div>
        ${bd.original_object ? `<div class="bad-data-original">原始对象：${bd.original_object}</div>` : ''}
        <div class="bad-data-source">合同出处：第 ${bd.contract_page || '-'} 页 第 ${bd.contract_line || '-'} 行</div>
      </div>
    `).join('');
  } else {
    badDataSection.style.display = 'none';
  }
}

function renderAttachments(attachments) {
  const list = document.getElementById('attachmentsList');

  if (!attachments || attachments.length === 0) {
    list.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">暂无附件</div>';
    return;
  }

  list.innerHTML = attachments.map(att => `
    <div class="attachment-item">
      <div class="attachment-icon">${getFileIcon(att.file_type)}</div>
      <div class="attachment-info">
        <div class="attachment-name">${att.file_name}</div>
        <div class="attachment-desc">${att.description || '无描述'}</div>
        <div class="attachment-meta">上传人：${att.uploaded_by || '-'} · ${att.uploaded_at || ''}</div>
      </div>
      <span class="attachment-type-tag type-${att.file_type}">${getFileTypeName(att.file_type)}</span>
    </div>
  `).join('');
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  document.getElementById('historyCount').textContent = (history?.length || 0) + '条';

  if (!history || history.length === 0) {
    list.innerHTML = '<div style="color:#999;padding:20px 0 20px 20px;">暂无改判记录</div>';
    return;
  }

  list.innerHTML = history.map((h, index) => `
    <div class="history-item ${index > 0 ? 'change' : ''}">
      <div class="history-header">
        <div class="history-result">
          <span class="history-before">${h.before_result || '未判定'}</span>
          <span class="history-arrow">→</span>
          <span class="history-after">${h.after_result || '未判定'}</span>
        </div>
        <span class="history-time">${h.changed_at || ''}</span>
      </div>
      ${h.change_reason ? `<div class="history-reason">原因：${h.change_reason}</div>` : ''}
      ${h.after_remark ? `<div class="history-reason" style="margin-top:6px;">备注：${h.after_remark}</div>` : ''}
      <div class="history-operator">操作人：${h.changed_by || '系统'}</div>
    </div>
  `).join('');
}

function openJudgeFromList(id, e) {
  if (e) e.preventDefault();
  currentItemId = id;
  openJudgeModal();
}

function openJudgeModal() {
  if (!currentItemId) return;

  fetch(`${API_BASE}/beat-items/${currentItemId}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('judgeResultSelect').value = data.item.judge_result || '通过';
      document.getElementById('judgeRemarkTextarea').value = data.item.judge_remark || '';
      document.getElementById('judgeModal').classList.add('show');
    });
}

function closeJudgeModal() {
  document.getElementById('judgeModal').classList.remove('show');
}

function submitJudge() {
  const result = document.getElementById('judgeResultSelect').value;
  const remark = document.getElementById('judgeRemarkTextarea').value;
  const operator = document.getElementById('judgeOperator').value || '系统';

  if (!result) {
    showToast('请选择判定结果', 'warning');
    return;
  }

  fetch(`${API_BASE}/beat-items/${currentItemId}/judge`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, remark, operator })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('改判成功', 'success');
        closeJudgeModal();
        loadStats();

        if (document.getElementById('detailView').style.display !== 'none') {
          viewDetail(currentItemId);
        } else {
          loadList();
        }
      } else {
        showToast(data.error || '改判失败', 'error');
      }
    })
    .catch(err => {
      console.error('改判失败:', err);
      showToast('改判失败', 'error');
    });
}

function resolveConflict(conflictId, action) {
  fetch(`${API_BASE}/version-conflicts/${conflictId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolved_by: '小温', action })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('版本冲突已处理', 'success');
        loadStats();
        viewDetail(currentItemId);
      } else {
        showToast('处理失败', 'error');
      }
    })
    .catch(err => {
      console.error('处理冲突失败:', err);
      showToast('处理失败', 'error');
    });
}

document.addEventListener('DOMContentLoaded', () => {
  loadList();
  loadStats();
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});

function showGuide() {
  document.getElementById('guideModal').classList.add('show');
}

function closeGuideModal() {
  document.getElementById('guideModal').classList.remove('show');
}

let guideStep = 0;
const guideSteps = [
  { title: '欢迎使用鼓组节拍清单归档系统', desc: '我来带您快速熟悉系统的核心功能。' },
  { title: '第一步：清单列表', desc: '左侧可切换不同视图：全部清单、待处理、版本冲突、异常数据。右侧是列表，支持搜索和状态筛选。', action: () => {} },
  { title: '第二步：查看详情', desc: '点击列表中的「详情」可查看完整信息，包括合同扫描件、截图说明、改判历史等。' },
  { title: '第三步：改判操作', desc: '在详情页点击「改判」按钮可以修改判定结果，所有操作都会真实写入后端数据库，并留下历史记录。' },
  { title: '第四步：异常数据处理', desc: '遇到曲名重复、姓名不一致、版本冲突等问题时，系统不会自动处理，而是标注出来供人工判断。' },
  { title: '完成！', desc: '您已经了解了系统的基本使用方法。现在可以自己探索了，推荐先看看「DRUM-2024-003」和「DRUM-2024-004」这两条记录，涵盖了常见的异常场景。' }
];

function startGuideTour() {
  guideStep = 0;
  showToast('引导模式已开启，点击「使用引导」可随时查看完整说明', 'success');
}
