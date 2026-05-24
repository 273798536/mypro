import { Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { processQueueItem } from '../services/compensationQueueService';

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null
});

const worker = new Worker(
  'signin-compensation',
  async (job) => {
    console.log(`🔄 开始处理任务: ${job.id}`);
    
    switch (job.name) {
      case 'process-signin':
        await processQueueItem(job.data.queueId);
        break;
      default:
        console.log(`⚠️  未知任务类型: ${job.name}`);
    }
    
    console.log(`✅ 任务完成: ${job.id}`);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000
    }
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Worker完成任务: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Worker任务失败: ${job?.id}, 错误: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('❌ Worker错误:', err);
});

process.on('SIGTERM', async () => {
  console.log('🔴 收到关闭信号，停止Worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔴 收到中断信号，停止Worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

export default worker;
