const app = {
    data: [],
    validatedData: [],
    anomalies: [],
    trendChart: null,
    histogramChart: null,

    init() {
        this.bindEvents();
        this.updateEmptyState();
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('loadSampleBtn').addEventListener('click', () => this.loadSampleData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());
        document.getElementById('calcBtn').addEventListener('click', () => this.calculateSingleCOP());
        document.getElementById('exportReportBtn').addEventListener('click', () => this.exportReport());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());

        document.querySelectorAll('.chart-controls input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateCharts());
        });

        document.getElementById('recordModal').addEventListener('click', (e) => {
            if (e.target.id === 'recordModal') this.closeModal();
        });
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        if (tabId === 'trend' && this.validatedData.length > 0) {
            setTimeout(() => this.updateCharts(), 100);
        }
    },

    loadSampleData() {
        this.data = JSON.parse(JSON.stringify(HeatPumpData.sampleData));
        this.processData();
        this.renderAll();
    },

    clearData() {
        if (confirm('确定要清空所有数据吗？')) {
            this.data = [];
            this.validatedData = [];
            this.anomalies = [];
            this.renderAll();
            this.updateEmptyState();
        }
    },

    updateEmptyState() {
        document.getElementById('dataTableBody').innerHTML = `
            <tr><td colspan="9" class="empty-hint">请点击"加载样例数据"按钮开始</td></tr>
        `;
        document.getElementById('reportSummary').innerHTML = `
            <p class="empty-hint">请先加载或导入数据以生成检查报告</p>
        `;
        document.getElementById('anomalyList').innerHTML = `
            <p class="empty-hint">暂无异常数据</p>
        `;
        document.getElementById('historyList').innerHTML = `
            <p class="empty-hint">请先加载数据以查看历史追溯信息</p>
        `;

        document.getElementById('totalRecords').textContent = '0';
        document.getElementById('missingFieldRecords').textContent = '0';
        document.getElementById('powerSignError').textContent = '0';
        document.getElementById('defrostMissed').textContent = '0';
        document.getElementById('lateEntries').textContent = '0';
        document.getElementById('avgCOP').textContent = '-';
    },

    processData() {
        this.validatedData = this.data.map(record => this.validateRecord(record));
        this.anomalies = this.collectAnomalies();
    },

    validateRecord(record) {
        const config = HeatPumpData.config;
        const validation = {
            missingFields: [],
            anomalies: [],
            cop: null,
            copStatus: null,
            status: 'normal'
        };

        if (record.tempIn === null || record.tempIn === undefined) {
            validation.missingFields.push('tempIn');
            validation.anomalies.push('MISSING_FIELD');
        }
        if (record.tempOut === null || record.tempOut === undefined) {
            validation.missingFields.push('tempOut');
            validation.anomalies.push('MISSING_FIELD');
        }
        if (record.deltaT === null || record.deltaT === undefined) {
            if (record.tempIn !== null && record.tempOut !== null) {
                record.deltaT = Math.abs(record.tempOut - record.tempIn);
            } else {
                validation.missingFields.push('deltaT');
            }
        }
        if (record.power === null || record.power === undefined) {
            validation.missingFields.push('power');
            validation.anomalies.push('MISSING_FIELD');
        }
        if (record.defrostFlag === null || record.defrostFlag === undefined) {
            validation.missingFields.push('defrostFlag');
            validation.anomalies.push('MISSING_FIELD');
        }

        if (record.power !== null && record.power !== undefined) {
            if (record.power < 0) {
                validation.anomalies.push('POWER_SIGN_ERROR');
                validation.status = 'error';
            } else if (record.power < config.ratedPowerRange[0] || record.power > config.ratedPowerRange[1]) {
                validation.anomalies.push('POWER_ABNORMAL');
            }
        }

        if (record.deltaT !== null && record.deltaT !== undefined && 
            record.power !== null && record.power !== undefined && record.power > 0) {
            if (record.deltaT < config.defrostDeltaTThreshold && !record.defrostFlag) {
                validation.anomalies.push('DEFROST_MISSED');
                validation.status = 'error';
                record.suspectedDefrost = true;
            }
        }

        if (record.isLateEntry) {
            validation.anomalies.push('LATE_ENTRY');
        }

        if (record.deltaT !== null && record.deltaT !== undefined && 
            record.power !== null && record.power !== undefined && record.power > 0 &&
            !validation.anomalies.includes('POWER_SIGN_ERROR')) {
            
            validation.cop = (config.waterFlow * 1.163 * record.deltaT) / record.power;
            
            if (validation.cop < 1.5 || validation.cop > 7.0) {
                validation.copStatus = 'anomaly';
                validation.anomalies.push('COP_ANOMALY');
                if (validation.status !== 'error') validation.status = 'warning';
            } else if (validation.cop < config.copNormalRange[0]) {
                validation.copStatus = 'low';
                validation.anomalies.push('COP_LOW');
                if (validation.status !== 'error') validation.status = 'warning';
            } else if (validation.cop > config.copNormalRange[1]) {
                validation.copStatus = 'high';
                validation.anomalies.push('COP_HIGH');
                if (validation.status !== 'error') validation.status = 'warning';
            } else {
                validation.copStatus = 'normal';
            }
        }

        if (record.tempIn !== null && record.tempIn !== undefined && 
            (record.tempIn < 0 || record.tempIn > 80)) {
            validation.anomalies.push('TEMP_ABNORMAL');
        }
        if (record.tempOut !== null && record.tempOut !== undefined && 
            (record.tempOut < 0 || record.tempOut > 100)) {
            validation.anomalies.push('TEMP_ABNORMAL');
        }

        record.validation = validation;
        return record;
    },

    collectAnomalies() {
        const anomalies = [];
        this.validatedData.forEach(record => {
            if (record.validation.anomalies.length > 0) {
                record.validation.anomalies.forEach(anomalyCode => {
                    const anomalyType = HeatPumpData.anomalyTypes[anomalyCode];
                    if (anomalyType) {
                        anomalies.push({
                            recordId: record.id,
                            timestamp: record.timestamp,
                            type: anomalyType,
                            record: record,
                            traceInfo: this.getTraceInfo(record, anomalyCode)
                        });
                    }
                });
            }
        });
        return anomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getTraceInfo(record, anomalyCode) {
        const traces = [];
        
        if (anomalyCode === 'MISSING_FIELD') {
            const missing = record.validation.missingFields;
            traces.push(`缺失字段: ${missing.map(f => this.getFieldName(f)).join(', ')}`);
        }
        
        if (anomalyCode === 'POWER_SIGN_ERROR') {
            traces.push(`功率值: ${record.power} kW (应为正值)`);
            traces.push(`检查来源: ${record.source}`);
        }
        
        if (anomalyCode === 'DEFROST_MISSED') {
            traces.push(`温差: ${record.deltaT}℃ (阈值: ${HeatPumpData.config.defrostDeltaTThreshold}℃)`);
            traces.push(`功率: ${record.power} kW (正常范围)`);
            traces.push(`除霜标记: ${record.defrostFlag ? '是' : '否'}`);
            traces.push(`判定逻辑: 温差<${HeatPumpData.config.defrostDeltaTThreshold}℃且功率正常，但未标记除霜`);
        }
        
        if (anomalyCode === 'LATE_ENTRY') {
            traces.push(`采集时间: ${record.timestamp}`);
            traces.push(`记录创建时间: ${record.recordCreatedAt}`);
            const diff = this.getTimeDiff(record.timestamp, record.recordCreatedAt);
            traces.push(`延迟时间: ${diff}`);
        }
        
        if (anomalyCode === 'COP_LOW' || anomalyCode === 'COP_HIGH' || anomalyCode === 'COP_ANOMALY') {
            traces.push(`计算COP: ${record.validation.cop?.toFixed(3)}`);
            traces.push(`正常范围: ${HeatPumpData.config.copNormalRange[0]} ~ ${HeatPumpData.config.copNormalRange[1]}`);
            traces.push(`温差: ${record.deltaT}℃, 功率: ${record.power} kW`);
            traces.push(`计算公式: COP = (${HeatPumpData.config.waterFlow} × 1.163 × ${record.deltaT}) / ${record.power}`);
        }

        if (record.history && record.history.length > 1) {
            traces.push(`该记录有 ${record.history.length} 条历史修改记录`);
        }

        return traces;
    },

    getFieldName(field) {
        const names = {
            tempIn: '进水温度',
            tempOut: '出水温度',
            deltaT: '温差',
            power: '功率',
            defrostFlag: '除霜标记'
        };
        return names[field] || field;
    },

    getTimeDiff(time1, time2) {
        const diff = Math.abs(new Date(time2) - new Date(time1));
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}小时${mins}分钟`;
    },

    renderAll() {
        this.renderOverview();
        this.renderDataTable();
        this.renderInspectionReport();
        this.renderAnomalyList();
        this.renderHistoryList();
        if (document.getElementById('trend').classList.contains('active')) {
            this.updateCharts();
        }
    },

    renderOverview() {
        const stats = this.getStatistics();
        
        document.getElementById('totalRecords').textContent = stats.total;
        document.getElementById('missingFieldRecords').textContent = stats.missingFields;
        document.getElementById('powerSignError').textContent = stats.powerSignError;
        document.getElementById('defrostMissed').textContent = stats.defrostMissed;
        document.getElementById('lateEntries').textContent = stats.lateEntries;
        document.getElementById('avgCOP').textContent = stats.avgCOP !== null ? stats.avgCOP.toFixed(2) : '-';
    },

    getStatistics() {
        const stats = {
            total: this.validatedData.length,
            missingFields: 0,
            powerSignError: 0,
            defrostMissed: 0,
            lateEntries: 0,
            avgCOP: null,
            copValues: []
        };

        this.validatedData.forEach(record => {
            if (record.validation.anomalies.includes('MISSING_FIELD')) stats.missingFields++;
            if (record.validation.anomalies.includes('POWER_SIGN_ERROR')) stats.powerSignError++;
            if (record.validation.anomalies.includes('DEFROST_MISSED')) stats.defrostMissed++;
            if (record.validation.anomalies.includes('LATE_ENTRY')) stats.lateEntries++;
            if (record.validation.cop !== null && record.validation.copStatus !== 'anomaly') {
                stats.copValues.push(record.validation.cop);
            }
        });

        if (stats.copValues.length > 0) {
            stats.avgCOP = stats.copValues.reduce((a, b) => a + b, 0) / stats.copValues.length;
        }

        return stats;
    },

    renderDataTable() {
        const tbody = document.getElementById('dataTableBody');
        tbody.innerHTML = '';

        this.validatedData.forEach(record => {
            const tr = document.createElement('tr');
            
            if (record.validation.status === 'error') tr.classList.add('anomaly');
            else if (record.validation.status === 'warning') tr.classList.add('warning');
            if (record.defrostFlag || record.suspectedDefrost) tr.classList.add('defrost');
            if (record.isLateEntry) tr.classList.add('late');

            const timeStr = record.timestamp.split(' ')[1];
            
            const flags = [];
            if (record.isLateEntry) flags.push('<span class="flag flag-late">晚补</span>');
            if (record.history && record.history.length > 1) flags.push('<span class="flag flag-modified">已改</span>');
            if (record.suspectedDefrost) flags.push('<span class="flag flag-missed-defrost">漏标</span>');
            if (record.validation.anomalies.includes('MISSING_FIELD')) flags.push('<span class="flag flag-missing">缺字段</span>');

            const copDisplay = record.validation.cop !== null ? record.validation.cop.toFixed(3) : '-';
            const statusClass = this.getStatusClass(record);
            const statusText = this.getStatusText(record);

            tr.innerHTML = `
                <td>${timeStr}<br>${flags.join('')}</td>
                <td>${record.tempIn !== null ? record.tempIn.toFixed(1) : '<span style="color:#ff4d4f">缺失</span>'}</td>
                <td>${record.tempOut !== null ? record.tempOut.toFixed(1) : '<span style="color:#ff4d4f">缺失</span>'}</td>
                <td>${record.deltaT !== null ? record.deltaT.toFixed(1) : '<span style="color:#ff4d4f">缺失</span>'}</td>
                <td class="${record.power < 0 ? 'detail-value danger' : ''}">${record.power !== null ? record.power.toFixed(1) : '<span style="color:#ff4d4f">缺失</span>'}</td>
                <td>${record.defrostFlag ? '<span class="status-tag status-defrost">除霜中</span>' : (record.suspectedDefrost ? '<span class="status-tag status-anomaly">漏标</span>' : '正常')}</td>
                <td>${copDisplay}</td>
                <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                <td><button class="btn btn-small btn-primary" onclick="app.showRecordDetail('${record.id}')">详情</button></td>
            `;

            tbody.appendChild(tr);
        });
    },

    getStatusClass(record) {
        if (record.defrostFlag) return 'status-defrost';
        if (record.validation.anomalies.includes('POWER_SIGN_ERROR')) return 'status-power-error';
        if (record.validation.anomalies.includes('MISSING_FIELD')) return 'status-missing';
        if (record.validation.copStatus === 'anomaly') return 'status-anomaly';
        if (record.validation.copStatus === 'low') return 'status-low';
        if (record.validation.copStatus === 'high') return 'status-high';
        return 'status-normal';
    },

    getStatusText(record) {
        if (record.defrostFlag) return '除霜';
        if (record.suspectedDefrost) return '除霜漏标';
        if (record.validation.anomalies.includes('POWER_SIGN_ERROR')) return '功率反号';
        if (record.validation.anomalies.includes('MISSING_FIELD')) return '字段缺失';
        if (record.validation.copStatus === 'anomaly') return 'COP异常';
        if (record.validation.copStatus === 'low') return 'COP偏低';
        if (record.validation.copStatus === 'high') return 'COP偏高';
        return '正常';
    },

    showRecordDetail(recordId) {
        const record = this.validatedData.find(r => r.id === recordId);
        if (!record) return;

        document.getElementById('modalTitle').textContent = `记录详情 - ${record.id}`;
        
        const copDisplay = record.validation.cop !== null ? record.validation.cop.toFixed(3) : '无法计算';
        const copClass = record.validation.copStatus === 'normal' ? 'success' : 
                        (record.validation.copStatus === 'anomaly' ? 'danger' : 'warning');

        let anomaliesHtml = '';
        if (record.validation.anomalies.length > 0) {
            anomaliesHtml = '<div class="report-section"><h4>检测到的异常</h4>';
            record.validation.anomalies.forEach(code => {
                const type = HeatPumpData.anomalyTypes[code];
                if (type) {
                    anomaliesHtml += `
                        <div class="report-item">
                            <span class="report-label">${type.name}</span>
                            <span class="report-value ${type.level === 'danger' ? 'danger' : type.level === 'warning' ? 'warning' : ''}">${type.description}</span>
                        </div>
                    `;
                }
            });
            anomaliesHtml += '</div>';
        }

        let historyHtml = '';
        if (record.history && record.history.length > 0) {
            historyHtml = '<div class="report-section"><h4>历史追溯</h4>';
            record.history.forEach((h, idx) => {
                historyHtml += `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-time">${h.timestamp} · ${h.operator}</div>
                            <div class="timeline-action">${h.action}</div>
                            ${h.changes ? this.renderChanges(h.changes) : ''}
                        </div>
                    </div>
                `;
            });
            historyHtml += '</div>';
        }

        document.getElementById('modalBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">采集时间</div>
                    <div class="detail-value">${record.timestamp}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">记录创建时间</div>
                    <div class="detail-value">${record.recordCreatedAt}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">进水温度</div>
                    <div class="detail-value">${record.tempIn !== null ? record.tempIn.toFixed(1) + '℃' : '缺失'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">出水温度</div>
                    <div class="detail-value">${record.tempOut !== null ? record.tempOut.toFixed(1) + '℃' : '缺失'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">温差</div>
                    <div class="detail-value">${record.deltaT !== null ? record.deltaT.toFixed(1) + '℃' : '缺失'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">功率</div>
                    <div class="detail-value ${record.power < 0 ? 'danger' : ''}">${record.power !== null ? record.power.toFixed(1) + ' kW' : '缺失'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">COP</div>
                    <div class="detail-value ${copClass}">${copDisplay}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">除霜状态</div>
                    <div class="detail-value">${record.defrostFlag ? '除霜中' : (record.suspectedDefrost ? '<span class="danger">疑似漏标</span>' : '正常')}</div>
                </div>
            </div>
            
            <div class="report-section">
                <h4>备注</h4>
                <p style="font-size:14px; color:#666;">${record.remark || '无'}</p>
            </div>
            
            <div class="report-section">
                <h4>数据来源</h4>
                <p style="font-size:14px; color:#666;">
                    ${record.source}
                    ${record.isLateEntry ? ' <span class="flag flag-late">晚补数据</span>' : ''}
                    ${record.history && record.history.length > 1 ? ' <span class="flag flag-modified">已修改</span>' : ''}
                </p>
            </div>
            
            ${anomaliesHtml}
            ${historyHtml}
        `;

        document.getElementById('recordModal').classList.add('show');
    },

    renderChanges(changes) {
        let html = '<div style="margin-top:8px; padding:8px; background:#f8f9fa; border-radius:6px; font-size:12px;">';
        for (const [field, change] of Object.entries(changes)) {
            const fieldName = this.getFieldName(field);
            const oldVal = change.old !== null && change.old !== undefined ? 
                (typeof change.old === 'number' ? change.old.toFixed(1) : change.old) : '空';
            const newVal = change.new !== null && change.new !== undefined ? 
                (typeof change.new === 'number' ? change.new.toFixed(1) : change.new) : '空';
            html += `<div>${fieldName}: <span class="timeline-old">${oldVal}</span> → <span class="timeline-new">${newVal}</span></div>`;
        }
        html += '</div>';
        return html;
    },

    closeModal() {
        document.getElementById('recordModal').classList.remove('show');
    },

    renderInspectionReport() {
        const stats = this.getStatistics();
        const validRecords = this.validatedData.filter(r => 
            !r.validation.anomalies.includes('MISSING_FIELD') && 
            !r.validation.anomalies.includes('POWER_SIGN_ERROR')
        );
        const normalRecords = validRecords.filter(r => r.validation.copStatus === 'normal');
        const dataQuality = this.validatedData.length > 0 ? 
            ((validRecords.length / this.validatedData.length) * 100).toFixed(1) : 0;

        const html = `
            <div class="report-section">
                <h4>数据概览</h4>
                <div class="report-item">
                    <span class="report-label">记录总数</span>
                    <span class="report-value">${stats.total} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">有效记录</span>
                    <span class="report-value ${validRecords.length < stats.total ? 'warning' : 'success'}">${validRecords.length} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">数据质量</span>
                    <span class="report-value ${dataQuality < 80 ? 'danger' : dataQuality < 95 ? 'warning' : 'success'}">${dataQuality}%</span>
                </div>
            </div>
            
            <div class="report-section">
                <h4>COP统计</h4>
                <div class="report-item">
                    <span class="report-label">平均COP</span>
                    <span class="report-value">${stats.avgCOP !== null ? stats.avgCOP.toFixed(3) : 'N/A'}</span>
                </div>
                <div class="report-item">
                    <span class="report-label">COP正常</span>
                    <span class="report-value success">${normalRecords.length} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">COP偏低</span>
                    <span class="report-value warning">${this.validatedData.filter(r => r.validation.copStatus === 'low').length} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">COP偏高</span>
                    <span class="report-value warning">${this.validatedData.filter(r => r.validation.copStatus === 'high').length} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">COP异常</span>
                    <span class="report-value danger">${this.validatedData.filter(r => r.validation.copStatus === 'anomaly').length} 条</span>
                </div>
            </div>
            
            <div class="report-section">
                <h4>异常检测</h4>
                <div class="report-item">
                    <span class="report-label">字段缺失</span>
                    <span class="report-value ${stats.missingFields > 0 ? 'danger' : 'success'}">${stats.missingFields} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">功率反号</span>
                    <span class="report-value ${stats.powerSignError > 0 ? 'danger' : 'success'}">${stats.powerSignError} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">除霜漏标</span>
                    <span class="report-value ${stats.defrostMissed > 0 ? 'danger' : 'success'}">${stats.defrostMissed} 条</span>
                </div>
                <div class="report-item">
                    <span class="report-label">晚补记录</span>
                    <span class="report-value ${stats.lateEntries > 0 ? 'warning' : 'success'}">${stats.lateEntries} 条</span>
                </div>
            </div>
            
            <div class="report-section">
                <h4>检查结论</h4>
                <p style="font-size:14px; color:#666; line-height:1.8;">
                    ${this.generateConclusion(stats, dataQuality)}
                </p>
            </div>
        `;

        document.getElementById('reportSummary').innerHTML = html;
    },

    generateConclusion(stats, dataQuality) {
        const issues = [];
        
        if (stats.powerSignError > 0) {
            issues.push(`发现 ${stats.powerSignError} 条功率反号记录，需立即检查传感器接线或数据采集程序`);
        }
        if (stats.defrostMissed > 0) {
            issues.push(`发现 ${stats.defrostMissed} 条除霜漏标记录，建议检查除霜控制逻辑或人工复核`);
        }
        if (stats.missingFields > 0) {
            issues.push(`${stats.missingFields} 条记录存在字段缺失，建议检查传感器通信状态`);
        }
        if (stats.lateEntries > 0) {
            issues.push(`${stats.lateEntries} 条为晚补数据，数据时效性可能受影响`);
        }
        if (dataQuality < 80) {
            issues.push(`整体数据质量较低（${dataQuality}%），建议排查数据采集系统`);
        }

        if (issues.length === 0) {
            return `本次检查共分析 ${stats.total} 条记录，数据质量 ${dataQuality}%，未发现严重异常。平均COP为 ${stats.avgCOP?.toFixed(3)}，处于正常范围。`;
        }

        return `本次检查共分析 ${stats.total} 条记录，发现以下问题：<br><br>${issues.map((issue, i) => `${i + 1}. ${issue}`).join('<br><br>')}`;
    },

    renderAnomalyList() {
        const container = document.getElementById('anomalyList');
        
        if (this.anomalies.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂无异常数据</p>';
            return;
        }

        container.innerHTML = this.anomalies.map(anomaly => `
            <div class="anomaly-item ${anomaly.type.level === 'warning' ? 'warning' : anomaly.type.level === 'info' ? 'info' : ''}">
                <div class="anomaly-header">
                    <span class="anomaly-time">${anomaly.recordId} · ${anomaly.timestamp}</span>
                    <span class="anomaly-type ${anomaly.type.level}">${anomaly.type.name}</span>
                </div>
                <div class="anomaly-details">
                    ${anomaly.type.description}
                    ${anomaly.record.remark ? `<br><strong>备注：</strong>${anomaly.record.remark}` : ''}
                </div>
                <div class="anomaly-trace">
                    <strong>追溯信息：</strong><br>
                    ${anomaly.traceInfo.map(t => `• ${t}`).join('<br>')}
                </div>
            </div>
        `).join('');
    },

    renderHistoryList() {
        const container = document.getElementById('historyList');
        
        if (this.validatedData.length === 0) {
            container.innerHTML = '<p class="empty-hint">请先加载数据以查看历史追溯信息</p>';
            return;
        }

        const recordsWithHistory = this.validatedData.filter(r => 
            r.isLateEntry || (r.history && r.history.length > 1) || r.suspectedDefrost
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (recordsWithHistory.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂无需要特别追溯的记录</p>';
            return;
        }

        container.innerHTML = recordsWithHistory.map(record => {
            let badgeType = '';
            let badgeText = '追溯';
            
            if (record.suspectedDefrost) {
                badgeType = 'defrost';
                badgeText = '除霜漏标';
            } else if (record.isLateEntry) {
                badgeType = 'late';
                badgeText = '晚补';
            } else if (record.history && record.history.length > 1) {
                badgeType = 'modified';
                badgeText = '已修改';
            }

            return `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-time">${record.id} · ${record.timestamp}</span>
                        <span class="history-badge ${badgeType}">${badgeText}</span>
                    </div>
                    <div class="history-details">
                        ${record.remark || '无备注'}
                    </div>
                    ${record.history && record.history.length > 0 ? `
                        <div class="history-timeline">
                            ${record.history.map((h, idx) => `
                                <div class="timeline-item">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-content">
                                        <div class="timeline-time">${h.timestamp} · ${h.operator}</div>
                                        <div class="timeline-action">${h.action}</div>
                                        ${h.changes ? this.renderChanges(h.changes) : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    calculateSingleCOP() {
        const tempIn = parseFloat(document.getElementById('calcTempIn').value);
        const tempOut = parseFloat(document.getElementById('calcTempOut').value);
        const power = parseFloat(document.getElementById('calcPower').value);

        const resultDiv = document.getElementById('calcResult');

        if (isNaN(tempIn) || isNaN(tempOut) || isNaN(power)) {
            resultDiv.innerHTML = '<p class="detail-value danger">请输入有效的数值</p>';
            return;
        }

        if (power <= 0) {
            resultDiv.innerHTML = `
                <p><span class="detail-value danger">错误：功率必须为正值</span></p>
                <p style="margin-top:8px; font-size:13px; color:#666;">
                    当前功率值：${power} kW，违反功率符号校验规则
                </p>
            `;
            return;
        }

        const deltaT = Math.abs(tempOut - tempIn);
        const config = HeatPumpData.config;
        const cop = (config.waterFlow * 1.163 * deltaT) / power;

        let statusClass = 'success';
        let statusText = '正常';

        if (deltaT < config.minDeltaT) {
            statusClass = 'warning';
            statusText = '温差偏小，可能处于除霜状态';
        } else if (cop < 1.5 || cop > 7.0) {
            statusClass = 'danger';
            statusText = 'COP异常';
        } else if (cop < config.copNormalRange[0]) {
            statusClass = 'warning';
            statusText = 'COP偏低';
        } else if (cop > config.copNormalRange[1]) {
            statusClass = 'warning';
            statusText = 'COP偏高';
        }

        resultDiv.innerHTML = `
            <p>计算结果：</p>
            <p class="result-value">COP = ${cop.toFixed(3)}</p>
            <p class="detail-value ${statusClass}">状态：${statusText}</p>
            <div style="margin-top:12px; padding-top:12px; border-top:1px solid #eee; font-size:13px; color:#666;">
                <p>温差：${deltaT.toFixed(1)} ℃</p>
                <p>计算公式：COP = (${config.waterFlow} × 1.163 × ${deltaT.toFixed(1)}) / ${power} = ${cop.toFixed(3)}</p>
                <p>正常范围：${config.copNormalRange[0]} ~ ${config.copNormalRange[1]}</p>
            </div>
        `;
    },

    updateCharts() {
        this.renderTrendChart();
        this.renderHistogramChart();
    },

    renderTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        const showCOP = document.getElementById('showCOP').checked;
        const showTemp = document.getElementById('showTemp').checked;
        const showPower = document.getElementById('showPower').checked;
        const showDefrost = document.getElementById('showDefrost').checked;
        const showAnomaly = document.getElementById('showAnomaly').checked;

        const labels = this.validatedData.map(r => r.timestamp.split(' ')[1]);
        
        const datasets = [];

        if (showCOP) {
            const copData = this.validatedData.map(r => 
                (r.validation.cop !== null && r.validation.copStatus !== 'anomaly') ? r.validation.cop : null
            );
            datasets.push({
                label: 'COP',
                data: copData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                yAxisID: 'y1',
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        if (showTemp) {
            const tempData = this.validatedData.map(r => r.deltaT !== null ? r.deltaT : null);
            datasets.push({
                label: '温差(℃)',
                data: tempData,
                borderColor: '#52c41a',
                backgroundColor: 'rgba(82, 196, 26, 0.1)',
                yAxisID: 'y2',
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        if (showPower) {
            const powerData = this.validatedData.map(r => r.power !== null && r.power > 0 ? r.power : null);
            datasets.push({
                label: '功率(kW)',
                data: powerData,
                borderColor: '#fa8c16',
                backgroundColor: 'rgba(250, 140, 22, 0.1)',
                yAxisID: 'y3',
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
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
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: (context) => {
                                const idx = context[0].dataIndex;
                                const record = this.validatedData[idx];
                                const lines = [];
                                if (record.defrostFlag) lines.push('【除霜中】');
                                if (record.suspectedDefrost) lines.push('【除霜漏标】');
                                if (record.isLateEntry) lines.push('【晚补数据】');
                                if (record.validation.anomalies.includes('POWER_SIGN_ERROR')) lines.push('【功率反号】');
                                if (record.remark) lines.push(`备注: ${record.remark}`);
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: showCOP,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'COP'
                        },
                        min: 0,
                        max: 8,
                        grid: {
                            drawOnChartArea: true
                        }
                    },
                    y2: {
                        type: 'linear',
                        display: showTemp,
                        position: 'right',
                        title: {
                            display: true,
                            text: '温差(℃)'
                        },
                        min: 0,
                        max: 15,
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    y3: {
                        type: 'linear',
                        display: showPower,
                        position: 'right',
                        title: {
                            display: true,
                            text: '功率(kW)'
                        },
                        min: 0,
                        max: 30,
                        grid: {
                            drawOnChartArea: false
                        },
                        offset: true
                    }
                }
            }
        });

        if (showDefrost || showAnomaly) {
            this.addChartAnnotations(showDefrost, showAnomaly);
        }
    },

    addChartAnnotations(showDefrost, showAnomaly) {
        const plugins = [];
        
        if (showDefrost) {
            this.validatedData.forEach((record, idx) => {
                if (record.defrostFlag || record.suspectedDefrost) {
                    plugins.push({
                        id: `defrost-${idx}`,
                        beforeDatasetsDraw: (chart) => {
                            const ctx = chart.ctx;
                            const xAxis = chart.scales.x;
                            const yAxis = chart.scales.y1;
                            const x = xAxis.getPixelForValue(idx);
                            const barWidth = xAxis.width / this.validatedData.length * 0.6;
                            
                            ctx.save();
                            ctx.fillStyle = record.suspectedDefrost ? 'rgba(255, 77, 79, 0.15)' : 'rgba(24, 144, 255, 0.15)';
                            ctx.fillRect(x - barWidth / 2, yAxis.top, barWidth, yAxis.bottom - yAxis.top);
                            ctx.restore();
                        }
                    });
                }
            });
        }

        if (showAnomaly) {
            this.validatedData.forEach((record, idx) => {
                if (record.validation.anomalies.includes('POWER_SIGN_ERROR')) {
                    plugins.push({
                        id: `anomaly-${idx}`,
                        beforeDatasetsDraw: (chart) => {
                            const ctx = chart.ctx;
                            const xAxis = chart.scales.x;
                            const yAxis = chart.scales.y1;
                            const x = xAxis.getPixelForValue(idx);
                            const barWidth = xAxis.width / this.validatedData.length * 0.8;
                            
                            ctx.save();
                            ctx.fillStyle = 'rgba(245, 34, 45, 0.2)';
                            ctx.fillRect(x - barWidth / 2, yAxis.top, barWidth, yAxis.bottom - yAxis.top);
                            ctx.restore();
                        }
                    });
                }
            });
        }

        if (plugins.length > 0 && this.trendChart) {
            plugins.forEach(p => Chart.register(p));
            this.trendChart.update();
        }
    },

    renderHistogramChart() {
        const ctx = document.getElementById('histogramChart').getContext('2d');
        
        const validCOP = this.validatedData
            .filter(r => r.validation.cop !== null && r.validation.copStatus !== 'anomaly')
            .map(r => r.validation.cop);

        const bins = [
            { min: 0, max: 1.5, label: '<1.5', count: 0, color: '#ff4d4f' },
            { min: 1.5, max: 2.5, label: '1.5-2.5', count: 0, color: '#fa8c16' },
            { min: 2.5, max: 3.5, label: '2.5-3.5', count: 0, color: '#52c41a' },
            { min: 3.5, max: 4.5, label: '3.5-4.5', count: 0, color: '#52c41a' },
            { min: 4.5, max: 5.5, label: '4.5-5.5', count: 0, color: '#52c41a' },
            { min: 5.5, max: 7.0, label: '5.5-7.0', count: 0, color: '#fa8c16' },
            { min: 7.0, max: 10, label: '>7.0', count: 0, color: '#ff4d4f' }
        ];

        validCOP.forEach(cop => {
            for (const bin of bins) {
                if (cop >= bin.min && cop < bin.max) {
                    bin.count++;
                    break;
                }
            }
        });

        if (this.histogramChart) {
            this.histogramChart.destroy();
        }

        this.histogramChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: bins.map(b => b.label),
                datasets: [{
                    label: '记录数量',
                    data: bins.map(b => b.count),
                    backgroundColor: bins.map(b => b.color + '80'),
                    borderColor: bins.map(b => b.color),
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: (context) => {
                                const idx = context[0].dataIndex;
                                const bin = bins[idx];
                                let status = '';
                                if (idx === 0 || idx === 6) status = '异常范围';
                                else if (idx === 1 || idx === 5) status = '边界范围';
                                else status = '正常范围';
                                return `COP范围: ${bin.min} ~ ${bin.max}\n状态: ${status}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'COP区间'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '记录数量'
                        },
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },

    exportReport() {
        const stats = this.getStatistics();
        const anomalies = this.anomalies;
        
        let report = `========================================\n`;
        report += `       热泵COP边界检查报告\n`;
        report += `========================================\n\n`;
        report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
        report += `数据时段: ${this.validatedData[0]?.timestamp || 'N/A'} ~ ${this.validatedData[this.validatedData.length - 1]?.timestamp || 'N/A'}\n\n`;
        
        report += `----------------------------------------\n`;
        report += `一、数据概览\n`;
        report += `----------------------------------------\n`;
        report += `记录总数: ${stats.total} 条\n`;
        report += `平均COP: ${stats.avgCOP !== null ? stats.avgCOP.toFixed(3) : 'N/A'}\n`;
        report += `字段缺失: ${stats.missingFields} 条\n`;
        report += `功率反号: ${stats.powerSignError} 条\n`;
        report += `除霜漏标: ${stats.defrostMissed} 条\n`;
        report += `晚补记录: ${stats.lateEntries} 条\n\n`;
        
        report += `----------------------------------------\n`;
        report += `二、异常明细\n`;
        report += `----------------------------------------\n\n`;
        
        if (anomalies.length === 0) {
            report += `未检测到异常。\n`;
        } else {
            anomalies.forEach((anomaly, idx) => {
                report += `${idx + 1}. [${anomaly.type.name}] ${anomaly.timestamp}\n`;
                report += `   记录ID: ${anomaly.recordId}\n`;
                report += `   描述: ${anomaly.type.description}\n`;
                report += `   追溯信息:\n`;
                anomaly.traceInfo.forEach(t => {
                    report += `     - ${t}\n`;
                });
                if (anomaly.record.remark) {
                    report += `   备注: ${anomaly.record.remark}\n`;
                }
                report += `\n`;
            });
        }
        
        report += `----------------------------------------\n`;
        report += `三、COP边界规则\n`;
        report += `----------------------------------------\n`;
        report += `正常范围: 2.5 ~ 5.5\n`;
        report += `偏低边界: 1.5 ~ 2.5\n`;
        report += `偏高边界: 5.5 ~ 7.0\n`;
        report += `异常范围: <1.5 或 >7.0\n`;
        report += `最小温差: 3℃\n`;
        report += `额定功率: 5 ~ 25 kW\n\n`;
        
        report += `----------------------------------------\n`;
        report += `四、计算公式\n`;
        report += `----------------------------------------\n`;
        report += `COP = (水流量 × 水比热容 × 温差) / 功率\n`;
        report += `简化公式: COP = (${HeatPumpData.config.waterFlow} × 1.163 × 温差) / 功率\n\n`;

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `热泵COP检查报告_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
