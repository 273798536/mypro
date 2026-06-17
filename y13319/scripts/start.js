const { spawn, exec } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.join(__dirname, '..')
const backendDir = path.join(root, 'backend')
const frontendDir = path.join(root, 'frontend')
const dbPath = path.join(backendDir, 'data', 'vision.db')

function log(prefix, color) {
  return (data) => {
    const str = data.toString().trim()
    if (str) console.log(`\x1b[${color}m[${prefix}]\x1b[0m ${str}`)
  }
}

async function step(msg, fn) {
  process.stdout.write(`\x1b[36m▶ ${msg}... \x1b[0m`)
  try {
    await fn()
    console.log('\x1b[32m✅\x1b[0m')
  } catch (e) {
    console.log(`\x1b[31m❌ ${e.message}\x1b[0m`)
    process.exit(1)
  }
}

function execCmd(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, maxBuffer: 200 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

async function main() {
  console.log('\x1b[35m╔════════════════════════════════════════════╗\x1b[0m')
  console.log('\x1b[35m║     工业视觉指标看板 - 一键启动脚本         ║\x1b[0m')
  console.log('\x1b[35m╚════════════════════════════════════════════╝\x1b[0m')
  console.log()

  const backNodeMods = path.join(backendDir, 'node_modules')
  const frontNodeMods = path.join(frontendDir, 'node_modules')
  const needInstall = !fs.existsSync(backNodeMods) || !fs.existsSync(frontNodeMods)

  if (needInstall) {
    await step('首次启动，安装后端依赖（约1-3分钟）', () =>
      execCmd('npm install --no-audit --no-fund --loglevel=error', backendDir))
    await step('安装前端依赖（约2-4分钟）', () =>
      execCmd('npm install --no-audit --no-fund --loglevel=error', frontendDir))
  } else {
    console.log('\x1b[32m✅ 依赖已安装，跳过安装步骤\x1b[0m')
  }

  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 1024 * 10) {
    await step('初始化示例数据（v1.0/v1.1 + 修正+异常）', () =>
      execCmd('npm run seed', backendDir))
  } else {
    console.log('\x1b[32m✅ 数据库已存在，跳过初始化（如需重置：删除 backend/data/vision.db 后重启）\x1b[0m')
  }

  console.log()
  console.log('\x1b[36m▶ 启动后端服务 :3001...\x1b[0m')
  const back = spawn('node', ['src/server.js'], { cwd: backendDir, stdio: 'pipe' })
  back.stdout.on('data', log('BACK', '34'))
  back.stderr.on('data', log('BACK-ERR', '31'))

  await new Promise(r => setTimeout(r, 1500))

  console.log('\x1b[36m▶ 启动前端服务 :5173...\x1b[0m')
  const front = spawn('npx', ['vite', '--host', '0.0.0.0'], { cwd: frontendDir, stdio: 'pipe' })
  front.stdout.on('data', log('FRONT', '32'))
  front.stderr.on('data', log('FRONT-ERR', '31'))

  await new Promise(r => setTimeout(r, 4000))

  console.log()
  console.log('\x1b[35m╔══════════════════════════════════════════════════╗\x1b[0m')
  console.log('\x1b[35m║  🎉 服务启动完成！请在浏览器打开：                 ║\x1b[0m')
  console.log('\x1b[35m║     👉 http://localhost:5173                       ║\x1b[0m')
  console.log('\x1b[35m║                                                    ║\x1b[0m')
  console.log('\x1b[35m║  📁 数据文件: backend/data/vision.db               ║\x1b[0m')
  console.log('\x1b[35m║  🔙 后端:  http://localhost:3001/api/health        ║\x1b[0m')
  console.log('\x1b[35m║  ⏹️  按 Ctrl+C 停止所有服务                         ║\x1b[0m')
  console.log('\x1b[35m╚══════════════════════════════════════════════════╝\x1b[0m')
  console.log()

  process.on('SIGINT', () => {
    console.log('\n\x1b[33m🛑 正在停止服务...\x1b[0m')
    try { back.kill(); front.kill() } catch (e) {}
    setTimeout(() => process.exit(0), 500)
  })
}

main()
