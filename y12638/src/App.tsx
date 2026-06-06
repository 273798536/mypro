import { useAppState } from './useAppState';
import BatchList from './components/BatchList';
import HitDetection from './components/HitDetection';
import LayerManagement from './components/LayerManagement';
import ErrorDisplay from './components/ErrorDisplay';
import Summary from './components/Summary';

function App() {
  const appState = useAppState();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">班级座次冲突调整</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ErrorDisplay errors={appState.errors} onDismiss={() => appState.setErrors([])} />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <BatchList 
              batches={appState.batches} 
              currentBatchId={appState.currentBatchId}
              onSelectBatch={appState.setCurrentBatchId}
              onImportBatch={appState.importBatch}
              onParseAndImport={appState.parseAndImport}
              onSetErrors={appState.setErrors}
            />
          </div>
          
          <div className="lg:col-span-3 space-y-6">
            {appState.currentBatchData && (
              <Summary 
                batchData={appState.currentBatchData}
                onDownload={() => appState.downloadReport(appState.currentBatchId!)}
              />
            )}
            
            <div className="bg-white rounded-lg shadow">
              <div className="border-b">
                <nav className="flex space-x-8 px-4" aria-label="Tabs">
                  <button
                    onClick={() => appState.setActiveTab('命中检测')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      appState.activeTab === '命中检测'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    命中检测
                  </button>
                  <button
                    onClick={() => appState.setActiveTab('图层管理')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      appState.activeTab === '图层管理'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    图层管理
                  </button>
                </nav>
              </div>
              
              <div className="p-6">
                {appState.activeTab === '命中检测' ? (
                  <HitDetection 
                    batchData={appState.currentBatchData}
                    onUpdateConflict={appState.updateConflictStatus}
                  />
                ) : (
                  <LayerManagement 
                    batchData={appState.currentBatchData}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
