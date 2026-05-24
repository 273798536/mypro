const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   仓内波次缺货回补核算服务                                ║
║   Warehouse Wave Replenishment API                        ║
║                                                           ║
║   服务地址: http://localhost:${PORT}                       ║
║   健康检查: http://localhost:${PORT}/api/health            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
