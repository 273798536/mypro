const API_BASE = '/api';

let state = {
  profiles: [],
  currentProfile: null,
  noGoZones: [],
  vessels: [],
  vesselTracks: {},
  analysisRuns: [],
  selectedRunId: null,
  selectedReportId: null,
  reports: []
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  setupTabs();
  await checkHealth();
  await loadProfiles();
  await loadNoGoZones();
  await loadVessels();
  await loadAnalysisRuns();
  await loadReports();
  setupEventListeners();
}

function setupTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
      if (tab === 'zones') drawMap();
    });
  });
}

function setupEventListeners() {
  document.getElementById('newAnalysisBtn').addEventListener('click', openModal);
  document.getElementById('profileSelector').addEventListener('change', onProfileChange);
  document.getElementById('showZones').addEventListener('change', drawMap);
  document.getElementById('showTracks').addEventListener('change', drawMap);
  document.getElementById('compareBtn').addEventListener('click', runCompare);
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    document.getElementById('statusIndicator').textContent = '● 服务正常';
    document.getElementById('statusIndicator').className = 'status-indicator status-ok';
  } catch (e) {
    document.getElementById('statusIndicator').textContent = '● 服务异常';
    document.getElementById('statusIndicator').className = 'status-indicator status-error';
  }
}

async function loadProfiles() {
  const res = await fetch(`${API_BASE}/profiles`);
  state.profiles = await res.json();
  const selector = document.getElementById('profileSelector');
  state.profiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.profile_name;
    selector.appendChild(opt);
  });
  if (state.profiles.length > 0) {
    await loadProfile(state.profiles[0].id);
  }
}

async function loadProfile(id) {
  const res = await fetch(`${API_BASE}/profiles/${id}`);
  state.currentProfile = await res.json();
  drawProfile();
  updateProfileInfo();
}

function onProfileChange(e) {
  loadProfile(e.target.value);
}

