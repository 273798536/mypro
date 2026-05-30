import { useEffect } from 'react';
import { Toolbar } from './components/common/Toolbar';
import { ThreeDView } from './components/ThreeDView/ThreeDView';
import { ParameterPanel } from './components/Sidebar/ParameterPanel';
import { RecordList } from './components/Records/RecordList';
import { useViewStore } from './store/useViewStore';
import { useParamStore } from './store/useParamStore';
import { useRecordStore } from './store/useRecordStore';
import { generateSampleRecords } from './data/samples';

function App() {
  const { leftPanelOpen, rightPanelOpen } = useViewStore();
  const validateAndCalculate = useParamStore((state) => state.validateAndCalculate);
  const loadFromStorage = useRecordStore((state) => state.loadFromStorage);
  const records = useRecordStore((state) => state.records);

  useEffect(() => {
    validateAndCalculate();
    loadFromStorage();

    if (records.length === 0) {
      const samples = generateSampleRecords();
      localStorage.setItem('rotation_solid_records', JSON.stringify(samples));
      loadFromStorage();
    }
  }, [validateAndCalculate, loadFromStorage, records.length]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden relative">
        <aside
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            leftPanelOpen ? 'w-80 flex-shrink-0' : 'w-0'
          }`}
        >
          {leftPanelOpen && (
            <div className="w-80 h-full">
              <ParameterPanel />
            </div>
          )}
        </aside>

        <main className="flex-1 relative min-w-0">
          <div className="absolute inset-0">
            <ThreeDView />
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md rounded-lg px-3 py-2 text-xs text-slate-400 pointer-events-auto border border-slate-700/50">
              <span className="text-slate-500">操作提示：</span>
              左键旋转 · 滚轮缩放 · 右键平移 · 双击重置
            </div>
            <div className="bg-slate-900/80 backdrop-blur-md rounded-lg px-3 py-2 text-xs pointer-events-auto border border-slate-700/50">
              <span className="text-red-400">●</span>
              <span className="text-green-400 ml-2">●</span>
              <span className="text-blue-400 ml-2">●</span>
              <span className="text-slate-500 ml-2">X Y Z 轴</span>
            </div>
          </div>
        </main>

        <aside
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            rightPanelOpen ? 'w-80 flex-shrink-0' : 'w-0'
          }`}
        >
          {rightPanelOpen && (
            <div className="w-80 h-full">
              <RecordList />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
