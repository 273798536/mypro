import { useState } from 'react';
import { GitMerge, SeparatorHorizontal, X, MapPin, User, Calendar, FileText, Check } from 'lucide-react';
import { Complaint } from '../utils/types';
import { StatusBadge } from './StatusBadge';
import { Modal } from './Modal';
import { cn } from '../lib/utils';

interface MergeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (targetId: string, sourceIds: string[], reason: string) => void;
  onKeepSeparate: (group: Complaint[], reason: string) => void;
  newComplaint: Complaint;
  existingComplaints: Complaint[];
}

type MergeOption = 'merge' | 'keep' | null;

export function MergeConfirmModal({
  isOpen,
  onClose,
  onMerge,
  onKeepSeparate,
  newComplaint,
  existingComplaints,
}: MergeConfirmModalProps) {
  const [selectedOption, setSelectedOption] = useState<MergeOption>(null);
  const [mergeTarget, setMergeTarget] = useState<string>(newComplaint.id);
  const [reason, setReason] = useState('');
  const allComplaints = [newComplaint, ...existingComplaints];

  const handleConfirm = () => {
    if (!selectedOption || !reason.trim()) return;

    if (selectedOption === 'merge') {
      const sourceIds = allComplaints
        .filter(c => c.id !== mergeTarget)
        .map(c => c.id);
      onMerge(mergeTarget, sourceIds, reason);
    } else {
      onKeepSeparate(allComplaints, reason);
    }
    
    setSelectedOption(null);
    setReason('');
    setMergeTarget(newComplaint.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="同一街口存在多条投诉" size="xl">
      <div className="space-y-5">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <GitMerge className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">检测到同街口多单</h4>
            <p className="text-sm text-amber-700">
              该街口已存在 {existingComplaints.length} 条投诉记录，请选择处理方式：
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-amber-100 rounded-lg transition-colors ml-auto"
          >
            <X className="w-5 h-5 text-amber-500" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setSelectedOption('merge')}
            className={cn(
              'flex-1 p-4 rounded-xl border-2 transition-all text-left',
              selectedOption === 'merge'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                selectedOption === 'merge' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              )}>
                {selectedOption === 'merge' && <Check className="w-3 h-3 text-white" />}
              </div>
              <GitMerge className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-slate-800">归并为一条记录</span>
            </div>
            <p className="text-sm text-slate-600 pl-7">
              合并所有投诉内容，保留全部附件和历史记录，便于统一处理
            </p>
          </button>

          <button
            onClick={() => setSelectedOption('keep')}
            className={cn(
              'flex-1 p-4 rounded-xl border-2 transition-all text-left',
              selectedOption === 'keep'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                selectedOption === 'keep' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              )}>
                {selectedOption === 'keep' && <Check className="w-3 h-3 text-white" />}
              </div>
              <SeparatorHorizontal className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-slate-800">保留两条独立记录</span>
            </div>
            <p className="text-sm text-slate-600 pl-7">
              分别处理但标记关联关系，避免遗漏不同投诉人的诉求
            </p>
          </button>
        </div>

        {selectedOption === 'merge' && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h5 className="font-medium text-slate-700 mb-3">选择主记录（其他记录将合并到此）</h5>
            <div className="space-y-2">
              {allComplaints.map((complaint) => (
                <label
                  key={complaint.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    mergeTarget === complaint.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <input
                    type="radio"
                    name="mergeTarget"
                    checked={mergeTarget === complaint.id}
                    onChange={() => setMergeTarget(complaint.id)}
                    className="mt-1 w-4 h-4 text-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={complaint.status} showIcon={false} />
                      {complaint.id === newComplaint.id && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">本次提交</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {complaint.complainant}
                      <span className="text-slate-400">·</span>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {complaint.complaintTime}
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-1 mt-1 flex items-start gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      {complaint.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedOption === 'keep' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800">
              <Check className="w-4 h-4 inline mr-1" />
              两条记录将分别独立处理，但会标记为"同街口多单"，便于关联查看。
            </p>
          </div>
        )}

        {selectedOption && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              处理原因 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={selectedOption === 'merge' 
                ? '请说明归并原因，例如：同一问题多次投诉、内容相似可合并处理...'
                : '请说明保留独立记录的原因，例如：不同时间发生、问题性质不同...'}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{reason.length} 字</p>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-4">
          <h5 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            涉及街口：{newComplaint.street}
          </h5>
          <div className="grid gap-3">
            {allComplaints.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                  {idx + 1}
                </span>
                <div className="flex-1 flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{c.complainant}</span>
                  <span className="text-slate-400">·</span>
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">{c.complaintTime}</span>
                </div>
                <StatusBadge status={c.status} showIcon={false} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption || !reason.trim()}
            className={cn(
              'px-6 py-2 text-white rounded-lg font-medium transition-colors',
              selectedOption && reason.trim()
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-slate-300 cursor-not-allowed'
            )}
          >
            确认处理
          </button>
        </div>
      </div>
    </Modal>
  );
}
