import 'reflect-metadata';
import dotenv from 'dotenv';
import express from 'express';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import compensationRoutes from './routes/compensation';
import reportRoutes from './routes/report';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/compensation', compensationRoutes);
app.use('/api/report', reportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
