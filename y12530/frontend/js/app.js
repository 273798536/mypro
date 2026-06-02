let currentSimulationResult = null;
let currentValidationResult = null;
let currentPKParameters = null;
let concentrationChart = null;
let dosingEvents = [];
let samplingPoints = [];
let currentOperationId = null;

const routeNames = {
    'iv_bolus': '静脉推注',
    'iv_infusion': '静脉滴注',
    'oral': '口服',
    'sc': '皮下注射',
    'im': '肌肉注射'
};

const severityColors = {
    'error': 'text-red-600',
    'warning': 'text-yellow-600',
    'info': 'text-blue-600'
};

document.addEventListener('DOMContentLoaded', function() {
    addDosingEvent();
    setupModelTypeChange();
    refreshOperations();
    refreshDataSources();
    initChart();
});

function setupModelTypeChange() {
    document.getElementById('modelType').addEventListener('change', function() {
        const twoCompParams = document.getElementById('twoCompartmentParams');
        if (this.value === 'two_compartment') {
            twoCompParams.classList.remove('hidden');
        } else {
            twoCompParams.classList.add('hidden');
        }
    });
}

function addDosingEvent() {
    const container = document.getElementById('dosingEvents');
    const eventId = Date.now();
    dosingEvents.push({ id: eventId });
    
    const eventHtml = `
        <div id="event-${eventId}" class="dosing-event-card">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <div>
                    <label class="text-xs text-gray-500">时间 (h)</label>
                    <input type="number" class="dosing-time" value="0" step="0.1" min="0" class="w-full px-2 py-1 border rounded text-sm">
                </div>
                <div>
                    <label class="text-xs text-gray-500">剂量 (mg)</label>
                    <input type="number" class="dosing-dose" value="500" step="1" min="0" class="w-full px-2 py-1 border rounded text-sm">
                </div>
                <div>
                    <label class="text-xs text-gray-500">途径</label>
                    <select class="dosing-route" class="w-full px-2 py-1 border rounded text-sm">
                        <option value="iv_bolus">静脉推注</option>
                        <option value="iv_infusion">静脉滴注</option>
                        <option value="oral">口服</option>
                        <option value="sc">皮下注射</option>
                        <option value="im">肌肉注射</option>
                    </select>
                </div>
                <div class="flex items-end">
                    <button onclick="removeDosingEvent(${eventId})" class="w-full px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition">
                        删除
                    </button>
                </div>
            </div>
            <div class="duration-field hidden">
                <label class="text-xs text-gray-500">滴注持续时间 (h)</label>
                <input type="number" class="dosing-duration" value="1" step="0.1" min="0" class="w-32 px-2 py-1 border rounded text-sm">
            </div>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = eventHtml;
    const eventElement = tempDiv.firstElementChild;
    container.appendChild(eventElement);
    
    const routeSelect = eventElement.querySelector('.dosing-route');
    const durationField = eventElement.querySelector('.duration-field');
    routeSelect.addEventListener('change', function() {
        if (this.value === 'iv_infusion') {
            durationField.classList.remove('hidden');
        } else {
            durationField.classList.add('hidden');
        }
    });
}

function removeDosingEvent(eventId) {
    const element = document.getElementById(`event-${eventId}`);
    if (element) element.remove();
    dosingEvents = dosingEvents.filter(e => e.id !== eventId);
}

function addSamplingPoint() {
    const container = document.getElementById('samplingPoints');
    const pointId = Date.now();
    samplingPoints.push({ id: pointId });
    
    const pointHtml = `
        <div id="sampling-${pointId}" class="sampling-point-card">
            <span class="text-purple-600">⏱</span>
            <input type="number" class="sampling-time flex-1 px-2 py-1 border rounded text-sm" value="1" step="0.1" min="0" placeholder="采样时间(h)">
            <button onclick="removeSamplingPoint(${pointId})" class="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition">
                删除
            </button>
        </div>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pointHtml;
    const pointElement = tempDiv.firstElementChild;
    container.appendChild(pointElement);
}

function removeSamplingPoint(pointId) {
    const element = document.getElementById(`sampling-${pointId}`);
    if (element) element.remove();
    samplingPoints = samplingPoints.filter(p => p.id !== pointId);
}

