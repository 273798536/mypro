let currentFilter = 'all';
let currentSearch = '';
let currentRecordId = null;
let currentChart = null;

document.addEventListener('DOMContentLoaded', function() {
    initFilters();
    renderStats();
    renderList();
});

function initFilters() {
    const chips = document.querySelectorAll('.chip[data-filter]');
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            chips.forEach(c => c.classList.remove('chip-active'));
            this.classList.add('chip-active');
            currentFilter = this.dataset.filter;
            renderList();
        });
    });
}

function renderStats() {
    const total = TITRATION_RECORDS.length;
    const pass = TITRATION_RECORDS.filter(r => r.status === 'pass').length;
    const review = TITRATION_RECORDS.filter(r => r.status === 'review').length;
    const reject = TITRATION_RECORDS.filter(r => r.status === 'reject').length;

    document.getElementById('statsBar').innerHTML = `
        <div class="stat-item">
            <span class="stat-num" style="color: var(--primary)">${total}</span>
            <span class="stat-label">总记录数</span>
        </div>
        <div class="stat-item">
            <span class="stat-num" style="color: var(--green)">${pass}</span>
            <span class="stat-label">可直接用</span>
        </div>
        <div class="stat-item">
            <span class="stat-num" style="color: var(--yellow)">${review}</span>
            <span class="stat-label">待复核</span>
        </div>
        <div class="stat-item">
            <span class="stat-num" style="color: var(--red)">${reject}</span>
            <span class="stat-label">异常/坏数据</span>
        </div>
    `;
}

