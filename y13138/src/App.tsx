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
  const activeGroupId = useParamStore((s) => s.activeGroupId);
  const paramRows = useParamStore((s) => s.groups[s.activeGroupId].rows);
  const boundaryThreshold = useParamStore((s) => s.boundaryThreshold);
  const safeCoefficient = useParamStore((s) => s.safeCoefficient);
  const paramVersion = useParamStore((s) => s.paramVersion);
  const selectedNodeId = useChartStore((s) => s.selectedNodeId);

  useEffect(() => {
    recompute(paramRows, boundaryThreshold, safeCoefficient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramVersion, activeGroupId, boundaryThreshold, safeCoefficient]);

  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      const abnormal = nodes.find((n) => n.isAbnormal);
      const target = abnormal || nodes[0];
      if (target) {
        selectNode(target.id);
        buildTraceFromNode(target.id, nodes, paramRows);
      }
    }
  }, [nodes, selectedNodeId, selectNode, buildTraceFromNode, paramRows]);

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
            {nodes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-academic-navy/40 font-serif">
                正在从参数表派生图结构…
              </div>
            ) : (
              <MarkovChart />
            )}
          </div>
          <ComparePanel />
        </main>

        <TracePanel />
      </div>
    </div>
  );
}
