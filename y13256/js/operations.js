const OperationsModule = {
    confirmRecord(recordId) {
        const record = DataStore.getRecord(recordId);
        if (!record) return null;

        if (record.status === RecordStatus.CONFLICT) {
            UI.showToast('存在冲突的记录需要先人工改判', 'warning');
            return null;
        }

        const updated = DataStore.updateRecord(recordId, {
            status: RecordStatus.DONE,
            confirmedAt: new Date().toISOString(),
            confirmedBy: '当前用户'
        });

        DataStore.addChange(recordId, {
            type: ChangeType.MANUAL,
            source: '人工操作',
            field: '记录状态',
            oldValue: this.getStatusText(record.status),
            newValue: '已处理',
            description: '用户确认记录无误'
        });

        UI.showToast('记录已确认', 'success');
        return updated;
    },

    revertRecord(recordId) {
        const record = DataStore.getRecord(recordId);
        if (!record) return null;

        if (record.changes.length <= 1) {
            UI.showToast('没有可撤回的操作', 'warning');
            return null;
        }

        const lastChange = record.changes[record.changes.length - 1];
        const previousValues = this.extractPreviousValues(lastChange);

        const updated = DataStore.updateRecord(recordId, {
            ...previousValues,
            status: RecordStatus.PENDING,
            revertedAt: new Date().toISOString()
        });

        DataStore.addChange(recordId, {
            type: ChangeType.MANUAL,
            source: '人工操作',
            field: '撤回操作',
            oldValue: lastChange.newValue,
            newValue: lastChange.oldValue,
            description: `撤回了"${lastChange.description}"`
        });

        record.changes.pop();
        DataStore.save();

        UI.showToast('已撤回上一步操作', 'success');
        return updated;
    },

    manualReview(recordId, decision, note) {
        const record = DataStore.getRecord(recordId);
        if (!record) return null;

        const oldStatus = this.getStatusText(record.status);
        let newStatus, description;

        if (decision === 'accept_new') {
            newStatus = RecordStatus.MANUAL;
            description = `人工改判：采纳较新的口头说明/正常记录数据`;
        } else if (decision === 'accept_old') {
            newStatus = RecordStatus.MANUAL;
            description = `人工改判：保留原有审批台账数据`;
        } else if (decision === 'custom') {
            newStatus = RecordStatus.MANUAL;
            description = `人工改判：自定义处理 - ${note}`;
        } else {
            newStatus = RecordStatus.PENDING;
            description = '解除挂起，待进一步确认';
        }

        const updated = DataStore.updateRecord(recordId, {
            status: newStatus,
            needsManualReview: false,
            hasConflict: false,
            conflictNote: '',
            manualDecision: decision,
            manualNote: note,
            reviewedAt: new Date().toISOString(),
            reviewedBy: '当前用户'
        });

        DataStore.addChange(recordId, {
            type: ChangeType.MANUAL,
            source: '人工改判',
            field: '记录状态',
            oldValue: oldStatus,
            newValue: this.getStatusText(newStatus),
            description: description,
            note: note
        });

        DataStore.addNote(recordId, {
            type: 'manual',
            content: note,
            decision: decision
        });

        UI.showToast('人工改判已记录', 'success');
        return updated;
    },

    suspendRecord(recordId, reason) {
        const record = DataStore.getRecord(recordId);
        if (!record) return null;

        const oldStatus = this.getStatusText(record.status);

        const updated = DataStore.updateRecord(recordId, {
            status: RecordStatus.CONFLICT,
            needsManualReview: true,
            conflictNote: reason,
            suspendedAt: new Date().toISOString()
        });

        DataStore.addChange(recordId, {
            type: ChangeType.CONFLICT,
            source: '人工挂起',
            field: '记录状态',
            oldValue: oldStatus,
            newValue: '待人工确认',
            description: reason
        });

        UI.showToast('记录已挂起待确认', 'warning');
        return updated;
    },

    extractPreviousValues(change) {
        const values = {};
        if (change.oldValue && change.field === '早晚高峰容量') {
            const match = change.oldValue.match(/早(\d+|-).*晚(\d+|-)/);
            if (match) {
                values.morningCapacity = match[1] === '-' ? null : parseInt(match[1]);
                values.eveningCapacity = match[2] === '-' ? null : parseInt(match[2]);
            }
        }
        return values;
    },

    getStatusText(status) {
        const map = {
            [RecordStatus.PENDING]: '待补材料',
            [RecordStatus.MANUAL]: '人工改判',
            [RecordStatus.DONE]: '已处理',
            [RecordStatus.CONFLICT]: '待人工确认'
        };
        return map[status] || status;
    },

    getStatusBadgeClass(status) {
        const map = {
            [RecordStatus.PENDING]: 'status-pending',
            [RecordStatus.MANUAL]: 'status-manual',
            [RecordStatus.DONE]: 'status-done',
            [RecordStatus.CONFLICT]: 'status-conflict'
        };
        return map[status] || '';
    },

    canConfirm(record) {
        return record.status !== RecordStatus.CONFLICT &&
               record.status !== RecordStatus.DONE;
    },

    canRevert(record) {
        return record.changes && record.changes.length > 1;
    },

    needsManual(record) {
        return record.status === RecordStatus.CONFLICT || record.needsManualReview;
    }
};
