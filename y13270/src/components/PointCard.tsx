import { Link } from 'react-router-dom';
import { AlertTriangle, Layers, FileText, MapPin } from 'lucide-react';
import { MergedPoint, STATUS_BORDER_COLORS } from '../types';
import { StatusBadge } from './StatusBadge';
import { usePointStore } from '../store';
import { formatDistance } from '../utils/geo';

interface PointCardProps {
  point: MergedPoint;
  index: number;
}

export function PointCard({ point, index }: PointCardProps) {
  const { rawPoints } = usePointStore();
  const rawPointsForPoint = rawPoints.filter(rp =>
    point.rawPointIds.includes(rp.id)
  );
  const hasOffset = rawPointsForPoint.some(rp => rp.isOffset);
  const maxOffset = Math.max(...rawPointsForPoint.map(rp => rp.offsetDistance));

  return (
    <Link
      to={`/point/${point.id}`}
      className={`card p-4 border-l-4 ${STATUS_BORDER_COLORS[point.status]} 
        hover:-translate-y-0.5 cursor-pointer block`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-serif-cn font-semibold text-gray-800">
            {point.canonicalName}
          </h3>
          {hasOffset && (
            <span className="offset-pulse bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              偏移 {formatDistance(maxOffset)}
            </span>
          )}
        </div>
        <StatusBadge status={point.status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <Layers className="w-4 h-4" />
          <span>{rawPointsForPoint.length} 条原始数据</span>
        </div>
        {point.hasSupplementaryNote && (
          <div className="flex items-center gap-1 text-amber-600">
            <FileText className="w-4 h-4" />
            <span>有后补备注</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        <div className="flex items-center gap-1 mb-1">
          <MapPin className="w-3 h-3" />
          <span>
            {point.canonicalLat.toFixed(4)}, {point.canonicalLng.toFixed(4)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {rawPointsForPoint.slice(0, 3).map((rp, i) => (
            <span
              key={rp.id}
              className={`inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded ${
                rp.isOffset ? 'line-through text-orange-500' : ''
              }`}
            >
              {rp.rawName}
            </span>
          ))}
          {rawPointsForPoint.length > 3 && (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-400 rounded">
              +{rawPointsForPoint.length - 3}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
