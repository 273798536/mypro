import { useEffect, useRef } from 'react';
import TopBar from '@/components/TopBar';
import ParamPanel from '@/components/ParamPanel';
import MarkovChart from '@/components/MarkovChart';
import TracePanel from '@/components/TracePanel';
import ComparePanel from '@/components/ComparePanel';
import { useChartStore } from '@/store/chartStore';
import { useParamStore } from '@/store/paramStore';
import { useTraceStore } from '@/store/traceStore';

export default function App() {
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const recompute = useChartStore((s) => s.recompute);
  const selectNode = useChartStore((s) => s.selectNode);
  const buildTraceFromNode = useTraceStore((s) => s.buildTraceFromNode);
  const nodes = useChartStore((s) => s.nodes);
  const paramRows = useParamStore((s) => s.groups[s.activeGroupId].rows);
  const selectedNodeId = useChartStore((s) => s.selectedNodeId);

  useEffect(() => {
    recompute(paramRows);
    if (!selectedNodeId) {
      const abnormal = nodes.find((n) => n.isAbnormal);
      if (abnormal) {
        selectNode(abnormal.id);
        buildTraceFromNode(abnormal.id, nodes, paramRows);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramRows]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-academic-paper">
      <TopBar chartAreaRef={chartAreaRef} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <ParamPanel />

        <main
          ref={chartAreaRef}
          className="flex-1 flex flex-col min-w-0 border-x border-academic-navy/10"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <MarkovChart />
          </div>
          <ComparePanel />
        </main>

        <TracePanel />
      </div>
    </div>
  );
}
