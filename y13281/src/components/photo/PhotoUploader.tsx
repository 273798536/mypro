import { useState } from 'react';
import { Upload, Image as ImageIcon, FileText, User, X, Plus, Trash2, Camera, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { MonitorPoint } from '../../types';
import { cn } from '../../lib/utils';

const PRESET_CHANGES = [
  '确认噪声值',
  '更新点位状态',
  '补充现场证据',
  '修正测量数据',
  '添加现场说明',
];

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiMzMzQxNTUiLz48cmVjdCB4PSI4MCIgeT0iMTgwIiB3aWR0aD0iMjQwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iIzMzNDE1NSIvPjx0ZXh0IHg9IjIwMCIgeT0iMjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjQ3NDgiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj7nvJbniYfnvZHniYcvUGxhY2Vob2xkZXI8L3RleHQ+PC9zdmc+';

export function PhotoUploader() {
  const {
    isPhotoUploaderOpen,
    togglePhotoUploader,
    selectedPointId,
    addPhotoRecord,
    monitorPoints,
  } = useAppStore();

  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [recordedBy, setRecordedBy] = useState('现场老师');
  const [changes, setChanges] = useState<string[]>([]);
  const [customChange, setCustomChange] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const selectedPoint = monitorPoints.find((p: MonitorPoint) => p.id === selectedPointId);

  const handleClose = () => {
    togglePhotoUploader(false);
    resetForm();
  };

  const resetForm = () => {
    setImageUrl('');
    setDescription('');
    setRecordedBy('现场老师');
    setChanges([]);
    setCustomChange('');
    setShowAlert(false);
  };

  const handleAddPresetChange = (item: string) => {
    if (!changes.includes(item)) {
      setChanges([...changes, item]);
    }
  };

  const handleRemoveChange = (item: string) => {
    setChanges(changes.filter((c) => c !== item));
  };

  const handleAddCustomChange = () => {
    const trimmed = customChange.trim();
    if (trimmed && !changes.includes(trimmed)) {
      setChanges([...changes, trimmed]);
      setCustomChange('');
    }
  };

  const handleSubmit = () => {
    if (!selectedPointId) {
      setShowAlert(true);
      return;
    }

    addPhotoRecord({
      monitorPointId: selectedPointId,
      imageUrl: imageUrl || PLACEHOLDER_IMAGE,
      description,
      recordedBy,
      changes,
    });

    resetForm();
  };

  if (!isPhotoUploaderOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">照片补录</h2>
              <p className="text-xs text-slate-400">上传现场照片并记录变更</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {showAlert && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-300">请先选择监测点</div>
                <div className="text-xs text-amber-400/70 mt-0.5">在左侧列表中点击选择一个监测点后再进行上传</div>
              </div>
            </div>
          )}

          {selectedPoint && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <div>
                <div className="text-xs text-cyan-400">当前选中监测点</div>
                <div className="text-sm font-medium text-cyan-300">{selectedPoint.name}</div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              图片预览
            </label>
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
              <img
                src={imageUrl || PLACEHOLDER_IMAGE}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              {!imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <Upload className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">在下方输入图片URL</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Upload className="w-4 h-4 text-slate-400" />
              图片URL
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              补录说明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入现场情况说明..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm resize-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <User className="w-4 h-4 text-slate-400" />
              记录人
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              变更内容
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_CHANGES.map((item) => {
                const isSelected = changes.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() =>
                      isSelected ? handleRemoveChange(item) : handleAddPresetChange(item)
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={customChange}
                onChange={(e) => setCustomChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomChange();
                  }
                }}
                placeholder="添加自定义变更项..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
              />
              <button
                onClick={handleAddCustomChange}
                className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {changes.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                {changes.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveChange(item)}
                      className="text-emerald-400/70 hover:text-emerald-300 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 sticky bottom-0 bg-slate-900/95 backdrop-blur">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
              selectedPointId
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/25'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            )}
            disabled={!selectedPointId}
          >
            <Upload className="w-4 h-4" />
            提交记录
          </button>
        </div>
      </div>
    </div>
  );
}
