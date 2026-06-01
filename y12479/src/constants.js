const CELL_TYPES = {
  SEAT: 'seat',
  AISLE: 'aisle',
  EXIT: 'exit',
  STAGE: 'stage',
  EQUIPMENT: 'equipment',
  WALL: 'wall'
}

const AUDIENCE_STATE = {
  WAITING: 'waiting',
  MOVING: 'moving',
  EXITED: 'exited',
  STUCK: 'stuck'
}

const ERROR_TYPES = {
  EXIT_CONGESTION: 'exit_congestion',
  BROADCAST_DELAY: 'broadcast_delay',
  EQUIPMENT_BLOCKING: 'equipment_blocking',
  MISSING_EQUIPMENT: 'missing_equipment',
  WRONG_EVACUATION_ORDER: 'wrong_evacuation_order',
  PATH_BLOCKED: 'path_blocked'
}

const ERROR_MESSAGES = {
  [ERROR_TYPES.EXIT_CONGESTION]: {
    title: '出口拥堵',
    description: '出口处人员密度过高，超过安全阈值',
    suggestion: '应在疏散前提前打开所有可用出口，并在出口处安排引导人员分流',
    impact: '导致疏散时间延长30%，增加踩踏风险'
  },
  [ERROR_TYPES.BROADCAST_DELAY]: {
    title: '广播冷却时间过短',
    description: '广播间隔不足，前后广播内容重叠造成信息混乱',
    suggestion: '重要广播之间应保持至少15秒冷却时间，确保信息完整传达',
    impact: '观众接收到混乱信息，疏散速度降低20%'
  },
  [ERROR_TYPES.EQUIPMENT_BLOCKING]: {
    title: '设备阻挡疏散通道',
    description: '设备车停放位置占用了疏散通道',
    suggestion: '设备车应停放在指定区域，严禁占用消防通道和疏散出口',
    impact: '该区域疏散路线被切断，部分观众无法疏散'
  },
  [ERROR_TYPES.MISSING_EQUIPMENT]: {
    title: '设备车配置不完整',
    description: '缺少必要的应急设备列',
    suggestion: '请补充缺失的设备列，确保应急物资齐全',
    impact: '可进入补救模式补充设备'
  },
  [ERROR_TYPES.WRONG_EVACUATION_ORDER]: {
    title: '疏散顺序错误',
    description: '未按照先远后近、先老弱后普通的原则疏散',
    suggestion: '应优先疏散距离出口最远的区域和特殊需要人群',
    impact: '造成通道拥堵，整体疏散效率下降'
  },
  [ERROR_TYPES.PATH_BLOCKED]: {
    title: '疏散路径受阻',
    description: '疏散路线上存在障碍物',
    suggestion: '请确保所有疏散通道畅通无阻',
    impact: '观众需要绕行，疏散时间增加'
  }
}

const GAME_STATE = {
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
  REMEDY: 'remedy'
}

const MATERIAL_TYPES = {
  SMOOTH: 'smooth',
  BROADCAST: 'broadcast'
}

module.exports = {
  CELL_TYPES,
  AUDIENCE_STATE,
  ERROR_TYPES,
  ERROR_MESSAGES,
  GAME_STATE,
  MATERIAL_TYPES
}
