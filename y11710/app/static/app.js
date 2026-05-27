let currentData = null;
let currentReport = null;

const elements = {
    fileInput: document.getElementById('file-input'),
    btnSample: document.getElementById('btn-sample'),
    btnAnalyze: document.getElementById('btn-analyze'),
    dataPreview: document.getElementById('data-preview'),
    previewSource: document.getElementById('preview-source'),
    previewCount: document.getElementById('preview-count'),
    previewWarnings: document.getElementById('preview-warnings'),
    analysisResults: document.getElementById('analysis-results'),
    resultSummary: document.getElementById('result-summary'),
    paramPeriod: document.getElementById('param-period'),
    paramFrequency: document.getElementById('param-frequency'),
    paramGamma: document.getElementById('param-gamma'),
    paramZeta: document.getElementById('param-zeta'),
    paramAmplitude: document.getElementById('param-amplitude'),
    paramR2: document.getElementById('param-r2'),
    anomalySummary: document.getElementById('anomaly-summary'),
    anomalyList: document.getElementById('anomaly-list'),
    fitMessage: document.getElementById('fit-message'),
    chartContainer: document.getElementById('chart-container'),
    fitChart: document.getElementById('fit-chart'),
    exportSection: document.getElementById('export-section'),
    currentRecordId: document.getElementById('current-record-id'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportTxt: document.getElementById('btn-export-txt'),
    btnExportPng: document.getElementById('btn-export-png'),
    historyList: document.getElementById('history-list'),
    toast: document.getElementById('toast')
};

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.success) {
            currentData = result.data;
            showDataPreview(result.data, result.validation);
            elements.btnAnalyze.disabled = !result.validation.valid;
            showToast('文件上传成功', 'success');
        } else {
            showToast(result.error || '上传失败', 'error');
        }
    } catch (e) {
        showToast('上传失败: ' + e.message, 'error');
    }
}

async function loadSample() {
    try {
        const response = await fetch('/api/sample', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: 'S001', with_anomalies: true })
        });
        const result = await response.json();
        
        if (result.success) {
            currentData = result.data;
            showDataPreview(result.data, result.validation);
            elements.btnAnalyze.disabled = !result.validation.valid;
            showToast('样例数据加载成功', 'success');
        } else {
            showToast(result.error || '加载失败', 'error');
        }
    } catch (e) {
        showToast('加载失败: ' + e.message, 'error');
    }
}

function showDataPreview(data, validation) {
    elements.dataPreview.classList.remove('hidden');
    elements.previewSource.textContent = `来源: ${data.source}`;
    elements.previewCount.textContent = `数据点: ${data.time.length} 个`;
    
    elements.previewWarnings.innerHTML = '';
    if (validation.errors.length > 0) {
        validation.errors.forEach(err => {
            const div = document.createElement('div');
            div.className = 'error-item';
            div.textContent = err;
            elements.previewWarnings.appendChild(div);
        });
    }
    if (validation.warnings.length > 0) {
        validation.warnings.forEach(warn => {
            const div = document.createElement('div');
            div.className = 'warning-item';
            div.textContent = warn;
            elements.previewWarnings.appendChild(div);
        });
    }
}

async function analyzeData() {
    if (!currentData) return;
    
    elements.btnAnalyze.disabled = true;
    elements.btnAnalyze.textContent = '分析中...';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
        });
        const result = await response.json();
        
        if (result.success) {
            currentReport = result.report;
            showAnalysisResults(result);
            showChart(result.report.plot_image);
            showExportOptions(result.record_id);
            loadHistory();
            showToast('分析完成', 'success');
        } else {
            showToast(result.error || '分析失败', 'error');
            if (result.validation) {
                showDataPreview(currentData, result.validation);
            }
        }
    } catch (e) {
        showToast('分析失败: ' + e.message, 'error');
    } finally {
        elements.btnAnalyze.disabled = false;
        elements.btnAnalyze.textContent = '开始分析';
    }
}