function renderList() {
    currentSearch = document.getElementById('searchInput').value.toLowerCase().trim();

    const filtered = TITRATION_RECORDS.filter(r => {
        if (currentFilter !== 'all' && r.status !== currentFilter) return false;
        if (currentSearch) {
            return (
                r.batchNo.toLowerCase().includes(currentSearch) ||
                r.oreId.toLowerCase().includes(currentSearch) ||
                r.studentName.toLowerCase().includes(currentSearch)
            );
        }
        return true;
    });

    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = filtered.map(r => {
        const badgeClass = r.status === 'pass' ? 'badge-green' : r.status === 'review' ? 'badge-yellow' : 'badge-red';
        const devClass = r.deviationStatus === 'pass' ? 'dev-pass' : r.deviationStatus === 'review' ? 'dev-warn' : 'dev-fail';
        const devText = r.deviation !== null ? `±${r.deviation.toFixed(2)}%` : '—';
        const gradeText = r.measuredGrade !== null ? r.measuredGrade.toFixed(2) : '—';
        const hasDup = r.duplicateBatchWith ? ' ⚠' : '';
        const regentStatus = r.reagentLedger.every(x => x.status === 'ok') ? '✓ 匹配' :
                             r.reagentLedger.some(x => x.status === 'fail') ? '✗ 冲突' : '⚠ 存疑';
        const regentClass = r.reagentLedger.every(x => x.status === 'ok') ? 'dev-pass' :
                            r.reagentLedger.some(x => x.status === 'fail') ? 'dev-fail' : 'dev-warn';

        return `
            <tr>
                <td><span class="row-num">L${r.originalRow}</span></td>
                <td><strong>${r.batchNo}</strong>${hasDup}</td>
                <td>${r.oreId}</td>
                <td>${r.experimentDate}</td>
                <td>${r.studentName}</td>
                <td>${gradeText}</td>
                <td>${r.theoreticalGrade.toFixed(2)}</td>
                <td class="${devClass}">${devText}</td>
                <td class="${regentClass}">${regentStatus}</td>
                <td><span class="badge ${badgeClass}">${r.statusText}</span></td>
                <td class="source-note">${r.sourceNote}</td>
                <td><button class="btn-link" onclick="viewDetail('${r.id}')">查看核对</button></td>
            </tr>
        `;
    }).join('');

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align:center; padding:40px; color: var(--gray-500);">
                    没有找到匹配的记录
                </td>
            </tr>
        `;
    }
}

function viewDetail(id) {
    currentRecordId = id;
    const r = TITRATION_RECORDS.find(x => x.id === id);
    if (!r) return;

    document.getElementById('listView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    document.getElementById('btnBack').classList.remove('hidden');
    document.getElementById('btnExport').style.display = 'inline-block';

    renderDetailHeader(r);
    renderSummaryCards(r);
    renderTitrationData(r);
    renderReagentCheck(r);
    renderAnomalyTrace(r);
    renderChartAnnotations(r);
    renderNarrative(r);
    renderChart(r);
}

function renderDetailHeader(r) {
    const badgeClass = r.status === 'pass' ? 'badge-green' : r.status === 'review' ? 'badge-yellow' : 'badge-red';
    const hasDup = r.duplicateBatchWith;

    document.getElementById('detailHeader').innerHTML = `
        <div class="detail-title-row">
            <h2 class="detail-title">${r.oreId} — 滴定核对结果</h2>
            <span class="badge ${badgeClass}" style="font-size:14px; padding:6px 14px;">${r.statusText}</span>
            ${hasDup ? `<span class="badge badge-red" style="font-size:13px;">⚠ 批号重复：与 ${hasDup} 冲突</span>` : ''}
        </div>
        <div class="detail-meta">
            <div class="meta-item">
                <span class="meta-label">原始行号</span>
                <span class="meta-value"><code style="background:var(--gray-100); padding:2px 8px; border-radius:4px;">L${r.originalRow}</code></span>
            </div>
            <div class="meta-item">
                <span class="meta-label">样品批号</span>
                <span class="meta-value">${r.batchNo}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">实验日期</span>
                <span class="meta-value">${r.experimentDate}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">学生/小组</span>
                <span class="meta-value">${r.studentName} / ${r.studentGroup}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">谱图文件</span>
                <span class="meta-value" style="font-family:monospace; font-size:12px;">${r.imageName}</span>
            </div>
        </div>
    `;
}

function renderSummaryCards(r) {
    const gradeText = r.measuredGrade !== null ? r.measuredGrade.toFixed(2) + '%' : '数据缺失';
    const gradeClass = r.status === 'pass' ? 'green' : r.status === 'review' ? 'yellow' : 'red';
    const devText = r.deviation !== null ? '±' + r.deviation.toFixed(2) + '%' : '—';
    const rsdText = r.titrationData.rsd !== null ? r.titrationData.rsd.toFixed(2) + '%' : '—';
    const passTests = r.titrationData.parallelTests.filter(t => t.volume !== null).length;

    document.getElementById('summaryCards').innerHTML = `
        <div class="summary-card ${gradeClass}">
            <div class="summary-label">实测品位</div>
            <div class="summary-value">${gradeText}</div>
            <div class="summary-note">理论值 ${r.theoreticalGrade.toFixed(2)}%</div>
        </div>
        <div class="summary-card ${r.deviationStatus === 'pass' ? 'green' : r.deviationStatus === 'review' ? 'yellow' : 'red'}">
            <div class="summary-label">与理论值偏差</div>
            <div class="summary-value">${devText}</div>
            <div class="summary-note">允许范围 ±0.30%</div>
        </div>
        <div class="summary-card primary">
            <div class="summary-label">平行样精密度（RSD）</div>
            <div class="summary-value">${rsdText}</div>
            <div class="summary-note">允许限 ≤0.50%</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">有效平行试验</div>
            <div class="summary-value">${passTests} / 3</div>
            <div class="summary-note">滴定体积 ${r.titrationData.titrantVolume !== null ? r.titrationData.titrantVolume.toFixed(2) + ' mL' : '—'}</div>
        </div>
    `;
}

function renderTitrationData(r) {
    const td = r.titrationData;
    const parallelRows = td.parallelTests.map(t => `
        <div class="data-row">
            <span class="data-key">第${t.testNo}组 滴定体积</span>
            <span class="data-val">${t.volume !== null ? t.volume.toFixed(2) + ' mL' : '缺失'}</span>
        </div>
        <div class="data-row">
            <span class="data-key">第${t.testNo}组 计算品位</span>
            <span class="data-val">${t.grade !== null ? t.grade.toFixed(2) + '%' : '缺失'}</span>
        </div>
    `).join('');

    document.getElementById('titrationDataBlock').innerHTML = `
        <div class="data-row">
            <span class="data-key">分析方法</span>
            <span class="data-val" style="font-family:inherit;">${td.method}</span>
        </div>
        <div class="data-row">
            <span class="data-key">指示剂</span>
            <span class="data-val" style="font-family:inherit;">${td.indicator}</span>
        </div>
        <div class="data-row">
            <span class="data-key">标准溶液</span>
            <span class="data-val" style="font-family:inherit;">${td.titrantName}</span>
        </div>
        <div class="data-row">
            <span class="data-key">标准溶液浓度</span>
            <span class="data-val">${td.titrantConcentration !== null ? td.titrantConcentration.toFixed(4) + ' ' + td.titrantConcentrationUnit : '缺失'}</span>
        </div>
        <div class="data-row">
            <span class="data-key">滴定管初读数</span>
            <span class="data-val">${td.buretteInitial !== null ? td.buretteInitial.toFixed(2) + ' mL' : '缺失'}</span>
        </div>
        <div class="data-row">
            <span class="data-key">滴定管终读数</span>
            <span class="data-val">${td.buretteFinal !== null ? td.buretteFinal.toFixed(2) + ' mL' : '缺失'}</span>
        </div>
        <div class="data-row">
            <span class="data-key">滴定剂消耗体积</span>
            <span class="data-val">${td.titrantVolume !== null ? td.titrantVolume.toFixed(2) + ' mL' : '缺失'}</span>
        </div>
        <div class="data-row">
            <span class="data-key">试样称取质量</span>
            <span class="data-val">${td.sampleWeight !== null ? td.sampleWeight.toFixed(4) + ' g' : '缺失'}</span>
        </div>
        ${parallelRows}
    `;
}

function renderReagentCheck(r) {
    document.getElementById('reagentCheck').innerHTML = r.reagentLedger.map(reg => {
        const statusClass = reg.status === 'ok' ? 'rs-ok' : reg.status === 'warn' ? 'rs-warn' : 'rs-fail';
        const statusText = reg.status === 'ok' ? '✓ 匹配' : reg.status === 'warn' ? '⚠ 存疑' : '✗ 冲突';
        const concInfo = reg.concInLedger ? `
            <div style="font-size:11px; color:var(--gray-500); margin-top:2px;">
                台账: ${reg.concInLedger} | 使用: ${reg.concUsed !== null ? reg.concUsed : '未填'}
                ${reg.expiryDate ? ` | 有效期: ${reg.expiryDate}` : ''}
            </div>
        ` : '';
        const remark = reg.remark ? `<div style="font-size:11px; color:var(--red); margin-top:4px;">${reg.remark}</div>` : '';
        return `
            <div class="reagent-row">
                <div>
                    <div class="reagent-name">${reg.name}</div>
                    <div style="font-size:11px; color:var(--gray-500); margin-top:2px;">
                        批号: ${reg.batchNo || '未登记'}
                    </div>
                    ${concInfo}
                    ${remark}
                </div>
                <div class="reagent-result">
                    <span class="reagent-status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderAnomalyTrace(r) {
    document.getElementById('anomalyTrace').innerHTML = r.anomalies.map(a => `
        <div class="anomaly-item anomaly-${a.level}">
            <div class="anomaly-title">${a.title}</div>
            <div class="anomaly-desc">${a.description}</div>
            <div class="anomaly-source">📌 来源：${a.source}</div>
        </div>
    `).join('');
}

