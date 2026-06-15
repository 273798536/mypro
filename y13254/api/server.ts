import 'dotenv/config';
import app from './app';
import { initDB } from './lib/db';
import { seed } from './seed';
import { getSnapshotDb } from './lib/snapshot';

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  initDB();
  seed();
  try {
    await getSnapshotDb();
  } catch (e) {
    console.warn('[snapshot] 初始化快照失败，继续启动:', e instanceof Error ? e.message : e);
  }

  const server = app.listen(PORT, () => {
    console.log(`后端服务已启动：http://localhost:${PORT}`);
    console.log(`健康检查：http://localhost:${PORT}/api/health`);
    console.log(`上传目录静态访问：http://localhost:${PORT}/uploads/`);
  });

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
}

bootstrap().catch((e) => {
  console.error('启动失败：', e);
  process.exit(1);
});

export default app;
