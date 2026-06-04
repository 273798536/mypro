import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ScoreTable from './components/ScoreTable';
import AnomalyPanel from './components/AnomalyPanel';
import LayerPanel from './components/LayerPanel';
import GridCanvas from './components/GridCanvas';
import DetailModal from './components/DetailModal';
import { useApp } from './context/AppContext';

function AppContent() {
  const { selectedRecordId, selectedAnomalyId, setSelectedRecordId, setSelectedAnomalyId } = useApp();
  const [activeTab, setActiveTab] = useState<'table' | 'canvas'>('table');
  const [showDetail, setShowDetail] = useState(false);

  const handleRecordClick = (id: string) => {
    setSelectedRecordId(id);
    setSelectedAnomalyId(null);
    setShowDetail(true);
  };

  const handleAnomalyClick = (id: string) => {
    setSelectedAnomalyId(id);
    setShowDetail(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b px-4 py-2 flex items-center gap-4">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              评分表
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'canvas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              标注画布
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {activeTab === 'table' ? (
                <ScoreTable onRecordClick={handleRecordClick} />
              ) : (
                <GridCanvas />
              )}
            </div>

            <div className="w-80 border-l bg-white flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-800">异常记录</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <AnomalyPanel onAnomalyClick={handleAnomalyClick} />
                </div>
              </div>
              
              <div className="h-64 border-t flex flex-col">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-800">图层管理</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <LayerPanel />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showDetail && (
        <DetailModal
          recordId={selectedRecordId}
          anomalyId={selectedAnomalyId}
          onClose={() => {
            setShowDetail(false);
            setSelectedRecordId(null);
            setSelectedAnomalyId(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
