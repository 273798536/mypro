export type RiskLevel = 'low' | 'medium' | 'high';

export type DefectCategory = 'weld' | 'electrical' | 'structural' | 'surface' | 'dimension' | 'other';

export interface QualitySample {
  sampleId: string;
  batchId: string;
  defectType: string;
  defectCategory: DefectCategory;
  sourceType: string;
  standardDocs: string[];
  referenceImages: string[];
  specSheet: string | null;
  riskLevel: RiskLevel;
  createdAt: string;
}

export interface CitationRuleViolation {
  rule: string;
  description: string;
  severity: 'error' | 'warning';
}

export interface CitationCheckResult {
  sampleId: string;
  passed: boolean;
  riskLevel: RiskLevel;
  violations: CitationRuleViolation[];
  suggestions: string[];
}

const SAFETY_CATEGORIES: DefectCategory[] = ['weld', 'electrical', 'structural'];

function checkStandardDocs(sample: QualitySample): CitationRuleViolation | null {
  if (!sample.standardDocs || sample.standardDocs.length < 1) {
    return {
      rule: 'STANDARD_DOCS_MIN_1',
      description: '标准文档数量不足，至少需要 1 份',
      severity: 'error',
    };
  }
  return null;
}

function checkReferenceImages(sample: QualitySample): CitationRuleViolation | null {
  if (!sample.referenceImages || sample.referenceImages.length < 2) {
    return {
      rule: 'REFERENCE_IMAGES_MIN_2',
      description: '参考图像数量不足，至少需要 2 张',
      severity: 'error',
    };
  }
  return null;
}

function checkSpecSheet(sample: QualitySample): CitationRuleViolation | null {
  if (!sample.specSheet || sample.specSheet.trim() === '') {
    return {
      rule: 'SPEC_SHEET_REQUIRED',
      description: '规格书为必填项',
      severity: 'error',
    };
  }
  return null;
}

function isSafetyRelated(sample: QualitySample): boolean {
  return SAFETY_CATEGORIES.includes(sample.defectCategory);
}

export function checkSampleCitation(sample: QualitySample): CitationCheckResult {
  const violations: CitationRuleViolation[] = [];
  const suggestions: string[] = [];

  const standardDocsViolation = checkStandardDocs(sample);
  if (standardDocsViolation) violations.push(standardDocsViolation);

  const referenceImagesViolation = checkReferenceImages(sample);
  if (referenceImagesViolation) violations.push(referenceImagesViolation);

  const specSheetViolation = checkSpecSheet(sample);
  if (specSheetViolation) violations.push(specSheetViolation);

  let finalRiskLevel: RiskLevel = sample.riskLevel;
  if (isSafetyRelated(sample)) {
    finalRiskLevel = 'high';
    if (sample.riskLevel !== 'high') {
      suggestions.push(`该样本涉及安全类缺陷（${sample.defectCategory}），风险等级已提升为 high`);
    }
  }

  if (sample.standardDocs && sample.standardDocs.length >= 3) {
    suggestions.push('标准文档较为充分，引用质量良好');
  }
  if (sample.referenceImages && sample.referenceImages.length >= 4) {
    suggestions.push('参考图像较为充分，便于对比验证');
  }

  const passed = violations.length === 0 || violations.every((v) => v.severity === 'warning');

  return {
    sampleId: sample.sampleId,
    passed,
    riskLevel: finalRiskLevel,
    violations,
    suggestions,
  };
}

export function checkAllSamples(samples: QualitySample[]): {
  results: CitationCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
} {
  const results = samples.map(checkSampleCitation);

  const summary = {
    total: samples.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    highRisk: results.filter((r) => r.riskLevel === 'high').length,
    mediumRisk: results.filter((r) => r.riskLevel === 'medium').length,
    lowRisk: results.filter((r) => r.riskLevel === 'low').length,
  };

  return { results, summary };
}
