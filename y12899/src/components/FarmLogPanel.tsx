import { useState } from 'react';
import { BookOpen, Clock, AlertTriangle, ChevronDown, ChevronUp, Edit3, CheckCircle2, FileWarning, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FarmLog } from '../types';

interface FarmLogCardProps {
  log: FarmLog;
  onUpdate?: (logId: string, content: string) => void;
  affectedConclusions?: string[];
}

const conclusionLabels: Record<string, string> = {
  'conclusion-001': '收成估算主结论',
  'conclusion-002': '水质综合评价',
  'conclusion-003': '禁航区影响评估',
  'conclusion-004': '单位面积生物量估算',
  'conclusion-005': '成活率评估',
};

function FarmLogCard({ log, onUpdate, affectedConclusions = [] }: FarmLogCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(log.content);

  const handleSave = () => {
    if (onUpdate && editContent.trim()) {
      onUpdate(log.id, editContent);
      setIsEditing(false);
    }
  };

  const hasAffectedConclusions = log.isDelayed && log.affectedConclusions.length > 0;

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden transition-all',
      log.isDelayed
        ? 'border-amber-300 bg-amber-50/50'
        : 'border-slate-200 bg-white'
    )}>
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0',
            log.isDelayed ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
          )}>
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-slate-800">
                {new Date(log.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </h4>
              {log.isDelayed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Clock size={12} />
                  延迟 {log.delayedDays} 天
                </span>
              )}
              <span className="text-xs text-slate-400">v{log.version}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">
              {log.content}
            </p>
            {hasAffectedConclusions && (
              <div className="mt-2 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700">
                  影响 {log.affectedConclusions.length} 项结论，点击展开查看详情
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {log.isDelayed && onUpdate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setIsOpen(true);
              }}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 flex items-center gap-1"
            >
              <Edit3 size={14} />
              补充日志
            </button>
          )}
          {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-600">更新日志内容</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                rows={4}
                placeholder="请输入完整的日志内容..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(log.content);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
                >
                  保存更新
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.content}</p>
            </div>
          )}

          {log.previousVersion && (
            <div className="p-3 bg-slate-100/50 rounded-lg border border-dashed border-slate-300">
              <h5 className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                <History size={12} />
                上一版本内容（旧结果已保留，未被覆盖）
              </h5>
              <p className="text-sm text-slate-500">{log.previousVersion}</p>
            </div>
          )}

          {hasAffectedConclusions && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h5 className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-3">
                <FileWarning size={16} />
                受影响的估算结论
              </h5>
              <p className="text-xs text-amber-700 mb-3">
                由于本日志延迟提交，以下结论的可信度受影响。旧结果已保留，不会被悄悄覆盖。
              </p>
              <div className="space-y-2">
                {log.affectedConclusions.map(conclusionId => (
                  <div
                    key={conclusionId}
                    className="flex items-center gap-2 p-2 bg-white/70 rounded-lg border border-dashed border-amber-300"
                  >
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-amber-700">
                      {conclusionLabels[conclusionId] || conclusionId}
                    </span>
                    <span className="ml-auto text-xs text-amber-500">待复核</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FarmLogPanelProps {
  logs: FarmLog[];
  onUpdate?: (logId: string, content: string) => void;
  className?: string;
}

export function FarmLogPanel({ logs, onUpdate, className }: FarmLogPanelProps) {
  const delayedLogs = logs.filter(l => l.isDelayed);
  const normalLogs = logs.filter(l => !l.isDelayed);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-600" />
          养殖日志管理
        </h3>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">
            共 <span className="font-medium text-slate-700">{logs.length}</span> 条
          </span>
          {delayedLogs.length > 0 && (
            <span className="text-amber-600">
              延迟 <span className="font-bold">{delayedLogs.length}</span> 条
            </span>
          )}
        </div>
      </div>

      {delayedLogs.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">日志延迟提醒</h4>
              <p className="text-sm text-amber-700 mt-0.5">
                有 {delayedLogs.length} 条日志延迟提交，相关结论已标记为"待复核"。系统保留了历史版本，
                不会悄悄覆盖旧结果。请尽快补充完整日志内容。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {logs.map(log => (
          <FarmLogCard
            key={log.id}
            log={log}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {logs.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300" />
          <p className="mt-2 text-slate-500">暂无养殖日志</p>
        </div>
      )}
    </div>
  );
}
