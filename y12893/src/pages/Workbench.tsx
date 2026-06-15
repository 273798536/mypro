import { useEffect, useState } from 'react';
import {
  Ship,
  Fish,
  Droplets,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  ChevronRight,
  Filter,
  Clock,
  MapPin,
  Zap
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { RecordDetailPanel } from '@/components/UI/RecordDetailPanel';
import {
  DATA_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  QUALITY_ISSUE_LABELS
} from '@/types';
import type { DataRecord, DataType } from '@/types';
import { cn } from '@/lib/utils';

export default function Workbench() {
  const { records, selectedRecord, selectRecord, loadRecords, loadStats, setRecordStatus, approveRecord } = useDataStore();
  const [activeTypes, setActiveTypes] = useState<Set<DataType>>(new Set(['ship_track', 'aquaculture_log', 'salinity']));
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecords();
    loadStats();
  }, [loadRecords, loadStats]);

  const toggleType = (type: DataType) => {
    const next = new Set(activeTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setActiveTypes(next);
  };

  const filteredRecords = records.filter(r => activeTypes.has(r.type));
  const shipRecords = filteredRecords.filter(r => r.type === 'ship_track');
  const aquaRecords = filteredRecords.filter(r => r.type === 'aquaculture_log');
  const saltRecords = filteredRecords.filter(r => r.type === 'salinity');

  const handleRecordClick = (record: DataRecord) => {
    if (batchMode) {
      const next = new Set(selectedIds);
      if (next.has(record.id)) {
        next.delete(record.id);
      } else {
        next.add(record.id);
      }
      setSelectedIds(next);
    } else {
      selectRecord(record);
    }
  };

  const handleBatchApprove = async () => {
    for (const id of selectedIds) {
      await approveRecord(id, '海事安全员', '批量复核通过');
    }
    setSelectedIds(new Set());
    setBatchMode(false);
  };

  const getRecordName = (record: DataRecord) => {
    if (record.type === 'ship_track') return record.vesselName;
    if (record.type === 'aquaculture_log') return record.farmName;
    return record.stationId;
  };

  const getLoadValue = (record: DataRecord) => {
    if (record.type === 'ship_track') return record.powerConsumption;
    if (record.type === 'aquaculture_log') return record.dailyPowerUsage;
    return record.relatedLoad;
  };

  const RecordCard = ({ record }: { record: DataRecord }) => (
    <div
      key={record.id}
      onClick={() => handleRecordClick(record)}
      className={cn(
        'p-4 rounded-xl border-2 transition-all cursor-pointer',
        selectedRecord?.id === record.id
          ? 'border-[#3E92CC] bg-[#3E92CC]/5'
          : selectedIds.has(record.id)
          ? 'border-[#2A9D8F] bg-[#2A9D8F]/5'
          : record.qualityIssues.length > 0
          ? 'border-[#E63946]/30 bg-[#E63946]/5 hover:bg-[#E63946]/10'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${STATUS_COLORS[record.status]}20`,
              color: STATUS_COLORS[record.status]
            }}
          >
            {STATUS_LABELS[record.status]}
          </span>
          {record.qualityIssues.length > 0 && (
            <AlertTriangle className="w-4 h-4 text-[#E63946] inline-block ml-2" />
          )}
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {new Date(record.timestamp).toLocaleDateString('zh-CN')}
        </span>
      </div>

      <h4 className="font-semibold text-gray-800 mb-2">{getRecordName(record)}</h4>

      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{record.location.lat.toFixed(4)}°N, {record.location.lng.toFixed(4)}°E</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>负荷 {getLoadValue(record).toFixed(1)} kW</span>
        </div>
        {record.location.depth !== undefined && (
          <div className={cn(
            'flex items-center gap-1',
            record.location.depth < 0 && 'text-[#E63946] font-medium'
          )}>
            <Droplets className="w-3 h-3" />
            <span>深度 {record.location.depth.toFixed(1)} m</span>
            {record.location.depth < 0 && '⚠️'}
          </div>
        )}
        {record.type === 'salinity' && (
          <div className={cn(
            'flex items-center gap-1',
            record.qualityIssues.includes('unit_mismatch') && 'text-[#E63946] font-medium'
          )}>
            <Droplets className="w-3 h-3" />
            <span>盐度 {record.salinity.toFixed(2)} {record.unit}</span>
            {record.qualityIssues.includes('unit_mismatch') && '⚠️ 单位混用'}
          </div>
        )}
      </div>

      {record.qualityIssues.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {record.qualityIssues.map(issue => (
            <span
              key={issue}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#E63946]/10 text-[#E63946] font-medium"
            >
              {QUALITY_ISSUE_LABELS[issue]}
            </span>
          ))}
        </div>
      )}

      {record.resultNote && (
        <p className="mt-2 text-xs text-gray-400 italic">{record.resultNote}</p>
      )}

      {record.status !== 'approved' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              approveRecord(record.id, '海事安全员', '人工复核通过');
            }}
            className="flex-1 py-1.5 text-xs bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238b7a] transition-colors font-medium"
          >
            通过
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRecordStatus(record.id, 'suspended', '海事安全员', '暂缓使用，需进一步确认');
            }}
            className="flex-1 py-1.5 text-xs bg-[#F4A261] text-white rounded-lg hover:bg-[#e8954f] transition-colors font-medium"
          >
            暂缓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRecordStatus(record.id, 'recollect', '海事安全员', '数据质量不合格，需重新采集');
            }}
            className="flex-1 py-1.5 text-xs bg-[#E76F51] text-white rounded-lg hover:bg-[#d66145] transition-colors font-medium"
          >
            重采
          </button>
        </div>
      )}
    </div>
  );

  const typeConfigs = [
    { type: 'ship_track' as const, icon: Ship, color: '#3E92CC', label: '船舶轨迹', records: shipRecords },
    { type: 'aquaculture_log' as const, icon: Fish, color: '#2A9D8F', label: '养殖日志', records: aquaRecords },
    { type: 'salinity' as const, icon: Droplets, color: '#E9C46A', label: '盐度监测', records: saltRecords },
  ];

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">复核工作台</h1>
            <p className="text-white/70">
              船舶轨迹、养殖日志和盐度单位混用同一轮复核，让课题组看出处理的是眼前这批具体材料
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
              className={cn(
                'px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2',
                batchMode
                  ? 'bg-[#2A9D8F] text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <Filter className="w-4 h-4" />
              {batchMode ? `已选 ${selectedIds.size} 条` : '批量操作'}
            </button>
            {batchMode && selectedIds.size > 0 && (
              <button
                onClick={handleBatchApprove}
                className="px-4 py-2 bg-[#2A9D8F] text-white rounded-xl font-medium hover:bg-[#238b7a] transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                批量通过
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {typeConfigs.map(config => (
            <button
              key={config.type}
              onClick={() => toggleType(config.type)}
              className={cn(
                'px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2',
                activeTypes.has(config.type)
                  ? 'bg-white text-gray-800'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              <config.icon className="w-4 h-4" style={{ color: activeTypes.has(config.type) ? config.color : undefined }} />
              {config.label}
              <span className="text-xs opacity-60">({config.records.length})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {typeConfigs.map(config => activeTypes.has(config.type) && (
          <div key={config.type} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <config.icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <div>
                  <h2 className="font-bold text-white">{config.label}</h2>
                  <p className="text-xs text-white/60">{config.records.length} 条记录</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>

            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
              {config.records.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <config.icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无记录</p>
                </div>
              ) : (
                config.records.map(record => <RecordCard key={record.id} record={record} />)
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedRecord && (
        <RecordDetailPanel record={selectedRecord} onClose={() => selectRecord(null)} />
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#2A9D8F]" />
            <span className="text-sm font-medium">可用 {filteredRecords.filter(r => r.status === 'approved').length}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#E76F51]" />
            <span className="text-sm font-medium">重采 {filteredRecords.filter(r => r.status === 'recollect').length}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E9C46A]" />
            <span className="text-sm font-medium">待确认 {filteredRecords.filter(r => r.status === 'pending').length}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E63946]" />
            <span className="text-sm font-medium">异常 {filteredRecords.filter(r => r.qualityIssues.length > 0).length}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => window.open('/traceability', '_blank')}
            className="text-sm text-[#3E92CC] font-medium hover:underline flex items-center gap-1"
          >
            <GitBranch className="w-4 h-4" />
            查看溯源
          </button>
        </div>
      </div>
    </div>
  );
}
