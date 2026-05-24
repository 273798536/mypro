import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './config/database';
import { initUsers, initSampleData } from './config/initData';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import recordRoutes from './routes/records';
import exportRoutes from './routes/export';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '投标资料封版权限追责台账 API 运行正常' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/export', exportRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

const startServer = async () => {
  try {
    await initDatabase();
    console.log('数据库初始化完成');
    await initUsers();
    console.log('用户数据初始化完成');
    await initSampleData();
    console.log('示例数据初始化完成');
    
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  投标资料封版权限追责台账 API`);
      console.log(`  服务运行在 http://localhost:${PORT}`);
      console.log(`========================================\n`);
      console.log(`默认账号:`);
      console.log(`  主管:    manager / manager123`);
      console.log(`  复核:    reviewer / reviewer123`);
      console.log(`  录入:    entry / entry123`);
      console.log(`  只读:    viewer / viewer123\n`);
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
};

startServer();
