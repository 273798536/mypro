import { useState } from 'react';
import { Droplets, Plus, Clock, User, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WaterQualityRecord, ReviewNote, WarningLevel } from '../types';

interface SupplementPayload {
  newValue?: number;
  noteContent: string;
  source?: string;
}

interface WaterQualityCardProps {
  record: WaterQualityRecord;
  onSupplement?: (recordId: string, payload: SupplementPayload) => void;
  onAddNote?: (recordId: string, note: Omit<ReviewNote, 'id' | 'timestamp'>) => void;
}

const levelConfig: Record<WarningLevel, {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
  badgeBg: string;
}> = {
  normal: {
    label: '正常',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
  },
  warning: {
    label: '预警',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
  },
  critical: {
    label: '异常',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-100',
  },
};

function WaterQualityCard({ record, onSupplement }: WaterQualityCardProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSource, setNoteSource] = useState('');
  const [newValue, setNewValue] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);

  const config = levelConfig[record.level];
  const deviation = ((record.value - record.standard) / record.standard * 100).toFixed(1);
  const isOverLimit = record.level !== 'normal';

  const handleSubmit = () => {
    setSubmitError(null);
    if (!onSupplement) return;

    const hasNewValue = newValue.trim() !== '';
    const hasContent = noteContent.trim() !== '';

    if (!hasNewValue && !hasContent) {
      setSubmitError('请至少填写补录检测值或备注内容');
      return;
    }

    const payload: SupplementPayload = {
      noteContent: hasContent ? noteContent.trim() : (hasNewValue ? '人工采样复核，数值已更新' : ''),
      source: noteSource.trim() || undefined,
    };

    if (hasNewValue) {
      const parsed = parseFloat(newValue);
      if (Number.isNaN(parsed) || parsed < 0) {
        setSubmitError('检测值必须是有效的非负数字');
        return;
      }
      payload.newValue = parsed;
    }

    onSupplement(record.id, payload);

    setNoteContent('');
    setNoteSource('');
    setNewValue('');
    setShowAddNote(false);
    setJustUpdated(true);
    window.setTimeout(() => setJustUpdated(false), 1800);
  };

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-all',
      config.bgColor,
      config.borderColor,
      justUpdated && 'ring-2 ring-sky-400 ring-offset-2'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
            <h4 className="font-medium text-slate-800">{record.index}</h4>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              config.badgeBg,
              config.textColor
            )}>
              {config.label}
            </span>
            {justUpdated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                <RefreshCw size={10} className="animate-spin" />
                已更新
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{record.value}</span>
            <span className="text-sm text-slate-500">{record.unit}</span>
            <span className="text-sm text-slate-400">/ 标准 {record.standard}{record.unit}</span>
            {isOverLimit && (
              <span className={cn(
                'text-sm font-medium',
                record.level === 'warning' ? 'text-amber-600' : 'text-rose-600'
              )}>
                {parseFloat(deviation) > 0 ? '+' : ''}{deviation}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <Clock size={12} className="inline mr-1" />
            检测时间：{new Date(record.timestamp).toLocaleString('zh-CN')}
          </p>
        </div>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1"
        >
          <Plus size={14} />
          补录复核
        </button>
      </div>

      {showAddNote && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-md text-sm text-sky-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">补录说明</p>
              <p className="text-sky-600 mt-0.5">
                如有人工采样检测的新数值请填写，系统将自动重新评估等级、更新 WQI 和收成估算。
                只需要备注不更新数值可留空检测值。
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">
              补录检测值 <span className="text-slate-400">（可选，单位 {record.unit || '—'}，标准 {record.standard}）</span>
            </label>
            <input
              type="number"
              step="any"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder={`例如 8.2（留空则不更新数值）`}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">复核备注 <span className="text-slate-400">（有新值时可选）</span></label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              rows={2}
              placeholder="描述检测场景、复核结论等..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">数据来源</label>
            <input
              type="text"
              value={noteSource}
              onChange={(e) => setNoteSource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="如：人工采样复核、实验室检测、第三方机构等"
            />
          </div>

          {submitError && (
            <div className="text-sm text-rose-600 flex items-center gap-1.5">
              <AlertCircle size={14} />
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddNote(false);
                setSubmitError(null);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              提交补录
            </button>
          </div>
        </div>
      )}

      {record.reviewNotes.length > 0 && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <FileText size={12} />
            复核记录（{record.reviewNotes.length}）
          </h5>
          {record.reviewNotes.map((note, idx) => {
            const ts = note.timestamp ? new Date(note.timestamp) : null;
            const validTime = ts && !Number.isNaN(ts.getTime());
            return (
              <div
                key={note.id}
                className={cn(
                  'p-3 rounded-lg text-sm border',
                  note.isSupplement
                    ? 'bg-sky-50 border-sky-200'
                    : 'bg-white border-slate-200'
                )}
                style={{ marginLeft: `${idx * 8}px` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <User size={12} />
                    {note.reviewer}
                    {note.isSupplement && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-sky-700 ml-2">
                        <CheckCircle2 size={10} />
                        补录复核
                      </span>
                    )}
                  </span>
                  {validTime ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {ts!.toLocaleString('zh-CN')}
                    </span>
                  ) : (
                    <span className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle size={10} />
                      时间无效
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-700">{note.content}</p>
                <p className="mt-1 text-xs text-slate-400">来源：{note.source}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface WaterQualityPanelProps {
  records: WaterQualityRecord[];
  onSupplement?: (recordId: string, payload: SupplementPayload) => void;
  onAddNote?: (recordId: string, note: Omit<ReviewNote, 'id' | 'timestamp'>) => void;
  className?: string;
}

export function WaterQualityPanel({ records, onSupplement, className }: WaterQualityPanelProps) {
  const normalCount = records.filter(r => r.level === 'normal').length;
  const warningCount = records.filter(r => r.level === 'warning').length;
  const criticalCount = records.filter(r => r.level === 'critical').length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Droplets size={20} className="text-cyan-600" />
          水质预警与复核
        </h3>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-600">
            正常 <span className="font-bold">{normalCount}</span>
          </span>
          <span className="text-amber-600">
            预警 <span className="font-bold">{warningCount}</span>
          </span>
          <span className="text-rose-600">
            异常 <span className="font-bold">{criticalCount}</span>
          </span>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-cyan-50 to-sky-50 rounded-lg border border-cyan-200">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">说明：</span>
          水质评估不是一次性判断。点击"补录复核"可以补录新的检测值或备注；
          补录新值后系统会自动重算水质等级、综合指数（WQI）和收成估算，
          并把复核备注和历史版本一同保留。
        </p>
      </div>

      <div className="grid gap-4">
        {records.map(record => (
          <WaterQualityCard key={record.id} record={record} onSupplement={onSupplement} />
        ))}
      </div>
    </div>
  );
}
