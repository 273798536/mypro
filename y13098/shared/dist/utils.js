"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.formatDate = formatDate;
exports.filterCriteriaToSearchParams = filterCriteriaToSearchParams;
exports.searchParamsToFilterCriteria = searchParamsToFilterCriteria;
exports.detectOverlap = detectOverlap;
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}
function filterCriteriaToSearchParams(filter) {
    const params = new URLSearchParams();
    if (filter.corridorId)
        params.set('corridorId', filter.corridorId);
    if (filter.startDate)
        params.set('startDate', filter.startDate);
    if (filter.endDate)
        params.set('endDate', filter.endDate);
    if (filter.recordType?.length)
        params.set('recordType', filter.recordType.join(','));
    if (filter.status?.length)
        params.set('status', filter.status.join(','));
    if (filter.isOverlapping !== undefined)
        params.set('isOverlapping', String(filter.isOverlapping));
    if (filter.searchKeyword)
        params.set('searchKeyword', filter.searchKeyword);
    return params;
}
function searchParamsToFilterCriteria(params) {
    const filter = {};
    if (params.has('corridorId'))
        filter.corridorId = params.get('corridorId');
    if (params.has('startDate'))
        filter.startDate = params.get('startDate');
    if (params.has('endDate'))
        filter.endDate = params.get('endDate');
    if (params.has('recordType'))
        filter.recordType = params.get('recordType').split(',');
    if (params.has('status'))
        filter.status = params.get('status').split(',');
    if (params.has('isOverlapping'))
        filter.isOverlapping = params.get('isOverlapping') === 'true';
    if (params.has('searchKeyword'))
        filter.searchKeyword = params.get('searchKeyword');
    return filter;
}
function detectOverlap(records) {
    const overlappingIds = [];
    const dateMap = new Map();
    records.forEach(r => {
        const key = `${r.corridorId}-${r.recordDate}`;
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });
    records.forEach((r, idx) => {
        const key = `${r.corridorId}-${r.recordDate}`;
        if (dateMap.get(key) > 1) {
            overlappingIds.push(r.id || String(idx));
        }
    });
    return overlappingIds;
}
