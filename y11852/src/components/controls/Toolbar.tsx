import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { useDataStore } from '@/store/useDataStore';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAcousticCalc } from '@/hooks/useAcousticCalc';
import { getIssueTypeName } from '@/engine/acoustics';
import {
  Upload,
  PlayCircle,
  RotateCcw,
  Grid3X3,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  View,
  Box,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Settings2,
} from 'lucide-react';

export const Toolbar = () => {
  const {
    hallModel,
    soundSources,
    seats,
    soundRays,
    importHistory,
    validationResult,
    isCalculating,
    calculationProgress,
  } = useDataStore();

  const {
    showGrid,
    showWireframe,
    showRays,
    showSeats,
    showHall,
    showSources,
    hallOpacity,
    rayOpacity,
    setShowGrid,
    setShowWireframe,
    setShowRays,
    setShowSeats,
    setShowHall,
    setShowSources,
    setHallOpacity,
    setRayOpacity,
    setViewPreset,
    toggleCameraOrtho,
    resetView,
  } = useSceneStore();

  const {
    loadSampleData,
    runRayTracing,
    importHallModel,
    importSoundSources,
    importSeatsData,
  } = useAcousticCalc();

  const hallInputRef = useRef<HTMLInputElement>(null);
  const sourcesInputRef = useRef<HTMLInputElement>(null);
  const seatsInputRef = useRef<HTMLInputElement>(null);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);

  const handleHallImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importHallModel(file);
    }
  };

  const handleSourcesImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importSoundSources(file);
    }
  };

  const handleSeatsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importSeatsData(file);
    }
  };

  const viewPresets = [
    { key: 'perspective', label: '透视图', icon: View },
    { key: 'top', label: '俯视图', icon: Grid3X3 },
    { key: 'front', label: '正视图', icon: Box },
    { key: 'side', label: '侧视图', icon: Layers },
  ];

  const displayItems = [
    { key: 'hall', label: '厅堂模型', value: showHall, setter: setShowHall, icon: Box },
    { key: 'seats', label: '座位区', value: showSeats, setter: setShowSeats, icon: Grid3X3 },
    { key: 'rays', label: '声线', value: showRays, setter: setShowRays, icon: Volume2 },
    { key: 'sources', label: '声源', value: showSources, setter: setShowSources, icon: Volume2 },
    { key: 'grid', label: '网格', value: showGrid, setter: setShowGrid, icon: Grid3X3 },
    { key: 'wireframe', label: '线框', value: showWireframe, setter: setShowWireframe, icon: Box },
  ];

  const canCalculate = hallModel && soundSources.length > 0 && seats.length > 0;

  return (
    <div className="h-14 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 pr-3 border-r border-zinc-800">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Volume2 size={14} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 leading-none">声场可视化</div>
              <div className="text-[10px] text-zinc-500 leading-none">音乐厅声场分析系统</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-1">
            <input
              ref={hallInputRef}
              type="file"
              accept=".json,.glb,.obj"
              className="hidden"
              onChange={handleHallImport}
            />
            <input
              ref={sourcesInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleSourcesImport}
            />
            <input
              ref={seatsInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleSeatsImport}
            />

            <Button
              size="sm"
              variant="secondary"
              onClick={() => hallInputRef.current?.click()}
              disabled={isCalculating}
            >
              <Upload size={14} />
              导入模型
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => sourcesInputRef.current?.click()}
              disabled={isCalculating}
            >
              <Upload size={14} />
              导入声源
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => seatsInputRef.current?.click()}
              disabled={isCalculating}
            >
              <Upload size={14} />
              导入座位
            </Button>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800 mx-1" />

        <Button
          size="sm"
          variant="secondary"
          onClick={loadSampleData}
          disabled={isCalculating}
          isLoading={isCalculating && calculationProgress < 100}
        >
          <Download size={14} />
          加载样例
        </Button>

        <Button
          size="sm"
          variant="primary"
          onClick={runRayTracing}
          disabled={!canCalculate || isCalculating}
          isLoading={isCalculating && calculationProgress >= 10 && calculationProgress < 100}
          className="relative overflow-hidden"
        >
          {isCalculating && calculationProgress > 0 && calculationProgress < 100 && (
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-white/30 transition-all"
              style={{ width: `${calculationProgress}%` }}
            />
          )}
          <PlayCircle size={14} />
          开始计算
        </Button>

        <Button size="sm" variant="ghost" onClick={resetView}>
          <Maximize2 size={14} />
          重置视角
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {importHistory.length > 0 && (
          <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg px-2 py-1">
            <Clock size={12} className="text-zinc-500 mr-1" />
            {importHistory.map((meta, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1"
              >
                <Badge
                  size="sm"
                  variant={idx === 0 ? 'info' : idx === 1 ? 'success' : 'warning'}
                >
                  #{meta.batch}
                </Badge>
                <span className="text-[10px] text-zinc-400 max-w-[80px] truncate">
                  {meta.fileName}
                </span>
                {idx < importHistory.length - 1 && (
                  <div className="w-px h-3 bg-zinc-700 mx-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {validationResult && (
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
              validationResult.isValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            {validationResult.isValid ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            <span className="text-xs font-medium">
              {validationResult.isValid
                ? '数据完整'
                : `${validationResult.issues.length} 个问题`}
            </span>
          </div>

          {!validationResult.isValid && (
            <div className="flex gap-1 max-w-[200px] overflow-hidden">
              {validationResult.issues.slice(0, 2).map((issue, idx) => (
                <Badge
                  key={idx}
                  size="sm"
                  variant={issue.type === 'seat_occluded' ? 'danger' : 'warning'}
                  className="truncate"
                >
                  {getIssueTypeName(issue.type)}
                </Badge>
              ))}
              {validationResult.issues.length > 2 && (
                <Badge size="sm">+{validationResult.issues.length - 2}</Badge>
              )}
            </div>
          )}
        </div>
      )}

        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowViewMenu(!showViewMenu);
              setShowDisplayMenu(false);
            }}
          >
            <View size={14} />
            视图
          </Button>
          {showViewMenu && (
            <Panel className="absolute right-0 top-full mt-1 w-48 z-50">
              <div className="p-1">
                {viewPresets.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setViewPreset(key as any);
                      setShowViewMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded-md hover:text-white transition-colors"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
                <div className="border-t border-zinc-800 my-1" />
                <button
                  onClick={toggleCameraOrtho}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded-md hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 size={14} />
                    正交视图
                  </span>
                </button>
              </div>
            </Panel>
          )}
        </div>

      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setShowDisplayMenu(!showDisplayMenu);
            setShowViewMenu(false);
          }}
        >
          <Eye size={14} />
          显示
        </Button>
        {showDisplayMenu && (
          <Panel className="absolute right-0 top-full mt-1 w-64 z-50">
            <div className="p-2 space-y-1">
              {displayItems.map(({ key, label, value, setter, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setter(!value)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 rounded-md hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {value ? (
                      <Eye size={14} className="text-blue-400" />
                    ) : (
                      <EyeOff size={14} className="text-zinc-600" />
                    )}
                    {label}
                  </span>
                  <div
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      value ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                        value ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </div>
                </button>
              ))}
              <div className="border-t border-zinc-800 my-2" />
              <div className="px-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">厅堂透明度</span>
                  <span className="font-mono text-zinc-300">
                    {Math.round(hallOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={hallOpacity}
                  onChange={(e) => setHallOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="px-2 space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">声线透明度</span>
                  <span className="font-mono text-zinc-300">
                    {Math.round(rayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={rayOpacity}
                  onChange={(e) => setRayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};
