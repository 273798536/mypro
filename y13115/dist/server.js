"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const seed_1 = require("./seed");
const store_1 = require("./store");
const services_1 = require("./services");
const app = (0, express_1.default)();
const PORT = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
(0, seed_1.seedData)();
function ok(data, res) {
    const resp = { success: true, data, traceId: `t_${Date.now()}` };
    res.json(resp);
}
function fail(msg, res, code = 400) {
    res.status(code).json({ success: false, error: msg, traceId: `t_${Date.now()}` });
}
app.get('/api/health', (_req, res) => {
    ok({ status: 'ok', seededQuestions: store_1.store.wrongQuestions.length }, res);
});
app.get('/api/wrong-questions', (_req, res) => {
    ok((0, services_1.listWrongQuestions)(), res);
});
app.get('/api/wrong-questions/:id', (req, res) => {
    const wq = store_1.store.wrongQuestions.find((w) => w.id === req.params.id);
    if (!wq)
        return fail('错题不存在', res, 404);
    const summary = (0, services_1.listWrongQuestions)().find((s) => s.wrongQuestion.id === req.params.id);
    ok(summary, res);
});
app.get('/api/wrong-questions/:id/history', (req, res) => {
    const wq = store_1.store.wrongQuestions.find((w) => w.id === req.params.id);
    if (!wq)
        return fail('错题不存在', res, 404);
    ok((0, services_1.getJudgmentHistory)(req.params.id), res);
});
app.get('/api/judgments/:id/trace', (req, res) => {
    const trace = (0, services_1.traceJudgment)(req.params.id);
    if (!trace)
        return fail('判题记录不存在', res, 404);
    ok(trace, res);
});
app.post('/api/wrong-questions/:id/rejudge', (req, res) => {
    const wq = store_1.store.wrongQuestions.find((w) => w.id === req.params.id);
    if (!wq)
        return fail('错题不存在', res, 404);
    const body = req.body;
    if (!body.newStatus || body.newScore === undefined || !body.operator) {
        return fail('缺少必要参数: newStatus, newScore, operator', res);
    }
    const record = (0, services_1.rejudge)(req.params.id, body.newStatus, body.newScore, body.operator, body.sources || [], body.comment, body.isTemporary ?? false, body.noteIds || []);
    if (body.noteIds && body.noteIds.length > 0) {
        for (const nid of body.noteIds) {
            const note = store_1.store.notes.find((n) => n.id === nid);
            if (note && !note.affectedJudgmentIds.includes(record.id)) {
                note.affectedJudgmentIds.push(record.id);
            }
        }
    }
    ok({ judgment: record, trace: (0, services_1.traceJudgment)(record.id) }, res);
});
app.post('/api/wrong-questions/:id/notes', (req, res) => {
    const wq = store_1.store.wrongQuestions.find((w) => w.id === req.params.id);
    if (!wq)
        return fail('错题不存在', res, 404);
    const body = req.body;
    if (!body.content || !body.operator) {
        return fail('缺少必要参数: content, operator', res);
    }
    const note = (0, services_1.addNote)(req.params.id, body.content, body.operator);
    ok(note, res);
});
app.get('/api/notes/:id/impact', (req, res) => {
    const impact = (0, services_1.getNoteImpact)(req.params.id);
    if (!impact)
        return fail('备注不存在', res, 404);
    ok(impact, res);
});
app.post('/api/judgments/:id/withdraw', (req, res) => {
    const body = req.body;
    if (!body.operator)
        return fail('缺少 operator 参数', res);
    const target = store_1.store.judgments.find((j) => j.id === req.params.id);
    if (!target)
        return fail(`判题记录 ${req.params.id} 不存在`, res, 404);
    if (target.status === 'withdrawn')
        return fail(`判题记录 ${req.params.id} 已经是撤回状态，不可重复撤回`, res);
    if (target.supersededBy)
        return fail(`判题记录 ${req.params.id} 已被撤回记录 ${target.supersededBy} 取代，不可重复撤回`, res);
    const withdrawn = (0, services_1.withdrawJudgment)(req.params.id, body.operator);
    if (!withdrawn)
        return fail('撤回失败：内部状态异常', res, 500);
    ok({ judgment: withdrawn, supersededOriginal: req.params.id }, res);
});
app.post('/api/judgments/:id/recalculate', (req, res) => {
    const target = store_1.store.judgments.find((j) => j.id === req.params.id);
    if (!target)
        return fail(`判题记录 ${req.params.id} 不存在，无法复算`, res, 404);
    if (target.status !== 'withdrawn')
        return fail(`判题记录 ${req.params.id} 不是撤回状态，复算应针对撤回记录执行`, res);
    const result = (0, services_1.recalculateWithWithdrawal)(req.params.id);
    ok(result, res);
});
app.post('/api/wrong-questions/:id/extrapolation-check', (req, res) => {
    const wq = store_1.store.wrongQuestions.find((w) => w.id === req.params.id);
    if (!wq)
        return fail('错题不存在', res, 404);
    const latest = (0, services_1.getLatestJudgment)(req.params.id);
    if (!latest)
        return fail('该错题暂无判题记录', res, 400);
    const alert = (0, services_1.checkExtrapolation)(req.params.id, latest.id);
    ok({ alert, latestJudgmentId: latest.id }, res);
});
app.get('/api/extrapolation-alerts', (_req, res) => {
    ok(store_1.store.extrapolationAlerts, res);
});
app.get('/api/audit-log', (_req, res) => {
    const sorted = [...store_1.store.auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    ok(sorted, res);
});
app.get('/api/stats', (_req, res) => {
    ok({
        chart: (0, services_1.computeTotals)('chart'),
        detail: (0, services_1.computeTotals)('detail'),
        totalWrongQuestions: store_1.store.wrongQuestions.length,
        totalJudgments: store_1.store.judgments.length,
        totalNotes: store_1.store.notes.length,
        totalAlerts: store_1.store.extrapolationAlerts.filter((a) => !a.resolved).length,
        temporaryDecisions: store_1.store.judgments.filter((j) => j.isTemporary && j.status !== 'withdrawn' && !j.supersededBy)
            .length,
    }, res);
});
app.get('/api/recalculations', (_req, res) => {
    ok(store_1.store.recalculationResults, res);
});
app.listen(PORT, () => {
    console.log(`组合计数错题复盘系统已启动: http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map