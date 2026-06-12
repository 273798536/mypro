import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import SampleSidebar from '@/components/SampleSidebar';
import { SampleCharts, SampleTable, SampleText } from '@/components/SampleColumns';
import AnomalyCards from '@/components/AnomalyCards';
import { BuoyLateBanner, TimezoneAlert } from '@/components/Alerts';

export default function Review() {
  const { samples, currentSample, fetchSamples, fetchSample, setCurrentSample, loading } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleSelect = (id: string) => {
    fetchSample(id);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">
      <SampleSidebar
        samples={samples}
        selectedId={currentSample?.id ?? null}
        filter={filter}
        search={search}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onSelect={handleSelect}
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading.sample && (
          <div className="flex items-center justify-center h-64 text-slate-500">加载样本...</div>
        )}
        {!currentSample && !loading.sample && (
          <div className="flex items-center justify-center h-64 text-slate-600">
            请从左侧选择一个样本进行复核
          </div>
        )}
        {currentSample && (
          <div>
            {currentSample.buoyData?.[0]?.isLate && (
              <BuoyLateBanner affectedConclusions={currentSample.buoyData[0].affectedConclusions ?? []} />
            )}
            {currentSample.tideData?.[0] && !currentSample.tideData[0].timezoneValid && (
              <TimezoneAlert error={currentSample.tideData[0].timezoneError} />
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
                <p className="text-xs font-semibold text-slate-400 mb-2">图 — 数据可视化</p>
                <SampleCharts sample={currentSample} />
              </div>
              <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
                <p className="text-xs font-semibold text-slate-400 mb-2">表 — 数值详情</p>
                <SampleTable sample={currentSample} />
              </div>
              <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
                <p className="text-xs font-semibold text-slate-400 mb-2">文 — 文字描述</p>
                <SampleText sample={currentSample} />
              </div>
            </div>
            <AnomalyCards anomalies={currentSample.anomalies} />
          </div>
        )}
      </div>
    </div>
  );
}
