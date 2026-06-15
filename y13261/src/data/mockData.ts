import type {
  Review,
  SceneMeta,
  Material,
  Judgment,
  Photo,
  Anomaly,
} from '@/types';

export const mockReviews: Review[] = [
  {
    id: 'rev-001',
    title: '人民大道与中山路口雨水口积淤容量复核',
    status: 'anomaly',
    location: '人民大道与中山路交叉口',
    point: { x: 45, y: 40 },
    adjacentPoints: [
      { id: 'adj-1', name: '人民大道北50米', x: 45, y: 25, status: 'normal' },
      { id: 'adj-2', name: '中山路西30米', x: 28, y: 40, status: 'mismatch' },
      { id: 'adj-3', name: '人民大道南40米', x: 45, y: 58, status: 'normal' },
    ],
    createdAt: '2024-01-15 09:30:00',
    updatedAt: '2024-01-17 16:45:00',
    hasAnomaly: true,
  },
  {
    id: 'rev-002',
    title: '建设街与环城路口雨水口积淤容量复核',
    status: 'processing',
    location: '建设街与环城路交叉口',
    point: { x: 65, y: 55 },
    adjacentPoints: [
      { id: 'adj-4', name: '建设街东20米', x: 78, y: 55, status: 'normal' },
      { id: 'adj-5', name: '环城路北35米', x: 65, y: 38, status: 'normal' },
    ],
    createdAt: '2024-01-16 14:20:00',
    updatedAt: '2024-01-17 10:15:00',
    hasAnomaly: false,
  },
  {
    id: 'rev-003',
    title: '学府路与文汇路口雨水口积淤容量复核',
    status: 'completed',
    location: '学府路与文汇路交叉口',
    point: { x: 30, y: 70 },
    adjacentPoints: [
      { id: 'adj-6', name: '学府路南25米', x: 30, y: 82, status: 'normal' },
      { id: 'adj-7', name: '文汇路东40米', x: 48, y: 70, status: 'normal' },
    ],
    createdAt: '2024-01-10 08:45:00',
    updatedAt: '2024-01-14 17:30:00',
    hasAnomaly: false,
  },
  {
    id: 'rev-004',
    title: '滨河大道与江景路口雨水口积淤容量复核',
    status: 'pending',
    location: '滨河大道与江景路交叉口',
    point: { x: 75, y: 30 },
    adjacentPoints: [
      { id: 'adj-8', name: '滨河大道西60米', x: 55, y: 30, status: 'normal' },
    ],
    createdAt: '2024-01-17 11:00:00',
    updatedAt: '2024-01-17 11:00:00',
    hasAnomaly: false,
  },
];

export const mockSceneMetas: Record<string, SceneMeta> = {
  'rev-001': {
    reviewId: 'rev-001',
    sceneLabels: ['主干道交叉口', '早高峰积水', '老旧管网'],
    sideNote:
      '该路口为老城区主干道交叉口，雨水管网建成于2005年，设计标准偏低。经现场踏勘，雨水口存在不同程度积淤，其中中山路西侧雨水口积淤情况较为严重，需重点复核。当前存在相邻路口管网衔接异常，已标记待确认。',
    pageSummary:
      '人民大道与中山路口雨水口积淤容量复核：共3处雨水口，其中1处积淤严重，2处正常。存在相邻路口合错异常待处理，整体容量不满足5年一遇排水标准。',
    sideNoteManual: false,
    pageSummaryManual: false,
    updatedAt: '2024-01-17 16:45:00',
    updatedBy: '老何',
  },
  'rev-002': {
    reviewId: 'rev-002',
    sceneLabels: ['次干道', '新建区域', '管网较新'],
    sideNote:
      '建设街与环城路口位于城市新开发区域，管网建成于2020年，设计标准较高。现场踏勘发现部分雨水口有落叶堆积，但积淤程度较轻，预计复核结果较乐观。',
    pageSummary:
      '建设街与环城路口雨水口积淤容量复核：共2处雨水口，积淤程度较轻，预计满足排水标准。正在等待第二批材料补齐。',
    sideNoteManual: false,
    pageSummaryManual: false,
    updatedAt: '2024-01-17 10:15:00',
    updatedBy: '老何',
  },
  'rev-003': {
    reviewId: 'rev-003',
    sceneLabels: ['文教区', '绿化率高', '落叶较多'],
    sideNote:
      '学府路与文汇路口位于高校周边，绿化率较高，落叶季节雨水口易被落叶堵塞。经复核，虽然落叶堆积较多，但底部积淤不严重，清理后可满足排水要求。',
    pageSummary:
      '学府路与文汇路口雨水口积淤容量复核：共2处雨水口，落叶堆积为主，积淤较轻。建议加强落叶季节巡查频率。复核完成。',
    sideNoteManual: false,
    pageSummaryManual: false,
    updatedAt: '2024-01-14 17:30:00',
    updatedBy: '老何',
  },
  'rev-004': {
    reviewId: 'rev-004',
    sceneLabels: ['滨江区域', '地势低洼'],
    sideNote: '待补充现场踏勘信息。',
    pageSummary: '滨河大道与江景路口雨水口积淤容量复核：待开始。',
    sideNoteManual: false,
    pageSummaryManual: false,
    updatedAt: '2024-01-17 11:00:00',
    updatedBy: '系统',
  },
};

