const API_BASE = '/api';

let currentSampleId = null;
let currentPage = 1;
const pageSize = 10;
let previousView = 'samples';

const statusMap = {
    'pending_review': { label: '待评审', class: 'pending_review' },
    'processed': { label: '已处理', class: 'processed' },
    'material_missing': { label: '待补材料', class: 'material_missing' },
    'manual_adjusted': { label: '人工改判', class: 'manual_adjusted' },
};

async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error('API请求失败');
    return await res.json();
}

async function apiPost(path, data) {
    const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'API请求失败');
    }
    return await res.json();
}

async function apiPut(path) {
    const res = await fetch(API_BASE + path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'API请求失败');
    }
    return await res.json();
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    const viewEl = document.getElementById(viewName + '-view');
    if (viewEl) {
        viewEl.classList.add('active');
    }

    const menuMap = {
        'review': 'review',
        'samples': 'samples',
        'anomalies': 'anomalies',
        'detail': 'samples',
    };
    const menuEl = document.querySelector(`.menu-item[data-view="${menuMap[viewName] || 'samples'}"]`);
    if (menuEl) menuEl.classList.add('active');

    const titleMap = {
        'review': '评审看板',
        'samples': '样本管理',
        'anomalies': '异常样本分析',
        'detail': '样本详情',
    };
    document.getElementById('page-title').textContent = titleMap[viewName] || '';

    if (viewName === 'review') loadReviewStats();
    if (viewName === 'samples') loadSamples();
    if (viewName === 'anomalies') loadAnomaliesFull();
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view === 'review') switchView('review');
        if (view === 'samples') switchView('samples');
        if (view === 'anomalies') switchView('anomalies');
    });
});

async function loadReviewStats() {
    try {
        const stats = await apiGet('/review/stats');
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-processed').textContent = stats.processed;
        document.getElementById('stat-missing').textContent = stats.material_missing;
        document.getElementById('stat-adjusted').textContent = stats.manual_adjusted;
        document.getElementById('stat-pending').textContent = stats.pending_review;
        document.getElementById('stat-conflict').textContent = stats.has_label_conflict;

        const total = stats.total || 1;
        const setBar = (id, value) => {
            const pct = (value / total * 100).toFixed(1);
            document.getElementById(id).style.width = pct + '%';
            document.getElementById(id + '-value').textContent = value + ' (' + pct + '%)';
        };
        setBar('bar-processed', stats.processed);
        setBar('bar-adjusted', stats.manual_adjusted);
        setBar('bar-missing', stats.material_missing);
        setBar('bar-pending', stats.pending_review);

        loadAnomaliesBrief();
    } catch (e) {
        console.error('加载统计数据失败', e);
    }
}

async function loadAnomaliesBrief() {
    try {
        const data = await apiGet('/review/anomalies?limit=5');
        renderAnomalyTable('anomaly-table-body', data);
    } catch (e) {
        console.error('加载异常样本失败', e);
    }
}

async function loadAnomaliesFull() {
    try {
        const data = await apiGet('/review/anomalies?limit=50');
        renderAnomalyTable('anomalies-full-body', data);
    } catch (e) {
        console.error('加载异常样本失败', e);
    }
}

function renderAnomalyTable(bodyId, data) {
    const tbody = document.getElementById(bodyId);
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:30px;">暂无异常样本</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => {
        const change = item.score_change || 0;
        const changeClass = change >= 0 ? 'up' : 'down';
        const changeText = (change >= 0 ? '+' : '') + change.toFixed(1);

        return `
            <tr>
                <td>${item.sample_no}</td>
                <td>${item.customer_name || '-'}</td>
                <td>${item.original_score?.toFixed(1) || '-'}</td>
                <td>${item.current_score?.toFixed(1) || '-'}</td>
                <td><span class="score-change ${changeClass}">${changeText}</span></td>
                <td><span class="tag tag-warning">${item.anomaly_type}</span></td>
                <td style="max-width:250px;">${item.anomaly_reason}</td>
                <td><button class="btn btn-small" onclick="viewSampleDetail(${item.id})">查看</button></td>
            </tr>
        `;
    }).join('');
}

