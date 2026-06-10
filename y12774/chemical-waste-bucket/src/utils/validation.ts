import type { Reagent, ValidationResult, ExperimentRecord } from '../types';

export const REAGENT_SAFETY_RANGES: Record<string, { min?: number; max?: number; unit: Reagent['concentrationUnit'] }> = {
  '盐酸': { min: 0.1, max: 12, unit: 'mol/L' },
  '硫酸': { min: 0.1, max: 18, unit: 'mol/L' },
  '硝酸': { min: 0.1, max: 16, unit: 'mol/L' },
  '氢氧化钠': { min: 0.1, max: 10, unit: 'mol/L' },
  '氢氧化钾': { min: 0.1, max: 12, unit: 'mol/L' },
  '氯化钠': { min: 0.01, max: 5, unit: 'mol/L' },
  '硫酸铜': { min: 0.01, max: 2, unit: 'mol/L' },
  '乙醇': { min: 1, max: 100, unit: '%' },
  '甲醇': { min: 1, max: 100, unit: '%' },
  '丙酮': { min: 1, max: 100, unit: '%' },
  '高锰酸钾': { min: 0.01, max: 0.5, unit: 'mol/L' },
  '重铬酸钾': { min: 0.01, max: 1, unit: 'mol/L' },
};

export function validateReagentConcentration(reagent: Reagent): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!reagent.concentration || reagent.concentration <= 0) {
    results.push({
      isValid: false,
      reagentId: reagent.id,
      reagentName: reagent.name,
      errorType: '浓度缺失',
      message: `试剂「${reagent.name}」浓度未填写或为无效值`,
      studentExplanation: `试剂「${reagent.name}」的浓度栏是空的或者填了0、负数。请填写实际使用的浓度数值，废液桶标签上必须有浓度信息才能安全处理。`
    });
    return results;
  }

  const safetyRange = REAGENT_SAFETY_RANGES[reagent.name];
  if (safetyRange) {
    if (safetyRange.unit !== reagent.concentrationUnit) {
      results.push({
        isValid: false,
        reagentId: reagent.id,
        reagentName: reagent.name,
        errorType: '单位不匹配',
        message: `试剂「${reagent.name}」浓度单位${reagent.concentrationUnit}与推荐单位${safetyRange.unit}不匹配`,
        studentExplanation: `试剂「${reagent.name}」通常使用${safetyRange.unit}作为浓度单位，但你填的是${reagent.concentrationUnit}。请确认单位是否正确，单位错了浓度值就没有意义，废液处理人员可能误判风险。`
      });
    }

    if (safetyRange.min !== undefined && reagent.concentration < safetyRange.min) {
      results.push({
        isValid: false,
        reagentId: reagent.id,
        reagentName: reagent.name,
        errorType: '浓度超限',
        message: `试剂「${reagent.name}」浓度${reagent.concentration}${reagent.concentrationUnit}低于最低安全记录值${safetyRange.min}${safetyRange.unit}`,
        studentExplanation: `试剂「${reagent.name}」的浓度填得特别低（${reagent.concentration}${reagent.concentrationUnit}），低于正常实验的最低记录值${safetyRange.min}${safetyRange.unit}。请检查是不是小数点写错了，或者把"稀释后"和"原液"搞混了。浓度填低了会让废液处理人员低估风险。`
      });
    }

    if (safetyRange.max !== undefined && reagent.concentration > safetyRange.max) {
      results.push({
        isValid: false,
        reagentId: reagent.id,
        reagentName: reagent.name,
        errorType: '浓度超限',
        message: `试剂「${reagent.name}」浓度${reagent.concentration}${reagent.concentrationUnit}超过最高安全记录值${safetyRange.max}${safetyRange.unit}`,
        studentExplanation: `试剂「${reagent.name}」的浓度填得特别高（${reagent.concentration}${reagent.concentrationUnit}），超过该试剂能达到的最高浓度${safetyRange.max}${safetyRange.unit}。比如浓盐酸也就12mol/L，填20就肯定错了。请重新核对浓度数值，浓度错误会直接影响废液分桶的安全性。`
      });
    }
  }

  if (reagent.ph !== undefined && (reagent.ph < 0 || reagent.ph > 14)) {
    results.push({
      isValid: false,
      reagentId: reagent.id,
      reagentName: reagent.name,
      errorType: 'PH异常',
      message: `试剂「${reagent.name}」pH值${reagent.ph}超出正常范围(0-14)`,
      studentExplanation: `试剂「${reagent.name}」的pH值填成了${reagent.ph}，但pH值只能在0到14之间。请重新测量或填写正确的pH值，这关系到废液能不能混装。`
    });
  }

  if (results.length === 0) {
    results.push({
      isValid: true,
      reagentId: reagent.id,
      reagentName: reagent.name,
      errorType: '其他',
      message: `试剂「${reagent.name}」浓度校验通过`,
      studentExplanation: ''
    });
  }

  return results;
}

export function validateAllReagents(reagents: Reagent[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  reagents.forEach(r => {
    results.push(...validateReagentConcentration(r));
  });
  return results;
}

export function getValidationErrors(results: ValidationResult[]): ValidationResult[] {
  return results.filter(r => !r.isValid);
}

export function isExperimentRecordUsable(record: ExperimentRecord): boolean {
  if (record.status === '复核不通过') return false;
  const validationResults = validateAllReagents(record.reagents);
  const errors = getValidationErrors(validationResults);
  if (errors.length > 0) return false;
  if (record.spectrumData.some(s => s.hasAbnormality && !s.abnormalityNote)) return false;
  return true;
}

export function generateAbnormalitySummary(record: ExperimentRecord): string[] {
  const summary: string[] = [];
  const errors = getValidationErrors(validateAllReagents(record.reagents));
  
  errors.forEach(e => {
    summary.push(e.message);
  });

  record.spectrumData.forEach(s => {
    if (s.hasAbnormality) {
      summary.push(`谱图数据（${s.dataType}）存在异常${s.abnormalityNote ? '：' + s.abnormalityNote : '，未说明原因'}`);
    }
  });

  record.balanceCalculations.forEach(b => {
    if (!b.isBalanced) {
      summary.push(`化学方程式「${b.equation}」未配平${b.note ? '（备注：' + b.note + '）' : ''}`);
    }
  });

  return summary;
}
