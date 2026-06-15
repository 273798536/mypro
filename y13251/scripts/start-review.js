#!/usr/bin/env node
import { spawn } from 'node:child_process'

console.log('\n' + '='.repeat(60))
console.log('🏮 夜市外摆容量复核 - 启动复核工作台')
console.log('='.repeat(60) + '\n')
console.log('📋 阿宁，今天轮到你做"夜市外摆容量复核"啦～')
console.log('🔍 建议先看异常队列，优先处理重复投诉的高危项\n')

const args = process.argv.slice(2)
const openBrowser = !args.includes('--no-open')

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

child.on('error', (err) => {
  console.error('❌ 启动失败，请先执行：npm install\n', err.message)
  process.exit(1)
})

setTimeout(() => {
  console.log('\n' + '─'.repeat(60))
  console.log('✅ 启动指令已发出')
  console.log('🌐 浏览器打开：http://localhost:5173/#/review')
  console.log('📦 推荐的复核流程：')
  console.log('   1️⃣  查看「异常队列」，优先处理高危的重复投诉项')
  console.log('   2️⃣  回到「复核工作台」→ 从 GIS 地图选红色标记点位')
  console.log('   3️⃣  核对旧版意见（不会被新表盖掉），填写人工备注')
  console.log('   4️⃣  遇到重复投诉 → 先填写"待确认原因+影响范围"再往下走')
  console.log('   5️⃣  补录现场照片 → 系统自动在地图点位和异常队列标注改动')
  console.log('   6️⃣  周一早会前切到「历史复盘」页，给主管解释前后变化')
  console.log('─'.repeat(60) + '\n')
}, 500)
