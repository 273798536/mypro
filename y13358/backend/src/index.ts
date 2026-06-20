import express, { Request, Response } from 'express';
import cors from 'cors';
import { initSchema } from './schema';
import {
  RunRepository,
  FeatureSnapshotRepository,
  RunSnapshotLinkRepository,
  SampleRepository,
  JudgmentRepository,
  ComparisonRepository
} from './repositories';
import { DecisionEngine } from './decisionEngine';

const app = express();
app.use(cors());
app.use(express.json());

initSchema();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  };
}

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', service: 'feature-lineage-cost-dashboard' });
});

app.get('/api/runs', asyncHandler(async (_req, res) => {
  const runs = RunRepository.list();
  res.json(runs);
}));

app.get('/api/runs/:runId', asyncHandler(async (req, res) => {
  const run = RunRepository.get(req.params.runId);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  res.json(run);
}));

app.get('/api/runs/:runId/check-duplicate', asyncHandler(async (req, res) => {
  const result = RunRepository.checkDuplicate(req.params.runId);
  if (result.exists && result.originalRun) {
    const snapshots = FeatureSnapshotRepository.getByRun(result.originalRun.run_id);
    res.json({
      exists: true,
      original_run: result.originalRun,
      original_snapshots: snapshots
    });
  } else {
    res.json({ exists: false });
  }
}));

app.post('/api/runs', asyncHandler(async (req, res) => {
  const run = RunRepository.create(req.body);
  res.status(201).json(run);
}));

app.get('/api/feature-snapshots', asyncHandler(async (_req, res) => {
  const snapshots = FeatureSnapshotRepository.list();
  res.json(snapshots);
}));

app.get('/api/feature-snapshots/:snapshotId', asyncHandler(async (req, res) => {
  const snapshot = FeatureSnapshotRepository.get(req.params.snapshotId);
  if (!snapshot) { res.status(404).json({ error: 'Snapshot not found' }); return; }
  res.json(snapshot);
}));

app.get('/api/runs/:runId/feature-snapshots', asyncHandler(async (req, res) => {
  const snapshots = FeatureSnapshotRepository.getByRun(req.params.runId);
  res.json(snapshots);
}));

app.post('/api/feature-snapshots', asyncHandler(async (req, res) => {
  const snapshot = FeatureSnapshotRepository.create(req.body);
  res.status(201).json(snapshot);
}));

app.post('/api/runs/:runId/feature-snapshots/:snapshotId/link', asyncHandler(async (req, res) => {
  const { added_by, remark } = req.body;
  RunSnapshotLinkRepository.link(req.params.runId, req.params.snapshotId, added_by, remark);
  res.json({ ok: true });
}));

app.get('/api/feature-snapshots/:snapshotId/notes', asyncHandler(async (req, res) => {
  const notes = FeatureSnapshotRepository.getNotes(req.params.snapshotId);
  res.json(notes);
}));

app.post('/api/feature-snapshots/:snapshotId/notes', asyncHandler(async (req, res) => {
  const note = FeatureSnapshotRepository.addNote(req.body);
  res.status(201).json(note);
}));

app.get('/api/samples', asyncHandler(async (_req, res) => {
  const samples = SampleRepository.list();
  res.json(samples);
}));

app.get('/api/samples/replay', asyncHandler(async (_req, res) => {
  const samples = SampleRepository.listReplaySamples();
  res.json(samples);
}));

app.post('/api/samples', asyncHandler(async (req, res) => {
  const sample = SampleRepository.create(req.body);
  res.status(201).json(sample);
}));

app.get('/api/runs/:runId/judgments', asyncHandler(async (req, res) => {
  const judgments = JudgmentRepository.getByRun(req.params.runId);
  res.json(judgments);
}));

app.get('/api/runs/:runId/judgments/:sampleId', asyncHandler(async (req, res) => {
  const judgment = JudgmentRepository.get(req.params.runId, req.params.sampleId);
  if (!judgment) { res.status(404).json({ error: 'Judgment not found' }); return; }
  res.json(judgment);
}));

app.post('/api/runs/:runId/judgments', asyncHandler(async (req, res) => {
  const judgment = JudgmentRepository.create(req.body);
  res.status(201).json(judgment);
}));

app.put('/api/runs/:runId/judgments/:sampleId/decision', asyncHandler(async (req, res) => {
  const { new_decision, new_reason, changed_by, change_note } = req.body;
  const judgment = JudgmentRepository.updateDecision(
    req.params.runId, req.params.sampleId, new_decision, new_reason, changed_by, change_note
  );
  res.json(judgment);
}));

app.get('/api/runs/:runId/judgments/:sampleId/history', asyncHandler(async (req, res) => {
  const history = JudgmentRepository.getHistory(req.params.runId, req.params.sampleId);
  res.json(history);
}));

app.get('/api/compare-runs', asyncHandler(async (req, res) => {
  const { base, compare } = req.query as { base: string; compare: string };
  if (!base || !compare) {
    res.status(400).json({ error: 'base and compare query params are required' });
    return;
  }
  const result = ComparisonRepository.compareRuns(base, compare);
  res.json(result);
}));

app.get('/api/runs/:runId/suggestions', asyncHandler(async (req, res) => {
  const suggestions = DecisionEngine.analyzeRun(req.params.runId);
  res.json(suggestions);
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`特征血缘成本看板后端服务已启动: http://localhost:${PORT}`);
});

export default app;
