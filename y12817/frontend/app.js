const API_BASE = '/api';
const CURRENT_USER = '张育种';

let currentSampleId = null;
let currentSampleData = null;
let coverageChart = null;
let abundanceChart = null;
let diversityChart = null;
let ciChart = null;
let compareChart = null;

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '请求失败');
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message || '网络错误', 'error');
        throw error;
    }
}

async function generateSamples() {
    try {
        const result = await apiCall('/generate-samples', { method: 'POST' });
        showToast(`已生成 ${result.count} 个样例样本`, 'success');
        loadSampleList();
    } catch (e) {
        console.error(e);
    }
}

async function loadSampleList() {
    try {
        const data = await apiCall('/samples');
        renderSampleList(data.samples);
    } catch (e) {
        renderSampleList([]);
    }
}

function renderSampleList(samples) {
    const listEl = document.getElementById('sampleList');
    listEl.innerHTML = '';

    if (samples.length === 0) {
        listEl.innerHTML = '<p style="color:#888;font-size:13px;">暂无样本，点击"生成样例数据"开始</p>';
        return;
    }

    samples.forEach(sample => {
        const item = document.createElement('div');
        item.className = 'sample-item';
        if (sample.sample_id === currentSampleId) {
            item.classList.add('active');
        }
        item.onclick = () => selectSample(sample.sample_id);

        let badges = '';
        if (sample.has_qc_flags) {
            const hasHigh = sample.qc_flags.some(f => f.severity === 'high' && f.status === 'open');
            const badgeClass = hasHigh ? 'badge-danger' : 'badge-warning';
            const flagCount = sample.qc_flags.filter(f => f.status === 'open').length;
            badges += `<span class="badge ${badgeClass}">质控问题 (${flagCount})</span>`;
        }
        if (sample.is_contaminated && !sample.contamination_resolved) {
            badges += `<span class="badge badge-danger">疑似污染</span>`;
        }
        if (sample.contamination_resolved) {
            badges += `<span class="badge badge-success">污染已处理</span>`;
        }
        if (sample.total_coverage !== null && sample.total_coverage !== undefined) {
            badges += `<span class="badge badge-info">覆盖度 ${sample.total_coverage}%</span>`;
        }

        item.innerHTML = `
            <div class="sample-item-title">${sample.sample_id}</div>
            <div class="sample-item-sub">${sample.habitat_type} · ${sample.species_count}种</div>
            <div class="sample-item-sub">${sample.location}</div>
            <div class="sample-item-badges">${badges}</div>
        `;
        listEl.appendChild(item);
    });
}

async function selectSample(sampleId) {
    currentSampleId = sampleId;
    loadSampleList();
    
    document.getElementById('welcomeView').style.display = 'none';
    document.getElementById('sampleDetailView').style.display = 'block';

    await loadSampleDetail();
}

async function loadSampleDetail() {
    if (!currentSampleId) return;

    try {
        const data = await apiCall(`/samples/${currentSampleId}`);
        currentSampleData = data;
        renderSampleDetail(data);
        renderSequencingTable(data.sequencing_results);
        renderQcFlags(data.qc_flags, data.processing_records);
        renderHistory(data.processing_records);
        renderTraceSelector(data.qc_flags);
        populateCompareSelectors(data.reports);

        if (data.reports && data.reports.length > 0) {
            const latestReport = data.reports.reduce((prev, curr) => 
                curr.version > prev.version ? curr : prev
            );
            renderReport(latestReport);
            showReportContent(true);
            document.getElementById('versionInfo').textContent = 
                `当前版本：v${latestReport.version} · 生成于 ${latestReport.generated_at}`;
        } else {
            showReportContent(false);
            document.getElementById('versionInfo').textContent = '尚未生成估算报告';
        }

        updateQCBanner(data);

    } catch (e) {
        console.error(e);
    }
}

