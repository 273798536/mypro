import type { ScoreRecord, LayerRecord, HitRecord, ProcessNote, ImportData } from '@/types';

const scoreRecords: ScoreRecord[] = [
  {
    id: 'REC-2025-001',
    patientName: '张建国',
    patientId: 'P-2024-1567',
    scoreItem: '肩关节前屈活动度',
    score: 72,
    fillTime: '2025-05-28 14:30',
    fillUnit: '康复医学科第一治疗室',
    fillOperator: '李治疗师',
    remark: '患者术后第4周，进步明显',
    status: 'pending',
    anomalyType: 'material_missing',
    anomalyReason: '关键帧截图未上传，无法确认关节活动终点位置',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-002',
    patientName: '王秀兰',
    patientId: 'P-2024-0892',
    scoreItem: '下肢负重平衡训练',
    score: 65,
    fillTime: '2025-05-28 10:15',
    fillUnit: '',
    fillOperator: '王治疗师',
    remark: '',
    status: 'pending',
    anomalyType: 'incomplete_data',
    anomalyReason: '填写单位漏填，请补录',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-003',
    patientName: '刘志强',
    patientId: 'P-2025-0034',
    scoreItem: '手部精细动作评分',
    score: 88,
    fillTime: '2025-05-27 16:45',
    fillUnit: '作业治疗室',
    fillOperator: '陈治疗师',
    remark: '2025-05-28补录：患者昨日临时出院，今日补交资料',
    status: 'processed',
    anomalyType: 'none',
    anomalyReason: '',
    isOldFormat: false,
    hasSupplementary: true,
  },
  {
    id: 'REC-2025-004',
    patientName: '赵美玲',
    patientId: 'P-2024-2201',
    scoreItem: '步行功能评估',
    score: 58,
    fillTime: '2025-05-27 09:20',
    fillUnit: '运动治疗室',
    fillOperator: '周治疗师',
    remark: '',
    status: 'pending',
    anomalyType: 'material_missing',
    anomalyReason: '侧面观视频帧损坏，第3-5秒画面无法读取',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-005',
    patientName: '孙德明',
    patientId: 'OLD-2023-0045',
    scoreItem: '颈椎活动范围测量',
    score: 75,
    fillTime: '2025-05-26 15:00',
    fillUnit: '骨科康复组',
    fillOperator: '吴治疗师',
    remark: '旧系统数据迁移，部分字段格式不统一',
    status: 'pending',
    anomalyType: 'old_format',
    anomalyReason: '旧格式评分表，图层标记规则与新版不一致',
    isOldFormat: true,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-006',
    patientName: '周丽娟',
    patientId: 'P-2025-0078',
    scoreItem: '上肢协调性训练',
    score: 82,
    fillTime: '2025-05-26 11:30',
    fillUnit: '康复医学科第一治疗室',
    fillOperator: '郑治疗师',
    remark: '',
    status: 'pending',
    anomalyType: 'layer_occlusion',
    anomalyReason: '第2、4图层存在遮挡，关键点识别准确率下降',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-007',
    patientName: '吴明辉',
    patientId: 'P-2024-1892',
    scoreItem: '平衡功能评定',
    score: 91,
    fillTime: '2025-05-25 14:00',
    fillUnit: '运动治疗室',
    fillOperator: '李治疗师',
    remark: '患者已康复出院，评分达标',
    status: 'processed',
    anomalyType: 'none',
    anomalyReason: '',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-008',
    patientName: '郑小红',
    patientId: 'P-2025-0102',
    scoreItem: '手部肌力分级',
    score: 45,
    fillTime: '2025-05-25 09:45',
    fillUnit: '作业治疗室',
    fillOperator: '王治疗师',
    remark: '',
    status: 'pending',
    anomalyType: 'material_missing',
    anomalyReason: '肌力测量截图共应6张，目前仅上传2张，缺失第3、4、5、6组肌群截图',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-009',
    patientName: '钱伟强',
    patientId: 'P-2024-3001',
    scoreItem: '关节活动度综合评分',
    score: 78,
    fillTime: '2025-05-24 15:30',
    fillUnit: '康复医学科第二治疗室',
    fillOperator: '陈治疗师',
    remark: '',
    status: 'normal',
    anomalyType: 'none',
    anomalyReason: '',
    isOldFormat: false,
    hasSupplementary: false,
  },
  {
    id: 'REC-2025-010',
    patientName: '冯国华',
    patientId: 'OLD-2023-0156',
    scoreItem: '步态分析评分',
    score: 68,
    fillTime: '2025-05-24 10:20',
    fillUnit: '',
    fillOperator: '周治疗师',
    remark: '历史数据补录，2023年评估记录',
    status: 'pending',
    anomalyType: 'old_format',
    anomalyReason: '旧格式记录，图层标记不全，需手工核对',
    isOldFormat: true,
    hasSupplementary: true,
  },
];

