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
    await sequelize.sync({ force: true });
    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