function updateQCBanner(data) {
    const banner = document.getElementById('qcbanner');
    const text = document.getElementById('qcBannerText');
    
    const openFlags = data.qc_flags.filter(f => f.status === 'open');
    
    if (openFlags.length > 0) {
        banner.style.display = 'flex';
        const hasHigh = openFlags.some(f => f.severity === 'high');
        if (hasHigh) {
            banner.style.backgroundColor = '#ffebee';
            banner.style.borderColor = '#ef9a9a';
        }
        text.textContent = `⚠️ 该样本存在 ${openFlags.length} 个待处理的质控问题，请检查后再使用估算结果`;
    } else if (data.is_contaminated && !data.contamination_resolved) {
        banner.style.display = 'flex';
        text.textContent = '⚠️ 该样本疑似存在污染，建议复核后使用';
    } else {
        banner.style.display = 'none';
    }
}

function renderSampleDetail(data) {
    const meta = data.metadata;
    document.getElementById('sampleTitle').textContent = 
        `${meta.sample_id} · ${meta.quadrat_id}`;
    document.getElementById('sampleLocation').textContent = `📍 ${meta.location}`;
    document.getElementById('sampleHabitat').textContent = `🌱 ${meta.habitat_type}`;
    document.getElementById('sampleDate').textContent = `📅 ${meta.collection_date}`;
}

function showReportContent(show) {
    document.getElementById('noReportHint').style.display = show ? 'none' : 'block';
    document.getElementById('reportContent').style.display = show ? 'block' : 'none';
    if (show) {
        setTimeout(() => {
            resizeCharts();
        }, 100);
    }
}

function renderReport(report) {
    const est = report.estimate;

    document.getElementById('statTotalCoverage').textContent = est.total_coverage + '%';
    document.getElementById('statRichness').textContent = est.species_richness;
    document.getElementById('statShannon').textContent = est.shannon_index;
    document.getElementById('statEvenness').textContent = est.evenness;
    document.getElementById('statDominant').textContent = est.dominant_species;
    document.getElementById('statCI').textContent = 
        `${est.confidence_interval[0]}% ~ ${est.confidence_interval[1]}%`;

    renderCoverageChart(est.species_coverage);
    renderAbundanceChart(est.species_coverage);
    renderDiversityChart(est);
    renderCIChart(est);

    document.getElementById('plainSummary').textContent = report.plain_language_summary;
    document.getElementById('copyableText').textContent = report.copyable_text;
}

function renderCoverageChart(speciesCoverage) {
    const chartEl = document.getElementById('coverageChart');
    if (!coverageChart) {
        coverageChart = echarts.init(chartEl);
    }

    const sortedSpecies = Object.entries(speciesCoverage)
        .sort((a, b) => b[1] - a[1]);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}: {c}%'
        },
        grid: { left: 80, right: 20, top: 20, bottom: 40 },
        xAxis: {
            type: 'category',
            data: sortedSpecies.map(s => s[0]),
            axisLabel: { rotate: 30, fontSize: 11, interval: 0 }
        },
        yAxis: {
            type: 'value',
            name: '覆盖度(%)',
            axisLabel: { formatter: '{value}%' }
        },
        series: [{
            type: 'bar',
            data: sortedSpecies.map(s => s[1]),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#2d5a27' },
                    { offset: 1, color: '#4a7c40' }
                ])
            },
            barWidth: '60%'
        }]
    };

    coverageChart.setOption(option);
}

function renderAbundanceChart(speciesCoverage) {
    const chartEl = document.getElementById('abundanceChart');
    if (!abundanceChart) {
        abundanceChart = echarts.init(chartEl);
    }

    const sortedSpecies = Object.entries(speciesCoverage)
        .sort((a, b) => b[1] - a[1]);

    const total = sortedSpecies.reduce((sum, s) => sum + s[1], 0);

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}% ({d}%)'
        },
        legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20,
            textStyle: { fontSize: 11 }
        },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 4,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: { show: false },
            emphasis: {
                label: { show: true, fontSize: 12, fontWeight: 'bold' }
            },
            labelLine: { show: false },
            data: sortedSpecies.map((s, i) => ({
                value: s[1],
                name: s[0],
                itemStyle: {
                    color: getColorByIndex(i)
                }
            }))
        }]
    };

    abundanceChart.setOption(option);
}

