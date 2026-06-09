const state = {
    currentLevel: 1,
    totalLevels: 3,
    currentSlice: 0,
    totalSlices: 5,
    selectedMeasurement: null,
    measurements: [],
    originalMeasurements: [],
    collisionData: { before: [], after: [] },
    history: [],
    hasModification: false,
    stats: {
        rerunCount: 0,
        supplementCount: 0,
        confirmCount: 0
    },
    boundaryConfig: {
        minX: 100, maxX: 150,
        minY: 50, maxY: 90,
        minZ: 30, maxZ: 60,
        maxDeviation: 5
    }
};

const levels = [
    {
        id: 1,
        title: "边界检测关卡",
        description: "对2026年6月上旬A标段堤防监测数据进行边界合规性检测。请特别留意 <span class='highlight'>混在正常数据中的异常值</span>，它们可能是设备漂移、人工录入错误或重复编号造成的。完成后点击<span class='highlight'>人工确认</span>进入下一关卡。",
        type: "boundary",
        taskHint: "任务：找出所有异常数据，处理P-003号点后，使用人工确认按钮提交"
    },
    {
        id: 2,
        title: "数据补录与撤销关卡",
        description: "系统发现第47号断面存在数据遗漏，需要进行补录操作。补录完成后请尝试<span class='highlight'>撤销</span>功能验证数据回滚效果，然后使用<span class='highlight'>重开</span>重新执行一次，最后<span class='highlight'>人工确认</span>进入结算。",
        type: "supplement",
        taskHint: "任务：补录 → 撤销 → 重开 → 人工确认（所有操作都要试到）"
    },
    {
        id: 3,
        title: "综合巡检结算",
        description: "完成所有检测任务，系统自动生成巡检结算报告，供评审会审阅。",
        type: "settlement",
        taskHint: "任务：查看结算报告，确认巡检结果"
    }
];

const sampleMeasurements = [
    {
        id: "P-001",
        timestamp: "2026-06-01 08:30:15",
        section: "A-12",
        x: 123.45, y: 67.89, z: 45.67,
        waterLevel: 23.45,
        flowRate: 12.8,
        deviation: 2.3,
        status: "normal",
        note: "",
        tags: ["堤防监测", "正常"]
    },
    {
        id: "P-002",
        timestamp: "2026-06-01 09:15:42",
        section: "A-12",
        x: 124.12, y: 68.34, z: 46.21,
        waterLevel: 23.52,
        flowRate: 13.1,
        deviation: 1.8,
        status: "normal",
        note: "",
        tags: ["堤防监测", "正常"]
    },
    {
        id: "P-003",
        timestamp: "2026-06-01 10:05:33",
        section: "A-12",
        x: 185.76, y: 92.45, z: 58.92,
        waterLevel: null,
        flowRate: 999.9,
        deviation: 15.7,
        status: "error",
        note: "疑似设备漂移，坐标超出A标段范围，流量值异常（正常范围8-25）",
        tags: ["边界越界", "数据异常", "待复核"]
    },
    {
        id: "P-004",
        timestamp: "2026-06-01 10:45:20",
        section: "A-12",
        x: 122.89, y: 67.12, z: 45.11,
        waterLevel: 23.38,
        flowRate: 12.5,
        deviation: 3.1,
        status: "warning",
        note: "偏差接近阈值，建议加密观测",
        tags: ["堤防监测", "警告"]
    },
    {
        id: "P-002",
        timestamp: "2026-06-01 09:15:42",
        section: "A-12",
        x: 124.15, y: 68.31, z: 46.19,
        waterLevel: 23.50,
        flowRate: 12.9,
        deviation: 2.0,
        status: "warning",
        note: "⚠️ 编号重复：与P-002第一条记录编号相同，数据略有差异",
        tags: ["重复编号", "数据冲突", "警告"]
    },
    {
        id: "P-005",
        timestamp: "2099-13-45 25:99:99",
        section: "A-13",
        x: 125.01, y: 69.05, z: 46.88,
        waterLevel: 23.61,
        flowRate: 13.3,
        deviation: 0.9,
        status: "warning",
        note: "⚠️ 时间戳格式异常：2099-13-45 25:99:99 不是合法时间",
        tags: ["格式错误", "时间戳异常", "警告"]
    },
    {
        id: "P-006",
        timestamp: "2026-06-02 14:22:08",
        section: "A-13",
        x: 123.78, y: 68.22, z: 45.95,
        waterLevel: 23.48,
        flowRate: null,
        deviation: 1.2,
        status: "warning",
        note: "⚠️ 数据缺失：流量值为空，可能是传感器离线",
        tags: ["数据缺失", "警告"]
    },
    {
        id: "P-007",
        timestamp: "2026-06-02 15:10:55",
        section: "A-13",
        x: 124.56, y: 68.88, z: 46.34,
        waterLevel: -5.23,
        flowRate: 12.7,
        deviation: 2.5,
        status: "error",
        note: "⚠️ 数据异常：水位 -5.23m 为负值，超出物理合理范围",
        tags: ["数据异常", "负值错误", "异常"]
    }
];