function renderChartAnnotations(r) {
    document.getElementById('chartAnnotations').innerHTML = r.chartAnnotations.map(a => `
        <div class="annotation-item">
            <span class="anno-dot ${a.color}"></span>
            <span class="anno-text">${a.text}</span>
        </div>
    `).join('');
}

function renderNarrative(r) {
    const sources = [
        `原始行号 L${r.originalRow}：${r.sourceNote}`,
        `谱图文件：${r.imageName}`,
        `试剂台账：${r.reagentLedger.map(x => x.name + '[' + (x.batchNo || '未登记') + ']').join('；')}`,
        r.duplicateBatchWith ? `批号重复关联：${r.duplicateBatchWith}` : null
    ].filter(Boolean);

    document.getElementById('narrativeBlock').innerHTML = `
        <div class="narrative-text">${r.narrative}</div>
        <div class="narrative-source">
            <div style="font-weight:600; margin-bottom:8px; color:var(--gray-700);">来源追溯</div>
            <ul class="source-list">
                ${sources.map(s => `
                    <li>
                        <span class="source-tag">追溯</span>
                        ${s}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

function renderChart(r) {
    const ctx = document.getElementById('titrationChart').getContext('2d');
    if (currentChart) currentChart.destroy();

    const points = r.titrationData.curvePoints;
    const volumes = points.map(p => p.volume);
    const potentials = points.map(p => p.potential);

    const lineColor = r.status === 'pass' ? '#0e9f6e' : r.status === 'review' ? '#d97706' : '#e02424';
    const bgColor = r.status === 'pass' ? 'rgba(14, 159, 110, 0.1)' : r.status === 'review' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(224, 36, 36, 0.1)';

    const eqVolume = r.titrationData.titrantVolume;
    const anomalyPoints = r.status === 'reject' ? [12, 28, 41].map(i => ({
        x: points[i]?.volume,
        y: points[i]?.potential
    })).filter(p => p.x !== undefined) : [];

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: volumes,
            datasets: [
                {
                    label: '电位 E (mV)',
                    data: potentials,
                    borderColor: lineColor,
                    backgroundColor: bgColor,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.2,
                    pointRadius: r.status === 'reject' ? 0 : 2,
                    pointBackgroundColor: lineColor
                },
                ...anomalyPoints.map((ap, idx) => ({
                    label: `异常点 ${idx + 1}`,
                    data: potentials.map((_, i) => points[i].volume === ap.x ? ap.y : null),
                    borderColor: '#e02424',
                    backgroundColor: '#e02424',
                    pointRadius: 8,
                    pointStyle: 'triangle',
                    showLine: false
                }))
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (items) => `滴定体积: ${items[0].label} mL`,
                        label: (item) => `电位: ${item.raw} mV`
                    }
                },
                annotation: eqVolume ? {
                    annotations: {
                        line1: {
                            type: 'line',
                            xMin: volumes.findIndex(v => v >= eqVolume - 0.5),
                            xMax: volumes.findIndex(v => v >= eqVolume - 0.5),
                            borderColor: '#1a56db',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: '计量点',
                                position: 'start'
                            }
                        }
                    }
                } : {}
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '滴定剂体积 V (mL)',
                        font: { weight: '500' }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    title: {
                        display: true,
                        text: '电极电位 E (mV)',
                        font: { weight: '500' }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

function goBack() {
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('listView').classList.remove('hidden');
    document.getElementById('btnBack').classList.add('hidden');
    if (currentChart) { currentChart.destroy(); currentChart = null; }
    currentRecordId = null;
}

function exportReport() {
    if (!currentRecordId) {
        const allReports = TITRATION_RECORDS.map(r => generateReportText(r)).join('\n\n' + '='.repeat(70) + '\n\n');
        downloadFile(allReports, `矿石品位滴定核对报告_全部_${formatDate()}.txt`, 'text/plain');
        return;
    }
    const r = TITRATION_RECORDS.find(x => x.id === currentRecordId);
    if (r) {
        downloadFile(generateReportText(r), `滴定核对报告_${r.batchNo}_${r.oreId}_${formatDate()}.txt`, 'text/plain');
    }
}

function generateReportText(r) {
    const td = r.titrationData;
    const regentSummary = r.reagentLedger.map(x => {
        const s = x.status === 'ok' ? '[匹配]' : x.status === 'warn' ? '[存疑]' : '[冲突]';
        return `${s} ${x.name} (批号: ${x.batchNo || '未登记'})${x.remark ? ' - ' + x.remark : ''}`;
    }).join('\n  ');
    const anomalySummary = r.anomalies.map(a => {
        const lv = a.level === 'green' ? '[正常]' : a.level === 'yellow' ? '[待复核]' : '[异常]';
        return `${lv} ${a.title}\n      ${a.description}\n      来源: ${a.source}`;
    }).join('\n  ');
    const parallel = td.parallelTests.map(t => {
        const v = t.volume !== null ? t.volume.toFixed(2) + ' mL' : '缺失';
        const g = t.grade !== null ? t.grade.toFixed(2) + '%' : '缺失';
        return `第${t.testNo}组: V=${v}, w=${g}`;
    }).join('; ');

    return `======================================================================
          矿石品位滴定核对报告
======================================================================

【基本信息】
  报告编号: ${r.id}
  生成日期: ${formatDate()}
  原始记录行号: L${r.originalRow}
  样品批号: ${r.batchNo}${r.duplicateBatchWith ? ' (⚠ 与 ' + r.duplicateBatchWith + ' 批号重复)' : ''}
  矿石编号: ${r.oreId}
  实验日期: ${r.experimentDate}
  学生/小组: ${r.studentName} / ${r.studentGroup}
  谱图文件名: ${r.imageName}
  原始记录本: ${r.sourceNote}

【核对结论】
  综合状态: ${r.statusText}
  实测品位: ${r.measuredGrade !== null ? r.measuredGrade.toFixed(2) + '%' : '数据缺失'}
  理论品位: ${r.theoreticalGrade.toFixed(2)}%
  偏差: ${r.deviation !== null ? '±' + r.deviation.toFixed(2) + '%' : '—'} (允许范围 ±0.30%)

【滴定原始数据】
  分析方法: ${td.method}
  指示剂: ${td.indicator}
  标准溶液: ${td.titrantName}
  标准溶液浓度: ${td.titrantConcentration !== null ? td.titrantConcentration.toFixed(4) + ' ' + td.titrantConcentrationUnit : '缺失'}
  滴定管初/终读数: ${td.buretteInitial !== null ? td.buretteInitial.toFixed(2) : '?'} / ${td.buretteFinal !== null ? td.buretteFinal.toFixed(2) : '?'} mL
  消耗体积: ${td.titrantVolume !== null ? td.titrantVolume.toFixed(2) : '?'} mL
  试样质量: ${td.sampleWeight !== null ? td.sampleWeight.toFixed(4) : '?'} g
  平行试验: ${parallel}
  精密度 RSD: ${td.rsd !== null ? td.rsd.toFixed(2) + '%' : '—'} (允许限 ≤0.50%)

【试剂台账核对】
  ${regentSummary}

【异常留痕】
  ${anomalySummary}

【谱图判读要点】
${r.chartAnnotations.map(a => '  • ' + a.text).join('\n')}

【文字说明】
${r.narrative}

【来源追溯】
  1. 原始数据行号: L${r.originalRow} — ${r.sourceNote}
  2. 谱图文件: ${r.imageName}
  3. 试剂台账: ${r.reagentLedger.map(x => x.name + '[' + (x.batchNo || '未登记') + ']').join('；')}
${r.duplicateBatchWith ? '  4. 批号重复关联记录: ' + r.duplicateBatchWith + ' (请一并核查)' : ''}

======================================================================
`;
}

function downloadFile(content, filename, mime) {
    const blob = new Blob(['\ufeff' + content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function formatDate() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}
