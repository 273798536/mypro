import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null
});

export const signinQueue = new Queue('signin-compensation', {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '5'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.RETRY_DELAY || '300000')
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});

export const queueEvents = new QueueEvents('signin-compensation', { connection });

queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ 任务完成: ${jobId}`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`❌ 任务失败: ${jobId}, 原因: ${failedReason}`);
});

export async function closeQueue() {
  await signinQueue.close();
  await queueEvents.close();
  await connection.quit();
}
