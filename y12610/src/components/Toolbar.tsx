import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Trash2,
  Copy,
  Save,
  Home,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '@/store';
import { RecordStatus, STATUS_LABELS } from '@/types';

interface ToolbarProps {
  onExportPNG: () => void;
  onExportJSON: () => void;
}

export default function Toolbar({ onExportPNG, onExportJSON }: ToolbarProps) {
  const scale = useStore((state) => state.scale);
  const setScale = useStore((state) => state.setScale);
  const resetView = useStore((state) => state.resetView);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const canUndo = useStore((state) => state.canUndo());
  const canRedo = useStore((state) => state.canRedo());
  const currentRecord = useStore((state) => state.getCurrentRecord());
  const selectedElementId = useStore((state) => state.selectedElementId);
  const deleteElement = useStore((state) => state.deleteElement);
  const duplicateElement = useStore((state) => state.duplicateElement);
  const updateRecord = useStore((state) => state.updateRecord);
  const saveRecords = useStore((state) => state.saveRecords);

  const handleZoomIn = () => setScale(scale + 0.1);
  const handleZoomOut = () => setScale(scale - 0.1);

  const handleStatusChange = (status: RecordStatus) => {
    if (currentRecord) {
      updateRecord(currentRecord.id, { status });
    }
  };

  const handleSave = () => {
    saveRecords();
  };

  const statusOptions: { value: RecordStatus; label: string; color: string; icon: React.ReactNode }[] = [
    { value: 'valid', label: STATUS_LABELS.valid, color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
    { value: 'pending', label: STATUS_LABELS.pending, color: 'bg-yellow-500', icon: <Clock className="w-4 h-4" /> },
    { value: 'invalid', label: STATUS_LABELS.invalid, color: 'bg-red-500', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-2">
      <a
        href="/"
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        title="返回列表"
      >
        <Home className="w-5 h-5" />
      </a>

      <div className="h-6 w-px bg-slate-200 mx-2" />

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5 text-slate-600" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-2" />

      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-white transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4 text-slate-600" />
        </button>
        <span className="w-16 text-center text-sm font-medium text-slate-700">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-white transition-colors"
          title="放大"
        >
          <ZoomIn className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded hover:bg-white transition-colors ml-1"
          title="重置视图"
        >
          <Maximize2 className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-2" />

      {selectedElementId && (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={() => duplicateElement(selectedElementId)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="复制元素"
            >
              <Copy className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => deleteElement(selectedElementId)}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
              title="删除元素 (Delete)"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2" />
        </>
      )}

      <div className="flex-1" />

      {currentRecord && (
        <div className="flex items-center gap-2 mr-4">
          <span className="text-sm text-slate-500">状态：</span>
          <div className="flex gap-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentRecord.status === option.value
                    ? `${option.color} text-white shadow-md`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={onExportPNG}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          title="导出PNG"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm font-medium">PNG</span>
        </button>
        <button
          onClick={onExportJSON}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          title="导出JSON"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm font-medium">JSON</span>
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          title="保存"
        >
          <Save className="w-5 h-5" />
          <span className="text-sm font-medium">保存</span>
        </button>
      </div>
    </div>
  );
}
