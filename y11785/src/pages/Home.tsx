import { useEffect } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { NetworkGraph } from '../components/NetworkGraph';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { ImportModal } from '../components/ImportModal';
import { HistoryPanel } from '../components/HistoryPanel';
import { NetworkNode, NetworkEdge, DemandPoint } from '../types';

const sampleNodes: NetworkNode[] = [
  { id: 'source1', name: '供应仓A', type: 'source', x: -300, y: -100 },
  { id: 'source2', name: '供应仓B', type: 'source', x: -300, y: 100 },
  { id: 'wh1', name: '中心仓1', type: 'warehouse', x: -100, y: -150 },
  { id: 'wh2', name: '中心仓2', type: 'warehouse', x: -100, y: 0 },
  { id: 'wh3', name: '中心仓3', type: 'warehouse', x: -100, y: 150 },
  { id: 'trans1', name: '中转站1', type: 'transit', x: 100, y: -75 },
  { id: 'trans2', name: '中转站2', type: 'transit', x: 100, y: 75 },
  { id: 'dest1', name: '配送点A', type: 'destination', x: 300, y: -100 },
  { id: 'dest2', name: '配送点B', type: 'destination', x: 300, y: 100 },
];

const sampleEdges: NetworkEdge[] = [
  { id: 'e1', from: 'source1', to: 'wh1', capacity: 100 },
  { id: 'e2', from: 'source1', to: 'wh2', capacity: 80 },
  { id: 'e3', from: 'source2', to: 'wh2', capacity: 60 },
  { id: 'e4', from: 'source2', to: 'wh3', capacity: 90 },
  { id: 'e5', from: 'wh1', to: 'trans1', capacity: 50 },
  { id: 'e6', from: 'wh2', to: 'trans1', capacity: 70 },
  { id: 'e7', from: 'wh2', to: 'trans2', capacity: 40 },
  { id: 'e8', from: 'wh3', to: 'trans2', capacity: 60 },
  { id: 'e9', from: 'trans1', to: 'dest1', capacity: 80 },
  { id: 'e10', from: 'trans1', to: 'dest2', capacity: 30 },
  { id: 'e11', from: 'trans2', to: 'dest1', capacity: 40 },
  { id: 'e12', from: 'trans2', to: 'dest2', capacity: 70 },
];

const sampleDemands: DemandPoint[] = [
  { id: 'd1', nodeId: 'source1', amount: 150, type: 'supply' },
  { id: 'd2', nodeId: 'source2', amount: 120, type: 'supply' },
  { id: 'd3', nodeId: 'dest1', amount: 100, type: 'demand' },
  { id: 'd4', nodeId: 'dest2', amount: 80, type: 'demand' },
];

export default function Home() {
  const {
    currentScenario,
    showImportModal,
    showHistoryPanel,
    setShowImportModal,
    setShowHistoryPanel,
    importData
  } = useNetworkStore();

  useEffect(() => {
    if (currentScenario.nodes.length === 0) {
      importData(
        { nodes: sampleNodes, edges: sampleEdges, demands: sampleDemands },
        'overwrite',
        '示例数据'
      );
    }
  }, []);

  const bottleneckIds = new Set(
    currentScenario.lastAnalysis?.bottlenecks.map(b => b.edgeId) || []
  );

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden">
            <NetworkGraph
              nodes={currentScenario.nodes}
              edges={currentScenario.edges}
              edgeFlows={currentScenario.lastAnalysis?.edgeFlows}
              bottleneckIds={bottleneckIds}
            />
          </div>
          
          <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-4 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>节点: {currentScenario.nodes.length}</span>
              <span>线路: {currentScenario.edges.length}</span>
              <span>供需点: {currentScenario.demands.length}</span>
            </div>
            <div>
              {currentScenario.lastAnalysis ? (
                <span>最后分析: {new Date(currentScenario.lastAnalysis.timestamp).toLocaleTimeString()}</span>
              ) : (
                <span>未运行分析</span>
              )}
            </div>
          </footer>
        </main>
        
        <AnalysisPanel />
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
      
      <HistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
      />
    </div>
  );
}
