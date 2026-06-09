/**
 * 滴定管校准记录 - 数据模型与示例数据
 * 
 * 数据结构说明：
 * - calibrationRecords: 校准记录主表
 *   - temperatureCurve: 温度曲线数据点数组 [{time, temp}]
 *   - weighingData: 称量数据 {actual, theoretical, precision}
 *   - concentration: 浓度相关数据
 *   - safetyRemark: 安全备注（含人工备注 manualRemark）
 *   - batchReport: 批次报告（可后补）
 *   - issues: 系统检出的异常列表（动态计算）
 */

const ANOMALY_CATEGORIES = {
  MATERIAL: { code: 'MATERIAL', label: '补材料', color: '#f59e0b', description: '需要补充称量数据、校准溶液等材料' },
  CALIBRATION: { code: 'CALIBRATION', label: '改口径', color: '#ef4444', description: '需要调整滴定管口径或重新校准参数' },
  DATA_QUALITY: { code: 'DATA_QUALITY', label: '数据质量', color: '#8b5cf6', description: '温度曲线与安全备注不一致等数据质量问题' }
};

const TEMP_THRESHOLD = {
  MIN: 18,
  MAX: 26,
  FLUCTUATION: 1.5
};

const WEIGHING_PRECISION_THRESHOLD = 0.0005;

