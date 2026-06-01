const { MATERIAL_TYPES, ERROR_TYPES } = require('./constants')

class TestMaterial {
  constructor(name, type, config = {}) {
    this.name = name
    this.type = type
    this.config = config
    this.description = ''
    this.expectedErrors = []
  }

  setDescription(desc) {
    this.description = desc
    return this
  }

  expectError(errorType) {
    this.expectedErrors.push(errorType)
    return this
  }

  setupGame(game) {
    return game
  }

  run(game) {
    this.setupGame(game)
    return game.runFullSimulation()
  }
}

class SmoothMaterial extends TestMaterial {
  constructor(name, config = {}) {
    super(name, MATERIAL_TYPES.SMOOTH, config)
  }
}

class BroadcastMaterial extends TestMaterial {
  constructor(name, config = {}) {
    super(name, MATERIAL_TYPES.BROADCAST, config)
  }
}

const smoothMaterials = [
  {
    name: '顺利疏散-标准布局',
    description: '标准音乐厅布局，所有出口正常开放，设备摆放正确',
    audienceCount: 50,
    equipmentColumns: 3,
    exitDensityThreshold: 8,
    setup: (game) => {
      game.setupBoard('standard')
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.addEquipment(1, 8)
      game.spawnAudiences(50)
    }
  },
  {
    name: '顺利疏散-满场',
    description: '满场观众疏散，出口配置充足',
    audienceCount: 80,
    equipmentColumns: 3,
    exitDensityThreshold: 12,
    setup: (game) => {
      game.setupBoard('standard')
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.addEquipment(1, 8)
      game.spawnAudiences(80)
    }
  },
  {
    name: '顺利疏散-特殊需要人群',
    description: '包含特殊需要人群的疏散测试，验证优先疏散逻辑',
    audienceCount: 60,
    equipmentColumns: 3,
    exitDensityThreshold: 10,
    setup: (game) => {
      game.setupBoard('standard')
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.addEquipment(1, 8)
      game.spawnAudiences(60)
    }
  }
]

const broadcastMaterials = [
  {
    name: '广播冷却-快速连续广播',
    description: '快速连续发送广播，验证冷却时间检测',
    audienceCount: 40,
    equipmentColumns: 3,
    broadcastTimes: [1, 3, 5],
    expectedErrors: [ERROR_TYPES.BROADCAST_DELAY],
    setup: (game) => {
      game.setupBoard('standard')
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.addEquipment(1, 8)
      game.spawnAudiences(40)
    },
    run: (game) => {
      game.start()
      game.sendBroadcast('疏散开始', 1)
      game.sendBroadcast('请保持秩序', 3)
      game.sendBroadcast('不要拥挤', 5)
      while (game.state === 'running') {
        game.step()
      }
    }
  },
  {
    name: '广播冷却-临界间隔',
    description: '广播间隔接近冷却时间，验证边界条件',
    audienceCount: 40,
    equipmentColumns: 3,
    broadcastCooldown: 15,
    broadcastTimes: [1, 14, 30],
    expectedErrors: [ERROR_TYPES.BROADCAST_DELAY],
    setup: (game) => {
      game.setupBoard('standard')
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.addEquipment(1, 8)
      game.spawnAudiences(40)
    },
    run: (game) => {
      game.start()
      game.sendBroadcast('疏散开始', 1)
      game.sendBroadcast('请保持秩序', 14)
      game.sendBroadcast('继续前进', 30)
      while (game.state === 'running') {
        game.step()
      }
    }
  },
  {
    name: '广播冷却-正确间隔',
    description: '广播间隔符合要求，不应产生冷却错误',
    audienceCount: 40,
    equipmentColumns: 3,
    broadcastCooldown: 15,
    broadcastTimes: [1, 20, 40],
    expectedErrors: [],
    setup: (game) => {
      game.setupBoard('standard')
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.addEquipment(1, 8)
      game.spawnAudiences(40)
    },
    run: (game) => {
      game.start()
      game.sendBroadcast('疏散开始', 1)
      game.sendBroadcast('请保持秩序', 20)
      game.sendBroadcast('继续前进', 40)
      while (game.state === 'running') {
        game.step()
      }
    }
  }
]

const exitCongestionExamples = [
  {
    name: '出口拥堵样例1-单出口集中',
    description: '所有观众涌向单一出口，造成严重拥堵',
    config: {
      boardWidth: 15,
      boardHeight: 12,
      audienceCount: 60,
      exitDensityThreshold: 5
    },
    setup: (game) => {
      game.board.setupStandardLayout()
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
      game.addEquipment(1, 8)
      game.spawnAudiences(60)
    },
    verification: {
      fromAudience: (game, audienceId) => {
        const trace = game.getAudienceTrace(audienceId)
        return {
          audienceId,
          traceLength: trace.length,
          exitTime: trace[trace.length - 1]?.time,
          exitPosition: trace[trace.length - 1]
        }
      },
      fromExit: (game, exitY, exitX) => {
        return game.traceBackFromExit(exitY, exitX)
      }
    }
  },
  {
    name: '出口拥堵样例2-瓶颈效应',
    description: '过道狭窄导致出口前形成瓶颈',
    config: {
      boardWidth: 15,
      boardHeight: 12,
      audienceCount: 50,
      exitDensityThreshold: 6
    },
    setup: (game) => {
      game.board.setupStandardLayout()
      for (let y = 3; y < 8; y++) {
        game.board.addWall(y, 5)
        game.board.addWall(y, 9)
      }
      game.addEquipment(1, 2)
      game.addEquipment(1, 12)
      game.addEquipment(1, 14)
      game.spawnAudiences(50)
    }
  },
  {
    name: '出口拥堵样例3-设备阻挡',
    description: '设备车停放位置不当，加剧出口拥堵',
    config: {
      boardWidth: 15,
      boardHeight: 12,
      audienceCount: 45,
      exitDensityThreshold: 5
    },
    setup: (game) => {
      game.board.setupStandardLayout()
      game.addEquipment(game.board.height - 2, Math.floor(game.board.width / 2) - 1)
      game.addEquipment(game.board.height - 2, Math.floor(game.board.width / 2) + 1)
      game.addEquipment(1, 2)
      game.addEquipment(1, 5)
      game.spawnAudiences(45)
    }
  }
]

module.exports = {
  TestMaterial,
  SmoothMaterial,
  BroadcastMaterial,
  smoothMaterials,
  broadcastMaterials,
  exitCongestionExamples
}