export const mockMaterials: Record<string, Material[]> = {
  'rev-001': [
    {
      id: 'mat-001',
      reviewId: 'rev-001',
      name: '雨水口设计图纸(2005版)',
      type: 'drainage_design',
      batchNo: 1,
      uploadTime: '2024-01-15 09:45:00',
      uploader: '老何',
      chatRecords: [
        {
          id: 'chat-1',
          speaker: '张主任',
          content: '老何，这个路口的设计图找到了，是2005年的版本，你先看看',
          time: '2024-01-15 09:40:00',
          isLeader: true,
        },
        {
          id: 'chat-2',
          speaker: '老何',
          content: '好的张主任，我这就开始复核',
          time: '2024-01-15 09:42:00',
          isLeader: false,
        },
      ],
    },
    {
      id: 'mat-002',
      reviewId: 'rev-001',
      name: '2023年汛后检测报告',
      type: 'survey_report',
      batchNo: 1,
      uploadTime: '2024-01-15 10:20:00',
      uploader: '老何',
      chatRecords: [],
    },
    {
      id: 'mat-003',
      reviewId: 'rev-001',
      name: '2022年审批意见书',
      type: 'approval',
      batchNo: 2,
      uploadTime: '2024-01-16 14:30:00',
      uploader: '小李',
      chatRecords: [
        {
          id: 'chat-3',
          speaker: '小李',
          content: '何工，上次你要的审批意见书找到了，是2022年那版',
          time: '2024-01-16 14:25:00',
          isLeader: false,
        },
        {
          id: 'chat-4',
          speaker: '老何',
          content: '好的，我补上。这批材料很关键，能说明当初的审批依据',
          time: '2024-01-16 14:28:00',
          isLeader: false,
        },
      ],
    },
  ],
  'rev-002': [
    {
      id: 'mat-004',
      reviewId: 'rev-002',
      name: '雨水系统规划图',
      type: 'drainage_design',
      batchNo: 1,
      uploadTime: '2024-01-16 14:30:00',
      uploader: '老何',
      chatRecords: [],
    },
  ],
  'rev-003': [
    {
      id: 'mat-005',
      reviewId: 'rev-003',
      name: '雨水口竣工图',
      type: 'drainage_design',
      batchNo: 1,
      uploadTime: '2024-01-10 09:00:00',
      uploader: '老何',
      chatRecords: [],
    },
    {
      id: 'mat-006',
      reviewId: 'rev-003',
      name: '现场检测数据',
      type: 'survey_report',
      batchNo: 1,
      uploadTime: '2024-01-11 11:00:00',
      uploader: '老何',
      chatRecords: [],
    },
  ],
  'rev-004': [],
};

