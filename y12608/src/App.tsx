import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Canvas } from './components/Canvas/Canvas';
import { InfoPanel } from './components/Panel/InfoPanel';
import { ImportModal } from './components/Modal/ImportModal';
import { ExportModal } from './components/Modal/ExportModal';
import { ReviewPanel } from './components/Modal/ReviewPanel';
import { ToastProvider } from './components/common/Toast';
import { useCanvasStore } from './stores/canvasStore';
import { sampleTracks, sampleAnnotations } from './mock/sampleData';
import './index.css';

function App() {
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { tracks, annotations } = useCanvasStore();

  useEffect(() => {
    if (!isLoaded && tracks.length === 0 && annotations.length === 0) {
      useCanvasStore.setState({
        tracks: sampleTracks,
        annotations: sampleAnnotations
      });
      setIsLoaded(true);
    }
  }, [tracks.length, annotations.length, isLoaded]);

  return (
    <ToastProvider>
      <div className="h-screen w-screen flex overflow-hidden bg-slate-100">
        <Toolbar
          onImport={() => setShowImport(true)}
          onExport={() => setShowExport(true)}
          onReview={() => setShowReview(true)}
        />
        
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-800">赛事战术白板回放</h1>
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                教研版
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>画布状态</span>
              <span className="w-2 h-2 rounded-full bg-status-normal"></span>
              <span>在线</span>
            </div>
          </header>
          
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0">
              <Canvas />
            </div>
            <InfoPanel />
          </div>
        </main>
        
        <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
        <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} />
        <ReviewPanel isOpen={showReview} onClose={() => setShowReview(false)} />
      </div>
    </ToastProvider>
  );
}

export default App;
