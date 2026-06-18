const { app } = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('  表结构漂移对比系统');
  console.log('  Schema Drift Compare System');
  console.log('='.repeat(60));
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  状态检查: http://localhost:${PORT}/api/health`);
  console.log(`  API 文档: http://localhost:${PORT}/api`);
  console.log(`  Web 界面: http://localhost:${PORT}/`);
  console.log('='.repeat(60));
});
