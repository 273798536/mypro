const { initDatabase } = require('../config/database');

async function initDatabaseSchema() {
  await initDatabase();
  console.log('数据库初始化完成');
}

if (require.main === module) {
  initDatabaseSchema().catch(console.error);
}

module.exports = initDatabaseSchema;
