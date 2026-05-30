import type { RawParamRow, ParseResult, RowType } from '@/types';

const COMMENT_PREFIXES = ['#', '//', '备注:', '备注：', '---'];
const KNOWN_PARAMS = ['TR', 'TE', 'sliceThickness', 'FOV', 'matrix', 'NEX'];
const NOISE_PATTERNS = /[^ -~\u4e00-\u9fff\u3000-\u303f\uff00-\uffef_=:\d.]/;
const DICOM_PATTERN = /^DICOM\(/;
const GARBAGE_PATTERN = /[#$@!%]{2,}|0x[0-9a-fA-F]+|[?]{2,}/;

function isBlank(line: string): boolean {
  return /^\s*$/.test(line);
}

function isComment(line: string): boolean {
  const trimmed = line.trim();
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function isNoise(line: string): boolean {
  const trimmed = line.trim();
  if (DICOM_PATTERN.test(trimmed)) return true;
  if (GARBAGE_PATTERN.test(trimmed)) return true;
  if (NOISE_PATTERNS.test(trimmed)) return true;
  return false;
}

function tryParseParam(line: string): { name: string; value: number } | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^([a-zA-Z_]\w*)\s*[=:＝]\s*([\d.]+)/);
  if (!match) return null;
  const name = match[1];
  const value = parseFloat(match[2]);
  if (isNaN(value)) return null;
  if (!KNOWN_PARAMS.includes(name)) return null;
  return { name, value };
}

function classifyRow(line: string, lineNumber: number): RawParamRow {
  if (isBlank(line)) {
    return {
      lineNumber,
      content: line,
      type: 'empty' as RowType,
      errorMessage: '空行',
    };
  }

  if (isComment(line)) {
    return {
      lineNumber,
      content: line,
      type: 'comment' as RowType,
      errorMessage: '备注行，不参与计算',
    };
  }

  if (isNoise(line)) {
    return {
      lineNumber,
      content: line,
      type: 'noise' as RowType,
      errorMessage: '噪声条/格式错误，已隔离',
    };
  }

  const parsed = tryParseParam(line);
  if (parsed) {
    return {
      lineNumber,
      content: line,
      type: 'normal' as RowType,
      paramName: parsed.name,
      paramValue: parsed.value,
    };
  }

  const hasEquals = /[=:＝]/.test(line.trim());
  if (hasEquals) {
    return {
      lineNumber,
      content: line,
      type: 'missing_column' as RowType,
      errorMessage: '缺列行：参数名或值缺失',
    };
  }

  return {
    lineNumber,
    content: line,
    type: 'missing_column' as RowType,
    errorMessage: '缺列行：无法识别参数格式',
  };
}

export function parseRawTemplate(rawText: string): ParseResult {
  const lines = rawText.split('\n');
  const rows: RawParamRow[] = lines.map((line, index) => classifyRow(line, index + 1));

  const validParams: Record<string, number> = {};
  const badRows: RawParamRow[] = [];
  let validRows = 0;

  for (const row of rows) {
    if (row.type === 'normal' && row.paramName && row.paramValue !== undefined) {
      validParams[row.paramName] = row.paramValue;
      validRows++;
    } else {
      badRows.push(row);
    }
  }

  return {
    validParams,
    badRows,
    totalRows: rows.length,
    validRows,
  };
}

export { KNOWN_PARAMS };
