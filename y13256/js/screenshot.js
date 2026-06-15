const ScreenshotModule = {
    currentRecordId: null,

    generateSummary(record) {
        const sections = [];

        sections.push({
            title: '基本信息',
            items: [
                { label: '学校名称', value: record.schoolName },
                { label: '复核日期', value: record.date },
                { label: '当前状态', value: OperationsModule.getStatusText(record.status), status: record.status }
            ]
        });

        const modifiedFields = VerifyModule.getModifiedFields(record);
        if (modifiedFields.length > 0) {
            sections.push({
                title: '口径变更记录',
                items: modifiedFields.map(f => ({
                    label: f.field,
                    value: `${f.oldValue} → ${f.newValue}`,
                    changed: true
                }))
            });
        }

        sections.push({
            title: '复核结果',
            items: [
                { label: '早高峰容量', value: record.morningCapacity !== null ? `${record.morningCapacity}人` : '未填写',
                  changed: record.originalMorningCapacity !== undefined && record.originalMorningCapacity !== record.morningCapacity },
                { label: '晚高峰容量', value: record.eveningCapacity !== null ? `${record.eveningCapacity}人` : '未填写',
                  changed: record.originalEveningCapacity !== undefined && record.originalEveningCapacity !== record.eveningCapacity }
            ]
        });

        if (record.photos && record.photos.length > 0) {
            const photoInfo = record.photos.map(p =>
                `📷 ${p.location || '未标注位置'} - ${p.changeNote || '无说明'}`
            ).join('\n');

            sections.push({
                title: `现场照片（${record.photos.length}张）`,
                items: [{
                    label: '补录说明',
                    value: photoInfo,
                    multiLine: true
                }]
            });
        }

        if (record.hasConflict) {
            sections.push({
                title: '⚠️ 冲突说明',
                items: [{
                    label: '冲突原因',
                    value: record.conflictNote || '存在版本冲突，需人工确认',
                    conflict: true
                }]
            });
        }

        if (record.issues && record.issues.length > 0) {
            sections.push({
                title: '检测到的问题',
                items: record.issues.map((issue, i) => ({
                    label: `问题${i + 1}`,
                    value: issue
                }))
            });
        }

        const sourceInfo = [];
        if (DataStore.sourceFiles.ledger) sourceInfo.push(`审批台账: ${DataStore.sourceFiles.ledger.name}`);
        if (DataStore.sourceFiles.normal) sourceInfo.push(`正常记录: ${DataStore.sourceFiles.normal.name}`);
        if (DataStore.sourceFiles.verbal) sourceInfo.push(`口头说明: ${DataStore.sourceFiles.verbal.substring(0, 30)}...`);

        if (sourceInfo.length > 0) {
            sections.push({
                title: '材料来源',
                items: [{
                    label: '导入材料',
                    value: sourceInfo.join('\n'),
                    multiLine: true
                }]
            });
        }

        sections.push({
            title: '操作记录',
            items: [
                { label: '创建时间', value: this.formatTime(record.createdAt) },
                { label: '更新时间', value: this.formatTime(record.updatedAt) }
            ]
        });

        return sections;
    },

    renderScreenshot(recordId) {
        this.currentRecordId = recordId;
        const record = DataStore.getRecord(recordId);
        if (!record) return;

        const sections = this.generateSummary(record);
        const content = document.getElementById('screenshot-content');

        let html = '<div class="screenshot-summary">';

        sections.forEach(section => {
            html += `<div class="summary-section">
                <h4>${section.title}</h4>`;

            section.items.forEach(item => {
                let valueClass = 'summary-value';
                if (item.changed) valueClass += ' changed';
                if (item.conflict) valueClass += ' conflict';

                if (item.multiLine) {
                    html += `<div class="summary-item">
                        <span class="summary-label">${item.label}</span>
                        <div class="${valueClass}" style="white-space: pre-line;">${this.escapeHtml(item.value)}</div>
                    </div>`;
                } else {
                    html += `<div class="summary-item">
                        <span class="summary-label">${item.label}</span>
                        <span class="${valueClass}">${this.escapeHtml(item.value)}</span>
                    </div>`;
                }
            });

            html += '</div>';
        });

        html += `
            <div class="summary-section">
                <h4>备注说明</h4>
                <textarea class="screenshot-note" id="screenshot-note-input" placeholder="请输入截图备注说明..."></textarea>
            </div>
        `;

        html += '</div>';
        content.innerHTML = html;

        document.getElementById('screenshot-panel').classList.add('active');
    },

    generateTextSummary(recordId) {
        const record = DataStore.getRecord(recordId);
        if (!record) return '';

        const sections = this.generateSummary(record);
        const note = document.getElementById('screenshot-note-input')?.value || '';

        let text = '【学校接送容量复核说明】\n';
        text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

        sections.forEach(section => {
            text += `▸ ${section.title}\n`;
            section.items.forEach(item => {
                const prefix = item.changed ? '【变更】' : item.conflict ? '【冲突】' : '';
                if (item.multiLine) {
                    const lines = item.value.split('\n');
                    lines.forEach((line, i) => {
                        text += `  ${item.label}${i === 0 ? ':' : ''} ${prefix}${line}\n`;
                    });
                } else {
                    text += `  ${item.label}: ${prefix}${item.value}\n`;
                }
            });
            text += '\n';
        });

        if (note.trim()) {
            text += `▸ 备注\n  ${note}\n\n`;
        }

        text += '---\n';
        text += '本说明由学校接送容量复核系统自动生成\n';
        text += '状态分类: ';
        if (record.status === RecordStatus.DONE) text += '✅ 已处理';
        else if (record.status === RecordStatus.PENDING) text += '⏳ 待补材料';
        else if (record.status === RecordStatus.MANUAL) text += '✋ 人工改判';
        else if (record.status === RecordStatus.CONFLICT) text += '⚠️ 待人工确认';

        return text;
    },

    async copyToClipboard() {
        if (!this.currentRecordId) return;

        const text = this.generateTextSummary(this.currentRecordId);

        try {
            await navigator.clipboard.writeText(text);
            UI.showToast('已复制到剪贴板', 'success');
        } catch (e) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            UI.showToast('已复制到剪贴板', 'success');
        }
    },

    downloadScreenshot() {
        if (!this.currentRecordId) return;

        const text = this.generateTextSummary(this.currentRecordId);
        const record = DataStore.getRecord(this.currentRecordId);

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${record.schoolName}_容量复核说明_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        UI.showToast('已下载说明文件', 'success');
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
