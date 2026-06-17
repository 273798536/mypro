import type {
  ParamVersion,
  Step,
  ParamValue,
  Anomaly,
  Evidence,
} from '@/types'

export const paramVersions: ParamVersion[] = [
  {
    id: 'v1',
    name: '初调版 0612',
    createdAt: '2026-06-12 14:30',
    operator: '阿岑',
  },
  {
    id: 'v2',
    name: '修正版 0613',
    createdAt: '2026-06-13 09:15',
    operator: '现场老师',
  },
]

export const steps: Step[] = [
  {
    id: 's1',
    stepIndex: 1,
    title: '蒸发器入口温度采集',
    description: '在蒸发器冷媒入口处安装温度传感器，记录初始读数并拍摄表盘。',
    photo: '/photos/s1-temp-sensor.svg',
    isRetracted: false,
  },
  {
    id: 's2',
    stepIndex: 2,
    title: '压缩机吸气压力测量',
    description: '连接压力表组读取压缩机低压侧，确认与温度对应的饱和压力匹配。',
    photo: '/photos/s2-pressure-gauge.svg',
    isRetracted: false,
  },
  {
    id: 's3',
    stepIndex: 3,
    title: '冷凝器出水流量记录（已撤回）',
    description: '使用涡轮流量计读取热水侧流量，单位误记为 m³/h 实际应为 L/min。',
    photo: '/photos/s3-flow-meter.svg',
    isRetracted: true,
    retractReason: '单位混写 m³/h 与 L/min 导致数量级偏差 60 倍，数据作废重采。',
  },
  {
    id: 's4',
    stepIndex: 4,
    title: '膨胀阀开度调节',
    description: '根据过热度微调电子膨胀阀开度，记录调节前后参数变化。',
    photo: '/photos/s4-expansion-valve.svg',
    isRetracted: false,
  },
  {
    id: 's5',
    stepIndex: 5,
    title: '四通换向阀流向检测',
    description: '用听针判断四通阀内部冷媒流向，箭头指示与实际流向相反，需要标记。',
    photo: '/photos/s5-four-way-valve.svg',
    isRetracted: false,
  },
  {
    id: 's6',
    stepIndex: 6,
    title: '制热量与 COP 计算',
    description: '根据流量、温差计算制热量，结合输入功率得出 COP，收尾时注意单位统一。',
    photo: '/photos/s6-notebook.svg',
    isRetracted: false,
  },
]

const mkParams = (
  versionId: string,
  overrides: Partial<Record<string, Partial<ParamValue>>> = {},
): ParamValue[] => {
  const base: ParamValue[] = [
    {
      id: `${versionId}-s1-t1`,
      stepId: 's1',
      versionId,
      paramName: '蒸发器入口温度 T1',
      value: 4.2,
      unit: '℃',
      hasUnitError: false,
      hasDirectionError: false,
    },
    {
      id: `${versionId}-s2-p1`,
      stepId: 's2',
      versionId,
      paramName: '吸气压力 P_low',
      value: 0.42,
      unit: 'MPa',
      hasUnitError: false,
      hasDirectionError: false,
    },
    {
      id: `${versionId}-s3-f1`,
      stepId: 's3',
      versionId,
      paramName: '冷凝器出水流量',
      value: 2.4,
      unit: 'm³/h',
      hasUnitError: true,
      hasDirectionError: false,
      errorNote: '单位应为 L/min，实际 2.4 L/min 误写为 2.4 m³/h，数量级偏差 60 倍',
    },
    {
      id: `${versionId}-s4-ev`,
      stepId: 's4',
      versionId,
      paramName: '膨胀阀开度',
      value: 48,
      unit: '%',
      hasUnitError: false,
      hasDirectionError: false,
    },
    {
      id: `${versionId}-s4-sh`,
      stepId: 's4',
      versionId,
      paramName: '过热度 SH',
      value: 7.8,
      unit: 'K',
      hasUnitError: false,
      hasDirectionError: false,
    },
    {
      id: `${versionId}-s5-dir`,
      stepId: 's5',
      versionId,
      paramName: '四通阀冷媒流向',
      value: 1,
      unit: 'enum',
      direction: versionId === 'v1' ? 'forward' : 'reverse',
      hasUnitError: false,
      hasDirectionError: versionId === 'v1',
      errorNote:
        versionId === 'v1'
          ? '阀体箭头向前(→)但实际听针判断流向向后(←)，制热模式下方向反写'
          : undefined,
    },
    {
      id: `${versionId}-s6-q`,
      stepId: 's6',
      versionId,
      paramName: '制热量 Q',
      value: versionId === 'v1' ? 4320 : 72,
      unit: 'kW',
      hasUnitError: versionId === 'v1',
      hasDirectionError: false,
      errorNote:
        versionId === 'v1'
          ? '因流量单位误写 m³/h 导致 Q 被放大 60 倍，应为 72 kW'
          : undefined,
    },
    {
      id: `${versionId}-s6-cop`,
      stepId: 's6',
      versionId,
      paramName: '性能系数 COP',
      value: versionId === 'v1' ? 12.6 : 4.2,
      unit: '-',
      hasUnitError: versionId === 'v1',
      hasDirectionError: false,
      errorNote:
        versionId === 'v1'
          ? 'COP 异常偏高，由制热量放大传导而来，修正后为 4.2'
          : undefined,
    },
  ]
  return base.map((p) => ({
    ...p,
    ...(overrides[p.paramName] ?? {}),
  }))
}

export const paramValues: ParamValue[] = [
  ...mkParams('v1'),
  ...mkParams('v2', {
    '冷凝器出水流量': {
      value: 2.4,
      unit: 'L/min',
      hasUnitError: false,
      errorNote: undefined,
    },
  }),
]

export const anomalies: Anomaly[] = [
  {
    id: 'a1',
    stepId: 's3',
    type: 'unit',
    description: '冷凝器出水流量单位混写，m³/h 与 L/min 混用导致制热量放大 60 倍',
    actionHint:
      '1. 打开步骤3原始照片，确认流量计读数单位为 L/min；2. 将流量值统一换算为 L/min 后重新填入；3. 重算步骤6制热量与 COP。',
    status: 'resolved',
  },
  {
    id: 'a2',
    stepId: 's5',
    type: 'direction',
    description: '四通阀方向符号写反，阀体箭头指向与实际听针判断流向相反',
    actionHint:
      '1. 切换制热模式，用听针贴紧四通阀四根铜管确认温度高低；2. 高压侧（热）应为排气管，低压侧（冷）为回气管；3. 将方向标记由 forward 改为 reverse 并在照片上画反向箭头。',
    status: 'processing',
  },
  {
    id: 'a3',
    stepId: 's6',
    type: 'other',
    description: '收尾时 COP=12.6 异常偏高，属于上游单位偏差传导',
    actionHint: '1. 回溯步骤3流量单位修正后，重新计算 Q=c·m·Δt；2. 确认输入功率读数为 17.2 kW；3. COP=Q/Power 重新取数。',
    status: 'resolved',
  },
]

export const evidences: Evidence[] = [
  { id: 'e1', anomalyId: 'a1', name: '流量计表盘原始照片', provided: true },
  { id: 'e2', anomalyId: 'a1', name: '单位换算计算过程', provided: true },
  { id: 'e3', anomalyId: 'a2', name: '四通阀听针检测录音', provided: false },
  { id: 'e4', anomalyId: 'a2', name: '制热模式下四管温度记录表', provided: false },
  { id: 'e5', anomalyId: 'a3', name: '制热量重算过程稿', provided: true },
]
