import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ArrowRecord, RecordStatus } from '@/types';
import { statusLabels, statusColors } from '@/data/mockData';

interface AddRecordModalProps {
  onClose: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({ onClose }) => {
  const { records, addRecord } = useCanvasStore();
  const [formData, setFormData] = useState({
    x: 400,
    y: 250,
    direction: 0,
    status: 'pending' as RecordStatus,
    remark: '',
  });

  const handleSubmit = () => {
    const newId = String(Math.max(...records.map(r => parseInt(r.id)), 0) + 1);
    
    const newRecord: ArrowRecord = {
      id: newId,
      x: formData.x,
      y: formData.y,
      direction: formData.direction,
      status: formData.status,
      timestamp: Date.now(),
      remark: formData.remark || undefined,
      isManualRemark: !!formData.remark,
    };

    addRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md m-4">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fire-success/20 rounded">
              <Plus size={20} className="text-fire-success" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">补录新记录</h2>
              <p className="text-xs text-slate-400">补录后画布状态将实时更新</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                X 坐标
              </label>
              <input
                type="number"
                value={formData.x}
                onChange={(e) => setFormData({ ...formData, x: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                min="0"
                max="800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Y 坐标
              </label>
              <input
                type="number"
                value={formData.y}
                onChange={(e) => setFormData({ ...formData, y: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                min="0"
                max="500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              方向角度 (0-360°)
            </label>
            <input
              type="range"
              value={formData.direction}
              onChange={(e) => setFormData({ ...formData, direction: parseInt(e.target.value) })}
              className="w-full"
              min="0"
              max="360"
            />
            <div className="text-center text-sm text-slate-400 mt-1">
              {formData.direction}°
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              初始状态
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['normal', 'flipped', 'warning', 'pending'] as RecordStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFormData({ ...formData, status })}
                  className={`px-3 py-1.5 text-sm rounded border transition-all ${
                    formData.status === status
                      ? 'border-transparent text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                  style={{
                    backgroundColor: formData.status === status 
                      ? statusColors[status] 
                      : 'transparent'
                  }}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              备注（可选，将原样保留）
            </label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="输入备注内容..."
              className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 text-slate-200 transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 px-4 rounded border-2 border-fire-success bg-fire-success/20 hover:bg-fire-success/30 text-fire-success transition-all font-medium flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            添加记录
          </button>
        </div>
      </div>
    </div>
  );
};
