import type { CadLayer, Judgment, Withdrawal, ObjectOverlap, ReviewSnapshot, HandoverReport } from '@/types'

export const mockCadLayers: CadLayer[] = [
  {
    id: 'layer-1',
    name: 'B1层建筑结构_v1.dwg',
    importedAt: '2026-05-20 10:30',
    isSupplement: false,
    coordinateSystem: 'BJ-54',
    coordinateValid: true,
    objects: [
      { id: 'obj-1', name: 'B1-东墙', type: 'wall', x: 1200, y: 800, width: 5000, height: 300, layerId: 'layer-1' },
      { id: 'obj-2', name: 'B1-电梯井A', type: 'elevator', x: 2400, y: 1500, width: 1800, height: 2200, layerId: 'layer-1' },
    ],
  },
  {
    id: 'layer-2',
    name: 'B1层物流路径_v2.dwg',
    importedAt: '2026-05-22 14:15',
    isSupplement: false,
    coordinateSystem: 'WGS-84',
    coordinateValid: false,
    objects: [
      { id: 'obj-3', name: '机器人停靠站#3', type: 'station', x: 3100, y: 2100, width: 900, height: 900, layerId: 'layer-2' },
      { id: 'obj-4', name: '主通道门禁', type: 'door', x: 4200, y: 1900, width: 400, height: 250, layerId: 'layer-2' },
    ],
    conflictsWith: ['judgment-v1'],
  },
  {
    id: 'layer-3',
    name: 'B1层暖通补充_v3.dwg',
    importedAt: '2026-06-01 09:00',
    isSupplement: true,
    coordinateSystem: 'BJ-54',
    coordinateValid: true,
    objects: [
      { id: 'obj-5', name: '风管-西段', type: 'wall', x: 800, y: 2800, width: 6000, height: 600, layerId: 'layer-3' },
    ],
    conflictsWith: ['judgment-v2'],
  },
  {
    id: 'layer-4',
    name: 'B1层机器人动线修正_v4.dwg',
    importedAt: '2026-06-05 16:45',
    isSupplement: true,
    coordinateSystem: 'BJ-54',
    coordinateValid: true,
    objects: [
      { id: 'obj-6', name: 'AGV转弯半径修正', type: 'robot', x: 2000, y: 3200, width: 1500, height: 1500, layerId: 'layer-4' },
    ],
  },
]

export const mockJudgments: Judgment[] = [
  {
    id: 'judgment-v1',
    version: 'v1',
    content: 'B1层主通道净宽2.4m满足机器人单向通行',
    madeAt: '2026-05-21 11:00',
    madeBy: '小赵',
    basedOnLayers: ['layer-1'],
    isWithdrawn: true,
    isManualOverride: false,
  },
  {
    id: 'judgment-v2',
    version: 'v2',
    content: '补充门禁图层后主通道净宽仅1.8m，需改为双向错车方案',
    madeAt: '2026-05-23 10:20',
    madeBy: '小赵',
    basedOnLayers: ['layer-1', 'layer-2'],
    isWithdrawn: true,
    isManualOverride: false,
  },
  {
    id: 'judgment-v3',
    version: 'v3',
    content: '暖通风管占压后，机器人动线需绕行电梯厅西侧',
    madeAt: '2026-06-02 15:30',
    madeBy: '小赵',
    basedOnLayers: ['layer-1', 'layer-2', 'layer-3'],
    isWithdrawn: false,
    isManualOverride: true,
    overrideReason: '风管高度为下皮+2.8m，机器人高度1.6m可通行，无需绕行',
    overriddenBy: '李工',
  },
  {
    id: 'judgment-v4',
    version: 'v4',
    content: '修正动线后，电梯厅西侧可通行宽度2.1m，满足双向错车',
    madeAt: '2026-06-06 09:15',
    madeBy: '小赵',
    basedOnLayers: ['layer-1', 'layer-2', 'layer-3', 'layer-4'],
    isWithdrawn: false,
    isManualOverride: false,
  },
]

