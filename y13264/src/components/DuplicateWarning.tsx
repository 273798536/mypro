import { AlertTriangle, MapPin, User, Calendar, FileText, X } from 'lucide-react';
import { Complaint } from '../utils/types';
import { StatusBadge } from './StatusBadge';
import { Modal } from './Modal';

interface DuplicateWarningProps {
  isOpen: boolean;
  onClose: () => void;
  duplicate: Complaint;
  newData: {
    street: string;
    complainant: string;
    description: string;
  };
}

export function DuplicateWarning({ isOpen, onClose, duplicate, newData }: DuplicateWarningProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="检测到重复提交" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-800 mb-1">发现重复记录</h4>
            <p className="text-sm text-rose-700">
              该街口在24小时内已有相似内容的投诉记录，为避免重复统计，本次提交已被拦截。
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-rose-100 rounded-lg transition-colors ml-auto"
          >
            <X className="w-5 h-5 text-rose-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h5 className="font-medium text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              已有记录
            </h5>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <StatusBadge status={duplicate.status} />
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="line-clamp-1">{duplicate.street}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{duplicate.complainant}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{duplicate.complaintTime}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <p className="line-clamp-3">{duplicate.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-medium text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              本次提交
            </h5>
            <div className="bg-blue-50 rounded-xl p-4 space-y-2 border border-blue-200">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                待提交
              </span>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="line-clamp-1">{newData.street}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{newData.complainant}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <p className="line-clamp-3">{newData.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>提示：</strong>如果您确认这是两条不同的投诉，请修改描述内容后重新提交。
            系统会自动比对街口位置和描述内容的相似度（当前阈值：85%）。
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </Modal>
  );
}
