import { MapPin, Clock, AlertTriangle, Image, FileText } from 'lucide-react';
import type { Complaint } from '../../shared/types.js';
import { getStatusText, getStatusColor, formatTime } from '../utils/geoUtils.js';

interface ComplaintCardProps {
  complaint: Complaint;
  selected: boolean;
  onClick: () => void;
  index: number;
}

export default function ComplaintCard({ complaint, selected, onClick, index }: ComplaintCardProps) {
  const nameMismatchCount = complaint.photos.filter(p => p.isNameMismatch).length;
  const hasIssues = complaint.hasCoordinateOffset || nameMismatchCount > 0;
  
  const staggerClass = `animate-stagger-${Math.min(index + 1, 5)}` as const;

  return (
    <div
      onClick={onClick}
      className={`
        animate-fade-in ${staggerClass} opacity-0
        bg-white rounded-lg border-2 p-4 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
        ${selected 
          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md' 
          : 'border-slate-200 hover:border-slate-300'
        }
        ${hasIssues ? 'border-l-4 border-l-red-500' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {complaint.id}
          </span>
          {hasIssues && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
              <AlertTriangle className="w-3 h-3" />
              存在问题
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(complaint.status)}`}>
          {getStatusText(complaint.status)}
        </span>
      </div>
      
      <h4 className="font-semibold text-slate-800 mb-2 line-clamp-1">
        {complaint.title}
      </h4>
      
      <div className="space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate">{complaint.address}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatTime(complaint.createdAt)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Image className="w-3.5 h-3.5" />
          <span>{complaint.photos.length}张照片</span>
        </div>
        {nameMismatchCount > 0 && (
          <div className="text-xs text-red-500 font-medium">
            {nameMismatchCount}张名称不一致
          </div>
        )}
        {complaint.hasCoordinateOffset && (
          <div className="text-xs text-amber-600 font-medium">
            偏移{complaint.offsetDistance}米
          </div>
        )}
        {complaint.changeHistory.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <FileText className="w-3.5 h-3.5" />
            <span>{complaint.changeHistory.length}条变更</span>
          </div>
        )}
      </div>
    </div>
  );
}
