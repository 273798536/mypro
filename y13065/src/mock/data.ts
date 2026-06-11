import type { Bar, ReviewComment, OverlapPair, ModifyHistory, ScreenshotRecord } from '@/types'

export const mockBars: Bar[] = [
  {
    id: 'bar-001',
    name: '前区主吊杆 1#',
    x: 2000,
    y: 500,
    z: 8500,
    length: 12000,
    status: 'passed',
    commentIds: ['cmt-001'],
    coordinateSystem: 'stage-local',
    zone: '前区'
  },
  {
    id: 'bar-002',
    name: '前区主吊杆 2#',
    x: 2000,
    y: 900,
    z: 8200,
    length: 12000,
    status: 'pending',
    commentIds: ['cmt-002', 'cmt-007'],
    coordinateSystem: 'stage-local',
    zone: '前区'
  },
  {
    id: 'bar-003', name: '中区景杆 3#', x: 2000, y: 2400, z: 7800, length: 12000,
    status: 'need-fix', commentIds: ['cmt-003'], coordinateSystem: 'stage-local', zone: '中区', riskLevel: '高'
  },
  {
    id: 'bar-004', name: '中区景杆 4#', x: 2030, y: 2420, z: 7800, length: 12000,
    status: 'overlap', commentIds: ['cmt-004'], coordinateSystem: 'stage-local', zone: '中区', riskLevel: '高'
  },
  {
    id: 'bar-005', name: '后区灯杆 5#', x: 2000, y: 4000, z: 7200, length: 12000,
    status: 'overlap', commentIds: ['cmt-005'], coordinateSystem: 'stage-local', zone: '后区', riskLevel: '中'
  },
  {
    id: 'bar-006', name: '后区灯杆 6#', x: 2015, y: 4005, z: 7210, length: 12000,
    status: 'overlap', commentIds: ['cmt-006'], coordinateSystem: 'stage-local', zone: '后区', riskLevel: '中'
  },
  {
    id: 'bar-007',
    name: '侧吊杆 L1',
    x: 500,
    y: 1800,
    z: 6500,
    length: 4000,
    status: 'pending',
    commentIds: ['cmt-008'],
    coordinateSystem: 'stage-local',
    zone: '侧区'
  },
  {
    id: 'bar-008',
    name: '侧吊杆 R1',
    x: 3500,
    y: 1800,
    z: 6500,
    length: 4000,
    status: 'passed',
    commentIds: [],
    coordinateSystem: 'stage-local',
    zone: '侧区'
  }
]

export const mockComments: ReviewComment[] = [
  {
    id: 'cmt-001',
    barId: 'bar-001',
    author: '张工',
    content: '坐标与图纸一致，安装平直度 ±2mm 内，可放行。',
    status: '已通过',
    createdAt: Date.now() - 86400000 * 3,
    hasLateAttachment: false
  },
  {
    id: 'cmt-002',
    barId: 'bar-002',
    author: '李工',
    content: 'Z轴标高差 15mm，需现场确认是否在容许范围内。建议复核吊点。',
    status: '待复核',
    createdAt: Date.now() - 86400000 * 2,
    hasLateAttachment: false
  },
  {
    id: 'cmt-003',
    barId: 'bar-003',
    author: '王工',
    content: '吊杆编号与设计图纸不符，现场为 3#，图纸标 4#。需核对变更单。',
    status: '需修改',
    createdAt: Date.now() - 86400000 * 1.5,
    hasLateAttachment: false
  },
  {
    id: 'cmt-004',
    barId: 'bar-004',
    author: '王工',
    content: '与 3# 吊杆空间位置严重重叠，净距仅 30mm，存在碰撞风险。',
    status: '待复核',
    createdAt: Date.now() - 86400000 * 1.2,
    hasLateAttachment: false
  },
  {
    id: 'cmt-005',
    barId: 'bar-005',
    author: '赵工',
    content: '后区两灯杆间距不足，灯具安装后干涉。建议调整其中一吊杆 Y 坐标。',
    status: '待复核',
    createdAt: Date.now() - 86400000,
    hasLateAttachment: false
  },
  {
    id: 'cmt-006',
    barId: 'bar-006',
    author: '赵工',
    content: '与 5# 灯杆重叠，见 cmt-005。',
    status: '待复核',
    createdAt: Date.now() - 86400000,
    hasLateAttachment: false
  },
  {
    id: 'cmt-007',
    barId: 'bar-002',
    author: '林姐',
    content: '晚到补充：现场复测标高 8215mm，偏差在 GB/T 36719 容许值内。附件：复测记录表_v2.pdf',
    status: '待复核',
    createdAt: Date.now() - 3600000,
    hasLateAttachment: true,
    attachmentName: '复测记录表_v2.pdf'
  },
  {
    id: 'cmt-008',
    barId: 'bar-007',
    author: '陈工',
    content: '侧吊杆安装位置与侧幕布冲突，需确认幕布展开轨迹。',
    status: '需修改',
    createdAt: Date.now() - 7200000,
    hasLateAttachment: false
  }
]

