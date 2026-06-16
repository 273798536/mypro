import { useState } from 'react';
import { Droplets, Plus, Clock, User, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WaterQualityRecord, ReviewNote } from '../types';

interface WaterQualityCardProps {
  record: WaterQualityRecord;
  onAddNote?: (recordId: string, note: Omit<ReviewNote, 'id' | 'timestamp'>) => void;
}

const levelConfig = {
  normal: {
    label: '正常',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  warning: {
    label: '预警',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  critical: {
    label: '异常',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    dotColor: 'bg-rose-500',
  },
};

function WaterQualityCard({ record, onAddNote }: WaterQualityCardProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSource, setNoteSource] = useState('');
  const config = levelConfig[record.level];
  const deviation = ((record.value - record.standard) / record.standard * 100).toFixed(1);
  const isOverLimit = record.level !== 'normal';

  const handleAddNote = () => {
    if (!noteContent.trim() || !onAddNote) return;
    onAddNote(record.id, {
      reviewer: '当前用户',
      content: noteContent,
      isSupplement: true,
      source: noteSource || '人工复核',
    });
    setNoteContent('');
    setNoteSource('');
    setShowAddNote(false);
  };

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-all',
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
            <h4 className="font-medium text-slate-800">{record.index}</h4>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              `bg-${record.level === 'normal' ? 'emerald' : record.level === 'warning' ? 'amber' : 'rose'}-100`,
              config.textColor
            )}>
              {config.label}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
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
            {new Date(record.timestamp).toLocaleString('zh-CN')}
          </p>
        </div>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1"
        >
          <Plus size={14} />
          补录备注
        </button>
      </div>

      {showAddNote && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">补录内容</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              rows={2}
              placeholder="请输入复核备注..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">数据来源</label>
            <input
              type="text"
              value={noteSource}
              onChange={(e) => setNoteSource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="如：人工采样复核、实验室检测等"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddNote(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              onClick={handleAddNote}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
            >
              确认补录
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
          {record.reviewNotes.map((note, idx) => (
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
              <div className="flex items-center justify-between">
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
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(note.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="mt-1 text-slate-700">{note.content}</p>
              <p className="mt-1 text-xs text-slate-400">来源：{note.source}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface WaterQualityPanelProps {
  records: WaterQualityRecord[];
  onAddNote?: (recordId: string, note: Omit<ReviewNote, 'id' | 'timestamp'>) => void;
  className?: string;
}

export function WaterQualityPanel({ records, onAddNote, className }: WaterQualityPanelProps) {
  const normalCount = records.filter(r => r.level === 'normal').length;
  const warningCount = records.filter(r => r.level === 'warning').length;
  const criticalCount = records.filter(r => r.level === 'critical').length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
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
          <span className="font-medium text-slate-700">提示：</span>
          水质评估不是一次性判断。点击"补录备注"可添加复核数据，所有复核记录都会与原始数据一起保留，
          形成完整的质量追溯链条。
        </p>
      </div>

      <div className="grid gap-4">
        {records.map(record => (
          <WaterQualityCard key={record.id} record={record} onAddNote={onAddNote} />
        ))}
      </div>
    </div>
  );
}
