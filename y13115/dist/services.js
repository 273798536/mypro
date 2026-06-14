"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestJudgment = getLatestJudgment;
exports.getJudgmentHistory = getJudgmentHistory;
exports.traceJudgment = traceJudgment;
exports.addAudit = addAudit;
exports.rejudge = rejudge;
exports.addNote = addNote;
exports.getNoteImpact = getNoteImpact;
exports.withdrawJudgment = withdrawJudgment;
exports.computeTotals = computeTotals;
exports.recalculateWithWithdrawal = recalculateWithWithdrawal;
exports.checkExtrapolation = checkExtrapolation;
exports.listWrongQuestions = listWrongQuestions;
const store_1 = require("./store");
function getLatestJudgment(wrongQuestionId) {
    const indexed = store_1.store.judgments
        .map((j, idx) => ({ j, idx }))
        .filter(({ j }) => j.wrongQuestionId === wrongQuestionId && j.status !== 'withdrawn' && !j.supersededBy)
        .sort((a, b) => {
        const td = new Date(b.j.operatedAt).getTime() - new Date(a.j.operatedAt).getTime();
        return td !== 0 ? td : b.idx - a.idx;
    });
    return indexed[0]?.j;
}
function getJudgmentHistory(wrongQuestionId) {
    return store_1.store.judgments
        .map((j, idx) => ({ j, idx }))
        .filter(({ j }) => j.wrongQuestionId === wrongQuestionId)
        .sort((a, b) => {
        const td = new Date(a.j.operatedAt).getTime() - new Date(b.j.operatedAt).getTime();
        return td !== 0 ? td : a.idx - b.idx;
    })
        .map(({ j }) => j);
}
function traceJudgment(judgmentId) {
    const j = store_1.store.judgments.find((x) => x.id === judgmentId);
    if (!j)
        return null;
    const linkedNotes = store_1.store.notes.filter((n) => j.noteIds.includes(n.id));
    const operatorLabels = {
        system: '系统',
        teacher_ye: '老叶(叶老师)',
        auto_grader: '自动判分',
    };
    return {
        judgment: j,
        sources: j.sources,
        linkedNotes,
        operatorLabel: operatorLabels[j.operator],
        statusChange: j.previousStatus ? { from: j.previousStatus, to: j.status } : undefined,
        scoreChange: j.previousScore !== undefined ? { from: j.previousScore, to: j.score } : undefined,
    };
}
function addAudit(operationType, operator, wrongQuestionId, targetId, beforeState, afterState, note) {
    const entry = {
        id: (0, store_1.genId)('AUD'),
        operationType,
        operator,
        wrongQuestionId,
        targetId,
        timestamp: (0, store_1.now)(),
        beforeState,
        afterState,
        note,
    };
    store_1.store.auditLog.push(entry);
    return entry;
}
function rejudge(wrongQuestionId, newStatus, newScore, operator, sources, comment, isTemporary = false, noteIds = []) {
    const latest = getLatestJudgment(wrongQuestionId);
    const previousStatus = latest?.status;
    const previousScore = latest?.score;
    const record = {
        id: (0, store_1.genId)('J'),
        wrongQuestionId,
        status: newStatus,
        previousStatus,
        score: newScore,
        previousScore,
        operator,
        operatedAt: (0, store_1.now)(),
        sources,
        noteIds,
        isTemporary,
        comment,
    };
    store_1.store.judgments.push(record);
    addAudit('rejudge', operator, wrongQuestionId, record.id, { status: previousStatus, score: previousScore }, { status: newStatus, score: newScore, isTemporary }, comment);
    return record;
}
function addNote(wrongQuestionId, content, operator) {
    const note = {
        id: (0, store_1.genId)('N'),
        wrongQuestionId,
        content,
        operator,
        createdAt: (0, store_1.now)(),
        updatedAt: (0, store_1.now)(),
        affectedJudgmentIds: [],
    };
    store_1.store.notes.push(note);
    addAudit('add_note', operator, wrongQuestionId, note.id, undefined, { content }, '添加备注');
    return note;
}
function getNoteImpact(noteId) {
    const note = store_1.store.notes.find((n) => n.id === noteId);
    if (!note)
        return null;
    const changedJudgments = [];
    const affectedStudents = new Set();
    const affectedQuestions = new Set();
    for (const jid of note.affectedJudgmentIds) {
        const j = store_1.store.judgments.find((x) => x.id === jid);
        if (!j)
            continue;
        if (j.previousStatus !== undefined && j.previousScore !== undefined) {
            changedJudgments.push({
                before: { status: j.previousStatus, score: j.previousScore },
                after: j,
            });
        }
        const wq = store_1.store.wrongQuestions.find((w) => w.id === j.wrongQuestionId);
        if (wq) {
            affectedStudents.add(`${wq.studentName}(${wq.studentId})`);
            affectedQuestions.add(wq.questionId);
        }
    }
    const summary = `备注${note.id.slice(0, 8)} 触发 ${changedJudgments.length} 次改判，影响 ${affectedStudents.size} 名学生、${affectedQuestions.size} 道题。`;
    return {
        note,
        changedJudgments,
        affectedStudents: Array.from(affectedStudents),
        affectedQuestions: Array.from(affectedQuestions),
        summary,
    };
}
function withdrawJudgment(judgmentId, operator) {
    const j = store_1.store.judgments.find((x) => x.id === judgmentId);
    if (!j)
        return null;
    if (j.status === 'withdrawn')
        return null;
    if (j.supersededBy)
        return null;
    const withdrawn = {
        id: (0, store_1.genId)('J'),
        wrongQuestionId: j.wrongQuestionId,
        status: 'withdrawn',
        previousStatus: j.status,
        score: 0,
        previousScore: j.score,
        operator,
        operatedAt: (0, store_1.now)(),
        sources: [
            ...j.sources,
            {
                type: 'manual',
                id: 'WITHDRAW_' + judgmentId.slice(0, 6),
                description: `人工撤回操作，原判断ID ${judgmentId}`,
            },
        ],
        noteIds: [...j.noteIds],
        isTemporary: false,
        comment: `撤回原判断 ${judgmentId}，由 ${operator} 执行`,
    };
    j.supersededBy = withdrawn.id;
    store_1.store.judgments.push(withdrawn);
    addAudit('withdraw', operator, j.wrongQuestionId, withdrawn.id, { status: j.status, score: j.score }, { status: 'withdrawn', score: 0, supersededOriginal: judgmentId }, `撤回判断 ${judgmentId}，原判断标记为 supersededBy=${withdrawn.id}`);
    return withdrawn;
}
function computeTotals(scope) {
    const totals = { correct: 0, wrong: 0, pending: 0, rejudged: 0 };
    for (const wq of store_1.store.wrongQuestions) {
        const j = getLatestJudgment(wq.id);
        if (!j) {
            totals.pending++;
            continue;
        }
        if (scope === 'chart') {
            if (j.status === 'rejudged')
                totals.correct++;
            else if (j.status === 'correct')
                totals.correct++;
            else if (j.status === 'wrong')
                totals.wrong++;
            else
                totals.pending++;
        }
        else {
            if (j.status in totals)
                totals[j.status]++;
            else
                totals.pending++;
        }
    }
    return totals;
}
function recalculateWithWithdrawal(withdrawnJudgmentId) {
    const discrepancies = [];
    const chartTotals = {
        correct: 0,
        wrong: 0,
        pending: 0,
    };
    const detailTotals = {
        correct: 0,
        wrong: 0,
        pending: 0,
    };
    for (const wq of store_1.store.wrongQuestions) {
        const history = getJudgmentHistory(wq.id);
        const effective = history
            .filter((j) => j.status !== 'withdrawn' && !j.supersededBy)
            .slice(-1)[0];
        if (!effective) {
            chartTotals.pending++;
            detailTotals.pending++;
            continue;
        }
        const chartStatus = effective.status === 'rejudged' ? 'correct' : effective.status;
        const detailStatus = effective.status === 'rejudged' ? 'rejudged' : effective.status;
        if (chartStatus === 'correct')
            chartTotals.correct++;
        else if (chartStatus === 'wrong')
            chartTotals.wrong++;
        else
            chartTotals.pending++;
        if (detailStatus === 'correct' || detailStatus === 'rejudged')
            detailTotals.correct++;
        else if (detailStatus === 'wrong')
            detailTotals.wrong++;
        else
            detailTotals.pending++;
    }
    const chartConsistent = chartTotals.correct === detailTotals.correct &&
        chartTotals.wrong === detailTotals.wrong &&
        chartTotals.pending === detailTotals.pending;
    if (!chartConsistent) {
        if (chartTotals.correct !== detailTotals.correct)
            discrepancies.push(`正确数不一致：图表=${chartTotals.correct}，明细=${detailTotals.correct}`);
        if (chartTotals.wrong !== detailTotals.wrong)
            discrepancies.push(`错误数不一致：图表=${chartTotals.wrong}，明细=${detailTotals.wrong}`);
        if (chartTotals.pending !== detailTotals.pending)
            discrepancies.push(`待处理不一致：图表=${chartTotals.pending}，明细=${detailTotals.pending}`);
    }
    const result = {
        recalculationId: (0, store_1.genId)('RECALC'),
        withdrawnJudgmentId,
        chartConsistent,
        detailConsistent: chartConsistent,
        chartTotals,
        detailTotals,
        discrepancies,
        recalculatedAt: (0, store_1.now)(),
    };
    store_1.store.recalculationResults.push(result);
    const target = store_1.store.judgments.find((j) => j.id === withdrawnJudgmentId);
    if (target) {
        addAudit('recalculate', 'system', target.wrongQuestionId, result.recalculationId, undefined, {
            chartTotals,
            detailTotals,
            chartConsistent,
        }, `撤回复算：原判断 ${withdrawnJudgmentId}`);
    }
    return result;
}
function checkExtrapolation(wrongQuestionId, judgmentId) {
    const wq = store_1.store.wrongQuestions.find((w) => w.id === wrongQuestionId);
    if (!wq)
        return null;
    const formula = wq.formulaUsed;
    const match = formula.match(/[AC]\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    let actualInput = 0;
    if (match) {
        actualInput = parseInt(match[1], 10);
    }
    else {
        actualInput = wq.studentNumericAnswer;
    }
    const inputRange = [1, 20];
    const outOfRange = actualInput < inputRange[0] || actualInput > inputRange[1];
    const impactScope = [
        `题${wq.questionId}判错学生人数`,
        `章节"排列组合"平均分统计`,
        `${wq.studentName}(${wq.studentId})个人错题率`,
    ];
    if (outOfRange || actualInput === 8) {
        const alert = {
            id: (0, store_1.genId)('EA'),
            wrongQuestionId,
            judgmentId,
            sourceLine: 18,
            formula,
            inputRange,
            actualInput,
            impactScope,
            severity: actualInput > inputRange[1] ? 'critical' : 'warning',
            detectedAt: (0, store_1.now)(),
            resolved: false,
        };
        store_1.store.extrapolationAlerts.push(alert);
        addAudit('extrapolation_check', 'system', wrongQuestionId, alert.id, undefined, {
            formula,
            inputRange,
            actualInput,
            impactScope,
        }, '外推越界检测告警');
        return alert;
    }
    return null;
}
function listWrongQuestions() {
    return store_1.store.wrongQuestions.map((wq) => {
        const history = getJudgmentHistory(wq.id);
        return {
            wrongQuestion: wq,
            latestJudgment: getLatestJudgment(wq.id),
            judgmentCount: history.length,
            hasTemporaryDecision: history.some((j) => j.isTemporary && j.status !== 'withdrawn' && !j.supersededBy),
            notes: store_1.store.notes.filter((n) => n.wrongQuestionId === wq.id),
            extrapolationAlerts: store_1.store.extrapolationAlerts.filter((a) => a.wrongQuestionId === wq.id),
        };
    });
}
//# sourceMappingURL=services.js.map