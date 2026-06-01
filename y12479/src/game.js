const Board = require('./board')
const Audience = require('./audience')
const { 
  GAME_STATE, 
  ERROR_TYPES, 
  ERROR_MESSAGES,
  AUDIENCE_STATE,
  CELL_TYPES,
  MATERIAL_TYPES
} = require('./constants')

class EvacuationGame {
  constructor(config = {}) {
    this.config = {
      boardWidth: config.boardWidth || 20,
      boardHeight: config.boardHeight || 15,
      audienceCount: config.audienceCount || 50,
      maxTimeSteps: config.maxTimeSteps || 200,
      exitDensityThreshold: config.exitDensityThreshold || 8,
      broadcastCooldown: config.broadcastCooldown || 15,
      requiredEquipmentColumns: config.requiredEquipmentColumns || 3,
      ...config
    }
    
    this.board = new Board(this.config.boardWidth, this.config.boardHeight)
    this.audiences = []
    this.state = GAME_STATE.READY
    this.timeStep = 0
    this.errors = []
    this.detectedErrors = new Set()
    this.broadcastTimestamps = []
    this.playbackHistory = []
    this.equipmentColumns = 0
    this.materialType = null
    this.score = 0
  }

  setupBoard(layout = 'standard') {
    if (layout === 'standard') {
      this.board.setupStandardLayout()
    }
    return this
  }

  addEquipment(y, x, type = 'default') {
    this.board.addEquipment(y, x, type)
    this.equipmentColumns++
    return this
  }

  spawnAudiences(count = null) {
    const targetCount = count || this.config.audienceCount
    this.audiences = []
    
    let spawned = 0
    for (let y = 1; y < this.board.height - 1 && spawned < targetCount; y++) {
      for (let x = 0; x < this.board.width && spawned < targetCount; x++) {
        const cell = this.board.getCell(y, x)
        if (cell && cell.type === CELL_TYPES.SEAT && !cell.audience) {
          const priority = Math.random() < 0.1 ? 'special' : 'normal'
          const audience = new Audience(spawned, y, x, priority)
          this.audiences.push(audience)
          cell.audience = audience
          spawned++
        }
      }
    }
    return this
  }

  sendBroadcast(message, timestamp = null) {
    const time = timestamp || this.timeStep
    
    const lastBroadcast = this.broadcastTimestamps.length > 0 
      ? this.broadcastTimestamps[this.broadcastTimestamps.length - 1] 
      : -Infinity
    
    if (time - lastBroadcast < this.config.broadcastCooldown) {
      this.addError(ERROR_TYPES.BROADCAST_DELAY, {
        broadcastTime: time,
        lastBroadcastTime: lastBroadcast,
        cooldown: this.config.broadcastCooldown
      })
    }
    
    this.broadcastTimestamps.push(time)
    return this
  }

  addError(errorType, details = {}) {
    const errorKey = `${errorType}_${JSON.stringify(details)}`
    if (this.detectedErrors.has(errorKey)) {
      return
    }
    
    this.detectedErrors.add(errorKey)
    
    const errorInfo = ERROR_MESSAGES[errorType] || {
      title: '未知错误',
      description: '发生了未定义的错误',
      suggestion: '请检查配置',
      impact: '影响未知'
    }
    
    const error = {
      type: errorType,
      title: errorInfo.title,
      description: errorInfo.description,
      suggestion: errorInfo.suggestion,
      impact: errorInfo.impact,
      timeStep: this.timeStep,
      details
    }
    
    this.errors.push(error)
    console.log(`\n❌ 错误 detected: ${error.title}`)
    console.log(`   位置: 第 ${this.timeStep} 步`)
    console.log(`   说明: ${error.description}`)
    console.log(`   建议: ${error.suggestion}`)
    console.log(`   影响: ${error.impact}`)
  }

