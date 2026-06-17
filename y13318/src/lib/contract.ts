import type { FilterKey, ExportKey } from '@/types';

export const ERROR_CODES = {
  VERSION_NOT_FOUND: 'E_VERSION_NOT_FOUND',
  SAMPLE_NOT_FOUND: 'E_SAMPLE_NOT_FOUND',
  DUPLICATE_GROUP_BROKEN: 'E_DUPLICATE_GROUP_BROKEN',
  EXPORT_MISMATCH: 'E_EXPORT_MISMATCH',
  FILTER_INVALID: 'E_FILTER_INVALID',
  VERSION_NOTE_MISSING: 'E_VERSION_NOTE_MISSING',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function errorMessage(code: ErrorCode, detail?: string): string {
  return `[${code}]${detail ? ` ${detail}` : ''}`;
}

export const URL_PARAMS = {
  version: 'version',
  run: 'run',
  filter: 'filter',
  sample: 'sample',
  export: 'export',
  lang: 'lang',
} as const;

export const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部样本' },
  { key: 'duplicate', label: '仅重复评测' },
  { key: 'misjudged', label: '仅误判/漏检' },
  { key: 'skewed', label: '拉偏样本' },
];

export const EXPORT_OPTIONS: { key: ExportKey; label: string }[] = [
  { key: 'json', label: 'JSON 数据' },
  { key: 'report', label: '截图说明(HTML)' },
];

export function isValidFilter(value: string | null): value is FilterKey {
  return value === 'all' || value === 'duplicate' || value === 'misjudged' || value === 'skewed';
}

export function isValidExport(value: string | null): value is ExportKey {
  return value === 'json' || value === 'report';
}
