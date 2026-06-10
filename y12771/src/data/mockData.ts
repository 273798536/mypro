import type { BatchReport, DataQualityIssue, ParseWarning, ParseStatus } from '../../shared/types';

function generateSpectrumData() {
  const data = [];
  const peaks = [
    { wn: 3450, intensity: 0.72 },
    { wn: 3320, intensity: 0.55 },
    { wn: 2960, intensity: 0.68 },
    { wn: 2925, intensity: 0.63 },
    { wn: 2855, intensity: 0.51 },
    { wn: 1738, intensity: 0.81 },
    { wn: 1722, intensity: 0.65 },
    { wn: 1652, intensity: 0.48 },
    { wn: 1598, intensity: 0.41 },
    { wn: 1502, intensity: 0.37 },
    { wn: 1458, intensity: 0.45 },
    { wn: 1375, intensity: 0.33 },
    { wn: 1245, intensity: 0.47 },
    { wn: 1172, intensity: 0.52 },
    { wn: 1098, intensity: 0.40 },
    { wn: 1035, intensity: 0.36 },
    { wn: 754, intensity: 0.28 },
    { wn: 698, intensity: 0.25 },
  ];

  for (let i = 0; i < 80; i++) {
    const wn = 4000 - i * 45;
    let absorbance = 0.08 + Math.random() * 0.1;
    for (const peak of peaks) {
      const dist = Math.abs(wn - peak.wn);
      if (dist < 120) {
        absorbance += peak.intensity * Math.exp(-(dist * dist) / (2 * 40 * 40));
      }
    }
    data.push({
      rowIndex: i,
      wavenumber: wn,
      absorbance: Math.min(0.95, absorbance),
      rawUnit: i === 17 ? '' : i === 33 ? '备注：王老师补的点' : 'cm⁻¹',
      remark: i === 5 ? '2025.12.03重测' : i === 42 ? '此点跳过' : '',
      parseStatus: (i === 17 ? 'missing' : i === 33 || i === 5 ? 'supplemented' : 'normal') as ParseStatus,
      originalText: `row ${i}`,
    });
  }
  return data;
}

export const sampleDataQualityIssues: DataQualityIssue[] = [
  {
    code: 'blank_control_missing',
    friendlyMessage: '本批次未做空白对照实验',
    severity: 'warning',
    impact: '可能影响背景扣除的精度，导致基线附近的小峰判断不够准确',
    suggestion: '建议下次实验同步采集空气背景或纯 KBr 压片作为空白对照',
  },
  {
    code: 'reaction_time_missing',
    friendlyMessage: '反应总时长未记录',
    severity: 'warning',
    impact: '无法判断官能团转化是否达到反应平衡，不利于重复该合成条件',
    suggestion: '请在右侧补录表单中填写大致反应时长（精确到小时即可）',
  },
  {
    code: 'missing_unit',
    friendlyMessage: '第 18 行吸光度数据未标注单位',
    severity: 'info',
    impact: '该行已按默认"吸光度（无量纲）"处理，不影响整体曲线趋势',
    suggestion: '如实际为透射率百分比，可在明细表格中点击该行修改单位',
  },
  {
    code: 'old_format_header',
    friendlyMessage: '检测到 2020 版旧表头格式',
    severity: 'info',
    impact: '系统已自动转换为新版字段名，原始列名保存在原始文本列中',
    suggestion: '如需统一格式，可在导出时选择"标准化表头"选项',
  },
  {
    code: 'late_reaction_condition',
    friendlyMessage: '反应条件信息为实验后 48 小时补录',
    severity: 'info',
    impact: '补录内容已标记时间戳，不影响分析但会在报告中注明"补录"',
    suggestion: '下次尽量在实验当天记录条件，减少记忆偏差',
  },
];

export const sampleParseWarnings: ParseWarning[] = [
  { type: 'old_format_header', rowIndex: 0, message: '使用了 2020 版旧表头（波数/吸收），已自动映射为新字段', suggestedFix: '建议导出时使用标准化表头' },
  { type: 'missing_unit', rowIndex: 17, message: '该行吸光度数据缺少单位', suggestedFix: '默认按吸光度处理，可在表格中修改' },
  { type: 'remark_detected', rowIndex: 5, message: '包含中文备注：2025.12.03重测' },
  { type: 'remark_detected', rowIndex: 33, message: '包含中文备注：王老师补的点' },
  { type: 'reaction_time_missing', rowIndex: -1, message: '反应时长字段为空', suggestedFix: '请在补录表单中填写' },
  { type: 'blank_control_missing', rowIndex: -1, message: '空白对照字段未填写', suggestedFix: '如有对照请在补录表单中添加' },
];