function showAnalysisResults(result) {
    elements.analysisResults.classList.remove('hidden');
    
    const fit = result.fit_result;
    
    elements.resultSummary.textContent = result.report.summary;
    elements.resultSummary.className = 'result-summary';
    
    elements.paramPeriod.textContent = `${fit.period.toFixed(4)} s`;
    elements.paramFrequency.textContent = `${fit.frequency.toFixed(4)} Hz`;
    elements.paramGamma.textContent = `${fit.gamma.toFixed(6)} s⁻¹`;
    elements.paramZeta.textContent = `${fit.damping_ratio.toFixed(6)}`;
    elements.paramAmplitude.textContent = `${fit.amplitude.toFixed(6)} m`;
    elements.paramR2.textContent = `${fit.r_squared.toFixed(4)}`;
    
    const anomalySum = result.anomaly_summary;
    elements.anomalySummary.textContent = anomalySum.message;
    elements.anomalySummary.className = anomalySum.severity;
    
    elements.anomalyList.innerHTML = '';
    if (result.anomalies.length > 0) {
        result.anomalies.slice(0, 10).forEach((a, i) => {
            const div = document.createElement('div');
            div.className = 'anomaly-item';
            if ('index' in a) {
                div.textContent = `[${i+1}] 索引 ${a.index}: ${a.type || '未知类型'}`;
            } else {
                div.textContent = `[${i+1}] 采样漏点: t=${a.time_before.toFixed(2)}~${a.time_after.toFixed(2)}s`;
            }
            elements.anomalyList.appendChild(div);
        });
    }
    
    elements.fitMessage.textContent = fit.fit_message;
    if (!fit.fit_success) {
        elements.fitMessage.className = 'fit-message error';
        elements.resultSummary.classList.add('error');
    } else if (fit.fit_message.includes('警告')) {
        elements.fitMessage.className = 'fit-message warning';
    } else {
        elements.fitMessage.className = 'fit-message info';
    }
}

function showChart(base64Image) {
    elements.chartContainer.querySelector('.chart-placeholder').classList.add('hidden');
    elements.fitChart.classList.remove('hidden');
    elements.fitChart.src = 'data:image/png;base64,' + base64Image;
}

function showExportOptions(recordId) {
    elements.exportSection.classList.remove('hidden');
    elements.currentRecordId.textContent = recordId;
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const result = await response.json();
        
        if (result.success && result.records.length > 0) {
            elements.historyList.innerHTML = '';
            result.records.slice().reverse().forEach(record => {
                const div = document.createElement('div');
                div.className = 'history-item';
                
                const fit = record.results.fit;
                const summary = `T=${fit.period.toFixed(4)}s | γ=${fit.gamma.toFixed(6)} | R²=${fit.r_squared.toFixed(4)}`;
                
                div.innerHTML = `
                    <div class="history-info">
                        <div class="history-id">#${record.id}</div>
                        <div class="history-student">${record.student_id || '未知学生'}</div>
                        <div class="history-summary">${summary}</div>
                        <div class="history-time">${new Date(record.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="history-actions">
                        <button class="btn btn-secondary" onclick="exportReport('${record.id}', 'json')">JSON</button>
                        <button class="btn btn-secondary" onclick="exportReport('${record.id}', 'png')">图</button>
                    </div>
                `;
                elements.historyList.appendChild(div);
            });
        }
    } catch (e) {
        console.error('加载历史失败:', e);
    }
}

async function exportReport(recordId, format) {
    window.open(`/api/export/${recordId}/${format}`, '_blank');
}

elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadFile(file);
    }
});

elements.btnSample.addEventListener('click', loadSample);
elements.btnAnalyze.addEventListener('click', analyzeData);

elements.btnExportJson.addEventListener('click', () => {
    if (currentReport) exportReport(currentReport.record_id, 'json');
});

elements.btnExportTxt.addEventListener('click', () => {
    if (currentReport) exportReport(currentReport.record_id, 'txt');
});

elements.btnExportPng.addEventListener('click', () => {
    if (currentReport) exportReport(currentReport.record_id, 'png');
});

loadHistory();
