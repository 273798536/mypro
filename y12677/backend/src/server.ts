import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tunnel-segment-backend' });
});

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
});

export default app;
