let currentResults = null;

function showStatus(message, type = 'info') {
    const el = document.getElementById('upload-status');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
}

async function processFiles() {
    const btn = document.getElementById('process-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 正在处理...';
    showStatus('正在读取并校验数据，请稍候...', 'info');

    try {
        const formData = new FormData();
        const fileFields = ['questions', 'historical_answers', 'student_errors', 'constraints'];

        let hasAnyFile = false;
        for (const field of fileFields) {
            const input = document.getElementById(field);
            if (input.files && input.files[0]) {
                formData.append(field, input.files[0]);
                hasAnyFile = true;
            }
        }

        if (!formData.has('questions')) {
            showStatus('请至少上传「题目清单」文件', 'error');
            btn.disabled = false;
            btn.textContent = '▶ 开始校验与计算';
            return;
        }

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            showStatus('处理失败：' + (data.error || '未知错误'), 'error');
            console.error(data.traceback);
            btn.disabled = false;
            btn.textContent = '▶ 开始校验与计算';
            return;
        }

        currentResults = data;
        renderResults(data);

        showStatus('处理完成！请查看下方结果。', 'success');
        document.getElementById('results-section').style.display = 'block';

    } catch (err) {
        showStatus('网络错误：' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '▶ 开始校验与计算';
    }
}

function renderResults(data) {
    renderSummary(data);
    renderOperationsView(data);
    renderResearchView(data);
}

function renderSummary(data) {
    const summary = data.anomalies?.summary || {};
    const container = document.getElementById('summary-cards');

    container.innerHTML = `
        <div class="summary-card total">
            <div class="value">${summary.total_count || 0}</div>
            <div class="label">题目总数</div>
        </div>
        <div class="summary-card available">
            <div class="value">${summary.available_count || 0}</div>
            <div class="label">可直接使用</div>
        </div>
        <div class="summary-card pending">
            <div class="value">${summary.pending_count || 0}</div>
            <div class="label">需复核</div>
        </div>
        <div class="summary-card recapture">
            <div class="value">${summary.recapture_count || 0}</div>
            <div class="label">需重采</div>
        </div>
        <div class="summary-card rate">
            <div class="value">${summary.available_rate || 0}%</div>
            <div class="label">数据可用率</div>
        </div>
    `;
}

function renderOperationsView(data) {
    const perQuestion = data.anomalies?.per_question || {};
    const container = document.getElementById('operations-list');

    const items = Object.values(perQuestion).sort((a, b) => {
        const order = { available: 0, pending: 1, recapture: 2 };
        return (order[a.status] || 99) - (order[b.status] || 99);
    });

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无题目数据</div>';
        return;
    }

    container.innerHTML = items.map(q => `
        <div class="question-card ${q.status}">
            <div class="question-header">
                <span class="question-id">题目 ${q.question_id}</span>
                <span class="status-badge ${q.status}">${q.status_label}</span>
            </div>
            <div class="question-content">${escapeHtml(q.question_content || '')}</div>
            <div class="ops-suggestion">👉 ${q.for_operations}</div>
            ${q.available_data?.length ? `
                <div class="data-section available-data">
                    <h4>✅ 可用数据</h4>
                    <ul>${q.available_data.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${q.pending_data?.length ? `
                <div class="data-section pending-data">
                    <h4>⏸️ 暂缓数据（请复核）</h4>
                    <ul>${q.pending_data.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${q.recapture_data?.length ? `
                <div class="data-section recapture-data">
                    <h4>❌ 需重采/修正</h4>
                    <ul>${q.recapture_data.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${q.reasons?.length ? `
                <div class="reason-list">
                    <h4>📝 说明</h4>
                    <ul>${q.reasons.slice(0, 3).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function renderResearchView(data) {
    renderActionItems(data);
    renderValidationDetail(data);
    renderMetricsDetail(data);
    renderHistoryDetail(data);
    renderResearchList(data);
}

function renderActionItems(data) {
    const items = data.anomalies?.action_items || [];
    const container = document.getElementById('action-items');

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">🎉 所有数据状态良好，无需特别处理</div>';
        return;
    }

    const sorted = items.sort((a, b) => {
        const order = { recapture: 0, pending: 1 };
        return (order[a.status] || 99) - (order[b.status] || 99);
    });

    container.innerHTML = sorted.map(item => `
        <div class="action-item ${item.status === 'recapture' ? 'high' : 'medium'}">
            <span class="priority">${item.status === 'recapture' ? '高优' : '中优'}</span>
            <span class="qid">${escapeHtml(item.question_id || '')}</span>
            <span>${item.reasons?.map(r => escapeHtml(r)).join('；') || ''}</span>
            <span class="action-btn next-action ${getActionClass(item.next_action)}">${escapeHtml(item.next_action || '处理')}</span>
        </div>
    `).join('');
}

function renderValidationDetail(data) {
    const validation = data.validation_report || {};
    const container = document.getElementById('validation-detail');

    let rows = [];
    for (const [sheet, issues] of Object.entries(validation)) {
        if (sheet === 'summary' || !Array.isArray(issues)) continue;
        const sheetName = {
            questions: '题目清单',
            historical_answers: '历史答案',
            student_errors: '学生错题',
            constraints: '约束条件',
            cross_file: '跨文件对比'
        }[sheet] || sheet;

        issues.forEach(issue => {
            rows.push(`
                <tr>
                    <td>${escapeHtml(sheetName)}</td>
                    <td class="severity-${issue.severity || 'info'}">${{
                        critical: '● 严重',
                        warning: '● 警告',
                        info: '● 提示'
                    }[issue.severity] || '提示'}</td>
                    <td>${escapeHtml(issue.type || '')}</td>
                    <td>${escapeHtml(issue.message || '')}</td>
                    <td>${issue.rows?.join(', ') || '-'}</td>
                    <td><span class="next-action ${getActionClass(issue.action)}">${escapeHtml(issue.action || '确认')}</span></td>
                </tr>
            `);
        });
    }

    const summary = validation.summary || {};

    container.innerHTML = `
        <div style="margin-bottom:12px;">
            <strong>整体状态：</strong>
            <span style="color:${summary.overall_status === 'pass' ? '#22c55e' : summary.overall_status === 'caution' ? '#f59e0b' : '#ef4444'}; font-weight:600;">
                ${escapeHtml(summary.status_text || '')}
            </span>
            <span style="margin-left:16px; color:#64748b;">
                严重:${summary.total_critical || 0} | 警告:${summary.total_warning || 0} | 提示:${summary.total_info || 0}
            </span>
        </div>
        ${rows.length ? `
            <table class="validation-table">
                <thead>
                    <tr>
                        <th>数据文件</th>
                        <th>严重度</th>
                        <th>问题类型</th>
                        <th>描述</th>
                        <th>涉及行</th>
                        <th>建议动作</th>
                    </tr>
                </thead>
                <tbody>${rows.join('')}</tbody>
            </table>
        ` : '<div class="empty-state">校验通过，未发现问题</div>'}
    `;
}

function renderMetricsDetail(data) {
    const metrics = data.metrics_result || {};
    const formulaRef = metrics.formula_reference || {};
    const summary = metrics.summary || {};

    const formulaHtml = Object.entries(formulaRef).map(([key, name]) => `
        <div class="formula-card" onclick="showFormulaDetail('${key}')">
            <h4>${escapeHtml(name || key)}</h4>
            <div class="formula-text" id="formula-${key}-text">点击查看公式 →</div>
            <div class="formula-meta">单位、适用范围及失败原因</div>
        </div>
    `).join('');

    document.getElementById('formula-reference').innerHTML = formulaHtml;

    let metricCards = '';
    if (summary.overall_MSE !== undefined) {
        metricCards += `<div class="metric-card"><div class="metric-name">整体 MSE</div><div class="metric-value">${summary.overall_MSE}</div><div class="metric-unit">原始单位²</div></div>`;
    }
    if (summary.overall_RMSE !== undefined) {
        metricCards += `<div class="metric-card"><div class="metric-name">整体 RMSE</div><div class="metric-value">${summary.overall_RMSE}</div><div class="metric-unit">与原始数据单位一致</div></div>`;
    }
    if (summary.overall_MAE !== undefined) {
        metricCards += `<div class="metric-card"><div class="metric-name">整体 MAE</div><div class="metric-value">${summary.overall_MAE}</div><div class="metric-unit">与原始数据单位一致</div></div>`;
    }
    if (summary.overall_R2 !== undefined) {
        metricCards += `<div class="metric-card"><div class="metric-name">整体 R²</div><div class="metric-value">${summary.overall_R2}</div><div class="metric-unit">[-∞, 1]，越大越好</div></div>`;
    }
    if (summary.overall_accuracy !== undefined) {
        metricCards += `<div class="metric-card"><div class="metric-name">整体准确率</div><div class="metric-value">${summary.overall_accuracy}%</div><div class="metric-unit">离散答案匹配</div></div>`;
    }

    metricCards += `
        <div class="metric-card"><div class="metric-name">有学生作答题目</div><div class="metric-value">${summary.questions_with_students || 0}</div><div class="metric-unit">/ ${summary.total_questions || 0} 题</div></div>
        <div class="metric-card"><div class="metric-name">有数值指标题目</div><div class="metric-value">${summary.questions_with_numeric_metrics || 0}</div><div class="metric-unit">可计算MSE/RMSE等</div></div>
        <div class="metric-card"><div class="metric-name">单位缺失题目</div><div class="metric-value">${summary.questions_missing_unit || 0}</div><div class="metric-unit" style="color:#f59e0b;">需补充</div></div>
    `;

    document.getElementById('metrics-detail').innerHTML = metricCards || '<div class="empty-state">无足够数据计算指标</div>';
}

function renderHistoryDetail(data) {
    const history = data.history_result || {};
    const trails = history.source_trail || [];
    const conflicts = history.conflicts || [];
    const container = document.getElementById('history-detail');

    let html = '';
    if (history.note) {
        html += `<div class="empty-state">${escapeHtml(history.note)}</div>`;
    }

    if (trails.length) {
        html += '<h4 style="margin-bottom:8px;">📜 来源追溯路径</h4>';
        html += trails.map(t => `
            <div class="trail-item status-${t.status}">
                <div class="trail-qid">
                    题目 ${escapeHtml(t.question_id || '')}
                    <span class="trail-status ${t.status}">${escapeHtml(t.status || '')}</span>
                </div>
                <div class="trail-path">${escapeHtml(t.trail || '')}</div>
            </div>
        `).join('');
    }

    if (conflicts.length) {
        html += `<h4 style="margin:16px 0 8px; color:#ef4444;">⚠️ 答案冲突清单（共 ${conflicts.length} 处）</h4>`;
        html += '<table class="validation-table"><thead><tr><th>题目编号</th><th>正确答案</th><th>历史答案</th><th>违反约束</th><th>来源</th></tr></thead><tbody>';
        html += conflicts.map(c => `
            <tr>
                <td>${escapeHtml(c.question_id || '')}</td>
                <td>${escapeHtml(c.correct_answer || '')}</td>
                <td style="color:#ef4444;">${escapeHtml(c.historical_answer || '')}</td>
                <td>${escapeHtml(c.constraint || '')}</td>
                <td>${escapeHtml(c.source || '')}</td>
            </tr>
        `).join('');
        html += '</tbody></table>';
    }

    if (!html) {
        html = '<div class="empty-state">暂无历史对比数据</div>';
    }

    container.innerHTML = html;
}

function renderResearchList(data) {
    const perQuestion = data.anomalies?.per_question || {};
    const metricsPerQ = data.metrics_result?.per_question || {};
    const container = document.getElementById('research-list');

    const items = Object.values(perQuestion).sort((a, b) => {
        const order = { recapture: 0, pending: 1, available: 2 };
        return (order[a.status] || 99) - (order[b.status] || 99);
    });

    container.innerHTML = items.map(q => {
        const m = metricsPerQ[q.question_id] || {};
        const metrics = m.metrics || {};
        const histAnswers = m.historical_answers || [];

        let metricsHtml = '';
        for (const [key, val] of Object.entries(metrics)) {
            const label = {MSE:'MSE', RMSE:'RMSE', MAE:'MAE', R2:'R²', accuracy:'准确率%', score_deviation:'得分偏差%'}[key] || key;
            if (val.status === 'ok') {
                metricsHtml += `<span style="display:inline-block; background:#dcfce7; color:#166534; padding:2px 8px; border-radius:4px; font-size:12px; margin:2px;">${label}: ${val.value}</span>`;
            } else if (val.status === 'skipped') {
                metricsHtml += `<span style="display:inline-block; background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:4px; font-size:12px; margin:2px;">${label}: 跳过</span>`;
            } else if (val.status === 'error') {
                metricsHtml += `<span style="display:inline-block; background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:4px; font-size:12px; margin:2px;" title="${escapeHtml(val.message || '')}">${label}: 错误</span>`;
            }
        }

        let histHtml = '';
        if (histAnswers.length) {
            histHtml = '<div style="margin-top:8px; font-size:12px;"><strong>历史答案对比：</strong>';
            histAnswers.forEach(h => {
                const color = h.matches_correct === true ? '#166534' : h.matches_correct === false ? '#991b1b' : '#64748b';
                histHtml += `<div style="padding:2px 0; color:${color};">• ${escapeHtml(h.historical_answer || '')} <span style="color:#94a3b8;">(来源: ${escapeHtml(h.source || '未知')})</span>${h.numeric_diff !== undefined ? ` 差异: ${h.numeric_diff}` : ''}</div>`;
            });
            histHtml += '</div>';
        }

        return `
        <div class="question-card ${q.status}">
            <div class="question-header">
                <span class="question-id">题目 ${q.question_id} <span style="color:#94a3b8; font-weight:400; font-size:12px;">(Excel第${q.excel_row}行)</span></span>
                <span class="status-badge ${q.status}">${q.status_label}</span>
            </div>
            <div class="question-content">${escapeHtml(q.question_content || '')}</div>
            <div class="question-meta">
                <span><strong>正确答案：</strong>${escapeHtml(String(m.correct_answer || ''))}</span>
                <span><strong>单位：</strong>${escapeHtml(m.unit || '⚠️缺失')}</span>
                <span><strong>满分：</strong>${escapeHtml(String(m.full_score || ''))}</span>
                <span><strong>学生数：</strong>${q.student_count || 0}</span>
                <span><strong>历史答案数：</strong>${histAnswers.length}</span>
            </div>
            ${q.next_action ? `<div class="next-action ${getActionClass(q.next_action)}">下一步：${escapeHtml(q.next_action)}</div>` : ''}
            <div style="margin-top:8px;">${metricsHtml}</div>
            ${histHtml}
            ${q.reasons?.length ? `
                <div class="reason-list" style="margin-top:8px;">
                    <h4>问题原因</h4>
                    <ul>${q.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
                </div>
            ` : ''}
        </div>
    `;
    }).join('');
}

function switchView(viewName) {
    document.querySelectorAll('.view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === viewName);
    });
    document.querySelectorAll('.view-panel').forEach(p => {
        p.style.display = 'none';
    });
    document.getElementById(`${viewName}-view`).style.display = 'block';
}

function getActionClass(action) {
    if (!action) return '';
    const a = String(action);
    if (a.includes('补材料')) return 'bucailiao';
    if (a.includes('改口径')) return 'gaikoujing';
    if (a.includes('复核')) return 'fuhe';
    return '';
}

async function showFormulaDetail(formulaName) {
    try {
        const res = await fetch(`/formula/${encodeURIComponent(formulaName)}`);
        const data = await res.json();
        if (data.success) {
            const f = data.data;
            document.getElementById('formula-modal-body').innerHTML = `
                <h3 style="margin-bottom:12px; color:#667eea;">${escapeHtml(f.name || formulaName)}</h3>
                <div style="background:#f1f5f9; padding:12px; border-radius:8px; font-family:Courier New, monospace; font-size:16px; margin-bottom:12px;">${escapeHtml(f.formula || '')}</div>
                <p style="margin-bottom:8px;"><strong>单位：</strong>${escapeHtml(f.unit || '')}</p>
                <p style="margin-bottom:8px;"><strong>适用范围：</strong>${escapeHtml(f.scope || '')}</p>
                <p><strong>失败原因：</strong></p>
                <ul style="margin-left:20px; color:#64748b;">
                    ${(f.failure_reasons || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
            `;
            document.getElementById('formula-modal').style.display = 'flex';
        }
    } catch (e) {
        console.error(e);
    }
}

function closeModal() {
    document.getElementById('formula-modal').style.display = 'none';
}

async function exportResults() {
    if (!currentResults) {
        alert('请先处理数据再导出');
        return;
    }
    const exportType = document.querySelector('input[name="export_type"]:checked')?.value || 'full';
    const format = document.getElementById('export_format').value;

    const payload = {
        ...currentResults,
        export_type: exportType,
        format: format
    };

    try {
        const res = await fetch('/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
            a.download = `梯度下降轨迹讲解结果_${ts}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const data = await res.json();
            alert('导出失败：' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络错误：' + e.message);
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.onclick = function(e) {
    const modal = document.getElementById('formula-modal');
    if (e.target === modal) {
        closeModal();
    }
};
