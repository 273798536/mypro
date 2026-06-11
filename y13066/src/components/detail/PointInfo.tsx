import { useMemo } from 'react';
import { Gauge, MapPin, Clock, Hash, AlertCircle, CheckCircle } from 'lucide-react';
import { BoomPoint, PointStatus } from '@/types';
import { formatDateTime } from '@/utils/date';
import { getAnomalyTypeLabel, getStatusLabel, getStatusColor, detectFloorUnitCategory } from '@/utils/unit';
import { useDataStore } from '@/store/useDataStore';

interface PointInfoProps {
  point: BoomPoint;
}

const statusIcons: Record<PointStatus, typeof AlertCircle> = {
  pending: AlertCircle,
  confirmed: AlertCircle,
  resolved: CheckCircle,
};

export default function PointInfo({ point }: PointInfoProps) {
  const { points } = useDataStore();

  const isMixedUnit = useMemo(() => {
    const boomPoints = points.filter(p => p.boomId === point.boomId);
    const unitSet = new Set(boomPoints.map(p => detectFloorUnitCategory(p.floorUnit)));
    return unitSet.size > 1 && detectFloorUnitCategory(point.floorUnit) !== 'unknown';
  }, [points, point.boomId, point.floorUnit]);

  const infoItems = [
    {
      icon: Hash,
      label: '点位ID',
      value: point.id,
      mono: true,
    },
    {
      icon: Clock,
      label: '时间',
      value: formatDateTime(point.timestamp),
    },
    {
      icon: Gauge,
      label: '数值',
      value: `${point.value.toFixed(2)} ${point.unit}`,
      mono: true,
      highlight: point.isAnomaly,
    },
    {
      icon: MapPin,
      label: '楼层',
      value: `${point.floor} ${point.floorUnit}`,
      mono: true,
      warning: isMixedUnit,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        基本信息
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {infoItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`glass-card p-3 ${
                item.highlight ? 'border-alert-red/50' : item.warning ? 'border-warning-yellow/50' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
                <Icon className="w-3 h-3" />
                {item.label}
              </div>
              <div
                className={`text-sm font-medium ${
                  item.mono ? 'font-mono' : ''
                } ${
                  item.highlight ? 'text-alert-red' : item.warning ? 'text-warning-yellow' : 'text-text-primary'
                }`}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">异常类型</span>
          <span className={`tag ${point.isAnomaly ? 'tag-danger' : 'tag-success'}`}>
            {getAnomalyTypeLabel(point.anomalyType)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">处理状态</span>
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: getStatusColor(point.status) }}
          >
            {(() => {
              const StatusIcon = statusIcons[point.status];
              return <StatusIcon className="w-3.5 h-3.5" />;
            })()}
            {getStatusLabel(point.status)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">材料ID</span>
          <span className="font-mono text-xs text-tech-blue">{point.materialId}</span>
        </div>
      </div>

      {isMixedUnit && (
        <div className="bg-warning-yellow/10 border border-warning-yellow/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning-yellow flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-warning-yellow mb-1">单位混写警告</p>
              <p className="text-text-secondary">
                该吊杆存在多种楼层单位写法，建议统一为标准单位。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
