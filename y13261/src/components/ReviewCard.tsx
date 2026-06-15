import { Link } from 'react-router-dom';
import { MapPin, Clock, AlertTriangle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
  summary: string;
}

export default function ReviewCard({ review, summary }: ReviewCardProps) {
  return (
    <Link
      to={`/review/${review.id}`}
      className="block bg-white rounded-lg border border-steel-100 p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-medium text-steel-700 line-clamp-2 flex-1 pr-3">
          {review.title}
        </h3>
        <StatusBadge status={review.status} hasAnomaly={review.hasAnomaly} />
      </div>

      <div className="flex items-center gap-4 text-sm text-steel-400 mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} />
          <span className="truncate max-w-[180px]">{review.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={14} />
          <span>{review.updatedAt.split(' ')[0]}</span>
        </div>
      </div>

      <p className="text-sm text-steel-500 line-clamp-2 leading-relaxed">
        {summary}
      </p>

      {review.hasAnomaly && (
        <div className="mt-3 pt-3 border-t border-steel-50 flex items-center gap-1.5 text-warning-500 text-xs">
          <AlertTriangle size={14} />
          <span>存在异常待处理</span>
        </div>
      )}
    </Link>
  );
}
