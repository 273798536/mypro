import fs from 'fs';
import path from 'path';
import { createTables } from './schema';
import { insertSampleData } from './sampleData';

const dataDir = path.join(__dirname, '../../data');

const initDatabase = async (): Promise<void> => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('创建数据目录:', dataDir);
    }

    console.log('开始创建数据库表...');
    await createTables();
    console.log('数据库表创建完成');

    console.log('开始插入样例数据...');
    await insertSampleData();
    console.log('数据库初始化完成!');

    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

initDatabase();
