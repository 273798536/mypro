export interface BadDataItem {
  sampleBarcode: string;
  fieldName: string;
  badValue: string;
  expectedValue: string;
  problem: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export const mockBadData: BadDataItem[] = [
  {
    sampleBarcode: 'TM-2025-00134',
    fieldName: 'totalReads',
    badValue: 'NaN',
    expectedValue: '15680',
    problem: '总读段数缺失或录入错误，显示为 NaN（非数字）',
    suggestion: '检查原始测序报告，补填正确的总读段数',
    severity: 'high',
  },
  {
    sampleBarcode: 'tm-2025-00135',
    fieldName: 'barcode',
    badValue: 'tm-2025-00135',
    expectedValue: 'TM-2025-00135',
    problem: '样本条码使用了小写字母，标准格式要求全大写',
    suggestion: '将条码字母转为大写，与实验室 LIS 系统保持一致',
    severity: 'medium',
  },
  {
    sampleBarcode: 'tm-2025-00135',
    fieldName: 'totalReads',
    badValue: '9876.5',
    expectedValue: '9877',
    problem: '读段数出现小数，读段计数必须是整数',
    suggestion: '取整或核对原始计数文件，读段数不可能为小数',
    severity: 'medium',
  },
  {
    sampleBarcode: 'tm-2025-00135',
    fieldName: 'mutantReads',
    badValue: '342.7',
    expectedValue: '343',
    problem: '突变读段数出现小数，与读段计数原理矛盾',
    suggestion: '取整或检查计算过程是否使用了平均值',
    severity: 'medium',
  },
  {
    sampleBarcode: 'TM-2025-00127',
    fieldName: 'barcode',
    badValue: '重复出现（2 条记录）',
    expectedValue: '唯一（1 条记录）',
    problem: '同一条码被录入两次，分别来自共享盘和手动录入，数值略有差异',
    suggestion: '比对两次录入的原始单据，保留正确版本或合并备注',
    severity: 'high',
  },
  {
    sampleBarcode: 'TM-2025-00132',
    fieldName: 'qualityScore',
    badValue: '12.3',
    expectedValue: '≥ 20',
    problem: '样本质量分值过低，低于 Q20 最低可接受阈值',
    suggestion: '建议重新提取 DNA 或重新测序，当前结果仅作参考',
    severity: 'high',
  },
  {
    sampleBarcode: 'TM-2025-00132',
    fieldName: 'totalReads',
    badValue: '42',
    expectedValue: '≥ 100',
    problem: '总读段数过少，无法进行可靠的突变检测统计',
    suggestion: '增加测序数据量，或确认样本是否降解',
    severity: 'high',
  },
];