export const sampleBatchReport: BatchReport = {
  id: 'batch-2025-1212-001',
  batchName: '聚酯薄膜改性批次 #B2025-1212',
  createdAt: '2025-12-12T10:23:00',
  updatedAt: '2025-12-14T15:48:00',
  spectrumData: generateSpectrumData(),
  annotations: [
    { id: 'fg-1', name: 'O-H stretch', nameCn: '羟基伸缩振动', wavenumberStart: 3200, wavenumberEnd: 3600, peakWavenumber: 3448, confidence: 0.92, confirmed: true, confirmedBy: '李同学', confirmedAt: '2025-12-12T11:05:00', isManualAdd: false },
    { id: 'fg-2', name: 'N-H stretch', nameCn: '氨基伸缩振动', wavenumberStart: 3300, wavenumberEnd: 3500, peakWavenumber: 3318, confidence: 0.78, confirmed: true, confirmedBy: '李同学', confirmedAt: '2025-12-12T11:06:00', isManualAdd: false, remark: '与 O-H 部分重叠，峰形较宽' },
    { id: 'fg-3', name: 'sp3 C-H stretch', nameCn: '饱和碳氢伸缩振动', wavenumberStart: 2800, wavenumberEnd: 3000, peakWavenumber: 2958, confidence: 0.96, confirmed: false, isManualAdd: false },
    { id: 'fg-4', name: 'C=O stretch (ester)', nameCn: '酯羰基伸缩振动', wavenumberStart: 1730, wavenumberEnd: 1750, peakWavenumber: 1736, confidence: 0.98, confirmed: true, confirmedBy: '李同学', confirmedAt: '2025-12-12T11:10:00', isManualAdd: false },
    { id: 'fg-5', name: 'C=O stretch (ketone)', nameCn: '酮羰基伸缩振动', wavenumberStart: 1705, wavenumberEnd: 1725, peakWavenumber: 1720, confidence: 0.65, confirmed: false, isManualAdd: false, remark: '肩峰，可能来自副产物' },
    { id: 'fg-6', name: 'C=C stretch (aromatic)', nameCn: '芳环碳碳伸缩振动', wavenumberStart: 1450, wavenumberEnd: 1600, peakWavenumber: 1595, confidence: 0.82, confirmed: false, isManualAdd: false },
    { id: 'fg-7', name: 'C-O stretch (ester)', nameCn: '酯碳氧伸缩振动', wavenumberStart: 1160, wavenumberEnd: 1260, peakWavenumber: 1242, confidence: 0.90, confirmed: false, isManualAdd: false },
    { id: 'fg-8', name: 'C-O stretch (alcohol)', nameCn: '醇碳氧伸缩振动', wavenumberStart: 1050, wavenumberEnd: 1150, peakWavenumber: 1096, confidence: 0.55, confirmed: false, isManualAdd: true, remark: '王老师提醒：注意残留溶剂的乙醇峰' },
    { id: 'fg-9', name: '=C-H out-of-plane', nameCn: '芳环面外弯曲振动', wavenumberStart: 690, wavenumberEnd: 900, peakWavenumber: 752, confidence: 0.71, confirmed: false, isManualAdd: false },
  ],
  concentrationComparisons: [
    { label: '端羟基含量', before: { value: 2.8, unit: 'mmol/g', judgment: '偏低' }, after: { value: 3.42, unit: 'mmol/g', judgment: '正常范围' }, changed: true },
    { label: '酯键相对强度', before: { value: 0.72, unit: '归一化', judgment: '正常范围' }, after: { value: 0.72, unit: '归一化', judgment: '正常范围' }, changed: false },
    { label: '副产物酮羰基', before: { value: 0.08, unit: '归一化', judgment: '痕量' }, after: { value: 0.13, unit: '归一化', judgment: '偏高，建议关注' }, changed: true },
    { label: '残留乙醇', before: { value: null, unit: 'wt%', judgment: '未检出' }, after: { value: 1.2, unit: 'wt%', judgment: '需进一步干燥' }, changed: true },
  ],
  runHistory: [
    { runId: 1, runAt: '2025-12-12T10:30:00', parameters: '默认参数 / 基线校正：自动', status: 'warning', triggeredBy: '系统自动', note: '首次解析，检测到 5 条数据质量问题' },
    { runId: 2, runAt: '2025-12-14T09:15:00', parameters: '补录反应条件后重跑 / 平滑窗口：9', status: 'success', triggeredBy: '李同学', note: '补录了温度和催化剂用量' },
    { runId: 3, runAt: '2025-12-14T15:40:00', parameters: '人工确认 5 条标注后重跑', status: 'success', triggeredBy: '李同学', note: '准备导出报告给王老师审阅' },
  ],
  supplementaryInfo: {
    reactionConditions: '160°C，氮气保护，催化剂二月桂酸二丁基锡 0.3 wt%（2025-12-14 补录）',
    reactionTime: null,
    reactionTimeUnit: 'h',
    blankControlNote: '',
    operator: '李同学',
    sampleSource: '高分子合成实验室 3 号反应釜',
  },
  dataQuality: sampleDataQualityIssues,
  parseWarnings: sampleParseWarnings,
  exportHistory: [
    { id: 'exp-1', exportedAt: '2025-12-14T15:50:00', format: 'html', fileName: '聚酯薄膜改性批次_B2025-1212_报告.html', batchName: '聚酯薄膜改性批次 #B2025-1212' },
  ],
};
