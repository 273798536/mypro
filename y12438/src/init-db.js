const { initDatabase } = require('./database/db');

try {
  initDatabase();
  console.log('✓ 数据库初始化成功');
} catch (error) {
  console.error('✗ 数据库初始化失败:', error.message);
  process.exit(1);
}