export const mockOverlapPairs: OverlapPair[] = [
  {
    id: 'ov-001',
    barIdA: 'bar-003',
    barIdB: 'bar-004',
    overlapDistance: 30,
    riskLevel: '高',
    detectedAt: Date.now() - 86400000 * 1.1
  },
  {
    id: 'ov-002',
    barIdA: 'bar-005',
    barIdB: 'bar-006',
    overlapDistance: 18,
    riskLevel: '中',
    detectedAt: Date.now() - 86400000 * 0.9
  }
]

export const mockHistory: ModifyHistory[] = [
  {
    id: 'hist-001',
    commentId: 'cmt-001',
    barId: 'bar-001',
    operator: '林姐',
    modifiedAt: Date.now() - 86400000 * 2.5,
    beforeValue: '待复核',
    afterValue: '已通过',
    reason: '复核坐标误差在规范内，安装合格，予以放行。',
    field: 'status'
  },
  {
    id: 'hist-002',
    commentId: 'cmt-003',
    barId: 'bar-003',
    operator: '林姐',
    modifiedAt: Date.now() - 86400000,
    beforeValue: '待复核',
    afterValue: '需修改',
    reason: '吊杆编号与图纸不符，需施工方补充变更签证单后再复核。',
    field: 'status'
  },
  {
    id: 'hist-003',
    commentId: 'cmt-008',
    barId: 'bar-007',
    operator: '林姐',
    modifiedAt: Date.now() - 5400000,
    beforeValue: '待复核',
    afterValue: '需修改',
    reason: '侧幕布安装轨迹与吊杆冲突 120mm，需调整吊杆出挑长度。',
    field: 'status'
  }
]

export const mockScreenshots: ScreenshotRecord[] = [
  {
    id: 'shot-001',
    imageUrl: '',
    title: '中区重叠问题讨论截图',
    capturedAt: Date.now() - 86400000 * 0.8,
    filterSnapshot: {
      zone: '中区',
      status: [],
      riskLevel: ['高'],
      appliedAt: Date.now() - 86400000 * 0.8
    },
    linkedBarIds: ['bar-003', 'bar-004'],
    hotspotAreas: [
      { barId: 'bar-003', x: 0.35, y: 0.42, width: 0.08, height: 0.35 },
      { barId: 'bar-004', x: 0.38, y: 0.43, width: 0.08, height: 0.35 }
    ]
  },
  {
    id: 'shot-002',
    imageUrl: '',
    title: '前区标高争议截图',
    capturedAt: Date.now() - 3600000 * 5,
    filterSnapshot: {
      zone: '前区',
      status: ['待复核'],
      appliedAt: Date.now() - 3600000 * 5
    },
    linkedBarIds: ['bar-002'],
    hotspotAreas: [
      { barId: 'bar-002', x: 0.42, y: 0.28, width: 0.06, height: 0.30 }
    ]
  }
]
