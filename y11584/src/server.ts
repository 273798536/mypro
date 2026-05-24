import { initializeApp } from './app';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const app = await initializeApp();
    app.listen(PORT, () => {
      console.log(`门店会员储值权限追责台账 API 服务已启动`);
      console.log(`服务端口: ${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('服务启动失败:', err);
    process.exit(1);
  }
}

startServer();
