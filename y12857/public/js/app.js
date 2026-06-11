let currentBatchId = null;
let currentAnomalyId = null;

const statusLabels = {
  imported: '已导入',
  cleaning: '清洗中',
  cleaned: '已清洗',
  reviewing: '复核中',
  reviewed: '已复核',
  exported: '已导出',
};

const riskLabels = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const anomalyTypeLabels = {
  speed_discrepancy: '速度不符',
  abnormal_speed: '航速异常',
  position_jump: '位置跳变',
};

const severityLabels = {
  high: '严重',
  medium: '中等',
  low: '轻微',
};

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

async function loadBatches() {
  const res = await api('/api/batches');
  const list = document.getElementById('batchList');
  if (!res.success || res.data.length === 0) {
    list.innerHTML = '<p class="empty-tip">暂无批次，点击右上角"新建导入"开始</p>';
    return;
  }
  list.innerHTML = res.data.map(b => `
    <div class="batch-item ${b.id === currentBatchId ? 'active' : ''}" onclick="selectBatch(${b.id})">
      <div class="batch-item-title">${escapeHtml(b.name)}</div>
      <div class="batch-item-meta">
        <span class="status-badge status-${b.status}">${statusLabels[b.status] || b.status}</span>
        <span>${formatTime(b.imported_at)}</span>
      </div>
      <div class="batch-item-meta" style="margin-top:4px;">
        <span>异常 ${b.anomaly_count || 0}</span>
        <span>缺口 ${b.water_gap_count || 0}</span>
      </div>
    </div>
  `).join('');
}

