import { Suspense, lazy } from 'react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import CameraControlPanel from '../components/CameraControlPanel';
import ParamDashboard from '../components/ParamDashboard';
import SceneExplanation from '../components/SceneExplanation';

const VoxelScene = lazy(() => import('../components/VoxelScene'));

export default function DemoPage() {
  const isSimulating = useAppStore((s) => s.isSimulating);
  const toggleSimulation = useAppStore((s) => s.toggleSimulation);
  const currentRun = useAppStore((s) => s.currentRun);
  const exceptions = useAppStore((s) => s.exceptions);

  const pendingExceptions = exceptions.filter((e) => e.status !== 'resolved');

  return (
    <div className="relative w-full h-full">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-sand-200">
            正在加载三维体素渲染场景...
          </div>
        }
      >
        <VoxelScene />
      </Suspense>

      <CameraControlPanel />
      <ParamDashboard />
      <SceneExplanation />

      {/* 顶部操作栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button
          onClick={toggleSimulation}
          className={`btn ${
            isSimulating ? 'bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'
          }`}
        >
          {isSimulating ? '⏹ 停止模拟' : '▶ 启动风蚀模拟'}
        </button>
        {currentRun && (
          <div className="card bg-white/90 text-sm">
            <span className="text-sand-600">运行中：</span>
            <span className="font-mono text-sand-800 font-medium">
              #{currentRun.id.substring(0, 8)}
            </span>
          </div>
        )}
        {pendingExceptions.length > 0 && (
          <Link
            to="/monitor"
            className="card bg-red-50 border border-red-200 text-sm flex items-center gap-2 hover:bg-red-100 transition"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-700 font-medium">
              {pendingExceptions.length} 条待处理异常
            </span>
            <span className="text-red-500 text-xs">→ 查看详情</span>
          </Link>
        )}
      </div>
    </div>
  );
}
