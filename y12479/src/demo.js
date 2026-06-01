const EvacuationGame = require('./game')
const { MATERIAL_TYPES } = require('./constants')
const { exitCongestionExamples } = require('./testMaterials')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function demo1_errorFeedback() {
  console.log('\n' + '='.repeat(60))
  console.log('🎯 演示1: 详细错误反馈系统')
  console.log('   不只看到分数，明白错在哪里')
  console.log('='.repeat(60))
  await sleep(1000)

  const game = new EvacuationGame({
    audienceCount: 100,
    exitDensityThreshold: 3,
    broadcastCooldown: 15,
    requiredEquipmentColumns: 3
  })

  game.setupBoard('standard')
  game.board.exits = []
  for (let y = 0; y < game.board.height; y++) {
    for (let x = 0; x < game.board.width; x++) {
      const cell = game.board.getCell(y, x)
      if (cell && cell.type === 'exit') {
        cell.type = 'wall'
      }
    }
  }
  game.board.addExit(game.board.height - 1, Math.floor(game.board.width / 2))
  
  game.addEquipment(1, 2)
  game.addEquipment(1, 5)
  game.spawnAudiences(100)

  game.start()
  game.sendBroadcast('疏散开始', 1)
  game.sendBroadcast('请快速移动', 5)

  while (game.state === 'running') {
    game.step()
  }

  console.log('\n📊 最终报告:')
  console.log(`   得分: ${game.score}`)
  console.log(`   错误数: ${game.errors.length}`)
  
  for (const error of game.errors) {
    console.log(`\n   ❌ ${error.title}`)
    console.log(`      发生时间: 第 ${error.timeStep} 步`)
    console.log(`      问题说明: ${error.description}`)
    console.log(`      改进建议: ${error.suggestion}`)
    console.log(`      实际影响: ${error.impact}`)
  }
}

async function demo2_remedyMode() {
  console.log('\n' + '='.repeat(60))
  console.log('🔧 演示2: 设备车补救模式')
  console.log('   缺列不整批失败，给安保老师补材料的机会')
  console.log('='.repeat(60))
  await sleep(1000)

  const game = new EvacuationGame({
    requiredEquipmentColumns: 3
  })

  game.setupBoard('standard')
  game.addEquipment(1, 2)
  game.spawnAudiences(30)

  console.log('\n尝试启动游戏（只配置了1列设备，需要3列）:')
  const started = game.start()
  
  if (!started && game.state === 'remedy') {
    console.log('\n进入补救模式，补充设备列:')
    game.remedyEquipment(1)
    console.log('还缺1列，继续补充...')
    game.remedyEquipment(1)
    
    console.log('\n设备配置完成，恢复游戏:')
    game.resumeFromRemedy()

    while (game.state === 'running') {
      game.step()
    }
  }
}

async function demo3_cleanState() {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 演示3: 暂停重开状态干净')
  console.log('   人流模拟和回放记录无残影')
  console.log('='.repeat(60))
  await sleep(1000)

  const game = new EvacuationGame({ audienceCount: 20 })
  game.setupBoard('standard')
  game.addEquipment(1, 2)
  game.addEquipment(1, 5)
  game.addEquipment(1, 8)
  game.spawnAudiences(20)

  console.log('\n第一次运行:')
  game.start()
  for (let i = 0; i < 10; i++) game.step()
  console.log(`   运行步数: ${game.timeStep}`)
  console.log(`   已疏散: ${game.getExitedCount()} 人`)
  console.log(`   回放记录数: ${game.playbackHistory.length}`)

  console.log('\n重置游戏...')
  game.reset()
  console.log(`   重置后步数: ${game.timeStep}`)
  console.log(`   重置后错误: ${game.errors.length}`)
  console.log(`   重置后回放: ${game.playbackHistory.length}`)
  console.log(`   观众状态: 全部 waiting`)

  console.log('\n重新运行:')
  game.start()
  while (game.state === 'running') game.step()
  console.log(`   最终疏散: ${game.getExitedCount()} 人`)
  console.log(`   最终得分: ${game.score}`)
}

