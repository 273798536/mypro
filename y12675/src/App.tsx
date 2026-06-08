import Viewer3D from './components/Viewer3D/Viewer3D';
import Controls from './components/Controls/Controls';
import TimeControl from './components/TimeControl/TimeControl';
import SliceTool from './components/SliceTool/SliceTool';
import MeasurePanel from './components/MeasurePanel/MeasurePanel';
import StatusPanel from './components/StatusPanel/StatusPanel';
import ExportPanel from './components/ExportPanel/ExportPanel';
import ReplayPanel from './components/ReplayPanel/ReplayPanel';
import { useAppStore } from './store/appStore';

export default function App() {
  const { pointCloudData } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              晶体缺陷三维观察
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              运维组专用工具 - 浏览器端演示版
            </p>
          </div>
          {pointCloudData && (
            <div className="text-right">
              <div className="text-xs text-gray-400">当前材料</div>
              <div className="text-sm text-cyan-400 font-medium">
                {pointCloudData.metadata.material}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <aside className="w-96 bg-gray-900 border-r border-gray-800 overflow-y-auto p-4 space-y-4">
          <Controls />
          <TimeControl />
          <SliceTool />
          <MeasurePanel />
          <ReplayPanel />
          <StatusPanel />
          <ExportPanel />
        </aside>

        <main className="flex-1 relative overflow-hidden">
          {pointCloudData ? (
            <Viewer3D />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900">
              <div className="text-center">
                <div className="text-6xl mb-4">🔬</div>
                <h2 className="text-2xl font-bold text-gray-300 mb-2">
                  等待导入数据
                </h2>
                <p className="text-gray-500 mb-6">
                  请在左侧控制面板导入模拟数据或上传JSON文件
                </p>
                <div className="text-xs text-gray-600">
                  <p>支持功能:</p>
                  <p>• 三维点云可视化</p>
                  <p>• 时间回放与碰撞检测</p>
                  <p>• 点云切片与数据清洗</p>
                  <p>• 测量记录与导出</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