const generateLayerRecords = (): LayerRecord[] => {
  const layers: LayerRecord[] = [];
  
  scoreRecords.forEach(record => {
    const layerCount = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < layerCount; i++) {
      const materialTypes: Array<'screenshot' | 'video' | 'mark'> = ['screenshot', 'video', 'mark'];
      const materialType = materialTypes[i % 3];
      
      let uploadStatus: 'uploaded' | 'missing' | 'damaged' = 'uploaded';
      let hasOcclusion = false;
      let occlusionDesc = '';
      let hasMaterial = true;
      
      if (record.anomalyType === 'material_missing') {
        if (i === 1 || i === 2) {
          uploadStatus = record.id === 'REC-2025-004' ? 'damaged' : 'missing';
          hasMaterial = false;
        }
      }
      
      if (record.anomalyType === 'layer_occlusion' && (i === 1 || i === 3)) {
        hasOcclusion = true;
        occlusionDesc = `图层${i + 1}被上层部分遮挡，影响关键点识别`;
      }
      
      if (record.anomalyType === 'old_format' && i === 0) {
        hasOcclusion = Math.random() > 0.5;
        if (hasOcclusion) {
          occlusionDesc = '旧格式图层边界标记模糊';
        }
      }
      
      layers.push({
        id: `LYR-${record.id}-${i + 1}`,
        recordId: record.id,
        layerName: ['骨架层', '肌电图层', '关键帧截图层', '标记层', '背景层'][i % 5],
        layerOrder: i + 1,
        hasOcclusion,
        occlusionDesc,
        hasMaterial,
        materialType,
        uploadStatus,
      });
    }
  });
  
  return layers;
};

const generateHitRecords = (): HitRecord[] => {
  const hits: HitRecord[] = [];
  
  scoreRecords.forEach(record => {
    if (record.anomalyType !== 'material_missing' || record.id === 'REC-2025-006') {
      const hitCount = Math.floor(Math.random() * 4) + 2;
      const areas = ['肩峰点', '肱骨外上髁', '桡骨茎突', '股骨大转子', '胫骨平台', '外踝', '内踝', '髂前上棘'];
      
      for (let i = 0; i < hitCount; i++) {
        hits.push({
          id: `HIT-${record.id}-${i + 1}`,
          recordId: record.id,
          hitArea: areas[(i + Math.floor(Math.random() * areas.length)) % areas.length],
          hitTime: `${10 + i}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          confidence: record.anomalyType === 'layer_occlusion' 
            ? 0.72 + Math.random() * 0.15 
            : 0.88 + Math.random() * 0.1,
          result: record.anomalyType === 'layer_occlusion' && i === 1 ? '疑似偏差' : '正常',
        });
      }
    }
  });
  
  return hits;
};

const generateProcessNotes = (): ProcessNote[] => {
  const notes: ProcessNote[] = [];
  
  scoreRecords.forEach(record => {
    if (record.status === 'processed') {
      notes.push({
        id: `NOTE-${record.id}-1`,
        recordId: record.id,
        operator: '张主任',
        operateTime: '2025-05-28 16:00',
        action: '审核通过',
        suggestion: '资料完整，评分有效，可归档',
      });
    } else if (record.status === 'pending') {
      notes.push({
        id: `NOTE-${record.id}-1`,
        recordId: record.id,
        operator: '李护士长',
        operateTime: '2025-05-28 15:30',
        action: '标记异常',
        suggestion: record.anomalyReason,
      });
      notes.push({
        id: `NOTE-${record.id}-2`,
        recordId: record.id,
        operator: '系统自动',
        operateTime: '2025-05-28 15:00',
        action: '异常检测',
        suggestion: `检测到${record.anomalyType === 'material_missing' ? '离线素材缺失' : 
          record.anomalyType === 'layer_occlusion' ? '图层遮挡' : 
          record.anomalyType === 'incomplete_data' ? '数据不完整' : '旧格式'}异常`,
      });
    }
  });
  
  return notes;
};

export const mockData: ImportData = {
  scoreRecords,
  layerRecords: generateLayerRecords(),
  hitRecords: generateHitRecords(),
  processNotes: generateProcessNotes(),
};

export const ANOMALY_TYPE_TEXT: Record<string, string> = {
  none: '无异常',
  material_missing: '离线素材缺失',
  layer_occlusion: '图层遮挡',
  incomplete_data: '数据不完整',
  old_format: '旧格式记录',
};

export const STATUS_TEXT: Record<string, string> = {
  normal: '正常',
  pending: '待处理',
  processed: '已处理',
};

export const UPLOAD_STATUS_TEXT: Record<string, string> = {
  uploaded: '已上传',
  missing: '缺失',
  damaged: '损坏',
};

export const MATERIAL_TYPE_TEXT: Record<string, string> = {
  screenshot: '截图',
  video: '视频帧',
  mark: '标记',
};
