import { useEffect, useState } from 'react';
import Scene3D from '@/components/3d/Scene3D';
import AnomalyList from '@/components/AnomalyList';
import AnomalyDetail from '@/components/AnomalyDetail';
import HistoryPage from '@/pages/History';
import { useAppStore } from '@/store/appStore';
import { initializeSampleData } from '@/utils/sampleData';
import { importFile } from '@/utils/dataImport';
import { runAllDetection } from '@/utils/anomalyDetection';
import { Upload, History, Menu, X, Download } from 'lucide-react';
import { useExport } from '@/utils/export';

type View = 'main' | 'history';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('main');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const isFirstVisit = useAppStore((state) => state.isFirstVisit);
  const setFirstVisit = useAppStore((state) => state.setFirstVisit);
  const loadInitialData = useAppStore((state) => state.loadInitialData);
  const importData = useAppStore((state) => state.importData);
  const detectAnomalies = useAppStore((state) => state.detectAnomalies);
  const containers = useAppStore((state) => state.containers);
  const anomalies = useAppStore((state) => state.anomalies);
  const selectedAnomaly = useAppStore((state) => state.selectedAnomaly);

  const { exportAnomalyReport } = useExport();

  useEffect(() => {
    if (isFirstVisit && containers.length === 0) {
      const sampleData = initializeSampleData();
      loadInitialData(sampleData);
      setFirstVisit(false);
    }
  }, [isFirstVisit, containers.length, loadInitialData, setFirstVisit]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');

    try {
      const importedContainers = await importFile(file);
      importData(importedContainers);

      const batchId = importedContainers[0]?.importBatch || `BATCH_${Date.now()}`;
      const detectedAnomalies = runAllDetection(importedContainers, batchId, file.name);
      detectAnomalies(detectedAnomalies);

      setShowImportModal(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  if (currentView === 'history') {
    return <HistoryPage onBack={() => setCurrentView('main')} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-xl font-bold">港口堆场箱位三维图</h1>
            <p className="text-xs text-slate-400">异常检测与追溯管理系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入数据
          </button>

          <button
            onClick={() => exportAnomalyReport()}
            disabled={anomalies.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>

          <button
            onClick={() => setCurrentView('history')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <History className="w-4 h-4" />
            历史追溯
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <div className="w-1/3 min-w-[400px] max-w-[600px] border-r border-slate-200 overflow-hidden">
            <AnomalyList />
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Scene3D />
          </div>

          {selectedAnomaly && (
            <div className="w-1/3 min-w-[400px] max-w-[500px] border-l border-slate-200 overflow-hidden">
              <AnomalyDetail />
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">导入数据</h2>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-4">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 mb-4">支持 .xlsx, .xls, .csv, .json 格式</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={handleFileImport}
                  disabled={isImporting}
                  className="hidden"
                />
                <span className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50">
                  {isImporting ? '导入中...' : '选择文件'}
                </span>
              </label>
            </div>

            {importError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            <div className="text-sm text-slate-600 mb-4">
              <p className="font-semibold mb-2">数据格式要求：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Excel/CSV: 需要包含 name, x, y, z, width, height, depth 字段</li>
                <li>JSON: 数组格式或包含 containers 字段的对象</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError('');
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
