import { useEffect } from "react";
import { useStore } from "../store";
import FiltersPanel from "../components/FiltersPanel";
import Scene3D from "../components/Scene3D";
import ItemDetailPanel from "../components/ItemDetailPanel";
import TimelineBar from "../components/TimelineBar";

export default function Home() {
  const loadAll = useStore((s) => s.loadAll);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex-1 flex overflow-hidden">
        <FiltersPanel className="w-[260px] shrink-0 border-r border-slate-200" />
        <div className="flex-1 relative bg-[#0B1A2B]">
          <Scene3D />
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-md bg-night-500/80 text-white text-xs">
            点选摊位查看详情 | 鼠标拖拽旋转 | 滚轮缩放
          </div>
        </div>
        <ItemDetailPanel className="w-[400px] shrink-0 border-l border-slate-200 bg-white" />
      </div>
      <TimelineBar className="h-[72px] border-t border-slate-200 shrink-0" />
    </div>
  );
}