function init() {
    loadLevel(1);
    setupEventListeners();
    renderPointCloud();
}

function loadLevel(levelNum) {
    state.currentLevel = levelNum;
    state.hasModification = false;
    const level = levels[levelNum - 1];
    
    document.getElementById('current-level').textContent = `关卡 ${levelNum}/${state.totalLevels}`;
    
    if (levelNum === 1) {
        state.measurements = JSON.parse(JSON.stringify(sampleMeasurements));
        state.originalMeasurements = JSON.parse(JSON.stringify(sampleMeasurements));
        state.collisionData.before = generateCollisionData(state.measurements);
        state.collisionData.after = JSON.parse(JSON.stringify(state.collisionData.before));
        state.history = [];
    }
    
    renderMeasurements();
    renderLevelInfo();
    renderCollisionData();
    renderStats();
    document.getElementById('comparison-section').style.display = 'none';
    
    if (levelNum === 3) {
        setTimeout(showSettlement, 300);
    }
}

function renderMeasurements() {
    const container = document.getElementById('measurement-list');
    container.innerHTML = state.measurements.map((m, index) => {
        const hasIssue = m.status === 'error' || m.status === 'warning';
        const tagsHtml = (m.tags || []).map(t => 
            `<span class="tag tag-${t === '正常' || t === '堤防监测' ? 'normal' : (t === '警告' ? 'warning' : 'error')}">${t}</span>`
        ).join('');
        
        return `
        <div class="measurement-item ${m.status} ${state.selectedMeasurement === index ? 'selected' : ''}" 
             data-index="${index}">
            <div class="measurement-header">
                <div class="measurement-id-wrap">
                    <span class="measurement-id">${m.id}</span>
                    <span class="measurement-section">${m.section || '-'}</span>
                </div>
                <span class="measurement-status status-${m.status}">
                    ${m.status === 'normal' ? '正常' : m.status === 'warning' ? '警告' : '异常'}
                </span>
            </div>
            <div class="measurement-timestamp">${m.timestamp || '时间缺失'}</div>
            <div class="measurement-tags">${tagsHtml}</div>
            <div class="measurement-details">
                <div class="measurement-detail"><span>X:</span><span class="${m.x > state.boundaryConfig.maxX || m.x < state.boundaryConfig.minX ? 'bad-value' : ''}">${m.x.toFixed(2)}</span></div>
                <div class="measurement-detail"><span>Y:</span><span class="${m.y > state.boundaryConfig.maxY || m.y < state.boundaryConfig.minY ? 'bad-value' : ''}">${m.y.toFixed(2)}</span></div>
                <div class="measurement-detail"><span>Z:</span><span class="${m.z > state.boundaryConfig.maxZ || m.z < state.boundaryConfig.minZ ? 'bad-value' : ''}">${m.z.toFixed(2)}</span></div>
                <div class="measurement-detail"><span>水位:</span><span class="${m.waterLevel === null || m.waterLevel < 0 ? 'bad-value' : ''}">${m.waterLevel === null ? '缺失' : m.waterLevel.toFixed(2) + 'm'}</span></div>
                <div class="measurement-detail"><span>流量:</span><span class="${m.flowRate === null || m.flowRate > 50 ? 'bad-value' : ''}">${m.flowRate === null ? '缺失' : m.flowRate.toFixed(1)}</span></div>
                <div class="measurement-detail"><span>偏差:</span><span class="${m.deviation > state.boundaryConfig.maxDeviation ? 'bad-value' : ''}">${m.deviation.toFixed(1)}mm</span></div>
            </div>
            ${m.note ? `<div class="measurement-note">📝 ${m.note}</div>` : ''}
        </div>
    `}).join('');
    
    container.querySelectorAll('.measurement-item').forEach(item => {
        item.addEventListener('click', () => {
            state.selectedMeasurement = parseInt(item.dataset.index);
            renderMeasurements();
            highlightCollisionPoint();
            autoFillOpinionForm();
        });
    });
}

