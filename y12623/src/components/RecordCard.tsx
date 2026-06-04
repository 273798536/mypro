import { Link } from 'react-router-dom';
import { Calendar, MapPin, Truck, FileText, User, Edit3, Plus } from 'lucide-react';
import type { LoadingRecord } from '../../shared/types';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/format';

interface RecordCardProps {
  record: LoadingRecord;
  index?: number;
}

export function RecordCard({ record, index = 0 }: RecordCardProps) {
  const hasAnomaly = record.status === 'anomaly';

  return (
    <Link
      to={`/record/${record.id}`}
      className={`card p-4 block transition-all duration-200 hover:-translate-y-0.5 animate-fade-in ${
        hasAnomaly ? 'animate-pulse-once ring-2 ring-amber-300' : ''
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="font-mono text-sm font-semibold text-industrial-700">
          {record.batchNo}
        </div>
        <StatusBadge status={record.status} anomalyType={record.anomalyType} />
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="font-medium">月台 {record.platformNo}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Truck className="w-4 h-4 text-slate-400" />
          <span>{record.vehicleNo}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="truncate">{record.source}</span>
        </div>
      </div>

      {record.latestScore !== undefined && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">{record.scorer || '未评分'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-slate-400" />
              <span className={`font-mono font-semibold ${
                record.latestScore >= 80 ? 'text-emerald-600' :
                record.latestScore >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {record.latestScore}分
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(record.importTime)}</span>
        </div>
        {record.isSupplement && (
          <span className="flex items-center gap-1 text-xs text-industrial-600 bg-industrial-50 px-2 py-0.5 rounded">
            <Plus className="w-3 h-3" />
            补录
          </span>
        )}
      </div>

      {!record.sketchImage && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          ⚠️ 素材缺失
        </div>
      )}
    </Link>
  );
}
