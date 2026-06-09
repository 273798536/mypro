/**
 * 滴定管校准记录看板 - 主应用逻辑
 * 
 * 负责：
 * 1. 看板视图渲染（温度曲线图、异常分类）
 * 2. 明细表格渲染
 * 3. 批次报告补录与联动更新
 * 4. 数据导出
 */

let currentFilter = 'all';
const chartInstances = {};

function init() {
  renderStats();
  renderBoard();
  renderTable();
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const tab = btn.dataset.tab;
      document.getElementById(tab === 'board' ? 'boardPanel' : 'tablePanel').classList.add('active');
      if (tab === 'board') {
        setTimeout(resizeCharts, 100);
      }
    });
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderBoard();
      renderTable();
    });
  });
}

function getFilteredRecords() {
  const records = getRecords();
  if (currentFilter === 'all') return records;
  if (currentFilter === 'hasIssues') {
    return records.filter(r => r.issues.some(i => i.severity !== 'success'));
  }
  return records.filter(r => r.issues.some(i => i.category === currentFilter.toUpperCase()));
}

function renderStats() {
  const records = getRecords();
  let materialCount = 0, calibrationCount = 0, dataQualityCount = 0, okCount = 0;

  records.forEach(r => {
    const hasMaterial = r.issues.some(i => i.category === 'MATERIAL');
    const hasCalibration = r.issues.some(i => i.category === 'CALIBRATION');
    const hasDataQuality = r.issues.some(i => i.category === 'DATA_QUALITY');
    if (hasMaterial) materialCount++;
    if (hasCalibration) calibrationCount++;
    if (hasDataQuality) dataQualityCount++;
    if (!hasMaterial && !hasCalibration && !hasDataQuality) okCount++;
  });

  const total = records.length;
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-card">
      <div class="label">校准记录总数</div>
      <div class="value">${total}</div>
      <div class="sub">共 ${total} 条记录</div>
    </div>
    <div class="stat-card material">
      <div class="label">需补材料</div>
      <div class="value">${materialCount}</div>
      <div class="sub">补充称量数据/批次报告等</div>
    </div>
    <div class="stat-card calibration">
      <div class="label">需改口径</div>
      <div class="value">${calibrationCount}</div>
      <div class="sub">精度不足/体积偏差超标</div>
    </div>
    <div class="stat-card data-quality">
      <div class="label">数据质量问题</div>
      <div class="value">${dataQualityCount}</div>
      <div class="sub">温度曲线/安全备注不一致</div>
    </div>
    <div class="stat-card ok">
      <div class="label">校验通过</div>
      <div class="value">${okCount}</div>
      <div class="sub">无异常项</div>
    </div>
  `;
}

function renderBoard() {
  const records = getFilteredRecords();
  const panel = document.getElementById('boardPanel');

  Object.values(chartInstances).forEach(inst => { if (inst) inst.dispose(); });
  Object.keys(chartInstances).forEach(k => delete chartInstances[k]);

  panel.innerHTML = records.map(record => renderRecordCard(record)).join('');

  setTimeout(() => {
    records.forEach(record => {
      const chartEl = document.getElementById(`chart-${record.id}`);
      if (chartEl) {
        const chart = echarts.init(chartEl);
        chart.setOption(getTempChartOption(record));
        chartInstances[record.id] = chart;
      }
    });
    window.addEventListener('resize', resizeCharts);
  }, 50);
}

function resizeCharts() {
  Object.values(chartInstances).forEach(inst => { if (inst) inst.resize(); });
}

function getTempChartOption(record) {
  const data = record.temperatureCurve;
  const temps = data.map(d => d.temp);
  const maxT = Math.max(...temps);
  const minT = Math.min(...temps);
  const avgT = temps.reduce((a,b) => a+b, 0) / temps.length;
  const hasIssue = record._tempAnalysis && (
    record._tempAnalysis.maxTemp > TEMP_THRESHOLD.MAX ||
    record._tempAnalysis.minTemp < TEMP_THRESHOLD.MIN ||
    record._tempAnalysis.fluctuation > TEMP_THRESHOLD.FLUCTUATION
  );
  const lineColor = hasIssue ? '#ef4444' : '#10b981';
  const areaColor = hasIssue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';

  return {
    grid: { left: 45, right: 15, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const p = params[0];
        return `${p.axisValue}<br/>温度: <b>${p.value}℃</b>`;
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.time),
      axisLabel: { fontSize: 11, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'value',
      name: '℃',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      min: Math.floor(minT - 1),
      max: Math.ceil(maxT + 1),
      axisLabel: { fontSize: 11, color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [{
      name: '温度',
      type: 'line',
      data: temps,
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: lineColor, width: 2.5 },
      itemStyle: { color: lineColor, borderWidth: 2, borderColor: '#fff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: areaColor },
          { offset: 1, color: 'rgba(255,255,255,0)' }
        ])
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' },
        data: [
          { yAxis: TEMP_THRESHOLD.MIN, label: { formatter: `下限 ${TEMP_THRESHOLD.MIN}℃`, position: 'insideEndTop', color: '#94a3b8', fontSize: 10 }, lineStyle: { color: '#94a3b8' } },
          { yAxis: TEMP_THRESHOLD.MAX, label: { formatter: `上限 ${TEMP_THRESHOLD.MAX}℃`, position: 'insideEndBottom', color: '#94a3b8', fontSize: 10 }, lineStyle: { color: '#94a3b8' } }
        ]
      }
    }]
  };
}

function renderRecordCard(record) {
  const issues = record.issues || [];
  const materialIssues = issues.filter(i => i.category === 'MATERIAL');
  const calibrationIssues = issues.filter(i => i.category === 'CALIBRATION');
  const dataQualityIssues = issues.filter(i => i.category === 'DATA_QUALITY');
  const successIssues = issues.filter(i => i.severity === 'success');

  let badges = '';
  if (materialIssues.length) badges += `<span class="issue-badge material">补材料 ${materialIssues.length}</span>`;
  if (calibrationIssues.length) badges += `<span class="issue-badge calibration">改口径 ${calibrationIssues.length}</span>`;
  if (dataQualityIssues.length) badges += `<span class="issue-badge data-quality">数据质量 ${dataQualityIssues.length}</span>`;
  if (!badges && successIssues.length) badges += `<span class="issue-badge success">校验通过</span>`;
  if (!badges) badges += `<span class="issue-badge success">待确认</span>`;

  const tempAnalysis = record._tempAnalysis || {};
  let tempBarClass = '';
  let tempBarText = `温度范围 ${tempAnalysis.minTemp?.toFixed(1)}~${tempAnalysis.maxTemp?.toFixed(1)}℃，波动 ${tempAnalysis.fluctuation?.toFixed(1)}℃，平均 ${tempAnalysis.avgTemp?.toFixed(1)}℃`;
  if (tempAnalysis.maxTemp > TEMP_THRESHOLD.MAX || tempAnalysis.minTemp < TEMP_THRESHOLD.MIN || tempAnalysis.fluctuation > TEMP_THRESHOLD.FLUCTUATION) {
    tempBarClass = 'range-out';
  }

  const w = record.weighingData;
  const weighingPrecisionClass = w.precision !== null && w.precision > WEIGHING_PRECISION_THRESHOLD ? 'alert' : (w.precision !== null ? 'success' : '');
  const concentrationDisplay = record._concentrationCalculated 
    ? `${record._concentrationCalculated.measured?.toFixed(4) || '--'} ${record.concentration.unit}`
    : (record.batchReport ? `${record.batchReport.measuredConcentration?.toFixed(4) || '--'} ${record.concentration.unit}` : `标称 ${record.concentration.nominal.toFixed(4)} ${record.concentration.unit} (待批次报告)`);

  const allIssues = [...materialIssues, ...calibrationIssues, ...dataQualityIssues, ...successIssues];
  const issuesHtml = allIssues.length ? allIssues.map(i => renderIssueItem(i)).join('') : '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">暂无异常</div>';

  const batchHtml = record.batchReport 
    ? `<div class="batch-section">
        <div class="batch-title">✓ 批次报告已录入</div>
        <div class="batch-info">
          报告编号: ${record.batchReport.reportId} · 实测浓度: ${record.batchReport.measuredConcentration?.toFixed(4)} ${record.concentration.unit} · 不确定度: ±${record.batchReport.uncertainty?.toFixed(4)}
          ${record.batchReport.remark ? `<br/>备注: ${record.batchReport.remark}` : ''}
        </div>
      </div>`
    : `<div class="batch-section pending">
        <div class="batch-title">⏳ 批次报告待补录</div>
        <div class="batch-info">补录后将自动重新计算浓度校验结果</div>
        <div class="batch-form" id="batchForm-${record.id}">
          <input type="text" placeholder="报告编号" id="batchId-${record.id}">
          <input type="number" step="0.0001" placeholder="实测浓度 (${record.concentration.unit})" id="batchConc-${record.id}">
          <input type="number" step="0.0001" placeholder="不确定度" id="batchUnc-${record.id}">
          <input type="text" placeholder="备注（可选）" id="batchRemark-${record.id}">
          <button onclick="submitBatchReport('${record.id}')">录入批次报告</button>
        </div>
      </div>`;

  const manualRemark = record.safetyRemark?.manualRemark 
    ? `<div class="remark-section manual">
        <div class="remark-title">📝 人工备注（原样保留）</div>
        <div class="remark-text">${record.safetyRemark.manualRemark}</div>
      </div>`
    : '';

  return `
    <div class="record-card" id="record-${record.id}">
      <div class="record-header">
        <div class="meta">
          <span class="id">${record.id}</span>
          <span class="burette">${record.buretteId}</span>
          <span class="operator">${record.operator}</span>
          <span class="date">${record.date}</span>
        </div>
        <div class="issue-badges">${badges}</div>
      </div>
      <div class="record-body">
        <div class="record-grid">
          <div class="chart-section">
            <h3>温度曲线</h3>
            <div class="chart-container" id="chart-${record.id}"></div>
            <div class="temp-range-bar">
              ${tempBarText ? `<span class="${tempBarClass}">${tempBarText}</span>` : ''}
            </div>
            ${manualRemark}
          </div>
          <div class="detail-section">
            <h3>校准明细</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <div class="k">标称体积</div>
                <div class="v">${record.nominalVolume} mL</div>
              </div>
              <div class="detail-item">
                <div class="k">实际称量</div>
                <div class="v">${w.actual !== null ? w.actual.toFixed(4) + ' g' : '<span style="color:#ef4444">未填写</span>'}</div>
              </div>
              <div class="detail-item">
                <div class="k">称量精度</div>
                <div class="v ${weighingPrecisionClass} precision-cell">
                  ${w.precision !== null ? w.precision.toFixed(4) + ' g' : '--'}
                  ${w.precision !== null && w.precision > WEIGHING_PRECISION_THRESHOLD ? ` (阈值 ${WEIGHING_PRECISION_THRESHOLD})` : ''}
                </div>
              </div>
              <div class="detail-item">
                <div class="k">溶液浓度</div>
                <div class="v">${concentrationDisplay}</div>
              </div>
            </div>

            <div class="remark-section safety">
              <div class="remark-title">🛡 系统安全备注</div>
              <div class="remark-text">${record.safetyRemark?.systemGenerated || '--'}</div>
            </div>

            <div class="issues-section">
              <h4>异常诊断与处理建议</h4>
              <div class="issue-list">${issuesHtml}</div>
            </div>

            ${batchHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderIssueItem(issue) {
  const catLabel = issue.category 
    ? ANOMALY_CATEGORIES[issue.category]?.label || issue.category 
    : '通过';
  const catClass = issue.category ? issue.category.toLowerCase().replace('_', '-') : 'success';
  const evidenceStr = issue.evidence ? Object.entries(issue.evidence).map(([k,v]) => `${k}=${typeof v === 'number' ? v.toFixed(4) : v}`).join(' | ') : '';

  return `
    <div class="issue-item ${catClass}">
      <div class="issue-title">
        <span class="cat-tag">${catLabel}</span>
        ${issue.title}
      </div>
      <div class="issue-detail">${issue.detail}</div>
      ${evidenceStr ? `<div class="issue-evidence">证据: ${evidenceStr}</div>` : ''}
      ${issue.nextStep ? `<div class="issue-next-step">${issue.nextStep}</div>` : ''}
    </div>
  `;
}

function submitBatchReport(recordId) {
  const reportId = document.getElementById(`batchId-${recordId}`).value.trim();
  const concStr = document.getElementById(`batchConc-${recordId}`).value.trim();
  const uncStr = document.getElementById(`batchUnc-${recordId}`).value.trim();
  const remark = document.getElementById(`batchRemark-${recordId}`).value.trim();

  if (!reportId || !concStr) {
    alert('请填写报告编号和实测浓度');
    return;
  }

  const measuredConcentration = parseFloat(concStr);
  const uncertainty = uncStr ? parseFloat(uncStr) : 0;

  const batchReport = {
    reportId,
    receivedDate: new Date().toISOString().slice(0, 10),
    measuredConcentration,
    uncertainty,
    remark
  };

  updateBatchReport(recordId, batchReport);
  renderStats();
  renderBoard();
  renderTable();
}

function renderTable() {
  const records = getFilteredRecords();
  const panel = document.getElementById('tablePanel');

  const rows = records.map(r => {
    const issues = r.issues || [];
    const hasMaterial = issues.some(i => i.category === 'MATERIAL');
    const hasCalibration = issues.some(i => i.category === 'CALIBRATION');
    const hasDataQuality = issues.some(i => i.category === 'DATA_QUALITY');

    let issueTags = '';
    if (hasMaterial) issueTags += '<span class="issue-badge material">补材料</span> ';
    if (hasCalibration) issueTags += '<span class="issue-badge calibration">改口径</span> ';
    if (hasDataQuality) issueTags += '<span class="issue-badge data-quality">数据质量</span>';
    if (!issueTags) issueTags = '<span class="issue-badge success">正常</span>';

    const w = r.weighingData;
    const precisionWarn = w.precision !== null && w.precision > WEIGHING_PRECISION_THRESHOLD;
    const tempA = r._tempAnalysis || {};

    const nextStep = issues.filter(i => i.nextStep).map(i => i.nextStep).join('；') || '--';

    return `
      <tr>
        <td>${r.id}</td>
        <td>${r.buretteId}</td>
        <td>${r.operator}</td>
        <td>${r.date}</td>
        <td>${r.nominalVolume} mL</td>
        <td>${tempA.minTemp?.toFixed(1) || '--'}~${tempA.maxTemp?.toFixed(1) || '--'}℃</td>
        <td>${w.actual !== null ? w.actual.toFixed(4) + ' g' : '<span style="color:#ef4444">缺失</span>'}</td>
        <td class="precision-cell ${precisionWarn ? 'warn' : ''}">
          ${w.precision !== null ? w.precision.toFixed(4) + ' g' : '--'}
        </td>
        <td>${issueTags}</td>
        <td class="manual-remark">${r.safetyRemark?.manualRemark || '--'}</td>
        <td>${nextStep}</td>
      </tr>
    `;
  }).join('');

  panel.innerHTML = `
    <table class="detail-table">
      <thead>
        <tr>
          <th>记录编号</th>
          <th>滴定管编号</th>
          <th>操作人</th>
          <th>校准日期</th>
          <th>标称体积</th>
          <th>温度范围</th>
          <th>实际称量</th>
          <th>称量精度</th>
          <th>异常分类</th>
          <th>人工备注</th>
          <th>处理建议</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function exportAllRecords() {
  const records = getRecords();
  const today = new Date().toISOString().slice(0, 10);

  let csv = '\uFEFF';
  csv += '记录编号,滴定管编号,操作人,校准日期,标称体积(mL),温度范围(℃),温度波动(℃),实际称量(g),称量精度(g),称量精度判断,溶液,标称浓度,实测浓度,批次报告,异常分类,人工备注,系统安全备注,处理建议\n';

  records.forEach(r => {
    const issues = r.issues || [];
    const categories = issues.filter(i => i.category).map(i => ANOMALY_CATEGORIES[i.category]?.label || i.category);
    const catStr = categories.length ? categories.join('|') : '正常';
    const nextSteps = issues.filter(i => i.nextStep).map(i => i.nextStep).join('；');
    const tempA = r._tempAnalysis || {};
    const w = r.weighingData;
    const precisionJudge = w.precision === null ? '未测' : (w.precision > WEIGHING_PRECISION_THRESHOLD ? `不达标(阈值${WEIGHING_PRECISION_THRESHOLD})` : '达标');
    const conc = r._concentrationCalculated || r.concentration;
    const measuredConc = r.batchReport ? r.batchReport.measuredConcentration : (conc.measured || '--');
    const hasBatch = r.batchReport ? `已录入(${r.batchReport.reportId})` : '待补录';
    const manualRemark = (r.safetyRemark?.manualRemark || '').replace(/,/g, '，').replace(/\n/g, ' ');
    const sysRemark = (r.safetyRemark?.systemGenerated || '').replace(/,/g, '，');

    csv += [
      r.id, r.buretteId, r.operator, r.date, r.nominalVolume,
      `${tempA.minTemp?.toFixed(1) || '--'}~${tempA.maxTemp?.toFixed(1) || '--'}`,
      tempA.fluctuation?.toFixed(2) || '--',
      w.actual !== null ? w.actual.toFixed(4) : '--',
      w.precision !== null ? w.precision.toFixed(4) : '--',
      precisionJudge,
      r.concentration.formula,
      `${r.concentration.nominal.toFixed(4)} ${r.concentration.unit}`,
      measuredConc !== '--' ? `${measuredConc.toFixed(4)} ${r.concentration.unit}` : '--',
      hasBatch,
      catStr,
      `"${manualRemark}"`,
      `"${sysRemark}"`,
      `"${nextSteps || '无'}"`
    ].join(',') + '\n';
  });

  const detailSection = records.map(r => {
    const tempData = r.temperatureCurve.map(p => `${p.time}:${p.temp.toFixed(1)}℃`).join('; ');
    const issuesDetail = (r.issues || []).map(i => 
      `[${ANOMALY_CATEGORIES[i.category]?.label || '通过'}] ${i.title} - ${i.detail}${i.nextStep ? ' → ' + i.nextStep : ''}`
    ).join('\n');

    return `
【${r.id}】${r.buretteId} / ${r.operator} / ${r.date}
标称体积: ${r.nominalVolume}mL
温度曲线: ${tempData}
实际称量: ${r.weighingData.actual !== null ? r.weighingData.actual.toFixed(4) + 'g (精度' + (r.weighingData.precision !== null ? r.weighingData.precision.toFixed(4) : '--') + 'g)' : '未填写'}
溶液: ${r.concentration.formula} ${r.concentration.nominal.toFixed(4)}${r.concentration.unit}
批次报告: ${r.batchReport ? `${r.batchReport.reportId} 实测${r.batchReport.measuredConcentration?.toFixed(4)}${r.concentration.unit} 不确定度±${r.batchReport.uncertainty?.toFixed(4)}` : '待补录'}
系统安全备注: ${r.safetyRemark?.systemGenerated || '--'}
人工备注: ${r.safetyRemark?.manualRemark || '--'}
异常诊断:
${issuesDetail || '  无异常'}
${'='.repeat(60)}`;
  }).join('\n');

  const summary = generateSummary(records);

  const fullContent = `${summary}\n\n${'='.repeat(60)}\n【异常明细】\n${'='.repeat(60)}\n${detailSection}\n\n${'='.repeat(60)}\n【CSV数据】\n${csv}`;

  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `滴定管校准记录完整报告_${today}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateSummary(records) {
  let materialCount = 0, calibrationCount = 0, dataQualityCount = 0, okCount = 0;
  const materialList = [], calibrationList = [], dataQualityList = [];

  records.forEach(r => {
    const hasM = r.issues.some(i => i.category === 'MATERIAL');
    const hasC = r.issues.some(i => i.category === 'CALIBRATION');
    const hasD = r.issues.some(i => i.category === 'DATA_QUALITY');
    if (hasM) { materialCount++; materialList.push(r.id); }
    if (hasC) { calibrationCount++; calibrationList.push(r.id); }
    if (hasD) { dataQualityCount++; dataQualityList.push(r.id); }
    if (!hasM && !hasC && !hasD) okCount++;
  });

  const precisionFailRecords = records.filter(r => 
    r.weighingData.precision !== null && r.weighingData.precision > WEIGHING_PRECISION_THRESHOLD
  );

  let precisionExplain = '';
  if (precisionFailRecords.length) {
    precisionExplain = '\n\n【称量精度不足说明】\n' + 
      `共 ${precisionFailRecords.length} 条记录称量精度超过允许阈值 ${WEIGHING_PRECISION_THRESHOLD}g。\n` +
      precisionFailRecords.map(r => {
        const w = r.weighingData;
        const dev = Math.abs(w.actual - r.nominalVolume);
        return `  - ${r.id}(${r.buretteId}): 精度${w.precision.toFixed(4)}g, 标称${r.nominalVolume}mL实称${w.actual.toFixed(4)}g, 偏差${dev.toFixed(4)}g → 需改口径：检查滴定管密封性和口径，或更换天平重新称量`;
      }).join('\n');
  }

  return `滴定管校准记录复盘报告
生成日期: ${new Date().toLocaleString('zh-CN')}
总记录数: ${records.length}

异常统计:
  · 校验通过: ${okCount} 条
  · 需补材料: ${materialCount} 条 (${materialList.join(', ') || '无'})
  · 需改口径: ${calibrationCount} 条 (${calibrationList.join(', ') || '无'})
  · 数据质量问题: ${dataQualityCount} 条 (${dataQualityList.join(', ') || '无'})

温度控制阈值: ${TEMP_THRESHOLD.MIN}℃ ~ ${TEMP_THRESHOLD.MAX}℃, 允许波动 ≤${TEMP_THRESHOLD.FLUCTUATION}℃
称量精度阈值: ±${WEIGHING_PRECISION_THRESHOLD}g

处理原则:
  - "补材料": 缺失称量数据、批次报告等，补充材料后自动重新校验
  - "改口径": 称量精度不足、体积偏差超标，需检查滴定管或重新校准
  - "数据质量": 温度曲线与安全备注不一致等，需核对修正${precisionExplain}`;
}

document.addEventListener('DOMContentLoaded', init);
