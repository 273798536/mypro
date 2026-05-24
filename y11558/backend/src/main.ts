import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import prisma from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startTime = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${method} ${url} ${res.statusCode} - ${duration}ms`);
  });

  next();
});

app.use('/api/v1', routes);

app.use('/exports', express.static('exports'));

app.get('/', (req, res) => {
  res.json({
    name: '农资门店配送验收回放链路 API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/v1/health',
      dashboard: 'GET /api/v1/dashboard/stats',
      materials: 'GET /api/v1/materials',
      chains: 'GET /api/v1/chains',
      'dirty-data': 'GET /api/v1/dirty-data',
    },
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✓ 数据库连接成功');

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   农资门店配送验收回放链路 API 服务已启动                  ║
║                                                          ║
║   服务地址: http://localhost:${PORT}                        ║
║   健康检查: http://localhost:${PORT}/api/v1/health          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
