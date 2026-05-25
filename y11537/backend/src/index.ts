import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import router from './routes';
import { testConnection } from './db';
import { signinQueue } from './config/queue';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ENABLE_WORKER = process.env.ENABLE_WORKER !== 'false';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '企业培训签到重试补偿系统',
    workerEnabled: ENABLE_WORKER
  });
});

async function startWorker() {
  if (!ENABLE_WORKER) {
    console.log('⚠️  Worker已禁用 (ENABLE_WORKER=false)');
    return;
  }
  
  try {
    const { default: worker } = await import('./workers/signinWorker');
    console.log('✅ 补偿队列Worker启动成功');
    console.log(`   队列名称: signin-compensation`);
    console.log(`   并发数: 5`);
    console.log(`   限流: 100次/分钟`);
  } catch (error) {
    console.error('❌ Worker启动失败:', error);
  }
}

async function startServer() {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  数据库连接失败，请检查数据库配置');
  }
  
  await startWorker();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 企业培训签到重试补偿系统后端服务启动成功`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    console.log(`🔗 API 前缀: http://localhost:${PORT}/api`);
    if (ENABLE_WORKER) {
      console.log(`⚙️  队列Worker: 已启用`);
    }
    console.log(`\n📋 可用接口:`);
    console.log(`   POST /api/auth/login - 用户登录`);
    console.log(`   POST /api/data/registration - 提交报名表`);
    console.log(`   POST /api/data/signin - 提交签到记录`);
    console.log(`   POST /api/data/homework - 提交课后作业`);
    console.log(`   POST /api/data/price-adjustment - 提交手工改价`);
    console.log(`   POST /api/data/history-archive - 导入历史压缩包`);
    console.log(`   GET  /api/queue - 补偿队列列表`);
    console.log(`   GET  /api/queue/stats - 队列统计`);
    console.log(`   POST /api/failed-records/:id/resolve - 解决失败记录`);
    console.log(`   GET  /api/reports/signin - 签到报表`);
    console.log(`   GET  /api/reports/failed-records - 失败记录`);
    console.log(`   GET  /api/reports/hrbp-dashboard - HRBP仪表盘`);
  });
}

startServer();

export default app;
