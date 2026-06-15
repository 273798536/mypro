const VerifyModule = {
    processRecords(rawRecords, verbalNote) {
        const grouped = this.groupBySchool(rawRecords);
        const processedRecords = [];

        for (const [schoolName, records] of Object.entries(grouped)) {
            const processed = this.processSchoolRecord(schoolName, records, verbalNote);
            processedRecords.push(processed);
        }

        if (verbalNote && processedRecords.length > 0) {
            this.applyVerbalNote(processedRecords, verbalNote);
        }

        return processedRecords.map(r => DataStore.addRecord(r));
    },

    groupBySchool(records) {
        const groups = {};
        records.forEach(r => {
            const key = r.schoolName || '未知学校';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return groups;
    },

    processSchoolRecord(schoolName, records, verbalNote) {
        const ledgerRecords = records.filter(r => r.source === 'ledger');
        const normalRecords = records.filter(r => r.source === 'normal');

        const ledgerData = ledgerRecords.length > 0 ? this.getLatestRecord(ledgerRecords) : null;
        const normalData = normalRecords.length > 0 ? this.getLatestRecord(normalRecords) : null;

        const baseRecord = ledgerData || normalData || records[0];

        const processed = {
            schoolName: schoolName,
            date: baseRecord.date,
            morningCapacity: null,
            eveningCapacity: null,
            capacity: null,
            status: RecordStatus.PENDING,
            hasConflict: false,
            hasModification: false,
            needsManualReview: false,
            conflictNote: '',
            changes: []
        };

        this.setInitialValues(processed, ledgerData, normalData);
        this.detectInconsistencies(processed, ledgerData, normalData);
        this.buildChangeTimeline(processed, ledgerData, normalData, records);

        return processed;
    },

    getLatestRecord(records) {
        if (records.length === 0) return null;
        return records.reduce((latest, r) => {
            if (!latest) return r;
            return (r.lineNumber || 0) > (latest.lineNumber || 0) ? r : latest;
        }, null);
    },

    setInitialValues(processed, ledgerData, normalData) {
        if (ledgerData) {
            processed.morningCapacity = ledgerData.morningCapacity;
            processed.eveningCapacity = ledgerData.eveningCapacity;
            processed.capacity = ledgerData.capacity;
            processed.primarySource = 'ledger';
            processed.sourceFile = ledgerData.sourceFile;
        } else if (normalData) {
            processed.morningCapacity = normalData.morningCapacity;
            processed.eveningCapacity = normalData.eveningCapacity;
            processed.primarySource = 'normal';
            processed.sourceFile = normalData.sourceFile;
        }
    },

    detectInconsistencies(processed, ledgerData, normalData) {
        const issues = [];

        if (ledgerData && normalData) {
            const morningDiff = ledgerData.morningCapacity !== normalData.morningCapacity;
            const eveningDiff = ledgerData.eveningCapacity !== normalData.eveningCapacity;

            if (morningDiff || eveningDiff) {
                processed.hasModification = true;

                const ledgerTime = ledgerData.lastModified || 0;
                const normalTime = normalData.lastModified || 0;

                if (normalTime > ledgerTime) {
                    issues.push('正常记录口径比审批台账新，存在口径变更');
                    processed.originalMorningCapacity = ledgerData.morningCapacity;
                    processed.originalEveningCapacity = ledgerData.eveningCapacity;
                } else if (ledgerTime > normalTime) {
                    issues.push('⚠️ 审批台账覆盖了较新的正常记录，可能存在旧方案覆盖新意见');
                    processed.hasConflict = true;
                    processed.needsManualReview = true;
                    processed.status = RecordStatus.CONFLICT;
                    processed.conflictNote = '检测到旧方案覆盖新意见，已挂起待人工确认，不给出稳定结论';
                    processed.originalMorningCapacity = normalData.morningCapacity;
                    processed.originalEveningCapacity = normalData.eveningCapacity;
                } else {
                    issues.push('审批台账与正常记录口径不一致');
                    processed.originalMorningCapacity = Math.min(ledgerData.morningCapacity, normalData.morningCapacity);
                    processed.originalEveningCapacity = Math.min(ledgerData.eveningCapacity, normalData.eveningCapacity);
                }
            }
        }

        if (ledgerData) {
            if (ledgerData.morningCapacity !== null &&
                ledgerData.eveningCapacity !== null &&
                Math.abs(ledgerData.morningCapacity - ledgerData.eveningCapacity) > 50) {
                issues.push(`早晚高峰容量差异${Math.abs(ledgerData.morningCapacity - ledgerData.eveningCapacity)}人，可能口径不一致`);
            }

            if (ledgerData.capacity !== null && ledgerData.morningCapacity !== null &&
                ledgerData.capacity !== ledgerData.morningCapacity) {
                issues.push(`标称容量(${ledgerData.capacity})与早高峰容量(${ledgerData.morningCapacity})不一致`);
            }
        }

        if (normalData) {
            if (normalData.morningCapacity !== null &&
                normalData.eveningCapacity !== null &&
                Math.abs(normalData.morningCapacity - normalData.eveningCapacity) > 50) {
                issues.push(`正常记录早晚高峰差异${Math.abs(normalData.morningCapacity - normalData.eveningCapacity)}人`);
            }
        }

        processed.issues = issues;

        if (issues.length > 0 && processed.status !== RecordStatus.CONFLICT) {
            processed.status = RecordStatus.PENDING;
        }
    },

    buildChangeTimeline(processed, ledgerData, normalData, allRecords) {
        const changes = [];

        if (ledgerData) {
            changes.push({
                type: ChangeType.LEDGER,
                source: '审批台账',
                sourceFile: ledgerData.sourceFile,
                lineNumber: ledgerData.lineNumber,
                field: '早晚高峰容量',
                oldValue: null,
                newValue: `早${ledgerData.morningCapacity || '-'}人 / 晚${ledgerData.eveningCapacity || '-'}人`,
                description: '从审批台账导入初始数据',
                timestamp: ledgerData.lastModified ? new Date(ledgerData.lastModified).toISOString() : new Date().toISOString()
            });
        }

        if (normalData) {
            let changeType = ChangeType.NORMAL;
            let description = '正常记录比对数据';

            if (ledgerData && (normalData.morningCapacity !== ledgerData.morningCapacity ||
                normalData.eveningCapacity !== ledgerData.eveningCapacity)) {

                const normalTime = normalData.lastModified || 0;
                const ledgerTime = ledgerData.lastModified || 0;

                if (normalTime > ledgerTime) {
                    changeType = ChangeType.MODIFIED;
                    description = '正常记录口径更新，覆盖原审批台账数据';
                } else if (ledgerTime > normalTime) {
                    changeType = ChangeType.CONFLICT;
                    description = '⚠️ 冲突：审批台账覆盖了较新的正常记录';
                } else {
                    changeType = ChangeType.MODIFIED;
                    description = '正常记录与审批台账口径不一致';
                }
            }

            changes.push({
                type: changeType,
                source: '正常记录',
                sourceFile: normalData.sourceFile,
                lineNumber: normalData.lineNumber,
                field: '早晚高峰容量',
                oldValue: ledgerData ? `早${ledgerData.morningCapacity || '-'}人 / 晚${ledgerData.eveningCapacity || '-'}人` : null,
                newValue: `早${normalData.morningCapacity || '-'}人 / 晚${normalData.eveningCapacity || '-'}人`,
                description: description,
                timestamp: normalData.lastModified ? new Date(normalData.lastModified).toISOString() : new Date().toISOString()
            });
        }

        processed.changes = changes.sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );
    },

    applyVerbalNote(processedRecords, verbalNote) {
        const mentionedSchools = this.extractSchoolNames(verbalNote, processedRecords);
        const capacityChanges = this.extractCapacityChanges(verbalNote);

        processedRecords.forEach(record => {
            const isMentioned = mentionedSchools.includes(record.schoolName) || mentionedSchools.length === 0;

            if (isMentioned) {
                let hasChange = false;
                const oldMorning = record.morningCapacity;
                const oldEvening = record.eveningCapacity;

                if (capacityChanges.morning !== null) {
                    if (record.morningCapacity !== null && record.morningCapacity < capacityChanges.morning) {
                        record.hasConflict = true;
                        record.needsManualReview = true;
                        record.status = RecordStatus.CONFLICT;
                        record.conflictNote = '口头说明要求提高容量，但原有记录更低，已挂起待确认';
                    }
                    record.morningCapacity = capacityChanges.morning;
                    hasChange = true;
                }

                if (capacityChanges.evening !== null) {
                    if (record.eveningCapacity !== null && record.eveningCapacity < capacityChanges.evening) {
                        record.hasConflict = true;
                        record.needsManualReview = true;
                        record.status = RecordStatus.CONFLICT;
                        record.conflictNote = '口头说明要求提高容量，但原有记录更低，已挂起待确认';
                    }
                    record.eveningCapacity = capacityChanges.evening;
                    hasChange = true;
                }

                DataStore.addChange(record.id, {
                    type: ChangeType.VERBAL,
                    source: '临时口头说明',
                    field: '早晚高峰容量',
                    oldValue: `早${oldMorning || '-'}人 / 晚${oldEvening || '-'}人`,
                    newValue: `早${record.morningCapacity || '-'}人 / 晚${record.eveningCapacity || '-'}人`,
                    description: verbalNote,
                    hasChange: hasChange
                });
            }
        });
    },

    extractSchoolNames(text, records) {
        const mentioned = [];
        records.forEach(r => {
            if (text.includes(r.schoolName)) {
                mentioned.push(r.schoolName);
            }
        });
        return mentioned;
    },

    extractCapacityChanges(text) {
        const result = { morning: null, evening: null };

        const morningMatch = text.match(/早高峰[^0-9]*(\d+)/);
        if (morningMatch) result.morning = parseInt(morningMatch[1]);

        const eveningMatch = text.match(/晚高峰[^0-9]*(\d+)/);
        if (eveningMatch) result.evening = parseInt(eveningMatch[1]);

        const anyMatch = text.match(/(\d+)\s*人/);
        if (anyMatch && !morningMatch && !eveningMatch) {
            result.morning = parseInt(anyMatch[1]);
            result.evening = parseInt(anyMatch[1]);
        }

        return result;
    },

    getModifiedFields(record) {
        const fields = [];

        if (record.originalMorningCapacity !== undefined &&
            record.originalMorningCapacity !== record.morningCapacity) {
            fields.push({
                field: '早高峰容量',
                oldValue: record.originalMorningCapacity,
                newValue: record.morningCapacity
            });
        }

        if (record.originalEveningCapacity !== undefined &&
            record.originalEveningCapacity !== record.eveningCapacity) {
            fields.push({
                field: '晚高峰容量',
                oldValue: record.originalEveningCapacity,
                newValue: record.eveningCapacity
            });
        }

        return fields;
    }
};
