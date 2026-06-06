import type { Level } from '../types'

export const levels: Level[] = [
  {
    id: 'level-1',
    name: '「致远号」货轮 · 前甲板复核',
    description:
      '混合材料批次：2019版底图坐标（带旧备注）+ 现场截图手写标注 + 临时补录设备清单。需要完成6件货物放置，其中包含一次边界误判和碰撞检测练习。',
    scenario:
      '材料状况：①底图坐标是5年前的旧版，船艏区域曾做过改造，坐标需复核；②现场截图来自安全员手机，有手写圈注；③设备清单是调度室临时补的Excel，有两栏漏了单位。',
    difficulty: 'medium',
    deckConfig: {
      width: 900,
      height: 540,
      gridSize: 30,
      forbiddenZones: [
        { id: 'fz-1', x: 0, y: 0, width: 120, height: 540, name: '船艏驾驶台区域（2019版坐标已过时）' },
        { id: 'fz-2', x: 780, y: 360, width: 120, height: 180, name: '锚机作业区（不可堆放）' },
      ],
      oldNotes: [
        {
          id: 'note-1',
          x: 60,
          y: 80,
          text: '【2019旧备注】船艏左侧可临时堆放·注意：2022年该区域已改造为系缆设备',
          source: 'coordinate_backlog',
        },
        {
          id: 'note-2',
          x: 600,
          y: 420,
          text: '【截图圈注】张工14:30拍：这里之前放过救生筏，但清单里没写',
          source: 'screenshot_remark',
        },
        {
          id: 'note-3',
          x: 360,
          y: 240,
          text: '【碰撞误判】上次标注：B区与C区货箱边界算错40cm，注意网格吸附',
          source: 'collision_misjudge',
        },
      ],
    },
    cargoList: [
      {
        id: 'c-1',
        name: '发电机集装箱 A-01',
        width: 120,
        height: 60,
        weight: 3.2,
        unit: '吨',
        notes: '清单正常项',
      },
      {
        id: 'c-2',
        name: '消防水带箱（漏单位）',
        width: 60,
        height: 60,
        weight: 85,
        notes: '补录Excel里"单位"栏空着，现场估计是公斤',
        hasIssue: true,
        issueType: 'missing_unit',
        issueDescription: '设备清单临时补录时漏填重量单位，训练员需在报告中注明来源材料：调度室补录Excel第3行',
      },
      {
        id: 'c-3',
        name: '救生筏（重复标注）',
        width: 90,
        height: 90,
        weight: 180,
        unit: 'kg',
        notes: '草稿里已标注过一次，但底图截图圈注又指了一次',
        hasIssue: true,
        issueType: 'duplicate_annotation',
        issueDescription: '同一件救生筏在"标注草稿"和"现场截图圈注"里各出现一次，训练员需识别重复并说明：两份材料冲突，以草稿为准',
      },
      {
        id: 'c-4',
        name: '备用钢丝绳卷',
        width: 60,
        height: 60,
        weight: 0.9,
        unit: '吨',
        notes: '正常项',
      },
      {
        id: 'c-5',
        name: '旧坐标遗留箱（边界陷阱）',
        width: 120,
        height: 60,
        weight: 2.1,
        unit: '吨',
        notes: '2019旧坐标里这个位置可以放，但现在是驾驶台区域',
        hasIssue: true,
        issueType: 'wrong_coordinates',
        issueDescription: '底图是旧版，标注草稿沿用了过期坐标。训练员放置到船艏区域时会触发边界失败，必须撤销并迁移到正确位置。材料来源：2019版底图坐标表',
      },
      {
        id: 'c-6',
        name: '工具箱（补录备注）',
        width: 30,
        height: 60,
        weight: 45,
        unit: 'kg',
        notes: '安全员微信里补录的，说"放B区就行"',
        hasIssue: true,
        issueType: 'supplementary',
        issueDescription: '材料来源是微信口头补录，无正式清单。训练员需在报告中注明：补录信息来自安全员微信，建议后续补纸质签收',
      },
    ],
    expectedIssues: [
      {
        id: 'exp-1',
        type: 'boundary_failure',
        description: '将「旧坐标遗留箱」按旧坐标放入船艏驾驶台区域会触发边界失败，需要撤销后重新放置',
        materialSource: '2019版底图坐标表（已过时）',
        resolved: false,
      },
      {
        id: 'exp-2',
        type: 'collision',
        description: '网格吸附关闭状态下，货箱边界判断会出现约40cm的误差，需对比吸附前后差异',
        materialSource: '上次碰撞误判备注（B区与C区边界）',
        resolved: false,
      },
      {
        id: 'exp-3',
        type: 'state_desync',
        description: '撤销救生筏重复标注后，需在报告里说明两份材料（草稿 vs 截图）哪一份被保留',
        materialSource: '标注草稿 + 现场截图圈注',
        resolved: false,
      },
    ],
  },
]

export const getLevelById = (id: string): Level | undefined => {
  return levels.find((l) => l.id === id)
}