function collectParameters() {
    const modelType = document.getElementById('modelType').value;
    const params = {
        weight: parseFloat(document.getElementById('weight').value),
        half_life: parseFloat(document.getElementById('halfLife').value),
        vd: parseFloat(document.getElementById('vd').value),
        ka: parseFloat(document.getElementById('ka').value),
        f: parseFloat(document.getElementById('bioavailability').value)
    };
    
    if (modelType === 'two_compartment') {
        params.half_life_alpha = parseFloat(document.getElementById('halfLifeAlpha').value);
        params.half_life_beta = parseFloat(document.getElementById('halfLifeBeta').value);
        params.v1 = parseFloat(document.getElementById('v1').value);
        params.k12 = parseFloat(document.getElementById('k12').value);
        params.k21 = parseFloat(document.getElementById('k21').value);
    }
    
    return params;
}

function collectDosingPlan() {
    const events = [];
    const eventElements = document.querySelectorAll('#dosingEvents > div');
    
    eventElements.forEach((element, index) => {
        const time = parseFloat(element.querySelector('.dosing-time').value);
        const dose = parseFloat(element.querySelector('.dosing-dose').value);
        const route = element.querySelector('.dosing-route').value;
        let durationInput = element.querySelector('.dosing-duration');
        let duration = null;
        
        if (route === 'iv_infusion') {
            duration = parseFloat(durationInput.value);
        }
        
        events.push({
            time: time,
            dose: dose,
            route: route,
            duration: duration
        });
    });
    
    return {
        events: events,
        total_duration: parseFloat(document.getElementById('totalDuration').value),
        time_unit: 'hours',
        dose_unit: 'mg'
    };
}

function collectSamplingPoints() {
    const points = [];
    const pointElements = document.querySelectorAll('#samplingPoints > div');
    
    pointElements.forEach(element => {
        const time = parseFloat(element.querySelector('.sampling-time').value);
        if (!isNaN(time)) {
            points.push({ time: time });
        }
    });
    
    return points;
}

function getOperator() {
    return document.getElementById('operator').value || 'unknown';
}

function showLoading(text = '处理中...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingOverlay').classList.add('flex');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('loadingOverlay').classList.remove('flex');
}

function showStatus(type, title, message, issues = []) {
    const panel = document.getElementById('statusPanel');
    panel.classList.remove('hidden');
    
    let bgColor, borderColor, icon;
    if (type === 'success') {
        bgColor = 'bg-green-50';
        borderColor = 'border-green-400';
        icon = '✅';
    } else if (type === 'error') {
        bgColor = 'bg-red-50';
        borderColor = 'border-red-400';
        icon = '❌';
    } else {
        bgColor = 'bg-yellow-50';
        borderColor = 'border-yellow-400';
        icon = '⚠️';
    }
    
    let issuesHtml = '';
    if (issues.length > 0) {
        issuesHtml = '<div class="mt-3 space-y-2">';
        issues.forEach(issue => {
            const severityClass = issue.severity === 'error' ? 'issue-error' : 
                                 issue.severity === 'warning' ? 'issue-warning' : 'issue-info';
            issuesHtml += `
                <div class="${severityClass} p-3 rounded-lg">
                    <p class="font-medium text-sm">${issue.field}: ${issue.message}</p>
                    ${issue.next_action ? `<p class="text-xs mt-1">💡 建议: ${issue.next_action}</p>` : ''}
                    ${issue.triggered_by ? `<p class="text-xs mt-1">👤 触发人: ${issue.triggered_by}</p>` : ''}
                    ${issue.blocked_step ? `<p class="text-xs mt-1">📍 卡住步骤: ${issue.blocked_step}</p>` : ''}
                </div>
            `;
        });
        issuesHtml += '</div>';
    }
    
    panel.innerHTML = `
        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 ${borderColor} ${bgColor}">
            <div class="flex items-start">
                <span class="text-2xl mr-3">${icon}</span>
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">${title}</h3>
                    <p class="text-sm text-gray-600 mt-1">${message}</p>
                    ${issuesHtml}
                </div>
            </div>
        </div>
    `;
}

