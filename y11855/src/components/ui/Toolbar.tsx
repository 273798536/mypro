import { useRef, useState } from 'react';
import {
  Upload,
  Download,
  Play,
  Layers,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Plane,
  FileJson,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSceneLoader } from '../../hooks/useSceneLoader';
import { getIssueSummary } from '../../utils/validation';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentScene = useAppStore(state => state.currentScene);
  const validationIssues = useAppStore(state => state.validationIssues);
  const collisionResults = useAppStore(state => state.collisionResults);
  const isCollisionDetected = useAppStore(state => state.isCollisionDetected);
  const visibleLayers = useAppStore(state => state.visibleLayers);
  const setVisibleLayers = useAppStore(state => state.setVisibleLayers);
  const runCollisionDetection = useAppStore(state => state.runCollisionDetection);
  const setShowValidationModal = useAppStore(state => state.setShowValidationModal);
  const setSelectedElement = useAppStore(state => state.setSelectedElement);

  const { loadSampleSuccess, loadSampleError, loadFromFile, downloadScene } = useSceneLoader();

  const issueSummary = getIssueSummary(validationIssues);
  const hasErrors = issueSummary.errors > 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoadError(null);
      await loadFromFile(file);
    } catch (error: any) {
      setLoadError(error.message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers({ [layer]: !visibleLayers[layer] });
  };

  return (
    <div className="h-12 bg-slate-900/95 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Plane size={18} className="text-blue-400" />
          <h1 className="text-white font-semibold text-sm">机场跑道净空模型</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowDataMenu(!showDataMenu); setShowLayerMenu(false); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-white transition-colors"
          >
            <FileJson size={14} />
            加载数据
          </button>
          
          {showDataMenu && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-600 rounded shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => { loadSampleSuccess(); setShowDataMenu(false); setLoadError(null); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <CheckCircle size={14} className="text-green-500" />
                顺利样例
              </button>
              <button
                onClick={() => { loadSampleError(); setShowDataMenu(false); setLoadError(null); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <AlertTriangle size={14} className="text-orange-500" />
                坐标系错误样例
              </button>
              <div className="border-t border-slate-700 my-1" />
              <button
                onClick={() => { fileInputRef.current?.click(); setShowDataMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Upload size={14} />
                导入JSON文件...
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />

        {currentScene && (
          <>
            <button
              onClick={() => downloadScene(currentScene)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-white transition-colors"
            >
              <Download size={14} />
              导出
            </button>

            <div className="h-6 w-px bg-slate-700 mx-2" />

            <button
              onClick={runCollisionDetection}
              disabled={hasErrors}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs transition-colors ${
                hasErrors
                  ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
              }`}
            >
              <Play size={14} />
              碰撞检测
              {isCollisionDetected && collisionResults.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-600 rounded text-[10px]">
                  {collisionResults.length}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-slate-700 mx-2" />

            <div className="relative">
              <button
                onClick={() => { setShowLayerMenu(!showLayerMenu); setShowDataMenu(false); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-white transition-colors"
              >
                <Layers size={14} />
                图层
              </button>
              
              {showLayerMenu && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-slate-800 border border-slate-600 rounded shadow-xl z-50 overflow-hidden">
                  {[
                    { key: 'runway', label: '跑道' },
                    { key: 'buildings', label: '建筑' },
                    { key: 'surfaces', label: '净空面' },
                    { key: 'grid', label: '网格' }
                  ].map(layer => (
                    <button
                      key={layer.key}
                      onClick={() => toggleLayer(layer.key as keyof typeof visibleLayers)}
                      className="w-full flex items-center justify-between px-4 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <span>{layer.label}</span>
                      {visibleLayers[layer.key as keyof typeof visibleLayers] ? (
                        <Eye size={14} className="text-blue-400" />
                      ) : (
                        <EyeOff size={14} className="text-slate-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {loadError && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} />
            {loadError}
          </span>
        )}

        {currentScene && (
          <>
            <div className="text-xs text-slate-400">
              <span className="text-slate-300">{currentScene.name}</span>
              <span className="mx-2">·</span>
              <span className="font-mono">{currentScene.buildings.length} 建筑</span>
              <span className="mx-2">·</span>
              <span className="font-mono">{currentScene.surfaces.length} 净空面</span>
            </div>

            {validationIssues.length > 0 && (
              <button
                onClick={() => setShowValidationModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
                  hasErrors
                    ? 'bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50'
                    : 'bg-orange-900/30 border-orange-700 text-orange-400 hover:bg-orange-900/50'
                }`}
              >
                {hasErrors ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
                <span className="font-mono">
                  {issueSummary.errors > 0 && `${issueSummary.errors}错误`}
                  {issueSummary.errors > 0 && issueSummary.warnings > 0 && ' / '}
                  {issueSummary.warnings > 0 && `${issueSummary.warnings}警告`}
                </span>
              </button>
            )}

            {isCollisionDetected && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
                collisionResults.length > 0
                  ? 'bg-red-900/30 border-red-700 text-red-400'
                  : 'bg-green-900/30 border-green-700 text-green-400'
              }`}>
                {collisionResults.length > 0 ? (
                  <AlertCircle size={14} />
                ) : (
                  <CheckCircle size={14} />
                )}
                <span>
                  {collisionResults.length > 0
                    ? `${collisionResults.length} 处超高`
                    : '全部合规'
                  }
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {(showDataMenu || showLayerMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowDataMenu(false); setShowLayerMenu(false); }}
        />
      )}
    </div>
  );
}
