import type { PointCoordinate, ExceptionItem, ManualRemark } from '@/types';

export const samplePoints: PointCoordinate[] = [
  {
    id: 'PT-001',
    name: '展柜A-左侧射灯',
    originalName: '展柜A-左侧射灯',
    x: 1.2, y: 2.5, z: 0.8,
    showcaseId: 'SC-001',
    showcaseName: '青铜展区-展柜A',
    lightingScheme: '方案A-暖光3000K',
    lux: 180,
    colorTemperature: 3000,
    cri: 92,
    beamAngle: 15,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 2,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-002',
    name: '展柜A-右侧射灯',
    originalName: '展柜A-右侧射灯',
    x: 1.8, y: 2.5, z: 0.8,
    showcaseId: 'SC-001',
    showcaseName: '青铜展区-展柜A',
    lightingScheme: '方案A-暖光3000K',
    lux: 185,
    colorTemperature: 3000,
    cri: 92,
    beamAngle: 15,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 3,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-003',
    name: '展柜A-顶部洗墙灯',
    originalName: '展柜A-顶部洗墙灯',
    x: 1.5, y: 3.0, z: 0.8,
    showcaseId: 'SC-001',
    showcaseName: '青铜展区-展柜A',
    lightingScheme: '方案A-暖光3000K',
    lux: 120,
    colorTemperature: 3000,
    cri: 90,
    beamAngle: 60,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 4,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-004',
    name: '展柜B-主射灯',
    originalName: '展柜B-主射灯',
    x: 4.2, y: 2.5, z: 1.2,
    showcaseId: 'SC-002',
    showcaseName: '书画展区-展柜B',
    lightingScheme: '方案B-中性光4000K',
    lux: 85,
    colorTemperature: 4000,
    cri: 95,
    beamAngle: 20,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 5,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-005',
    name: '展柜B-辅助灯',
    originalName: '展柜B-辅助灯',
    x: 4.8, y: 2.2, z: 1.2,
    showcaseId: 'SC-002',
    showcaseName: '书画展区-展柜B',
    lightingScheme: '方案B-中性光4000K',
    lux: 50,
    colorTemperature: 4000,
    cri: 95,
    beamAngle: 30,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 6,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-006',
    name: '展柜C-展品聚焦灯',
    originalName: '展柜C-文物聚光灯',
    x: 7.5, y: 2.8, z: 0.6,
    showcaseId: 'SC-003',
    showcaseName: '玉器展区-展柜C',
    lightingScheme: '方案C-冷光5000K',
    lux: 220,
    colorTemperature: 5000,
    cri: 88,
    beamAngle: 10,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 7,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-007',
    name: '展柜C-氛围灯',
    originalName: '展柜C-氛围灯',
    x: 7.0, y: 2.0, z: 0.6,
    showcaseId: 'SC-003',
    showcaseName: '玉器展区-展柜C',
    lightingScheme: '方案C-冷光5000K',
    lux: 30,
    colorTemperature: 5000,
    cri: 85,
    beamAngle: 45,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 8,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-008',
    name: '展柜A-底部补光灯',
    originalName: '展柜A-底部补光灯',
    x: 1.5, y: 0.5, z: 0.8,
    showcaseId: 'SC-001',
    showcaseName: '青铜展区-展柜A',
    lightingScheme: '方案A-暖光3000K',
    lux: 60,
    colorTemperature: 3000,
    cri: 80,
    beamAngle: 25,
    sourceFile: '现场测量数据_20260610.xlsx',
    rowNumber: 9,
    importedAt: '2026-06-10 14:30:00'
  },
  {
    id: 'PT-009',
    name: '展柜D-轨道灯1号',
    originalName: '展柜D-轨道灯1号',
    x: 10.2, y: 3.2, z: 1.5,
    showcaseId: 'SC-004',
    showcaseName: '陶瓷展区-展柜D',
    lightingScheme: '方案A-暖光3000K',
    lux: 150,
    colorTemperature: 3000,
    cri: 78,
    beamAngle: 18,
    sourceFile: '设计方提交方案_20260608.xlsx',
    rowNumber: 12,
    importedAt: '2026-06-08 10:15:00'
  },
  {
    id: 'PT-010',
    name: '展柜D-轨道灯2号',
    originalName: '展柜D-轨道灯2号',
    x: 10.8, y: 3.2, z: 1.5,
    showcaseId: 'SC-004',
    showcaseName: '陶瓷展区-展柜D',
    lightingScheme: '方案A-暖光3000K',
    lux: 155,
    colorTemperature: 3000,
    cri: 78,
    beamAngle: 18,
    sourceFile: '设计方提交方案_20260608.xlsx',
    rowNumber: 13,
    importedAt: '2026-06-08 10:15:00'
  }
];

