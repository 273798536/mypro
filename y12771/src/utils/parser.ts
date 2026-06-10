import type { ParseResult, SpectrumRow, ParseWarning, ParseStatus } from '../../shared/types';

const OLD_HEADERS_MAP: Record<string, string> = {
  '波数': 'wavenumber',
  '波长': 'wavenumber',
  'Wavenumber': 'wavenumber',
  'wn': 'wavenumber',
  '吸光度': 'absorbance',
  '吸收强度': 'absorbance',
  'Absorbance': 'absorbance',
  'abs': 'absorbance',
  '单位': 'rawUnit',
  'Unit': 'rawUnit',
  '备注': 'remark',
  'Remark': 'remark',
  'note': 'remark',
};

function detectOldFormat(headers: string[]): boolean {
  return headers.some((h) => ['波数', '波长', '吸光度', '吸收强度'].includes(h.trim()));
}

function parseNumber(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const cleaned = val.toString().replace(/[,，\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parseSpectrumText(text: string, fileName = 'uploaded.csv'): ParseResult {
  const warnings: ParseWarning[] = [];
  const errors: string[] = [];
  const rows: SpectrumRow[] = [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { success: false, data: [], warnings: [], errors: ['文件内容为空或格式不正确'] };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const rawHeaders = lines[0].split(delimiter).map((h) => h.trim());

  if (detectOldFormat(rawHeaders)) {
    warnings.push({
      type: 'old_format_header',
      rowIndex: 0,
      message: `检测到 2020 版旧表头格式（${rawHeaders.join(' / ')}），已自动映射为新字段`,
      suggestedFix: '建议导出时使用标准化表头',
    });
  }

  const mappedHeaders = rawHeaders.map((h) => OLD_HEADERS_MAP[h] || h.toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    const obj: Record<string, string> = {};
    mappedHeaders.forEach((h, idx) => {
      obj[h] = (cells[idx] || '').trim();
    });

    let status: ParseStatus = 'normal';
    const wn = parseNumber(obj['wavenumber'] || obj[0] || '');
    const abs = parseNumber(obj['absorbance'] || obj[1] || '');
    const unit = obj['rawUnit'] || obj[2] || '';
    const remark = obj['remark'] || obj[3] || '';

    if (wn === null || abs === null) status = 'missing';
    if (!unit && status === 'normal') {
      status = 'missing';
      warnings.push({ type: 'missing_unit', rowIndex: i, message: `第 ${i + 1} 行吸光度数据未标注单位`, suggestedFix: '默认按吸光度（无量纲）处理' });
    }
    if (remark) {
      status = status === 'normal' ? 'supplemented' : status;
      if (/[\u4e00-\u9fa5]/.test(remark)) {
        warnings.push({ type: 'remark_detected', rowIndex: i, message: `第 ${i + 1} 行包含中文备注：${remark}` });
      }
    }

    rows.push({
      rowIndex: i - 1,
      wavenumber: wn,
      absorbance: abs,
      rawUnit: unit,
      remark,
      parseStatus: status,
      originalText: lines[i],
    });
  }

  const hasReactionTime = !text.includes('反应时间') || /反应时间[：:]\s*\d/.test(text);
  if (!hasReactionTime) {
    warnings.push({ type: 'reaction_time_missing', rowIndex: -1, message: '未检测到反应时长记录', suggestedFix: '请在补录表单中填写反应总时长' });
  }
  if (!text.includes('空白') && !text.includes('对照') && !/blank/i.test(text)) {
    warnings.push({ type: 'blank_control_missing', rowIndex: -1, message: '未检测到空白对照信息', suggestedFix: '如有空白对照实验请补录' });
  }
  if (/补录|晚到|后补/.test(text)) {
    warnings.push({ type: 'late_reaction_condition', rowIndex: -1, message: '检测到"补录"字样，部分条件可能为实验后补充' });
  }

  return {
    success: rows.length > 0,
    data: rows,
    warnings,
    errors,
    fileName,
  };
}

export function generateCsvSample(): string {
  return [
    '波数,吸光度,单位,备注',
    '4000,0.092,cm⁻¹,',
    '3955,0.098,cm⁻¹,',
    '3910,0.104,cm⁻¹,',
    '3865,0.112,cm⁻¹,',
    '3820,0.125,cm⁻¹,2025.12.03重测',
    '3775,0.142,,',
    '3730,0.168,cm⁻¹,',
    '3685,0.203,cm⁻¹,',
    '3640,0.251,cm⁻¹,',
    '3595,0.312,cm⁻¹,',
    '3550,0.387,cm⁻¹,',
    '3505,0.472,cm⁻¹,',
    '3460,0.568,cm⁻¹,',
    '3415,0.669,cm⁻¹,',
    '3370,0.758,cm⁻¹,',
    '3325,0.821,cm⁻¹,',
    '3280,0.852,cm⁻¹,王老师补的点',
    '3235,0.837,cm⁻¹,',
    '3190,0.781,cm⁻¹,',
  ].join('\n');
}
