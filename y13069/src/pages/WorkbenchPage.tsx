import Toolbar from '../components/Toolbar';
import Stage3D from '../components/Stage3D';
import DetailPanel from '../components/DetailPanel';
import Timeline from '../components/Timeline';

export default function WorkbenchPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#07111F]">
      <Toolbar />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative min-w-0">
          <Stage3D />
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
            <div className="px-3 py-2 rounded-lg bg-[#0D1C33]/80 backdrop-blur-sm border border-slate-700/60 text-[10.5px] text-slate-300 max-w-[240px] leading-relaxed pointer-events-auto">
              <p className="text-brass-300 font-medium mb-1">操作提示</p>
              <p>• 左键拖拽：旋转视角</p>
              <p>• 右键拖拽：平移视角</p>
              <p>• 滚轮：缩放</p>
              <p>• 点击吊杆：选中高亮 + 明细联动</p>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-none">
            <div className="px-3 py-2 rounded-lg bg-[#0D1C33]/80 backdrop-blur-sm border border-slate-700/60 text-[10px] pointer-events-auto">
              <p className="text-brass-300 font-medium mb-1 text-[10.5px]">图例</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">已通过</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-300">待审核</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-slate-300">坐标冲突</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                  <span className="text-slate-300">已撤回</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-brass-400 bg-brass-400/20" />
                  <span className="text-slate-300">当前选中</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-[460px] shrink-0 min-h-0">
          <DetailPanel />
        </div>
      </div>

      <Timeline />
    </div>
  );
}
