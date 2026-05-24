import 'reflect-metadata';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import router from './routes';
import { initDatabase } from './database/data-source';

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`);
  try {
    await next();
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message || 'Internal Server Error'
    };
  }
});

app.use(bodyParser({
  jsonLimit: '10mb',
  formLimit: '10mb'
}));

app.use(router.routes());
app.use(router.allowedMethods());

async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   广告素材投放验收回放链路服务已启动                         ║
║   Ad Material Audit Replay Service                         ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                        ║
║   健康检查: http://localhost:${PORT}/health                  ║
║                                                            ║
║   API 文档:                                                 ║
║   - GET    /api/batches              - 获取批次列表         ║
║   - POST   /api/batches              - 创建批次            ║
║   - POST   /api/batches/:id/materials - 添加素材           ║
║   - POST   /api/batches/:id/submit   - 提交批次            ║
║   - POST   /api/batches/:id/freeze   - 冻结批次            ║
║   - POST   /api/materials/audit      - 添加审核结果        ║
║   - POST   /api/materials/cost       - 添加花费日报        ║
║   - POST   /api/materials/remark     - 添加客服备注        ║
║   - GET    /api/audit/report/:id     - 获取对账报告        ║
║   - POST   /api/audit/export/:id     - 导出批次数据        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();
