"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mockData_1 = require("./mockData");
const router = express_1.default.Router();
function generateId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}
function recalculateConclusion(record) {
    const hasError = record.unitConversionError.hasError;
    const avg = record.processingRecords.reduce(function (sum, r) {
        return sum + Math.abs(r.displacement);
    }, 0) / (record.processingRecords.length || 1);
    const avg3 = avg.toFixed(3);
    const diff = (avg - 2).toFixed(3);
    if (hasError) {
        return '存在单位换算错误待复核，原始平均位移' + avg3 + 'mm，需修正后重新评估。';
    }
    if (avg > 2) {
        return '管片错缝位移均值' + avg3 + 'mm，超出预警阈值' + diff + 'mm，需关注。';
    }
    return '管片状态正常，平均错缝位移' + avg3 + 'mm，在安全范围内。';
}
router.get('/records', function (_req, res) {
    const summary = mockData_1.mockRecords.map(function (r) {
        return {
            id: r.id,
            runTime: r.runTime,
            status: r.status,
            timeParameters: r.timeParameters,
            unitConversionError: r.unitConversionError,
            conclusion: r.conclusion,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        };
    });
    res.json(summary);
});
router.get('/records/:id', function (req, res) {
    const record = mockData_1.mockRecords.find(function (r) { return r.id === req.params.id; });
    if (!record) {
        res.status(404).json({ error: 'Record not found' });
        return;
    }
    res.json(record);
});
router.put('/records/:id', function (req, res) {
    const idx = mockData_1.mockRecords.findIndex(function (r) { return r.id === req.params.id; });
    if (idx === -1) {
        res.status(404).json({ error: 'Record not found' });
        return;
    }
    const body = req.body;
    const original = mockData_1.mockRecords[idx];
    const updated = JSON.parse(JSON.stringify(original));
    const changes = [];
    if (body.timeParameters) {
        const oldTP = original.timeParameters;
        const newTP = body.timeParameters;
        if (oldTP.startTime !== newTP.startTime) {
            changes.push({ field: 'timeParameters.startTime', oldValue: oldTP.startTime, newValue: newTP.startTime });
        }
        if (oldTP.endTime !== newTP.endTime) {
            changes.push({ field: 'timeParameters.endTime', oldValue: oldTP.endTime, newValue: newTP.endTime });
        }
        if (oldTP.samplingInterval !== newTP.samplingInterval) {
            changes.push({ field: 'timeParameters.samplingInterval', oldValue: oldTP.samplingInterval, newValue: newTP.samplingInterval });
        }
        updated.timeParameters = { startTime: newTP.startTime, endTime: newTP.endTime, samplingInterval: newTP.samplingInterval };
    }
    if (body.status && body.status !== original.status) {
        changes.push({ field: 'status', oldValue: original.status, newValue: body.status });
        updated.status = body.status;
    }
    if (body.unitConversionError) {
        const oldErr = original.unitConversionError;
        const newErr = body.unitConversionError;
        if (oldErr.hasError !== newErr.hasError) {
            changes.push({ field: 'unitConversionError.hasError', oldValue: oldErr.hasError, newValue: newErr.hasError });
        }
        if (oldErr.description !== newErr.description) {
            changes.push({ field: 'unitConversionError.description', oldValue: oldErr.description, newValue: newErr.description });
        }
        updated.unitConversionError = {
            hasError: newErr.hasError,
            description: newErr.description,
            errorDetails: newErr.errorDetails ? newErr.errorDetails.slice() : []
        };
    }
    const newConclusion = recalculateConclusion(updated);
    if (newConclusion !== original.conclusion) {
        changes.push({ field: 'conclusion', oldValue: original.conclusion, newValue: newConclusion });
    }
    updated.conclusion = newConclusion;
    const now = new Date().toISOString();
    updated.updatedAt = now;
    changes.push({ field: 'updatedAt', oldValue: original.updatedAt, newValue: now });
    mockData_1.mockRecords[idx] = updated;
    if (changes.length > 0 && body.modifier) {
        const historyEntry = {
            id: generateId('HIST'),
            recordId: updated.id,
            modifier: body.modifier,
            modifiedAt: now,
            modificationReason: body.modificationReason || '',
            changes: changes,
            processingOpinion: body.processingOpinion || ''
        };
        if (!mockData_1.mockHistoryRecords[updated.id]) {
            mockData_1.mockHistoryRecords[updated.id] = [];
        }
        mockData_1.mockHistoryRecords[updated.id].unshift(historyEntry);
    }
    res.json(updated);
});
router.get('/records/:id/history', function (req, res) {
    const history = mockData_1.mockHistoryRecords[req.params.id] || [];
    res.json(history);
});
router.post('/records/:id/history', function (req, res) {
    const record = mockData_1.mockRecords.find(function (r) { return r.id === req.params.id; });
    if (!record) {
        res.status(404).json({ error: 'Record not found' });
        return;
    }
    const body = req.body;
    const historyEntry = {
        id: generateId('HIST'),
        recordId: record.id,
        modifier: body.modifier || '',
        modifiedAt: new Date().toISOString(),
        modificationReason: body.modificationReason || '',
        changes: body.changes || [],
        processingOpinion: body.processingOpinion || ''
    };
    if (!mockData_1.mockHistoryRecords[record.id]) {
        mockData_1.mockHistoryRecords[record.id] = [];
    }
    mockData_1.mockHistoryRecords[record.id].unshift(historyEntry);
    res.status(201).json(historyEntry);
});
router.get('/records/:id/download', function (req, res) {
    const record = mockData_1.mockRecords.find(function (r) { return r.id === req.params.id; });
    if (!record) {
        res.status(404).json({ error: 'Record not found' });
        return;
    }
    const tsSafe = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = 'tunnel-segment-' + record.id + '-' + tsSafe + '.txt';
    const statusMap = {
        pending: '待复核',
        reviewed: '已复核',
        approved: '已通过'
    };
    const lines = [];
    lines.push('============================================');
    lines.push('隧道管片错缝模型分析报告');
    lines.push('============================================');
    lines.push('记录编号: ' + record.id);
    lines.push('运行时间: ' + new Date(record.runTime).toLocaleString('zh-CN'));
    lines.push('当前状态: ' + statusMap[record.status]);
    lines.push('生成时间: ' + new Date().toLocaleString('zh-CN'));
    lines.push('--------------------------------------------');
    lines.push('时间参数:');
    lines.push('  起始时间: ' + new Date(record.timeParameters.startTime).toLocaleString('zh-CN'));
    lines.push('  结束时间: ' + new Date(record.timeParameters.endTime).toLocaleString('zh-CN'));
    lines.push('  采样间隔: ' + record.timeParameters.samplingInterval + '秒');
    lines.push('--------------------------------------------');
    lines.push('单位换算检查:');
    lines.push('  是否存在错误: ' + (record.unitConversionError.hasError ? '是' : '否'));
    if (record.unitConversionError.hasError) {
        lines.push('  错误描述: ' + record.unitConversionError.description);
        lines.push('  错误明细:');
        record.unitConversionError.errorDetails.forEach(function (d, i) {
            lines.push('    ' + (i + 1) + '. ' + d);
        });
    }
    lines.push('--------------------------------------------');
    lines.push('处理记录明细 (共' + record.processingRecords.length + '条):');
    lines.push('  时间戳          管片ID  位移(mm)   应力(MPa)  温度(℃)');
    record.processingRecords.forEach(function (r) {
        const timeStr = new Date(r.timestamp).toLocaleTimeString('zh-CN');
        const row = '  ' +
            timeStr.padEnd(16, ' ') +
            String(r.segmentId).padEnd(8, ' ') +
            r.displacement.toFixed(3).padEnd(10, ' ') +
            r.stress.toFixed(2).padEnd(10, ' ') +
            r.temperature.toFixed(1);
        lines.push(row);
    });
    lines.push('--------------------------------------------');
    lines.push('分析结论: ' + record.conclusion);
    lines.push('============================================');
    const content = lines.join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(content);
});
exports.default = router;
