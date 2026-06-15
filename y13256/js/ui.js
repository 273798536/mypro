const UI = {
    currentTab: 'all',
    selectedRecordId: null,

    init() {
        this.setupEventListeners();
        this.updateCounts();
        this.renderRecordList();
    },

    setupEventListeners() {
        document.getElementById('btn-import').addEventListener('click', () => {
            this.showImportPanel();
        });

        document.getElementById('btn-close-import').addEventListener('click', () => {
            this.hideImportPanel();
        });

        document.getElementById('btn-close-detail').addEventListener('click', () => {
            this.hideDetailPanel();
        });

        document.getElementById('btn-close-screenshot').addEventListener('click', () => {
            this.hideScreenshotPanel();
        });

        document.getElementById('btn-do-import').addEventListener('click', async () => {
            await this.handleImport();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.getElementById('btn-export-screenshot').addEventListener('click', () => {
            if (this.selectedRecordId) {
                ScreenshotModule.renderScreenshot(this.selectedRecordId);
            } else {
                this.showToast('请先选择一条记录', 'warning');
            }
        });

        document.getElementById('btn-copy-screenshot').addEventListener('click', () => {
            ScreenshotModule.copyToClipboard();
        });

        document.getElementById('btn-download-screenshot').addEventListener('click', () => {
            ScreenshotModule.downloadScreenshot();
        });

        document.addEventListener('photosSaved', (e) => {
            this.renderRecordList();
            if (e.detail.recordId === this.selectedRecordId) {
                this.renderRecordDetail(e.detail.recordId);
            }
        });
    },

    showImportPanel() {
        document.getElementById('import-panel').classList.add('active');
        document.getElementById('record-detail').classList.remove('active');
        document.getElementById('screenshot-panel').classList.remove('active');
    },

    hideImportPanel() {
        document.getElementById('import-panel').classList.remove('active');
    },

    showDetailPanel() {
        document.getElementById('record-detail').classList.add('active');
        document.getElementById('import-panel').classList.remove('active');
        document.getElementById('screenshot-panel').classList.remove('active');
    },

    hideDetailPanel() {
        document.getElementById('record-detail').classList.remove('active');
        this.selectedRecordId = null;
        this.renderRecordList();
    },

    hideScreenshotPanel() {
        document.getElementById('screenshot-panel').classList.remove('active');
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.renderRecordList();
    },

    async handleImport() {
        const btn = document.getElementById('btn-do-import');
        btn.disabled = true;
        btn.textContent = '复核中...';

        try {
            const records = await ImportModule.processImport();
            if (records && records.length > 0) {
                this.showToast(`成功导入并复核${records.length}条记录`, 'success');
                this.hideImportPanel();
                this.updateCounts();
                this.renderRecordList();

                if (records.length > 0) {
                    this.selectedRecordId = records[0].id;
                    this.renderRecordDetail(records[0].id);
                }
            }
        } catch (e) {
            console.error('Import error:', e);
            this.showToast('导入失败：' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '开始复核';
        }
    },

    updateCounts() {
        const counts = DataStore.getCounts();
        document.getElementById('count-pending').textContent = counts.pending + counts.conflict;
        document.getElementById('count-manual').textContent = counts.manual;
        document.getElementById('count-done').textContent = counts.done;
    },

    renderRecordList() {
        const container = document.getElementById('record-list');
        const records = DataStore.getRecordsByStatus(this.currentTab);

        if (records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>暂无${this.getTabLabel(this.currentTab)}记录</h3>
                    <p>点击"导入材料"开始上传审批台账、正常记录和口头说明</p>
                </div>
            `;
            return;
        }

        let html = '';
        records.forEach(record => {
            const statusClass = OperationsModule.getStatusBadgeClass(record.status);
            const statusText = OperationsModule.getStatusText(record.status);
            const isActive = record.id === this.selectedRecordId;

            let alertHtml = '';
            if (record.hasConflict) {
                alertHtml = `<div class="record-alert record-conflict">⚠️ ${record.conflictNote || '存在版本冲突，需人工确认'}</div>`;
            } else if (record.hasModification) {
                alertHtml = `<div class="record-alert">📝 检测到口径变更记录</div>`;
            } else if (record.issues && record.issues.length > 0) {
                alertHtml = `<div class="record-alert">⚠️ ${record.issues[0]}</div>`;
            }

            html += `
                <div class="record-card ${isActive ? 'active' : ''}" data-id="${record.id}">
                    <div class="record-header">
                        <span class="record-title">${this.escapeHtml(record.schoolName)}</span>
                        <span class="record-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="record-meta">
                        <span>早高峰: ${record.morningCapacity !== null ? record.morningCapacity + '人' : '-'}</span>
                        <span>晚高峰: ${record.eveningCapacity !== null ? record.eveningCapacity + '人' : '-'}</span>
                        <span>日期: ${record.date || '-'}</span>
                    </div>
                    ${alertHtml}
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.record-card').forEach(card => {
            card.addEventListener('click', () => {
                const recordId = card.dataset.id;
                this.selectedRecordId = recordId;
                this.renderRecordList();
                this.renderRecordDetail(recordId);
            });
        });
    },

    renderRecordDetail(recordId) {
        const record = DataStore.getRecord(recordId);
        if (!record) return;

        this.showDetailPanel();
        document.getElementById('detail-title').textContent = record.schoolName;

        const content = document.getElementById('detail-content');
        const modifiedFields = VerifyModule.getModifiedFields(record);

        let html = '';

        html += `<div class="detail-section">
            <h3>复核数据</h3>
            <table class="data-table">
                <tr><th>学校名称</th><td>${this.escapeHtml(record.schoolName)}</td></tr>
                <tr><th>复核日期</th><td>${this.escapeHtml(record.date || '-')}</td></tr>
                <tr><th>数据来源</th><td>${record.primarySource === 'ledger' ? '审批台账' : '正常记录'} (${this.escapeHtml(record.sourceFile || '-')})</td></tr>
                <tr class="${modifiedFields.some(f => f.field === '早高峰容量') ? 'changed' : ''}">
                    <th>早高峰容量</th>
                    <td>${record.morningCapacity !== null ? record.morningCapacity + '人' : '-'}
                        ${modifiedFields.find(f => f.field === '早高峰容量') ?
                            ` <span class="diff-old">(${modifiedFields.find(f => f.field === '早高峰容量').oldValue})</span>
                              <span class="diff-new">→ ${modifiedFields.find(f => f.field === '早高峰容量').newValue}</span>` : ''}
                    </td>
                </tr>
                <tr class="${modifiedFields.some(f => f.field === '晚高峰容量') ? 'changed' : ''}">
                    <th>晚高峰容量</th>
                    <td>${record.eveningCapacity !== null ? record.eveningCapacity + '人' : '-'}
                        ${modifiedFields.find(f => f.field === '晚高峰容量') ?
                            ` <span class="diff-old">(${modifiedFields.find(f => f.field === '晚高峰容量').oldValue})</span>
                              <span class="diff-new">→ ${modifiedFields.find(f => f.field === '晚高峰容量').newValue}</span>` : ''}
                    </td>
                </tr>
                ${record.capacity ? `<tr><th>标称容量</th><td>${record.capacity}人</td></tr>` : ''}
                <tr class="${record.status === RecordStatus.CONFLICT ? 'conflict' : ''}">
                    <th>当前状态</th>
                    <td><span class="record-status ${OperationsModule.getStatusBadgeClass(record.status)}">
                        ${OperationsModule.getStatusText(record.status)}
                    </span></td>
                </tr>
            </table>
        </div>`;

        if (record.hasConflict) {
            html += `<div class="suspend-note">
                <h4>⚠️ 版本冲突</h4>
                <p>${this.escapeHtml(record.conflictNote || '检测到旧方案覆盖新意见，已自动挂起，不给出假稳定结论，请排班同事人工确认')}</p>
            </div>`;
        }

        if (record.issues && record.issues.length > 0) {
            html += `<div class="detail-section">
                <h3>检测到的问题</h3>
                <ul style="list-style: none; padding: 0;">
                    ${record.issues.map(issue =>
                        `<li style="padding: 8px 12px; background: #fffaf0; border-left: 3px solid #ed8936; margin-bottom: 8px; border-radius: 4px; font-size: 13px;">
                            ⚠️ ${this.escapeHtml(issue)}
                        </li>`
                    ).join('')}
                </ul>
            </div>`;
        }

        html += `<div class="detail-section">
            <h3>变更时间线</h3>
            <div class="change-timeline">
                ${record.changes.map(change => `
                    <div class="change-item ${change.type}">
                        <div class="change-header">
                            <strong>${this.escapeHtml(change.source)}</strong>
                            <span class="change-source">${this.formatTime(change.timestamp)}</span>
                        </div>
                        <div style="font-size: 13px; color: #4a5568; margin-bottom: 6px;">
                            ${this.escapeHtml(change.description)}
                        </div>
                        ${change.oldValue ? `
                        <div class="change-diff">
                            ${change.field}: 
                            <span class="diff-old">${this.escapeHtml(change.oldValue)}</span>
                            →
                            <span class="diff-new">${this.escapeHtml(change.newValue)}</span>
                        </div>
                        ` : ''}
                        ${change.location ? `
                        <div style="font-size: 12px; color: #718096; margin-top: 6px;">
                            📍 ${this.escapeHtml(change.location)}
                        </div>
                        ` : ''}
                        ${change.changeNote ? `
                        <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                            📝 ${this.escapeHtml(change.changeNote)}
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>`;

        if (record.photos && record.photos.length > 0) {
            html += `<div class="detail-section">
                <h3>现场照片（${record.photos.length}张）</h3>
                <div class="photo-preview">
                    ${record.photos.map(photo => `
                        <div class="photo-item" style="width: 100px; height: 100px;">
                            <img src="${photo.dataUrl}" alt="现场照片">
                        </div>
                    `).join('')}
                </div>
                ${record.photos.map(photo => `
                    <div style="font-size: 12px; color: #718096; margin-top: 8px;">
                        📍 ${this.escapeHtml(photo.location || '未标注位置')}
                        <br>📝 ${this.escapeHtml(photo.changeNote || '无说明')}
                    </div>
                `).join('')}
            </div>`;
        }

        if (record.notes && record.notes.length > 0) {
            html += `<div class="detail-section">
                <h3>人工备注</h3>
                ${record.notes.map(note => `
                    <div style="background: #f7fafc; padding: 12px; border-radius: 6px; margin-bottom: 8px; font-size: 13px;">
                        <div style="color: #718096; font-size: 12px; margin-bottom: 4px;">
                            ${this.formatTime(note.timestamp)}
                        </div>
                        ${this.escapeHtml(note.content || '-')}
                    </div>
                `).join('')}
            </div>`;
        }

        html += `<div class="detail-section">
            <h3>操作</h3>
            <div class="action-buttons">`;

        if (record.status === RecordStatus.CONFLICT) {
            html += `
                <button class="btn btn-sm btn-info" onclick="UI.showManualReview('${recordId}')">人工改判</button>
            `;
        } else {
            if (OperationsModule.canConfirm(record)) {
                html += `<button class="btn btn-sm btn-success" onclick="UI.confirmRecord('${recordId}')">确认无误</button>`;
            }
            if (OperationsModule.canRevert(record)) {
                html += `<button class="btn btn-sm btn-warning" onclick="UI.revertRecord('${recordId}')">撤回上一步</button>`;
            }
        }

        html += `
            <button class="btn btn-sm btn-primary" onclick="UI.showScreenshot('${recordId}')">截图说明</button>
            <button class="btn btn-sm btn-secondary" onclick="UI.suspendRecord('${recordId}')">挂起待确认</button>
        </div>
        </div>`;

        const photoContainerId = 'photo-upload-container-' + recordId;
        html += `<div id="${photoContainerId}"></div>`;

        content.innerHTML = html;

        PhotoModule.setupPhotoUpload(recordId, document.getElementById(photoContainerId));
    },

    confirmRecord(recordId) {
        OperationsModule.confirmRecord(recordId);
        this.updateCounts();
        this.renderRecordList();
        this.renderRecordDetail(recordId);
    },

    revertRecord(recordId) {
        OperationsModule.revertRecord(recordId);
        this.updateCounts();
        this.renderRecordList();
        this.renderRecordDetail(recordId);
    },

    suspendRecord(recordId) {
        const reason = prompt('请输入挂起原因：');
        if (reason) {
            OperationsModule.suspendRecord(recordId, reason);
            this.updateCounts();
            this.renderRecordList();
            this.renderRecordDetail(recordId);
        }
    },

    showManualReview(recordId) {
        const record = DataStore.getRecord(recordId);
        if (!record) return;

        const decision = confirm(
            `【${record.schoolName}】存在版本冲突\n\n` +
            `点击"确定"采纳较新的口头说明/正常记录数据\n` +
            `点击"取消"保留原有审批台账数据\n\n` +
            `（也可点击取消后在详情页选择"挂起待确认"）`
        );

        const note = prompt('请输入改判说明（可选）：', '');

        OperationsModule.manualReview(
            recordId,
            decision ? 'accept_new' : 'accept_old',
            note || '人工改判确认'
        );

        this.updateCounts();
        this.renderRecordList();
        this.renderRecordDetail(recordId);
    },

    showScreenshot(recordId) {
        ScreenshotModule.renderScreenshot(recordId);
    },

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    getTabLabel(tab) {
        const labels = {
            all: '全部',
            pending: '待补材料',
            manual: '人工改判',
            done: '已处理'
        };
        return labels[tab] || tab;
    },

    formatTime(isoString) {
        if (!isoString) return '-';
        try {
            return new Date(isoString).toLocaleString('zh-CN');
        } catch (e) {
            return isoString;
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