export const mockWithdrawals: Withdrawal[] = [
  {
    id: 'wd-1',
    judgmentId: 'judgment-v1',
    reason: 'layer-2补充门禁图层后，原净宽计算不含门框，实际净宽减少600mm',
    withdrawnAt: '2026-05-23 10:10',
    withdrawnBy: '小赵',
    impacts: ['judgment-v2'],
  },
  {
    id: 'wd-2',
    judgmentId: 'judgment-v2',
    reason: 'layer-3暖通补充图层显示风管占压主通道顶部，原绕行方案未考虑风管对动线垂直空间的影响',
    withdrawnAt: '2026-06-02 15:15',
    withdrawnBy: '小赵',
    impacts: ['judgment-v3'],
  },
]

export const mockOverlaps: ObjectOverlap[] = [
  {
    id: 'ov-1',
    severity: 'critical',
    objectA: '机器人停靠站#3',
    objectB: 'B1-电梯井A',
    layerA: 'layer-2',
    layerB: 'layer-1',
    status: 'resolved',
    steps: [
      { order: 1, instruction: '打开图层 [B1层建筑结构_v1.dwg]', codeHint: 'layer-1', completed: true },
      { order: 2, instruction: '定位对象 [B1-电梯井A]', codeHint: '坐标 (2400, 1500)', completed: true },
      { order: 3, instruction: '切换坐标系至 BJ-54，核对电梯井边界', codeHint: '坐标系: BJ-54', completed: true },
      { order: 4, instruction: '将 [机器人停靠站#3] 东移 800mm 至坐标 (3900, 2100)', codeHint: '目标 X: 3900', completed: true },
    ],
  },
  {
    id: 'ov-2',
    severity: 'warning',
    objectA: '风管-西段',
    objectB: 'AGV转弯半径修正',
    layerA: 'layer-3',
    layerB: 'layer-4',
    status: 'processing',
    steps: [
      { order: 1, instruction: '打开图层 [B1层暖通补充_v3.dwg]', codeHint: 'layer-3', completed: true },
      { order: 2, instruction: '打开图层 [B1层机器人动线修正_v4.dwg]', codeHint: 'layer-4', completed: true },
      { order: 3, instruction: '测量风管下皮标高与机器人顶部净空', codeHint: '风管下皮 +2.8m / 机器人 +1.6m', completed: false },
      { order: 4, instruction: '若净空<1.2m，将动线南移 500mm', codeHint: '目标 Y: 3700', completed: false },
    ],
  },
  {
    id: 'ov-3',
    severity: 'minor',
    objectA: '主通道门禁',
    objectB: 'B1-东墙',
    layerA: 'layer-2',
    layerB: 'layer-1',
    status: 'pending',
    steps: [
      { order: 1, instruction: '确认门禁嵌入墙体是否为设计意图', codeHint: '咨询建筑专业', completed: false },
      { order: 2, instruction: '若是，调整机器人路径为门禁居中通行', codeHint: '路径 Y: 1900', completed: false },
    ],
  },
]

export const mockSnapshots: ReviewSnapshot[] = [
  {
    id: 'snap-1',
    name: '6月3日评审会-电梯厅动线截图',
    createdAt: '2026-06-03 14:20',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hospital%20basement%20logistics%20robot%20path%20CAD%20floor%20plan%20blueprint%20technical%20drawing%20with%20grid&image_size=landscape_16_9',
    hotspots: [
      { id: 'hs-1', x: 28, y: 35, width: 18, height: 22, targetObjectId: 'obj-2', label: '电梯井A' },
      { id: 'hs-2', x: 58, y: 42, width: 14, height: 14, targetObjectId: 'obj-3', label: '机器人停靠站#3' },
      { id: 'hs-3', x: 12, y: 62, width: 60, height: 10, targetObjectId: 'obj-5', label: '风管-西段（占压顶部）' },
    ],
    filterCondition: {
      visibleLayers: ['layer-1', 'layer-2', 'layer-3'],
      coordinateSystem: 'BJ-54',
      showGrid: true,
      zoomLevel: 1.2,
    },
  },
  {
    id: 'snap-2',
    name: '6月6日复核-绕行方案截图',
    createdAt: '2026-06-06 10:05',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hospital%20AGV%20robot%20route%20planning%20technical%20diagram%20with%20dimensions%20and%20turn%20radius%20engineering%20blueprint&image_size=landscape_16_9',
    hotspots: [
      { id: 'hs-4', x: 20, y: 55, width: 25, height: 25, targetObjectId: 'obj-6', label: 'AGV转弯半径修正区' },
    ],
    filterCondition: {
      visibleLayers: ['layer-1', 'layer-3', 'layer-4'],
      coordinateSystem: 'BJ-54',
      showGrid: false,
      zoomLevel: 1.5,
    },
  },
]

