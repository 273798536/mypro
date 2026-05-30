import type { GameState } from '../types/game';

export const OXYGEN_DEPLETION_SCENARIO: Partial<GameState> = {
  resources: {
    oxygen: 30,
    maxOxygen: 100,
    oxygenConsumptionRate: 2,
    power: 100,
    maxPower: 100,
    powerGenerationRate: 2,
    time: 0,
    maxTime: 180
  },
  modules: [
    {
      id: 'core',
      name: '核心舱',
      position: { x: 400, y: 300 },
      connections: ['lab', 'living', 'cargo'],
      status: 'critical',
      oxygenConsumption: 5,
      powerConsumption: 5,
      hasPowerNode: false
    },
    {
      id: 'lab',
      name: '实验舱',
      position: { x: 220, y: 180 },
      connections: ['core'],
      status: 'critical',
      oxygenConsumption: 4,
      powerConsumption: 8,
      hasPowerNode: false
    },
    {
      id: 'living',
      name: '生活舱',
      position: { x: 580, y: 180 },
      connections: ['core'],
      status: 'critical',
      oxygenConsumption: 6,
      powerConsumption: 4,
      hasPowerNode: false
    },
    {
      id: 'cargo',
      name: '货运舱',
      position: { x: 400, y: 450 },
      connections: ['core'],
      status: 'normal',
      oxygenConsumption: 1,
      powerConsumption: 2,
      hasPowerNode: false
    }
  ],
  tasks: [
    {
      id: 'task-1',
      name: '修复核心舱氧气系统',
      description: '核心舱主氧气循环系统故障，需要紧急修复',
      moduleId: 'core',
      priority: 'critical',
      duration: 40,
      requiredStaff: 2,
      requiredSkill: 'expert',
      deadline: 60,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-2',
      name: '密封实验舱裂缝',
      description: '实验舱外壁出现微裂缝，氧气快速泄漏',
      moduleId: 'lab',
      priority: 'critical',
      duration: 35,
      requiredStaff: 2,
      requiredSkill: 'advanced',
      deadline: 50,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-3',
      name: '生活舱空气净化修复',
      description: '生活舱空气净化器故障，二氧化碳浓度上升',
      moduleId: 'living',
      priority: 'high',
      duration: 30,
      requiredStaff: 1,
      requiredSkill: 'advanced',
      deadline: 70,
      status: 'pending',
      assignedStaff: []
    }
  ],
  staff: [
    {
      id: 'staff-1',
      name: '张伟',
      skill: 'expert',
      fatigue: 10,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 180,
      status: 'idle'
    },
    {
      id: 'staff-2',
      name: '李娜',
      skill: 'advanced',
      fatigue: 15,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 180,
      status: 'idle'
    },
    {
      id: 'staff-3',
      name: '王强',
      skill: 'advanced',
      fatigue: 20,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 180,
      status: 'idle'
    }
  ],
  score: 0
};

export const TASK_CONFLICT_SCENARIO: Partial<GameState> = {
  resources: {
    oxygen: 100,
    maxOxygen: 100,
    oxygenConsumptionRate: 1,
    power: 100,
    maxPower: 100,
    powerGenerationRate: 2,
    time: 0,
    maxTime: 240
  },
  modules: [
    {
      id: 'core',
      name: '核心舱',
      position: { x: 400, y: 300 },
      connections: ['lab', 'living', 'cargo', 'power', 'comm'],
      status: 'damaged',
      oxygenConsumption: 2,
      powerConsumption: 5,
      hasPowerNode: false
    },
    {
      id: 'lab',
      name: '实验舱',
      position: { x: 220, y: 180 },
      connections: ['core'],
      status: 'damaged',
      oxygenConsumption: 1.5,
      powerConsumption: 8,
      hasPowerNode: false
    },
    {
      id: 'living',
      name: '生活舱',
      position: { x: 580, y: 180 },
      connections: ['core'],
      status: 'damaged',
      oxygenConsumption: 3,
      powerConsumption: 4,
      hasPowerNode: false
    },
    {
      id: 'cargo',
      name: '货运舱',
      position: { x: 220, y: 420 },
      connections: ['core'],
      status: 'damaged',
      oxygenConsumption: 0.8,
      powerConsumption: 2,
      hasPowerNode: false
    },
    {
      id: 'power',
      name: '能源舱',
      position: { x: 580, y: 420 },
      connections: ['core'],
      status: 'damaged',
      oxygenConsumption: 0.5,
      powerConsumption: 1,
      hasPowerNode: false
    }
  ],
  tasks: [
    {
      id: 'task-1',
      name: '核心舱主系统检修',
      description: '核心舱主控系统异常，需要全面检查',
      moduleId: 'core',
      priority: 'high',
      duration: 50,
      requiredStaff: 2,
      requiredSkill: 'advanced',
      deadline: 120,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-2',
      name: '实验舱数据恢复',
      description: '实验舱数据存储设备故障，需要紧急恢复',
      moduleId: 'lab',
      priority: 'high',
      duration: 45,
      requiredStaff: 2,
      requiredSkill: 'advanced',
      deadline: 100,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-3',
      name: '生活舱生命维持修复',
      description: '生活舱生命维持系统需要维护',
      moduleId: 'living',
      priority: 'high',
      duration: 40,
      requiredStaff: 2,
      requiredSkill: 'basic',
      deadline: 110,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-4',
      name: '货运舱门维修',
      description: '货运舱自动门无法正常关闭',
      moduleId: 'cargo',
      priority: 'high',
      duration: 35,
      requiredStaff: 1,
      requiredSkill: 'basic',
      deadline: 90,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-5',
      name: '能源舱电池校准',
      description: '能源舱电池组需要重新校准',
      moduleId: 'power',
      priority: 'high',
      duration: 30,
      requiredStaff: 1,
      requiredSkill: 'basic',
      deadline: 80,
      status: 'pending',
      assignedStaff: []
    }
  ],
  staff: [
    {
      id: 'staff-1',
      name: '张伟',
      skill: 'expert',
      fatigue: 10,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 240,
      status: 'idle'
    },
    {
      id: 'staff-2',
      name: '李娜',
      skill: 'advanced',
      fatigue: 10,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 240,
      status: 'idle'
    },
    {
      id: 'staff-3',
      name: '王强',
      skill: 'basic',
      fatigue: 10,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 240,
      status: 'idle'
    }
  ],
  score: 0
};