async function validateParameters() {
    showLoading('正在校验参数...');
    
    const params = collectParameters();
    const dosingPlan = collectDosingPlan();
    const timeStep = parseFloat(document.getElementById('timeStep').value);
    const operator = getOperator();
    
    try {
        const response = await fetch('/api/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': operator
            },
            body: JSON.stringify({
                parameters: params,
                dosing_plan: dosingPlan,
                time_step: timeStep
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentValidationResult = data.validation_result;
            
            if (data.validation_result.is_valid) {
                showStatus('success', '参数校验通过', `校验完成，未发现错误。可以运行模拟。`, 
                           data.validation_result.warnings);
            } else {
                showStatus('error', '参数校验失败', '请修正以下问题后重试：', 
                           [...data.validation_result.issues, ...data.validation_result.warnings]);
            }
        } else {
            showStatus('error', '校验请求失败', data.error || '未知错误');
        }
    } catch (error) {
        showStatus('error', '网络错误', error.message);
    } finally {
        hideLoading();
        refreshOperations();
    }
}

async function runSimulation() {
    showLoading('正在运行模拟...');
    
    const params = collectParameters();
    const dosingPlan = collectDosingPlan();
    const modelType = document.getElementById('modelType').value;
    const timeStep = parseFloat(document.getElementById('timeStep').value);
    const useAnalytical = document.getElementById('solverMethod').value === 'true';
    const samplingPointsData = collectSamplingPoints();
    const operator = getOperator();
    
    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': operator
            },
            body: JSON.stringify({
                parameters: params,
                dosing_plan: dosingPlan,
                model_type: modelType,
                time_step: timeStep,
                use_analytical: useAnalytical,
                sampling_points: samplingPointsData
            })
        });
        
        const data = await response.json();
        currentOperationId = data.operation_id;
        
        if (data.success && data.result.success) {
            currentSimulationResult = data.result;
            currentValidationResult = data.validation_result;
            currentPKParameters = data.result.pk_parameters;
            
            showStatus('success', '模拟成功完成', 
                      `计算哈希: ${data.result.computation_hash.substring(0, 16)}...`,
                      data.validation_result.warnings);
            
            updateChart(data.result);
            updatePKParameters(data.result.pk_parameters);
            updateComputationInfo(data.result);
            
            if (samplingPointsData.length > 0) {
                updateSamplingImpact(data.result, samplingPointsData);
            }
            
            if (data.validation_result.issues.length > 0 || data.validation_result.warnings.length > 0) {
                showStatus('warning', '模拟完成但有提示', '存在一些需要注意的问题：',
                          [...data.validation_result.issues, ...data.validation_result.warnings]);
            }
            
        } else {
            currentSimulationResult = data.result;
            
            if (data.validation_result && !data.validation_result.is_valid) {
                showStatus('error', '参数校验失败', '请修正以下问题：',
                           [...data.validation_result.issues, ...data.validation_result.warnings]);
            } else if (data.result && !data.result.success) {
                showStatus('error', '模拟求解失败', data.result.error_message || '未知错误');
            } else {
                showStatus('error', '模拟失败', data.message || '未知错误');
            }
            
            if (data.result && data.result.error_message) {
                updateComputationInfo(data.result);
            }
        }
    } catch (error) {
        showStatus('error', '网络错误', error.message);
    } finally {
        hideLoading();
        refreshOperations();
        refreshDataSources();
    }
}

