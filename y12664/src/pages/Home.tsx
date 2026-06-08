import Toolbar from '@/components/Toolbar';
import Scene3D from '@/components/Scene3D';
import AlertBanner from '@/components/AlertBanner';
import ParameterPanel from '@/components/ParameterPanel';
import DetailTable from '@/components/DetailTable';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { Info } from 'lucide-react';

export default function Home() {
  const issues = useLayoutStore((s) => s.issues);
  const cages = useLayoutStore((s) => s.cages);
  const summary = {
    total: cages.length,
    normal: cages.filter((c) => c.status === 'normal').length,
    pending: cages.filter((c) => c.status === 'pending').length,
    error: cages.filter((c) => c.status === 'error').length,
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {issues.length > 0 && <AlertBanner issues={issues} />}

        <div className="flex-1 flex gap-3 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <Scene3D />
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-xs text-slate-300">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>操作提示：鼠标左键旋转视角，右键平移，滚轮缩放；点击笼位可联动选中明细表对应行；参数或明细修改后三维视图会实时联动更新。</span>
            </div>
          </div>

          <div className="w-[420px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-0.5">
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="总数" value={summary.total} color="text-slate-200" />
              <StatCard label="正常" value={summary.normal} color="text-emerald-400" />
              <StatCard label="待确认" value={summary.pending} color="text-amber-400" />
              <StatCard label="异常" value={summary.error} color="text-red-400" />
            </div>
            <ParameterPanel />
            <DetailTable />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-xl font-semibold font-mono mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
