import { useRef, useState } from 'react';
import { Upload, X, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface MaterialImportPanelProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function MaterialImportPanel({
  onClose,
  compact = false,
}: MaterialImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { importMaterialFile, session, lastError, clearLastError } = useAppStore();
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; layers: number; collisions: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const handleFile = async (file: File) => {
    clearLastError();
    setStatus({ kind: 'idle' });

    if (!file.name.toLowerCase().endsWith('.json')) {
      setStatus({
        kind: 'error',
        message: '仅支持 JSON 格式的材料包文件',
      });
      return;
    }

    try {
      const text = await file.text();
      const result = importMaterialFile(text, file.name, session.operator);
      if (result.success) {
        setStatus({
          kind: 'success',
          layers: result.layersAdded ?? 0,
          collisions: result.collisionsAdded ?? 0,
        });
      } else {
        setStatus({
          kind: 'error',
          message: result.error ?? '导入失败',
        });
      }
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : '读取文件失败',
      });
    }
  };

  const triggerInput = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onInputChange}
        />
        <button
          onClick={triggerInput}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
        >
          <Upload size={12} />
          导入旧材料
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-800/60 rounded border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
          <FileJson size={14} className="text-blue-400" />
          导入旧材料 (JSON)
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onInputChange}
      />

      <button
        onClick={triggerInput}
        className="w-full py-2 px-3 border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-blue-500/5 rounded flex flex-col items-center justify-center gap-1 transition-colors"
      >
        <Upload size={18} className="text-slate-500" />
        <span className="text-xs text-slate-400">点击选择 .json 材料包</span>
      </button>

      {status.kind === 'success' && (
        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded flex items-start gap-1.5">
          <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-400">
            <p className="font-medium">导入成功</p>
            <p className="mt-0.5 text-green-400/80">
              新增图层 {status.layers} 个 · 碰撞 {status.collisions} 处
            </p>
          </div>
        </div>
      )}

      {(status.kind === 'error' || lastError) && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-1.5">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-400">
            {status.kind === 'error' ? status.message : lastError}
          </p>
        </div>
      )}

      <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
        材料包支持图层、碰撞点、检测时段。同一材料包按哈希去重，不会重复导入。
      </p>
    </div>
  );
}
