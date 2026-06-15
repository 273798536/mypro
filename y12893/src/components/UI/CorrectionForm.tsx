import { useState } from 'react';
import { X, CheckCircle, PauseCircle, RefreshCw, XCircle } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import type { DataRecord, DataStatus, CorrectionRecord, QualityIssue } from '@/types';
import { STATUS_LABELS, QUALITY_ISSUE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface CorrectionFormProps {
  record: DataRecord;
  onClose: () => void;
}

const statusOptions: { value: DataStatus; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: 'approved', label: '通过', icon: CheckCircle, color: '#2A9D8F' },
  { value: 'suspended', label: '暂缓', icon: PauseCircle, color: '#F4A261' },
  { value: 'recollect', label: '重采', icon: RefreshCw, color: '#E76F51' },
  { value: 'rejected', label: '驳回', icon: XCircle, color: '#E63946' }
];

const allQualityIssues: QualityIssue[] = ['unit_mismatch', 'negative_depth', 'outlier', 'duplicate', 'missing'];

export function CorrectionForm({ record, onClose }: CorrectionFormProps) {
  const [newStatus, setNewStatus] = useState<DataStatus>(record.status);
  const [selectedIssues, setSelectedIssues] = useState<QualityIssue[]>([...record.qualityIssues]);
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('海事安全员');
  const { correctRecord, clearImportResult } = useDataStore();

  const toggleIssue = (issue: QualityIssue) => {
    setSelectedIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('请填写修正原因');
      return;
    }

    const correction: CorrectionRecord = {
      id: `corr_${Date.now()}`,
      timestamp: Date.now(),
      operator,
      before: {
        status: record.status,
        qualityIssues: [...record.qualityIssues]
      },
      after: {
        status: newStatus,
        qualityIssues: [...selectedIssues]
      },
      reason: reason.trim(),
      statusChange: record.status !== newStatus
        ? { from: record.status, to: newStatus }
        : { from: record.status, to: newStatus }
    };

    await correctRecord(record.id, {
      status: newStatus,
      qualityIssues: selectedIssues
    }, correction);

    clearImportResult();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">人工修正数据</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">当前记录</p>
            <p className="font-semibold text-gray-800">
              {record.type === 'ship_track' ? record.vesselName :
               record.type === 'aquaculture_log' ? record.farmName : record.stationId}
            </p>
            <p className="text-xs text-gray-400 mt-1">ID: {record.id}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              修正后状态
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewStatus(opt.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3',
                    newStatus === opt.value
                      ? 'border-[#3E92CC] bg-[#3E92CC]5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <opt.icon className="w-5 h-5" style={{ color: opt.color }} />
                  <span className="font-medium" style={{ color: opt.color }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              质量问题标记
            </label>
            <div className="flex flex-wrap gap-2">
              {allQualityIssues.map((issue) => (
                <button
                  key={issue}
                  onClick={() => toggleIssue(issue)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    selectedIssues.includes(issue)
                      ? 'bg-[#E63946] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {QUALITY_ISSUE_LABELS[issue]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              点击切换标签，清空标签表示数据无质量问题
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              操作人员
            </label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3E92CC] focus:border-transparent transition-all"
              placeholder="请输入操作人员姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              修正原因 <span className="text-[#E63946]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3E92CC] focus:border-transparent transition-all resize-none"
              placeholder="请详细说明修正原因...
例如：经复核，该盐度数据单位应为ppt而非psu，已与原始数据源确认。"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-[#0A2463] to-[#3E92CC] text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              确认修正
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 注意：</strong>所有修正操作将被永久记录，包括修正前后的数据对比、操作人员和修正原因。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
