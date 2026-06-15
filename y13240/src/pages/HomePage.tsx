import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2, Download } from 'lucide-react';
import { useStore } from '@/store';
import ImportArea from '@/components/ImportArea';
import FilterBar from '@/components/FilterBar';
import RecordCard from '@/components/RecordCard';
import HelpGuide from '@/components/HelpGuide';
import DetailPanel from '@/components/DetailPanel';

export default function HomePage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const filteredRecords = useStore((state) => state.getFilteredRecords());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary/5">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Music2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-gray-900">
                  音乐节摊位版本复核
                </h1>
                <p className="text-xs text-gray-500">音频材料管理 · 授权期限追踪</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/export"
                className="btn-secondary text-sm py-2 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出清单
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${
        selectedRecordId ? 'pr-96' : ''
      }`}>
        <HelpGuide />

        <div className="mt-6">
          <ImportArea />
        </div>

        <FilterBar />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Music2 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">暂无复核记录</p>
              <p className="text-sm text-gray-400">拖拽音频文件到上方区域开始导入</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => setSelectedRecordId(record.id)}
              />
            ))
          )}
        </div>
      </main>

      {selectedRecordId && (
        <DetailPanel
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
        />
      )}
    </div>
  );
}
