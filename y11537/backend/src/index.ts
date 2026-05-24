import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import router from './routes';
import { testConnection } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '企业培训签到重试补偿系统'
  });
});

async function startServer() {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  数据库连接失败，请检查数据库配置');
  }
  
  app.listen(PORT, () => {
    console.log(`\n🚀 企业培训签到重试补偿系统后端服务启动成功`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    console.log(`🔗 API 前缀: http://localhost:${PORT}/api`);
    console.log(`\n📋 可用接口:`);
    console.log(`   POST /api/auth/login - 用户登录`);
    console.log(`   POST /api/data/registration - 提交报名表`);
    console.log(`   POST /api/data/signin - 提交签到记录`);
    console.log(`   POST /api/data/homework - 提交课后作业`);
    console.log(`   POST /api/data/price-adjustment - 提交手工改价`);
    console.log(`   POST /api/data/history-archive - 导入历史压缩包`);
    console.log(`   GET  /api/queue - 补偿队列列表`);
    console.log(`   GET  /api/queue/stats - 队列统计`);
    console.log(`   GET  /api/reports/signin - 签到报表`);
    console.log(`   GET  /api/reports/failed-records - 失败记录`);
    console.log(`   GET  /api/reports/hrbp-dashboard - HRBP仪表盘`);
  });
}

startServer();

export default app;
