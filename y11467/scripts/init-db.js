const db = require('../src/db/database');

async function initDatabase() {
  console.log('='.repeat(50));
  console.log('初始化服装打版样衣重试补偿队列数据库');
  console.log('='.repeat(50));

  try {
    await db.init();
    console.log('✓ 数据库连接成功');

    await db.createTables();
    console.log('✓ 数据表创建成功');

    console.log('\n数据库初始化完成!');
    console.log('数据库文件位置: data/garment_sample.db');
  } catch (error) {
    console.error('✗ 初始化失败:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

initDatabase();
