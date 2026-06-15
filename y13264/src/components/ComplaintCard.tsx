import { MapPin, User, Calendar, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import { Complaint } from '../utils/types';
import { StatusBadge, MergeStatusBadge } from './StatusBadge';
import { cn } from '../lib/utils';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: () => void;
  isSelected?: boolean;
}

export function ComplaintCard({ complaint, onClick, isSelected }: ComplaintCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition-all duration-300 hover:shadow-md hover:border-blue-300 group',
        isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={complaint.status} />
          <MergeStatusBadge status={complaint.mergeStatus} />
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
      </div>

      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 line-clamp-2">
        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span>{complaint.street}</span>
      </h3>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span>投诉人: {complaint.complainant}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{complaint.complaintTime}</span>
        </div>
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="line-clamp-2">{complaint.description}</p>
        </div>
      </div>

      {complaint.meetingNotes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>已补录 {complaint.meetingNotes.length} 条会议纪要</span>
          </div>
        </div>
      )}

      {complaint.attachments.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          附件: {complaint.attachments.filter(a => !a.isDuplicate).length} 个文件
        </div>
      )}
    </div>
  );
}
