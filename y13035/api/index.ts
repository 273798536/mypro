import express from 'express';
import {
  listBatches,
  getBatch,
  startBatch,
  rerunBatch,
  uploadMaterials,
  getPayments,
  getHistory,
  reviseConclusion,
  exportCSV,
} from './controllers/batchController';

const app = express();
const PORT = 3002;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/batches', listBatches);
app.get('/api/batches/:id', getBatch);
app.post('/api/batches/:id/start', startBatch);
app.post('/api/batches/:id/rerun', rerunBatch);
app.post('/api/batches/:id/materials', uploadMaterials);
app.get('/api/batches/:id/payments', getPayments);
app.get('/api/batches/:id/history', getHistory);
app.post('/api/batches/:id/conclusion', reviseConclusion);
app.get('/api/batches/:id/export', exportCSV);

app.listen(PORT, () => {
  console.log(`[api] HK Tax Review API listening on http://localhost:${PORT}`);
});
