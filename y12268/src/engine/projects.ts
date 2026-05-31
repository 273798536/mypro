import type { Difficulty, DifficultyConfig, ProjectCard, ProjectType } from '@/types/game'

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    initialTreasury: 500,
    initialDebt: 2000,
    baseInterestRate: 0.04,
    initialSatisfaction: 75,
    satisfactionDecay: 2,
    maxTurns: 12,
    baseRevenue: 120,
  },
  normal: {
    initialTreasury: 300,
    initialDebt: 3500,
    baseInterestRate: 0.06,
    initialSatisfaction: 65,
    satisfactionDecay: 3,
    maxTurns: 10,
    baseRevenue: 100,
  },
  hard: {
    initialTreasury: 200,
    initialDebt: 5000,
    baseInterestRate: 0.08,
    initialSatisfaction: 55,
    satisfactionDecay: 4,
    maxTurns: 8,
    baseRevenue: 80,
  },
}

const PROJECT_NAMES: Record<ProjectType, string[]> = {
  infrastructure: [
    '高速公路扩建', '城际铁路新建', '水利枢纽工程', '港口码头改造',
    '产业园区开发', '智慧城市基建', '新能源电站', '城市管廊建设',
    '机场跑道扩建', '跨江大桥工程',
  ],
  welfare: [
    '社区医疗中心', '公办学校扩建', '保障房建设', '养老服务设施',
    '公共交通优化', '饮水安全工程', '文化体育中心', '职业技能培训基地',
    '儿童福利设施', '残障人士服务',
  ],
  debt_optimize: [
    '债务置换方案', '利率谈判协议', '资产证券化', '存量债务重组',
    '财政转移支付申请', '特别债券发行', 'PPP项目引入', '土地出让计划',
  ],
}

const PROJECT_DESCRIPTIONS: Record<ProjectType, string[]> = {
  infrastructure: [
    '大幅提升区域交通效率，长期带动经济增长',
    '连接城市群的骨干交通，投资大回报期长',
    '解决洪涝灾害风险，保障农业和城市用水',
    '提升港口吞吐能力，促进外贸增长',
    '吸引企业入驻，创造持续税收来源',
    '数字化基础设施升级，提升行政效率',
    '清洁能源供给，降低能源成本',
    '城市地下管网更新，减少维护支出',
    '提升航空运力，带动临空经济',
    '缩短跨江通行时间，促进两岸发展',
  ],
  welfare: [
    '改善基层医疗条件，提升居民健康满意度',
    '增加学位供给，提升教育满意度',
    '解决住房困难，稳定社会预期',
    '应对老龄化挑战，提升民生满意度',
    '优化出行体验，直接提升居民幸福感',
    '保障饮水安全，民心工程优先级高',
    '丰富居民文化生活，间接拉动消费',
    '提升就业技能，增加税收基数',
    '关爱弱势群体，大幅提升社会评价',
    '完善社会保障，提升民生满意度',
  ],
  debt_optimize: [
    '用低息债置换高息债，降低综合利率1-2%',
    '与债权人协商降低利率，效果即时',
    '盘活存量资产获得一次性收入用于偿债',
    '延长债务期限降低当期偿债压力',
    '申请上级财政转移支付补贴偿债',
    '发行特别债券募集资金专项偿债',
    '引入社会资本分担项目投资压力',
    '出让土地使用权获得一次性收入',
  ],
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function generateProjectCards(turn: number, difficulty: Difficulty): ProjectCard[] {
  const config = DIFFICULTY_CONFIGS[difficulty]
  const cards: ProjectCard[] = []
  const cardCount = turn <= 2 ? 2 : 3

  const types: ProjectType[] = ['infrastructure', 'welfare', 'debt_optimize']

  for (let i = 0; i < cardCount; i++) {
    const type = types[i % 3]
    const name = randomPick(PROJECT_NAMES[type])
    const desc = randomPick(PROJECT_DESCRIPTIONS[type])
    const idx = PROJECT_NAMES[type].indexOf(name)

    let cost: number
    let expectedReturn: number
    let delayProbability: number
    let riskLevel: 'low' | 'medium' | 'high'

    if (type === 'infrastructure') {
      cost = 80 + Math.floor(Math.random() * 120) + turn * 10
      expectedReturn = cost * (0.15 + Math.random() * 0.2)
      delayProbability = 0.15 + (difficulty === 'hard' ? 0.15 : difficulty === 'normal' ? 0.08 : 0)
      riskLevel = delayProbability > 0.2 ? 'high' : delayProbability > 0.1 ? 'medium' : 'low'
    } else if (type === 'welfare') {
      cost = 30 + Math.floor(Math.random() * 50) + turn * 5
      expectedReturn = cost * (0.08 + Math.random() * 0.1)
      delayProbability = 0.05 + (difficulty === 'hard' ? 0.1 : difficulty === 'normal' ? 0.05 : 0)
      riskLevel = delayProbability > 0.1 ? 'medium' : 'low'
    } else {
      cost = 20 + Math.floor(Math.random() * 40)
      expectedReturn = 0
      delayProbability = 0
      riskLevel = 'low'
    }

    cards.push({
      id: generateProjectId(),
      name,
      type,
      cost: Math.round(cost),
      expectedReturn: Math.round(expectedReturn),
      delayProbability: Math.round(delayProbability * 100) / 100,
      riskLevel,
      description: desc,
      accepted: false,
      delayed: false,
      actualReturn: 0,
      turnDrawn: turn,
      completedTurn: null,
    })
  }

  return cards
}

export function resolveProjectOutcomes(projects: ProjectCard[], currentTurn: number): {
  completedProjects: ProjectCard[]
  delayedProjects: ProjectCard[]
} {
  const completedProjects: ProjectCard[] = []
  const delayedProjects: ProjectCard[] = []

  for (const project of projects) {
    if (!project.accepted) continue

    const isDelayed = Math.random() < project.delayProbability

    if (isDelayed) {
      delayedProjects.push({
        ...project,
        delayed: true,
        actualReturn: Math.round(project.expectedReturn * 0.5),
        completedTurn: currentTurn + 1,
      })
    } else {
      completedProjects.push({
        ...project,
        delayed: false,
        actualReturn: project.expectedReturn,
        completedTurn: currentTurn,
      })
    }
  }

  return { completedProjects, delayedProjects }
}
