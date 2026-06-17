const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

function run(cmd, cwd) {
  console.log(`\x1b[36m▶ ${cmd}\x1b[0m`)
  try {
    execSync(cmd, { cwd, stdio: 'inherit', timeout: 600000 })
  } catch (e) {
    console.error('\x1b[31m失败：', e.message, '\x1b[0m')
    throw e
  }
}

const root = __dirname
const backDir = path.join(root, 'backend')
const frontDir = path.join(root, 'frontend')

console.log('\x1b[35m=== 工业视觉指标看板 - 启动向导 ===\x1b[0m')
console.log()

try {
  if (!fs.existsSync(path.join(backDir, 'node_modules'))) {
    console.log('安装后端依赖...')
    run('npm install --no-audit --no-fund', backDir)
  } else console.log('后端依赖已就绪')

  if (!fs.existsSync(path.join(frontDir, 'node_modules'))) {
    console.log('安装前端依赖...')
    run('npm install --no-audit --no-fund', frontDir)
  } else console.log('前端依赖已就绪')

  const dbFile = path.join(backDir, 'data', 'vision.db')
  if (!fs.existsSync(dbFile) || fs.statSync(dbFile).size < 10000) {
    console.log('初始化示例数据...')
    run('node src/seed.js', backDir)
  } else console.log('数据已存在，跳过初始化')

  console.log()
  console.log('\x1b[32m✅ 所有准备完成。现在手动启动两个服务：\x1b[0m')
  console.log('   窗口1: cd backend && npm start')
  console.log('   窗口2: cd frontend && npm run dev')
  console.log()
  console.log('   然后访问: http://localhost:5173')
} catch (e) {
  process.exit(1)
}
