const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'complaints.db');

if (fs.existsSync(DB_PATH)) {
  console.log('检测到旧数据库，删除中...');
  try { fs.unlinkSync(DB_PATH); } catch (e) {
    console.error('删除失败:', e.message);
    process.exit(1);
  }
}

console.log('开始植入样例数据...');
const init = spawn('node', [path.join(__dirname, 'init-db.js')], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
init.on('close', code => process.exit(code));
