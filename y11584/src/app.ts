import express from 'express';
import { initDatabase } from './database/schema';
import rechargeRoutes from './routes/rechargeRoutes';
import refundRoutes from './routes/refundRoutes';
import handoverRoutes from './routes/handoverRoutes';
import receiptRoutes from './routes/receiptRoutes';
import auditRoutes from './routes/auditRoutes';
import viewRoutes from './routes/viewRoutes';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/recharges', rechargeRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/views', viewRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

export async function initializeApp() {
  await initDatabase();
  return app;
}

export default app;