export const FATIGUE_MANAGEMENT_SCENARIO: Partial<GameState> = {
  resources: {
    oxygen: 100,
    maxOxygen: 100,
    oxygenConsumptionRate: 1,
    power: 100,
    maxPower: 100,
    powerGenerationRate: 2,
    time: 0,
    maxTime: 300
  },
  modules: [
    {
      id: 'core',
      name: '核心舱',
      position: { x: 400, y: 300 },
      connections: ['lab', 'living', 'cargo'],
      status: 'normal',
      oxygenConsumption: 2,
      powerConsumption: 5,
      hasPowerNode: false
    },
    {
      id: 'lab',
      name: '实验舱',
      position: { x: 220, y: 180 },
      connections: ['core'],
      status: 'damaged',
      oxygenConsumption: 1.5,
      powerConsumption: 8,
      hasPowerNode: false
    },
    {
      id: 'living',
      name: '生活舱',
      position: { x: 580, y: 180 },
      connections: ['core'],
      status: 'normal',
      oxygenConsumption: 3,
      powerConsumption: 4,
      hasPowerNode: false
    },
    {
      id: 'cargo',
      name: '货运舱',
      position: { x: 400, y: 450 },
      connections: ['core'],
      status: 'damaged',
      oxygenConsumption: 0.8,
      powerConsumption: 2,
      hasPowerNode: false
    }
  ],
  tasks: [
    {
      id: 'task-1',
      name: '实验舱设备检修A',
      description: '实验舱主要设备例行检查',
      moduleId: 'lab',
      priority: 'medium',
      duration: 60,
      requiredStaff: 2,
      requiredSkill: 'advanced',
      deadline: 100,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-2',
      name: '实验舱设备检修B',
      description: '实验舱辅助设备维护',
      moduleId: 'lab',
      priority: 'medium',
      duration: 55,
      requiredStaff: 2,
      requiredSkill: 'basic',
      deadline: 150,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-3',
      name: '货运舱整理',
      description: '货运舱物资清点和整理',
      moduleId: 'cargo',
      priority: 'low',
      duration: 50,
      requiredStaff: 1,
      requiredSkill: 'basic',
      deadline: 200,
      status: 'pending',
      assignedStaff: []
    },
    {
      id: 'task-4',
      name: '核心舱软件更新',
      description: '核心舱系统软件需要更新',
      moduleId: 'core',
      priority: 'medium',
      duration: 45,
      requiredStaff: 1,
      requiredSkill: 'expert',
      deadline: 250,
      status: 'pending',
      assignedStaff: []
    }
  ],
  staff: [
    {
      id: 'staff-1',
      name: '张伟',
      skill: 'expert',
      fatigue: 70,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 300,
      status: 'idle'
    },
    {
      id: 'staff-2',
      name: '李娜',
      skill: 'advanced',
      fatigue: 75,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 300,
      status: 'idle'
    },
    {
      id: 'staff-3',
      name: '王强',
      skill: 'basic',
      fatigue: 80,
      maxFatigue: 100,
      shift: 'day',
      shiftStart: 0,
      shiftEnd: 300,
      status: 'idle'
    }
  ],
  score: 0
};