function renderDiversityChart(estimate) {
    const chartEl = document.getElementById('diversityChart');
    if (!diversityChart) {
        diversityChart = echarts.init(chartEl);
    }

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: { left: 60, right: 20, top: 20, bottom: 30 },
        xAxis: {
            type: 'category',
            data: ['Shannon', 'Simpson', 'Pielou均匀度'],
            axisLabel: { fontSize: 11 }
        },
        yAxis: {
            type: 'value',
            minInterval: 0.1
        },
        series: [{
            type: 'bar',
            data: [
                { value: estimate.shannon_index, itemStyle: { color: '#2d5a27' } },
                { value: estimate.simpson_index, itemStyle: { color: '#4a7c40' } },
                { value: estimate.evenness, itemStyle: { color: '#7cb342' } }
            ],
            barWidth: '40%',
            label: {
                show: true,
                position: 'top',
                fontSize: 11,
                formatter: '{c}'
            }
        }]
    };

    diversityChart.setOption(option);
}

function renderCIChart(estimate) {
    const chartEl = document.getElementById('ciChart');
    if (!ciChart) {
        ciChart = echarts.init(chartEl);
    }

    const ci = estimate.confidence_interval;
    const mid = estimate.total_coverage;

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                return `覆盖度: ${mid}%<br/>置信区间: ${ci[0]}% ~ ${ci[1]}%`;
            }
        },
        grid: { left: 50, right: 20, top: 30, bottom: 30 },
        xAxis: {
            type: 'category',
            data: ['总覆盖度'],
            axisLabel: { fontSize: 11 }
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            name: '%',
            axisLabel: { formatter: '{value}%' }
        },
        series: [
            {
                type: 'bar',
                data: [mid],
                itemStyle: { color: '#2d5a27' },
                barWidth: 60,
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    fontWeight: 'bold'
                }
            },
            {
                type: 'errorBar',
                data: [[ci[0], ci[1]]],
                itemStyle: { color: '#e65100' }
            }
        ]
    };

    ciChart.setOption(option);
}

function renderCompareChart(comparison) {
    const chartEl = document.getElementById('compareChart');
    if (!compareChart) {
        compareChart = echarts.init(chartEl);
    }

    const speciesData = comparison.species_coverage_diff;
    const speciesNames = Object.keys(speciesData).sort((a, b) => 
        speciesData[b].version_b - speciesData[a].version_b
    );

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        legend: {
            data: [`版本 ${comparison.version_a}`, `版本 ${comparison.version_b}`]
        },
        grid: { left: 100, right: 20, top: 40, bottom: 40 },
        yAxis: {
            type: 'category',
            data: speciesNames,
            axisLabel: { fontSize: 11 }
        },
        xAxis: {
            type: 'value',
            name: '覆盖度(%)',
            axisLabel: { formatter: '{value}%' }
        },
        series: [
            {
                name: `版本 ${comparison.version_a}`,
                type: 'bar',
                data: speciesNames.map(s => speciesData[s].version_a),
                itemStyle: { color: '#90caf9' }
            },
            {
                name: `版本 ${comparison.version_b}`,
                type: 'bar',
                data: speciesNames.map(s => speciesData[s].version_b),
                itemStyle: { color: '#2d5a27' }
            }
        ]
    };

    compareChart.setOption(option);
}

function getColorByIndex(index) {
    const colors = [
        '#2d5a27', '#4a7c40', '#7cb342', '#aed581', '#dce775',
        '#ffd54f', '#ffb74d', '#ff8a65', '#e57373', '#f06292',
        '#ba68c8', '#9575cd', '#7986cb', '#64b5f6', '#4fc3f7'
    ];
    return colors[index % colors.length];
}

