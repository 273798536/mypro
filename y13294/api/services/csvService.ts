import { listRamps } from '../repositories/rampRepo.js';
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  type RampStatus,
} from '../../shared/types.js';

const CATEGORY_ORDER: RampStatus[] = ['processed', 'pending', 'overridden'];

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const HEADERS = [
  '分类',
  '坡道',
  '所属慢行桥',
  '地址',
  '当前状态',
  '最近改判来源',
  '最近改判时间',
  '最近改判改变了哪些判断',
  '是否旧方案覆盖',
  '改判次数',
];

export function exportCsv(status?: RampStatus): string {
  const ramps = listRamps(status ? { status } : {});
  const sorted = [...ramps].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.status) - CATEGORY_ORDER.indexOf(b.status),
  );

  const lines: string[] = [HEADERS.map(csvEscape).join(',')];
  for (const r of sorted) {
    lines.push(
      [
        STATUS_LABELS[r.status],
        r.name,
        r.bridgeName,
        r.address,
        STATUS_LABELS[r.status],
        r.lastChangeSource ? SOURCE_LABELS[r.lastChangeSource] : '',
        fmtTime(r.lastChangeAt),
        r.lastAffected ?? '',
        r.isOverriding ? '是' : '否',
        r.changeCount,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  // BOM 保证 Excel 正确识别中文
  return '\uFEFF' + lines.join('\r\n');
}
