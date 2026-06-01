const EvacuationGame = require('../src/game')
const ReportGenerator = require('../src/reportGenerator')
const { smoothMaterials, broadcastMaterials, exitCongestionExamples } = require('../src/testMaterials')
const { MATERIAL_TYPES } = require('../src/constants')

const args = process.argv.slice(2)
const testType = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'all'

function runSmoothTests(reportGenerator) {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 开始运行【顺利材料】测试')
  console.log('='.repeat(60))

  for (const material of smoothMaterials) {
    console.log(`\n📦 测试材料: ${material.name}`)
    console.log(`   ${material.description}`)
    
    const game = new EvacuationGame({
      audienceCount: material.audienceCount,
      exitDensityThreshold: material.exitDensityThreshold
    })
    
    game.setMaterialType(MATERIAL_TYPES.SMOOTH)
    material.setup(game)
    
    game.runFullSimulation()
    
    const report = game.generateReport()
    report.name = material.name
    reportGenerator.addReport(report, MATERIAL_TYPES.SMOOTH)
  }
}

function runBroadcastTests(reportGenerator) {
  console.log('\n' + '='.repeat(60))
  console.log('📻 开始运行【广播冷却材料】测试')
  console.log('='.repeat(60))

  for (const material of broadcastMaterials) {
    console.log(`\n📦 测试材料: ${material.name}`)
    console.log(`   ${material.description}`)
    
    const game = new EvacuationGame({
      audienceCount: material.audienceCount,
      broadcastCooldown: material.broadcastCooldown || 15
    })
    
    game.setMaterialType(MATERIAL_TYPES.BROADCAST)
    material.setup(game)
    
    if (material.run) {
      material.run(game)
    } else {
      game.runFullSimulation()
    }
    
    const report = game.generateReport()
    report.name = material.name
    reportGenerator.addReport(report, MATERIAL_TYPES.BROADCAST)
  }
}

function runExitCongestionExamples() {
  console.log('\n' + '='.repeat(60))
  console.log('🚪 出口拥堵样例演示')
  console.log('='.repeat(60))

  for (const example of exitCongestionExamples) {
    console.log(`\n📦 样例: ${example.name}`)
    console.log(`   ${example.description}`)
    
    const game = new EvacuationGame(example.config)
    example.setup(game)
    
    console.log('\n   初始棋盘状态:')
    game.board.print()
    
    game.runFullSimulation()
    
    console.log('\n   🔍 验收验证:')
    console.log('   从观众棋子查到结果:')
    const sampleAudience = game.audiences[0]
    if (sampleAudience) {
      const trace = game.getAudienceTrace(sampleAudience.id)
      console.log(`     观众 #${sampleAudience.id}:`)
      console.log(`       起始位置: (${trace[0]?.y}, ${trace[0]?.x})`)
      console.log(`       结束位置: (${trace[trace.length - 1]?.y}, ${trace[trace.length - 1]?.x})`)
      console.log(`       疏散时间: ${trace.length} 步`)
    }
    
    console.log('\n   从出口反查回观众:')
    const mainExit = game.board.exits[0]
    if (mainExit) {
      const audiencesAtExit = game.traceBackFromExit(mainExit.y, mainExit.x)
      console.log(`     出口 (${mainExit.y}, ${mainExit.x}):`)
      console.log(`       通过人数: ${audiencesAtExit.length} 人`)
      if (audiencesAtExit.length > 0) {
        console.log(`       首个通过: 观众 #${audiencesAtExit[0].audienceId}, 时间: 第${audiencesAtExit[0].exitTime}步`)
      }
    }
  }
}

function main() {
  const reportGenerator = new ReportGenerator()

  console.log('\n🎮 音乐会场疏散棋 - 测试系统')
  console.log('='.repeat(60))

  if (testType === 'all' || testType === 'smooth') {
    runSmoothTests(reportGenerator)
  }

  if (testType === 'all' || testType === 'broadcast') {
    runBroadcastTests(reportGenerator)
  }

  if (testType === 'all' || testType === 'examples') {
    runExitCongestionExamples()
  }

  reportGenerator.printSummary()
  
  if (testType === 'all') {
    reportGenerator.exportToJSON('./test-report.json')
  }
}

main()
