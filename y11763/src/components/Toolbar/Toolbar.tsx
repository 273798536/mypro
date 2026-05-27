import { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Camera,
  Upload,
  RotateCcw,
  History,
  Gauge,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useParticleStore } from '../../store/useParticleStore';
import { useMagneticFieldStore } from '../../store/useMagneticFieldStore';
import { captureScreenshot } from '../../utils/screenshot';
import { processImport, readJsonFile, ImportOptions } from '../../utils/importHandler';
import { ImportMode } from '../../types/particle';
import { twMerge } from 'tailwind-merge';

export default function Toolbar() {
  const { isPlaying, togglePlay, timeScale, setTimeScale, toggleTraceHistory, showTraceHistory, addImportResult, setErrors } = useAppStore();
  const { particles, clearParticles, addParticles, modificationRecords } = useParticleStore();
  const { resetField } = useMagneticFieldStore();
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      captureScreenshot(canvas);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readJsonFile(file);
      setShowImportModal(true);
      (window as any).pendingImportData = data;
      (window as any).pendingImportFilename = file.name;
    } catch (err) {
      alert('文件读取失败，请检查JSON格式');
    }
  };

  const handleReset = () => {
    clearParticles();
    resetField();
    useAppStore.getState().resetApp();
  };

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-chamber-900/90 backdrop-blur-md rounded-xl border border-chamber-700/50 px-6 py-3 flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-all hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <div className="h-8 w-px bg-chamber-700" />

          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={timeScale}
              onChange={(e) => setTimeScale(parseFloat(e.target.value))}
              className="w-24 h-2 bg-chamber-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-400 font-jetbrains w-12">
              {timeScale.toFixed(1)}x
            </span>
          </div>

          <div className="h-8 w-px bg-chamber-700" />

          <ToolbarButton icon={Camera} label="截图" onClick={handleScreenshot} />

          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
              <Upload className="w-5 h-5" />
              <span className="text-[10px] font-jetbrains">导入</span>
            </div>
          </label>

          <ToolbarButton icon={RotateCcw} label="重置" onClick={handleReset} />

          <div className="h-8 w-px bg-chamber-700" />

          <button
            onClick={toggleTraceHistory}
            className={twMerge(
              'flex flex-col items-center gap-1 transition-colors',
              showTraceHistory ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            )}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-jetbrains">历史</span>
          </button>

          <div className="h-8 w-px bg-chamber-700" />

          <div className="text-xs text-gray-400 font-jetbrains">
            <span className="text-blue-400">{particles.length}</span> 粒子 ·{' '}
            <span className="text-yellow-400">{modificationRecords.length}</span> 修正
          </div>
        </div>
      </div>

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={(mode) => {
            const data = (window as any).pendingImportData;
            const filename = (window as any).pendingImportFilename;
            const options: ImportOptions = { mode, source: filename };
            const { result, particles: newParticles } = processImport(
              data,
              particles,
              options,
              filename
            );
            clearParticles();
            addParticles(newParticles);
            addImportResult(result);
            setErrors(result.errors);
            setShowImportModal(false);
          }}
        />
      )}
    </>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-jetbrains">{label}</span>
    </button>
  );
}

function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (mode: ImportMode) => void;
}) {
  const [selectedMode, setSelectedMode] = useState<ImportMode>('ignore');

  const modes = [
    {
      id: 'ignore' as ImportMode,
      title: '忽略重复',
      description: '跳过已存在的粒子ID',
    },
    {
      id: 'overwrite' as ImportMode,
      title: '覆盖现有',
      description: '清除所有现有数据',
    },
    {
      id: 'append' as ImportMode,
      title: '追加数据',
      description: '冲突时自动重命名ID',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-chamber-900 rounded-xl border border-chamber-700 w-96 overflow-hidden">
        <div className="px-6 py-4 border-b border-chamber-700">
          <h3 className="font-orbitron text-white text-lg">导入粒子数据</h3>
        </div>

        <div className="p-6 space-y-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={twMerge(
                'w-full p-4 rounded-lg text-left transition-all border',
                selectedMode === mode.id
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-chamber-800/50 border-chamber-700/50 hover:border-chamber-600'
              )}
            >
              <div className="font-jetbrains text-white text-sm">{mode.title}</div>
              <div className="text-xs text-gray-500 mt-1">{mode.description}</div>
            </button>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-chamber-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-chamber-800 text-gray-300 hover:bg-chamber-700 transition-colors font-jetbrains text-sm"
          >
            取消
          </button>
          <button
            onClick={() => onImport(selectedMode)}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-400 transition-colors font-jetbrains text-sm"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}