export const sampleExceptions: ExceptionItem[] = [
  {
    id: 'EX-001',
    type: 'name_inconsistency',
    severity: 'medium',
    title: '点位名称不一致',
    description: '点位PT-006在原始文件中名称为"展柜C-文物聚光灯"，导入后显示为"展柜C-展品聚焦灯"，需确认哪个是正确名称。',
    relatedPointIds: ['PT-006'],
    originalEvidence: [
      {
        pointName: '展柜C-文物聚光灯',
        coordinate: { x: 7.5, y: 2.8, z: 0.6 },
        sourceFile: '现场测量数据_20260610.xlsx',
        rowNumber: 7,
        originalValue: '展柜C-文物聚光灯'
      }
    ],
    status: 'pending',
    assignee: '阿乔',
    createdAt: '2026-06-10 15:00:00'
  },
  {
    id: 'EX-002',
    type: 'cri_too_low',
    severity: 'high',
    title: '显色指数低于标准要求',
    description: '展柜A和展柜D中多个点位CRI低于博物馆标准值90，可能影响文物展示效果。',
    relatedPointIds: ['PT-007', 'PT-008', 'PT-009', 'PT-010'],
    originalEvidence: [
      {
        pointName: '展柜C-氛围灯',
        coordinate: { x: 7.0, y: 2.0, z: 0.6 },
        sourceFile: '现场测量数据_20260610.xlsx',
        rowNumber: 8,
        originalValue: 'CRI: 85'
      },
      {
        pointName: '展柜D-轨道灯1号',
        coordinate: { x: 10.2, y: 3.2, z: 1.5 },
        sourceFile: '设计方提交方案_20260608.xlsx',
        rowNumber: 12,
        originalValue: 'CRI: 78'
      }
    ],
    status: 'evidence_needed',
    assignee: '阿乔',
    createdAt: '2026-06-10 15:10:00'
  },
  {
    id: 'EX-003',
    type: 'lux_out_of_range',
    severity: 'medium',
    title: '照度超出书画类文物标准',
    description: '展柜B-主射灯照度85lux，接近书画类文物50lux上限，需确认是否需要调整。',
    relatedPointIds: ['PT-004'],
    originalEvidence: [
      {
        pointName: '展柜B-主射灯',
        coordinate: { x: 4.2, y: 2.5, z: 1.2 },
        sourceFile: '现场测量数据_20260610.xlsx',
        rowNumber: 5,
        originalValue: '照度: 85lux'
      }
    ],
    status: 'processing',
    assignee: '阿乔',
    createdAt: '2026-06-10 15:20:00'
  },
  {
    id: 'EX-004',
    type: 'adjacent_merge_ambiguous',
    severity: 'low',
    title: '相邻点位合并存在歧义',
    description: '展柜A的PT-001和PT-002坐标相邻，自动合并时可能产生误判，请人工确认是否为同一灯具组。',
    relatedPointIds: ['PT-001', 'PT-002'],
    originalEvidence: [
      {
        pointName: '展柜A-左侧射灯',
        coordinate: { x: 1.2, y: 2.5, z: 0.8 },
        sourceFile: '现场测量数据_20260610.xlsx',
        rowNumber: 2,
        originalValue: 'X:1.2 Y:2.5 Z:0.8'
      },
      {
        pointName: '展柜A-右侧射灯',
        coordinate: { x: 1.8, y: 2.5, z: 0.8 },
        sourceFile: '现场测量数据_20260610.xlsx',
        rowNumber: 3,
        originalValue: 'X:1.8 Y:2.5 Z:0.8'
      }
    ],
    status: 'pending',
    assignee: '阿乔',
    createdAt: '2026-06-10 15:30:00'
  },
  {
    id: 'EX-005',
    type: 'lux_out_of_range',
    severity: 'high',
    title: '玉器展区照度过高',
    description: '展柜C-展品聚焦灯照度220lux，超出玉器类文物建议值150lux，存在光损害风险。',
    relatedPointIds: ['PT-006'],
    originalEvidence: [
      {
        pointName: '展柜C-展品聚焦灯',
        coordinate: { x: 7.5, y: 2.8, z: 0.6 },
        sourceFile: '现场测量数据_20260610.xlsx',
        rowNumber: 7,
        originalValue: '照度: 220lux'
      }
    ],
    status: 'resolved',
    assignee: '阿乔',
    createdAt: '2026-06-10 15:40:00',
    resolvedAt: '2026-06-12 10:30:00',
    resolution: '已与设计方沟通，将光束角从10°调整为15°，预计照度可降至160lux左右，待现场复核。'
  }
];

export const sampleRemarks: ManualRemark[] = [
  {
    id: 'RM-001',
    targetId: 'EX-001',
    targetType: 'exception',
    content: '已核对原始图纸，正确名称应为"展柜C-文物聚光灯"，请修改系统中的显示名称。',
    author: '李工',
    createdAt: '2026-06-11 09:15:00',
    updatedAt: '2026-06-11 09:15:00'
  },
  {
    id: 'RM-002',
    targetId: 'PT-004',
    targetType: 'point',
    content: '此点位照射《兰亭集序》摹本，需严格控制在50lux以内，建议更换为更低功率灯具。',
    author: '王馆长',
    createdAt: '2026-06-11 11:30:00',
    updatedAt: '2026-06-11 11:30:00'
  },
  {
    id: 'RM-003',
    targetId: 'EX-002',
    targetType: 'exception',
    content: '请设计方提供灯具规格书，确认是否可更换为高CRI光源。',
    author: '张项目经理',
    createdAt: '2026-06-12 14:00:00',
    updatedAt: '2026-06-12 14:00:00'
  }
];