async function loadSamples() {
    const status = document.getElementById('filter-status').value;
    const conflict = document.getElementById('filter-conflict').value;
    const nameMismatch = document.getElementById('filter-name-mismatch').value;
    const keyword = document.getElementById('filter-keyword').value;

    let params = `?skip=${(currentPage - 1) * pageSize}&limit=${pageSize}`;
    if (status) params += `&status=${status}`;
    if (conflict) params += `&has_label_conflict=${conflict}`;
    if (nameMismatch) params += `&has_name_mismatch=${nameMismatch}`;
    if (keyword) params += `&keyword=${encodeURIComponent(keyword)}`;

    try {
        const data = await apiGet('/samples' + params);
        renderSampleTable(data.items);
        document.getElementById('total-info').textContent = `共 ${data.total} 条`;
        document.getElementById('page-info').textContent = `第 ${currentPage} 页`;
    } catch (e) {
        console.error('加载样本列表失败', e);
    }
}

function renderSampleTable(items) {
    const tbody = document.getElementById('samples-table-body');
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#999;padding:30px;">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => {
        const statusInfo = statusMap[item.status] || { label: item.status, class: '' };
        const conflictTag = item.has_label_conflict
            ? '<span class="tag tag-danger">有冲突</span>'
            : '<span class="tag tag-success">无</span>';
        const nameTag = item.has_name_mismatch
            ? '<span class="tag tag-warning">不一致</span>'
            : '<span class="tag tag-success">一致</span>';

        return `
            <tr>
                <td><strong>${item.sample_no}</strong></td>
                <td>${item.customer_name || '-'}</td>
                <td>${item.original_score?.toFixed(1) || '-'}</td>
                <td><strong>${item.current_score?.toFixed(1) || '-'}</strong></td>
                <td><span class="status-badge ${statusInfo.class}">${statusInfo.label}</span></td>
                <td>${item.risk_level || '-'}</td>
                <td>${conflictTag}</td>
                <td>${nameTag}</td>
                <td>${item.adjustment_count} 次</td>
                <td>
                    <button class="btn btn-small" onclick="viewSampleDetail(${item.id})">详情</button>
                </td>
            </tr>
        `;
    }).join('');
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadSamples();
    }
}

function nextPage() {
    currentPage++;
    loadSamples();
}

async function viewSampleDetail(id) {
    currentSampleId = id;
    previousView = document.querySelector('.view.active').id.replace('-view', '');
    switchView('detail');

    try {
        const sample = await apiGet('/samples/' + id);
        renderSampleDetail(sample);
    } catch (e) {
        console.error('加载样本详情失败', e);
    }
}

function goBack() {
    switchView(previousView || 'samples');
}

function renderSampleDetail(sample) {
    const statusInfo = statusMap[sample.status] || { label: sample.status, class: '' };

    document.getElementById('detail-sample-no').textContent = sample.sample_no;
    document.getElementById('detail-customer').textContent = sample.customer_name + ' | ' + (sample.id_card || '');
    document.getElementById('detail-status').textContent = statusInfo.label;
    document.getElementById('detail-status').className = 'status-badge ' + statusInfo.class;

    document.getElementById('info-sample-no').textContent = sample.sample_no;
    document.getElementById('info-customer-name').textContent = sample.customer_name || '-';
    document.getElementById('info-id-card').textContent = sample.id_card || '-';
    document.getElementById('info-original-score').textContent = sample.original_score?.toFixed(1) || '-';
    document.getElementById('info-current-score').textContent = sample.current_score?.toFixed(1) || '-';
    document.getElementById('info-risk-level').textContent = sample.risk_level || '-';
    document.getElementById('info-status').textContent = statusInfo.label;
    document.getElementById('info-adjust-count').textContent = sample.adjustment_count + ' 次';
    document.getElementById('info-review-count').textContent = sample.review_count + ' 次';
    document.getElementById('info-label-conflict').textContent = sample.has_label_conflict ? '有冲突' : '无';
    document.getElementById('info-name-mismatch').textContent = sample.has_name_mismatch ? '不一致' : '一致';

    renderMaterials(sample.materials);
    renderConflicts(sample.label_conflicts);
    renderAdjustments(sample.adjustments);
}

