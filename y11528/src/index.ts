import 'reflect-metadata';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeDatabase } from './config/database';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.use('/api', routes);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cross-border-clearance-playback'
  });
});

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   跨境小包清关验收回放链路服务                               ║
║   Cross-border Clearance Playback Service                  ║
║                                                            ║
║   🚀 服务已启动: http://localhost:${PORT}                    ║
║   📊 健康检查: http://localhost:${PORT}/health               ║
║   🔌 API前缀: http://localhost:${PORT}/api                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ 启动服务失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
