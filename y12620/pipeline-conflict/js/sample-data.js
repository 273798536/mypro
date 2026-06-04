const SAMPLE_RECORDS = [
  {
    id: 'REC-001',
    label: '顺利记录',
    status: 'ok',
    statusLabel: '可直接使用',
    reviewTag: 'direct',
    source: {
      fileName: 'plan_district_A.png',
      importedAt: '2026-06-04T09:15:00Z',
      imageWidth: 2400,
      imageHeight: 1600
    },
    scale: {
      detected: true,
      barPixels: 120,
      barRealMm: 5000,
      ratio: 0.024,
      unit: 'mm/px',
      valid: true
    },
    pipelines: [
      { type: 'water', color: '#2196F3', points: [[100, 400], [500, 400], [500, 800]], label: 'W-01' },
      { type: 'gas', color: '#FF9800', points: [[100, 600], [500, 600], [900, 600]], label: 'G-01' },
      { type: 'electric', color: '#F44336', points: [[300, 200], [300, 1000]], label: 'E-01' }
    ],
    conflicts: [],
    coordinateFlip: false,
    notes: '所有管线间距合规，比例尺正确，可直接用于施工。'
  },
  {
    id: 'REC-002',
    label: '待确认记录',
    status: 'pending',
    statusLabel: '需车间主管复核',
    reviewTag: 'review',
    source: {
      fileName: 'plan_district_B.png',
      importedAt: '2026-06-04T10:30:00Z',
      imageWidth: 2400,
      imageHeight: 1600
    },
    scale: {
      detected: true,
      barPixels: 120,
      barRealMm: 5000,
      ratio: 0.024,
      unit: 'mm/px',
      valid: true
    },
    pipelines: [
      { type: 'water', color: '#2196F3', points: [[200, 300], [600, 300], [600, 700]], label: 'W-02' },
      { type: 'gas', color: '#FF9800', points: [[200, 320], [600, 320], [600, 700]], label: 'G-02' },
      { type: 'electric', color: '#F44336', points: [[400, 100], [400, 900]], label: 'E-02' }
    ],
    conflicts: [
      {
        id: 'CF-001',
        pipelines: ['W-02', 'G-02'],
        type: 'proximity',
        severity: 'warning',
        location: [400, 310],
        message: '水管 W-02 与燃气管 G-02 间距不足 300mm，需确认安全距离。'
      }
    ],
    coordinateFlip: false,
    notes: 'W-02 与 G-02 局部并行间距偏小，建议车间主管现场复核。'
  },
  {
    id: 'REC-003',
    label: '坏数据',
    status: 'error',
    statusLabel: '数据异常，不可使用',
    reviewTag: 'invalid',
    source: {
      fileName: 'plan_district_C_corrupt.png',
      importedAt: '2026-06-04T11:45:00Z',
      imageWidth: 2400,
      imageHeight: 1600
    },
    scale: {
      detected: false,
      barPixels: 0,
      barRealMm: 0,
      ratio: null,
      unit: 'mm/px',
      valid: false,
      error: '未检测到比例尺标尺，无法确定比例。请在原图中标注比例尺后重新导入。'
    },
    pipelines: [
      { type: 'water', color: '#2196F3', points: [[2000, -50], [2400, -50], [2400, 400]], label: 'W-03' },
      { type: 'gas', color: '#FF9800', points: [[-100, 800], [500, 200]], label: 'G-03' },
      { type: 'electric', color: '#F44336', points: [[1200, 900], [1200, 1700]], label: 'E-03' }
    ],
    conflicts: [
      {
        id: 'CF-002',
        pipelines: ['W-03'],
        type: 'out_of_bounds',
        severity: 'critical',
        location: [2200, -50],
        message: '水管 W-03 坐标超出图纸范围，Y值为负，疑似坐标系翻转或数据损坏。'
      },
      {
        id: 'CF-003',
        pipelines: ['G-03'],
        type: 'out_of_bounds',
        severity: 'critical',
        location: [-100, 800],
        message: '燃气管 G-03 起点X坐标为负值，数据异常。'
      },
      {
        id: 'CF-004',
        pipelines: ['E-03'],
        type: 'out_of_bounds',
        severity: 'critical',
        location: [1200, 1700],
        message: '电缆 E-03 终点Y坐标超出图纸高度(1600)，数据异常。'
      }
    ],
    coordinateFlip: true,
    notes: 'Y轴坐标系疑似翻转，多处管线坐标超出图纸范围，且未检测到比例尺，此份数据不可使用。'
  }
];

const COLOR_RULES = {
  water: { color: '#2196F3', name: '给水管', minWidth: 3 },
  gas: { color: '#FF9800', name: '燃气管', minWidth: 3 },
  electric: { color: '#F44336', name: '电缆', minWidth: 2 },
  telecom: { color: '#9C27B0', name: '通信线', minWidth: 2 },
  drainage: { color: '#4CAF50', name: '排水管', minWidth: 3 },
  heat: { color: '#FF5722', name: '热力管', minWidth: 3 }
};

const MIN_SAFE_DISTANCE_MM = 300;

export { SAMPLE_RECORDS, COLOR_RULES, MIN_SAFE_DISTANCE_MM };
