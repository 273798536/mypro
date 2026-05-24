const path = require('path');
const fs = require('fs');
const sequelize = require('../src/config/database');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    require('../src/models');
    await sequelize.query('PRAGMA foreign_keys = OFF');
    await sequelize.sync({ force: true });
    await sequelize.query('PRAGMA foreign_keys = ON');
    console.log('数据库初始化完成！');
    console.log('已创建表:', (await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'", { type: 'SELECT' })).map(r => r.name));
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
