import express from 'express';
import { db } from './database/connection';
import routes from './api/routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

async function startServer() {
  try {
    await db.init();
    console.log('数据库初始化完成');

    app.listen(PORT, () => {
      console.log(`
========================================
  酒店前台夜审权限追责台账 API 服务
  服务地址: http://localhost:${PORT}
  API 前缀: http://localhost:${PORT}/api
========================================
      `);
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

startServer();
