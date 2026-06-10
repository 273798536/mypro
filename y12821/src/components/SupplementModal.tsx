import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useSampleStore } from '../store/useSampleStore';
import { SampleStatus, SAMPLING_LOCATIONS, STRAIN_TYPES } from '../../shared/types';

interface SupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplementModal: React.FC<SupplementModalProps> = ({ isOpen, onClose }) => {
  const supplementSample = useSampleStore((state) => state.supplementSample);
  const [formData, setFormData] = useState({
    strainCode: '',
    strainName: '',
    preservationDate: '',
    expiryDate: '',
    samplingLocation: SAMPLING_LOCATIONS[0],
    strainType: STRAIN_TYPES[0],
    status: 'pending' as SampleStatus,
    autoJudge: 'normal' as SampleStatus,
    notes: '',
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.strainCode.trim() || !formData.strainName.trim()) {
      setError('请填写菌株编号和名称');
      return;
    }
    if (!formData.preservationDate || !formData.expiryDate) {
      setError('请填写保藏日期和到期日期');
      return;
    }
    if (!reason.trim()) {
      setError('请填写补录原因，这将记录在审计日志中');
      return;
    }

    supplementSample(
      {
        ...formData,
        contaminationMarks: formData.status === 'contaminated' ? ['人工标记污染'] : undefined,
      },
      reason
    );

    onClose();
    setFormData({
      strainCode: '',
      strainName: '',
      preservationDate: '',
      expiryDate: '',
      samplingLocation: SAMPLING_LOCATIONS[0],
      strainType: STRAIN_TYPES[0],
      status: 'pending',
      autoJudge: 'normal',
      notes: '',
    });
    setReason('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">补录样本</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                菌株编号 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.strainCode}
                onChange={(e) => setFormData({ ...formData, strainCode: e.target.value })}
                placeholder="如 ST-0021"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                菌株名称 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.strainName}
                onChange={(e) => setFormData({ ...formData, strainName: e.target.value })}
                placeholder="如 大肠杆菌 DH5α"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                保藏日期 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.preservationDate}
                onChange={(e) => setFormData({ ...formData, preservationDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                到期日期 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                采样地点
              </label>
              <select
                value={formData.samplingLocation}
                onChange={(e) => setFormData({ ...formData, samplingLocation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {SAMPLING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                菌株类型
              </label>
              <select
                value={formData.strainType}
                onChange={(e) => setFormData({ ...formData, strainType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {STRAIN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="请填写样本相关备注信息..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              补录原因 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明补录原因，如：前期遗漏、发现新样本等..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              补录样本
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