async function demo4_exitCongestion() {
  console.log('\n' + '='.repeat(60))
  console.log('🚪 演示4: 出口拥堵样例与双向追溯')
  console.log('   从观众查到结果，反查回出口')
  console.log('='.repeat(60))
  await sleep(1000)

  const example = exitCongestionExamples[0]
  console.log(`\n样例: ${example.name}`)
  console.log(`说明: ${example.description}`)

  const game = new EvacuationGame(example.config)
  example.setup(game)
  game.runFullSimulation()

  const audienceId = 0
  console.log(`\n🔍 从观众 #${audienceId} 查到结果:`)
  const trace = game.getAudienceTrace(audienceId)
  console.log(`   起始位置: (${trace[0].y}, ${trace[0].x}) 第${trace[0].time}步`)
  console.log(`   结束位置: (${trace[trace.length-1].y}, ${trace[trace.length-1].x}) 第${trace[trace.length-1].time}步`)
  console.log(`   总步数: ${trace.length}`)

  const exit = game.board.exits[0]
  console.log(`\n🔍 从出口 (${exit.y}, ${exit.x}) 反查回观众:`)
  const audiences = game.traceBackFromExit(exit.y, exit.x)
  console.log(`   该出口共疏散: ${audiences.length} 人`)
  console.log(`   前3名通过的观众:`)
  for (let i = 0; i < Math.min(3, audiences.length); i++) {
    console.log(`     观众 #${audiences[i].audienceId}: 第${audiences[i].exitTime}步通过`)
  }
}

async function demo5_separateReports() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 演示5: 材料分类报告')
  console.log('   顺利材料、广播冷却材料分开统计')
  console.log('='.repeat(60))
  await sleep(1000)

  const ReportGenerator = require('./reportGenerator')
  const reportGenerator = new ReportGenerator()

  console.log('\n运行【顺利材料】测试...')
  const game1 = new EvacuationGame({ audienceCount: 30 })
  game1.setMaterialType(MATERIAL_TYPES.SMOOTH)
  game1.setupBoard('standard')
  game1.addEquipment(1, 2)
  game1.addEquipment(1, 5)
  game1.addEquipment(1, 8)
  game1.spawnAudiences(30)
  game1.runFullSimulation()
  const report1 = game1.generateReport()
  report1.name = '顺利材料-标准'
  reportGenerator.addReport(report1, MATERIAL_TYPES.SMOOTH)

  console.log('\n运行【广播冷却材料】测试...')
  const game2 = new EvacuationGame({ audienceCount: 30, broadcastCooldown: 15 })
  game2.setMaterialType(MATERIAL_TYPES.BROADCAST)
  game2.setupBoard('standard')
  game2.addEquipment(1, 2)
  game2.addEquipment(1, 5)
  game2.addEquipment(1, 8)
  game2.spawnAudiences(30)
  game2.start()
  game2.sendBroadcast('广播1', 1)
  game2.sendBroadcast('广播2', 5)
  while (game2.state === 'running') game2.step()
  const report2 = game2.generateReport()
  report2.name = '广播材料-冷却不足'
  reportGenerator.addReport(report2, MATERIAL_TYPES.BROADCAST)

  console.log('\n' + '-'.repeat(50))
  console.log('📊 分类报告汇总:')
  reportGenerator.printSummary()
}

async function main() {
  console.log(`
🎮 音乐会场疏散棋 - 功能演示
====================================================
`)
  
  await demo1_errorFeedback()
  await sleep(1500)
  
  await demo2_remedyMode()
  await sleep(1500)
  
  await demo3_cleanState()
  await sleep(1500)
  
  await demo4_exitCongestion()
  await sleep(1500)
  
  await demo5_separateReports()

  console.log('\n' + '='.repeat(60))
  console.log('✅ 所有演示完成！')
  console.log('   运行 npm test 执行完整测试套件')
  console.log('='.repeat(60) + '\n')
}

main()