async function selectBatch(id) {
  currentBatchId = id;
  loadBatches();

  const res = await api(`/api/batches/${id}`);
  if (!res.success) return;

  const batch = res.data;
  document.getElementById('detailPanel').style.display = 'block';
  document.getElementById('batchTitle').textContent = batch.name;

  document.getElementById('batchStats').innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${batch.total_ais_points || 0}</div>
      <div class="stat-label">AIS 轨迹点</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${batch.total_water_records || 0}</div>
      <div class="stat-label">水质记录</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${batch.anomaly_count || 0}</div>
      <div class="stat-label">异常数量</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${batch.water_gap_count || 0}</div>
      <div class="stat-label">水质缺口</div>
    </div>
  `;

  const canClean = ['imported'].includes(batch.status);
  document.getElementById('btnClean').disabled = !canClean;
  document.getElementById('btnClean').style.opacity = canClean ? '1' : '0.5';

  loadAnomalies();
  loadWaterGaps();
  loadReviews();
}

async function loadAnomalies() {
  if (!currentBatchId) return;
  const riskLevel = document.getElementById('riskFilter').value;
  const url = riskLevel
    ? `/api/cleaning/${currentBatchId}/anomalies?riskLevel=${riskLevel}`
    : `/api/cleaning/${currentBatchId}/anomalies`;

  const res = await api(url);
  const list = document.getElementById('anomalyList');
  if (!res.success || res.data.length === 0) {
    list.innerHTML = '<p class="empty-tip">暂无异常数据</p>';
    return;
  }
  list.innerHTML = res.data.map(a => `
    <div class="anomaly-item" onclick="showAnomalyDetail(${a.id})">
      <div class="anomaly-header">
        <span class="anomaly-mmsi">MMSI: ${a.mmsi}</span>
        <span class="risk-badge risk-${a.risk_level}">${riskLabels[a.risk_level] || a.risk_level}</span>
      </div>
      <div class="anomaly-desc">${anomalyTypeLabels[a.anomaly_type] || a.anomaly_type} · ${severityLabels[a.severity] || a.severity}</div>
      <div class="anomaly-desc" style="color:#718096;">${escapeHtml(a.description || '')}</div>
      <div class="anomaly-meta">
        <span>检测时间：${formatTime(a.detected_at)}</span>
        <span>→ 查看详情</span>
      </div>
    </div>
  `).join('');
}

async function loadWaterGaps() {
  if (!currentBatchId) return;
  const res = await api(`/api/cleaning/${currentBatchId}/water-gaps`);
  const list = document.getElementById('waterGapList');
  if (!res.success || res.data.length === 0) {
    list.innerHTML = '<p class="empty-tip">暂无水质缺口</p>';
    return;
  }
  list.innerHTML = res.data.map(w => `
    <div class="water-gap-item">
      <strong>${escapeHtml(w.station_id)}</strong> · ${formatTime(w.timestamp)}
      <br><small>位置：${w.lon?.toFixed(4) || '-'}, ${w.lat?.toFixed(4) || '-'}</small>
    </div>
  `).join('');
}

async function loadReviews() {
  if (!currentBatchId) return;
  const res = await api(`/api/cleaning/${currentBatchId}/reviews`);
  const list = document.getElementById('reviewList');
  if (!res.success || res.data.length === 0) {
    list.innerHTML = '<p class="empty-tip">暂无复核记录</p>';
    return;
  }
  list.innerHTML = res.data.map(r => `
    <div class="review-item">
      <div class="review-opinion">${escapeHtml(r.opinion)}</div>
      <div class="review-meta">
        ${r.reviewer ? escapeHtml(r.reviewer) + ' · ' : ''}
        ${r.action ? '【' + escapeHtml(r.action) + '】' : ''}
        ${formatTime(r.created_at)}
      </div>
    </div>
  `).join('');
}

async function showAnomalyDetail(anomalyId) {
  const res = await api(`/api/cleaning/anomalies/${anomalyId}`);
  if (!res.success) return;

  currentAnomalyId = anomalyId;
  const { anomaly, point, riskReport, reviews } = res.data;

  let reviewsHtml = '';
  if (reviews && reviews.length > 0) {
    reviewsHtml = reviews.map(r => `
      <div class="review-item">
        <div class="review-opinion">${escapeHtml(r.opinion)}</div>
        <div class="review-meta">
          ${r.reviewer ? escapeHtml(r.reviewer) + ' · ' : ''}
          ${r.action ? '【' + escapeHtml(r.action) + '】' : ''}
          ${formatTime(r.created_at)}
        </div>
      </div>
    `).join('');
  } else {
    reviewsHtml = '<p class="empty-tip" style="padding:12px 0;">暂无复核意见</p>';
  }

  document.getElementById('anomalyDetail').innerHTML = `
    <div class="detail-section">
      <h4>基本信息</h4>
      <div class="detail-row"><span class="detail-label">MMSI</span><span class="detail-value">${anomaly.mmsi}</span></div>
      <div class="detail-row"><span class="detail-label">异常类型</span><span class="detail-value">${anomalyTypeLabels[anomaly.anomaly_type] || anomaly.anomaly_type}</span></div>
      <div class="detail-row"><span class="detail-label">严重程度</span><span class="detail-value">${severityLabels[anomaly.severity] || anomaly.severity}</span></div>
      <div class="detail-row"><span class="detail-label">风险等级</span><span class="detail-value"><span class="risk-badge risk-${anomaly.risk_level}">${riskLabels[anomaly.risk_level] || anomaly.risk_level}</span></span></div>
      <div class="detail-row"><span class="detail-label">漂移距离</span><span class="detail-value">${anomaly.drift_distance ? anomaly.drift_distance.toFixed(0) + ' 米' : '-'}</span></div>
    </div>

    <div class="detail-section">
      <h4>轨迹点信息</h4>
      ${point ? `
        <div class="detail-row"><span class="detail-label">时间</span><span class="detail-value">${formatTime(point.timestamp)}</span></div>
        <div class="detail-row"><span class="detail-label">经纬度</span><span class="detail-value">${point.lon.toFixed(4)}, ${point.lat.toFixed(4)}</span></div>
        <div class="detail-row"><span class="detail-label">船速</span><span class="detail-value">${point.speed?.toFixed(2) || '-'} 节</span></div>
        <div class="detail-row"><span class="detail-label">航向</span><span class="detail-value">${point.course?.toFixed(1) || '-'}°</span></div>
      ` : '<p>无轨迹点信息</p>'}
    </div>

    <div class="detail-section">
      <h4>异常描述</h4>
      <p style="font-size:13px; color:#4a5568;">${escapeHtml(anomaly.description || '')}</p>
    </div>

    <div class="detail-section">
      <h4>风险通报</h4>
      ${riskReport ? `
        <div class="risk-report-box">
          <div class="report-no">${riskReport.report_no} · ${riskLabels[riskReport.risk_level] || riskReport.risk_level}</div>
          <div style="font-weight:600; margin-bottom:6px;">${escapeHtml(riskReport.title)}</div>
          <div class="report-content">${escapeHtml(riskReport.content || '')}</div>
        </div>
      ` : '<p class="empty-tip" style="padding:12px 0;">暂无风险通报</p>'}
    </div>

    <div class="detail-section">
      <h4>复核意见</h4>
      ${reviewsHtml}
    </div>
  `;

  openModal('anomalyDetailModal');
}

function openReviewFromDetail() {
  closeModal('anomalyDetailModal');
  document.getElementById('reviewAnomalyId').value = currentAnomalyId || '';
  openModal('reviewModal');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  event.target.classList.add('active');
  document.getElementById('tab-' + tabName).style.display = 'block';
}

function showImportModal() {
  document.getElementById('importForm').reset();
  openModal('importModal');
}

function showReviewModal() {
  document.getElementById('reviewForm').reset();
  document.getElementById('reviewAnomalyId').value = '';
  openModal('reviewModal');
}

function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.getElementById('importForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('batchName').value;
  const notes = document.getElementById('batchNotes').value;
  const aisFile = document.getElementById('aisFile').files[0];
  const waterFile = document.getElementById('waterFile').files[0];

  const formData = new FormData();
  formData.append('name', name);
  formData.append('notes', notes);
  if (aisFile) formData.append('aisFile', aisFile);
  if (waterFile) formData.append('waterFile', waterFile);

  const res = await fetch('/api/import', { method: 'POST', body: formData }).then(r => r.json());
  if (res.success) {
    closeModal('importModal');
    loadBatches();
    selectBatch(res.data.batch.id);
  } else {
    alert('导入失败：' + res.message);
  }
});

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const anomalyId = document.getElementById('reviewAnomalyId').value || null;
  const reviewer = document.getElementById('reviewer').value;
  const action = document.getElementById('reviewAction').value;
  const opinion = document.getElementById('reviewOpinion').value;

  const res = await api(`/api/cleaning/${currentBatchId}/review`, {
    method: 'POST',
    body: JSON.stringify({ anomalyId, reviewer, action, opinion }),
  });

  if (res.success) {
    closeModal('reviewModal');
    loadReviews();
    if (anomalyId) {
      showAnomalyDetail(anomalyId);
    }
  } else {
    alert('提交失败：' + res.message);
  }
});

async function runCleaning() {
  if (!currentBatchId) return;
  if (!confirm('确定开始漂移清洗和风险分层？')) return;

  const res = await api(`/api/cleaning/${currentBatchId}/clean`, { method: 'POST' });
  if (res.success) {
    alert('清洗完成！发现 ' + res.data.anomalyCount + ' 个异常');
    selectBatch(currentBatchId);
  } else {
    alert('清洗失败：' + res.message);
  }
}

async function exportCsv() {
  if (!currentBatchId) return;
  window.location.href = `/api/export/${currentBatchId}/csv`;
}

async function exportJson() {
  if (!currentBatchId) return;
  const res = await api(`/api/export/${currentBatchId}/json`);
  if (res.success) {
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${currentBatchId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(t) {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString('zh-CN', { hour12: false });
}

document.addEventListener('DOMContentLoaded', () => {
  loadBatches();
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});
