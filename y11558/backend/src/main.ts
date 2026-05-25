import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import prisma from './lib/prisma.js';
import { auditService } from './services/audit.service.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startTime = Date.now();
  const { method, url } = req;
  let requestBody = '';
  let responseBody = '';

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = ((chunk: any, ...args: any[]) => {
    if (Buffer.isBuffer(chunk)) {
      responseBody += chunk.toString('utf8');
    } else if (typeof chunk === 'string') {
      responseBody += chunk;
    }
    return originalWrite(chunk, ...args);
  }) as typeof res.write;

  res.end = ((chunk: any, ...args: any[]) => {
    if (Buffer.isBuffer(chunk)) {
      responseBody += chunk.toString('utf8');
    } else if (typeof chunk === 'string') {
      responseBody += chunk;
    }
    return originalEnd(chunk, ...args);
  }) as typeof res.end;

  if (req.body) {
    try {
      requestBody = JSON.stringify(req.body);
    } catch {
      requestBody = '';
    }
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const chainId = (req.headers['x-chain-id'] as string) || undefined;

    if (url.startsWith('/api/v1/')) {
      const maxLen = 2000;
      const log = {
        method,
        url,
        statusCode: res.statusCode,
        duration,
        requestBody: requestBody ? requestBody.slice(0, maxLen) : undefined,
        responseBody: responseBody ? responseBody.slice(0, maxLen) : undefined,
        chainId,
      };
      auditService.logHttp(
        log.method, log.url, log.statusCode, log.duration,
        log.requestBody, log.responseBody, log.chainId,
      ).catch((err) => console.error('HTTP日志持久化失败:', err));
    }

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
