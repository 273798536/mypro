import React, { useEffect } from 'react';
import { TopStatusBar } from '../components/common/TopStatusBar';
import { StatusBoard } from '../components/panels/StatusBoard';
import { ViewSaver } from '../components/panels/ViewSaver';
import { FilterToolbar } from '../components/panels/FilterToolbar';
import { AnomalyPanel } from '../components/panels/AnomalyPanel';
import { MaterialSidebar } from '../components/panels/MaterialSidebar';
import { CorridorMap } from '../components/map/CorridorMap';
import { Timeline } from '../components/timeline/Timeline';
import { CaliberDrawer } from '../components/panels/CaliberDrawer';
import { ExportDialog } from '../components/panels/ExportDialog';
import { useReplayStore } from '../store/replayStore';
import { AlertTriangle, Info } from 'lucide-react';

export const ReplayPage: React.FC = () => {
  const sidebarTab = useReplayStore(s => s.sidebarTab);
  const savedViews = useReplayStore(s => s.savedViews);
  const restoreView = useReplayStore(s => s.restoreView);

  useEffect(() => {
    if (savedViews.length === 1) {
      // 自动还原第一个保存的视图（如果用户刚刚保存过）——不做，保持默认
    }
  }, []);

  return (
    <div id="replay-root" className="h-full w-full flex flex-col bg-aero-bg text-aero-text font-sans select-none">
      <TopStatusBar />

      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* 左栏：筛选 + 视图 + 处理状态  */}
          <aside className="col-span-3 min-w-0 flex flex-col gap-3 overflow-y-auto pr-1">
            <StatusBoard />
            <ViewSaver />
            <FilterToolbar />

            <div className="aero-panel p-3 aero-corner border-l-2 border-aero-warn/70">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-aero-warn mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-aero-warn mb-1">
                    演示数据说明（故意不干净）
                  </div>
                  <ul className="text-[10px] text-aero-muted/80 space-y-1 leading-relaxed list-disc pl-4">
                    <li>附件「雷达扫描图V2」晚到45分钟，填补严重缺段 A</li>
                    <li>缺段 B (12:02-12:08) 无对应材料，为空口无凭</li>
                    <li>3处口径修改：P04纬度、P07高度、飞行计划说明</li>
                    <li>处理状态不均匀：8已处理/3待补/1驳回/4未处理</li>
                  </ul>
                  {savedViews.length > 0 && (
                    <button
                      onClick={() => restoreView(savedViews[0].id)}
                      className="mt-2 w-full aero-btn aero-btn-primary !py-1 !px-2 text-[10px] justify-center"
                    >
                      🎯 还原「{savedViews[0].name}」快速演示
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* 中间：地图 + 时间轴 */}
          <main className="col-span-6 min-w-0 flex flex-col gap-3">
            <div className="flex-1 min-h-0">
              <CorridorMap />
            </div>
            <Timeline />
          </main>

          {/* 右栏：异常 / 材料 */}
          <aside className="col-span-3 min-w-0 flex flex-col gap-3">
            <div className="flex-1 min-h-0">
              {sidebarTab === 'anomalies' ? <AnomalyPanel /> : <MaterialSidebar />}
            </div>
            <div className="aero-panel-inner p-2.5 rounded flex items-start gap-2 border border-aero-line/25">
              <Info size={12} className="text-aero-line mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-[10px] text-aero-muted/80 leading-relaxed">
                <div className="text-aero-text/80 font-semibold mb-0.5">快捷键提示</div>
                单击异常：居中定位并弹出详情<br/>
                双击材料：快速聚焦到地图对应点位<br/>
                顶部「保存视角」：次日一键还原<br/>
                导出PDF：含筛选口径、修改历史、视图JSON
              </div>
            </div>
          </aside>
        </div>
      </div>

      <CaliberDrawer />
      <ExportDialog />
    </div>
  );
};

export default ReplayPage;
