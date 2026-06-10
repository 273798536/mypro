import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { initializeDatabase } from './data-source';
import apiRoutes from './routes/api';
import { initializeSampleData } from './services/sampleDataService';
import * as fs from 'fs';

const PORT = process.env.PORT || 3001;
const app = express();

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', apiRoutes);

const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function startServer() {
  try {
    await initializeDatabase();
    await initializeSampleData('system');
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     细菌耐药谱看板 - 后端服务已启动                        ║
╠════════════════════════════════════════════════════════════╣
║  服务地址: http://localhost:${PORT}                         ║
║  API文档:  http://localhost:${PORT}/api/health              ║
║  数据库:   SQLite (文件存储)                               ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
