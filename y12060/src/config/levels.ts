import { LevelConfig } from '../types/game';

export const LEVELS: LevelConfig[] = [
  {
    id: 'level-training',
    name: '基础训练',
    description: '熟悉叉车操作，练习基本的前进、后退和转弯，无时间压力',
    difficulty: 'easy',
    timeLimit: 0,
    targetScore: 800,
    shelfLayout: 'basic',
    cargoWeight: 500,
    requiredTasks: 2
  },
  {
    id: 'level-normal',
    name: '标准考核',
    description: '在规定时间内完成货物搬运任务，注意避开盲区和货架',
    difficulty: 'normal',
    timeLimit: 180,
    targetScore: 1000,
    shelfLayout: 'basic',
    cargoWeight: 1000,
    requiredTasks: 4
  },
  {
    id: 'level-narrow',
    name: '窄通道挑战',
    description: '在窄通道中行驶，考验对转弯半径的精准控制',
    difficulty: 'normal',
    timeLimit: 240,
    targetScore: 1200,
    shelfLayout: 'narrow',
    cargoWeight: 800,
    requiredTasks: 4
  },
  {
    id: 'level-expert',
    name: '高级考核',
    description: '复杂仓库布局，高密度货架，考验综合驾驶技能',
    difficulty: 'hard',
    timeLimit: 300,
    targetScore: 1500,
    shelfLayout: 'complex',
    cargoWeight: 1500,
    requiredTasks: 6
  }
];

export const GAME_MODES = [
  {
    id: 'training',
    name: '基础训练',
    description: '无时间限制，可随时暂停查看提示，适合新手熟悉操作',
    icon: 'GraduationCap',
    color: '#2A9D8F'
  },
  {
    id: 'exam',
    name: '考核模式',
    description: '计时计分，严格的碰撞检测，模拟真实工作场景',
    icon: 'ClipboardCheck',
    color: '#457B9D'
  },
  {
    id: 'free',
    name: '自由练习',
    description: '自定义难度和参数，自由探索仓库场景',
    icon: 'Play',
    color: '#FF6B35'
  }
];

export const DIFFICULTY_CONFIG = {
  easy: {
    label: '简单',
    speedLimit: 15,
    collisionCooldown: 2000,
    scoreMultiplier: 1.0,
    color: '#2A9D8F'
  },
  normal: {
    label: '普通',
    speedLimit: 20,
    collisionCooldown: 1500,
    scoreMultiplier: 1.2,
    color: '#FFD700'
  },
  hard: {
    label: '困难',
    speedLimit: 25,
    collisionCooldown: 1000,
    scoreMultiplier: 1.5,
    color: '#E63946'
  }
};

export const PENALTY_CONFIG = {
  shelf: {
    minor: { points: 50, label: '轻微刮擦' },
    moderate: { points: 100, label: '中度碰撞' },
    severe: { points: 200, label: '严重撞击' }
  },
  overheight: {
    minor: { points: 30, label: '轻微超高' },
    moderate: { points: 80, label: '明显超高' },
    severe: { points: 150, label: '严重超高' }
  },
  blindzone: {
    minor: { points: 20, label: '短时穿行' },
    moderate: { points: 50, label: '停留过久' },
    severe: { points: 100, label: '长时间滞留' }
  },
  speeding: {
    points: 10,
    label: '超速行驶'
  }
};