function autoFillOpinionForm() {
    if (state.selectedMeasurement === null) return;
    const m = state.measurements[state.selectedMeasurement];
    const statusSelect = document.getElementById('status-select');
    const opinionText = document.getElementById('opinion-text');
    
    statusSelect.value = m.status;
    
    if (m.status === 'error') {
        opinionText.value = `【${m.id}】经复核，该点存在${(m.tags || []).slice(0, 2).join('、') || '异常'}问题。建议：${m.note || '重新测量或标记为无效数据。'}`;
    } else if (m.status === 'warning') {
        opinionText.value = `【${m.id}】该点存在${(m.tags || []).slice(0, 2).join('、') || '警告'}，需关注后续变化。`;
    } else {
        opinionText.value = `【${m.id}】数据正常，符合质量要求。`;
    }
}

function renderLevelInfo() {
    const level = levels[state.currentLevel - 1];
    const container = document.getElementById('level-info');
    container.innerHTML = `
        <div class="level-card">
            <h3>${level.title}</h3>
            <p>${level.description}</p>
            <div class="task-hint">${level.taskHint}</div>
        </div>
    `;
}

function renderStats() {
    const statsContainer = document.getElementById('stats-bar');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-chip">🔄 重复运行: ${state.stats.rerunCount}</div>
            <div class="stat-chip">➕ 补录次数: ${state.stats.supplementCount}</div>
            <div class="stat-chip">✅ 人工确认: ${state.stats.confirmCount}</div>
        `;
    }
}

function renderCollisionData() {
    const container = document.getElementById('collision-content');
    const viewMode = document.querySelector('input[name="collision-view"]:checked').value;
    
    if (viewMode === 'before') {
        container.innerHTML = renderCollisionList(state.collisionData.before, 'before');
    } else if (viewMode === 'after') {
        container.innerHTML = renderCollisionList(state.collisionData.after, 'after');
    } else {
        container.innerHTML = `
            <div class="collision-compare">
                <div class="collision-compare-col">
                    <h4>修改前（原始检测）</h4>
                    ${renderCollisionList(state.collisionData.before, 'before')}
                </div>
                <div class="collision-compare-col">
                    <h4>修改后（当前检测）</h4>
                    ${renderCollisionList(state.collisionData.after, 'after')}
                </div>
            </div>
            ${renderDiffSummary()}
        `;
    }
}

function renderDiffSummary() {
    const diffs = [];
    const maxLen = Math.max(state.collisionData.before.length, state.collisionData.after.length);
    
    for (let i = 0; i < maxLen; i++) {
        const before = state.collisionData.before[i];
        const after = state.collisionData.after[i];
        if (before && after && before.normal !== after.normal) {
            diffs.push({
                id: before.id,
                before: before.normal ? '正常' : '异常',
                after: after.normal ? '正常' : '异常'
            });
        }
    }
    
    if (diffs.length === 0) return '';
    
    return `
        <div class="diff-summary">
            <div class="diff-title">📊 判定变化汇总</div>
            ${diffs.map(d => `
                <div class="diff-item">
                    <span class="diff-id">${d.id}</span>
                    <span class="diff-arrow">${d.before} → ${d.after}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCollisionList(data, phase) {
    if (!data || data.length === 0) {
        return '<div style="color: #8c8c8c; text-align: center; padding: 20px;">暂无检测数据</div>';
    }
    return data.map((item, idx) => {
        const isSelected = state.selectedMeasurement === idx;
        const diffClass = phase === 'after' && state.collisionData.before[idx] && state.collisionData.before[idx].normal !== item.normal ? 'changed' : '';
        return `
        <div class="collision-item ${item.normal ? 'normal' : ''} ${diffClass} ${isSelected ? 'highlighted' : ''}" data-index="${idx}">
            <div class="collision-item-header">
                <span class="collision-id">${item.id}</span>
                <span class="collision-badge ${item.normal ? 'badge-ok' : 'badge-bad'}">${item.normal ? '✓ 通过' : '✗ 失败'}</span>
            </div>
            <div class="collision-message">${item.message}</div>
            ${item.boundary ? `
                <div class="collision-boundary">
                    <div>边界范围: X[${state.boundaryConfig.minX}-${state.boundaryConfig.maxX}], Y[${state.boundaryConfig.minY}-${state.boundaryConfig.maxY}], Z[${state.boundaryConfig.minZ}-${state.boundaryConfig.maxZ}]</div>
                    <div>实际值: X=${item.boundary.x?.toFixed(2)}, Y=${item.boundary.y?.toFixed(2)}, Z=${item.boundary.z?.toFixed(2)}</div>
                    ${item.boundary.violations?.length ? `<div class="violation-list">越界项: ${item.boundary.violations.join(', ')}</div>` : ''}
                </div>
            ` : ''}
        </div>
    `}).join('');
}

function generateCollisionData(measurements) {
    return measurements.map(m => {
        const violations = [];
        const boundary = { x: m.x, y: m.y, z: m.z, violations };
        
        if (m.x < state.boundaryConfig.minX || m.x > state.boundaryConfig.maxX) violations.push('X坐标');
        if (m.y < state.boundaryConfig.minY || m.y > state.boundaryConfig.maxY) violations.push('Y坐标');
        if (m.z < state.boundaryConfig.minZ || m.z > state.boundaryConfig.maxZ) violations.push('Z坐标');
        if (m.deviation > state.boundaryConfig.maxDeviation) violations.push('偏差');
        if (m.waterLevel !== null && m.waterLevel < 0) violations.push('水位负值');
        if (m.flowRate !== null && m.flowRate > 50) violations.push('流量异常');
        if (m.waterLevel === null || m.flowRate === null) violations.push('数据缺失');
        
        const isNormal = violations.length === 0 && m.status === 'normal';
        
        if (violations.length > 0) {
            return {
                id: m.id,
                normal: false,
                message: `检测到 ${violations.length} 项问题：${violations.join('、')}，偏差 ${m.deviation.toFixed(1)}mm`,
                boundary
            };
        } else if (m.deviation > state.boundaryConfig.maxDeviation) {
            return {
                id: m.id,
                normal: false,
                message: `接近安全边界，偏差 ${m.deviation.toFixed(1)}mm（阈值 ${state.boundaryConfig.maxDeviation}mm）`,
                boundary
            };
        } else {
            return {
                id: m.id,
                normal: true,
                message: `位置正常，偏差 ${m.deviation.toFixed(1)}mm，所有字段合规`,
                boundary
            };
        }
    });
}

function renderPointCloud() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
    
    const bx1 = (state.boundaryConfig.minX / 200) * width * 0.8 + width * 0.1;
    const by1 = (state.boundaryConfig.minY / 120) * height * 0.8 + height * 0.1;
    const bx2 = (state.boundaryConfig.maxX / 200) * width * 0.8 + width * 0.1;
    const by2 = (state.boundaryConfig.maxY / 120) * height * 0.8 + height * 0.1;
    
    ctx.fillStyle = 'rgba(82, 196, 26, 0.08)';
    ctx.fillRect(bx1, by1, bx2 - bx1, by2 - by1);
    ctx.strokeStyle = '#52c41a';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#8c8c8c';
    ctx.font = '11px sans-serif';
    ctx.fillText('安全边界范围', bx1 + 4, by1 + 14);
    
    state.measurements.forEach((m, index) => {
        const x = (m.x / 200) * width * 0.8 + width * 0.1;
        const y = (m.y / 120) * height * 0.8 + height * 0.1;
        const isSelected = state.selectedMeasurement === index;
        const radius = isSelected ? 9 : 6;
        
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(24, 144, 255, 0.25)' : 'rgba(0,0,0,0)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (m.status === 'error') {
            ctx.fillStyle = '#ff4d4f';
        } else if (m.status === 'warning') {
            ctx.fillStyle = '#faad14';
        } else {
            ctx.fillStyle = '#52c41a';
        }
        ctx.fill();
        
        if (isSelected) {
            ctx.strokeStyle = '#1890ff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        
        ctx.fillStyle = '#262626';
        ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.id, x, y + radius + 14);
    });
}

function highlightCollisionPoint() {
    renderPointCloud();
}

function showComparison(oldData, newData, changedField) {
    const section = document.getElementById('comparison-section');
    section.style.display = 'block';
    
    const formatMeasurement = (m) => {
        if (!m) return '<div style="color:#bfbfbf">无数据</div>';
        return `
            <div class="compare-data-row"><span class="compare-label">编号:</span><span class="compare-value">${m.id}</span></div>
            <div class="compare-data-row"><span class="compare-label">断面:</span><span class="compare-value">${m.section || '-'}</span></div>
            <div class="compare-data-row"><span class="compare-label">时间:</span><span class="compare-value">${m.timestamp || '-'}</span></div>
            <div class="compare-data-row"><span class="compare-label">X:</span><span class="compare-value ${changedField === 'x' ? 'changed-field' : ''}">${m.x.toFixed(2)}</span></div>
            <div class="compare-data-row"><span class="compare-label">Y:</span><span class="compare-value ${changedField === 'y' ? 'changed-field' : ''}">${m.y.toFixed(2)}</span></div>
            <div class="compare-data-row"><span class="compare-label">Z:</span><span class="compare-value ${changedField === 'z' ? 'changed-field' : ''}">${m.z.toFixed(2)}</span></div>
            <div class="compare-data-row"><span class="compare-label">水位:</span><span class="compare-value ${changedField === 'waterLevel' ? 'changed-field' : ''}">${m.waterLevel === null ? '缺失' : m.waterLevel.toFixed(2) + 'm'}</span></div>
            <div class="compare-data-row"><span class="compare-label">流量:</span><span class="compare-value ${changedField === 'flowRate' ? 'changed-field' : ''}">${m.flowRate === null ? '缺失' : m.flowRate.toFixed(1)}</span></div>
            <div class="compare-data-row"><span class="compare-label">偏差:</span><span class="compare-value ${changedField === 'deviation' ? 'changed-field' : ''}">${m.deviation.toFixed(1)}mm</span></div>
            <div class="compare-data-row"><span class="compare-label">状态:</span><span class="compare-value status-${m.status} ${changedField === 'status' ? 'changed-field' : ''}" style="padding:2px 8px;border-radius:4px;">${m.status === 'normal' ? '正常' : m.status === 'warning' ? '警告' : '异常'}</span></div>
            ${m.note ? `<div class="compare-data-row"><span class="compare-label">备注:</span><span class="compare-value">${m.note}</span></div>` : ''}
        `;
    };
    
    document.getElementById('old-conclusion').innerHTML = formatMeasurement(oldData);
    document.getElementById('new-conclusion').innerHTML = formatMeasurement(newData);
    
    const impactHint = document.createElement('div');
    impactHint.className = 'impact-hint';
    impactHint.innerHTML = `💡 影响范围：碰撞检测结论已同步更新，可切换至"对比视图"查看前后变化`;
    const comparisonContainer = document.querySelector('.comparison-container');
    if (!document.querySelector('.impact-hint')) {
        comparisonContainer.appendChild(impactHint);
    }
}

function showSettlement() {
    const modal = document.getElementById('settlement-modal');
    const body = document.getElementById('settlement-body');
    
    const normalCount = state.measurements.filter(m => m.status === 'normal').length;
    const warningCount = state.measurements.filter(m => m.status === 'warning').length;
    const errorCount = state.measurements.filter(m => m.status === 'error').length;
    const totalCount = state.measurements.length;
    const passRate = totalCount > 0 ? ((normalCount / totalCount) * 100).toFixed(1) : '0.0';
    
    const errorList = state.measurements.filter(m => m.status !== 'normal').map(m => `
        <tr>
            <td>${m.id}</td>
            <td>${m.section || '-'}</td>
            <td>${m.status === 'warning' ? '<span class="status-warning" style="padding:2px 8px;border-radius:4px;background:#fffbe6;color:#faad14;border:1px solid #ffe58f;">警告</span>' : '<span class="status-error" style="padding:2px 8px;border-radius:4px;background:#fff1f0;color:#ff4d4f;border:1px solid #ffa39e;">异常</span>'}</td>
            <td>${(m.tags || []).join('、') || '-'}</td>
            <td style="color:#595959;font-size:12px;">${m.note || '-'}</td>
        </tr>
    `).join('');
    
    body.innerHTML = `
        <div class="settlement-header-info">
            <div class="settlement-title">训练集嵌入空间巡检 · 结算报告</div>
            <div class="settlement-meta">
                <span>巡检日期：2026-06-09</span>
                <span>巡检人员：水利工程师</span>
                <span>数据范围：A标段堤防监测（6月上旬）</span>
            </div>
        </div>
        
        <div class="settlement-stat">
            <div class="stat-card green">
                <div class="stat-value">${normalCount}</div>
                <div class="stat-label">正常点</div>
                <div class="stat-sub">${totalCount > 0 ? ((normalCount/totalCount)*100).toFixed(0) : 0}%</div>
            </div>
            <div class="stat-card orange">
                <div class="stat-value">${warningCount}</div>
                <div class="stat-label">警告点</div>
                <div class="stat-sub">${totalCount > 0 ? ((warningCount/totalCount)*100).toFixed(0) : 0}%</div>
            </div>
            <div class="stat-card red">
                <div class="stat-value">${errorCount}</div>
                <div class="stat-label">异常点</div>
                <div class="stat-sub">${totalCount > 0 ? ((errorCount/totalCount)*100).toFixed(0) : 0}%</div>
            </div>
            <div class="stat-card blue">
                <div class="stat-value">${passRate}%</div>
                <div class="stat-label">通过率</div>
                <div class="stat-sub">共 ${totalCount} 条</div>
            </div>
        </div>
        
        <div class="settlement-details">
            <h4>🔧 巡检操作记录</h4>
            <div class="settlement-item">
                <span>重复运行次数</span>
                <span class="settlement-val">${state.stats.rerunCount} 次</span>
            </div>
            <div class="settlement-item">
                <span>数据补录次数</span>
                <span class="settlement-val">${state.stats.supplementCount} 次</span>
            </div>
            <div class="settlement-item">
                <span>人工确认次数</span>
                <span class="settlement-val">${state.stats.confirmCount} 次</span>
            </div>
            <div class="settlement-item">
                <span>撤销/重开操作</span>
                <span class="settlement-val">${state.history.length > 0 ? '已执行，历史记录保留' : '未使用'}</span>
            </div>
            <div class="settlement-item">
                <span>新旧结论对比</span>
                <span class="settlement-val">${state.hasModification ? '已生成，差异已标注' : '无修改'}</span>
            </div>
        </div>
        
        <div class="settlement-details" style="margin-top:16px;">
            <h4>⚠️ 问题清单（${warningCount + errorCount} 项）</h4>
            <div class="settlement-table-wrap">
                <table class="settlement-table">
                    <thead>
                        <tr>
                            <th>编号</th>
                            <th>断面</th>
                            <th>状态</th>
                            <th>问题标签</th>
                            <th>说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${errorList || '<tr><td colspan="5" style="text-align:center;color:#8c8c8c;">暂无问题</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="settlement-conclusion">
            <h4>📋 巡检结论</h4>
            <div class="conclusion-text">
                ${passRate >= 80 ? 
                    `本次巡检共检查 ${totalCount} 条测量记录，通过率 ${passRate}%。发现异常 ${errorCount} 处、警告 ${warningCount} 处，主要问题涉及边界越界、重复编号、数据缺失、时间戳格式异常等。建议对异常数据进行复核或重测，对警告数据加密观测。` :
                    `本次巡检通过率 ${passRate}%，数据质量存在较多问题，需要重点处理 ${errorCount} 处异常数据。建议对训练集进行全面清洗后重新提交巡检。`
                }
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function setupEventListeners() {
    document.getElementById('re-run-btn').addEventListener('click', () => {
        saveHistory();
        state.stats.rerunCount++;
        renderStats();
        
        state.measurements.forEach(m => {
            if (m.id === 'P-003') {
                m.deviation = 15.7 + (Math.random() - 0.5) * 3;
            }
        });
        
        const beforeMeasurements = JSON.parse(JSON.stringify(state.measurements));
        
        state.collisionData.after = generateCollisionData(state.measurements);
        state.hasModification = true;
        renderMeasurements();
        renderCollisionData();
        renderPointCloud();
        
        showComparison(
            { ...sampleMeasurements.find(s => s.id === 'P-003') },
            state.measurements.find(m => m.id === 'P-003'),
            'deviation'
        );
        
        showToast('已重新运行检测算法，偏差值已微调');
    });
    
    document.getElementById('add-record-btn').addEventListener('click', () => {
        document.getElementById('add-record-modal').classList.add('show');
    });
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        const status = document.getElementById('status-select').value;
        const opinion = document.getElementById('opinion-text').value;
        
        if (state.selectedMeasurement === null) {
            showToast('请先从左侧选择一条测量记录', 'warning');
            return;
        }
        if (!status) {
            showToast('请选择状态判断', 'warning');
            return;
        }
        if (!opinion.trim()) {
            showToast('请填写处理意见', 'warning');
            return;
        }
        
        saveHistory();
        state.stats.confirmCount++;
        renderStats();
        
        const targetIdx = state.selectedMeasurement;
        const oldData = JSON.parse(JSON.stringify(state.measurements[targetIdx]));
        state.measurements[targetIdx].status = status;
        if (!state.measurements[targetIdx].note) {
            state.measurements[targetIdx].note = opinion;
        }
        state.collisionData.after = generateCollisionData(state.measurements);
        state.hasModification = true;
        renderMeasurements();
        renderCollisionData();
        renderPointCloud();
        
        showComparison(oldData, state.measurements[targetIdx], 'status');
        showToast(`已人工确认：${state.measurements[targetIdx].id}`);
        
        if (state.currentLevel < 3) {
            setTimeout(() => {
                if (confirm(`已完成 ${levels[state.currentLevel - 1].title}，是否进入下一关卡？`)) {
                    loadLevel(state.currentLevel + 1);
                }
            }, 600);
        }
    });
    
    document.getElementById('undo-btn').addEventListener('click', () => {
        if (state.history.length === 0) {
            showToast('没有可撤销的操作', 'warning');
            return;
        }
        const prev = state.history.pop();
        state.measurements = prev.measurements;
        state.collisionData.after = prev.collisionData;
        state.hasModification = prev.hasModification;
        renderMeasurements();
        renderCollisionData();
        renderPointCloud();
        document.getElementById('comparison-section').style.display = 'none';
        showToast('已撤销上一步操作');
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
        if (state.history.length > 0 || state.hasModification) {
            if (!confirm('确定要重开当前关卡吗？当前所有修改将丢失。')) {
                return;
            }
        }
        loadLevel(state.currentLevel);
        showToast(`已重开关卡 ${state.currentLevel}`);
    });
    
    document.getElementById('prev-slice').addEventListener('click', () => {
        state.currentSlice = (state.currentSlice - 1 + state.totalSlices) % state.totalSlices;
        document.getElementById('slice-index').textContent = `切片 ${state.currentSlice + 1}/${state.totalSlices}`;
        renderPointCloud();
    });
    
    document.getElementById('next-slice').addEventListener('click', () => {
        state.currentSlice = (state.currentSlice + 1) % state.totalSlices;
        document.getElementById('slice-index').textContent = `切片 ${state.currentSlice + 1}/${state.totalSlices}`;
        renderPointCloud();
    });
    
    document.querySelectorAll('input[name="collision-view"]').forEach(radio => {
        radio.addEventListener('change', renderCollisionData);
    });
    
    document.getElementById('help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').classList.add('show');
    });
    
    document.getElementById('close-help').addEventListener('click', () => {
        document.getElementById('help-modal').classList.remove('show');
    });
    
    document.getElementById('cancel-add-btn').addEventListener('click', () => {
        document.getElementById('add-record-modal').classList.remove('show');
    });
    
    document.getElementById('close-add-record').addEventListener('click', () => {
        document.getElementById('add-record-modal').classList.remove('show');
    });
    
    document.getElementById('save-add-btn').addEventListener('click', () => {
        const id = document.getElementById('new-record-id').value.trim();
        const x = parseFloat(document.getElementById('new-record-x').value);
        const y = parseFloat(document.getElementById('new-record-y').value);
        const z = parseFloat(document.getElementById('new-record-z').value);
        const deviation = parseFloat(document.getElementById('new-record-deviation').value);
        const waterLevel = parseFloat(document.getElementById('new-record-waterlevel').value);
        const flowRate = parseFloat(document.getElementById('new-record-flowrate').value);
        
        if (!id) { showToast('请填写测量点编号', 'warning'); return; }
        if (isNaN(x) || isNaN(y) || isNaN(z)) { showToast('请填写正确的坐标值', 'warning'); return; }
        if (isNaN(deviation)) { showToast('请填写偏差值', 'warning'); return; }
        
        saveHistory();
        state.stats.supplementCount++;
        renderStats();
        
        const newMeasurement = {
            id,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            section: 'A-47',
            x, y, z,
            waterLevel: isNaN(waterLevel) ? null : waterLevel,
            flowRate: isNaN(flowRate) ? null : flowRate,
            deviation,
            status: deviation > state.boundaryConfig.maxDeviation ? 'error' : 
                   (x < state.boundaryConfig.minX || x > state.boundaryConfig.maxX ||
                    y < state.boundaryConfig.minY || y > state.boundaryConfig.maxY ||
                    z < state.boundaryConfig.minZ || z > state.boundaryConfig.maxZ) ? 'warning' : 'normal',
            note: `补录数据，来源：第47号断面遗漏补充`,
            tags: ['补录', '新录入']
        };
        
        const oldLen = state.measurements.length;
        state.measurements.push(newMeasurement);
        state.collisionData.after = generateCollisionData(state.measurements);
        state.hasModification = true;
        renderMeasurements();
        renderCollisionData();
        renderPointCloud();
        
        showComparison(
            { id: '(无)', status: 'normal', x: 0, y: 0, z: 0, deviation: 0, waterLevel: null, flowRate: null, note: '新增前不存在' },
            newMeasurement,
            null
        );
        
        document.getElementById('add-record-modal').classList.remove('show');
        ['new-record-id','new-record-x','new-record-y','new-record-z','new-record-deviation','new-record-waterlevel','new-record-flowrate'].forEach(id => {
            document.getElementById(id).value = '';
        });
        showToast(`已补录数据：${id}`);
    });
    
    document.getElementById('continue-btn').addEventListener('click', () => {
        document.getElementById('settlement-modal').classList.remove('show');
        loadLevel(1);
    });
    
    document.getElementById('export-btn').addEventListener('click', () => {
        showToast('巡检报告已导出为 PDF（模拟）');
    });
    
    window.addEventListener('resize', renderPointCloud);
}

function saveHistory() {
    state.history.push({
        measurements: JSON.parse(JSON.stringify(state.measurements)),
        collisionData: JSON.parse(JSON.stringify(state.collisionData.after)),
        hasModification: state.hasModification
    });
    if (state.history.length > 20) state.history.shift();
}

function showToast(msg, type = 'info') {
    let toast = document.getElementById('toast-container');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-container';
        document.body.appendChild(toast);
    }
    const item = document.createElement('div');
    item.className = `toast toast-${type}`;
    item.textContent = msg;
    toast.appendChild(item);
    setTimeout(() => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-20px)';
        setTimeout(() => item.remove(), 300);
    }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
