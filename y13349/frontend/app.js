const API_BASE = 'http://localhost:8000/api';

let currentDashboard = null;
let currentSamples = [];
let currentReportContent = '';

async function apiGet(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

async function apiPost(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

function getFilterParams() {
    const params = new URLSearchParams();

    const versionSelect = document.getElementById('filterVersion');
    const versions = Array.from(versionSelect.selectedOptions).map(o => o.value);
    if (versions.length > 0) params.set('versions', versions.join(','));

    const categorySelect = document.getElementById('filterCategory');
    const categories = Array.from(categorySelect.selectedOptions).map(o => o.value);
    if (categories.length > 0) params.set('categories', categories.join(','));

    const statusSelect = document.getElementById('filterStatus');
    const statuses = Array.from(statusSelect.selectedOptions).map(o => o.value);
    if (statuses.length > 0) params.set('statuses', statuses.join(','));

    const sourceSelect = document.getElementById('filterSource');
    const sources = Array.from(sourceSelect.selectedOptions).map(o => o.value);
    if (sources.length > 0) params.set('source_types', sources.join(','));

    const missingRef = document.getElementById('filterMissingRef').value;
    if (missingRef !== '') params.set('has_missing_refs', missingRef);

    const duplicate = document.getElementById('filterDuplicate').value;
    if (duplicate !== '') params.set('is_duplicate', duplicate);

    return params.toString();
}

async function loadData() {
    const filterParams = getFilterParams();
    const queryStr = filterParams ? `?${filterParams}` : '';

    try {
        const [dashboard, samples, detail] = await Promise.all([
            apiGet(`/dashboard${queryStr}`),
            apiGet(`/samples${queryStr}`),
            apiGet(`/metrics/detail${queryStr}`)
        ]);

        currentDashboard = dashboard;
        currentSamples = samples;

        renderFilters(dashboard);
        renderMetrics(detail.metric);
        renderInfluential(detail.top_influential_samples);
        renderSamples(samples);
        initVersionDiff(dashboard.versions);
    } catch (e) {
        console.error('加载数据失败:', e);
    }
}

function renderFilters(dashboard) {
    const versionSelect = document.getElementById('filterVersion');
    const prevVersions = Array.from(versionSelect.selectedOptions).map(o => o.value);
    versionSelect.innerHTML = dashboard.versions.map(v =>
        `<option value="${v}">${v}</option>`
    ).join('');
    if (prevVersions.length > 0) {
        Array.from(versionSelect.options).forEach(o => {
            o.selected = prevVersions.includes(o.value);
        });
    }

    const categorySelect = document.getElementById('filterCategory');
    const prevCategories = Array.from(categorySelect.selectedOptions).map(o => o.value);
    categorySelect.innerHTML = dashboard.categories.map(c =>
        `<option value="${c}">${c}</option>`
    ).join('');
    if (prevCategories.length > 0) {
        Array.from(categorySelect.options).forEach(o => {
            o.selected = prevCategories.includes(o.value);
        });
    }
}

function renderMetrics(metric) {
    document.getElementById('metricTotal').textContent = metric.total_samples;
    document.getElementById('metricPass').textContent = metric.pass_count;
    document.getElementById('metricFail').textContent = metric.fail_count;
    document.getElementById('metricPending').textContent = metric.pending_count;
    document.getElementById('metricPassRate').textContent = metric.pass_rate + '%';
    document.getElementById('metricMissingRef').textContent = metric.missing_ref_count;
    document.getElementById('metricDuplicate').textContent = metric.duplicate_count;
    document.getElementById('metricAvgRef').textContent = metric.avg_refs_per_sample;
}

function renderInfluential(samples) {
    const container = document.getElementById('influentialList');

    if (!samples || samples.length === 0) {
        container.innerHTML = '<p class="placeholder" style="color:#999;text-align:center;padding:10px;">暂无显著影响结论的样本</p>';
        return;
    }

    container.innerHTML = samples.slice(0, 10).map((s, i) => {
        const badges = [];
        if (s.status === 'fail') badges.push('<span class="badge badge-fail">未通过</span>');
        if (s.missing_references && s.missing_references.length > 0) {
            badges.push(`<span class="badge badge-missing">缺${s.missing_references.length}引用</span>`);
        }
        if (s.is_duplicate) badges.push('<span class="badge badge-duplicate">重复</span>');
        if (s.status === 'pending') badges.push('<span class="badge badge-pending">待处理</span>');

        return `
            <div class="influential-item" onclick="viewSampleDetail('${s.sample_id}')">
                <div class="influential-rank">${i + 1}</div>
                <div class="influential-info">
                    <div class="influential-name">${s.sample_name}</div>
                    <div class="influential-reasons">版本: ${s.review_version} · 分类: ${s.category || '未分类'}</div>
                </div>
                <div class="influential-badges">${badges.join('')}</div>
            </div>
        `;
    }).join('');
}

function renderSamples(samples) {
    const tbody = document.getElementById('samplesBody');

    if (!samples || samples.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:30px;">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = samples.map(s => {
        const statusClass = `status-${s.status}`;
        const statusText = cnStatus(s.status);
        const sourceClass = s.source_type === 'oral_note' ? 'oral' : '';
        const sourceText = cnSourceType(s.source_type);
        const missingRef = s.missing_references && s.missing_references.length > 0
            ? `<span class="badge badge-missing">${s.missing_references.length}项</span>`
            : '无';
        const duplicate = s.is_duplicate ? '<span class="badge badge-duplicate">是</span>' : '否';

        return `
            <tr>
                <td>${s.sample_name}</td>
                <td>${s.review_version}</td>
                <td>${s.category || '未分类'}</td>
                <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                <td><span class="source-tag ${sourceClass}">${sourceText}</span></td>
                <td>${s.references ? s.references.length : 0}</td>
                <td>${missingRef}</td>
                <td>${duplicate}</td>
                <td><button class="action-btn" onclick="viewSampleDetail('${s.sample_id}')">详情</button></td>
            </tr>
        `;
    }).join('');
}

function initVersionDiff(versions) {
    const oldSelect = document.getElementById('diffOldVersion');
    const newSelect = document.getElementById('diffNewVersion');

    const oldVal = oldSelect.value;
    const newVal = newSelect.value;

    oldSelect.innerHTML = '<option value="">选择旧版本</option>' + versions.map(v =>
        `<option value="${v}">${v}</option>`
    ).join('');
    newSelect.innerHTML = '<option value="">选择新版本</option>' + versions.map(v =>
        `<option value="${v}">${v}</option>`
    ).join('');

    if (oldVal) oldSelect.value = oldVal;
    if (newVal) newSelect.value = newVal;
}

async function loadVersionDiff() {
    const oldVersion = document.getElementById('diffOldVersion').value;
    const newVersion = document.getElementById('diffNewVersion').value;
    const resultDiv = document.getElementById('diffResult');

    if (!oldVersion || !newVersion) {
        resultDiv.innerHTML = '<p class="placeholder">请选择两个版本进行对比</p>';
        return;
    }

    try {
        const diff = await apiGet(`/version-diff?old_version=${oldVersion}&new_version=${newVersion}`);

        if (!diff.changes || diff.changes.length === 0) {
            resultDiv.innerHTML = `
                <div class="diff-summary">
                    <strong>${oldVersion}</strong> → <strong>${newVersion}</strong>
                    <span style="margin-left:16px;color:#52c41a;">无变更</span>
                </div>
            `;
            return;
        }

        const added = diff.changes.filter(c => c.change_type === 'added');
        const removed = diff.changes.filter(c => c.change_type === 'removed');
        const modified = diff.changes.filter(c => c.change_type === 'modified');

        resultDiv.innerHTML = `
            <div class="diff-summary">
                <strong>${oldVersion}</strong> → <strong>${newVersion}</strong>
                <span style="margin-left:16px;">
                    变更样本: <strong>${diff.changed_samples.length}</strong> 个
                    （新增 ${added.length}，删除 ${removed.length}，修改 ${modified.length}）
                </span>
            </div>
            <div class="diff-changes">
                ${diff.changes.map(c => `
                    <div class="diff-change-item ${c.change_type}">
                        <strong>${c.sample_id || '未知'}</strong> · ${cnField(c.field)}: 
                        ${c.old_value ? `<del style="color:#999;">${c.old_value}</del> → ` : ''}
                        ${c.new_value || '-'}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        resultDiv.innerHTML = `<p style="color:#f5222d;">加载对比失败: ${e.message}</p>`;
    }
}

async function viewSampleDetail(sampleId) {
    try {
        const sample = await apiGet(`/samples/${sampleId}`);
        const original = await apiGet(`/samples/${sampleId}/original-statement`);

        showModal(sample.sample_name, `
            <div class="detail-section">
                <h4>基本信息</h4>
                <ul class="detail-list">
                    <li><strong>样本ID:</strong> ${sample.sample_id}</li>
                    <li><strong>版本:</strong> ${sample.review_version}</li>
                    <li><strong>分类:</strong> ${sample.category || '未分类'}</li>
                    <li><strong>状态:</strong> <span class="status-tag status-${sample.status}">${cnStatus(sample.status)}</span></li>
                    <li><strong>来源:</strong> ${cnSourceType(sample.source_type)}</li>
                    <li><strong>引用数:</strong> ${sample.references ? sample.references.length : 0}</li>
                </ul>
            </div>

            ${sample.references && sample.references.length > 0 ? `
            <div class="detail-section">
                <h4>引用列表</h4>
                <ul class="reference-list">
                    ${sample.references.map(r => `
                        <li>📌 ${r.text}${r.version ? ` <span style="color:#1890ff;font-size:12px;">[${r.version}]</span>` : ''}</li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            ${sample.missing_references && sample.missing_references.length > 0 ? `
            <div class="detail-section">
                <h4>⚠️ 缺失引用</h4>
                <ul class="missing-ref-list">
                    ${sample.missing_references.map(r => `<li>❌ ${r}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${sample.is_duplicate ? `
            <div class="detail-section">
                <h4>🔄 重复评测</h4>
                <p style="color:#722ed1;">重复对象: ${sample.duplicate_of || '未明确说明'}</p>
            </div>
            ` : ''}

            ${original.matches && original.matches.length > 0 ? `
            <div class="detail-section">
                <h4>📜 版本说明中的原始说法</h4>
                ${original.matches.map(m => `
                    <div class="original-statement">
                        <div class="version-label">${m.version} · ${m.title}</div>
                        <div class="statement-text">${m.matched_content}</div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        `);
    } catch (e) {
        showModal('错误', `<p style="color:#f5222d;">加载详情失败: ${e.message}</p>`);
    }
}

async function viewReport() {
    const filterParams = getFilterParams();

    const oldVersion = document.getElementById('diffOldVersion').value;
    const newVersion = document.getElementById('diffNewVersion').value;
    const includeDiff = oldVersion && newVersion;

    let queryStr = filterParams;
    if (includeDiff) {
        if (queryStr) queryStr += '&';
        queryStr += `include_version_diff=true&old_version=${oldVersion}&new_version=${newVersion}`;
    }
    if (queryStr) queryStr = '?' + queryStr;

    try {
        const res = await fetch(`${API_BASE}/report${queryStr}`);
        const text = await res.text();
        currentReportContent = text;

        document.getElementById('reportContent').textContent = text;
        document.getElementById('reportModal').classList.add('show');
    } catch (e) {
        alert('生成报告失败: ' + e.message);
    }
}

function downloadReport() {
    if (!currentReportContent) return;

    const blob = new Blob([currentReportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `代码审查报告_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function rerun() {
    const btn = document.getElementById('btnRerun');
    btn.disabled = true;
    btn.textContent = '⏳ 重跑中...';

    try {
        const result = await apiPost('/reload');
        await loadData();
        alert(`重跑成功！\n版本说明: ${result.version_notes_count} 份\n样本: ${result.samples_count} 条\n版本: ${result.versions.join(', ')}`);
    } catch (e) {
        alert('重跑失败: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 重跑';
    }
}

function showModal(title, body) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('show');
}

function cnStatus(status) {
    const map = {
        pass: '通过',
        fail: '未通过',
        pending: '待处理',
        duplicate: '重复'
    };
    return map[status] || status;
}

function cnSourceType(type) {
    const map = {
        version_note: '版本说明',
        review_record: '审查记录',
        oral_note: '口头说明'
    };
    return map[type] || type;
}

function cnField(field) {
    const map = {
        sample: '样本',
        status: '状态',
        category: '分类',
        references: '引用',
        missing_references: '缺失引用',
        duplicate: '重复标记',
        content: '内容'
    };
    return map[field] || field;
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
});

document.getElementById('reportModal').addEventListener('click', (e) => {
    if (e.target.id === 'reportModal') closeReportModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeReportModal();
    }
});
