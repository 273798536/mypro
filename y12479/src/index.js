const EvacuationGame = require('./game')
const Board = require('./board')
const Audience = require('./audience')
const ReportGenerator = require('./reportGenerator')
const { 
  CELL_TYPES, 
  AUDIENCE_STATE, 
  ERROR_TYPES, 
  ERROR_MESSAGES,
  GAME_STATE,
  MATERIAL_TYPES
} = require('./constants')
const { 
  smoothMaterials, 
  broadcastMaterials, 
  exitCongestionExamples 
} = require('./testMaterials')

console.log(`
🎮 音乐会场疏散棋 - 安保人员疏散模拟训练系统
====================================================

快速开始:
  1. 运行演示:    npm run demo
  2. 运行全部测试: npm test
  3. 运行顺利材料: npm run test:smooth
  4. 运行广播材料: npm run test:broadcast

核心功能:
  ✅ 详细错误反馈 - 不只给分数，说明错在哪里
  ✅ 设备补救模式 - 缺列不整批失败，可继续补材料
  ✅ 出口拥堵独立检测 - 不影响后续广播冷却、设备阻挡判断
  ✅ 暂停重开干净 - 人流模拟和回放记录无残影
  ✅ 材料分类报告 - 顺利材料、广播冷却材料分开统计
  ✅ 出口拥堵样例 - 可从观众查到结果，反查回出口

====================================================
`)

module.exports = {
  EvacuationGame,
  Board,
  Audience,
  ReportGenerator,
  CELL_TYPES,
  AUDIENCE_STATE,
  ERROR_TYPES,
  ERROR_MESSAGES,
  GAME_STATE,
  MATERIAL_TYPES,
  smoothMaterials,
  broadcastMaterials,
  exitCongestionExamples
}
