"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const archiveService = __importStar(require("./services/archiveService"));
const dataStore = __importStar(require("./store/dataStore"));
const path_1 = __importDefault(require("path"));
const seed_1 = require("./seed");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.get('/api/stage-records', (req, res) => {
    res.json(dataStore.getStageRecords());
});
app.get('/api/track-items', (req, res) => {
    res.json(dataStore.getTrackItems());
});
app.get('/api/archive-items', (req, res) => {
    res.json(dataStore.getArchiveItems());
});
app.get('/api/archive-items/:id', (req, res) => {
    const item = dataStore.getArchiveItemById(req.params.id);
    if (!item)
        return res.status(404).json({ error: '未找到该条目' });
    res.json(item);
});
app.get('/api/archive-items/:id/history', (req, res) => {
    const history = archiveService.getItemHistory(req.params.id);
    if (!history)
        return res.status(404).json({ error: '未找到该条目' });
    res.json(history);
});
app.get('/api/summary', (req, res) => {
    res.json(archiveService.getIssueSummary());
});
app.post('/api/auto-align', (req, res) => {
    const result = archiveService.runAutoAlign();
    res.json({
        success: true,
        message: `自动对齐完成，共处理 ${result.length} 条记录`,
        data: result,
    });
});
app.post('/api/rejudge', (req, res) => {
    try {
        const request = req.body;
        if (!request.archiveItemId || !request.operator || !request.reason) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        const result = archiveService.rejudgeItem(request);
        if (!result)
            return res.status(404).json({ error: '未找到该条目' });
        res.json({
            success: true,
            message: '改判成功',
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : '改判失败' });
    }
});
app.post('/api/authorize', (req, res) => {
    try {
        const request = req.body;
        if (!request.archiveItemId || !request.authorizer || !request.note || !request.alignmentDecision) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        const result = archiveService.authorizeItem(request);
        if (!result)
            return res.status(404).json({ error: '未找到该条目' });
        res.json({
            success: true,
            message: '授权成功，文件-曲目-清单已重新对齐',
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : '授权失败' });
    }
});
app.post('/api/archive/:id', (req, res) => {
    try {
        const { operator } = req.body;
        const result = archiveService.archiveItem(req.params.id, operator || 'system');
        if (!result)
            return res.status(404).json({ error: '未找到该条目' });
        res.json({
            success: true,
            message: '归档成功',
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : '归档失败' });
    }
});
app.post('/api/export', (req, res) => {
    try {
        const { format, includeHistory, statusFilter } = req.body;
        if (!format || !['json', 'csv'].includes(format)) {
            return res.status(400).json({ error: '请指定有效的导出格式: json 或 csv' });
        }
        const result = archiveService.exportArchive({
            format,
            includeHistory: includeHistory || false,
            statusFilter: statusFilter || [],
        });
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
        res.send(result.content);
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : '导出失败' });
    }
});
(0, seed_1.loadSeedData)();
console.log('');
console.log('=== 试跑数据已就绪 ===');
console.log('包含: 1条正常匹配 / 1条文件名不匹配 / 1条时码偏半拍 / 1条晚到附件 / 1条双重不匹配');
console.log('');
app.listen(PORT, () => {
    console.log(`播客片头清单归档系统已启动: http://localhost:${PORT}`);
});
