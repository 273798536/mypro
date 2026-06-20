import express from 'express';
import cors from 'cors';
import path from 'path';

import tasksRouter from './routes/tasks';
import evidencesRouter from './routes/evidences';
import judgmentsRouter from './routes/judgments';
import featureDelaysRouter from './routes/featureDelays';
import paramChangesRouter from './routes/paramChanges';
import materialLinksRouter from './routes/materialLinks';
import resultsRouter from './routes/results';
import comparisonRouter from './routes/comparison';
import exportRouter from './routes/export';
import handoverRouter from './routes/handover';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/tasks', tasksRouter);
app.use('/api/evidences', evidencesRouter);
app.use('/api/judgments', judgmentsRouter);
app.use('/api/feature-delays', featureDelaysRouter);
app.use('/api/param-changes', paramChangesRouter);
app.use('/api/material-links', materialLinksRouter);
app.use('/api/results', resultsRouter);
app.use('/api/comparison', comparisonRouter);
app.use('/api/export', exportRouter);
app.use('/api/handover', handoverRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../../client/dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});