function initChart() {
    const ctx = document.getElementById('concentrationChart').getContext('2d');
    concentrationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} mg/L`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '时间 (小时)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '浓度 (mg/L)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function updateChart(result) {
    if (!result || !result.time_points || !result.concentrations) return;
    
    const timePoints = result.time_points;
    const datasets = [];
    
    if (result.concentrations.central) {
        datasets.push({
            label: '中央室浓度',
            data: result.concentrations.central,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2
        });
    }
    
    if (result.concentrations.peripheral) {
        datasets.push({
            label: '周边室浓度',
            data: result.concentrations.peripheral,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
            borderDash: [5, 5]
        });
    }
    
    if (result.dosing_plan && result.dosing_plan.events) {
        result.dosing_plan.events.forEach(event => {
            const eventTime = event.time;
            const idx = timePoints.findIndex(t => t >= eventTime);
            if (idx >= 0) {
                datasets.push({
                    label: `给药 ${event.dose}mg (${routeNames[event.route]})`,
                    data: timePoints.map((t, i) => i === idx ? result.concentrations.central[idx] : null),
                    pointBackgroundColor: 'rgb(34, 197, 94)',
                    pointBorderColor: '#fff',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false
                });
            }
        });
    }
    
    if (result.sampling_points && result.sampling_points.length > 0) {
        const samplingData = result.sampling_points.map(sp => {
            const idx = timePoints.findIndex(t => Math.abs(t - sp.time) < 0.001);
            return idx >= 0 ? result.concentrations.central[idx] : null;
        });
        datasets.push({
            label: '采样点',
            data: samplingData,
            pointBackgroundColor: 'rgb(168, 85, 247)',
            pointBorderColor: '#fff',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false
        });
    }
    
    concentrationChart.data.labels = timePoints.map(t => t.toFixed(2));
    concentrationChart.data.datasets = datasets;
    concentrationChart.update();
    
    document.getElementById('chartInfo').innerHTML = `
        <span class="text-xs bg-gray-100 px-2 py-1 rounded">${result.solver_method}</span>
        <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">${timePoints.length} 个时间点</span>
    `;
}

function updatePKParameters(pkParams) {
    const container = document.getElementById('pkParameters');
    if (!pkParams) {
        container.innerHTML = '<p class="text-gray-500">运行模拟后显示</p>';
        return;
    }
    
    const params = [
        { key: 'c_max', label: '峰浓度 Cmax', unit: 'mg/L' },
        { key: 't_max', label: '达峰时间 Tmax', unit: 'h' },
        { key: 'auc_0_t', label: 'AUC(0-t)', unit: 'mg·h/L' },
        { key: 'terminal_half_life', label: '末端半衰期 t½', unit: 'h' },
        { key: 'clearance', label: '清除率 CL', unit: 'L/h' },
        { key: 'volume_of_distribution_ss', label: '稳态分布容积 Vss', unit: 'L' }
    ];
    
    let html = '';
    params.forEach(p => {
        const value = pkParams[p.key];
        if (value !== null && value !== undefined) {
            html += `
                <div class="flex justify-between items-center py-1 border-b border-gray-100">
                    <span class="text-gray-600">${p.label}</span>
                    <span class="font-mono font-medium text-gray-800">${typeof value === 'number' ? value.toFixed(4) : value} ${p.unit}</span>
                </div>
            `;
        }
    });
    
    container.innerHTML = html || '<p class="text-gray-500">无可用数据</p>';
}

function updateComputationInfo(result) {
    const container = document.getElementById('computationInfo');
    if (!result) {
        container.innerHTML = '<p class="text-gray-500">运行模拟后显示</p>';
        return;
    }
    
    const modelNames = {
        'one_compartment': '一室模型',
        'two_compartment': '二室模型'
    };
    
    const methodNames = {
        'analytical': '解析解法',
        'numerical_odeint': '数值ODE解法 (odeint)'
    };
    
    let html = '';
    html += `<div class="flex justify-between py-1 border-b border-gray-100">
        <span class="text-gray-600">模型类型</span>
        <span class="font-medium text-gray-800">${modelNames[result.model_type] || result.model_type}</span>
    </div>`;
    
    html += `<div class="flex justify-between py-1 border-b border-gray-100">
        <span class="text-gray-600">求解方法</span>
        <span class="font-medium text-gray-800">${methodNames[result.solver_method] || result.solver_method}</span>
    </div>`;
    
    html += `<div class="flex justify-between py-1 border-b border-gray-100">
        <span class="text-gray-600">计算状态</span>
        <span class="font-medium ${result.success ? 'text-green-600' : 'text-red-600'}">${result.success ? '✅ 成功' : '❌ 失败'}</span>
    </div>`;
    
    if (result.computation_hash) {
        html += `<div class="py-1">
            <span class="text-gray-600 text-xs">计算哈希</span>
            <div class="font-mono text-xs text-gray-500 mt-1 break-all">${result.computation_hash}</div>
        </div>`;
    }
    
    if (!result.success && result.error_message) {
        html += `<div class="mt-2 p-2 bg-red-50 rounded">
            <p class="text-xs text-red-700 font-medium">错误原因:</p>
            <pre class="text-xs text-red-600 mt-1 whitespace-pre-wrap">${result.error_message}</pre>
        </div>`;
    }
    
    if (result.warnings && result.warnings.length > 0) {
        html += `<div class="mt-2 p-2 bg-yellow-50 rounded">
            <p class="text-xs text-yellow-700 font-medium">警告:</p>
            ${result.warnings.map(w => `<p class="text-xs text-yellow-600 mt-1">• ${w}</p>`).join('')}
        </div>`;
    }
    
    if (result.parameters) {
        html += `<div class="mt-2 p-2 bg-blue-50 rounded">
            <p class="text-xs text-blue-700 font-medium">计算参数:</p>
            <div class="text-xs text-blue-600 mt-1">
                ${result.parameters.vd ? `Vd = ${result.parameters.vd.toFixed(4)} L<br>` : ''}
                ${result.parameters.ke ? `ke = ${result.parameters.ke.toFixed(4)} 1/h<br>` : ''}
                ${result.parameters.v1 ? `V1 = ${result.parameters.v1.toFixed(4)} L<br>` : ''}
                ${result.parameters.k10 ? `k10 = ${result.parameters.k10.toFixed(4)} 1/h` : ''}
            </div>
        </div>`;
    }
    
    container.innerHTML = html;
}

function updateSamplingImpact(result, samplingPoints) {
    const container = document.getElementById('samplingImpact');
    const contentDiv = document.getElementById('samplingImpactContent');
    
    if (!samplingPoints || samplingPoints.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    const cMax = Math.max(...result.concentrations.central);
    const tMax = result.time_points[result.concentrations.central.indexOf(cMax)];
    
    let html = '';
    samplingPoints.forEach((sp, index) => {
        const idx = result.time_points.findIndex(t => Math.abs(t - sp.time) < 0.001);
        if (idx < 0) return;
        
        const conc = result.concentrations.central[idx];
        const concRatio = conc / cMax;
        
        let impactLevel, impactColor;
        if (concRatio > 0.9) {
            impactLevel = '高影响';
            impactColor = 'text-red-600 bg-red-50';
        } else if (concRatio > 0.5) {
            impactLevel = '中影响';
            impactColor = 'text-yellow-600 bg-yellow-50';
        } else if (concRatio > 0.1) {
            impactLevel = '中影响';
            impactColor = 'text-yellow-600 bg-yellow-50';
        } else {
            impactLevel = '低影响';
            impactColor = 'text-green-600 bg-green-50';
        }
        
        const details = [];
        if (Math.abs(sp.time - tMax) < 0.5) {
            details.push('📍 接近达峰时间Tmax，影响Cmax计算');
        }
        if (sp.time > result.time_points[result.time_points.length - 1] * 0.7) {
            details.push('📉 位于末端消除相，影响半衰期计算');
        }
        if (Math.abs(sp.time - tMax) < 2 && Math.abs(conc - cMax) < cMax * 0.1) {
            details.push('💡 建议在此附近增加采样点');
        }
        
        html += `
            <div class="p-3 rounded-lg border ${impactColor}">
                <div class="flex justify-between items-center">
                    <span class="font-medium">采样时间 ${sp.time}h</span>
                    <span class="text-xs px-2 py-1 rounded ${impactColor}">${impactLevel}</span>
                </div>
                <div class="text-sm mt-1">
                    <span class="text-gray-600">浓度: ${conc.toFixed(4)} mg/L (${(concRatio * 100).toFixed(1)}% Cmax)</span>
                </div>
                ${details.length > 0 ? `<div class="text-xs mt-2 space-y-1">${details.map(d => `<p>• ${d}</p>`).join('')}</div>` : ''}
            </div>
        `;
    });
    
    contentDiv.innerHTML = html;
}

async function exportReport(format) {
    if (!currentSimulationResult) {
        showStatus('warning', '请先运行模拟', '需要先完成模拟才能导出报告');
        return;
    }
    
    showLoading(`正在导出${format.toUpperCase()}报告...');
    
    const operator = getOperator();
    const samplingPointsData = collectSamplingPoints();
    
    try {
        const response = await fetch(`/api/export/${format}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': operator
            },
            body: JSON.stringify({
                simulation_result: currentSimulationResult,
                validation_result: currentValidationResult,
                pk_parameters: currentPKParameters,
                sampling_points: samplingPointsData
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus('success', '导出成功', `报告已生成: ${data.filename}`);
            
            setTimeout(() => {
                window.open(data.download_url, '_blank');
            }, 500);
        } else {
            showStatus('error', '导出失败', data.error || '未知错误');
        }
    } catch (error) {
        showStatus('error', '网络错误', error.message);
    } finally {
        hideLoading();
        refreshOperations();
    }
}

async function refreshOperations() {
    try {
        const response = await fetch('/api/operations?limit=10');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('operationHistory');
            if (data.operations.length === 0) {
                container.innerHTML = '<p class="text-gray-500">暂无操作记录</p>';
                return;
            }
            
            let html = '';
            data.operations.forEach(op => {
                const statusClass = `operation-status-${op.status}`;
                const statusIcon = op.status === 'completed' ? '✅' :
                                 op.status === 'running' ? '⏳' : '❌';
                const statusText = {
                    'completed': '已完成',
                    'failed': '失败',
                    'running': '进行中',
                    'validation_error': '校验错误',
                    'ode_error': '求解错误'
                }[op.status] || op.status;
                
                const typeText = {
                    'parameter_import': '参数导入',
                    'dosing_plan_import': '给药计划导入',
                    'validation': '参数校验',
                    'simulation': '模拟计算',
                    'report_export': '报告导出',
                    'sampling_point_add': '采样点添加',
                    'data_import': '数据导入'
                }[op.operation_type] || op.operation_type;
                
                html += `
                    <div class="operation-card ${statusClass}">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="mr-2">${statusIcon}</span>
                                <span class="font-medium">${typeText}</span>
                                <span class="text-xs text-gray-500 ml-2">${statusText}</span>
                            </div>
                            <span class="text-xs text-gray-400">${op.timestamp.substring(11, 19)}</span>
                        </div>
                        ${op.triggered_by ? `<div class="text-xs text-gray-500 mt-1">👤 ${op.triggered_by}</div>` : ''}
                        ${op.error_message ? `<div class="text-xs text-red-600 mt-1">❌ ${op.error_message.substring(0, 100)}${op.error_message.length > 100 ? '...' : ''}</div>` : ''}
                        ${op.blocked_step ? `<div class="text-xs text-yellow-600 mt-1">📍 卡住: ${op.blocked_step}</div>` : ''}
                        ${op.next_action ? `<div class="text-xs text-blue-600 mt-1">💡 ${op.next_action}</div>` : ''}
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to refresh operations:', error);
    }
}

