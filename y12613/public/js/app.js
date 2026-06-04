const API_BASE = '/api';
let currentAnnotations = [];
let currentReviewAnnotation = null;
let anomalyChart = null;
let currentZoom = 1;
let currentPanX = 0;
let currentPanY = 0;
let reviewData = [];

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadSummary();
  loadAnnotations();
  loadBatchOptions();
});

function initTabs() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      
      if (btn.dataset.tab === 'anomaly') {
        loadAnnotations();
        loadSummary();
      } else if (btn.dataset.tab === 'export') {
        loadExportSummary();
      }
    });
  });
}

async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(API_BASE + url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json();
    return data;
  } catch (err) {
    showToast('网络请求失败: ' + err.message, 'error');
    throw err;
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function translateStatus(status) {
  const map = {
    'pending': '待复核',
    'pass': '通过',
    'fail': '不通过'
  };
  return map[status] || status || '-';
}

function getStatusClass(status) {
  return status || 'pending';
}

async function loadSummary() {
  const result = await apiRequest('/summary');
  if (result.success) {
    const summary = result.data;
    const total = summary.reduce((sum, s) => sum + s.total_count, 0);
    const passCount = summary.reduce((sum, s) => sum + s.pass_count, 0);
    const failCount = summary.reduce((sum, s) => sum + s.fail_count, 0);
    const pendingCount = summary.reduce((sum, s) => sum + s.pending_count, 0);
    const scored = summary.filter(s => s.avg_score !== null);
    const avgScore = scored.length > 0 
      ? (scored.reduce((sum, s) => sum + s.avg_score, 0) / scored.length).toFixed(1)
      : '-';
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('passCount').textContent = passCount;
    document.getElementById('failCount').textContent = failCount;
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('avgScore').textContent = avgScore;
  }
}

async function loadBatchOptions() {
  const result = await apiRequest('/summary');
  if (result.success) {
    const batches = result.data.map(s => s.batch_no);
    const selects = ['filterBatch', 'reviewBatch', 'exportBatch'];
    selects.forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        const currentValue = select.value;
        select.innerHTML = id === 'reviewBatch' 
          ? '<option value="">选择批次</option>'
          : '<option value="">全部批次</option>';
        batches.forEach(batch => {
          const option = document.createElement('option');
          option.value = batch;
          option.textContent = batch;
          select.appendChild(option);
        });
        if (currentValue && batches.includes(currentValue)) {
          select.value = currentValue;
        }
      }
    });
  }
}

async function loadAnnotations() {
  const batch_no = document.getElementById('filterBatch').value;
  const status = document.getElementById('filterStatus').value;
  
  let url = '/annotations';
  const params = new URLSearchParams();
  if (batch_no) params.append('batch_no', batch_no);
  if (status) params.append('status', status);
  if (params.toString()) url += '?' + params.toString();
  
  const result = await apiRequest(url);
  if (result.success) {
    currentAnnotations = result.data;
    renderAnomalyTable(currentAnnotations);
    renderAnomalyChart(currentAnnotations);
  }
}

function renderAnomalyTable(annotations) {
  const tbody = document.getElementById('anomalyTableBody');
  
  if (annotations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">暂无数据</td></tr>';
    return;
  }
  
  tbody.innerHTML = annotations.map(ann => `
    <tr>
      <td>${ann.id}</td>
      <td>${ann.batch_no}</td>
      <td>${ann.image_id}</td>
      <td>${ann.anomaly_type}</td>
      <td>${ann.coordinate_x.toFixed(6)}, ${ann.coordinate_y.toFixed(6)}</td>
      <td>${ann.operator}</td>
      <td><span class="status-tag ${getStatusClass(ann.status)}">${translateStatus(ann.status)}</span></td>
      <td>${ann.score || '-'}</td>
      <td>
        <button class="action-btn" onclick="viewDetail(${ann.id})">详情</button>
        <button class="action-btn" onclick="viewTrace(${ann.id})">追溯</button>
        <button class="action-btn" onclick="showSupplement(${ann.id})">补录</button>
      </td>
    </tr>
  `).join('');
}