function renderSequencingTable(results) {
    const tbody = document.getElementById('sequencingTableBody');
    tbody.innerHTML = '';

    results.forEach(result => {
        const tr = document.createElement('tr');
        
        let qualityClass = 'quality-high';
        if (result.quality_score < 25) qualityClass = 'quality-low';
        else if (result.quality_score < 30) qualityClass = 'quality-medium';

        const isContaminant = result.species_name.includes('污染') || 
                             result.species_name.includes('大肠');

        tr.innerHTML = `
            <td>
                ${isContaminant ? '<span class="badge badge-danger">疑似污染</span> ' : ''}
                ${result.species_name}
            </td>
            <td>${result.read_count.toLocaleString()}</td>
            <td>${(result.relative_abundance * 100).toFixed(2)}%</td>
            <td>${result.gc_content ? result.gc_content + '%' : '--'}</td>
            <td class="${qualityClass}">${result.quality_score || '--'}</td>
            <td>
                <button class="btn btn-small btn-secondary" 
                    onclick="showModifyModal('${result.species_name}', ${result.read_count})">
                    修改
                </button>
                <button class="btn btn-small btn-danger" 
                    onclick="removeSpecies('${result.species_name}')">
                    删除
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderQcFlags(flags, records) {
    const container = document.getElementById('qcFlagsList');
    container.innerHTML = '';

    if (flags.length === 0) {
        container.innerHTML = '<p style="color:#888;font-size:13px;">暂无质控问题</p>';
    } else {
        flags.forEach(flag => {
            const card = document.createElement('div');
            card.className = `qc-flag-card severity-${flag.severity}`;
            if (flag.status === 'resolved') {
                card.classList.add('status-resolved');
            }

            const statusBadge = flag.status === 'resolved' 
                ? '<span class="badge badge-success">已处理</span>'
                : '<span class="badge badge-warning">待处理</span>';

            const severityLabel = {
                high: '高',
                medium: '中',
                low: '低'
            }[flag.severity] || flag.severity;

            let resolutionHtml = '';
            if (flag.status === 'resolved') {
                resolutionHtml = `
                    <div class="qc-flag-resolution">
                        <strong>处理结果：</strong>${flag.resolution}<br>
                        <span style="font-size:11px;color:#666;">
                            处理人：${flag.resolved_by} · ${flag.resolved_at}
                        </span>
                    </div>
                `;
            }

            let actionsHtml = '';
            if (flag.status === 'open') {
                actionsHtml = `
                    <div class="qc-flag-actions">
                        <button class="btn btn-small btn-primary" 
                            onclick="showResolveQcModal('${flag.flag_id}')">
                            处理此问题
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="qc-flag-header">
                    <div>
                        <span class="qc-flag-title">${flag.description}</span>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span class="badge badge-${flag.severity === 'high' ? 'danger' : 'warning'}">
                            ${severityLabel}级
                        </span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="qc-flag-meta">
                    标记类型：${flag.flag_type} · 
                    提出人：${flag.raised_by} · 
                    ${flag.raised_at}
                </div>
                ${resolutionHtml}
                ${actionsHtml}
            `;
            container.appendChild(card);
        });
    }

    const recordsContainer = document.getElementById('processingRecordsQc');
    recordsContainer.innerHTML = '';
    
    if (records.length === 0) {
        recordsContainer.innerHTML = '<p style="color:#888;font-size:13px;">暂无处理记录</p>';
    } else {
        records.slice().reverse().forEach(record => {
            const div = document.createElement('div');
            div.className = 'record-item';
            
            let reasonHtml = '';
            if (record.reason) {
                reasonHtml = `<div class="record-reason">原因：${record.reason}</div>`;
            }

            let detailsHtml = '';
            if (record.details) {
                detailsHtml = `<div class="record-details">${JSON.stringify(record.details, null, 0)}</div>`;
            }

            div.innerHTML = `
                <div class="record-header">
                    <span class="record-action">${actionTypeLabel(record.action_type)}</span>
                    <span class="record-time">${record.timestamp}</span>
                </div>
                <div class="record-time">操作人：${record.operator}</div>
                ${detailsHtml}
                ${reasonHtml}
            `;
            recordsContainer.appendChild(div);
        });
    }
}

function actionTypeLabel(type) {
    const labels = {
        'sample_collection': '样本采集',
        'sequencing': '样本测序',
        'coverage_estimation': '覆盖度估算',
        'modify_sequencing': '测序结果修正',
        'qc_resolve': '质控问题处理',
        'add_species': '添加物种',
        'remove_species': '删除物种'
    };
    return labels[type] || type;
}

function renderHistory(records) {
    const timeline = document.getElementById('historyTimeline');
    timeline.innerHTML = '';

    const sorted = records.slice().sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    sorted.forEach(record => {
        const item = document.createElement('div');
        item.className = `timeline-item ${record.action_type}`;

        let detailsStr = '';
        if (record.details) {
            const keys = Object.keys(record.details);
            detailsStr = keys.map(k => `${k}: ${record.details[k]}`).join(' · ');
        }

        let reasonHtml = '';
        if (record.reason) {
            reasonHtml = `<div class="timeline-reason">💬 ${record.reason}</div>`;
        }

        item.innerHTML = `
            <div class="timeline-header">
                <span class="timeline-action">${actionTypeLabel(record.action_type)}</span>
                <span class="timeline-operator">${record.operator}</span>
            </div>
            <div class="timeline-time">${record.timestamp}</div>
            <div class="timeline-details">${detailsStr}</div>
            ${reasonHtml}
        `;
        timeline.appendChild(item);
    });
}

function renderTraceSelector(flags) {
    const select = document.getElementById('traceFlagSelect');
    select.innerHTML = '';

    const traceContent = document.getElementById('traceContent');
    const noTraceHint = document.getElementById('noTraceHint');

    if (flags.length === 0) {
        noTraceHint.style.display = 'block';
        traceContent.style.display = 'none';
        return;
    }

    noTraceHint.style.display = 'none';
    
    flags.forEach(flag => {
        const option = document.createElement('option');
        option.value = flag.flag_id;
        option.textContent = `${flag.description} (${flag.severity}级)`;
        select.appendChild(option);
    });

    traceContent.style.display = 'block';
    if (flags.length > 0) {
        runTrace();
    }
}

async function runTrace() {
    if (!currentSampleId) return;
    
    const flagId = document.getElementById('traceFlagSelect').value;
    if (!flagId) return;

    try {
        const traceData = await apiCall(`/samples/${currentSampleId}/trace/${flagId}`);
        renderTraceContent(traceData);
    } catch (e) {
        console.error(e);
    }
}

function renderTraceContent(traceData) {
    const flag = traceData.flag;

    const step1 = document.getElementById('traceStep1');
    step1.innerHTML = `
        <div class="trace-info-box">
            <div class="trace-info-row">
                <span class="trace-info-label">异常类型</span>
                <span class="trace-info-value">${flag.flag_type}</span>
            </div>
            <div class="trace-info-row">
                <span class="trace-info-label">问题描述</span>
                <span class="trace-info-value">${flag.description}</span>
            </div>
            <div class="trace-info-row">
                <span class="trace-info-label">严重程度</span>
                <span class="trace-info-value">${flag.severity}级</span>
            </div>
            <div class="trace-info-row">
                <span class="trace-info-label">当前状态</span>
                <span class="trace-info-value">
                    ${flag.status === 'resolved' ? '<span class="badge badge-success">已处理</span>' : '<span class="badge badge-warning">待处理</span>'}
                </span>
            </div>
            <div class="trace-info-row">
                <span class="trace-info-label">提出人/时间</span>
                <span class="trace-info-value">${flag.raised_by} · ${flag.raised_at}</span>
            </div>
            ${flag.status === 'resolved' ? `
            <div class="trace-info-row">
                <span class="trace-info-label">处理人/时间</span>
                <span class="trace-info-value">${flag.resolved_by} · ${flag.resolved_at}</span>
            </div>
            <div class="trace-info-row">
                <span class="trace-info-label">处理意见</span>
                <span class="trace-info-value">${flag.resolution}</span>
            </div>
            ` : ''}
        </div>
    `;

    const step2 = document.getElementById('traceStep2');
    if (traceData.affected_species && traceData.affected_species.length > 0) {
        let speciesHtml = '<div class="trace-info-box">';
        traceData.affected_species.forEach(sp => {
            speciesHtml += `
                <div class="trace-info-row">
                    <span class="trace-info-label">物种</span>
                    <span class="trace-info-value"><strong>${sp.species_name}</strong></span>
                </div>
                <div class="trace-info-row">
                    <span class="trace-info-label">reads数</span>
                    <span class="trace-info-value">${sp.read_count.toLocaleString()}</span>
                </div>
                <div class="trace-info-row">
                    <span class="trace-info-label">相对丰度</span>
                    <span class="trace-info-value">${(sp.relative_abundance * 100).toFixed(2)}%</span>
                </div>
                ${sp.quality_score ? `
                <div class="trace-info-row">
                    <span class="trace-info-label">质量值</span>
                    <span class="trace-info-value">${sp.quality_score}</span>
                </div>
                ` : ''}
            `;
        });
        speciesHtml += '</div>';
        step2.innerHTML = speciesHtml;
    } else {
        step2.innerHTML = '<p style="color:#888;">未找到直接受影响的物种数据，可查看完整测序结果。</p>';
    }

    const step3 = document.getElementById('traceStep3');
    if (traceData.related_processing_records && traceData.related_processing_records.length > 0) {
        let recordsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">';
        traceData.related_processing_records.forEach(rec => {
            recordsHtml += `
                <div class="trace-info-box">
                    <div class="trace-info-row">
                        <span class="trace-info-label">操作类型</span>
                        <span class="trace-info-value">${actionTypeLabel(rec.action_type)}</span>
                    </div>
                    <div class="trace-info-row">
                        <span class="trace-info-label">操作人</span>
                        <span class="trace-info-value">${rec.operator}</span>
                    </div>
                    <div class="trace-info-row">
                        <span class="trace-info-label">时间</span>
                        <span class="trace-info-value">${rec.timestamp}</span>
                    </div>
                    ${rec.reason ? `
                    <div class="trace-info-row">
                        <span class="trace-info-label">原因</span>
                        <span class="trace-info-value">${rec.reason}</span>
                    </div>
                    ` : ''}
                </div>
            `;
        });
        recordsHtml += '</div>';
        step3.innerHTML = recordsHtml;
    } else {
        step3.innerHTML = '<p style="color:#888;">暂无相关处理记录。</p>';
    }

    const step4 = document.getElementById('traceStep4');
    if (traceData.reports && traceData.reports.length > 0) {
        const latest = traceData.reports.reduce((prev, curr) => 
            curr.version > prev.version ? prev : curr
        );
        const newest = traceData.reports.reduce((prev, curr) => 
            curr.version > prev.version ? curr : prev
        );
        
        step4.innerHTML = `
            <div class="trace-info-box">
                <div class="trace-info-row">
                    <span class="trace-info-label">报告版本</span>
                    <span class="trace-info-value">共 ${traceData.reports.length} 个版本，最新 v${newest.version}</span>
                </div>
                <div class="trace-info-row">
                    <span class="trace-info-label">最新总覆盖度</span>
                    <span class="trace-info-value"><strong>${newest.estimate.total_coverage}%</strong></span>
                </div>
                <div class="trace-info-row">
                    <span class="trace-info-label">最新物种数</span>
                    <span class="trace-info-value">${newest.estimate.species_richness} 种</span>
                </div>
                <div class="trace-info-row">
                    <span class="trace-info-label">影响说明</span>
                    <span class="trace-info-value">
                        ${flag.status === 'resolved' 
                            ? '该异常已处理，最新报告基于处理后的数据生成' 
                            : '⚠️ 该异常尚未处理，当前报告可能受此异常影响'}
                    </span>
                </div>
            </div>
        `;
    } else {
        step4.innerHTML = '<p style="color:#888;">尚未生成覆盖度报告。</p>';
    }
}

function populateCompareSelectors(reports) {
    const selectA = document.getElementById('compareVersionA');
    const selectB = document.getElementById('compareVersionB');

    selectA.innerHTML = '';
    selectB.innerHTML = '';

    if (!reports || reports.length < 2) {
        document.getElementById('noCompareHint').style.display = 'block';
        document.getElementById('compareContent').style.display = 'none';
        return;
    }

    document.getElementById('noCompareHint').style.display = 'none';
    document.getElementById('compareContent').style.display = 'block';

    const sorted = reports.slice().sort((a, b) => b.version - a.version);

    sorted.forEach((report, index) => {
        const optA = document.createElement('option');
        optA.value = report.version;
        optA.textContent = `v${report.version} · ${report.generated_at}`;
        if (index === 1) optA.selected = true;
        selectA.appendChild(optA);

        const optB = document.createElement('option');
        optB.value = report.version;
        optB.textContent = `v${report.version} · ${report.generated_at}`;
        if (index === 0) optB.selected = true;
        selectB.appendChild(optB);
    });

    updateComparison();
}

async function updateComparison() {
    if (!currentSampleId) return;

    const versionA = parseInt(document.getElementById('compareVersionA').value);
    const versionB = parseInt(document.getElementById('compareVersionB').value);

    if (isNaN(versionA) || isNaN(versionB)) return;

    try {
        const comparison = await apiCall(
            `/samples/${currentSampleId}/reports/compare?version_a=${versionA}&version_b=${versionB}`
        );
        renderComparison(comparison);
    } catch (e) {
        console.error(e);
    }
}

function renderComparison(comp) {
    const covDiff = comp.total_coverage.difference;
    const covDiffEl = document.getElementById('compareCoverageDiff');
    document.getElementById('compareCoverageA').textContent = comp.total_coverage.version_a + '%';
    document.getElementById('compareCoverageB').textContent = comp.total_coverage.version_b + '%';
    covDiffEl.textContent = (covDiff >= 0 ? '+' : '') + covDiff + '%';
    covDiffEl.className = 'compare-diff ' + (covDiff > 0 ? 'positive' : covDiff < 0 ? 'negative' : 'zero');

    const richDiff = comp.species_richness.difference;
    const richDiffEl = document.getElementById('compareRichnessDiff');
    document.getElementById('compareRichnessA').textContent = comp.species_richness.version_a;
    document.getElementById('compareRichnessB').textContent = comp.species_richness.version_b;
    richDiffEl.textContent = (richDiff >= 0 ? '+' : '') + richDiff + ' 种';
    richDiffEl.className = 'compare-diff ' + (richDiff > 0 ? 'positive' : richDiff < 0 ? 'negative' : 'zero');

    const shanDiff = comp.shannon_index.difference;
    const shanDiffEl = document.getElementById('compareShannonDiff');
    document.getElementById('compareShannonA').textContent = comp.shannon_index.version_a;
    document.getElementById('compareShannonB').textContent = comp.shannon_index.version_b;
    shanDiffEl.textContent = (shanDiff >= 0 ? '+' : '') + shanDiff;
    shanDiffEl.className = 'compare-diff ' + (shanDiff > 0 ? 'positive' : shanDiff < 0 ? 'negative' : 'zero');

    document.getElementById('compareDominantA').textContent = comp.dominant_species.version_a;
    document.getElementById('compareDominantB').textContent = comp.dominant_species.version_b;
    const domDiffEl = document.getElementById('compareDominantDiff');
    if (comp.dominant_species.changed) {
        domDiffEl.textContent = '已变更';
        domDiffEl.className = 'compare-diff negative';
    } else {
        domDiffEl.textContent = '未变化';
        domDiffEl.className = 'compare-diff zero';
    }

    renderCompareChart(comp);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });

    setTimeout(() => {
        resizeCharts();
    }, 50);
}

function resizeCharts() {
    if (coverageChart) coverageChart.resize();
    if (abundanceChart) abundanceChart.resize();
    if (diversityChart) diversityChart.resize();
    if (ciChart) ciChart.resize();
    if (compareChart) compareChart.resize();
}

function showModifyModal(speciesName, currentReads) {
    document.getElementById('modifySpeciesName').value = speciesName;
    document.getElementById('modifyReadCount').value = currentReads;
    document.getElementById('modifyReason').value = '';
    document.getElementById('modifyOperator').value = CURRENT_USER;
    document.getElementById('modifyModal').style.display = 'flex';
}

function showAddSpeciesModal() {
    document.getElementById('addSpeciesName').value = '';
    document.getElementById('addSpeciesReads').value = 10000;
    document.getElementById('addSpeciesReason').value = '';
    document.getElementById('addSpeciesOperator').value = CURRENT_USER;
    document.getElementById('addSpeciesModal').style.display = 'flex';
}

function showResolveQcModal(flagId) {
    document.getElementById('resolveFlagId').value = flagId;
    document.getElementById('resolveResolution').value = '';
    document.getElementById('resolveOperator').value = CURRENT_USER;
    document.getElementById('markContaminationResolved').checked = false;
    document.getElementById('resolveQcModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function submitModify() {
    if (!currentSampleId) return;

    const speciesName = document.getElementById('modifySpeciesName').value;
    const newReadCount = parseInt(document.getElementById('modifyReadCount').value);
    const reason = document.getElementById('modifyReason').value;
    const operator = document.getElementById('modifyOperator').value;

    if (!reason.trim()) {
        showToast('请填写修改原因', 'error');
        return;
    }

    try {
        await apiCall(`/samples/${currentSampleId}/sequencing`, {
            method: 'PUT',
            body: JSON.stringify({ species_name: speciesName, new_read_count: newReadCount, operator, reason })
        });
        showToast('测序结果已修改，请重新运行估算', 'success');
        closeModal('modifyModal');
        loadSampleDetail();
    } catch (e) {
        console.error(e);
    }
}

async function submitAddSpecies() {
    if (!currentSampleId) return;

    const speciesName = document.getElementById('addSpeciesName').value;
    const readCount = parseInt(document.getElementById('addSpeciesReads').value);
    const reason = document.getElementById('addSpeciesReason').value;
    const operator = document.getElementById('addSpeciesOperator').value;

    if (!speciesName.trim() || !reason.trim()) {
        showToast('请填写物种名称和添加原因', 'error');
        return;
    }

    try {
        await apiCall(`/samples/${currentSampleId}/species`, {
            method: 'POST',
            body: JSON.stringify({ species_name: speciesName, read_count: readCount, operator, reason })
        });
        showToast('物种已添加，请重新运行估算', 'success');
        closeModal('addSpeciesModal');
        loadSampleDetail();
    } catch (e) {
        console.error(e);
    }
}

async function removeSpecies(speciesName) {
    if (!currentSampleId) return;

    if (!confirm(`确定要删除物种 "${speciesName}" 吗？`)) return;

    const reason = prompt('请说明删除原因：');
    if (!reason) {
        showToast('请填写删除原因', 'error');
        return;
    }

    try {
        await apiCall(`/samples/${currentSampleId}/species`, {
            method: 'DELETE',
            body: JSON.stringify({ species_name: speciesName, operator: CURRENT_USER, reason })
        });
        showToast('物种已删除，请重新运行估算', 'success');
        loadSampleDetail();
    } catch (e) {
        console.error(e);
    }
}

async function submitResolveQc() {
    if (!currentSampleId) return;

    const flagId = document.getElementById('resolveFlagId').value;
    const resolution = document.getElementById('resolveResolution').value;
    const operator = document.getElementById('resolveOperator').value;
    const markResolved = document.getElementById('markContaminationResolved').checked;

    if (!resolution.trim()) {
        showToast('请填写处理意见', 'error');
        return;
    }

    try {
        await apiCall(`/samples/${currentSampleId}/qc/resolve`, {
            method: 'POST',
            body: JSON.stringify({
                flag_id: flagId,
                resolution,
                operator,
                mark_contamination_resolved: markResolved
            })
        });
        showToast('质控问题已处理', 'success');
        closeModal('resolveQcModal');
        loadSampleDetail();
    } catch (e) {
        console.error(e);
    }
}

async function runEstimation() {
    if (!currentSampleId) return;

    try {
        const report = await apiCall(`/samples/${currentSampleId}/estimate`, {
            method: 'POST',
            body: JSON.stringify({ operator: CURRENT_USER })
        });
        showToast('覆盖度估算完成', 'success');
        loadSampleDetail();
        loadSampleList();
    } catch (e) {
        console.error(e);
    }
}

function copyReportText() {
    const text = document.getElementById('copyableText').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败，请手动复制', 'error');
    });
}

window.addEventListener('resize', () => {
    resizeCharts();
});

document.addEventListener('DOMContentLoaded', () => {
    loadSampleList();
});
