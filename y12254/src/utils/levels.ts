import type { LevelConfig } from '@/types'

export const LEVELS: LevelConfig[] = [
  {
    id: 'mm1',
    name: '单窗口奶茶铺',
    model: 'M/M/1',
    arrivalRate: 0.3,
    serviceRate: 0.5,
    initialWindowCount: 1,
    totalCustomers: 15,
    description: '只有1个服务窗口的奶茶店。学习λ（到达率）和μ（服务率）的基础关系，理解ρ=λ/μ的意义。',
    failureConditions: [
      { type: 'max_wait_exceeded', threshold: 20, message: '有顾客等待超过20个时间单位！服务能力不足。' },
      { type: 'queue_length_exceeded', threshold: 8, message: '队列长度超过8人！顾客体验极差。' },
    ],
    anomalies: [],
  },
  {
    id: 'mmc',
    name: '多窗口奶茶店',
    model: 'M/M/c',
    arrivalRate: 0.6,
    serviceRate: 0.4,
    initialWindowCount: 3,
    totalCustomers: 25,
    description: '多个窗口的奶茶店。需要合理配置窗口数量，平衡服务效率与成本，理解c窗口数对系统的影响。',
    failureConditions: [
      { type: 'max_wait_exceeded', threshold: 15, message: '有顾客等待超过15个时间单位！需要增加窗口或提高服务率。' },
      { type: 'queue_length_exceeded', threshold: 6, message: '队列长度超过6人！考虑增开窗口。' },
    ],
    anomalies: [],
  },
  {
    id: 'mmc_anomaly',
    name: '异常奶茶店',
    model: 'M/M/c + 异常',
    arrivalRate: 0.7,
    serviceRate: 0.45,
    initialWindowCount: 3,
    totalCustomers: 30,
    description: '会出现预约爽约、窗口故障、制作时长异常的奶茶店。需要灵活应对突发情况，快速调整窗口配置。',
    failureConditions: [
      { type: 'max_wait_exceeded', threshold: 18, message: '有顾客等待超过18个时间单位！异常事件加剧了排队压力。' },
      { type: 'queue_length_exceeded', threshold: 7, message: '队列长度超过7人！异常事件导致服务效率下降。' },
      { type: 'no_show_rate_exceeded', threshold: 0.3, message: '爽约率超过30%！预约管理需要优化。' },
    ],
    anomalies: [
      { type: 'no_show', probability: 0.15, triggerTickRange: [5, 40] },
      { type: 'window_disabled', probability: 0.08, triggerTickRange: [8, 35] },
      { type: 'abnormal_duration', probability: 0.2, triggerTickRange: [3, 45] },
    ],
  },
]
