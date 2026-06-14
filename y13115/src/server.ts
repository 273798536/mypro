import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { seedData } from './seed';
import { store } from './store';
import {
  listWrongQuestions,
  getJudgmentHistory,
  getLatestJudgment,
  traceJudgment,
  rejudge,
  addNote,
  getNoteImpact,
  withdrawJudgment,
  recalculateWithWithdrawal,
  checkExtrapolation,
  computeTotals,
} from './services';
import { JudgmentStatus, Operator, SourceRef } from './types';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

seedData();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  traceId?: string;
}

function ok<T>(data: T, res: Response): void {
  const resp: ApiResponse<T> = { success: true, data, traceId: `t_${Date.now()}` };
  res.json(resp);
}

function fail(msg: string, res: Response, code: number = 400): void {
  res.status(code).json({ success: false, error: msg, traceId: `t_${Date.now()}` });
}

app.get('/api/health', (_req: Request, res: Response) => {
  ok({ status: 'ok', seededQuestions: store.wrongQuestions.length }, res);
});

app.get('/api/wrong-questions', (_req: Request, res: Response) => {
  ok(listWrongQuestions(), res);
});

app.get('/api/wrong-questions/:id', (req: Request, res: Response) => {
  const wq = store.wrongQuestions.find((w) => w.id === req.params.id);
  if (!wq) return fail('错题不存在', res, 404);
  const summary = listWrongQuestions().find((s) => s.wrongQuestion.id === req.params.id);
  ok(summary, res);
});

app.get('/api/wrong-questions/:id/history', (req: Request, res: Response) => {
  const wq = store.wrongQuestions.find((w) => w.id === req.params.id);
  if (!wq) return fail('错题不存在', res, 404);
  ok(getJudgmentHistory(req.params.id), res);
});

app.get('/api/judgments/:id/trace', (req: Request, res: Response) => {
  const trace = traceJudgment(req.params.id);
  if (!trace) return fail('判题记录不存在', res, 404);
  ok(trace, res);
});

interface RejudgeBody {
  newStatus: JudgmentStatus;
  newScore: number;
  operator: Operator;
  sources: SourceRef[];
  comment?: string;
  isTemporary?: boolean;
  noteIds?: string[];
}

app.post('/api/wrong-questions/:id/rejudge', (req: Request, res: Response) => {
  const wq = store.wrongQuestions.find((w) => w.id === req.params.id);
  if (!wq) return fail('错题不存在', res, 404);
  const body = req.body as RejudgeBody;
  if (!body.newStatus || body.newScore === undefined || !body.operator) {
    return fail('缺少必要参数: newStatus, newScore, operator', res);
  }
  const record = rejudge(
    req.params.id,
    body.newStatus,
    body.newScore,
    body.operator,
    body.sources || [],
    body.comment,
    body.isTemporary ?? false,
    body.noteIds || [],
  );

  if (body.noteIds && body.noteIds.length > 0) {
    for (const nid of body.noteIds) {
      const note = store.notes.find((n) => n.id === nid);
      if (note && !note.affectedJudgmentIds.includes(record.id)) {
        note.affectedJudgmentIds.push(record.id);
      }
    }
  }

  ok({ judgment: record, trace: traceJudgment(record.id) }, res);
});

interface AddNoteBody {
  content: string;
  operator: Operator;
}

app.post('/api/wrong-questions/:id/notes', (req: Request, res: Response) => {
  const wq = store.wrongQuestions.find((w) => w.id === req.params.id);
  if (!wq) return fail('错题不存在', res, 404);
  const body = req.body as AddNoteBody;
  if (!body.content || !body.operator) {
    return fail('缺少必要参数: content, operator', res);
  }
  const note = addNote(req.params.id, body.content, body.operator);
  ok(note, res);
});

app.get('/api/notes/:id/impact', (req: Request, res: Response) => {
  const impact = getNoteImpact(req.params.id);
  if (!impact) return fail('备注不存在', res, 404);
  ok(impact, res);
});

interface WithdrawBody {
  operator: Operator;
}

app.post('/api/judgments/:id/withdraw', (req: Request, res: Response) => {
  const body = req.body as WithdrawBody;
  if (!body.operator) return fail('缺少 operator 参数', res);

  const target = store.judgments.find((j) => j.id === req.params.id);
  if (!target) return fail(`判题记录 ${req.params.id} 不存在`, res, 404);
  if (target.status === 'withdrawn') return fail(`判题记录 ${req.params.id} 已经是撤回状态，不可重复撤回`, res);
  if (target.supersededBy) return fail(`判题记录 ${req.params.id} 已被撤回记录 ${target.supersededBy} 取代，不可重复撤回`, res);

  const withdrawn = withdrawJudgment(req.params.id, body.operator);
  if (!withdrawn) return fail('撤回失败：内部状态异常', res, 500);
  ok({ judgment: withdrawn, supersededOriginal: req.params.id }, res);
});

app.post('/api/judgments/:id/recalculate', (req: Request, res: Response) => {
  const target = store.judgments.find((j) => j.id === req.params.id);
  if (!target) return fail(`判题记录 ${req.params.id} 不存在，无法复算`, res, 404);
  if (target.status !== 'withdrawn') return fail(`判题记录 ${req.params.id} 不是撤回状态，复算应针对撤回记录执行`, res);
  const result = recalculateWithWithdrawal(req.params.id);
  ok(result, res);
});

app.post('/api/wrong-questions/:id/extrapolation-check', (req: Request, res: Response) => {
  const wq = store.wrongQuestions.find((w) => w.id === req.params.id);
  if (!wq) return fail('错题不存在', res, 404);
  const latest = getLatestJudgment(req.params.id);
  if (!latest) return fail('该错题暂无判题记录', res, 400);
  const alert = checkExtrapolation(req.params.id, latest.id);
  ok({ alert, latestJudgmentId: latest.id }, res);
});

app.get('/api/extrapolation-alerts', (_req: Request, res: Response) => {
  ok(store.extrapolationAlerts, res);
});

app.get('/api/audit-log', (_req: Request, res: Response) => {
  const sorted = [...store.auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  ok(sorted, res);
});

app.get('/api/stats', (_req: Request, res: Response) => {
  ok(
    {
      chart: computeTotals('chart'),
      detail: computeTotals('detail'),
      totalWrongQuestions: store.wrongQuestions.length,
      totalJudgments: store.judgments.length,
      totalNotes: store.notes.length,
      totalAlerts: store.extrapolationAlerts.filter((a) => !a.resolved).length,
      temporaryDecisions: store.judgments.filter((j) => j.isTemporary && j.status !== 'withdrawn' && !j.supersededBy)
        .length,
    },
    res,
  );
});

app.get('/api/recalculations', (_req: Request, res: Response) => {
  ok(store.recalculationResults, res);
});

app.listen(PORT, () => {
  console.log(`组合计数错题复盘系统已启动: http://localhost:${PORT}`);
});