async function refreshDataSources() {
    try {
        const response = await fetch('/api/data/sources');
        const data = await response.json();
        
        if (data.success) {
            const originalContainer = document.getElementById('originalSources');
            const processedContainer = document.getElementById('processedResults');
            
            if (data.original_sources.length === 0) {
                originalContainer.innerHTML = '<p class="text-gray-500">暂无原始数据</p>';
            } else {
                let html = '';
                data.original_sources.forEach(src => {
                    const categoryNames = {
                        'dosing_plan': '给药计划',
                        'patient_parameters': '患者参数',
                        'drug_parameters': '药物参数',
                        'sampling_points': '采样点',
                        'simulation_result': '模拟结果'
                    };
                    const sourceNames = {
                        'user_input': '手动输入',
                        'file_import': '文件导入',
                        'api_import': 'API导入'
                    };
                    
                    html += `
                        <div class="data-source-card data-source-original">
                            <div class="flex justify-between">
                                <span class="font-medium">${categoryNames[src.category] || src.category}</span>
                                <span class="text-xs text-gray-500">${sourceNames[src.source] || src.source}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${src.imported_by ? `👤 ${src.imported_by}` : ''}
                                ${src.created_at ? ` · ${src.created_at.substring(5, 16)}` : ''}
                            </div>
                            ${src.source_info && src.source_info.filename ? `<div class="text-xs text-blue-600 mt-1">📄 ${src.source_info.filename}</div>` : ''}
                        </div>
                    `;
                });
                originalContainer.innerHTML = html;
            }
            
            if (data.processed_results.length === 0) {
                processedContainer.innerHTML = '<p class="text-gray-500">暂无处理结果</p>';
            } else {
                let html = '';
                data.processed_results.forEach(res => {
                    const categoryNames = {
                        'simulation_result': '模拟结果',
                        'validation_report': '校验报告',
                        'exported_report': '导出报告'
                    };
                    
                    html += `
                        <div class="data-source-card data-source-derived">
                            <div class="flex justify-between">
                                <span class="font-medium">${categoryNames[res.category] || res.category}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${res.created_by ? `👤 ${res.created_by}` : ''}
                                ${res.created_at ? ` · ${res.created_at.substring(5, 16)}` : ''}
                            </div>
                            ${res.derivation_method ? `<div class="text-xs text-purple-600 mt-1">🔄 ${res.derivation_method}</div>` : ''}
                        </div>
                    `;
                });
                processedContainer.innerHTML = html;
            }
        }
    } catch (error) {
        console.error('Failed to refresh data sources:', error);
    }
}

setInterval(refreshOperations, 5000);
