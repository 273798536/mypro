import express from 'express';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 3200;

app.use(express.json());

app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sidepocket-estimation' });
});

app.listen(PORT, () => {
  console.log(`私募侧袋份额估算服务已启动: http://localhost:${PORT}`);
  console.log(`API 基础路径: http://localhost:${PORT}/api`);
  console.log(`健康检查:     http://localhost:${PORT}/health`);
});
