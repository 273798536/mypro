import type { ProcessError } from '@/types';

export function formatProcessingError(error: ProcessError): string {
  const parts: string[] = [];
  if (error.userMessage) {
    parts.push(error.userMessage);
  }
  if (error.suggestion) {
    parts.push(error.suggestion);
  }
  return parts.join('。');
}

export function generateMissingFieldError(
  field: string,
  rowNumber?: number
): ProcessError {
  const fieldDisplayMap: Record<string, { label: string; example: string }> = {
    temperature: { label: '反应温度', example: '25°C' },
    ph: { label: 'pH值', example: 'pH: 7.0' },
    time: { label: '反应时间', example: '30min' },
    batchId: { label: '批次号', example: '批次：B20250101' },
    sampleName: { label: '样品名称', example: '样品名：阿莫西林' },
    recordDate: { label: '记录日期', example: '日期：2025-01-01' },
    name: { label: '杂质名称', example: '杂质A' },
    measuredValue: { label: '实测值', example: '0.12' },
    limitValue: { label: '限度值', example: '0.5' },
    standard: { label: '标准依据', example: '药典2025' },
  };

  const fieldInfo = fieldDisplayMap[field] || {
    label: field,
    example: field,
  };

  const rowPrefix = rowNumber ? `第${rowNumber}行` : '当前记录';

  return {
    code: 'MISSING_FIELD',
    userMessage: `${rowPrefix}缺少${fieldInfo.label}`,
    suggestion: `请补充如 ${fieldInfo.example} 的${fieldInfo.label}信息`,
    missingFields: [field],
  };
}
