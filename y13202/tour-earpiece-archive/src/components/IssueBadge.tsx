import type { DataIssue } from '../types';

const SEVERITY_STYLE: Record<string, string> = {
  error: 'bg-red-100 text-red-700 border-red-300',
  warning: 'bg-amber-100 text-amber-700 border-amber-300',
  info: 'bg-sky-100 text-sky-700 border-sky-300',
};

const SEVERITY_LABEL: Record<string, string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
};

const TYPE_LABEL: Record<string, string> = {
  duplicate_song_alias: '曲名别名重复',
  missing_field: '字段缺失',
  date_format_unclear: '日期格式混乱',
  hidden_auth_in_note: '授权藏于备注',
  duplicate_record: '重复记录',
  late_note_added: '后补备注',
  format_unrecognized: '格式无法识别',
};

interface Props {
  issue: DataIssue;
  compact?: boolean;
}

export function IssueBadge({ issue, compact = false }: Props) {
  if (compact) {
    return (
      <span
        className={`inline-block px-1.5 py-0.5 text-[10px] rounded border ${SEVERITY_STYLE[issue.severity]}`}
        title={`${TYPE_LABEL[issue.type] ?? issue.type}: ${issue.message}`}
      >
        {TYPE_LABEL[issue.type] ?? issue.type}
      </span>
    );
  }
  return (
    <div className={`flex flex-col gap-1 p-2 rounded border ${SEVERITY_STYLE[issue.severity]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="px-1.5 py-0.5 rounded bg-white/60">{SEVERITY_LABEL[issue.severity]}</span>
        <span>{TYPE_LABEL[issue.type] ?? issue.type}</span>
        {issue.rawLine != null && <span className="opacity-60">第{issue.rawLine}行</span>}
      </div>
      <div className="text-xs">{issue.message}</div>
      {issue.rawText && (
        <div className="text-[11px] opacity-70 font-mono bg-white/40 px-2 py-1 rounded">
          原始文本：{issue.rawText}
        </div>
      )}
    </div>
  );
}