function drawProfile() {
  const canvas = document.getElementById('profileCanvas');
  const ctx = canvas.getContext('2d');
  const profile = state.currentProfile;
  if (!profile || !profile.points) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const points = profile.points;
  const maxDist = Math.max(...points.map(p => p.distance));
  const maxDepth = Math.max(...points.map(p => p.depth));

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (i / 5) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const depthVal = (i / 5) * maxDepth;
    ctx.fillStyle = '#718096';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(depthVal.toFixed(0) + ' m', padding.left - 8, y + 4);
  }

  ctx.fillStyle = '#718096';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('距离 (海里)', width / 2, height - 8);
  ctx.save();
  ctx.translate(14, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('深度 (m)', 0, 0);
  ctx.restore();

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(49, 130, 206, 0.1)');
  gradient.addColorStop(1, 'rgba(49, 130, 206, 0.5)');

  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  points.forEach((p, i) => {
    const x = padding.left + (p.distance / maxDist) * chartW;
    const y = padding.top + (p.depth / maxDepth) * chartH;
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = padding.left + (p.distance / maxDist) * chartW;
    const y = padding.top + (p.depth / maxDepth) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#3182ce';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#2d3748';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(profile.profile_name, padding.left, 18);
}

function updateProfileInfo() {
  const p = state.currentProfile;
  if (!p) return;
  const points = p.points || [];
  const info = document.getElementById('profileInfo');
  const maxDepth = Math.max(...points.map(pt => pt.depth));
  const minDepth = Math.min(...points.map(pt => pt.depth));
  const totalDist = points.length > 0 ? points[points.length - 1].distance : 0;

  info.innerHTML = `
    <strong>${p.profile_name}</strong>
    <span style="margin:0 12px;">|</span>
    起点: (${p.start_lon.toFixed(2)}°E, ${p.start_lat.toFixed(2)}°N)
    <span style="margin:0 12px;">|</span>
    终点: (${p.end_lon.toFixed(2)}°E, ${p.end_lat.toFixed(2)}°N)
    <span style="margin:0 12px;">|</span>
    全长: ${totalDist.toFixed(1)} 海里
    <span style="margin:0 12px;">|</span>
    最深: ${maxDepth.toFixed(0)} m
    <span style="margin:0 12px;">|</span>
    最浅: ${minDepth.toFixed(0)} m
    <br>
    <span style="color:#718096;">${p.description}</span>
  `;
}

async function loadNoGoZones() {
  const res = await fetch(`${API_BASE}/no-go-zones`);
  state.noGoZones = await res.json();
}

async function loadVessels() {
  const res = await fetch(`${API_BASE}/vessels`);
  state.vessels = await res.json();
  for (const v of state.vessels) {
    const tRes = await fetch(`${API_BASE}/vessels/${v.id}/tracks`);
    state.vesselTracks[v.id] = await tRes.json();
  }
}

function drawMap() {
  const canvas = document.getElementById('mapCanvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const allLons = [], allLats = [];
  state.noGoZones.forEach(z => {
    z.polygon.forEach(([lon, lat]) => {
      allLons.push(lon);
      allLats.push(lat);
    });
  });
  Object.values(state.vesselTracks).forEach(tracks => {
    tracks.forEach(t => {
      allLons.push(t.lon);
      allLats.push(t.lat);
    });
  });

  if (allLons.length === 0) return;

  const minLon = Math.min(...allLons) - 0.05;
  const maxLon = Math.max(...allLons) + 0.05;
  const minLat = Math.min(...allLats) - 0.05;
  const maxLat = Math.max(...allLats) + 0.05;

  const lonRange = maxLon - minLon;
  const latRange = maxLat - minLat;
  const scale = Math.min((width - 40) / lonRange, (height - 40) / latRange);
  const offsetX = 20;
  const offsetY = 20;

  const toX = lon => offsetX + (lon - minLon) * scale;
  const toY = lat => height - offsetY - (lat - minLat) * scale;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const lon = minLon + (i / 5) * lonRange;
    ctx.beginPath();
    ctx.moveTo(toX(lon), 20);
    ctx.lineTo(toX(lon), height - 20);
    ctx.stroke();

    const lat = minLat + (i / 5) * latRange;
    ctx.beginPath();
    ctx.moveTo(20, toY(lat));
    ctx.lineTo(width - 20, toY(lat));
    ctx.stroke();
  }

  if (document.getElementById('showZones').checked) {
    const zoneColors = {
      aquaculture: 'rgba(237, 137, 54, 0.4)',
      fairway: 'rgba(214, 48, 49, 0.4)',
      reserve: 'rgba(0, 177, 89, 0.4)'
    };
    const strokeColors = {
      aquaculture: '#ed8936',
      fairway: '#d63031',
      reserve: '#00b159'
    };

    state.noGoZones.forEach(zone => {
      ctx.beginPath();
      zone.polygon.forEach(([lon, lat], i) => {
        const x = toX(lon);
        const y = toY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = zoneColors[zone.zone_type] || 'rgba(100,100,100,0.3)';
      ctx.fill();
      ctx.strokeStyle = strokeColors[zone.zone_type] || '#666';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const centerLon = zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length;
      const centerLat = zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length;
      ctx.fillStyle = '#2d3748';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zone.name, toX(centerLon), toY(centerLat));
    });
  }

  if (document.getElementById('showTracks').checked) {
    const vesselColors = { 1: '#e17055', 2: '#0984e3', 3: '#00b894' };

    state.vessels.forEach(v => {
      const tracks = state.vesselTracks[v.id];
      if (!tracks || tracks.length === 0) return;

      ctx.beginPath();
      tracks.forEach((t, i) => {
        const x = toX(t.lon);
        const y = toY(t.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = vesselColors[v.id] || '#666';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      tracks.forEach((t, i) => {
        if (i % 5 === 0 || i === tracks.length - 1) {
          ctx.beginPath();
          ctx.arc(toX(t.lon), toY(t.lat), 3, 0, Math.PI * 2);
          ctx.fillStyle = vesselColors[v.id] || '#666';
          ctx.fill();
        }
      });
    });
  }

  ctx.fillStyle = '#2d3748';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('海域示意图', 25, 35);
}

async function loadAnalysisRuns() {
  const res = await fetch(`${API_BASE}/analysis/runs`);
  state.analysisRuns = await res.json();
  renderAnalysisList();
  updateCompareSelectors();
}

function renderAnalysisList() {
  const list = document.getElementById('analysisList');
  if (state.analysisRuns.length === 0) {
    list.innerHTML = '<p class="empty-hint">暂无分析任务，点击"新建分析"开始</p>';
    return;
  }

  list.innerHTML = state.analysisRuns.map(run => `
    <div class="analysis-item ${state.selectedRunId == run.id ? 'selected' : ''}"
         onclick="selectAnalysis(${run.id})">
      <div class="analysis-info">
        <span class="analysis-name">${run.run_name}</span>
        <span class="analysis-meta">
          ${run.run_time} · 潮汐 ${run.tide_version} · ${run.status}
        </span>
      </div>
      <span class="badge badge-info">v${run.tide_version}</span>
    </div>
  `).join('');
}

async function selectAnalysis(runId) {
  state.selectedRunId = runId;
  renderAnalysisList();
  await loadAnalysisDetail(runId);
}

async function loadAnalysisDetail(runId) {
  const res = await fetch(`${API_BASE}/analysis/runs/${runId}`);
  const data = await res.json();

  document.getElementById('violationCount').textContent = `${data.stats.violation_count || 0} 条`;

  const detail = document.getElementById('violationDetail');
  if (!data.violations || data.violations.length === 0) {
    detail.innerHTML = '<p class="empty-hint">本次分析未发现越界行为</p>';
    return;
  }

  detail.innerHTML = data.violations.map(v => {
    const evidence = JSON.parse(v.evidence_sources || '[]');
    const evidenceHtml = evidence.map(e => {
      const [type, id] = e.split(':');
      let icon = '📄';
      let text = e;
      switch (type) {
        case 'no_go_zone': icon = '🚫'; text = `禁航区 #${id} (${v.zone_name})`; break;
        case 'track_file': icon = '📊'; text = `轨迹文件: ${v.source_file}`; break;
        case 'tide_station': icon = '🌊'; text = `潮汐数据站 #${id}`; break;
        case 'wave_forecast': icon = '🌬️'; text = `风浪预报 #${id}`; break;
      }
      return `<div class="evidence-item"><span class="evidence-icon">${icon}</span>${text}</div>`;
    }).join('');

    return `
      <div class="violation-card">
        <div class="violation-header">
          <span class="violation-vessel">🚢 ${v.vessel_name} (MMSI: ${v.mmsi})</span>
          <span class="violation-zone">闯入 ${v.zone_name}</span>
        </div>
        <div class="violation-meta">
          <div>时间: ${new Date(v.track_time).toLocaleString('zh-CN')}</div>
          <div>位置: ${v.lon.toFixed(4)}°E, ${v.lat.toFixed(4)}°N</div>
          <div>船速: ${v.speed?.toFixed(1) || '-'} 节</div>
          <div>水深: ${v.depth_at_point?.toFixed(1) || '-'} m</div>
          <div>潮高: ${v.tide_correction?.toFixed(2) || '-'} m</div>
          <div>置信度: ${(v.confidence * 100).toFixed(0)}%</div>
        </div>
        <div class="violation-evidence">
          <div class="evidence-title">证据材料：</div>
          ${evidenceHtml}
        </div>
      </div>
    `;
  }).join('');

  loadGaps(runId);
}

function updateCompareSelectors() {
  const sel1 = document.getElementById('compareRun1');
  const sel2 = document.getElementById('compareRun2');
  const opts = state.analysisRuns.map(r =>
    `<option value="${r.id}">${r.run_name} (${r.tide_version})</option>`
  ).join('');
  sel1.innerHTML = opts;
  sel2.innerHTML = opts;
  if (state.analysisRuns.length > 1) {
    sel2.selectedIndex = 1;
  }
}

async function runCompare() {
  const run1 = document.getElementById('compareRun1').value;
  const run2 = document.getElementById('compareRun2').value;

  if (!run1 || !run2 || run1 === run2) {
    alert('请选择两个不同的分析版本');
    return;
  }

  const res = await fetch(`${API_BASE}/analysis/compare?run1=${run1}&run2=${run2}`);
  const data = await res.json();

  const resultDiv = document.getElementById('compareResult');

  let addedHtml = '';
  let removedHtml = '';
  let changedHtml = '';

  if (data.only_in_run2 && data.only_in_run2.length > 0) {
    addedHtml = data.only_in_run2.map(v => `
      <div class="diff-item added">
        <strong>新增越界:</strong> ${v.vessel_name} 在 ${new Date(v.track_time).toLocaleString('zh-CN')}
        <br><small>位置: ${v.lon.toFixed(4)}°E, ${v.lat.toFixed(4)}°N · ${v.zone_name}</small>
      </div>
    `).join('');
  }

  if (data.only_in_run1 && data.only_in_run1.length > 0) {
    removedHtml = data.only_in_run1.map(v => `
      <div class="diff-item removed">
        <strong>消除越界:</strong> ${v.vessel_name} 在 ${new Date(v.track_time).toLocaleString('zh-CN')}
        <br><small>位置: ${v.lon.toFixed(4)}°E, ${v.lat.toFixed(4)}°N · ${v.zone_name}</small>
      </div>
    `).join('');
  }

  if (data.confidence_changed && data.confidence_changed.length > 0) {
    changedHtml = data.confidence_changed.map(c => `
      <div class="diff-item">
        <strong>置信度变化:</strong> ${c.vessel_name}
        <br>
        <small>
          v1: ${(c.confidence_run1 * 100).toFixed(0)}% (潮高 ${c.tide_run1.toFixed(2)}m)
          → v2: ${(c.confidence_run2 * 100).toFixed(0)}% (潮高 ${c.tide_run2.toFixed(2)}m)
        </small>
      </div>
    `).join('');
  }

  resultDiv.innerHTML = `
    <div class="compare-section">
      <h4>📊 对比概况</h4>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px;">
        <div style="padding:10px;background:#ebf8ff;border-radius:5px;text-align:center;">
          <div style="font-size:20px;font-weight:600;color:#2c5282;">${data.stats_run1?.violation_count || 0}</div>
          <div style="font-size:12px;color:#4a5568;">v1 越界数</div>
        </div>
        <div style="padding:10px;background:#fefcbf;border-radius:5px;text-align:center;">
          <div style="font-size:20px;font-weight:600;color:#975a16;">${data.in_both || 0}</div>
          <div style="font-size:12px;color:#4a5568;">两者共有</div>
        </div>
        <div style="padding:10px;background:#ebf8ff;border-radius:5px;text-align:center;">
          <div style="font-size:20px;font-weight:600;color:#2c5282;">${data.stats_run2?.violation_count || 0}</div>
          <div style="font-size:12px;color:#4a5568;">v2 越界数</div>
        </div>
      </div>
    </div>

    ${data.only_in_run2 && data.only_in_run2.length > 0 ? `
      <div class="compare-section">
        <h4>✅ v2 新增越界 (${data.only_in_run2.length}条)</h4>
        ${addedHtml}
      </div>
    ` : ''}

    ${data.only_in_run1 && data.only_in_run1.length > 0 ? `
      <div class="compare-section">
        <h4>❌ v2 消除越界 (${data.only_in_run1.length}条)</h4>
        ${removedHtml}
      </div>
    ` : ''}

    ${data.confidence_changed && data.confidence_changed.length > 0 ? `
      <div class="compare-section">
        <h4>⚠️ 置信度变化 (${data.confidence_changed.length}条)</h4>
        ${changedHtml}
      </div>
    ` : ''}

    ${(!data.only_in_run1 || data.only_in_run1.length === 0) &&
      (!data.only_in_run2 || data.only_in_run2.length === 0) &&
      (!data.confidence_changed || data.confidence_changed.length === 0)
      ? '<p class="empty-hint">两个版本结果完全一致</p>' : ''}
  `;
}

async function loadReports() {
  const res = await fetch(`${API_BASE}/reports`);
  state.reports = await res.json();
  renderReportList();
}

function renderReportList() {
  const list = document.getElementById('reportList');
  if (state.reports.length === 0) {
    list.innerHTML = '<p class="empty-hint">暂无报告，点击"生成报告"创建</p>';
    return;
  }

  list.innerHTML = state.reports.map(r => `
    <div class="report-item ${state.selectedReportId == r.id ? 'selected' : ''}"
         onclick="selectReport(${r.id})">
      <div class="report-name">${r.run_name} - 海事处报告</div>
      <div class="report-summary">
        ${r.evidence_summary} · ${new Date(r.generated_at).toLocaleString('zh-CN')}
      </div>
    </div>
  `).join('');
}

async function selectReport(reportId) {
  state.selectedReportId = reportId;
  renderReportList();
  await loadReportDetail(reportId);
}

async function loadReportDetail(reportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}`);
  const report = await res.json();
  const content = report.content;

  const detail = document.getElementById('reportDetail');

  const violationsHtml = content.violations.map((v, idx) => {
    const chain = content.evidence_chain[idx];
    const materialsHtml = chain.materials.map(m => {
      let icon = '📄';
      switch (m.type) {
        case 'no_go_zone': icon = '🚫'; break;
        case 'track_file': icon = '📊'; break;
        case 'tide_station': icon = '🌊'; break;
        case 'wave_forecast': icon = '🌬️'; break;
      }
      return `
        <div class="evidence-material">
          <span class="material-icon">${icon}</span>
          <span>${m.description}</span>
          <span class="material-arrow">→</span>
        </div>
      `;
    }).join('');

    return `
      <div class="report-section">
        <h4>越界 #${idx + 1}: ${v.vessel_name}</h4>
        <div style="font-size:13px;color:#4a5568;margin-bottom:8px;">
          时间: ${new Date(v.time).toLocaleString('zh-CN')} ·
          位置: ${v.position.lon.toFixed(4)}°E, ${v.position.lat.toFixed(4)}°N ·
          区域: ${v.zone}
        </div>
        <div class="evidence-chain">
          <div class="evidence-chain-title">🔗 证据链 - 海事处可追溯以下材料：</div>
          ${materialsHtml}
          <div style="font-size:12px;color:#718096;margin-top:6px;">
            置信度: ${(v.confidence * 100).toFixed(0)}%
            ${v.source_file ? ` · 轨迹来源: ${v.source_file}` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  let gapsHtml = '';
  if (content.gaps && content.gaps.length > 0) {
    gapsHtml = `
      <div class="report-section">
        <h4>📋 数据缺口说明</h4>
        <div style="font-size:13px;color:#4a5568;">
          以下材料缺失，但分析已基于可用数据完成：
        </div>
        ${content.gaps.map(g => `
          <div style="padding:6px 10px;background:#fffaf0;border-left:3px solid #dd6b20;margin:6px 0;font-size:13px;">
            <strong>${g.gap_type === 'aquaculture_log_missing' ? '养殖日志缺失' : g.gap_type === 'wave_forecast_delayed' ? '风浪预报晚到' : g.gap_type}:</strong>
            ${g.description}
          </div>
        `).join('')}
      </div>
    `;
  }

  detail.innerHTML = `
    <div class="report-section">
      <h4>📑 报告摘要</h4>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
        <div style="padding:10px;background:#f7fafc;border-radius:5px;text-align:center;">
          <div style="font-size:18px;font-weight:600;">${content.summary.total_points}</div>
          <div style="font-size:12px;color:#718096;">轨迹点总数</div>
        </div>
        <div style="padding:10px;background:#fed7d7;border-radius:5px;text-align:center;">
          <div style="font-size:18px;font-weight:600;color:#c53030;">${content.summary.violation_count}</div>
          <div style="font-size:12px;color:#718096;">越界数量</div>
        </div>
        <div style="padding:10px;background:#fefcbf;border-radius:5px;text-align:center;">
          <div style="font-size:18px;font-weight:600;color:#975a16;">${content.summary.data_gaps}</div>
          <div style="font-size:12px;color:#718096;">数据缺口</div>
        </div>
        <div style="padding:10px;background:#bee3f8;border-radius:5px;text-align:center;">
          <div style="font-size:18px;font-weight:600;color:#2c5282;">${content.summary.tide_version}</div>
          <div style="font-size:12px;color:#718096;">潮汐版本</div>
        </div>
      </div>
    </div>

    ${violationsHtml}
    ${gapsHtml}
  `;
}

async function generateReport() {
  if (!state.selectedRunId) {
    alert('请先在"越界分析"标签页选择一个分析任务');
    return;
  }

  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: state.selectedRunId, reportType: 'maritime' })
  });

  const data = await res.json();
  if (data.success) {
    alert('报告生成成功！');
    await loadReports();
    await selectReport(data.reportId);
  } else {
    alert('生成失败: ' + data.error);
  }
}

async function loadGaps(runId) {
  const res = await fetch(`${API_BASE}/data-gaps?runId=${runId}`);
  const gaps = await res.json();
  renderGaps(gaps);
}

function renderGaps(gaps) {
  const list = document.getElementById('gapList');
  if (!gaps || gaps.length === 0) {
    list.innerHTML = '<p class="empty-hint">暂无数据缺口，所有材料完整</p>';
    return;
  }

  list.innerHTML = gaps.map(g => {
    const icon = g.gap_type === 'aquaculture_log_missing' ? '📝' :
                 g.gap_type === 'wave_forecast_delayed' ? '⏰' : '⚠️';
    const title = g.gap_type === 'aquaculture_log_missing' ? '养殖日志缺失' :
                  g.gap_type === 'wave_forecast_delayed' ? '风浪预报晚到' : g.gap_type;
    return `
      <div class="gap-item ${g.impact_level}">
        <div class="gap-title">${icon} ${title}</div>
        <div class="gap-desc">${g.description}</div>
        <div class="gap-meta">
          ${g.related_date ? `日期: ${g.related_date}` : ''}
          ${g.related_entity ? ` · 关联: ${g.related_entity}` : ''}
          · 影响等级: ${g.impact_level === 'high' ? '高' : g.impact_level === 'medium' ? '中' : '低'}
        </div>
      </div>
    `;
  }).join('');
}

function openModal() {
  document.getElementById('analysisModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('analysisModal').classList.add('hidden');
}

async function submitAnalysis() {
  const runName = document.getElementById('runNameInput').value.trim();
  if (!runName) {
    alert('请输入任务名称');
    return;
  }

  const tideVersion = document.getElementById('runTideVersion').value;
  const refTime = document.getElementById('refTimeInput').value.trim() || null;
  const checkAqua = document.getElementById('checkAqua').checked;
  const notes = document.getElementById('runNotes').value.trim();

  const res = await fetch(`${API_BASE}/analysis/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      runName,
      tideVersion,
      referenceTime: refTime,
      checkAquaculture: checkAqua,
      notes
    })
  });

  const data = await res.json();
  if (data.success) {
    alert('分析任务已完成！');
    closeModal();
    await loadAnalysisRuns();
    await selectAnalysis(data.runId);
  } else {
    alert('分析失败: ' + data.error);
  }
}
