/**
 * local server entry file, for local development
 */
import app from './app.js';
import { initDb } from './db.js';
import { seedIfEmpty } from './services/reviewService.js';

// 初始化数据库（建表/迁移），首次为空时自动播种示例数据
initDb();
const seeded = seedIfEmpty();
if (seeded) {
  console.log(`[seed] 首次启动已自动导入示例数据：${seeded.imported} 条（版本 sample）`);
}

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;