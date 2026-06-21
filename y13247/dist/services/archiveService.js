"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHistoryLog = createHistoryLog;
exports.runAutoAlign = runAutoAlign;
exports.rejudgeItem = rejudgeItem;
exports.authorizeItem = authorizeItem;
exports.archiveItem = archiveItem;
exports.getItemHistory = getItemHistory;
exports.getIssueSummary = getIssueSummary;
exports.exportArchive = exportArchive;
const timecode_1 = require("../utils/timecode");
const dataStore_1 = require("../store/dataStore");
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function detectMatchStatus(stage, track) {
    const issues = [];
    const filenameMatch = stage.originalFilename.trim().toLowerCase() ===
        track.expectedFilename.trim().toLowerCase();
    let deviation = (0, timecode_1.calculateTimecodeDeviation)(stage.timecodeStart, track.expectedTimecodeStart);
    if (deviation === 0) {
        const rawDeviation = stage.timecodeDeviationMs;
        if (rawDeviation !== undefined && rawDeviation !== 0) {
            deviation = rawDeviation;
        }
        else {
            const halfFrameMatch = stage.rawDescription.match(/约(\d+)ms|半拍|半帧/);
            if (halfFrameMatch) {
                deviation = halfFrameMatch[1] ? parseInt(halfFrameMatch[1]) : 20;
            }
        }
    }
    if (stage.isLateArrival) {
        issues.push(`文件晚到，实际接收时间: ${stage.receivedAt}`);
        return { status: 'late_arrival', issues, deviation };
    }
    if (!filenameMatch && deviation !== 0) {
        issues.push(`文件名不匹配: 舞台="${stage.originalFilename}", 曲目表="${track.expectedFilename}"`);
        issues.push(`时码偏差: ${(0, timecode_1.formatDeviation)(deviation)}`);
        if ((0, timecode_1.isDeviationHalfFrame)(deviation)) {
            issues.push(`原始记录备注: ${stage.rawDescription}`);
        }
        return { status: 'mismatch_both', issues, deviation };
    }
    if (!filenameMatch) {
        issues.push(`文件名不匹配: 舞台="${stage.originalFilename}", 曲目表="${track.expectedFilename}"`);
        return { status: 'mismatch_filename', issues, deviation };
    }
    if (deviation !== 0) {
        issues.push(`时码偏差: ${(0, timecode_1.formatDeviation)(deviation)}`);
        if ((0, timecode_1.isDeviationHalfFrame)(deviation)) {
            issues.push(`舞台通道原始描述: "${stage.rawDescription}"`);
            issues.push(`录音师备注: ${stage.engineerNote || '无'}`);
        }
        return { status: 'mismatch_timecode', issues, deviation };
    }
    return { status: 'matched', issues: [], deviation };
}
function createHistoryLog(archiveItemId, source, operator, previousStatus, newStatus, previousValue, newValue, reason) {
    return {
        id: generateId('log'),
        archiveItemId,
        timestamp: new Date().toISOString(),
        source,
        operator,
        previousStatus,
        newStatus,
        previousValue,
        newValue,
        reason,
    };
}
function runAutoAlign() {
    const stages = (0, dataStore_1.getStageRecords)();
    const tracks = (0, dataStore_1.getTrackItems)();
    const result = [];
    const sortedStages = [...stages].sort((a, b) => a.channelNo - b.channelNo);
    const sortedTracks = [...tracks].sort((a, b) => a.trackNo - b.trackNo);
    for (let i = 0; i < Math.min(sortedStages.length, sortedTracks.length); i++) {
        const stage = sortedStages[i];
        const track = sortedTracks[i];
        const { status, issues, deviation } = detectMatchStatus(stage, track);
        const previousValue = {
            stageFilename: stage.originalFilename,
            trackFilename: track.expectedFilename,
            stageTimecode: stage.timecodeStart,
            trackTimecode: track.expectedTimecodeStart,
        };
        const newValue = {
            finalFilename: track.expectedFilename,
            finalTimecode: track.expectedTimecodeStart,
            finalTitle: track.expectedTitle,
            status,
            issues,
        };
        const log = createHistoryLog('', 'auto_align', 'system', 'pending', status, previousValue, newValue, `自动对齐: 通道${stage.channelNo} <-> 曲目${track.trackNo}`);
        const archiveItem = {
            id: generateId('arc'),
            stageRecordId: stage.id,
            trackItemId: track.id,
            finalTitle: track.expectedTitle,
            finalFilename: track.expectedFilename,
            finalTimecodeStart: track.expectedTimecodeStart,
            finalDuration: stage.durationSeconds,
            status,
            timecodeDeviationMs: deviation,
            alignmentIssues: issues,
            originalStageNote: stage.engineerNote,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        log.archiveItemId = archiveItem.id;
        archiveItem.history.push(log);
        (0, dataStore_1.addArchiveItem)(archiveItem);
        result.push(archiveItem);
    }
    return result;
}
function rejudgeItem(request) {
    const item = (0, dataStore_1.getArchiveItemById)(request.archiveItemId);
    if (!item)
        return null;
    const stage = request.newStageRecordId
        ? (0, dataStore_1.getStageRecordById)(request.newStageRecordId) || item.stageRecord
        : item.stageRecord;
    const track = request.newTrackItemId
        ? (0, dataStore_1.getTrackItemById)(request.newTrackItemId) || item.trackItem
        : item.trackItem;
    if (!stage || !track)
        return null;
    const filenameSource = request.filenameSource || 'track';
    let newFinalFilename;
    switch (filenameSource) {
        case 'stage':
            newFinalFilename = stage.originalFilename;
            break;
        case 'override':
            if (!request.overrideFilename) {
                throw new Error('选择了覆盖文件名但未提供 overrideFilename');
            }
            newFinalFilename = request.overrideFilename;
            break;
        case 'track':
        default:
            newFinalFilename = track.expectedFilename;
    }
    const previousValue = {
        finalTitle: item.finalTitle,
        finalFilename: item.finalFilename,
        finalTimecodeStart: item.finalTimecodeStart,
        stageRecordId: item.stageRecordId,
        trackItemId: item.trackItemId,
        status: item.status,
        filenameSource: 'previous',
    };
    const newFinalTimecode = request.overrideTimecode || item.finalTimecodeStart;
    const newFinalTitle = request.overrideTitle || track.expectedTitle;
    const newValue = {
        finalTitle: newFinalTitle,
        finalFilename: newFinalFilename,
        finalTimecodeStart: newFinalTimecode,
        stageRecordId: stage.id,
        trackItemId: track.id,
        status: 'rejudged',
        filenameSource,
    };
    const log = createHistoryLog(item.id, 'manual_rejudge', request.operator, item.status, 'rejudged', previousValue, newValue, request.reason);
    const updated = {
        ...item,
        stageRecordId: stage.id,
        trackItemId: track.id,
        finalTitle: newFinalTitle,
        finalFilename: newFinalFilename,
        finalTimecodeStart: newFinalTimecode,
        status: 'rejudged',
        alignmentIssues: item.alignmentIssues.filter(i => !i.includes('时码') && !i.includes('文件名')),
        history: [...item.history, log],
        updatedAt: new Date().toISOString(),
    };
    const overrides = [];
    if (request.overrideTimecode)
        overrides.push('时码');
    if (request.overrideTitle)
        overrides.push('标题');
    if (filenameSource === 'stage')
        overrides.push(`使用舞台文件名: ${stage.originalFilename}`);
    if (filenameSource === 'override')
        overrides.push(`覆盖文件名: ${newFinalFilename}`);
    if (overrides.length > 0) {
        updated.alignmentIssues.push(`人工改判覆盖(${overrides.join(', ')}): ${request.reason}`);
    }
    else {
        updated.alignmentIssues.push(`人工改判: ${request.reason}`);
    }
    (0, dataStore_1.updateArchiveItem)(updated);
    return {
        ...updated,
        stageRecord: (0, dataStore_1.getStageRecordById)(updated.stageRecordId),
        trackItem: (0, dataStore_1.getTrackItemById)(updated.trackItemId),
    };
}
function authorizeItem(request) {
    const item = (0, dataStore_1.getArchiveItemById)(request.archiveItemId);
    if (!item)
        return null;
    const stage = (0, dataStore_1.getStageRecordById)(request.alignmentDecision.useStageFile);
    const track = (0, dataStore_1.getTrackItemById)(request.alignmentDecision.useTrackItem);
    if (!stage || !track) {
        throw new Error(`无法找到指定的舞台文件(${request.alignmentDecision.useStageFile})或曲目表(${request.alignmentDecision.useTrackItem})`);
    }
    const filenameSource = request.alignmentDecision.filenameSource || 'track';
    let newFinalFilename;
    switch (filenameSource) {
        case 'stage':
            newFinalFilename = stage.originalFilename;
            break;
        case 'override':
            if (!request.alignmentDecision.overrideFilename) {
                throw new Error('选择了覆盖文件名但未提供 overrideFilename');
            }
            newFinalFilename = request.alignmentDecision.overrideFilename;
            break;
        case 'track':
        default:
            newFinalFilename = track.expectedFilename;
    }
    const authNote = {
        id: generateId('auth'),
        archiveItemId: item.id,
        authorizer: request.authorizer,
        note: request.note,
        createdAt: new Date().toISOString(),
        alignmentDecision: {
            ...request.alignmentDecision,
            filenameSource,
        },
    };
    const previousValue = {
        finalTitle: item.finalTitle,
        finalFilename: item.finalFilename,
        finalTimecodeStart: item.finalTimecodeStart,
        stageRecordId: item.stageRecordId,
        trackItemId: item.trackItemId,
        status: item.status,
        filenameSource: 'previous',
    };
    const newFinalTimecode = request.alignmentDecision.overrideTimecode || track.expectedTimecodeStart;
    const newFinalTitle = request.alignmentDecision.overrideTitle || track.expectedTitle;
    const newValue = {
        finalTitle: newFinalTitle,
        finalFilename: newFinalFilename,
        finalTimecodeStart: newFinalTimecode,
        stageRecordId: stage.id,
        trackItemId: track.id,
        status: 'authorized',
        authorizationNote: authNote,
        filenameSource,
    };
    const log = createHistoryLog(item.id, 'authorization', request.authorizer, item.status, 'authorized', previousValue, newValue, `授权对齐: ${request.note}`);
    const updated = {
        ...item,
        stageRecordId: stage.id,
        trackItemId: track.id,
        finalTitle: newFinalTitle,
        finalFilename: newFinalFilename,
        finalTimecodeStart: newFinalTimecode,
        status: 'authorized',
        authorizationNote: authNote,
        alignmentIssues: [],
        history: [...item.history, log],
        updatedAt: new Date().toISOString(),
    };
    const authDetails = [`授权人: ${request.authorizer}`, `备注: ${request.note}`];
    if (filenameSource === 'stage') {
        authDetails.push(`使用舞台文件名: ${stage.originalFilename}`);
    }
    else if (filenameSource === 'override') {
        authDetails.push(`覆盖文件名: ${newFinalFilename}`);
    }
    else {
        authDetails.push(`使用曲目表文件名: ${track.expectedFilename}`);
    }
    if (request.alignmentDecision.overrideTimecode) {
        authDetails.push(`时码修正: ${newFinalTimecode}`);
    }
    if (request.alignmentDecision.overrideTitle) {
        authDetails.push(`标题修正: ${newFinalTitle}`);
    }
    updated.alignmentIssues = authDetails;
    (0, dataStore_1.addAuthorizationNote)(authNote);
    (0, dataStore_1.updateArchiveItem)(updated);
    return {
        ...updated,
        stageRecord: (0, dataStore_1.getStageRecordById)(updated.stageRecordId),
        trackItem: (0, dataStore_1.getTrackItemById)(updated.trackItemId),
    };
}
function archiveItem(itemId, operator) {
    const item = (0, dataStore_1.getArchiveItemById)(itemId);
    if (!item)
        return null;
    if (item.status !== 'authorized' && item.status !== 'matched' && item.status !== 'rejudged') {
        throw new Error('仅已授权/已匹配/已改判的条目可归档');
    }
    const previousValue = { status: item.status };
    const newValue = { status: 'archived' };
    const log = createHistoryLog(item.id, 'system_detect', operator, item.status, 'archived', previousValue, newValue, '清单归档完成');
    const updated = {
        ...item,
        status: 'archived',
        history: [...item.history, log],
        updatedAt: new Date().toISOString(),
    };
    (0, dataStore_1.updateArchiveItem)(updated);
    return {
        ...updated,
        stageRecord: (0, dataStore_1.getStageRecordById)(updated.stageRecordId),
        trackItem: (0, dataStore_1.getTrackItemById)(updated.trackItemId),
    };
}
function getItemHistory(itemId) {
    const item = (0, dataStore_1.getArchiveItemById)(itemId);
    return item ? item.history : null;
}
function getIssueSummary() {
    const items = (0, dataStore_1.getArchiveItems)();
    return {
        total: items.length,
        matched: items.filter(i => i.status === 'matched').length,
        mismatched: items.filter(i => i.status.startsWith('mismatch')).length,
        lateArrival: items.filter(i => i.status === 'late_arrival').length,
        needReview: items.filter(i => ['mismatch_filename', 'mismatch_timecode', 'mismatch_both', 'late_arrival', 'rejudged'].includes(i.status)).length,
        authorized: items.filter(i => i.status === 'authorized').length,
        archived: items.filter(i => i.status === 'archived').length,
    };
}
function escapeCSV(value) {
    if (value === null || value === undefined)
        return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function formatStatusForDisplay(status) {
    const labels = {
        pending: '待处理',
        matched: '已匹配',
        mismatch_filename: '文件名不匹配',
        mismatch_timecode: '时码不匹配',
        mismatch_both: '双重不匹配',
        late_arrival: '晚到附件',
        rejudged: '已改判',
        authorized: '已授权',
        archived: '已归档',
    };
    return labels[status] || status;
}
function exportArchive(options) {
    let items = (0, dataStore_1.getArchiveItems)();
    if (options.statusFilter && options.statusFilter.length > 0) {
        items = items.filter(item => options.statusFilter.includes(item.status));
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    if (options.format === 'json') {
        const exportData = items.map(item => {
            const base = {
                id: item.id,
                status: formatStatusForDisplay(item.status),
                statusCode: item.status,
                channelNo: item.stageRecord?.channelNo,
                trackNo: item.trackItem?.trackNo,
                segment: item.trackItem?.segment,
                finalTitle: item.finalTitle,
                finalFilename: item.finalFilename,
                finalTimecodeStart: item.finalTimecodeStart,
                finalDuration: item.finalDuration,
                timecodeDeviationMs: item.timecodeDeviationMs,
                stageFilename: item.stageRecord?.originalFilename,
                stageTimecodeStart: item.stageRecord?.timecodeStart,
                stageEngineerNote: item.stageRecord?.engineerNote,
                stageRawDescription: item.stageRecord?.rawDescription,
                stageIsLateArrival: item.stageRecord?.isLateArrival,
                stageReceivedAt: item.stageRecord?.receivedAt,
                trackExpectedTitle: item.trackItem?.expectedTitle,
                trackExpectedFilename: item.trackItem?.expectedFilename,
                trackExpectedTimecodeStart: item.trackItem?.expectedTimecodeStart,
                alignmentIssues: item.alignmentIssues,
                authorizer: item.authorizationNote?.authorizer,
                authorizationNote: item.authorizationNote?.note,
                authorizationTime: item.authorizationNote?.createdAt,
                filenameSource: item.authorizationNote?.alignmentDecision.filenameSource,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };
            if (options.includeHistory) {
                return {
                    ...base,
                    history: item.history.map(log => ({
                        timestamp: log.timestamp,
                        source: log.source,
                        operator: log.operator,
                        previousStatus: formatStatusForDisplay(log.previousStatus),
                        newStatus: formatStatusForDisplay(log.newStatus),
                        reason: log.reason,
                        previousValue: log.previousValue,
                        newValue: log.newValue,
                    })),
                };
            }
            return base;
        });
        return {
            filename: `播客片头清单归档_${timestamp}.json`,
            content: JSON.stringify(exportData, null, 2),
            mimeType: 'application/json',
        };
    }
    const headers = [
        'ID', '状态', '状态代码', '通道号', '曲目号', '片段类型',
        '最终标题', '最终文件名', '最终时码', '时长(秒)', '时码偏差(ms)',
        '舞台文件名', '舞台时码', '录音师备注', '舞台原始描述',
        '是否晚到', '接收时间',
        '曲目预期标题', '曲目预期文件名', '曲目预期时码',
        '对齐问题', '授权人', '授权备注', '授权时间', '文件名来源',
        '创建时间', '更新时间',
    ];
    const rows = items.map(item => [
        item.id,
        formatStatusForDisplay(item.status),
        item.status,
        item.stageRecord?.channelNo || '',
        item.trackItem?.trackNo || '',
        item.trackItem?.segment || '',
        item.finalTitle,
        item.finalFilename,
        item.finalTimecodeStart,
        item.finalDuration,
        item.timecodeDeviationMs,
        item.stageRecord?.originalFilename || '',
        item.stageRecord?.timecodeStart || '',
        item.stageRecord?.engineerNote || '',
        item.stageRecord?.rawDescription || '',
        item.stageRecord?.isLateArrival ? '是' : '否',
        item.stageRecord?.receivedAt || '',
        item.trackItem?.expectedTitle || '',
        item.trackItem?.expectedFilename || '',
        item.trackItem?.expectedTimecodeStart || '',
        item.alignmentIssues.join('; '),
        item.authorizationNote?.authorizer || '',
        item.authorizationNote?.note || '',
        item.authorizationNote?.createdAt || '',
        item.authorizationNote?.alignmentDecision.filenameSource || '',
        item.createdAt,
        item.updatedAt,
    ]);
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');
    return {
        filename: `播客片头清单归档_${timestamp}.csv`,
        content: '\uFEFF' + csvContent,
        mimeType: 'text/csv; charset=utf-8',
    };
}
