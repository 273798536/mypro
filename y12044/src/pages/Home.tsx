import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, RotateCcw, FileText } from 'lucide-react';
import BaseMap from '../components/game/BaseMap';
import ResourcePanel from '../components/game/ResourcePanel';
import ControlPanel from '../components/game/ControlPanel';
import ConflictModal from '../components/game/ConflictModal';
import SettlementModal from '../components/game/SettlementModal';
import { useGameStore, useCurrentRoundConflicts } from '../store/useGameStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<string | undefined>();
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  const { 
    nodes, 
    showSettlement, 
    lastSettlementData, 
    isGameOver,
    closeSettlement,
    resolveConflict,
    pendingConflicts,
    resetGame,
  } = useGameStore();
  
  const conflicts = useCurrentRoundConflicts();

  useEffect(() => {
    if (conflicts.length > 0 && pendingConflicts.length === 0) {
      setShowConflictModal(true);
    }
  }, [conflicts.length, pendingConflicts.length]);

  const currentConflict = conflicts.find(c => !c.resolved);
  const conflictNode = currentConflict 
    ? nodes.find(n => n.id === currentConflict.nodeId) 
    : null;

  const handleResolveConflict = (conflictId: string, chosenSide: 'ice' | 'recycle') => {
    resolveConflict(conflictId, chosenSide);
    setShowConflictModal(false);
  };

  return (
    <div className="min-h-screen bg-space-900">
      <header className="bg-space-800/80 backdrop-blur-sm border-b border-tech-400/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            <div>
              <h1 className="font-orbitron text-xl font-bold text-tech-400 text-glow">
                火星基地水循环
              </h1>
              <p className="text-xs text-gray-400">科学课堂互动模拟系统</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/review')}
              className="flex items-center gap-2 px-4 py-2 bg-space-700 text-gray-300 rounded-lg hover:bg-space-600 transition-colors text-sm"
            >
              <History size={16} />
              <span>复盘</span>
            </button>
            <button
              onClick={() => navigate('/report')}
              className="flex items-center gap-2 px-4 py-2 bg-space-700 text-gray-300 rounded-lg hover:bg-space-600 transition-colors text-sm"
            >
              <FileText size={16} />
              <span>报告</span>
            </button>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-mars-500/20 text-mars-400 border border-mars-500/30 rounded-lg hover:bg-mars-500/30 transition-colors text-sm"
            >
              <RotateCcw size={16} />
              <span>重置</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 100px)' }}>
          <div className="col-span-8">
            <div className="h-full" style={{ minHeight: '500px' }}>
              <BaseMap 
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
              />
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <ResourcePanel />
            <ControlPanel 
              selectedNode={selectedNode}
              nodes={nodes}
            />
          </div>
        </div>
      </main>

      {showConflictModal && currentConflict && conflictNode && (
        <ConflictModal
          conflict={currentConflict}
          onResolve={handleResolveConflict}
          onClose={() => setShowConflictModal(false)}
          nodeName={conflictNode.name}
          nodeType={conflictNode.type}
        />
      )}

      {showSettlement && lastSettlementData && (
        <SettlementModal
          data={lastSettlementData}
          onClose={closeSettlement}
          isGameOver={isGameOver}
        />
      )}
    </div>
  );
};

export default Home;
