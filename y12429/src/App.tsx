import { useState } from 'react';
import { useCollectionStore } from './store/collectionStore';
import { FilterPanel } from './components/FilterPanel';
import { CollectionTable } from './components/CollectionTable';
import { DetailModal } from './components/DetailModal';
import { ExportPanel } from './components/ExportPanel';
import { formatCurrency } from './utils/format';
import type { CollectionRecord } from './types';

function App() {
  const { collectionRecords, getFilteredRecords } = useCollectionStore();
  const [selectedRecord, setSelectedRecord] = useState<CollectionRecord | null>(null);

  const filteredRecords = getFilteredRecords();
  const totalPlanned = filteredRecords.reduce((sum, r) => sum + r.plannedAmount, 0);
  const totalActual = filteredRecords.reduce((sum, r) => sum + r.actualAmount, 0);
  const totalDifference = totalActual - totalPlanned;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                专利许可里程碑收款管理
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                管理专利许可合同的里程碑收款、核验记录和证据追溯
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">当前用户</div>
                <div className="font-medium text-gray-900">财务-李主管</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">总记录数</div>
            <div className="text-3xl font-bold text-gray-900">
              {collectionRecords.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">计划收款总额</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalPlanned)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">实际收款总额</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalActual)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">差异总额</div>
            <div
              className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {totalDifference > 0 ? '+' : ''}
              {formatCurrency(totalDifference)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm text-gray-600">
                证据缺失:{' '}
                <span className="font-medium text-orange-600">
                  {filteredRecords.filter((r) => r.hasEvidenceMissing).length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-600">
                销售补报:{' '}
                <span className="font-medium text-purple-600">
                  {filteredRecords.filter((r) => r.hasSalesSupplement).length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-600">
                开票冲红:{' '}
                <span className="font-medium text-gray-600">
                  {filteredRecords.filter((r) => r.hasInvoiceReversed).length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">
                待处理:{' '}
                <span className="font-medium text-yellow-600">
                  {filteredRecords.filter((r) => r.status === 'pending').length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">
                已完成:{' '}
                <span className="font-medium text-green-600">
                  {
                    filteredRecords.filter((r) => r.status === 'completed')
                      .length
                  }
                </span>
              </span>
            </div>
          </div>
        </div>

        <FilterPanel />
        <ExportPanel />

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">收款记录列表</h2>
            <span className="text-sm text-gray-500">
              显示 {filteredRecords.length} 条记录
            </span>
          </div>
        </div>

        <CollectionTable onViewDetail={setSelectedRecord} />

        {selectedRecord && (
          <DetailModal
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-500">
            专利许可里程碑收款管理系统 v1.0 | 数据实时同步，所有操作均有迹可循
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
