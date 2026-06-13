import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedDataSource } from '@/hooks/useUnifiedDataSource';
import { useDeflectionStore } from '@/store/useDeflectionStore';
import StatusBadge from '@/components/common/StatusBadge';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import EmptyState from '@/components/common/EmptyState';
import type { RecordStatus } from '@/types';

type TabKey = 'NOISE_SUSPECTED' | 'EXTREME_VALUE' | 'PENDING_CONFIRM' | 'CONFIRMED_REJECT';

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: 'NOISE_SUSPECTED', label: '疑似噪声', color: '#d69e2e' },
  { key: 'EXTREME_VALUE', label: '极端值', color: '#c53030' },
  { key: 'PENDING_CONFIRM', label: '待人工确认', color: '#4a5568' },
  { key: 'CONFIRMED_REJECT', label: '确认驳回', color: '#c53030' },
];

export default function ExceptionPage() {
  const navigate = useNavigate();
  const { records, isLoading } = useUnifiedDataSource();
  const confirmRecord = useDeflectionStore((s) => s.confirmRecord);

  const [activeTab, setActiveTab] = useState<TabKey>('NOISE_SUSPECTED');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredRecords = useMemo(
    () => records.filter((r) => r.status === activeTab),
    [records, activeTab]
  );

  const pendingRecords = useMemo(
    () => records.filter((r) => r.status === 'PENDING_CONFIRM'),
    [records]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchConfirm = () => {
    selectedIds.forEach((id) => {
      confirmRecord(id, 'CONFIRMED_PASS', '批量确认通过', '系统批量操作');
    });
    setSelectedIds(new Set());
    setBatchMode(false);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold tracking-wide">异常分类</h1>
            <p className="text-[#8ba7c7] text-sm mt-1">按类型查看异常记录</p>
          </div>
          {activeTab === 'PENDING_CONFIRM' && pendingRecords.length > 0 && (
            <button
              onClick={() => setBatchMode(!batchMode)}
              className={`px-4 py-2 border-2 text-sm font-semibold transition-colors ${
                batchMode
                  ? 'bg-[#5a67d8] border-[#6b76e8] text-white'
                  : 'bg-[#1e3a5f] border-[#2d5a8e] text-[#8ba7c7] hover:text-white'
              }`}
            >
              {batchMode ? '取消批量' : '批量确认'}
            </button>
          )}
        </div>
      </header>

      <div className="px-6 pt-4">
        <div className="flex border-b-2 border-[#2d5a8e]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedIds(new Set());
                setBatchMode(false);
              }}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-[#4a5568] hover:text-[#8ba7c7]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: tab.color }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        {filteredRecords.length === 0 ? (
          <EmptyState message={`暂无${TABS.find((t) => t.key === activeTab)?.label}记录`} />
        ) : (
          <div className="space-y-2">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {batchMode && record.status === 'PENDING_CONFIRM' && (
                      <button
                        onClick={() => toggleSelect(record.id)}
                        className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${
                          selectedIds.has(record.id)
                            ? 'bg-[#5a67d8] border-[#6b76e8]'
                            : 'border-[#2d5a8e]'
                        }`}
                      >
                        {selectedIds.has(record.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </button>
                    )}
                    <div>
                      <span className="text-white font-mono text-sm">{record.beamNumber}</span>
                      <span className="text-[#8ba7c7] text-xs ml-3">{record.detectionTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={record.status} />
                    <span className="text-white font-mono text-sm">
                      <AnimatedNumber value={record.deflectionValue} decimals={3} />
                      <span className="text-[#8ba7c7] ml-1">mm</span>
                    </span>
                    <button
                      onClick={() => navigate(`/history/${record.id}`)}
                      className="px-3 py-1 bg-[#0f2440] border-2 border-[#2d5a8e] text-[#8ba7c7] text-sm hover:text-white hover:border-[#5a9fd4] transition-colors"
                    >
                      查看
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1e3a5f] border-t-2 border-[#2d5a8e] px-6 py-3 flex items-center justify-between">
          <span className="text-[#8ba7c7] text-sm">
            已选择 <span className="text-white font-semibold">{selectedIds.size}</span> 条记录
          </span>
          <button
            onClick={handleBatchConfirm}
            className="bg-[#2f855a] border-2 border-[#38a169] text-white px-6 py-2 hover:bg-[#276749] transition-colors font-semibold"
          >
            批量确认通过
          </button>
        </div>
      )}
    </div>
  );
}
