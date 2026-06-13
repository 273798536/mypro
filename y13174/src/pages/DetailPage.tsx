import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedDataSource } from '@/hooks/useUnifiedDataSource';
import FilterPanel from '@/components/filters/FilterPanel';
import DetailTable from '@/components/table/DetailTable';
import EmptyState from '@/components/common/EmptyState';

export default function DetailPage() {
  const navigate = useNavigate();
  const { records, isLoading } = useUnifiedDataSource();
  const [searchText, setSearchText] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchText.trim()) return records;
    return records.filter((r) =>
      r.beamNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [records, searchText]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f2440]">
        <div className="text-[#4a5568] text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2440]">
      <header className="bg-[#1e3a5f] border-b-2 border-[#2d5a8e] px-6 py-4">
        <h1 className="text-white text-xl font-bold tracking-wide">检测明细</h1>
        <p className="text-[#8ba7c7] text-sm mt-1">全部梁体挠度检测记录</p>
      </header>

      <div className="px-6 py-4">
        <FilterPanel />
      </div>

      <div className="px-6 pb-4">
        <div className="relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="按梁号搜索..."
            className="w-full bg-[#1e3a5f] border-2 border-[#2d5a8e] text-white px-4 py-2.5 placeholder-[#4a5568] focus:outline-none focus:border-[#5a9fd4]"
          />
        </div>
      </div>

      <div className="px-6 pb-6">
        {filteredRecords.length === 0 ? (
          <EmptyState message="无匹配记录" />
        ) : (
          <DetailTable
            records={filteredRecords}
            onRowClick={(record) => navigate(`/history/${record.id}`)}
          />
        )}
      </div>
    </div>
  );
}
