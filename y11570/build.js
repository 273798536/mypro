const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始构建项目...');

try {
  console.log('1. 清理旧的 dist 目录...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  console.log('2. 创建 dist 目录结构...');
  fs.mkdirSync('dist/database', { recursive: true });
  fs.mkdirSync('dist/daos', { recursive: true });
  fs.mkdirSync('dist/services', { recursive: true });
  fs.mkdirSync('dist/state-machine', { recursive: true });
  fs.mkdirSync('dist/types', { recursive: true });
  fs.mkdirSync('dist/scripts', { recursive: true });

  console.log('3. 运行 TypeScript 编译...');
  execSync('npx tsc', { stdio: 'inherit' });

  console.log('4. 复制 schema.sql...');
  fs.copyFileSync('src/database/schema.sql', 'dist/database/schema.sql');

  console.log('5. 检查构建产物...');
  const serverJs = 'dist/server.js';
  if (fs.existsSync(serverJs)) {
    console.log(`✓ ${serverJs} 已生成`);
    const stats = fs.statSync(serverJs);
    console.log(`  文件大小: ${stats.size} 字节`);
  } else {
    console.error(`✗ ${serverJs} 不存在，构建失败`);
    process.exit(1);
  }

  console.log('\n构建完成！可以运行 npm start 启动服务。');
} catch (error) {
  console.error('构建失败:', error.message);
  process.exit(1);
}
