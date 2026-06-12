import { MapPin, Fish, Waves, Droplets, Clock, CheckCircle, XCircle, GripVertical } from 'lucide-react';
import type { SamplingRecord } from '../../shared/types';
import RiskBadge from './RiskBadge';
import { cn } from '../lib/utils';

interface RecordCardProps {
  record: SamplingRecord;
  onEdit?: (record: SamplingRecord) => void;
  onViewImpact?: (id: number) => void;
  compact?: boolean;
}

export default function RecordCard({ record, onEdit, onViewImpact, compact = false }: RecordCardProps) {
  const dataItems = [
    { key: 'wind_wave_forecast', label: '风浪预报', icon: Waves, value: record.wind_wave_forecast },
    { key: 'tide_data', label: '潮汐数据', icon: Clock, value: record.tide_data },
    { key: 'water_quality', label: '水质记录', icon: Droplets, value: record.water_quality }
  ];

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden',
        compact ? 'p-4' : 'p-6'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-slate-300 cursor-grab">
            <GripVertical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-semibold text-slate-800">
                {record.date}
              </h4>
              <RiskBadge level={record.risk_level} size="sm" />
              {record.confirmed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                  <CheckCircle className="w-3 h-3" />
                  已复核
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {record.area}
              </span>
              <span className="flex items-center gap-1">
                <Fish className="w-3.5 h-3.5" />
                {record.species}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
            >
              编辑/补录
            </button>
          )}
          {onViewImpact && record.risk_level !== 'normal' && (
            <button
              onClick={() => onViewImpact(record.id)}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
              查看影响
            </button>
          )}
        </div>
      </div>

      {record.risk_factors.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {record.risk_factors.map((factor, idx) => (
            <span
              key={idx}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium',
                record.risk_level === 'anomaly'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              )}
            >
              <XCircle className="w-3 h-3" />
              {factor}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {dataItems.map(item => {
          const Icon = item.icon;
          const hasValue = !!item.value;
          return (
            <div
              key={item.key}
              className={cn(
                'p-3 rounded-xl border transition-colors',
                hasValue
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-amber-50 border-amber-200 border-dashed'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon
                  className={cn(
                    'w-4 h-4',
                    hasValue ? 'text-slate-500' : 'text-amber-600'
                  )}
                />
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
              </div>
              <p
                className={cn(
                  'text-sm',
                  hasValue ? 'text-slate-800' : 'text-amber-600 font-medium'
                )}
              >
                {hasValue ? item.value : '待补录'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
