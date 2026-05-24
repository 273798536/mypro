"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEvents = exports.signinQueue = void 0;
exports.closeQueue = closeQueue;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connection = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null
});
exports.signinQueue = new bullmq_1.Queue('signin-compensation', {
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
exports.queueEvents = new bullmq_1.QueueEvents('signin-compensation', { connection });
exports.queueEvents.on('completed', ({ jobId }) => {
    console.log(`✅ 任务完成: ${jobId}`);
});
exports.queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.log(`❌ 任务失败: ${jobId}, 原因: ${failedReason}`);
});
async function closeQueue() {
    await exports.signinQueue.close();
    await exports.queueEvents.close();
    await connection.quit();
}
//# sourceMappingURL=queue.js.map