let calibrationRecords = [
  {
    id: 'CAL-2026-0601-001',
    buretteId: 'BT-A-015',
    operator: '张工',
    date: '2026-06-01',
    nominalVolume: 50,
    temperatureCurve: [
      { time: '09:00', temp: 21.2 },
      { time: '09:15', temp: 21.4 },
      { time: '09:30', temp: 21.3 },
      { time: '09:45', temp: 21.5 },
      { time: '10:00', temp: 21.4 }
    ],
    weighingData: {
      actual: 49.9872,
      theoretical: 50.0000,
      precision: 0.0003,
      density: 0.9970
    },
    concentration: {
      nominal: 0.1000,
      measured: null,
      unit: 'mol/L',
      formula: 'NaOH'
    },
    safetyRemark: {
      systemGenerated: '温度稳定在21-22℃范围内，符合校准环境要求',
      manualRemark: '今天空调好像有点不稳，9点半那阵觉得有阵风，不过看温度计还正常',
      reviewStatus: 'pending'
    },
    batchReport: null,
    issues: []
  },
  {
    id: 'CAL-2026-0602-003',
    buretteId: 'BT-B-008',
    operator: '李工',
    date: '2026-06-02',
    nominalVolume: 50,
    temperatureCurve: [
      { time: '14:00', temp: 23.8 },
      { time: '14:15', temp: 24.5 },
      { time: '14:30', temp: 25.2 },
      { time: '14:45', temp: 25.8 },
      { time: '15:00', temp: 26.3 }
    ],
    weighingData: {
      actual: 49.9521,
      theoretical: 50.0000,
      precision: 0.0012,
      density: 0.9955
    },
    concentration: {
      nominal: 0.1000,
      measured: null,
      unit: 'mol/L',
      formula: 'HCl'
    },
    safetyRemark: {
      systemGenerated: '温度在允许范围内',
      manualRemark: '下午阳光直射实验台，最后一组数据怀疑受影响，建议改天重做',
      reviewStatus: 'pending'
    },
    batchReport: null,
    issues: []
  },
  {
    id: 'CAL-2026-0603-007',
    buretteId: 'BT-A-022',
    operator: '王工',
    date: '2026-06-03',
    nominalVolume: 25,
    temperatureCurve: [
      { time: '10:00', temp: 20.1 },
      { time: '10:15', temp: 20.2 },
      { time: '10:30', temp: 20.0 },
      { time: '10:45', temp: 20.3 },
      { time: '11:00', temp: 20.1 }
    ],
    weighingData: {
      actual: 24.9985,
      theoretical: 25.0000,
      precision: 0.0002,
      density: 0.9982
    },
    concentration: {
      nominal: 0.0500,
      measured: 0.0498,
      unit: 'mol/L',
      formula: 'KMnO4'
    },
    safetyRemark: {
      systemGenerated: '温度稳定，环境符合要求',
      manualRemark: '这个管子之前出过问题，这次多测了一组平行样，结果还行',
      reviewStatus: 'approved'
    },
    batchReport: {
      reportId: 'BATCH-2026-0603-KMNO4',
      receivedDate: '2026-06-05',
      measuredConcentration: 0.0498,
      uncertainty: 0.0002,
      remark: '批次浓度略低于标称值，在允许偏差范围内'
    },
    issues: []
  },
  {
    id: 'CAL-2026-0604-011',
    buretteId: 'BT-C-003',
    operator: '赵工',
    date: '2026-06-04',
    nominalVolume: 50,
    temperatureCurve: [
      { time: '08:30', temp: 19.5 },
      { time: '08:45', temp: 19.8 },
      { time: '09:00', temp: 20.0 },
      { time: '09:15', temp: 20.2 },
      { time: '09:30', temp: 20.1 }
    ],
    weighingData: {
      actual: null,
      theoretical: 50.0000,
      precision: null,
      density: 0.9980
    },
    concentration: {
      nominal: 0.1000,
      measured: null,
      unit: 'mol/L',
      formula: 'AgNO3'
    },
    safetyRemark: {
      systemGenerated: '温度条件正常',
      manualRemark: '天平当天被借走，还没称，等明天补上',
      reviewStatus: 'pending'
    },
    batchReport: null,
    issues: []
  },
  {
    id: 'CAL-2026-0605-015',
    buretteId: 'BT-B-004',
    operator: '张工',
    date: '2026-06-05',
    nominalVolume: 50,
    temperatureCurve: [
      { time: '11:00', temp: 22.0 },
      { time: '11:15', temp: 22.3 },
      { time: '11:30', temp: 22.1 },
      { time: '11:45', temp: 22.4 },
      { time: '12:00', temp: 22.2 }
    ],
    weighingData: {
      actual: 49.9810,
      theoretical: 50.0000,
      precision: 0.0008,
      density: 0.9968
    },
    concentration: {
      nominal: 0.0500,
      measured: null,
      unit: 'mol/L',
      formula: 'EDTA'
    },
    safetyRemark: {
      systemGenerated: '温度在允许范围内波动，正常',
      manualRemark: '换了新的瓶塞，可能有点漏，下周一再复校一次确认',
      reviewStatus: 'pending'
    },
    batchReport: null,
    issues: []
  },
  {
    id: 'CAL-2026-0606-021',
    buretteId: 'BT-A-031',
    operator: '李工',
    date: '2026-06-06',
    nominalVolume: 25,
    temperatureCurve: [
      { time: '15:00', temp: 24.8 },
      { time: '15:15', temp: 25.1 },
      { time: '15:30', temp: 25.0 },
      { time: '15:45', temp: 25.2 },
      { time: '16:00', temp: 24.9 }
    ],
    weighingData: {
      actual: 25.0123,
      theoretical: 25.0000,
      precision: 0.0004,
      density: 0.9960
    },
    concentration: {
      nominal: 0.1000,
      measured: 0.1003,
      unit: 'mol/L',
      formula: 'NaOH'
    },
    safetyRemark: {
      systemGenerated: '温度偏高，注意体积修正',
      manualRemark: '温度偏高但在范围内，系统提示注意体积修正，已按GBT 601做了温度校正',
      reviewStatus: 'approved'
    },
    batchReport: {
      reportId: 'BATCH-2026-0606-NAOH',
      receivedDate: '2026-06-08',
      measuredConcentration: 0.1003,
      uncertainty: 0.0001,
      remark: '批次浓度合格'
    },
    issues: []
  }
];

function getRecords() {
  return calibrationRecords.map(r => ({ ...r, issues: analyzeRecord(r) }));
}

function getRecordById(id) {
  const record = calibrationRecords.find(r => r.id === id);
  return record ? { ...record, issues: analyzeRecord(record) } : null;
}

function updateRecord(id, updates) {
  const idx = calibrationRecords.findIndex(r => r.id === id);
  if (idx >= 0) {
    calibrationRecords[idx] = { ...calibrationRecords[idx], ...updates };
    calibrationRecords[idx].issues = analyzeRecord(calibrationRecords[idx]);
    return getRecordById(id);
  }
  return null;
}

function updateBatchReport(recordId, batchReport) {
  return updateRecord(recordId, { batchReport, issues: [] });
}