export const mockReport: HandoverReport = {
  projectName: 'XX医院B1层物流机器人剖面讲解',
  generatedAt: '2026-06-08 17:30',
  generatedBy: '小赵',
  processed: [
    { id: 'p-1', title: '坐标系统一：WGS-84 → BJ-54', processedAt: '2026-05-24', processedBy: '小赵', note: 'layer-2 已转换完成，核对偏差<5mm' },
    { id: 'p-2', title: '电梯井与停靠站重叠处理', processedAt: '2026-05-28', processedBy: '小赵', note: '停靠站东移800mm，已复核净距' },
    { id: 'p-3', title: 'v1判断撤回（净宽计算错误）', processedAt: '2026-05-23', processedBy: '小赵', note: '影响v2判断，见撤回记录wd-1' },
    { id: 'p-4', title: 'v2判断撤回（风管占压未考虑）', processedAt: '2026-06-02', processedBy: '小赵', note: '影响v3判断，见撤回记录wd-2' },
  ],
  pendingMaterials: [
    { id: 'pm-1', title: 'B1层消防分区图（最终版）', description: '需确认机器人动线是否跨越防火分区', expectedDate: '2026-06-12', contact: '消防专业-王工' },
    { id: 'pm-2', title: '电梯厅精装完成面标高', description: '影响机器人爬坡角度验算', expectedDate: '2026-06-15', contact: '精装专业-刘工' },
  ],
  manualOverrides: [
    {
      id: 'mo-1',
      originalJudgment: 'v3：暖通风管占压后需绕行电梯厅西侧',
      overrideJudgment: 'v3（人工改判）：风管下皮+2.8m，机器人高1.6m，净空充足，无需绕行',
      reason: '原判断误将风管当成水平占压，实际为垂直方向且净空满足',
      overriddenBy: '李工',
      overriddenAt: '2026-06-04',
    },
  ],
  navigation: {
    materialPaths: [
      { id: 'mp-1', label: 'CAD原始材料', path: '/Volumes/Project/XX医院/B1层/CAD/原始', description: '各专业提资的原始dwg文件' },
      { id: 'mp-2', label: 'CAD处理后归档', path: '/Volumes/Project/XX医院/B1层/CAD/归档', description: '坐标系统一、重叠处理后的版本' },
      { id: 'mp-3', label: '补充材料上传', path: '/Volumes/Project/XX医院/B1层/待补充', description: '消防、精装专业提资存放处' },
      { id: 'mp-4', label: '历史判断版本', path: '/Volumes/Project/XX医院/B1层/判断记录', description: 'v1~v4每次判断的导出文件' },
    ],
    anomalyLocations: [
      { id: 'al-1', layerName: 'B1层机器人动线修正_v4.dwg', coordinates: '(2000, 3200)', relatedObject: 'AGV转弯半径修正', description: '与风管垂直净空待复核（处理中）' },
      { id: 'al-2', layerName: 'B1层物流路径_v2.dwg', coordinates: '(4200, 1900)', relatedObject: '主通道门禁', description: '嵌入墙体，是否为设计意图待确认' },
    ],
    exportModes: [
      { id: 'em-1', name: '按当前筛选导出', description: '导出当前可见图层和筛选条件的CAD+判断说明', params: { layers: '当前可见', filter: '当前状态', annotation: '是' } },
      { id: 'em-2', name: '按历史版本快照导出', description: '选择某次判断版本对应的图层组合导出', params: { version: 'v1/v2/v3/v4', annotation: '含撤回标记' } },
      { id: 'em-3', name: '按评审版本导出', description: '导出评审会截图对应的图层和筛选条件', params: { snapshot: 'snap-1/snap-2', annotation: '含热点标注' } },
    ],
  },
}