function renderAnomalyChart(annotations) {
  const ctx = document.getElementById('anomalyChart').getContext('2d');
  
  if (anomalyChart) {
    anomalyChart.destroy();
  }
  
  const typeCounts = {};
  const statusCounts = { pass: 0, fail: 0, pending: 0 };
  
  annotations.forEach(ann => {
    typeCounts[ann.anomaly_type] = (typeCounts[ann.anomaly_type] || 0) + 1;
    statusCounts[ann.status] = (statusCounts[ann.status] || 0) + 1;
  });
  
  anomalyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [
        {
          label: '异常数量',
          data: Object.values(typeCounts),
          backgroundColor: 'rgba(24, 144, 255, 0.6)',
          borderColor: 'rgba(24, 144, 255, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: '异常类型分布图 (图、表、文字说明三者对得上)'
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const type = context.label;
              const typeAnns = annotations.filter(a => a.anomaly_type === type);
              const pass = typeAnns.filter(a => a.status === 'pass').length;
              const fail = typeAnns.filter(a => a.status === 'fail').length;
              const pending = typeAnns.filter(a => a.status === 'pending').length;
              return [
                `通过: ${pass}`,
                `不通过: ${fail}`,
                `待复核: ${pending}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

async function viewDetail(id) {
  const result = await apiRequest('/annotations/' + id);
  if (result.success) {
    showDetailModal(result.data);
  }
}

function showDetailModal(data) {
  const modal = document.getElementById('detailModal');
  const body = document.getElementById('detailModalBody');
  
  const ann = data.annotation;
  const review = data.latestReview;
  
  body.innerHTML = `
    <div class="detail-section">
      <h4>基本信息</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="d-label">标注ID</div>
          <div class="d-value">${ann.id}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">批次号</div>
          <div class="d-value">${ann.batch_no}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">图片ID</div>
          <div class="d-value">${ann.image_id}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">异常类型</div>
          <div class="d-value">${ann.anomaly_type}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">坐标X</div>
          <div class="d-value">${ann.coordinate_x}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">坐标Y</div>
          <div class="d-value">${ann.coordinate_y}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">缩放级别</div>
          <div class="d-value">${ann.zoom_level}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">状态</div>
          <div class="d-value"><span class="status-tag ${getStatusClass(ann.status)}">${translateStatus(ann.status)}</span></div>
        </div>
      </div>
    </div>
    
    <div class="detail-section">
      <h4>异常描述</h4>
      <p>${ann.anomaly_desc || '无'}</p>
    </div>
    
    <div class="detail-section">
      <h4>操作记录</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="d-label">标注人员</div>
          <div class="d-value">${ann.operator}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">标注时间</div>
          <div class="d-value">${ann.operate_time}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">来源文件</div>
          <div class="d-value">${ann.source_file}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">最后更新</div>
          <div class="d-value">${ann.updated_at}</div>
        </div>
      </div>
    </div>
    
    ${review ? `
    <div class="detail-section">
      <h4>最新复核结果</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="d-label">复核结果</div>
          <div class="d-value"><span class="status-tag ${getStatusClass(review.review_result)}">${translateStatus(review.review_result)}</span></div>
        </div>
        <div class="detail-item">
          <div class="d-label">评分</div>
          <div class="d-value">${review.score}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">复核人</div>
          <div class="d-value">${review.reviewer}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">复核时间</div>
          <div class="d-value">${review.review_time}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">缩放验证</div>
          <div class="d-value">${review.zoom_verify_passed ? '通过' : '未通过'}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">平移验证</div>
          <div class="d-value">${review.pan_verify_passed ? '通过' : '未通过'}</div>
        </div>
      </div>
      <p style="margin-top: 10px;"><strong>复核备注:</strong> ${review.review_comment || '无'}</p>
    </div>
    ` : ''}
    
    <div class="supplement-form">
      <h5>补录信息</h5>
      <div class="form-group">
        <label>补充描述</label>
        <textarea id="supplementDesc" rows="2" placeholder="输入补充说明...">${ann.anomaly_desc || ''}</textarea>
      </div>
      <div class="form-group">
        <label>缩放级别</label>
        <input type="number" id="supplementZoom" value="${ann.zoom_level || ''}">
      </div>
      <div class="form-group">
        <label>操作人员</label>
        <input type="text" id="supplementOperator" value="补录员">
      </div>
      <button class="btn-primary" onclick="submitSupplement(${ann.id})">提交补录</button>
    </div>
  `;
  
  modal.classList.add('active');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('active');
}

async function submitSupplement(id) {
  const updates = {
    anomaly_desc: document.getElementById('supplementDesc').value,
    zoom_level: parseFloat(document.getElementById('supplementZoom').value) || null,
    operator: document.getElementById('supplementOperator').value
  };
  
  const result = await apiRequest('/annotations/' + id + '/supplement', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  
  if (result.success) {
    showToast('补录成功', 'success');
    closeDetailModal();
    loadAnnotations();
    loadSummary();
  } else {
    showToast(result.message || '补录失败', 'error');
  }
}

function showSupplement(id) {
  viewDetail(id);
}

async function viewTrace(id) {
  document.querySelector('[data-tab="trace"]').click();
  document.getElementById('traceSearch').value = id;
  searchTrace();
}

async function searchTrace() {
  const searchValue = document.getElementById('traceSearch').value.trim();
  if (!searchValue) {
    showToast('请输入标注ID或图片ID', 'warning');
    return;
  }
  
  let id = searchValue;
  if (!/^\d+$/.test(searchValue)) {
    const ann = currentAnnotations.find(a => a.image_id === searchValue);
    if (ann) {
      id = ann.id;
    } else {
      showToast('未找到该图片ID对应的记录', 'warning');
      return;
    }
  }
  
  const result = await apiRequest('/trace/' + id);
  if (result.success) {
    renderTraceChain(result);
  } else {
    showToast(result.error || '查询失败', 'error');
  }
}

function renderTraceChain(data) {
  const container = document.getElementById('traceContainer');
  const chain = data.traceability_chain;
  
  if (!chain || chain.length === 0) {
    container.innerHTML = '<div class="trace-placeholder"><p>未找到追溯数据</p></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="detail-section" style="margin-bottom: 20px;">
      <h4>记录概要</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="d-label">标注ID</div>
          <div class="d-value">${data.annotation.id}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">异常类型</div>
          <div class="d-value">${data.annotation.anomaly_type}</div>
        </div>
        <div class="detail-item">
          <div class="d-label">当前状态</div>
          <div class="d-value"><span class="status-tag ${getStatusClass(data.annotation.status)}">${translateStatus(data.annotation.status)}</span></div>
        </div>
        <div class="detail-item">
          <div class="d-label">追溯节点数</div>
          <div class="d-value">${chain.length}</div>
        </div>
      </div>
    </div>
    
    <div class="trace-chain">
      ${chain.map(node => `
        <div class="trace-node ${node.type}" data-step="${node.step}">
          <h4>${node.title}</h4>
          <div class="trace-meta">
            <span>👤 ${node.operator}</span>
            <span>🕐 ${new Date(node.time).toLocaleString()}</span>
          </div>
          <div class="trace-detail">${node.detail}</div>
          ${node.data ? `
            <div class="trace-data">
              ${JSON.stringify(node.data, null, 2)}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div style="margin-top: 20px; text-align: center;">
      <button class="btn-secondary" onclick="verifyTraceConsistency(${data.annotation.id})">验证数据一致性</button>
    </div>
  `;
}

async function verifyTraceConsistency(id) {
  const result = await apiRequest('/trace/' + id);
  if (result.success) {
    const chain = result.traceability_chain;
    const sourceNode = chain.find(n => n.type === 'source');
    const resultNode = chain.find(n => n.type === 'result');
    
    let consistent = true;
    let messages = [];
    
    if (sourceNode && resultNode) {
      if (sourceNode.data.batch_no !== result.annotation.batch_no) {
        consistent = false;
        messages.push('批次号不一致');
      }
      if (sourceNode.data.image_id !== result.annotation.image_id) {
        consistent = false;
        messages.push('图片ID不一致');
      }
      if (resultNode && resultNode.data.review_result !== result.annotation.status) {
        consistent = false;
        messages.push('复核结果与标注状态不一致');
      }
    }
    
    if (consistent) {
      showToast('✅ 追溯链路数据一致，验证通过', 'success');
    } else {
      showToast('❌ 数据不一致: ' + messages.join(', '), 'error');
    }
  }
}

async function loadReviewData() {
  const batch_no = document.getElementById('reviewBatch').value;
  if (!batch_no) {
    showToast('请选择批次', 'warning');
    return;
  }
  
  const result = await apiRequest('/annotations?batch_no=' + batch_no);
  if (result.success) {
    reviewData = result.data;
    renderAnomalyMarkers(reviewData);
    showToast(`已加载 ${reviewData.length} 条待复核数据`, 'success');
  }
}

function renderAnomalyMarkers(annotations) {
  const container = document.getElementById('anomalyMarkers');
  container.innerHTML = '';
  
  const minX = Math.min(...annotations.map(a => a.coordinate_x));
  const maxX = Math.max(...annotations.map(a => a.coordinate_x));
  const minY = Math.min(...annotations.map(a => a.coordinate_y));
  const maxY = Math.max(...annotations.map(a => a.coordinate_y));
  
  annotations.forEach(ann => {
    const marker = document.createElement('div');
    marker.className = 'anomaly-marker';
    marker.dataset.id = ann.id;
    
    const xPercent = ((ann.coordinate_x - minX) / (maxX - minX || 1)) * 80 + 10;
    const yPercent = ((ann.coordinate_y - minY) / (maxY - minY || 1)) * 80 + 10;
    
    marker.style.left = xPercent + '%';
    marker.style.top = yPercent + '%';
    
    marker.addEventListener('click', () => selectReviewAnnotation(ann));
    container.appendChild(marker);
  });
  
  resetView();
}

function selectReviewAnnotation(ann) {
  currentReviewAnnotation = ann;
  
  document.querySelectorAll('.anomaly-marker').forEach(m => m.classList.remove('selected'));
  document.querySelector(`.anomaly-marker[data-id="${ann.id}"]`).classList.add('selected');
  
  const detailCard = document.getElementById('reviewDetail');
  detailCard.innerHTML = `
    <h3>异常详情</h3>
    <div class="info-row">
      <span class="info-label">标注ID:</span>
      <span class="info-value">${ann.id}</span>
    </div>
    <div class="info-row">
      <span class="info-label">图片ID:</span>
      <span class="info-value">${ann.image_id}</span>
    </div>
    <div class="info-row">
      <span class="info-label">异常类型:</span>
      <span class="info-value">${ann.anomaly_type}</span>
    </div>
    <div class="info-row">
      <span class="info-label">坐标:</span>
      <span class="info-value">${ann.coordinate_x.toFixed(6)}, ${ann.coordinate_y.toFixed(6)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">标注缩放:</span>
      <span class="info-value">${ann.zoom_level}x</span>
    </div>
    <div class="info-row">
      <span class="info-label">标注平移:</span>
      <span class="info-value">X=${ann.pan_offset_x}, Y=${ann.pan_offset_y}</span>
    </div>
    <div class="info-row">
      <span class="info-label">状态:</span>
      <span class="info-value"><span class="status-tag ${getStatusClass(ann.status)}">${translateStatus(ann.status)}</span></span>
    </div>
    <p style="margin-top: 10px;"><strong>描述:</strong> ${ann.anomaly_desc || '无'}</p>
    <p class="hint">请使用缩放平移控件验证异常位置准确性</p>
  `;
  
  document.getElementById('reviewForm').style.display = 'block';
  document.getElementById('reviewResult').value = ann.status === 'pending' ? 'pass' : ann.status;
  document.getElementById('reviewScore').value = ann.score || 80;
  document.getElementById('reviewComment').value = '';
}

function zoomIn() {
  if (currentZoom >= 3) return;
  currentZoom += 0.5;
  updateViewTransform();
}

function zoomOut() {
  if (currentZoom <= 0.5) return;
  currentZoom -= 0.5;
  updateViewTransform();
}

function resetView() {
  currentZoom = 1;
  currentPanX = 0;
  currentPanY = 0;
  updateViewTransform();
}

function updateViewTransform() {
  const markers = document.getElementById('anomalyMarkers');
  markers.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;
  document.getElementById('zoomLevel').textContent = `缩放: ${currentZoom}x`;
  document.getElementById('panInfo').textContent = `平移: X=${currentPanX}, Y=${currentPanY}`;
}

document.addEventListener('keydown', (e) => {
  const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
  if (activeTab !== 'review') return;
  
  const step = 20;
  if (e.key === 'ArrowUp') { currentPanY += step; e.preventDefault(); }
  if (e.key === 'ArrowDown') { currentPanY -= step; e.preventDefault(); }
  if (e.key === 'ArrowLeft') { currentPanX += step; e.preventDefault(); }
  if (e.key === 'ArrowRight') { currentPanX -= step; e.preventDefault(); }
  if (e.key === '+' || e.key === '=') { zoomIn(); e.preventDefault(); }
  if (e.key === '-') { zoomOut(); e.preventDefault(); }
  
  updateViewTransform();
});

async function submitReview() {
  if (!currentReviewAnnotation) {
    showToast('请先选择要复核的异常点', 'warning');
    return;
  }
  
  const reviewData = {
    annotation_id: currentReviewAnnotation.id,
    review_result: document.getElementById('reviewResult').value,
    review_comment: document.getElementById('reviewComment').value,
    score: parseInt(document.getElementById('reviewScore').value),
    zoom_verify_passed: document.getElementById('zoomVerify').value === '1',
    pan_verify_passed: document.getElementById('panVerify').value === '1',
    reviewer: document.getElementById('reviewer').value
  };
  
  const result = await apiRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData)
  });
  
  if (result.success) {
    showToast('复核提交成功', 'success');
    
    const marker = document.querySelector(`.anomaly-marker[data-id="${currentReviewAnnotation.id}"]`);
    if (marker) {
      marker.style.background = reviewData.review_result === 'pass' ? '#52c41a' : '#ff4d4f';
    }
    
    loadAnnotations();
    loadSummary();
    loadBatchOptions();
    
    setTimeout(() => {
      const nextIdx = reviewData.findIndex(a => a.id === currentReviewAnnotation.id) + 1;
      if (nextIdx < reviewData.length) {
        selectReviewAnnotation(reviewData[nextIdx]);
      }
    }, 500);
  } else {
    showToast(result.message || '提交失败', 'error');
  }
}

function showImportModal() {
  document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('active');
}

function loadSampleImport() {
  const sample = [
    {
      batch_no: 'UAV-2026-TEST',
      image_id: 'DJI_TEST_001',
      anomaly_type: '拼接错位',
      anomaly_desc: '测试导入-道路错位',
      coordinate_x: 116.398000,
      coordinate_y: 39.917000,
      zoom_level: 18,
      pan_offset_x: 50,
      pan_offset_y: 50,
      operator: '测试员',
      source_file: 'test/DJI_TEST_001.JPG'
    },
    {
      batch_no: 'UAV-2026-TEST',
      image_id: 'DJI_TEST_002',
      anomaly_type: '色彩差异',
      anomaly_desc: '测试导入-色差明显',
      coordinate_x: 116.398200,
      coordinate_y: 39.917200,
      zoom_level: 16,
      pan_offset_x: -30,
      pan_offset_y: 80,
      operator: '测试员',
      source_file: 'test/DJI_TEST_002.JPG'
    }
  ];
  document.getElementById('importData').value = JSON.stringify(sample, null, 2);
}

async function batchImport() {
  const dataStr = document.getElementById('importData').value.trim();
  const operator = document.getElementById('importOperator').value;
  
  if (!dataStr) {
    showToast('请输入导入数据', 'warning');
    return;
  }
  
  try {
    const records = JSON.parse(dataStr);
    if (!Array.isArray(records)) {
      throw new Error('数据格式错误，应为数组');
    }
    
    const result = await apiRequest('/annotations/batch', {
      method: 'POST',
      body: JSON.stringify({ records, operator })
    });
    
    if (result.success) {
      showToast(`导入完成：成功${result.successCount}条，重复${result.duplicateCount}条，失败${result.failedCount}条`, 
        result.duplicateCount > 0 ? 'warning' : 'success');
      closeImportModal();
      loadAnnotations();
      loadSummary();
      loadBatchOptions();
    }
  } catch (err) {
    showToast('数据解析失败: ' + err.message, 'error');
  }
}

async function loadExportSummary() {
  const batch_no = document.getElementById('exportBatch').value;
  let url = '/export/summary';
  if (batch_no) url += '?batch_no=' + batch_no;
  
  const result = await apiRequest(url);
  if (result.success) {
    renderExportSummary(result.data);
    checkConsistency(result.data);
  }
}

function renderExportSummary(data) {
  const container = document.getElementById('exportSummary');
  
  container.innerHTML = `
    <div class="summary-content">
      <h3>导出内容预览</h3>
      <div class="summary-row">
        <span class="summary-label">记录总数:</span>
        <span class="summary-value">${data.recordCount} 条</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">批次数:</span>
        <span class="summary-value">${data.batchCount} 个</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">通过:</span>
        <span class="summary-value" style="color: #52c41a;">${data.passCount} 条</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">不通过:</span>
        <span class="summary-value" style="color: #ff4d4f;">${data.failCount} 条</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">待复核:</span>
        <span class="summary-value" style="color: #faad14;">${data.pendingCount} 条</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">导出时间:</span>
        <span class="summary-value">${new Date(data.exportTime).toLocaleString()}</span>
      </div>
      <div class="conclusion ${data.conclusion === '通过' ? 'pass' : data.conclusion === '不通过' ? 'fail' : 'pending'}">
        复核结论: ${data.conclusion}
      </div>
    </div>
  `;
}

async function checkConsistency(exportData) {
  const icon = document.getElementById('consistencyIcon');
  const text = document.getElementById('consistencyText');
  
  icon.className = 'check-icon';
  
  const uiResult = await apiRequest('/annotations');
  if (!uiResult.success) {
    icon.classList.add('error');
    icon.textContent = '❌';
    text.textContent = '一致性校验失败：无法获取界面数据';
    return;
  }
  
  const uiAnnotations = uiResult.data;
  const uiPass = uiAnnotations.filter(a => a.status === 'pass').length;
  const uiFail = uiAnnotations.filter(a => a.status === 'fail').length;
  const uiPending = uiAnnotations.filter(a => a.status === 'pending').length;
  
  const batch_no = document.getElementById('exportBatch').value;
  const filteredAnns = batch_no 
    ? uiAnnotations.filter(a => a.batch_no === batch_no)
    : uiAnnotations;
  
  const fPass = filteredAnns.filter(a => a.status === 'pass').length;
  const fFail = filteredAnns.filter(a => a.status === 'fail').length;
  const fPending = filteredAnns.filter(a => a.status === 'pending').length;
  
  const isConsistent = 
    fPass === exportData.passCount &&
    fFail === exportData.failCount &&
    fPending === exportData.pendingCount;
  
  if (isConsistent) {
    icon.classList.add('success');
    icon.textContent = '✅';
    text.textContent = '一致性校验通过：界面显示与导出数据完全一致';
  } else {
    icon.classList.add('error');
    icon.textContent = '❌';
    text.textContent = `数据不一致！界面：通过${fPass}/不通过${fFail}/待复核${fPending}，导出：通过${exportData.passCount}/不通过${exportData.failCount}/待复核${exportData.pendingCount}`;
  }
}

async function exportData() {
  const batch_no = document.getElementById('exportBatch').value;
  let url = '/export';
  if (batch_no) url += '?batch_no=' + batch_no;
  
  try {
    const response = await fetch(API_BASE + url);
    if (!response.ok) throw new Error('导出失败');
    
    const summaryText = decodeURIComponent(response.headers.get('X-Export-Summary') || '');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `无人机航片拼接复核报告_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
    
    showToast('导出成功！' + (summaryText ? '\n' + summaryText : ''), 'success');
  } catch (err) {
    showToast('导出失败: ' + err.message, 'error');
  }
}

document.getElementById('filterBatch').addEventListener('change', loadAnnotations);
document.getElementById('filterStatus').addEventListener('change', loadAnnotations);
document.getElementById('exportBatch').addEventListener('change', () => {
  loadExportSummary();
});