  checkExitCongestion() {
    const densityMap = this.board.getExitDensity()
    let congestionDetected = false
    
    for (const [exitKey, count] of densityMap.entries()) {
      if (count > this.config.exitDensityThreshold) {
        const [y, x] = exitKey.split(',').map(Number)
        this.addError(ERROR_TYPES.EXIT_CONGESTION, {
          exit: { y, x },
          density: count,
          threshold: this.config.exitDensityThreshold
        })
        congestionDetected = true
      }
    }
    
    return congestionDetected
  }

  checkEquipmentBlocking() {
    for (const equipment of this.board.equipments) {
      const neighbors = this.board.getPassableNeighbors(equipment.y, equipment.x)
      if (neighbors.length < 2) {
        this.addError(ERROR_TYPES.EQUIPMENT_BLOCKING, {
          equipment: equipment,
          availableExits: neighbors.length
        })
      }
    }
  }

  checkEquipmentCompletion() {
    if (this.equipmentColumns < this.config.requiredEquipmentColumns) {
      this.addError(ERROR_TYPES.MISSING_EQUIPMENT, {
        current: this.equipmentColumns,
        required: this.config.requiredEquipmentColumns
      })
      return false
    }
    return true
  }

  enterRemedyMode() {
    this.state = GAME_STATE.REMEDY
    console.log('\n🔧 进入补救模式')
    console.log(`   当前设备列: ${this.equipmentColumns}`)
    console.log(`   需求设备列: ${this.config.requiredEquipmentColumns}`)
    console.log('   请补充缺失的设备列后继续游戏')
    return this
  }

  remedyEquipment(count) {
    this.equipmentColumns += count
    console.log(`\n✅ 补充设备列: +${count}`)
    console.log(`   当前设备列: ${this.equipmentColumns}`)
    
    if (this.equipmentColumns >= this.config.requiredEquipmentColumns) {
      console.log('   设备配置已完整，可以继续游戏')
      return true
    }
    return false
  }

  resumeFromRemedy() {
    if (this.equipmentColumns >= this.config.requiredEquipmentColumns) {
      this.state = GAME_STATE.RUNNING
      console.log('\n▶️  从补救模式恢复运行')
      return true
    }
    console.log('\n⚠️  设备配置仍不完整，无法继续')
    return false
  }

  step() {
    if (this.state !== GAME_STATE.RUNNING) return false
    
    this.timeStep++
    
    for (const audience of this.audiences) {
      if (audience.state !== AUDIENCE_STATE.EXITED) {
        audience.move(this.board, this.timeStep)
      }
    }
    
    this.checkExitCongestion()
    this.checkEquipmentBlocking()
    
    this.savePlaybackState()
    
    const exitedCount = this.getExitedCount()
    if (exitedCount === this.audiences.length || this.timeStep >= this.config.maxTimeSteps) {
      this.finish()
    }
    
    return true
  }

  savePlaybackState() {
    const state = {
      timeStep: this.timeStep,
      audiences: this.audiences.map(a => ({
        id: a.id,
        y: a.y,
        x: a.x,
        state: a.state
      }))
    }
    this.playbackHistory.push(state)
  }

  start() {
    const equipmentComplete = this.checkEquipmentCompletion()
    
    if (!equipmentComplete) {
      this.enterRemedyMode()
      return false
    }
    
    this.state = GAME_STATE.RUNNING
    this.timeStep = 0
    this.playbackHistory = []
    this.savePlaybackState()
    console.log('\n🚀 疏散模拟开始')
    return true
  }

  pause() {
    if (this.state === GAME_STATE.RUNNING) {
      this.state = GAME_STATE.PAUSED
      console.log('\n⏸️  游戏暂停')
      return true
    }
    return false
  }

