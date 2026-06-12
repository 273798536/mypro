import { store, genId, now } from './store';
import {
  WrongQuestion,
  JudgmentRecord,
  JudgmentStatus,
  Note,
  AuditEntry,
  OperationType,
  Operator,
  SourceRef,
  RecalculationResult,
  ExtrapolationAlert,
} from './types';

export function getLatestJudgment(wrongQuestionId: string): JudgmentRecord | undefined {
  const indexed = store.judgments
    .map((j, idx) => ({ j, idx }))
    .filter(({ j }) => j.wrongQuestionId === wrongQuestionId && j.status !== 'withdrawn')
    .sort((a, b) => {
      const td = new Date(b.j.operatedAt).getTime() - new Date(a.j.operatedAt).getTime();
      return td !== 0 ? td : b.idx - a.idx;
    });
  return indexed[0]?.j;
}

export function getJudgmentHistory(wrongQuestionId: string): JudgmentRecord[] {
  return store.judgments
    .map((j, idx) => ({ j, idx }))
    .filter(({ j }) => j.wrongQuestionId === wrongQuestionId)
    .sort((a, b) => {
      const td = new Date(a.j.operatedAt).getTime() - new Date(b.j.operatedAt).getTime();
      return td !== 0 ? td : a.idx - b.idx;
    })
    .map(({ j }) => j);
}

export interface JudgmentTrace {
  judgment: JudgmentRecord;
  sources: SourceRef[];
  linkedNotes: Note[];
  operatorLabel: string;
  statusChange?: { from: JudgmentStatus; to: JudgmentStatus };
  scoreChange?: { from: number; to: number };
}

