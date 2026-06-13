import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import { Download, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDeflectionStore } from '@/store/useDeflectionStore';
import { useUnifiedDataSource } from '@/hooks/useUnifiedDataSource';
import StatsOverview from '@/components/stats/StatsOverview';
import StatusBadge from '@/components/common/StatusBadge';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/formatters';

export default function HomePage() {
  const navigate = useNavigate();
  const initStore = useDeflectionStore((s) => s.initStore);
  const unifiedDataSource = useDeflectionStore((s) => s.unifiedDataSource);
  const exportReportFn = useDeflectionStore((s) => s.exportReport);
  const { statistics, exceptionQueue, isLoading } = useUnifiedDataSource();

  useEffect(() => {
    if (!unifiedDataSource) {
      initStore();
    }
  }, [unifiedDataSource, initStore]);

  const handleExport = async () => {
    try {
      const blob = await exportReportFn();
      saveAs(blob, `deflection-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {}
  };

  const isLoaded = !isLoading && statistics;

  return (
    <div className="min-h-screen bg-[#0f2440] pb-24">
      <header className="bg-[#1e3a5f] border-b-2 border-[#2d5a8e] px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold tracking-wide">报告导出首页</h1>
            <p className="text-[#8ba7c7] text-sm mt-1">梁体挠度检测数据总览与报告导出</p>
          </div>
          <div className="flex items-center gap-4">
            {isLoaded && (
              <div className="text-right">
                <p className="text-[#8ba7c7] text-xs">计算版本</p>
                <p className="text-[#5a9fd4] text-xs font-mono font-medium">
                  {unifiedDataSource?.calculationVersion}
                </p>
              </div>
            )}
            <div className={`w-2.5 h-2.5 rounded-full ${isLoaded ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          </div>
        </div>
      </header>

      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-2 border-[#2d5a8e] border-t-[#5a9fd4] rounded-full animate-spin mb-4" />
          <p className="text-[#8ba7c7] text-sm">加载数据中...</p>
        </div>
      ) : (
        <>
          <div className="px-6 py-5">
            <StatsOverview />
          </div>

          <div className="px-6 py-2">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2d5a8e]/50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h2 className="text-white text-base font-semibold">异常队列</h2>
              </div>
              <span className="text-[#8ba7c7] text-sm">
                共 <span className="text-white font-semibold font-mono">
                  <AnimatedNumber value={exceptionQueue.length} />
                </span> 条待处理
              </span>
            </div>

            {exceptionQueue.length === 0 ? (
              <EmptyState message="暂无异常记录" description="所有检测数据均在正常范围内" />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                {exceptionQueue.slice(0, 10).map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/history/${record.id}`)}
                    className="bg-[#1e3a5f]/60 border-2 border-[#2d5a8e] p-4 cursor-pointer hover:border-[#5a9fd4] hover:bg-[#1e3a5f] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#0f2440] border-2 border-[#2d5a8e] flex items-center justify-center group-hover:border-[#5a9fd4] transition-colors">
                          <span className="text-[#5a9fd4] font-mono text-xs font-bold">{record.beamNumber.slice(-3)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-semibold font-mono text-sm">{record.beamNumber}</span>
                            <StatusBadge status={record.status} />
                          </div>
                          <p className="text-[#5a7aa0] text-xs mt-0.5 font-mono">
                            {formatDateTime(record.detectionTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[#8ba7c7] text-xs">挠度值</p>
                          <p className={`font-mono font-semibold ${
                            record.status === 'EXTREME_VALUE' ? 'text-red-400' :
                            record.status === 'NOISE_SUSPECTED' ? 'text-amber-400' : 'text-white'
                          }`}>
                            <AnimatedNumber value={record.deflectionValue} decimals={3} />
                            <span className="text-[#5a7aa0] ml-1 font-normal">mm</span>
                          </p>
                        </div>
                        <span className="text-[#5a9fd4] text-xs group-hover:translate-x-1 transition-transform">
                          查看 →
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-[#1e3a5f]/95 backdrop-blur border-t-2 border-[#2d5a8e] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            {isLoaded ? (
              <p className="text-[#8ba7c7] text-xs">
                数据来源: 统一数据源 · 共 {statistics?.totalCount ?? 0} 条记录 · 
                更新于 {unifiedDataSource?.lastUpdated ? formatDateTime(unifiedDataSource.lastUpdated) : '-'}
              </p>
            ) : (
              <p className="text-[#5a7aa0] text-xs">准备导出报告...</p>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={!isLoaded}
            className={`flex items-center gap-2 px-8 py-2.5 border-2 font-semibold transition-all ${
              isLoaded
                ? 'bg-[#5a67d8] border-[#6b76e8] text-white hover:bg-[#4c59c7] hover:border-[#5a67d8]'
                : 'bg-[#2d5a8e]/50 border-[#2d5a8e] text-[#5a7aa0] cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            导出完整报告
          </button>
        </div>
      </div>
    </div>
  );
}