  resume() {
    if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.RUNNING
      console.log('\n▶️  游戏继续')
      return true
    }
    return false
  }

  reset() {
    this.state = GAME_STATE.READY
    this.timeStep = 0
    this.errors = []
    this.detectedErrors.clear()
    this.broadcastTimestamps = []
    this.playbackHistory = []
    this.score = 0
    
    for (const audience of this.audiences) {
      const cell = this.board.getCell(audience.y, audience.x)
      if (cell) cell.audience = null
      audience.reset()
    }
    
    this.spawnAudiences()
    
    console.log('\n🔄 游戏已重置，状态已清理')
    return this
  }

  finish() {
    this.state = GAME_STATE.FINISHED
    this.calculateScore()
    console.log('\n🏁 疏散模拟结束')
    this.printSummary()
    return this
  }

  calculateScore() {
    const totalAudience = this.audiences.length
    const exitedAudience = this.getExitedCount()
    const stuckAudience = this.getStuckCount()
    const avgTime = this.getAverageExitTime()
    const errorCount = this.errors.length
    
    let score = 100
    score -= (totalAudience - exitedAudience) * 5
    score -= stuckAudience * 3
    score -= errorCount * 10
    score -= Math.max(0, (avgTime - 50) * 0.5)
    
    this.score = Math.max(0, Math.round(score))
    return this.score
  }

  getExitedCount() {
    return this.audiences.filter(a => a.state === AUDIENCE_STATE.EXITED).length
  }

  getStuckCount() {
    return this.audiences.filter(a => a.state === AUDIENCE_STATE.STUCK).length
  }

  getAverageExitTime() {
    const exited = this.audiences.filter(a => a.exitTime !== null)
    if (exited.length === 0) return 0
    const total = exited.reduce((sum, a) => sum + a.exitTime, 0)
    return Math.round(total / exited.length)
  }

  getAudienceTrace(audienceId) {
    const audience = this.audiences.find(a => a.id === audienceId)
    return audience ? audience.trace : null
  }

  traceBackFromExit(exitY, exitX) {
    const result = []
    for (const audience of this.audiences) {
      if (audience.exitTime !== null) {
        const lastTrace = audience.trace[audience.trace.length - 1]
        if (lastTrace && lastTrace.y === exitY && lastTrace.x === exitX) {
          result.push({
            audienceId: audience.id,
            trace: audience.trace,
            exitTime: audience.exitTime
          })
        }
      }
    }
    return result
  }

  printSummary() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 疏散模拟报告')
    console.log('='.repeat(50))
    console.log(`材料类型: ${this.materialType === MATERIAL_TYPES.SMOOTH ? '顺利材料' : '广播冷却材料'}`)
    console.log(`总人数: ${this.audiences.length}`)
    console.log(`成功疏散: ${this.getExitedCount()}`)
    console.log(`被困人数: ${this.getStuckCount()}`)
    console.log(`平均疏散时间: ${this.getAverageExitTime()} 步`)
    console.log(`总耗时: ${this.timeStep} 步`)
    console.log(`错误数量: ${this.errors.length}`)
    console.log(`最终得分: ${this.score}`)
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误详情:')
      for (const error of this.errors) {
        console.log(`  [${error.timeStep}] ${error.title}`)
        console.log(`     ${error.description}`)
        console.log(`     建议: ${error.suggestion}`)
      }
    }
    console.log('='.repeat(50) + '\n')
  }

  runFullSimulation() {
    if (!this.start()) {
      if (this.state === GAME_STATE.REMEDY) {
        console.log('需要先完成设备补救')
      }
      return false
    }
    
    while (this.state === GAME_STATE.RUNNING) {
      this.step()
    }
    
    return true
  }

  setMaterialType(type) {
    this.materialType = type
    return this
  }

  generateReport() {
    return {
      materialType: this.materialType,
      score: this.score,
      totalAudience: this.audiences.length,
      exitedCount: this.getExitedCount(),
      stuckCount: this.getStuckCount(),
      averageExitTime: this.getAverageExitTime(),
      totalTime: this.timeStep,
      errors: this.errors.map(e => ({
        type: e.type,
        title: e.title,
        description: e.description,
        suggestion: e.suggestion,
        timeStep: e.timeStep,
        details: e.details
      }))
    }
  }
}

module.exports = EvacuationGame
