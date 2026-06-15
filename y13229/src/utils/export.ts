import {
  ChangeLog,
  FilterState,
  Note,
  Screenshot,
  SplitRecord,
  STATUS_LABEL,
  TrackVersion,
} from '@/types';
import { formatDate, formatDateTime } from './storage';
import { NOTE_SOURCE_LABEL } from '@/types';

interface ExportContext {
  records: SplitRecord[];
  versions: TrackVersion[];
  notes: Note[];
  screenshots: Screenshot[];
  changeLogs: ChangeLog[];
  filter: FilterState;
  generatedAt: string;
  user: string;
}

function toCsvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function exportHandoverCsv(ctx: ExportContext): string {
  const { records, versions, notes } = ctx;
  const versionMap = new Map(versions.map((v) => [v.id, v]));
  const headers = [
    '曲目名称',
    '曲目版本',
    '是否最新版',
    '演出场次',
    '演出日期',
    '艺人比例(%)',
    '剧场比例(%)',
    '发行比例(%)',
    '授权到期日',
    '状态',
    '异常原因(人话)',
    '操作人',
    '确认时间',
    '关联备注',
  ];
  const rows = records.map((r) => {
    const v = versionMap.get(r.trackVersionId);
    const recordNotes = notes
      .filter((n) => n.splitRecordId === r.id)
      .map((n) => `[${NOTE_SOURCE_LABEL[n.sourceType]}]${n.content}`)
      .join('；');
    return [
      toCsvCell(v?.trackName ?? '未知曲目'),
      toCsvCell(v?.versionTag ?? ''),
      toCsvCell(v?.isLatest ? '是' : '否'),
      toCsvCell(r.performanceName),
      toCsvCell(formatDate(r.performanceDate)),
      toCsvCell(r.artistRatio),
      toCsvCell(r.venueRatio),
      toCsvCell(r.distributionRatio),
      toCsvCell(formatDate(r.authExpiryDate)),
      toCsvCell(STATUS_LABEL[r.status]),
      toCsvCell(r.humanReason),
      toCsvCell(r.confirmedBy ?? ''),
      toCsvCell(formatDateTime(r.confirmedAt)),
      toCsvCell(recordNotes),
    ];
  });
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return '\uFEFF' + lines.join('\n');
}

export function exportReviewCsv(ctx: ExportContext): string {
  const { changeLogs, records, versions } = ctx;
  const recordMap = new Map(records.map((r) => [r.id, r]));
  const versionMap = new Map(versions.map((v) => [v.id, v]));
  const headers = [
    '变更时间',
    '操作人',
    '曲目',
    '变更字段',
    '变更前',
    '变更后',
    '变更原因',
  ];
  const rows = changeLogs
    .slice()
    .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1))
    .map((c) => {
      const r = recordMap.get(c.splitRecordId);
      const v = r ? versionMap.get(r.trackVersionId) : undefined;
      return [
        toCsvCell(formatDateTime(c.changedAt)),
        toCsvCell(c.changedBy),
        toCsvCell(`${v?.trackName ?? '—'}（${r?.performanceName ?? '—'}）`),
        toCsvCell(c.fieldName),
        toCsvCell(JSON.stringify(c.oldValue)),
        toCsvCell(JSON.stringify(c.newValue)),
        toCsvCell(c.changeReason),
      ];
    });
  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