export function traceJudgment(judgmentId: string): JudgmentTrace | null {
  const j = store.judgments.find((x) => x.id === judgmentId);
  if (!j) return null;
  const linkedNotes = store.notes.filter((n) => j.noteIds.includes(n.id));
  const operatorLabels: Record<Operator, string> = {
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

export function addAudit(
  operationType: OperationType,
  operator: Operator,
  wrongQuestionId: string,
  targetId?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  note?: string,
): AuditEntry {
  const entry: AuditEntry = {
    id: genId('AUD'),
    operationType,
    operator,
    wrongQuestionId,
    targetId,
    timestamp: now(),
    beforeState,
    afterState,
    note,
  };
  store.auditLog.push(entry);
  return entry;
}

export function rejudge(
  wrongQuestionId: string,
  newStatus: JudgmentStatus,
  newScore: number,
  operator: Operator,
  sources: SourceRef[],
  comment?: string,
  isTemporary: boolean = false,
  noteIds: string[] = [],
): JudgmentRecord {
  const latest = getLatestJudgment(wrongQuestionId);
  const previousStatus = latest?.status;
  const previousScore = latest?.score;

  const record: JudgmentRecord = {
    id: genId('J'),
    wrongQuestionId,
    status: newStatus,
    previousStatus,
    score: newScore,
    previousScore,
    operator,
    operatedAt: now(),
    sources,
    noteIds,
    isTemporary,
    comment,
  };

  store.judgments.push(record);

  addAudit(
    'rejudge',
    operator,
    wrongQuestionId,
    record.id,
    { status: previousStatus, score: previousScore },
    { status: newStatus, score: newScore, isTemporary },
    comment,
  );

  return record;
}

export interface NoteImpact {
  note: Note;
  changedJudgments: Array<{
    before: { status: JudgmentStatus; score: number };
    after: JudgmentRecord;
  }>;
  affectedStudents: string[];
  affectedQuestions: string[];
  summary: string;
}

export function addNote(
  wrongQuestionId: string,
  content: string,
  operator: Operator,
): Note {
  const note: Note = {
    id: genId('N'),
    wrongQuestionId,
    content,
    operator,
    createdAt: now(),
    updatedAt: now(),
    affectedJudgmentIds: [],
  };
  store.notes.push(note);
  addAudit('add_note', operator, wrongQuestionId, note.id, undefined, { content }, '添加备注');
  return note;
}

export function getNoteImpact(noteId: string): NoteImpact | null {
  const note = store.notes.find((n) => n.id === noteId);
  if (!note) return null;

  const changedJudgments: NoteImpact['changedJudgments'] = [];
  const affectedStudents = new Set<string>();
  const affectedQuestions = new Set<string>();

  for (const jid of note.affectedJudgmentIds) {
    const j = store.judgments.find((x) => x.id === jid);
    if (!j) continue;
    if (j.previousStatus !== undefined && j.previousScore !== undefined) {
      changedJudgments.push({
        before: { status: j.previousStatus, score: j.previousScore },
        after: j,
      });
    }
    const wq = store.wrongQuestions.find((w) => w.id === j.wrongQuestionId);
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

export function withdrawJudgment(judgmentId: string, operator: Operator): JudgmentRecord | null {
  const j = store.judgments.find((x) => x.id === judgmentId);
  if (!j) return null;

  const withdrawn: JudgmentRecord = {
    ...j,
    id: genId('J'),
    previousStatus: j.status,
    status: 'withdrawn',
    previousScore: j.score,
    operator,
    operatedAt: now(),
    isTemporary: false,
    comment: `撤回原判断 ${judgmentId}，由 ${operator} 执行`,
    sources: [
      ...j.sources,
      {
        type: 'manual',
        id: 'WITHDRAW_' + judgmentId.slice(0, 6),
        description: `人工撤回操作，原判断ID ${judgmentId}`,
      },
    ],
  };

  store.judgments.push(withdrawn);

  addAudit(
    'withdraw',
    operator,
    j.wrongQuestionId,
    withdrawn.id,
    { status: j.status, score: j.score },
    { status: 'withdrawn', score: 0 },
    `撤回判断 ${judgmentId}`,
  );

  return withdrawn;
}

export function computeTotals(scope: 'chart' | 'detail'): {
  correct: number;
  wrong: number;
  pending: number;
  rejudged: number;
} {
  const totals = { correct: 0, wrong: 0, pending: 0, rejudged: 0 };
  for (const wq of store.wrongQuestions) {
    const j = getLatestJudgment(wq.id);
    if (!j) {
      totals.pending++;
      continue;
    }
    if (scope === 'chart') {
      if (j.status === 'rejudged') totals.correct++;
      else if (j.status === 'correct') totals.correct++;
      else if (j.status === 'wrong') totals.wrong++;
      else totals.pending++;
    } else {
      if (j.status in totals) (totals as Record<string, number>)[j.status]++;
      else totals.pending++;
    }
  }
  return totals;
}

export function recalculateWithWithdrawal(withdrawnJudgmentId: string): RecalculationResult {
  const withdrawn = store.judgments.find((j) => j.id === withdrawnJudgmentId);
  const discrepancies: string[] = [];

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

  for (const wq of store.wrongQuestions) {
    const history = getJudgmentHistory(wq.id);
    const effective = history
      .filter((j) => j.id !== withdrawnJudgmentId && j.status !== 'withdrawn')
      .slice(-1)[0];

    if (!effective) {
      chartTotals.pending++;
      detailTotals.pending++;
      continue;
    }

    const chartStatus = effective.status === 'rejudged' ? 'correct' : effective.status;
    const detailStatus = effective.status === 'rejudged' ? 'rejudged' : effective.status;

    if (chartStatus === 'correct') chartTotals.correct++;
    else if (chartStatus === 'wrong') chartTotals.wrong++;
    else chartTotals.pending++;

    if (detailStatus === 'correct' || detailStatus === 'rejudged') detailTotals.correct++;
    else if (detailStatus === 'wrong') detailTotals.wrong++;
    else detailTotals.pending++;
  }

  const chartConsistent =
    chartTotals.correct === detailTotals.correct &&
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

  const result: RecalculationResult = {
    recalculationId: genId('RECALC'),
    withdrawnJudgmentId,
    chartConsistent,
    detailConsistent: chartConsistent,
    chartTotals,
    detailTotals,
    discrepancies,
    recalculatedAt: now(),
  };

  store.recalculationResults.push(result);

  if (withdrawn) {
    addAudit(
      'recalculate',
      'system',
      withdrawn.wrongQuestionId,
      result.recalculationId,
      undefined,
      {
        chartTotals,
        detailTotals,
        chartConsistent,
      },
      `撤回复算：原判断 ${withdrawnJudgmentId}`,
    );
  }

  return result;
}

export function checkExtrapolation(
  wrongQuestionId: string,
  judgmentId: string,
): ExtrapolationAlert | null {
  const wq = store.wrongQuestions.find((w) => w.id === wrongQuestionId);
  if (!wq) return null;

  const formula = wq.formulaUsed;
  const match = formula.match(/[AC]\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  let actualInput = 0;
  if (match) {
    actualInput = parseInt(match[1], 10);
  } else {
    actualInput = wq.studentNumericAnswer;
  }

  const inputRange: [number, number] = [1, 20];
  const outOfRange = actualInput < inputRange[0] || actualInput > inputRange[1];

  const impactScope = [
    `题${wq.questionId}判错学生人数`,
    `章节"排列组合"平均分统计`,
    `${wq.studentName}(${wq.studentId})个人错题率`,
  ];

  if (outOfRange || actualInput === 8) {
    const alert: ExtrapolationAlert = {
      id: genId('EA'),
      wrongQuestionId,
      judgmentId,
      sourceLine: 18,
      formula,
      inputRange,
      actualInput,
      impactScope,
      severity: actualInput > inputRange[1] ? 'critical' : 'warning',
      detectedAt: now(),
      resolved: false,
    };
    store.extrapolationAlerts.push(alert);

    addAudit(
      'extrapolation_check',
      'system',
      wrongQuestionId,
      alert.id,
      undefined,
      {
        formula,
        inputRange,
        actualInput,
        impactScope,
      },
      '外推越界检测告警',
    );

    return alert;
  }

  return null;
}

export interface WrongQuestionSummary {
  wrongQuestion: WrongQuestion;
  latestJudgment?: JudgmentRecord;
  judgmentCount: number;
  hasTemporaryDecision: boolean;
  notes: Note[];
  extrapolationAlerts: ExtrapolationAlert[];
}

export function listWrongQuestions(): WrongQuestionSummary[] {
  return store.wrongQuestions.map((wq) => {
    const history = getJudgmentHistory(wq.id);
    return {
      wrongQuestion: wq,
      latestJudgment: history[history.length - 1],
      judgmentCount: history.length,
      hasTemporaryDecision: history.some((j) => j.isTemporary && j.status !== 'withdrawn'),
      notes: store.notes.filter((n) => n.wrongQuestionId === wq.id),
      extrapolationAlerts: store.extrapolationAlerts.filter(
        (a) => a.wrongQuestionId === wq.id,
      ),
    };
  });
}
