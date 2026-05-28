import app from './app.js';
import { seedDatabase } from './database/seed.js';
import { closeDb, initializeDatabase } from './database/index.js';

async function initDatabase(): Promise<void> {
  try {
    console.log('[Database] 初始化数据库 schema...');
    initializeDatabase();
    console.log('[Database] 数据库 schema 初始化完成');

    console.log('[Database] 检查并初始化 seed 数据...');
    seedDatabase();
    console.log('[Database] Seed 数据处理完成');
  } catch (error) {
    console.error('[Database] 数据库初始化失败:', error);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  await initDatabase();

  const PORT = process.env.PORT || 3001;

  const server = app.listen(PORT, () => {
    console.log(`[Server] Server ready on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  });

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM signal received');
    server.close(() => {
      console.log('[Server] Server closed');
      closeDb();
      console.log('[Server] Database connection closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT signal received');
    server.close(() => {
      console.log('[Server] Server closed');
      closeDb();
      console.log('[Server] Database connection closed');
      process.exit(0);
    });
  });
}

startServer();

export default app;
