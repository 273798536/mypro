"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
const mockBars = [
    {
        id: 'bar-001', name: '前区主吊杆 1#', x: 2000, y: 500, z: 8500, length: 12000,
        status: 'passed', commentIds: ['cmt-001'], coordinateSystem: 'stage-local', zone: '前区'
    },
    {
        id: 'bar-002', name: '前区主吊杆 2#', x: 2000, y: 900, z: 8200, length: 12000,
        status: 'pending', commentIds: ['cmt-002', 'cmt-007'], coordinateSystem: 'stage-local', zone: '前区'
    },
    {
        id: 'bar-003', name: '中区景杆 3#', x: 2000, y: 2400, z: 7800, length: 12000,
        status: 'need-fix', commentIds: ['cmt-003'], coordinateSystem: 'stage-local', zone: '中区', riskLevel: '高'
    },
    {
        id: 'bar-004', name: '中区景杆 4#', x: 2030, y: 2420, z: 7800, length: 12000,
        status: 'overlap', commentIds: ['cmt-004'], coordinateSystem: 'stage-local', zone: '中区', riskLevel: '高'
    },
    {
        id: 'bar-005', name: '后区灯杆 5#', x: 2000, y: 4000, z: 7200, length: 12000,
        status: 'overlap', commentIds: ['cmt-005'], coordinateSystem: 'stage-local', zone: '后区', riskLevel: '中'
    },
    {
        id: 'bar-006', name: '后区灯杆 6#', x: 2015, y: 4005, z: 7210, length: 12000,
        status: 'overlap', commentIds: ['cmt-006'], coordinateSystem: 'stage-local', zone: '后区', riskLevel: '中'
    },
    {
        id: 'bar-007', name: '侧吊杆 L1', x: 500, y: 1800, z: 6500, length: 4000,
        status: 'pending', commentIds: ['cmt-008'], coordinateSystem: 'stage-local', zone: '侧区'
    },
    {
        id: 'bar-008', name: '侧吊杆 R1', x: 3500, y: 1800, z: 6500, length: 4000,
        status: 'passed', commentIds: [], coordinateSystem: 'stage-local', zone: '侧区'
    }
];
const mockComments = [
    { id: 'cmt-001', barId: 'bar-001', author: '张工', content: '坐标与图纸一致，安装平直度 ±2mm 内，可放行。', status: '已通过', createdAt: Date.now() - 86400000 * 3, hasLateAttachment: false },
    { id: 'cmt-002', barId: 'bar-002', author: '李工', content: 'Z轴标高差 15mm，需现场确认是否在容许范围内。建议复核吊点。', status: '待复核', createdAt: Date.now() - 86400000 * 2, hasLateAttachment: false },
    { id: 'cmt-003', barId: 'bar-003', author: '王工', content: '吊杆编号与设计图纸不符，现场为 3#，图纸标 4#。需核对变更单。', status: '需修改', createdAt: Date.now() - 86400000 * 1.5, hasLateAttachment: false },
    { id: 'cmt-004', barId: 'bar-004', author: '王工', content: '与 3# 吊杆空间位置严重重叠，净距仅 30mm，存在碰撞风险。', status: '待复核', createdAt: Date.now() - 86400000 * 1.2, hasLateAttachment: false },
    { id: 'cmt-005', barId: 'bar-005', author: '赵工', content: '后区两灯杆间距不足，灯具安装后干涉。建议调整其中一吊杆 Y 坐标。', status: '待复核', createdAt: Date.now() - 86400000, hasLateAttachment: false },
    { id: 'cmt-006', barId: 'bar-006', author: '赵工', content: '与 5# 灯杆重叠，见 cmt-005。', status: '待复核', createdAt: Date.now() - 86400000, hasLateAttachment: false },
    { id: 'cmt-007', barId: 'bar-002', author: '林姐', content: '晚到补充：现场复测标高 8215mm，偏差在 GB/T 36719 容许值内。附件：复测记录表_v2.pdf', status: '待复核', createdAt: Date.now() - 3600000, hasLateAttachment: true, attachmentName: '复测记录表_v2.pdf' },
    { id: 'cmt-008', barId: 'bar-007', author: '陈工', content: '侧吊杆安装位置与侧幕布冲突，需确认幕布展开轨迹。', status: '需修改', createdAt: Date.now() - 7200000, hasLateAttachment: false }
];
const mockOverlapPairs = [
    { id: 'ov-001', barIdA: 'bar-003', barIdB: 'bar-004', overlapDistance: 30, riskLevel: '高', detectedAt: Date.now() - 86400000 * 1.1 },
    { id: 'ov-002', barIdA: 'bar-005', barIdB: 'bar-006', overlapDistance: 18, riskLevel: '中', detectedAt: Date.now() - 86400000 * 0.9 }
];
const serverState = {
    bars: JSON.parse(JSON.stringify(mockBars)),
    comments: JSON.parse(JSON.stringify(mockComments))
};
function filterBars(bars, comments, filter) {
    return bars.filter(bar => {
        if (filter.status?.length && !filter.status.includes(bar.status))
            return false;
        if (filter.zone && bar.zone !== filter.zone)
            return false;
        if (filter.riskLevel?.length) {
            if (!bar.riskLevel || !filter.riskLevel.includes(bar.riskLevel))
                return false;
        }
        if (filter.keyword) {
            const kw = filter.keyword.toLowerCase();
            const matched = bar.name.toLowerCase().includes(kw) ||
                comments.filter(c => c.barId === bar.id).some(c => c.content.toLowerCase().includes(kw));
            if (!matched)
                return false;
        }
        return true;
    });
}
function filterComments(bars, comments, filter) {
    return comments.filter(cmt => {
        if (filter.status?.length) {
            const bar = bars.find(b => b.id === cmt.barId);
            if (!bar || !filter.status.includes(bar.status))
                return false;
        }
        if (filter.zone) {
            const bar = bars.find(b => b.id === cmt.barId);
            if (!bar || bar.zone !== filter.zone)
                return false;
        }
        if (filter.riskLevel?.length) {
            const bar = bars.find(b => b.id === cmt.barId);
            if (!bar || !bar.riskLevel || !filter.riskLevel.includes(bar.riskLevel))
                return false;
        }
        if (filter.keyword && !cmt.content.toLowerCase().includes(filter.keyword.toLowerCase()))
            return false;
        return true;
    });
}
function validateFilter(filter) {
    const validStatuses = ['pending', 'passed', 'need-fix', 'overlap'];
    if (filter.status?.length && !filter.status.every(s => validStatuses.includes(s))) {
        return { valid: false, reason: `status 筛选值无效，仅支持：${validStatuses.join(', ')}` };
    }
    const validRiskLevels = ['高', '中', '低'];
    if (filter.riskLevel?.length && !filter.riskLevel.every(r => validRiskLevels.includes(r))) {
        return { valid: false, reason: `riskLevel 筛选值无效，仅支持：${validRiskLevels.join(', ')}` };
    }
    return { valid: true };
}
function buildResponse(bars, comments, overlapPairs, filter) {
    const filterWithTimestamp = { ...filter, appliedAt: Date.now() };
    const filteredBars = filterBars(bars, comments, filterWithTimestamp);
    const filteredComments = filterComments(bars, comments, filterWithTimestamp);
    const summary = {
        passed: filteredBars.filter(b => b.status === 'passed').length,
        needFix: filteredBars.filter(b => b.status === 'need-fix').length,
        overlap: filteredBars.filter(b => b.status === 'overlap').length,
        pending: filteredBars.filter(b => b.status === 'pending').length
    };
    return {
        code: filteredBars.length > 0 ? 0 : 1,
        message: filteredBars.length > 0
            ? `导出成功，共 ${filteredBars.length} 条吊杆数据`
            : '筛选条件下无匹配数据，请调整筛选条件后重试',
        data: {
            bars: filteredBars,
            comments: filteredComments,
            overlapPairs,
            summary,
            filterCriteria: filterWithTimestamp,
            exportAt: Date.now(),
            coordinateSystem: 'stage-local'
        }
    };
}
app.get('/api/health', (_req, res) => {
    res.json({ code: 0, message: '剧院吊杆复核服务运行正常', timestamp: Date.now() });
});
app.post('/api/sync-status', (req, res) => {
    try {
        const { commentId, barId, commentStatus, barStatus, reason, operator } = req.body;
        if (!commentId || !barId || !commentStatus || !barStatus || !operator) {
            return res.status(400).json({ code: 400, message: '缺少必填参数', data: null });
        }
        const comment = serverState.comments.find(c => c.id === commentId);
        if (comment)
            comment.status = commentStatus;
        const bar = serverState.bars.find(b => b.id === barId);
        if (bar && bar.status !== 'overlap')
            bar.status = barStatus;
        console.log(`[${new Date().toLocaleString('zh-CN')}] 状态同步：${operator} 修改 cmt=${commentId} 为 ${commentStatus}, bar=${barId} 为 ${barStatus} 原因：${reason || '-'}`);
        res.json({ code: 0, message: '状态同步成功', data: { syncedAt: Date.now() } });
    }
    catch (err) {
        console.error('状态同步异常:', err);
        res.status(500).json({ code: 500, message: `同步失败：${err instanceof Error ? err.message : String(err)}`, data: null });
    }
});
app.post('/api/export', (req, res) => {
    try {
        const { filter, bars: reqBars, comments: reqComments, overlapPairs: reqOverlaps } = req.body;
        if (!filter) {
            return res.status(400).json({ code: 400, message: '缺少筛选条件 filter 参数', data: null });
        }
        const validation = validateFilter(filter);
        if (!validation.valid) {
            return res.status(400).json({ code: 400, message: validation.reason, data: null });
        }
        const bars = Array.isArray(reqBars) && reqBars.length > 0 ? reqBars : serverState.bars;
        const comments = Array.isArray(reqComments) && reqComments.length > 0 ? reqComments : serverState.comments;
        const overlapPairs = Array.isArray(reqOverlaps) && reqOverlaps.length > 0 ? reqOverlaps : mockOverlapPairs;
        const response = buildResponse(bars, comments, overlapPairs, filter);
        const dataSource = Array.isArray(reqBars) ? '前端同步数据' : '服务端缓存数据';
        console.log(`[${new Date().toLocaleString('zh-CN')}] 导出(${dataSource})：筛选=${JSON.stringify(filter)}, 吊杆数=${response.data.bars.length}`);
        res.json(response);
    }
    catch (err) {
        console.error('导出接口异常:', err);
        res.status(500).json({
            code: 500,
            message: `服务器内部错误：${err instanceof Error ? err.message : String(err)}`,
            data: null
        });
    }
});
app.post('/api/export/validate', (req, res) => {
    try {
        const { filter, bars: reqBars, comments: reqComments } = req.body;
        if (!filter) {
            return res.json({ valid: false, reason: '缺少筛选条件', estimatedRows: 0 });
        }
        const bars = Array.isArray(reqBars) && reqBars.length > 0 ? reqBars : serverState.bars;
        const comments = Array.isArray(reqComments) && reqComments.length > 0 ? reqComments : serverState.comments;
        const filteredBars = filterBars(bars, comments, filter);
        res.json({
            valid: filteredBars.length > 0,
            reason: filteredBars.length > 0 ? '数据有效' : '筛选结果为空',
            estimatedRows: filteredBars.length,
            estimatedFileSizeKB: Math.round(filteredBars.length * 0.5 + 2)
        });
    }
    catch (err) {
        res.status(500).json({ valid: false, reason: String(err), estimatedRows: 0 });
    }
});
app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║   剧院吊杆阵列空间复核 - 后端服务已启动                     ║
  ║   端口: ${PORT}                                                 ║
  ║   健康检查: http://localhost:${PORT}/api/health                  ║
  ║   状态同步: POST http://localhost:${PORT}/api/sync-status        ║
  ║   导出接口: POST http://localhost:${PORT}/api/export            ║
  ║   校验接口: POST http://localhost:${PORT}/api/export/validate   ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});
