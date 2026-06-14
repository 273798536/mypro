let currentParameterId = null;
let currentScreenshotFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadParameters();
    setupTabs();
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'calculation') {
                loadParameterSelect();
            }
        });
    });
}

async function apiCall(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.detail || '请求失败');
    }
    return result;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

async function loadParameters() {
    try {
        const parameters = await apiCall('/api/parameters/');
        const container = document.getElementById('parameter-list');
        if (parameters.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">暂无参数，请点击上方按钮创建</p>';
            return;
        }
        container.innerHTML = parameters.map(p => `
            <div class="parameter-card" onclick="showParameterDetail(${p.id})">
                <div class="parameter-info">
                    <h3>${p.param_name}</h3>
                    <p>键名: ${p.param_key} | 单位: ${p.unit || '未设置'}</p>
                    <p>阈值: ${p.threshold_low || '-'} ~ ${p.threshold_high || '-'} | 分段数: ${p.segment_count}</p>
                </div>
                <div class="parameter-meta">
                    <span>当前值: ${p.current_value !== null ? p.current_value.toFixed(2) : '-'}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showParameterDetail(id) {
    currentParameterId = id;
    try {
        const param = await apiCall(`/api/parameters/${id}`);
        document.getElementById('detail-title').textContent = param.param_name + ' - 详情';

        let resultStatus = '';
        if (param.latest_result) {
            const statusClass = param.latest_result.result_status === '正常' ? 'normal' :
                              param.latest_result.result_status === '挂起' ? 'suspended' : 'abnormal';
            resultStatus = `<span class="status-tag ${statusClass}">${param.latest_result.result_status}</span>`;
        }

        let content = `
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">参数键名</div>
                    <div class="value">${param.param_key}</div>
                </div>
                <div class="info-item">
                    <div class="label">参数名称</div>
                    <div class="value">${param.param_name}</div>
                </div>
                <div class="info-item">
                    <div class="label">当前值</div>
                    <div class="value">${param.current_value !== null ? param.current_value.toFixed(2) : '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">单位</div>
                    <div class="value">${param.unit || '<span style="color: #dc3545;">未设置</span>'}</div>
                </div>
                <div class="info-item">
                    <div class="label">低阈值</div>
                    <div class="value">${param.threshold_low !== null ? param.threshold_low : '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">高阈值</div>
                    <div class="value">${param.threshold_high !== null ? param.threshold_high : '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">分段数</div>
                    <div class="value">${param.segment_count}</div>
                </div>
                <div class="info-item">
                    <div class="label">最新状态</div>
                    <div class="value">${resultStatus || '-'}</div>
                </div>
            </div>

            <div class="button-group">
                <button class="btn ${!param.unit ? 'success' : 'primary'}" onclick="showEditParameterModal()">
                    ${!param.unit ? '📝 编辑参数（⚠️请先补录单位）' : '📝 编辑参数（补录单位/阈值）'}
                </button>
                <button class="btn ${param.latest_result && param.latest_result.result_status === '挂起' ? 'success' : ''}" onclick="showRecalcModal()">
                    ${param.latest_result && param.latest_result.result_status === '挂起' ? '🔄 重新试算（补完单位后点我）' : '🔄 重新试算'}
                </button>
                <button class="btn" onclick="showAddRemarkModal(${param.id})">添加后补备注</button>
                <button class="btn" onclick="showAddScreenshotModal(${param.id})">添加截图</button>
            </div>
            ${param.latest_result && param.latest_result.result_status === '挂起' ? `
            <div style="margin-top: 16px; background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 6px;">
                <strong style="color: #856404;">⏸️ 当前状态为「挂起」</strong><br>
                <span style="color: #856404; font-size: 14px;">原因: ${param.latest_result.suspend_reason || '未知'}</span><br>
                <span style="color: #666; font-size: 13px;">请先点击「编辑参数」补录单位和调整阈值，再点击「重新试算」。</span>
            </div>
            ` : ''}
        `;

        content += `
            <div class="history-section">
                <h3>历史版本 <span style="font-size: 13px; color: #999; font-weight: normal;">共 ${param.history.length} 个版本</span></h3>
                ${param.history.length === 0 ? '<p style="color: #999;">暂无历史记录</p>' :
                    param.history.map(h => `
                        <div class="history-item">
                            <span class="version-tag">v${h.version}</span>
                            <strong>${h.change_reason || '参数更新'}</strong>
                            <span style="color: #999; margin-left: 12px;">${h.changed_by} · ${new Date(h.created_at).toLocaleString()}</span>
                            <div style="margin-top: 8px; font-size: 14px; color: #666;">
                                值: ${h.value !== null ? h.value : '-'} | 单位: ${h.unit || '-'} | 
                                阈值: ${h.threshold_low || '-'} ~ ${h.threshold_high || '-'}
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;

        content += `
            <div class="remarks-section">
                <h3>后补备注 <span style="font-size: 13px; color: #999; font-weight: normal;">共 ${param.remarks.length} 条</span></h3>
                ${param.remarks.length === 0 ? '<p style="color: #999;">暂无备注</p>' :
                    param.remarks.map(r => `
                        <div class="remark-item">
                            <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                                <strong>${r.remark_type}</strong> · ${r.created_by || '未知用户'} · ${new Date(r.created_at).toLocaleString()}
                            </div>
                            <div style="font-size: 14px;">${r.content}</div>
                            <div style="font-size: 12px; color: #999; margin-top: 4px;">幂等Key: ${r.idempotency_key.substring(0, 16)}...</div>
                        </div>
                    `).join('')
                }
            </div>
        `;

        const processed = param.screenshots.filter(s => s.status === '已处理');
        const pending = param.screenshots.filter(s => s.status === '待补材料');
        const manual = param.screenshots.filter(s => s.status === '人工改判');

        content += `
            <div class="screenshots-section">
                <h3>
                    截图说明
                    <span style="font-size: 13px; color: #999; font-weight: normal;">
                        已处理: ${processed.length} | 待补材料: ${pending.length} | 人工改判: ${manual.length}
                    </span>
                </h3>
                <div class="screenshot-filters">
                    <button class="filter-btn ${currentScreenshotFilter === 'all' ? 'active' : ''}" onclick="filterScreenshots('all', ${param.id})">全部</button>
                    <button class="filter-btn ${currentScreenshotFilter === '已处理' ? 'active' : ''}" onclick="filterScreenshots('已处理', ${param.id})">已处理</button>
                    <button class="filter-btn ${currentScreenshotFilter === '待补材料' ? 'active' : ''}" onclick="filterScreenshots('待补材料', ${param.id})">待补材料</button>
                    <button class="filter-btn ${currentScreenshotFilter === '人工改判' ? 'active' : ''}" onclick="filterScreenshots('人工改判', ${param.id})">人工改判</button>
                </div>
                <div id="screenshot-list">
                    ${renderScreenshots(param.screenshots)}
                </div>
            </div>
        `;

        content += `
            <div class="results-section">
                <h3>试算结果 <span style="font-size: 13px; color: #999; font-weight: normal;">最近10条</span></h3>
                <div id="result-list">
                    ${param.latest_result ? await loadResults(param.id) : '<p style="color: #999;">暂无试算结果</p>'}
                </div>
            </div>
        `;

        document.getElementById('detail-content').innerHTML = content;
        document.getElementById('parameter-detail').classList.remove('hidden');
        document.querySelector('.panel:first-child').classList.add('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderScreenshots(screenshots) {
    let filtered = screenshots;
    if (currentScreenshotFilter !== 'all') {
        filtered = screenshots.filter(s => s.status === currentScreenshotFilter);
    }

    if (filtered.length === 0) {
        return '<p style="color: #999;">暂无截图</p>';
    }

    return filtered.map(s => {
        const statusClass = s.status === '已处理' ? 'processed' :
                           s.status === '待补材料' ? 'pending' : 'manual';
        return `
            <div class="screenshot-item">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">
                            ${s.description || '无描述'}
                            <span class="badge ${statusClass}" style="margin-left: 8px; font-size: 11px;">${s.status}</span>
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            文件: ${s.file_path} | 版本: ${s.version_tag || '-'} | ${new Date(s.created_at).toLocaleString()}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" style="padding: 4px 12px; font-size: 12px;" onclick="updateScreenshotStatus(${s.id}, '已处理')">标记已处理</button>
                        <button class="btn" style="padding: 4px 12px; font-size: 12px;" onclick="updateScreenshotStatus(${s.id}, '待补材料')">待补材料</button>
                        <button class="btn" style="padding: 4px 12px; font-size: 12px;" onclick="updateScreenshotStatus(${s.id}, '人工改判')">人工改判</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function filterScreenshots(status, paramId) {
    currentScreenshotFilter = status;
    const param = await apiCall(`/api/parameters/${paramId}`);
    document.getElementById('screenshot-list').innerHTML = renderScreenshots(param.screenshots);
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function updateScreenshotStatus(id, status) {
    try {
        await apiCall(`/api/screenshots/${id}`, 'PUT', { status: status });
        showToast(`已更新为「${status}」`, 'success');
        if (currentParameterId) {
            showParameterDetail(currentParameterId);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadResults(paramId) {
    try {
        const results = await apiCall(`/api/parameters/${paramId}/results?limit=10`);
        if (results.length === 0) {
            return '<p style="color: #999;">暂无试算结果</p>';
        }
        return results.map(r => {
            const statusClass = r.result_status === '正常' ? 'normal' :
                              r.result_status === '挂起' ? 'suspended' : 'abnormal';
            let jumpHtml = '';
            if (r.is_jump) {
                jumpHtml = `
                    <div class="jump-alert">
                        <strong>⚠️ 结果跳变检测</strong><br>
                        原因: ${r.jump_cause}<br>
                        ${r.jump_description}
                        <br><button class="btn" style="margin-top: 8px; padding: 4px 12px; font-size: 12px;" onclick="showJumpAnalysis(${r.id})">查看详细溯源</button>
                    </div>
                `;
            }
            let suspendHtml = '';
            if (r.suspend_reason) {
                suspendHtml = `<div style="color: #856404; margin-top: 8px;">挂起原因: ${r.suspend_reason}</div>`;
            }
            let segmentsHtml = '';
            if (r.segments && r.segments.length > 0) {
                segmentsHtml = `
                    <div style="margin-top: 12px;">
                        <div style="font-weight: 500; margin-bottom: 8px;">分段结果:</div>
                        ${r.segments.map(s => `
                            <div class="segment-result">
                                <div class="segment-header">第 ${s.segment_index + 1} 段 (${s.start_x} ~ ${s.end_x})</div>
                                <div style="font-size: 13px; color: #666;">
                                    斜率: ${s.slope.toFixed(4)} | 截距: ${s.intercept.toFixed(4)} | R²: ${s.r_squared.toFixed(4)} | 样本数: ${s.sample_count}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            return `
                <div class="result-item">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <span class="version-tag">v${r.version}</span>
                            <span class="status-tag ${statusClass}" style="margin-left: 8px;">${r.result_status}</span>
                            ${r.is_jump ? '<span style="color: #dc3545; margin-left: 8px;">⚠️ 跳变</span>' : ''}
                        </div>
                        <span style="color: #999; font-size: 13px;">${new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        结果值: ${r.result_value !== null ? r.result_value.toFixed(4) : '-'}
                        ${r.r_squared !== null ? `| 整体R²: ${r.r_squared.toFixed(4)}` : ''}
                    </div>
                    ${suspendHtml}
                    ${jumpHtml}
                    ${segmentsHtml}
                </div>
            `;
        }).join('');
    } catch (error) {
        return `<p style="color: #dc3545;">加载失败: ${error.message}</p>`;
    }
}

async function showJumpAnalysis(resultId) {
    try {
        const analysis = await apiCall(`/api/results/${resultId}/jump-analysis`);
        let html = `<h4>跳变分析详情</h4>`;
        html += `<p><strong>是否跳变:</strong> ${analysis.is_jump ? '是' : '否'}</p>`;
        if (analysis.jump_cause) {
            html += `<p><strong>跳变原因:</strong> ${analysis.jump_cause}</p>`;
            html += `<p><strong>详细描述:</strong> ${analysis.jump_description}</p>`;
        }
        if (analysis.change_traces.length > 0) {
            html += `<div style="margin-top: 16px;"><strong>变更溯源:</strong></div>`;
            html += analysis.change_traces.map(t => `
                <div class="trace-item">
                    <div class="trace-cause">${t.change_cause}</div>
                    <div class="trace-values">
                        ${t.old_value ? `旧值: ${t.old_value}` : ''}
                        ${t.old_value && t.new_value ? '<span class="change-arrow">→</span>' : ''}
                        ${t.new_value ? `新值: ${t.new_value}` : ''}
                    </div>
                    ${t.description ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${t.description}</div>` : ''}
                </div>
            `).join('');
        }
        if (analysis.previous_result && analysis.current_result) {
            html += `
                <div style="margin-top: 16px;">
                    <strong>结果对比:</strong>
                    <div style="display: flex; gap: 20px; margin-top: 8px;">
                        <div style="flex: 1; padding: 12px; background: #f8f9fa; border-radius: 6px;">
                            <div style="font-size: 12px; color: #999;">上一次结果</div>
                            <div style="font-size: 20px; font-weight: 600;">${analysis.previous_result.result_value.toFixed(4)}</div>
                        </div>
                        <div style="display: flex; align-items: center; font-size: 24px; color: #dc3545;">→</div>
                        <div style="flex: 1; padding: 12px; background: #fff3cd; border-radius: 6px;">
                            <div style="font-size: 12px; color: #999;">当前结果</div>
                            <div style="font-size: 20px; font-weight: 600;">${analysis.current_result.result_value.toFixed(4)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        const resultBox = document.getElementById('calculation-result');
        resultBox.innerHTML = html;
        resultBox.classList.remove('hidden');
        resultBox.className = 'result-box warning';
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function hideParameterDetail() {
    currentParameterId = null;
    document.getElementById('parameter-detail').classList.add('hidden');
    document.querySelector('.panel:first-child').classList.remove('hidden');
    loadParameters();
}

function showCreateParameterModal() {
    document.getElementById('create-parameter-modal').classList.remove('hidden');
}

function hideCreateParameterModal() {
    document.getElementById('create-parameter-modal').classList.add('hidden');
}

async function createParameter() {
    const data = {
        param_key: document.getElementById('new-param-key').value,
        param_name: document.getElementById('new-param-name').value,
        current_value: parseFloat(document.getElementById('new-param-value').value) || null,
        unit: document.getElementById('new-param-unit').value || null,
        threshold_low: parseFloat(document.getElementById('new-param-threshold-low').value) || null,
        threshold_high: parseFloat(document.getElementById('new-param-threshold-high').value) || null,
        segment_count: parseInt(document.getElementById('new-param-segment').value) || 2
    };

    if (!data.param_key || !data.param_name) {
        showToast('请填写参数键名和名称', 'error');
        return;
    }

    try {
        await apiCall('/api/parameters/', 'POST', data);
        showToast('参数创建成功', 'success');
        hideCreateParameterModal();
        loadParameters();
        loadParameterSelect();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showEditParameterModal() {
    if (!currentParameterId) {
        showToast('请先选择参数', 'warning');
        return;
    }
    try {
        const param = await apiCall(`/api/parameters/${currentParameterId}`);
        document.getElementById('edit-param-name').value = param.param_name || '';
        document.getElementById('edit-param-value').value = param.current_value !== null ? param.current_value : '';
        document.getElementById('edit-param-unit').value = param.unit || '';
        document.getElementById('edit-param-threshold-low').value = param.threshold_low !== null ? param.threshold_low : '';
        document.getElementById('edit-param-threshold-high').value = param.threshold_high !== null ? param.threshold_high : '';
        document.getElementById('edit-param-segment').value = param.segment_count || 2;
        document.getElementById('edit-param-reason').value = '';
        document.getElementById('edit-param-operator').value = '';
        document.getElementById('edit-parameter-modal').classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function hideEditParameterModal() {
    document.getElementById('edit-parameter-modal').classList.add('hidden');
}

async function submitEditParameter() {
    const unit = document.getElementById('edit-param-unit').value.trim();
    const updateData = {
        param_name: document.getElementById('edit-param-name').value || null,
        current_value: document.getElementById('edit-param-value').value ? parseFloat(document.getElementById('edit-param-value').value) : null,
        unit: unit || null,
        threshold_low: document.getElementById('edit-param-threshold-low').value ? parseFloat(document.getElementById('edit-param-threshold-low').value) : null,
        threshold_high: document.getElementById('edit-param-threshold-high').value ? parseFloat(document.getElementById('edit-param-threshold-high').value) : null,
        segment_count: document.getElementById('edit-param-segment').value ? parseInt(document.getElementById('edit-param-segment').value) : null,
        change_reason: document.getElementById('edit-param-reason').value || (unit ? '复核人补录单位' : '参数复核更新'),
        changed_by: document.getElementById('edit-param-operator').value || '复核人'
    };

    try {
        await apiCall(`/api/parameters/${currentParameterId}`, 'PUT', updateData);
        showToast(unit ? '参数已更新，单位已补录' : '参数已更新', 'success');
        hideEditParameterModal();
        showParameterDetail(currentParameterId);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function showRecalcModal() {
    if (!currentParameterId) {
        showToast('请先选择参数', 'warning');
        return;
    }
    apiCall(`/api/parameters/${currentParameterId}`).then(param => {
        document.getElementById('recalc-param-name').value = param.param_name + ' (' + (param.unit || '单位未设置') + ')';
        const defaultSamples = param.param_key === 'blood_pressure_systolic'
            ? '[{"x": 50, "y": 118}, {"x": 80, "y": 122}, {"x": 90, "y": 128}, {"x": 95, "y": 132}, {"x": 140, "y": 150}, {"x": 160, "y": 162}]'
            : '[{"x": 1, "y": 2.1}, {"x": 2, "y": 3.8}, {"x": 5, "y": 15.2}, {"x": 10, "y": 50.1}, {"x": 15, "y": 80.5}, {"x": 20, "y": 110.2}]';
        document.getElementById('recalc-sample-data').value = defaultSamples;
        document.getElementById('recalc-modal').classList.remove('hidden');
    }).catch(err => showToast(err.message, 'error'));
}

function hideRecalcModal() {
    document.getElementById('recalc-modal').classList.add('hidden');
}

async function submitRecalc() {
    try {
        const sampleData = JSON.parse(document.getElementById('recalc-sample-data').value);
        const result = await apiCall('/api/calculate/', 'POST', {
            parameter_id: currentParameterId,
            sample_data: sampleData
        });

        hideRecalcModal();

        let msg = `重新试算完成：状态=${result.result_status}`;
        let type = 'success';
        if (result.result_status === '挂起') {
            msg += `，原因=${result.suspend_reason}`;
            type = 'warning';
        } else if (result.result_status === '异常') {
            msg += `，原因=${result.suspend_reason}`;
            type = 'error';
        }
        if (result.is_duplicate) {
            msg += '（重复请求，返回已有结果）';
        }
        if (result.is_jump) {
            msg += `，⚠️检测到跳变：${result.jump_cause}`;
            type = 'warning';
        }
        showToast(msg, type);

        showParameterDetail(currentParameterId);
    } catch (err) {
        showToast('样本数据格式错误或计算失败: ' + err.message, 'error');
    }
}

function showAddRemarkModal(paramId) {
    currentParameterId = paramId;
    document.getElementById('add-remark-modal').classList.remove('hidden');
}

function hideAddRemarkModal() {
    document.getElementById('add-remark-modal').classList.add('hidden');
}

async function submitRemark() {
    const content = document.getElementById('remark-content').value;
    if (!content) {
        showToast('请填写备注内容', 'error');
        return;
    }

    const data = {
        parameter_id: currentParameterId,
        content: content,
        remark_type: document.getElementById('remark-type').value || '后补备注',
        created_by: document.getElementById('remark-creator').value || null
    };

    try {
        const result = await apiCall('/api/remarks/', 'POST', data);
        showToast('备注添加成功（幂等性检查已启用）', 'success');
        hideAddRemarkModal();
        if (currentParameterId) {
            showParameterDetail(currentParameterId);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function showAddScreenshotModal(paramId) {
    currentParameterId = paramId;
    document.getElementById('add-screenshot-modal').classList.remove('hidden');
}

function hideAddScreenshotModal() {
    document.getElementById('add-screenshot-modal').classList.add('hidden');
}

async function submitScreenshot() {
    const filePath = document.getElementById('screenshot-path').value;
    if (!filePath) {
        showToast('请填写文件路径', 'error');
        return;
    }

    const data = {
        parameter_id: currentParameterId,
        file_path: filePath,
        description: document.getElementById('screenshot-desc').value || null,
        status: document.getElementById('screenshot-status').value,
        version_tag: document.getElementById('screenshot-version').value || null
    };

    try {
        await apiCall('/api/screenshots/', 'POST', data);
        showToast('截图添加成功', 'success');
        hideAddScreenshotModal();
        if (currentParameterId) {
            showParameterDetail(currentParameterId);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadParameterSelect() {
    try {
        const parameters = await apiCall('/api/parameters/');
        const select = document.getElementById('calc-parameter-select');
        select.innerHTML = parameters.map(p =>
            `<option value="${p.id}">${p.param_name} (${p.param_key})</option>`
        ).join('');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function checkIdempotency() {
    const paramId = parseInt(document.getElementById('calc-parameter-select').value);
    const sampleDataStr = document.getElementById('calc-sample-data').value;
    const idempotencyKey = document.getElementById('calc-idempotency-key').value || null;

    try {
        const sampleData = JSON.parse(sampleDataStr);
        const result = await apiCall('/api/calculate/check-idempotency', 'POST', {
            parameter_id: paramId,
            sample_data: sampleData,
            idempotency_key: idempotencyKey
        });

        const resultBox = document.getElementById('idempotency-result');
        resultBox.classList.remove('hidden');
        resultBox.className = `result-box ${result.is_duplicate ? 'warning' : 'success'}`;

        let html = `<h4>${result.message}</h4>`;
        if (result.existing_result) {
            html += `<p>已存在相同请求的计算结果，版本: v${result.existing_result.version}</p>`;
            html += `<p>状态: ${result.existing_result.result_status} | 结果值: ${result.existing_result.result_value ? result.existing_result.result_value.toFixed(4) : '-'}</p>`;
        }
        resultBox.innerHTML = html;
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function performCalculation() {
    const paramId = parseInt(document.getElementById('calc-parameter-select').value);
    const sampleDataStr = document.getElementById('calc-sample-data').value;
    const idempotencyKey = document.getElementById('calc-idempotency-key').value || null;

    try {
        const sampleData = JSON.parse(sampleDataStr);
        const result = await apiCall('/api/calculate/', 'POST', {
            parameter_id: paramId,
            sample_data: sampleData,
            idempotency_key: idempotencyKey
        });

        const resultBox = document.getElementById('calculation-result');
        resultBox.classList.remove('hidden');

        let resultClass = 'success';
        if (result.result_status === '挂起') {
            resultClass = 'warning';
        } else if (result.result_status === '异常') {
            resultClass = 'danger';
        }
        if (result.is_jump) {
            resultClass = 'warning';
        }
        resultBox.className = `result-box ${resultClass}`;

        let html = `<h4>计算完成 ${result.is_duplicate ? '(重复请求，返回已有结果)' : ''}</h4>`;
        html += `<p><strong>版本:</strong> v${result.version}</p>`;
        html += `<p><strong>状态:</strong> <span class="status-tag ${result.result_status === '正常' ? 'normal' : result.result_status === '挂起' ? 'suspended' : 'abnormal'}">${result.result_status}</span></p>`;

        if (result.suspend_reason) {
            html += `<p style="color: #856404;"><strong>挂起原因:</strong> ${result.suspend_reason}</p>`;
        }

        if (result.result_value !== null) {
            html += `<p><strong>结果值:</strong> ${result.result_value.toFixed(4)}</p>`;
        }
        if (result.r_squared !== null) {
            html += `<p><strong>整体R²:</strong> ${result.r_squared.toFixed(4)}</p>`;
        }

        if (result.is_jump) {
            html += `
                <div class="jump-alert">
                    <strong>⚠️ 结果跳变检测</strong><br>
                    原因: ${result.jump_cause}<br>
                    ${result.jump_description}
                    <br><button class="btn" style="margin-top: 8px; padding: 4px 12px; font-size: 12px;" onclick="showJumpAnalysis(${result.id})">查看详细溯源</button>
                </div>
            `;
        }

        if (result.segments && result.segments.length > 0) {
            html += `<div style="margin-top: 16px;"><strong>分段回归结果:</strong></div>`;
            html += result.segments.map(s => `
                <div class="segment-result">
                    <div class="segment-header">第 ${s.segment_index + 1} 段 (${s.start_x} ~ ${s.end_x})</div>
                    <div style="font-size: 13px; color: #666;">
                        斜率: ${s.slope.toFixed(4)} | 截距: ${s.intercept.toFixed(4)} | R²: ${s.r_squared.toFixed(4)} | 样本数: ${s.sample_count}
                    </div>
                </div>
            `).join('');
        }

        if (result.coefficients) {
            html += `<div style="margin-top: 16px;"><strong>系数详情:</strong><pre>${JSON.stringify(result.coefficients, null, 2)}</pre></div>`;
        }

        resultBox.innerHTML = html;
        showToast('计算完成', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function runDemo(type) {
    const demoResult = document.getElementById('demo-result');
    demoResult.classList.remove('hidden');
    demoResult.className = 'result-box';
    demoResult.innerHTML = '<p>正在运行演示...</p>';

    try {
        if (type === 'success') {
            await runSuccessDemo(demoResult);
        } else if (type === 'supplement') {
            await runSupplementDemo(demoResult);
        } else if (type === 'abnormal') {
            await runAbnormalDemo(demoResult);
        }
    } catch (error) {
        demoResult.innerHTML = `<p style="color: #dc3545;">演示失败: ${error.message}</p>`;
    }
}

async function runSuccessDemo(container) {
    container.innerHTML = '<h4>案例一：顺利记录 - 血糖浓度</h4>';
    container.className = 'result-box success';

    let params = await apiCall('/api/parameters/');
    let glucoseParam = params.find(p => p.param_key === 'blood_glucose');

    if (!glucoseParam) {
        glucoseParam = await apiCall('/api/parameters/', 'POST', {
            param_key: 'blood_glucose',
            param_name: '血糖浓度',
            current_value: 5.6,
            unit: 'mmol/L',
            threshold_low: 3.9,
            threshold_high: 6.1,
            segment_count: 3
        });
        container.innerHTML += '<p>✅ 已创建参数：血糖浓度 (单位: mmol/L)</p>';
    } else {
        container.innerHTML += '<p>✅ 已找到参数：血糖浓度</p>';
    }

    const sampleData = [
        {"x": 2, "y": 4.2}, {"x": 3, "y": 5.8}, {"x": 4, "y": 7.5},
        {"x": 5, "y": 9.8}, {"x": 7, "y": 12.5}, {"x": 10, "y": 18.2},
        {"x": 12, "y": 22.1}, {"x": 15, "y": 28.5}, {"x": 18, "y": 35.2}, {"x": 20, "y": 40.1}
    ];

    container.innerHTML += `<p>✅ 样本数据: 10个点，低边界(${glucoseParam.threshold_low}以下)2个，高边界(${glucoseParam.threshold_high}以上)7个</p>`;

    const result = await apiCall('/api/calculate/', 'POST', {
        parameter_id: glucoseParam.id,
        sample_data: sampleData
    });

    container.innerHTML += `<p>✅ 计算状态: <span class="status-tag normal">${result.result_status}</span></p>`;
    container.innerHTML += `<p>✅ 结果值: ${result.result_value.toFixed(4)} | 整体R²: ${result.r_squared.toFixed(4)}</p>`;
    container.innerHTML += `<p>✅ 分段数: ${result.segments.length}段</p>`;
    container.innerHTML += `<p style="color: #28a745; margin-top: 12px;"><strong>顺利记录完成！单位完整、边界样本充足、计算正常。</strong></p>`;
}

async function runSupplementDemo(container) {
    container.innerHTML = '<h4>案例二：补录记录 - 血压收缩压</h4>';
    container.className = 'result-box warning';

    let params = await apiCall('/api/parameters/');
    let bpParam = params.find(p => p.param_key === 'blood_pressure_systolic');

    if (!bpParam) {
        bpParam = await apiCall('/api/parameters/', 'POST', {
            param_key: 'blood_pressure_systolic',
            param_name: '血压收缩压',
            current_value: 125,
            unit: null,
            threshold_low: 90,
            threshold_high: 140,
            segment_count: 2
        });
        container.innerHTML += '<p>⚠️ 已创建参数：血压收缩压 (单位: 未设置)</p>';
    } else {
        container.innerHTML += '<p>⚠️ 已找到参数：血压收缩压</p>';
    }

    const sampleData = [
        {"x": 1, "y": 118}, {"x": 2, "y": 122}, {"x": 3, "y": 128}
    ];

    container.innerHTML += `<p>⚠️ 样本数据: 3个点，边界样本不足</p>`;

    const result = await apiCall('/api/calculate/', 'POST', {
        parameter_id: bpParam.id,
        sample_data: sampleData
    });

    container.innerHTML += `<p>❌ 计算状态: <span class="status-tag suspended">${result.result_status}</span></p>`;
    container.innerHTML += `<p style="color: #856404;"><strong>挂起原因:</strong> ${result.suspend_reason}</p>`;

    await apiCall('/api/remarks/', 'POST', {
        parameter_id: bpParam.id,
        content: '2024年6月临床数据回溯，该批次样本采集时间存在偏差，需要重新核对原始记录',
        remark_type: '后补备注',
        created_by: '复核人-小孟'
    });
    container.innerHTML += '<p>✅ 已添加后补备注</p>';

    await apiCall('/api/screenshots/', 'POST', {
        parameter_id: bpParam.id,
        file_path: '/screenshots/bp_v1_202401.png',
        description: '2024年1月原始数据截图 - 待复核',
        status: '待补材料',
        version_tag: 'v1.0'
    });

    await apiCall('/api/screenshots/', 'POST', {
        parameter_id: bpParam.id,
        file_path: '/screenshots/bp_v2_202406.png',
        description: '2024年6月修正数据截图',
        status: '已处理',
        version_tag: 'v2.0'
    });
    container.innerHTML += '<p>✅ 已添加2张截图（1张待补材料，1张已处理）</p>';

    container.innerHTML += '<p style="margin-top: 16px;">🔧 <strong>复核人开始补录操作</strong></p>';

    container.innerHTML += '<p>1️⃣ 补录单位：mmHg，调整低阈值为80（原90太高），补充边界样本</p>';
    await apiCall(`/api/parameters/${bpParam.id}`, 'PUT', {
        unit: 'mmHg',
        threshold_low: 80,
        threshold_high: 140,
        change_reason: '复核人补录单位并调整低阈值',
        changed_by: '复核人-小孟'
    });

    const sufficientSamples = [
        {"x": 50, "y": 118}, {"x": 75, "y": 122}, {"x": 80, "y": 128},
        {"x": 95, "y": 132}, {"x": 140, "y": 150}, {"x": 160, "y": 162}
    ];
    container.innerHTML += `<p>2️⃣ 补充边界样本：共6个点（低边界≤80有2个，高边界≥140有2个）</p>`;

    const result2 = await apiCall('/api/calculate/', 'POST', {
        parameter_id: bpParam.id,
        sample_data: sufficientSamples
    });

    let statusClass = result2.result_status === '正常' ? 'normal' :
                      result2.result_status === '挂起' ? 'suspended' : 'abnormal';
    container.innerHTML += `<p>3️⃣ 重新试算结果: <span class="status-tag ${statusClass}">${result2.result_status}</span></p>`;

    if (result2.result_status === '正常') {
        container.innerHTML += `<p>✅ 结果值: ${result2.result_value.toFixed(4)} | 整体R²: ${result2.r_squared.toFixed(4)} | 分段数: ${result2.segments.length}</p>`;
        container.innerHTML += `<p style="color: #28a745; margin-top: 12px;"><strong>补录记录完成！复核人补录单位和边界样本后，状态从「挂起」变为「正常」。</strong></p>`;
    } else if (result2.result_status === '挂起') {
        container.innerHTML += `<p style="color: #856404;">仍挂起: ${result2.suspend_reason}</p>`;
    }
}

async function runAbnormalDemo(container) {
    container.innerHTML = '<h4>案例三：异常记录 - 心率检测</h4>';
    container.className = 'result-box danger';

    let params = await apiCall('/api/parameters/');
    let hrParam = params.find(p => p.param_key === 'heart_rate');

    if (!hrParam) {
        hrParam = await apiCall('/api/parameters/', 'POST', {
            param_key: 'heart_rate',
            param_name: '心率',
            current_value: 75,
            unit: '次/分',
            threshold_low: 60,
            threshold_high: 100,
            segment_count: 3
        });
        container.innerHTML += '<p>✅ 已创建参数：心率 (单位: 次/分)，阈值60-100</p>';
    } else {
        container.innerHTML += '<p>✅ 已找到参数：心率</p>';
    }

    const sampleData1 = [
        {"x": 50, "y": 65}, {"x": 55, "y": 68}, {"x": 60, "y": 72},
        {"x": 70, "y": 78}, {"x": 80, "y": 85}, {"x": 90, "y": 92},
        {"x": 95, "y": 96}, {"x": 100, "y": 102}, {"x": 105, "y": 108}, {"x": 110, "y": 115}
    ];

    const result1 = await apiCall('/api/calculate/', 'POST', {
        parameter_id: hrParam.id,
        sample_data: sampleData1
    });

    container.innerHTML += `<p>✅ 第一次计算结果: ${result1.result_value ? result1.result_value.toFixed(4) : '-'}，状态: ${result1.result_status}</p>`;

    container.innerHTML += '<p>⚠️ 修改阈值：低阈值从60改为70，高阈值从100改为105</p>';
    await apiCall(`/api/parameters/${hrParam.id}`, 'PUT', {
        threshold_low: 70,
        threshold_high: 105,
        change_reason: '临床指南更新，调整心率参考范围',
        changed_by: '张医生'
    });

    const sampleData2 = [
        {"x": 50, "y": 65}, {"x": 55, "y": 68}, {"x": 60, "y": 72},
        {"x": 70, "y": 78}, {"x": 80, "y": 85}, {"x": 90, "y": 92},
        {"x": 95, "y": 96}, {"x": 100, "y": 102}, {"x": 105, "y": 108}, {"x": 110, "y": 115}
    ];

    const result2 = await apiCall('/api/calculate/', 'POST', {
        parameter_id: hrParam.id,
        sample_data: sampleData2
    });

    container.innerHTML += `<p>✅ 第二次计算结果: ${result2.result_value.toFixed(4)}，状态: ${result2.result_status}</p>`;

    if (result2.is_jump) {
        container.innerHTML += `<div class="jump-alert">
            <strong>⚠️ 跳变检测成功！</strong><br>
            跳变原因: ${result2.jump_cause}<br>
            ${result2.jump_description}
        </div>`;
    }

    const analysis = await apiCall(`/api/results/${result2.id}/jump-analysis`);
    if (analysis.change_traces.length > 0) {
        container.innerHTML += `<p><strong>变更溯源记录:</strong></p>`;
        analysis.change_traces.forEach(t => {
            container.innerHTML += `
                <div class="trace-item">
                    <div class="trace-cause">${t.change_cause}</div>
                    <div class="trace-values">${t.old_value} <span class="change-arrow">→</span> ${t.new_value}</div>
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">${t.description}</div>
                </div>
            `;
        });
    }

    container.innerHTML += `<p style="color: #721c24; margin-top: 12px;"><strong>异常记录完成！阈值变更导致结果跳变，系统自动检测并溯源。复核人可清晰看到变更原因和历史对比。</strong></p>`;
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });
});