function renderMaterials(materials) {
    const container = document.getElementById('materials-list');
    if (!materials || materials.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:13px;">暂无材料</p>';
        return;
    }

    container.innerHTML = materials.map(m => {
        let itemClass = 'material-item';
        const tags = [];

        if (m.is_dirty) {
            itemClass += ' dirty';
            tags.push('<span class="tag tag-danger">脏数据</span>');
        }
        if (m.is_name_mismatch) {
            itemClass += ' name-mismatch';
            tags.push('<span class="tag tag-warning">名称不一致</span>');
        }
        if (m.is_original) {
            tags.push('<span class="tag tag-info">原始数据</span>');
        }

        const rawSection = m.raw_value && m.raw_value !== m.material_value
            ? `<div class="material-raw">原始值: ${m.raw_value}</div>`
            : '';

        return `
            <div class="${itemClass}">
                <div class="material-header">
                    <span class="material-name">${m.material_name}</span>
                    <div class="material-tags">${tags.join('')}</div>
                </div>
                <div class="material-value">${m.material_value || '-'}</div>
                <div class="material-source">来源: ${m.source || '-'}${m.source_detail ? ' | ' + m.source_detail : ''}</div>
                ${rawSection}
            </div>
        `;
    }).join('');
}

function renderConflicts(conflicts) {
    const container = document.getElementById('conflicts-list');
    if (!conflicts || conflicts.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:13px;">无标签冲突</p>';
        return;
    }

    container.innerHTML = conflicts.map(c => {
        const itemClass = 'conflict-item' + (c.is_resolved ? ' resolved' : '');
        const statusText = c.is_resolved ? '已解决' : '未解决';
        const statusTag = c.is_resolved
            ? '<span class="tag tag-success">已解决</span>'
            : '<span class="tag tag-danger">未解决</span>';

        const resolutionText = {
            'adopt_a': '采用来源A',
            'adopt_b': '采用来源B',
            'manual': '人工判定',
            'pending': '待补充',
        }[c.resolution] || c.resolution || '-';

        return `
            <div class="${itemClass}">
                <div class="conflict-header">
                    <span class="conflict-field">${c.field_label} (${c.field_name})</span>
                    <div>${statusTag} <span class="tag tag-info">${c.conflict_type || '值冲突'}</span></div>
                </div>
                <div class="conflict-values">
                    <div class="conflict-value-box">
                        <div class="conflict-source">来源A: ${c.source_a}</div>
                        <div class="conflict-value-text">${c.value_a}</div>
                    </div>
                    <span class="vs-label">VS</span>
                    <div class="conflict-value-box">
                        <div class="conflict-source">来源B: ${c.source_b}</div>
                        <div class="conflict-value-text">${c.value_b}</div>
                    </div>
                </div>
                ${c.is_resolved ? `
                    <div style="margin-top:10px;font-size:12px;color:#555;">
                        解决方案: ${resolution_text}
                        ${c.resolved_by ? ' | 解决人: ' + c.resolved_by : ''}
                        ${c.resolved_at ? ' | 时间: ' + new Date(c.resolved_at).toLocaleString() : ''}
                    </div>
                ` : `
                    <div class="conflict-actions">
                        <button class="btn btn-small" onclick="resolveConflict(${c.id}, 'adopt_a')">采用A</button>
                        <button class="btn btn-small" onclick="resolveConflict(${c.id}, 'adopt_b')">采用B</button>
                        <button class="btn btn-small" onclick="resolveConflict(${c.id}, 'manual')">人工判定</button>
                        <button class="btn btn-small" onclick="resolveConflict(${c.id}, 'pending')">待补充</button>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

async function resolveConflict(conflictId, resolution) {
    try {
        await apiPut(`/label-conflicts/${conflictId}/resolve?resolution=${resolution}&resolved_by=评审员-陈老师`);
        alert('冲突已处理');
        if (currentSampleId) {
            viewSampleDetail(currentSampleId);
        }
    } catch (e) {
        alert('处理失败: ' + e.message);
    }
}

function renderAdjustments(adjustments) {
    const container = document.getElementById('adjustments-list');
    if (!adjustments || adjustments.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:13px;">暂无改判记录</p>';
        return;
    }

    const sourceMap = {
        'manual_review': '人工评审',
        'batch_correction': '批量修正',
        'external_import': '外部导入',
    };

    container.innerHTML = adjustments.map(adj => {
        const scoreChange = adj.score_after - adj.score_before;
        const changeClass = scoreChange >= 0 ? 'up' : 'down';
        const changeText = (scoreChange >= 0 ? '+' : '') + scoreChange.toFixed(1);
        const statusBefore = statusMap[adj.status_before] || { label: adj.status_before };
        const statusAfter = statusMap[adj.status_after] || { label: adj.status_after };
        const sourceLabel = sourceMap[adj.source] || adj.source;

        return `
            <div class="adjustment-item">
                <div class="adjustment-header">
                    <span class="adjustment-title">${adj.adjuster} - ${sourceLabel}</span>
                    <span class="adjustment-time">${new Date(adj.created_at).toLocaleString()}</span>
                </div>
                <div class="adjustment-meta">
                    <span>评分: ${adj.score_before.toFixed(1)} → <strong>${adj.score_after.toFixed(1)}</strong>
                        <span class="score-change ${changeClass}">(${changeText})</span>
                    </span>
                    <span>状态: ${statusBefore.label} → ${statusAfter.label}</span>
                    ${adj.risk_level_before ? `<span>风险: ${adj.risk_level_before} → ${adj.risk_level_after || '-'}</span>` : ''}
                </div>
                <div class="adjustment-reason">
                    <strong>改判原因:</strong> ${adj.reason}
                </div>
                ${adj.source_ref ? `<div style="margin-top:6px;font-size:12px;color:#999;">来源引用: ${adj.source_ref}</div>` : ''}
            </div>
        `;
    }).join('');
}

function showAdjustModal() {
    document.getElementById('adjust-modal').classList.add('show');
}

function hideAdjustModal() {
    document.getElementById('adjust-modal').classList.remove('show');
}

async function submitAdjustment() {
    const score = parseFloat(document.getElementById('adj-score').value);
    const status = document.getElementById('adj-status').value;
    const risk = document.getElementById('adj-risk').value;
    const reason = document.getElementById('adj-reason').value;
    const source = document.getElementById('adj-source').value;
    const adjuster = document.getElementById('adj-adjuster').value;

    if (!score || !reason) {
        alert('请填写评分和改判原因');
        return;
    }

    try {
        await apiPost(`/samples/${currentSampleId}/adjustments`, {
            adjuster,
            reason,
            score_after: score,
            status_after: status,
            risk_level_after: risk,
            source,
        });
        alert('改判成功');
        hideAdjustModal();
        viewSampleDetail(currentSampleId);
        loadReviewStats();
    } catch (e) {
        alert('改判失败: ' + e.message);
    }
}

async function exportSamples() {
    const status = document.getElementById('filter-status').value;
    let url = '/samples/export';
    if (status) url += '?status=' + status;

    try {
        const data = await apiGet(url);
        const csvContent = [
            data.columns.join(','),
            ...data.data.map(row =>
                data.columns.map(col => `"${(row[col] || '').toString().replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '信贷评分样本导出_' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
    } catch (e) {
        alert('导出失败: ' + e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    switchView('review');
});