export const mockJudgments: Record<string, Judgment[]> = {
  'rev-001': [
    {
      id: 'jud-001',
      reviewId: 'rev-001',
      content: '基于第一批材料，该路口雨水口积淤约30%，基本满足排水要求，建议安排常规清淤。',
      reason: '初始判断',
      operator: '老何',
      createdAt: '2024-01-15 16:00:00',
      isCurrent: false,
      version: 1,
    },
    {
      id: 'jud-002',
      reviewId: 'rev-001',
      content: '补充审批意见书后发现，原设计标准偏低，实际积淤已达50%，中山路西侧雨水口存在瓶颈。不满足5年一遇标准，建议立项改造。',
      reason: '收到第二批审批材料，发现原设计标准低于现行规范，调整判断',
      operator: '老何',
      createdAt: '2024-01-16 17:20:00',
      isCurrent: false,
      version: 2,
    },
    {
      id: 'jud-003',
      reviewId: 'rev-001',
      content: '现场照片补录后确认，中山路西侧雨水口积淤严重，且与相邻路口管网衔接存在错口问题。积淤容量复核结果：不满足3年一遇标准，需立即整改，并协调相邻路口管网排查。',
      reason: '补录现场照片，发现积淤比预期更严重，且相邻路口合错',
      operator: '老何',
      createdAt: '2024-01-17 16:45:00',
      isCurrent: true,
      version: 3,
    },
  ],
  'rev-002': [
    {
      id: 'jud-004',
      reviewId: 'rev-002',
      content: '初步判断该路口管网较新，积淤情况较轻，待第二批材料补齐后确认最终结果。',
      reason: '材料不全，初步判断',
      operator: '老何',
      createdAt: '2024-01-17 10:15:00',
      isCurrent: true,
      version: 1,
    },
  ],
  'rev-003': [
    {
      id: 'jud-005',
      reviewId: 'rev-003',
      content: '该路口雨水口以落叶堆积为主，底部积淤较轻，清理后可满足排水要求。建议落叶季节增加巡查频次。',
      reason: '最终复核结论',
      operator: '老何',
      createdAt: '2024-01-14 17:30:00',
      isCurrent: true,
      version: 1,
    },
  ],
  'rev-004': [],
};

export const mockPhotos: Record<string, Photo[]> = {
  'rev-001': [
    {
      id: 'photo-001',
      reviewId: 'rev-001',
      url: '',
      locationDesc: '人民大道与中山路口西南角雨水口',
      changeNote: '首次补录，显示该雨水口篦子上有大量落叶和泥沙堆积',
      uploadTime: '2024-01-17 14:20:00',
      uploader: '老何',
      point: { x: 42, y: 43 },
    },
    {
      id: 'photo-002',
      reviewId: 'rev-001',
      url: '',
      locationDesc: '中山路西侧30米雨水口',
      changeNote: '补录此点位照片，发现积淤情况比设计图纸标注的更严重，雨水井内积淤约60cm',
      uploadTime: '2024-01-17 15:10:00',
      uploader: '老何',
      point: { x: 28, y: 40 },
    },
  ],
  'rev-002': [],
  'rev-003': [
    {
      id: 'photo-003',
      reviewId: 'rev-003',
      url: '',
      locationDesc: '学府路雨水口',
      changeNote: '补录现场照片，以落叶堆积为主',
      uploadTime: '2024-01-12 09:30:00',
      uploader: '老何',
      point: { x: 30, y: 72 },
    },
  ],
  'rev-004': [],
};

export const mockAnomalies: Record<string, Anomaly[]> = {
  'rev-001': [
    {
      id: 'anom-001',
      reviewId: 'rev-001',
      type: 'adjacent_mismatch',
      title: '相邻路口管网合错',
      description:
        '检测发现中山路西侧30米处雨水口（adj-2）与本复核路口的管网衔接存在错口问题，两处管道高程差约15cm。',
      impact:
        '该合错问题导致雨水流动不畅，加剧本路口积淤情况，同时可能影响相邻路口的排水能力，降低整体管网排水标准约20%。',
      nextSteps: [
        '联系管网科调取中山路全线管网竣工图，确认错口位置和范围',
        '安排检测人员对该段管网进行CCTV内窥检测，核实错口程度',
        '与相邻路口复核人员（如已开展）沟通，对齐判断标准',
        '根据检测结果，更新本次复核的积淤容量计算',
        '如确认影响较大，需在报告中专项说明并建议整改',
      ],
      resolved: false,
    },
  ],
  'rev-002': [],
  'rev-003': [],
  'rev-004': [],
};
