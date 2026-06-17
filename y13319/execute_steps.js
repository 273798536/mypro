const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = '/Users/mac/pro/solo/workspaces/y13319'
const backDir = path.join(root, 'backend')
const frontDir = path.join(root, 'frontend')
const resultLog = path.join(root, 'steps_result.log')

function log(msg) {
  const line = `[${new Date().toLocaleString()}] ${msg}`
  console.log(line)
  fs.appendFileSync(resultLog, line + '\n')
}

function runStep(stepNum, desc, cmd, cwd) {
  log(`========== 步骤 ${stepNum} - ${desc} ==========`)
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf8', timeout: 600000, maxBuffer: 50 * 1024 * 1024 })
    log(`✅ 步骤 ${stepNum} 执行成功`)
    log('输出:')
    const lines = output.split('\n').filter(l => l.trim())
    const tailLines = lines.slice(-15)
    tailLines.forEach(l => log('  ' + l))
    return { success: true, output }
  } catch (e) {
    log(`❌ 步骤 ${stepNum} 执行失败: ${e.message}`)
    if (e.stdout) {
      log('stdout:')
      const lines = e.stdout.toString().split('\n').filter(l => l.trim()).slice(-15)
      lines.forEach(l => log('  ' + l))
    }
    if (e.stderr) {
      log('stderr:')
      const lines = e.stderr.toString().split('\n').filter(l => l.trim()).slice(-15)
      lines.forEach(l => log('  ' + l))
    }
    return { success: false, error: e.message }
  }
}

async function main() {
  fs.writeFileSync(resultLog, '')

  log('开始执行所有步骤...')

  // 步骤 1 - 后端依赖安装
  runStep(1, '后端依赖安装', 'npm install --no-audit --no-fund', backDir)

  // 步骤 2 - 前端依赖安装
  runStep(2, '前端依赖安装', 'npm install --no-audit --no-fund', frontDir)

  // 步骤 3 - 初始化数据库种子
  runStep(3, '初始化数据库种子', 'node src/seed.js', backDir)

  // 步骤 4 - 启动后端服务（后台运行，端口3001）
  log('========== 步骤 4 - 启动后端服务（后台运行，端口3001） ==========')
  try {
    const backLog = fs.openSync('/tmp/vision_back.log', 'w')
    const backProc = spawn('node', ['src/server.js'], {
      cwd: backDir,
      detached: true,
      stdio: ['ignore', backLog, backLog]
    })
    backProc.unref()
    log(`✅ 后端启动成功，PID: ${backProc.pid}`)
  } catch (e) {
    log(`❌ 后端启动失败: ${e.message}`)
  }

  // 步骤 5 - 启动前端服务（后台运行，端口5173）
  log('========== 步骤 5 - 启动前端服务（后台运行，端口5173） ==========')
  try {
    const frontLog = fs.openSync('/tmp/vision_front.log', 'w')
    const frontProc = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
      cwd: frontDir,
      detached: true,
      stdio: ['ignore', frontLog, frontLog]
    })
    frontProc.unref()
    log(`✅ 前端启动成功，PID: ${frontProc.pid}`)
  } catch (e) {
    log(`❌ 前端启动失败: ${e.message}`)
  }

  // 步骤 6 - 等待10秒，检查两个服务
  log('========== 步骤 6 - 等待10秒，检查两个服务 ==========')
  log('等待10秒...')
  await new Promise(r => setTimeout(r, 10000))

  try {
    const backHealth = execSync('curl -s http://localhost:3001/api/health', { encoding: 'utf8', timeout: 10000 })
    log(`后端健康检查: ${backHealth}`)
  } catch (e) {
    log(`后端健康检查失败: ${e.message}`)
  }

  try {
    const frontStatus = execSync('curl -s -o /dev/null -w "前端HTTP状态: %{http_code}\\n" http://localhost:5173/', { encoding: 'utf8', timeout: 10000 })
    log(frontStatus.trim())
  } catch (e) {
    log(`前端检查失败: ${e.message}`)
  }

  log('后端日志最后10行:')
  try {
    if (fs.existsSync('/tmp/vision_back.log')) {
      const backLogContent = fs.readFileSync('/tmp/vision_back.log', 'utf8')
      const lines = backLogContent.split('\n').filter(l => l.trim()).slice(-10)
      lines.forEach(l => log('  ' + l))
    } else {
      log('  后端日志文件不存在')
    }
  } catch (e) {
    log(`  读取后端日志失败: ${e.message}`)
  }

  log('前端日志最后10行:')
  try {
    if (fs.existsSync('/tmp/vision_front.log')) {
      const frontLogContent = fs.readFileSync('/tmp/vision_front.log', 'utf8')
      const lines = frontLogContent.split('\n').filter(l => l.trim()).slice(-10)
      lines.forEach(l => log('  ' + l))
    } else {
      log('  前端日志文件不存在')
    }
  } catch (e) {
    log(`  读取前端日志失败: ${e.message}`)
  }

  log('========== 所有步骤执行完成 ==========')
}

main()
