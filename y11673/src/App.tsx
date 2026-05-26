import { useState, useCallback, useRef } from 'react';
import Scene3D, { Scene3DHandle } from './components/Scene3D';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import ExportPanel from './components/ExportPanel';
import { useSimulation } from './hooks/useSimulation';
import { paramRecorder } from './utils/paramRecorder';
import { ParamRecord } from './types';
import { Circle, Info, HelpCircle } from 'lucide-react';

function App() {
  const {
    state,
    updateParams,
    start,
    pause,
    resume,
    reset,
    dismissError,
  } = useSimulation();

  const [records, setRecords] = useState<ParamRecord[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const sceneRef = useRef<Scene3DHandle>(null);

  const handleSaveRecord = useCallback(() => {
    const record = paramRecorder.saveRecord(state.params, state.stats);
    setRecords(paramRecorder.getRecords());
  }, [state.params, state.stats]);

  const handleDeleteRecord = useCallback((id: string) => {
    paramRecorder.deleteRecord(id);
    setRecords(paramRecorder.getRecords());
  }, []);

  const handleResetCamera = useCallback(() => {
    sceneRef.current?.resetCamera();
  }, []);

  return (
    <div className="w-full h-screen bg-space-black flex flex-col overflow-hidden">
      <header className="h-12 bg-space-blue/80 border-b border-gravity-orange/30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Circle className="text-gravity-orange" size={24} />
          <h1 className="text-lg font-display font-bold text-white">
            黑洞光线弯曲演示
          </h1>
          <span className="text-xs text-gray-500 font-mono">v1.0.0</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCamera}
            className="p-2 hover:bg-space-blue rounded transition-colors text-gray-400 hover:text-white"
            title="重置视角"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 rounded transition-colors ${
              showHelp ? 'bg-gravity-orange text-white' : 'text-gray-400 hover:text-white hover:bg-space-blue'
            }`}
            title="使用说明"
          >
            <Info size={18} />
          </button>
        </div>
      </header>

      {showHelp && (
        <div className="absolute top-14 right-4 z-50 w-96 glass-panel rounded-lg p-4 shadow-2xl">
          <h3 className="text-sm font-display font-semibold text-gravity-orange mb-3">
            使用说明
          </h3>
          <div className="text-xs text-gray-400 space-y-2 max-h-80 overflow-y-auto">
            <div>
              <p className="text-ray-cyan mb-1">启动模拟:</p>
              <p>1. 调整左侧参数面板中的物理参数</p>
              <p>2. 点击"开始模拟"按钮启动光线追踪</p>
              <p>3. 观察右侧3D视图中的光线轨迹</p>
            </div>
            <div>
              <p className="text-ray-cyan mb-1">操作说明:</p>
              <p>• 鼠标拖拽: 旋转视角</p>
              <p>• 滚轮: 缩放</p>
              <p>• 双击: 重置视角</p>
              <p>• 暂停按钮: 暂停模拟</p>
              <p>• 重置按钮: 清除所有结果</p>
            </div>
            <div>
              <p className="text-ray-cyan mb-1">参数说明:</p>
              <p>• 黑洞质量: 1-100太阳质量</p>
              <p>• 光线数量: 同时追踪的光线路数</p>
              <p>• 积分步数: 数值积分精度</p>
              <p>• 步长: 每步积分距离</p>
            </div>
            <div>
              <p className="text-warning-yellow mb-1">注意事项:</p>
              <p>• 过高参数可能导致性能下降</p>
              <p>• 光线穿越事件视界会被标记为"已吞噬"</p>
              <p>• 异常情况会在信息面板中提示</p>
            </div>
            <div>
              <p className="text-success-green mb-1">导出功能:</p>
              <p>• 导出截图: PNG格式，含参数水印</p>
              <p>• 导出参数: JSON格式，完整记录</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="mt-3 w-full py-1.5 bg-space-blue hover:bg-space-blue/80 text-gray-300 rounded text-sm transition-colors"
          >
            关闭
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 flex-shrink-0 p-3 overflow-hidden">
          <ControlPanel
            params={state.params}
            status={state.status}
            progress={state.progress}
            onParamsChange={updateParams}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onReset={reset}
          />
        </div>

        <div className="flex-1 p-3 overflow-hidden">
          <Scene3D
            ref={sceneRef}
            params={state.params}
            results={state.results}
            isRunning={state.status === 'running'}
          />
        </div>

        <div className="w-80 flex-shrink-0 p-3 overflow-hidden flex flex-col gap-3">
          <div className="flex-1 overflow-hidden">
            <InfoPanel
              stats={state.stats}
              errors={state.errors}
              params={state.params}
              records={records}
              onDismissError={dismissError}
              onSaveRecord={handleSaveRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          </div>
          <ExportPanel
            params={state.params}
            stats={state.stats}
            errors={state.errors}
            results={state.results}
          />
        </div>
      </div>

      <footer className="h-6 bg-space-blue/60 border-t border-space-blue flex items-center justify-between px-4 text-xs">
        <span className="text-gray-500">
          基于广义相对论施瓦西度规模拟
        </span>
        <span className="text-gray-600">
          WebGL | Three.js | React | TypeScript
        </span>
      </footer>
    </div>
  );
}

export default App;
