import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { runSeed } from './seed.js';
import { ReconciliationRepo, ExceptionQueueRepo, HistoryChangeLogRepo } from './repo.js';
import {
  buildExportRows,
  getExceptionQueueWithRecords,
  getManagerSummary,
  reviewRecord,
} from './services.js';
import { AppropriatenessCaliber, ReconciliationStatus, ReviewConclusion } from './types.js';

initDatabase();
runSeed();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const OPERATOR = '阿敏(资金主管)';

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: '券商适当性口径对账系统' });
});

app.get('/api/reconciliation', (req, res) => {
  const status = req.query.status as ReconciliationStatus | undefined;
  const caliber = req.query.caliber as AppropriatenessCaliber | undefined;
  const conflictOnly = req.query.conflictOnly === 'true';
  const records = ReconciliationRepo.getAll({ status, caliber, conflictOnly });
  res.json(records);
});

app.get('/api/reconciliation/:id', (req, res) => {
  const record = ReconciliationRepo.getById(req.params.id);
  if (!record) return res.status(404).json({ error: '未找到该对账记录' });
  const history = HistoryChangeLogRepo.getByReconciliationId(req.params.id);
  const exception = ExceptionQueueRepo.getByReconciliationId(req.params.id);
  res.json({ record, history, exception });
});

app.post('/api/reconciliation/:id/review', (req, res) => {
  const { conclusion, remark, changeReason, supplementaryMaterials } = req.body as {
    conclusion: ReviewConclusion;
    remark: string;
    changeReason: string;
    supplementaryMaterials?: string[];
  };
  if (!conclusion || !changeReason) {
    return res.status(400).json({ error: '结论和改判原因不能为空' });
  }
  const updated = reviewRecord(
    req.params.id,
    conclusion,
    remark ?? '',
    changeReason,
    OPERATOR,
    supplementaryMaterials,
  );
  if (!updated) return res.status(404).json({ error: '未找到该对账记录' });
  res.json(updated);
});

app.get('/api/exception-queue', (_req, res) => {
  const data = getExceptionQueueWithRecords();
  res.json(data);
});

app.get('/api/manager-summary', (_req, res) => {
  const summary = getManagerSummary();
  res.json(summary);
});

app.get('/api/export', (req, res) => {
  const status = req.query.status as ReconciliationStatus | undefined;
  const caliber = req.query.caliber as AppropriatenessCaliber | undefined;
  const conflictOnly = req.query.conflictOnly === 'true';
  const records = ReconciliationRepo.getAll({ status, caliber, conflictOnly });
  const rows = buildExportRows(records);
  res.json({
    generatedAt: new Date().toISOString(),
    generatedBy: OPERATOR,
    rowCount: rows.length,
    filterApplied: { status, caliber, conflictOnly },
    data: rows,
  });
});

app.listen(PORT, () => {
  console.log(`[券商适当性口径对账] 后端服务已启动: http://localhost:${PORT}`);
});
