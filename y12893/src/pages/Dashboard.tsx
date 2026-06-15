import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  AlertTriangle,
  MinusCircle,
  CheckCircle,
  PauseCircle,
  RefreshCw,
  Clock,
  Box,
  Droplets,
  Workflow,
  ChevronRight,
  Plus,
  Download
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { generateAllRecords } from '@/services/mockData';
import { StatCard } from '@/components/UI/StatCard';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS, DATA_TYPE_LABELS, QUALITY_ISSUE_LABELS } from '@/types';
import type { DataRecord } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    qualityStats,
    records,
    importResult,
    loadStats,
    loadRecords,
    loadBadRecords,
    importData,
    selectRecord,
    clearImportResult,
    resetAll
  } = useDataStore();

  useEffect(() => {
    loadStats();
    loadRecords();
  }, [loadStats, loadRecords]);

  const handleGenerateMockData = async () => {
    const mockData = generateAllRecords(40);
    await importData(mockData);
  };

  const badRecords = records.filter(r => r.qualityIssues.length > 0);

  const handleRecordClick = (record: DataRecord) => {
    selectRecord(record);
    navigate('/review-3d');
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">数据质量概览</h1>
            <p className="text-white/70">
              海事安全员复核岛礁供电负荷预测的第一站，先拎出盐度单位混用这类坏记录
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateMockData}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
            >
              <Plus className="w-4 h-4" />
              导入模拟数据
            </button>
            <button
              onClick={() => resetAll()}
              className="flex items-center gap-2 px-4 py-2 bg-[#E63946]/20 hover:bg-[#E63946]/30 text-[#E63946] rounded-xl transition-all border border-[#E63946]/30"
            >
              <RefreshCw className="w-4 h-4" />
              重置数据
            </button>
          </div>
        </div>

        {importResult && (
          <div className={cn(
            'mt-4 p-4 rounded-xl border',
            importResult.errors.length > 0
              ? 'bg-[#E63946]/10 border-[#E63946]/30 text-white'
              : 'bg-[#2A9D8F]/10 border-[#2A9D8F]/30 text-white'
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold mb-1">
                  {importResult.errors.length > 0 ? '导入完成，存在问题' : '导入成功'}
                </p>
                <p className="text-sm text-white/70">
                  成功 {importResult.success.length} 条 |
                  重复 {importResult.duplicates.length} 条 |
                  错误 {importResult.errors.length} 条
                </p>
              </div>
              <button
                onClick={clearImportResult}
                className="text-sm opacity-70 hover:opacity-100"
              >
                关闭
              </button>
            </div>
            {importResult.duplicates.length > 0 && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                <p className="text-sm font-medium mb-2">检测到重复记录（已自动过滤）：</p>
                <div className="text-xs text-white/70 space-y-1">
                  {importResult.duplicates.slice(0, 3).map(r => (
                    <p key={r.id}>• {DATA_TYPE_LABELS[r.type]} - {r.source}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="总记录数"
          value={qualityStats?.total || 0}
          icon={Database}
          color="#3E92CC"
          subtitle="已导入所有数据"
        />
        <StatCard
          title="盐度单位混用"
          value={qualityStats?.unitMismatch || 0}
          icon={AlertTriangle}
          color="#E63946"
          subtitle="需要统一单位"
          onClick={() => loadBadRecords()}
          className="ring-2 ring-[#E63946]/50"
        />
        <StatCard
          title="深度为负"
          value={qualityStats?.negativeDepth || 0}
          icon={MinusCircle}
          color="#E76F51"
          subtitle="异常记录"
          onClick={() => loadBadRecords()}
        />
        <StatCard
          title="待确认"
          value={qualityStats?.pending || 0}
          icon={Clock}
          color="#E9C46A"
          subtitle="等待人工复核"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="可用数据"
          value={qualityStats?.available || 0}
          icon={CheckCircle}
          color="#2A9D8F"
          subtitle="已通过复核"
        />
        <StatCard
          title="暂缓数据"
          value={qualityStats?.suspended || 0}
          icon={PauseCircle}
          color="#F4A261"
          subtitle="需进一步确认"
        />
        <StatCard
          title="需重采"
          value={qualityStats?.recollect || 0}
          icon={RefreshCw}
          color="#E76F51"
          subtitle="数据质量不合格"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-[#0A2463]" />
            快捷操作
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/track-cleaning')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#0A2463]/5 to-[#3E92CC]/5 hover:from-[#0A2463]/10 hover:to-[#3E92CC]/10 rounded-xl transition-all border border-[#0A2463]/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0A2463] flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">轨迹清洗（日常）</p>
                  <p className="text-xs text-gray-500">日常数据入口，导入船舶轨迹</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#0A2463] transition-colors" />
            </button>

            <button
              onClick={() => navigate('/review-3d')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#0A2463]/5 to-[#3E92CC]/5 hover:from-[#0A2463]/10 hover:to-[#3E92CC]/10 rounded-xl transition-all border border-[#0A2463]/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3E92CC] flex items-center justify-center">
                  <Box className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">3D交互复核</p>
                  <p className="text-xs text-gray-500">旋转、剖切、筛选联动</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#3E92CC] transition-colors" />
            </button>

            <button
              onClick={() => navigate('/workbench')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#0A2463]/5 to-[#3E92CC]/5 hover:from-[#0A2463]/10 hover:to-[#3E92CC]/10 rounded-xl transition-all border border-[#0A2463]/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2A9D8F] flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">复核工作台</p>
                  <p className="text-xs text-gray-500">船舶轨迹+养殖日志+盐度</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2A9D8F] transition-colors" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E63946]" />
              异常记录（{badRecords.length}）
            </h3>
            <button
              onClick={() => loadBadRecords()}
              className="text-xs px-3 py-1.5 bg-[#E63946]/10 text-[#E63946] rounded-lg hover:bg-[#E63946]/20 transition-colors font-medium"
            >
              一键拎出坏记录
            </button>
          </div>

          {badRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无异常记录</p>
              <p className="text-sm mt-2">点击"导入模拟数据"开始测试</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {badRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleRecordClick(record)}
                  className="p-4 bg-[#E63946]/5 hover:bg-[#E63946]/10 rounded-xl border border-[#E63946]/20 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[record.status]}20`, color: STATUS_COLORS[record.status] }}>
                        {STATUS_LABELS[record.status]}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">{DATA_TYPE_LABELS[record.type]}</span>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-[#E63946] transition-colors" />
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {record.type === 'ship_track' ? record.vesselName :
                     record.type === 'aquaculture_log' ? record.farmName : record.stationId}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {record.qualityIssues.map((issue) => (
                      <span
                        key={issue}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#E63946]/20 text-[#E63946] font-medium"
                      >
                        {QUALITY_ISSUE_LABELS[issue]}
                      </span>
                    ))}
                  </div>
                  {record.resultNote && (
                    <p className="text-xs text-gray-500 mt-2 italic">{record.resultNote}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-800 mb-4">结果说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-[#2A9D8F]/5 rounded-xl border border-[#2A9D8F]/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-[#2A9D8F]" />
              <span className="font-semibold text-[#2A9D8F]">可用数据</span>
              <span className="text-2xl font-bold text-[#2A9D8F] ml-auto">{qualityStats?.available || 0}</span>
            </div>
            <p className="text-sm text-gray-600">数据完整，质量良好，可直接用于岛礁供电负荷预测。</p>
          </div>
          <div className="p-4 bg-[#F4A261]/5 rounded-xl border border-[#F4A261]/20">
            <div className="flex items-center gap-2 mb-2">
              <PauseCircle className="w-5 h-5 text-[#F4A261]" />
              <span className="font-semibold text-[#F4A261]">暂缓数据</span>
              <span className="text-2xl font-bold text-[#F4A261] ml-auto">{qualityStats?.suspended || 0}</span>
            </div>
            <p className="text-sm text-gray-600">存在盐度单位混用或异常值，经人工修正后可使用。</p>
          </div>
          <div className="p-4 bg-[#E76F51]/5 rounded-xl border border-[#E76F51]/20">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-[#E76F51]" />
              <span className="font-semibold text-[#E76F51]">需重采</span>
              <span className="text-2xl font-bold text-[#E76F51] ml-auto">{qualityStats?.recollect || 0}</span>
            </div>
            <p className="text-sm text-gray-600">关键字段缺失或深度为负，必须重新采集。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
