"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDirtyRecords = detectDirtyRecords;
exports.hasAllDataSourcesPresent = hasAllDataSourcesPresent;
const types_1 = require("../types");
const REQUIRED_FIELDS = [
    'ticketId',
    'compensationAmount',
    'occurrenceDate',
    'dataSources'
];
const CUSTOMER_IDENTIFYING_FIELDS = ['customerName', 'customerPhone'];
const AGENT_IDENTIFYING_FIELDS = ['agentName', 'agentId'];
function detectDirtyRecords(record, existingRecords) {
    const dirtyTypes = [];
    const details = [];
    const missingFields = REQUIRED_FIELDS.filter(field => {
        const value = record[field];
        return value === undefined || value === null || value === '';
    });
    if (missingFields.length > 0) {
        dirtyTypes.push(types_1.DirtyRecordType.MISSING_FIELDS);
        details.push({
            type: types_1.DirtyRecordType.MISSING_FIELDS,
            field: missingFields.join(', ')
        });
    }
    if (existingRecords && existingRecords.length > 0) {
        const occurrenceDate = record.occurrenceDate;
        const hasCrossDate = existingRecords.some(r => r.occurrenceDate !== occurrenceDate && r.ticketId === record.ticketId);
        if (hasCrossDate) {
            dirtyTypes.push(types_1.DirtyRecordType.CROSS_DATE);
            details.push({
                type: types_1.DirtyRecordType.CROSS_DATE,
                field: 'occurrenceDate',
                expected: existingRecords[0].occurrenceDate,
                actual: occurrenceDate
            });
        }
        for (const field of CUSTOMER_IDENTIFYING_FIELDS) {
            const existingValues = new Set(existingRecords
                .map(r => r[field])
                .filter(v => v !== undefined && v !== null && v !== ''));
            const currentValue = record[field];
            if (existingValues.size > 0 && currentValue && !existingValues.has(currentValue)) {
                dirtyTypes.push(types_1.DirtyRecordType.NAME_CHANGE);
                details.push({
                    type: types_1.DirtyRecordType.NAME_CHANGE,
                    field,
                    expected: Array.from(existingValues).join(' / '),
                    actual: currentValue
                });
                break;
            }
        }
        if (record.compensationAmount !== undefined) {
            const existingAmounts = new Set(existingRecords.map(r => r.compensationAmount));
            if (existingAmounts.size > 0 && !existingAmounts.has(record.compensationAmount)) {
                dirtyTypes.push(types_1.DirtyRecordType.AMOUNT_CONFLICT);
                details.push({
                    type: types_1.DirtyRecordType.AMOUNT_CONFLICT,
                    field: 'compensationAmount',
                    expected: Array.from(existingAmounts).join(' / '),
                    actual: String(record.compensationAmount)
                });
            }
        }
        if (record.transferCount !== undefined) {
            const existingCounts = new Set(existingRecords
                .map(r => r.transferCount)
                .filter(v => v !== undefined));
            if (existingCounts.size > 0 && !existingCounts.has(record.transferCount)) {
                dirtyTypes.push(types_1.DirtyRecordType.QUANTITY_CONFLICT);
                details.push({
                    type: types_1.DirtyRecordType.QUANTITY_CONFLICT,
                    field: 'transferCount',
                    expected: Array.from(existingCounts).map(String).join(' / '),
                    actual: String(record.transferCount)
                });
            }
        }
    }
    return {
        isDirty: dirtyTypes.length > 0,
        dirtyTypes: [...new Set(dirtyTypes)],
        details
    };
}
function hasAllDataSourcesPresent(dataSources) {
    const requiredSources = [
        types_1.DataSource.SESSION_SUMMARY,
        types_1.DataSource.SLA_RULE,
        types_1.DataSource.COMPENSATION_APPROVAL
    ];
    const missing = requiredSources.filter(s => !dataSources.includes(s));
    return {
        complete: missing.length === 0,
        missing
    };
}
