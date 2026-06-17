import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  MapPin,
  CopyCheck,
  FileX,
  Clock,
  Eye,
  CheckSquare,
  Wrench,
  ArrowRight,
  Loader2,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';
import type { ExceptionType, ExceptionItem, ExceptionStatus } from '../shared/types';

const exceptionTabs: { value: ExceptionType | 'all'; label: string; icon: typeof AlertTriangle }[] = [
  { value: 'all', label: '全部', icon: AlertTriangle },
  { value: 'coordinate_offset', label: '坐标偏移', icon: MapPin },
  { value: 'duplicate_location', label: '同地异名', icon: CopyCheck },
  { value: 'material_conflict', label: '材料冲突', icon: FileX },
  { value: 'late_attachment', label: '晚到附件', icon: Clock },
];

const exceptionTypeStyle: Record<ExceptionType, { label: string; className: string }> = {
  coordinate_offset: {
    label: '坐标偏移',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  duplicate_location: {
    label: '同地异名',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  material_conflict: {
    label: '材料冲突',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  late_attachment: {
    label: '晚到附件',
    className: 'bg-warning/20 text-yellow-800 border-warning/40',
  },
};

const statusLabelMap: Record<ExceptionStatus, string> = {
  open: '待处理',
  reviewed: '已查看',
  resolved: '已处理',
};

export default function ExceptionQueue() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ExceptionType | 'all'>('all');
  const { exceptions, loading, fetchExceptions, fetchRecords } = useSeatStore();

  useEffect(() => {
    fetchRecords();
    fetchExceptions();
  }, [fetchRecords, fetchExceptions]);

  const filteredExceptions = useMemo(() => {
    if (activeTab === 'all') return exceptions;
    return exceptions.filter((e) => e.type === activeTab);
  }, [exceptions, activeTab]);

  if (loading && exceptions.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-5">
        <h2 className="text-xl font-serif font-semibold text-text-dark mb-1">异常队列</h2>
        <p className="text-sm text-gray-500">共 {exceptions.length} 条异常待处理</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-2 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {exceptionTabs.map((tab) => {
            const count = tab.value === 'all'
              ? exceptions.length
              : exceptions.filter((e) => e.type === tab.value).length;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors whitespace-nowrap',
                  active
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={clsx(
                    'text-xs font-mono px-1.5 py-0.5 rounded',
                    active ? 'bg-white/20' : 'bg-gray-200',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {filteredExceptions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg py-16 text-center">
          <EyeOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无此类异常</p>
        </div>
        ) : (
          filteredExceptions.map((item, idx) => (
            <ExceptionCard
              key={item.id}
              item={item}
              index={idx}
              onViewRecord={() => navigate(`/record/${item.relatedRecordIds[0]}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ExceptionCardProps {
  item: ExceptionItem;
  index: number;
  onViewRecord: () => void;
}

function ExceptionCard({ item, index, onViewRecord }: ExceptionCardProps) {
  const style = exceptionTypeStyle[item.type];
  const needsCompare = item.type === 'duplicate_location' || item.type === 'late_attachment';
  const isViewed = item.status !== 'open';
  const isResolved = item.status === 'resolved';
  const beforeDataRaw = item.comparisonData?.before || {};
  const afterDataRaw = item.comparisonData?.after || {};
  const changedFields = item.comparisonData?.changedFields || [];

  const stringifyValue = (v: unknown): string => {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  const beforeData: Record<string, string> = Object.fromEntries(
    Object.entries(beforeDataRaw as Record<string, unknown>).map(([k, v]) => [k, stringifyValue(v)]),
  );
  const afterData: Record<string, string> = Object.fromEntries(
    Object.entries(afterDataRaw as Record<string, unknown>).map(([k, v]) => [k, stringifyValue(v)]),
  );

  return (
    <div
      className={clsx(
        'bg-white border rounded-lg overflow-hidden animate-slideIn transition-all',
        isResolved ? 'border-gray-200 opacity-75' : isViewed ? 'border-gray-200' : 'border-accent/40',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                item.type === 'coordinate_offset'
                  ? 'bg-accent/10'
                  : item.type === 'duplicate_location'
                  ? 'bg-indigo-100'
                  : item.type === 'material_conflict'
                  ? 'bg-red-100'
                  : 'bg-warning/20',
              )}
            >
              {item.type === 'coordinate_offset' && <MapPin className="w-[18px] h-[18px] text-accent" />}
              {item.type === 'duplicate_location' && <CopyCheck className="w-[18px] h-[18px] text-indigo-600" />}
              {item.type === 'material_conflict' && <FileX className="w-[18px] h-[18px] text-red-600" />}
              {item.type === 'late_attachment' && <Clock className="w-[18px] h-[18px] text-yellow-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded border', style.className)}>
                  {style.label}
                </span>
                {!isViewed && (
                  <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded-full">
                    新
                  </span>
                )}
                {isResolved && (
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                    {statusLabelMap[item.status]}
                  </span>
                )}
                {!isResolved && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {statusLabelMap[item.status]}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-dark mb-1">{item.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-mono flex-wrap">
                <span>关联记录：{item.relatedRecordIds.join('、')}</span>
                <span>检测时间：{item.detectedAt}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onViewRecord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary border border-primary/30 rounded hover:bg-primary hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              查看记录
            </button>
          </div>
        </div>
      </div>

      {needsCompare && Object.keys(beforeData).length > 0 && Object.keys(afterData).length > 0 && (
        <div className="bg-gray-50 border-b border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-2 font-medium">变更前</div>
              <dl className="space-y-1.5 text-sm">
                {Object.entries(beforeData).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <dt className="text-gray-500 text-xs">{key}</dt>
                    <dd
                      className={clsx(
                      'text-right font-mono text-xs',
                      changedFields.includes(key) &&
                        'bg-warning/20 px-1 rounded',
                    )}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="bg-white border border-primary/30 rounded-lg p-3">
              <div className="text-xs text-primary mb-2 font-medium">变更后</div>
              <dl className="space-y-1.5 text-sm">
                {Object.entries(afterData).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <dt className="text-gray-500 text-xs">{key}</dt>
                    <dd
                      className={clsx(
                      'text-right font-mono text-xs',
                      changedFields.includes(key) &&
                        'bg-warning/30 px-1 rounded text-text-dark',
                    )}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          {changedFields.length > 0 && (
            <span>
              变更字段：
              {changedFields.map((f, i) => (
                <span key={f}>
                  <span className="bg-warning/20 px-1 rounded text-yellow-800">{f}</span>
                  {i < changedFields.length - 1 && '、'}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isViewed && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              标记已查看
            </button>
          )}
          {!isResolved && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              处理
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
