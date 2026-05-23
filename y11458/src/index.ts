import * as dotenv from 'dotenv';
import express from 'express';
import * as path from 'path';
import { createRoutes } from './api/routes';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');
const DB_PATH = path.resolve(__dirname, '..', process.env.DB_PATH || './data/aftersales.db');
const EXPORT_DIR = path.resolve(__dirname, '..', process.env.EXPORT_DIR || './exports');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', createRoutes(DB_PATH, EXPORT_DIR));

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  社区团购售后验收回放链路服务');
  console.log('========================================');
  console.log(`服务启动成功，监听端口: ${PORT}`);
  console.log(`数据库路径: ${DB_PATH}`);
  console.log(`导出目录: ${EXPORT_DIR}`);
  console.log('');
  console.log('API 基础路径: http://localhost:' + PORT + '/api');
  console.log('健康检查: http://localhost:' + PORT + '/api/health');
  console.log('');
  console.log('使用以下命令开始测试:');
  console.log('  1. 造数: npm run seed');
  console.log('  2. 启动服务: npm run dev');
  console.log('  3. 查看 curl 命令示例: cat test-curls.md');
  console.log('========================================');
});
