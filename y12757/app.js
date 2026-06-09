// 水质 COD 批量报告 - 前端交互逻辑
(function() {
  'use strict';

  let currentProcessedData = null;
  let currentFilterSeverity = 'all';
  let currentFilterAnomaly = 'all';
  let currentSelectedSampleId = null;
  let currentAnomalyList = [];

  const $ = id => document.getElementById(id);

  function init() {
    $('btnLoadDemo').addEventListener('click', loadDemoData);
    $('btnImport').addEventListener('click', () => $('fileImport').click());
    $('fileImport').addEventListener('change', handleFileImport);
    $('btnReprocess').addEventListener('click', () => {
      if (currentProcessedData) {
        loadAndProcess(MOCK_BATCH_DATA);
      }
    });
    $('filterSeverity').addEventListener('change', e => {
      currentFilterSeverity = e.target.value;
      renderAll();
    });
    $('filterAnomaly').addEventListener('change', e => {
      currentFilterAnomaly = e.target.value;
      renderAll();
    });
    $('btnExportFull').addEventListener('click', exportFullReport);
    $('btnExportAnomaly').addEventListener('click', exportAnomalyReport);

    $('traceModalClose').addEventListener('click', closeTraceModal);
    $('traceModalOkBtn').addEventListener('click', closeTraceModal);
    $('traceModal').addEventListener('click', e => {
      if (e.target.id === 'traceModal') closeTraceModal();
    });
    $('traceModalExportBtn').addEventListener('click', exportCurrentSample);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeTraceModal();
    });
  }

  function loadDemoData() {
    loadAndProcess(MOCK_BATCH_DATA);
  }

  function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        loadAndProcess(data);
      } catch (err) {
        alert('导入失败：JSON 格式不正确\n' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function loadAndProcess(rawData) {
    currentProcessedData = CoreLogic.processBatch(rawData);
    currentFilterSeverity = 'all';
    currentFilterAnomaly = 'all';
    $('filterSeverity').value = 'all';
    buildAnomalyFilterOptions();
    $('instructionsPanel').classList.add('hidden');
    renderAll();
  }

  function buildAnomalyFilterOptions() {
    const sel = $('filterAnomaly');
    const summary = currentProcessedData._processed.anomalySummary;
    sel.innerHTML = '<option value="all">全部异常类型</option>' +
      summary.map(a => `<option value="${a.code}">${a.name}（${a.count}）</option>`).join('');
  }

  function renderAll() {
    if (!currentProcessedData) return;
    renderHeader();
    renderStats();
    renderUnitAlert();
    renderQC();
    renderConcentrationChart();
    renderAnomalyChart();
    renderSamplesTable();
    renderAnomalyList();
  }

  function renderHeader() {
    const d = currentProcessedData;
    $('batchInfo').textContent = `批次号：${d.batchId}`;
    $('batchNameInfo').textContent = `批次名称：${d.batchName}`;
    $('analystInfo').textContent = `检测人：${d.analyst}`;
    $('reviewerInfo').textContent = `复核人：${d.reviewer}`;
    $('createTimeInfo').textContent = `创建：${d.createTime}`;
    const badge = $('batchStatusBadge');
    badge.textContent = d.status;
  }

  function renderStats() {
    const p = currentProcessedData._processed;
    $('statTotal').textContent = p.totalSamples;
    $('statDirty').textContent = p.samplesWithAnomalies;
    $('statClean').textContent = p.totalSamples - p.samplesWithAnomalies;
    $('statIssues').textContent = p.totalAnomalies;
  }

  function renderUnitAlert() {
    const units = currentProcessedData._processed.tempUnitsInBatch.filter(u => u);
    const alert = $('unitAlert');
    if (units.length > 1) {
      $('unitAlertUnits').textContent = units.map(u => {
        if (u === '℃' || u.toUpperCase() === 'C') return '摄氏度℃';
        if (u.toUpperCase() === 'F') return '华氏度℉';
        if (u.toUpperCase() === 'K') return '开尔文K';
        return u;
      }).join('、');
      alert.classList.remove('hidden');
    } else {
      alert.classList.add('hidden');
    }
  }

  function renderQC() {
    const qc = currentProcessedData.qualityControl;

    if (qc && qc.blankSample) {
      $('qcBlankValue').textContent = qc.blankSample.absorbance.toFixed(4);
      const pass = qc.blankSample.pass;
      $('qcBlankStatus').innerHTML = `<span class="${pass ? 'qc-pass' : 'qc-fail'}">${pass ? '✓ 合格' : '✗ 不合格'}</span>（阈值≤${qc.blankSample.threshold}）`;
      $('qcBlank').className = 'qc-card ' + (pass ? 'pass' : 'fail');
    }

    if (qc && qc.standardSample) {
      const mv = qc.standardSample.measuredValue;
      $('qcStdValue').textContent = mv !== null && mv !== undefined ? mv.toFixed(2) + ' mg/L' : '--';
      if (qc.standardSample.pass !== null) {
        const pass = qc.standardSample.pass;
        $('qcStdStatus').innerHTML = `<span class="${pass ? 'qc-pass' : 'qc-fail'}">${pass ? '✓ 合格' : '✗ 不合格'}</span>（偏差${qc.standardSample.deviationPercent.toFixed(2)}%，允许≤${qc.standardSample.tolerance}%）`;
        $('qcStd').className = 'qc-card ' + (pass ? 'pass' : 'fail');
      } else {
        $('qcStdStatus').textContent = '标准值 ' + qc.standardSample.theoreticalValue + ' mg/L';
      }
    }

    if (qc && qc.parallelSample) {
      const rd = qc.parallelSample.relativeDeviation;
      $('qcParallelValue').textContent = rd !== null && rd !== undefined ? rd.toFixed(2) + '%' : '--';
      if (qc.parallelSample.pass !== null) {
        const pass = qc.parallelSample.pass;
        $('qcParallelStatus').innerHTML = `<span class="${pass ? 'qc-pass' : 'qc-fail'}">${pass ? '✓ 合格' : '✗ 不合格'}</span>（阈值≤${qc.parallelSample.threshold}%）`;
        $('qcParallel').className = 'qc-card ' + (pass ? 'pass' : 'fail');
      }
    }
  }

  function renderConcentrationChart() {
    const container = $('concentrationChart');
    const samples = currentProcessedData.samples;
    const maxConc = Math.max(...samples.map(s => s.calculation.finalConcentration || 0), 1);

    container.innerHTML = samples.map(s => {
      const conc = s.calculation.finalConcentration;
      const h = conc ? Math.max(4, (conc / maxConc) * 160) : 2;
      const hasErr = (s.calculation.issues || []).some(i => i.severity === 'error');
      const hasWarn = !hasErr && (s.calculation.issues || []).some(i => i.severity === 'warning');
      const cls = hasErr ? 'bar-error' : (hasWarn ? 'bar-warning' : 'bar-normal');
      const valText = conc ? conc.toFixed(0) : '--';
      return `
        <div class="bar-item" data-sample="${s.id}" title="${s.sampleName}：${conc ? conc.toFixed(2) + ' mg/L' : '无法计算'}">
          <div class="bar-rect ${cls}" style="height:${h}px;">
            ${conc ? `<span class="bar-value">${valText}</span>` : ''}
          </div>
          <div class="bar-label">${s.sampleCode.replace(/^WS-\d+-/, '')}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.bar-item').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const sid = el.getAttribute('data-sample');
        openTraceModal(sid);
      });
    });
  }

  function renderAnomalyChart() {
    const container = $('anomalyChart');
    const summary = currentProcessedData._processed.anomalySummary;
    const severityCount = { error: 0, warning: 0, info: 0 };
    summary.forEach(a => { severityCount[a.severity] = (severityCount[a.severity] || 0) + a.count; });
    const total = severityCount.error + severityCount.warning + severityCount.info || 1;

    const colors = { error: '#dc2626', warning: '#d97706', info: '#3b82f6' };
    const labels = { error: '需重视', warning: '请关注', info: '温馨提示' };

    let cumulativePercent = 0;
    function polarToCartesian(cx, cy, r, angleDeg) {
      const rad = (angleDeg - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }
    function arcPath(cx, cy, r, startPercent, endPercent) {
      if (endPercent - startPercent >= 1) {
        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
      }
      const startAngle = startPercent * 360;
      const endAngle = endPercent * 360;
      const start = polarToCartesian(cx, cy, r, endAngle);
      const end = polarToCartesian(cx, cy, r, startAngle);
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      return `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 0 ${start.x} ${start.y} Z`;
    }

    let svgPaths = '';
    ['error', 'warning', 'info'].forEach(sev => {
      const cnt = severityCount[sev] || 0;
      if (cnt === 0) return;
      const pct = cnt / total;
      svgPaths += `<path d="${arcPath(70, 70, 55, cumulativePercent, cumulativePercent + pct)}" fill="${colors[sev]}" />`;
      cumulativePercent += pct;
    });

    container.innerHTML = `
      <svg class="pie-svg" viewBox="0 0 140 140">
        ${svgPaths}
        <circle cx="70" cy="70" r="30" fill="#fff"/>
        <text x="70" y="66" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">${total}</text>
        <text x="70" y="82" text-anchor="middle" font-size="10" fill="#6b7280">异常</text>
      </svg>
      <div class="pie-legend">
        ${['error', 'warning', 'info'].map(sev => `
          <div class="legend-item">
            <span class="legend-color" style="background:${colors[sev]}"></span>
            <span>${labels[sev]}</span>
            <span class="legend-count">${severityCount[sev] || 0}</span>
          </div>
        `).join('')}
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;">
          类型共 ${summary.length} 种
        </div>
      </div>
    `;
  }

  function filterSamples(samples) {
    return samples.filter(s => {
      const issues = s.calculation.issues || [];
      if (currentFilterSeverity === 'none') {
        return issues.length === 0;
      }
      if (currentFilterSeverity !== 'all') {
        if (!issues.some(i => i.severity === currentFilterSeverity)) return false;
      }
      if (currentFilterAnomaly !== 'all') {
        if (!issues.some(i => i.code === currentFilterAnomaly)) return false;
      }
      return true;
    });
  }

  function filterAnomalies(samples) {
    const list = [];
    samples.forEach(s => {
      (s.calculation.issues || []).forEach(iss => {
        if (currentFilterSeverity !== 'all' && iss.severity !== currentFilterSeverity) return;
        if (currentFilterAnomaly !== 'all' && iss.code !== currentFilterAnomaly) return;
        list.push({ sample: s, issue: iss });
      });
    });
    const order = { error: 0, warning: 1, info: 2 };
    list.sort((a, b) => (order[a.issue.severity] || 9) - (order[b.issue.severity] || 9));
    return list;
  }

  function renderSamplesTable() {
    const tbody = $('samplesTbody');
    const samples = filterSamples(currentProcessedData.samples);

    if (samples.length === 0) {
      tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:30px;color:#9ca3af;">没有符合筛选条件的样品</td></tr>`;
      return;
    }

    tbody.innerHTML = samples.map(s => {
      const issues = s.calculation.issues || [];
      const hasErr = issues.some(i => i.severity === 'error');
      const hasWarn = !hasErr && issues.some(i => i.severity === 'warning');
      const rowCls = hasErr ? 'row-error' : (hasWarn ? 'row-warning' : '');
      const selCls = currentSelectedSampleId === s.id ? 'row-selected' : '';

      const tempC = CoreLogic.convertTempToCelsius(s.reaction && s.reaction.digestionTemp, s.reaction && s.reaction.digestionTempUnit);
      const timeMin = CoreLogic.convertTimeToMinutes(s.reaction && s.reaction.digestionTime, s.reaction && s.reaction.digestionTimeUnit);

      const tempText = tempC !== null ? `${tempC.toFixed(1)}℃` : '--';
      const tempCls = tempC !== null && (tempC < 146 || tempC > 150) ? 'value-warning' : '';

      const timeText = timeMin !== null ? `${timeMin.toFixed(0)}分` : '--';
      const timeCls = timeMin !== null && (timeMin < 115 || timeMin > 125) ? 'value-warning' : '';

      const concText = s.calculation.finalConcentration !== null && s.calculation.finalConcentration !== undefined
        ? s.calculation.finalConcentration.toFixed(2) : '--';

      const precisionText = s.weighRecord && s.weighRecord.precisionLevel ? s.weighRecord.precisionLevel : '--';
      const precisionBad = s.weighRecord && s.weighRecord.precisionLevel && !CoreLogic.isWeighPrecisionSufficient(s.weighRecord.precisionLevel);

      const sevCount = { error: 0, warning: 0, info: 0 };
      issues.forEach(i => sevCount[i.severity] = (sevCount[i.severity] || 0) + 1);

      const spectrum = (s.spectrum && s.spectrum.rawDataPoints) || [];
      const maxAbs = Math.max(...spectrum.map(p => p.abs), 0.001);
      const spectrumHtml = spectrum.length > 0
        ? `<div class="spectrum-mini">${spectrum.map(p => `<div class="spectrum-bar" style="height:${(p.abs / maxAbs * 100).toFixed(0)}%"></div>`).join('')}</div>`
        : '<span style="color:#9ca3af;">--</span>';

      return `
        <tr class="${rowCls} ${selCls}" data-sample="${s.id}">
          <td class="cell-num">${currentProcessedData.samples.findIndex(x => x.id === s.id) + 1}</td>
          <td><b>${s.sampleCode}</b></td>
          <td>${s.sampleName}${s.isOldFormat ? ' <span class="severity-tag severity-info">旧表</span>' : ''}</td>
          <td>${s.sampleType || '--'}</td>
          <td><div class="remark-text" title="${s.collectPoint || ''}">${s.collectPoint || '--'}</div></td>
          <td class="cell-num">${s.spectrum ? s.spectrum.absorbance.toFixed(4) : '--'}</td>
          <td class="cell-num">${s.calculation.dilutionFactor}</td>
          <td class="cell-num"><b>${concText}</b></td>
          <td class="cell-num ${tempCls}">${tempText}</td>
          <td class="cell-num ${timeCls}">${timeText}</td>
          <td class="${precisionBad ? 'value-warning' : ''}">${precisionText}</td>
          <td>${spectrumHtml}</td>
          <td>
            <div class="issue-count">
              ${sevCount.error > 0 ? `<span class="issue-dot issue-dot-error"></span>${sevCount.error}` : ''}
              ${sevCount.warning > 0 ? `<span class="issue-dot issue-dot-warning"></span>${sevCount.warning}` : ''}
              ${sevCount.info > 0 ? `<span class="issue-dot issue-dot-info"></span>${sevCount.info}` : ''}
              ${issues.length === 0 ? '<span style="color:#059669;font-size:12px;">✓正常</span>' : ''}
            </div>
          </td>
          <td>
            <button class="btn btn-sm" onclick="window.__openTrace('${s.id}')">追溯</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('tr[data-sample]').forEach(tr => {
      tr.addEventListener('click', () => {
        const sid = tr.getAttribute('data-sample');
        openTraceModal(sid);
      });
    });
  }

  function renderAnomalyList() {
    const container = $('anomalyList');
    const list = filterAnomalies(currentProcessedData.samples);
    currentAnomalyList = list;

    $('anomalyCountTag').textContent = `${list.length} 条`;

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div>没有符合筛选条件的异常</div></div>`;
      return;
    }

    container.innerHTML = list.map((item, idx) => {
      const { sample, issue } = item;
      const selected = currentSelectedSampleId === sample.id ? 'selected' : '';
      return `
        <div class="anomaly-item severity-${issue.severity} ${selected}" data-idx="${idx}" data-sample="${sample.id}">
          <div class="anomaly-head">
            <span class="anomaly-sample">${sample.sampleCode}</span>
            <span class="severity-tag severity-${issue.severity}">${Exporter.SEVERITY_LABELS[issue.severity] || issue.severity}</span>
          </div>
          <div class="anomaly-name">${issue.name}</div>
          <div class="anomaly-field">字段：${issue.field || '未分类'} | ${sample.sampleName}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.anomaly-item').forEach(el => {
      el.addEventListener('click', () => {
        const sid = el.getAttribute('data-sample');
        openTraceModal(sid);
      });
    });
  }

  function openTraceModal(sampleId) {
    currentSelectedSampleId = sampleId;
    const trace = CoreLogic.getTraceabilityChain(currentProcessedData, sampleId);
    if (!trace) return;

    $('traceModalTitle').textContent = `异常追溯 - ${trace.sampleCode} ${trace.sampleName}`;

    const stepIconMap = {
      '样品信息': '①',
      '称量记录': '②',
      '反应条件': '③',
      '谱图判读': '④',
      '浓度计算': '⑤',
      '异常结果': '!'
    };

    const bodyHtml = trace.chain.map(step => {
      const stepKey = step.step;
      let iconCls = 'icon-ok';
      let iconText = stepIconMap[stepKey] || '•';
      if (stepKey === '异常结果') {
        const maxSev = step.items.reduce((m, it) => {
          const rank = { error: 3, warning: 2, info: 1 };
          return Math.max(m, rank[it.severity] || 0);
        }, 0);
        if (maxSev === 3) iconCls = 'icon-error';
        else if (maxSev === 2) iconCls = 'icon-warning';
        else iconCls = 'icon-info';
      } else if (stepKey === '称量记录') {
        const missing = step.items.some(it => it.value.includes('缺失'));
        const lowPrec = step.items.some(it => it.label === '称量精度' && it.value && it.value !== '0.1mg' && it.value !== 'N/A');
        if (missing) iconCls = 'icon-error';
        else if (lowPrec) iconCls = 'icon-warning';
      } else if (stepKey === '反应条件') {
        const tempBad = step.items.some(it => it.label === '消解温度(换算为℃)' && it.value !== 'N/A');
      }

      const itemsHtml = step.items.map(it => {
        let cls = '';
        if (it.severity === 'error') cls = 'value-error';
        else if (it.severity === 'warning') cls = 'value-warning';
        else if (it.severity === 'info') cls = 'value-info';
        return `<div class="trace-item">
          <span class="trace-item-label">${it.label}</span>
          <span class="trace-item-value ${cls}">${it.value || '--'}</span>
        </div>`;
      }).join('');

      return `
        <div class="trace-step">
          <div class="trace-step-icon ${iconCls}">${iconText}</div>
          <div class="trace-step-title">${step.step}</div>
          <div class="trace-step-items">${itemsHtml}</div>
        </div>
      `;
    }).join('');

    let maxOpinionSev = 'info';
    const sevRank = { error: 3, warning: 2, info: 1 };
    trace.opinions.forEach(op => {
      if (sevRank[op.severity] > sevRank[maxOpinionSev]) maxOpinionSev = op.severity;
    });

    const opinionHtml = trace.opinions.length > 0 ? `
      <div class="opinion-section opinion-${maxOpinionSev}">
        <div class="opinion-title">💡 处理意见与复核建议</div>
        ${trace.opinions.map(op => `
          <div class="opinion-item">
            <div class="opinion-desc"><b>${op.name}：</b>${op.description}</div>
            <div class="opinion-suggestion">${op.suggestion}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    $('traceModalBody').innerHTML = `
      <div class="trace-chain">${bodyHtml}</div>
      ${opinionHtml}
    `;

    $('traceModal').classList.remove('hidden');
    renderSamplesTable();
    renderAnomalyList();
  }

  function closeTraceModal() {
    $('traceModal').classList.add('hidden');
    currentSelectedSampleId = null;
    if (currentProcessedData) {
      renderSamplesTable();
      renderAnomalyList();
    }
  }

  function exportFullReport() {
    if (!currentProcessedData) { alert('请先载入数据'); return; }
    const content = Exporter.exportFullReport(currentProcessedData);
    Exporter.downloadCSV(content, Exporter.generateFilename(currentProcessedData, '完整报告'));
  }

  function exportAnomalyReport() {
    if (!currentProcessedData) { alert('请先载入数据'); return; }
    const content = Exporter.exportAnomaliesCSV(currentProcessedData);
    Exporter.downloadCSV(content, Exporter.generateFilename(currentProcessedData, '异常说明'));
  }

  function exportCurrentSample() {
    if (!currentProcessedData || !currentSelectedSampleId) return;
    const sample = currentProcessedData.samples.find(s => s.id === currentSelectedSampleId);
    if (!sample) return;
    const single = JSON.parse(JSON.stringify(currentProcessedData));
    single.samples = [sample];
    const content = Exporter.exportFullReport(single);
    Exporter.downloadCSV(content, `${sample.sampleCode}_详情_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`);
  }

  window.__openTrace = openTraceModal;

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
