import express from 'express';
import cors from 'cors';
import samplesRouter from './routes/samples.js';
import playbackRouter from './routes/playback.js';
import evidenceRouter from './routes/evidence.js';
import reviewRouter from './routes/review.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/samples', samplesRouter);
app.use('/api/playback', playbackRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/review', reviewRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
