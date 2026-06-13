import { useState } from 'react';
import { Mountain, Info } from 'lucide-react';
import Scene3D from './components/Scene3D';
import TimelineBar from './components/TimelineBar';
import ViewPanel from './components/ViewPanel';
import CommentPanel from './components/CommentPanel';
import ReviewDashboard from './components/ReviewDashboard';
import OptionDetail from './components/OptionDetail';

export default function App() {
  const [lastCameraPos, setLastCameraPos] = useState<[number, number, number]>([18, 16, 22]);
  const [lastCameraTarget, setLastCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [rightTab, setRightTab] = useState<'detail' | 'review'>('review');

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
          <Mountain size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-800">山地索道站方案比选</h1>
          <p className="text-xs text-slate-500">
            三方案（A东坡 / B山脊 / C西坡）比选 · 评审批注复核系统
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <Info size={13} />
          运维提示：所有视角、批注均本地持久化，次日可直接还原
        </div>
      </header>

      <TimelineBar />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="text-xs font-medium text-slate-600 mb-2">
              操作说明
            </div>
            <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed">
              <li>• 鼠标左键旋转场景，右键平移，滚轮缩放</li>
              <li>• 点击3D方案建筑可选中并高亮</li>
              <li>• 悬停批注条目时3D对应站位会联动高亮</li>
              <li>• 时间轴点击阶段可联动筛选批注</li>
              <li>• 楼层/单位混写会自动拦截并要求人工确认</li>
            </ul>
          </div>
          <div className="p-3 flex-1 overflow-hidden flex flex-col gap-3">
            <ViewPanel
              lastCameraPos={lastCameraPos}
              lastCameraTarget={lastCameraTarget}
            />
          </div>
          <div className="h-[55%] overflow-hidden border-t border-slate-200">
            <CommentPanel />
          </div>
        </aside>

        <main className="flex-1 relative">
          <Scene3D
            onCameraSnapshot={(pos, target) => {
              setLastCameraPos(pos);
              setLastCameraTarget(target);
            }}
          />
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-station-a" /> A东坡
            <span className="w-2 h-2 rounded-full bg-station-b ml-2" /> B山脊
            <span className="w-2 h-2 rounded-full bg-station-c ml-2" /> C西坡
          </div>
        </main>

        <aside className="w-96 border-l border-slate-200 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex border-b border-slate-200 bg-white">
            <button
              onClick={() => setRightTab('detail')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                rightTab === 'detail'
                  ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/40'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              方案详情
            </button>
            <button
              onClick={() => setRightTab('review')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                rightTab === 'review'
                  ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/40'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              复核视图 / CSV
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-3">
            {rightTab === 'detail' ? <OptionDetail /> : <ReviewDashboard />}
          </div>
        </aside>
      </div>
    </div>
  );
}
